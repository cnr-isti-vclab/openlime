// Run with: node --experimental-vm-modules --test tests/manager-svg-focus-annotations.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function loadCore() {
  const context = vm.createContext({ console, performance });
  const cache = new Map();
  const mocks = {
    'Annotation.js': { Annotation: class {} },
    'LayerSvgAnnotation.js': { LayerSvgAnnotation: class {} },
    'Util.js': { Util: {} },
    'Signals.js': { addSignals(klass) { klass.prototype.emit = () => {}; } },
    'Simplify.js': { ramerDouglasPeucker() {}, smooth() {}, relaxDenseZigZagPoints() {} },
  };
  function moduleFor(file) {
    if (!path.extname(file)) file += '.js';
    if (cache.has(file)) return cache.get(file);
    if (mocks[file]) {
      const exports = mocks[file];
      const mod = new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
      }, { context });
      cache.set(file, mod);
      return mod;
    }
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
    const mod = new vm.SourceTextModule(source, { context, identifier: file });
    cache.set(file, mod);
    return mod;
  }
  const root = moduleFor('ManagerSvgAnnotation.js');
  await root.link(specifier => moduleFor(path.basename(specifier)));
  await root.evaluate();
  const cameraModule = moduleFor('Camera.js');
  await cameraModule.link(specifier => moduleFor(path.basename(specifier)));
  await cameraModule.evaluate();
  return {
    Manager: root.namespace.ManagerSvgAnnotation,
    Camera: cameraModule.namespace.Camera,
    Transform: cache.get('Transform.js').namespace.Transform,
    BoundingBox: cache.get('BoundingBox.js').namespace.BoundingBox,
    CoordinateSystem: cache.get('CoordinateSystem.js').namespace.CoordinateSystem,
  };
}

const core = loadCore();

function shape(x, y, width, height, names = [], children = []) {
  return {
    classList: { contains: name => names.includes(name) },
    children,
    getBBox() { return { x, y, width, height }; },
  };
}

async function setup(annotations, { x = 0, y = 0, z = 1, a = 0, layerTransform } = {}) {
  const { Manager, Transform, BoundingBox } = await core;
  const manager = Object.create(Manager.prototype);
  const viewport = { x: 0, y: 0, dx: 400, dy: 300, w: 400, h: 300 };
  const camera = {
    viewport, bounded: false, target: new Transform({ x, y, z, a }),
    getCurrentTransform() { return this.target.copy(); },
    calls: [],
    setPosition(duration, nx, ny, nz, na) {
      this.calls.push({ duration, x: nx, y: ny, z: nz, a: na });
      this.target = new Transform({ x: nx, y: ny, z: nz, a: na });
    },
  };
  const selected = new Set(['selected']);
  manager.viewer = { camera };
  manager.layer = {
    annotations, selected,
    transform: layerTransform ?? new Transform(),
    layout: { boundingBox: () => new BoundingBox({ xLow: -500, yLow: -500, xHigh: 500, yHigh: 500 }) },
  };
  manager.emit = () => assert.fail('annotation event emitted');
  return { manager, camera, selected };
}

test('fully visible geometry leaves the camera and selection untouched', async () => {
  const annotation = { id: 'a', elements: [
    shape(450, 450, 20, 20),
    shape(-10000, -10000, 20000, 20000, ['annotation-label']),
  ] };
  const { manager, camera, selected } = await setup([annotation]);
  const result = manager.focusAnnotations(['a']);
  assert.equal(result.moved, false);
  assert.equal(result.fullyVisible, true);
  assert.equal(camera.calls.length, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(result.bounds)), { xLow: 450, yLow: 450, xHigh: 470, yHigh: 470 });
  assert.deepEqual([...selected], ['selected']);
});

test('partially outside geometry pans and zooms out only when needed', async () => {
  const annotation = { id: 'a', elements: [shape(850, 450, 100, 100)] };
  const { manager, camera } = await setup([annotation]);
  const result = manager.focusAnnotations(['a'], { duration: 100 });
  assert.equal(result.moved, true);
  assert.equal(result.fullyVisible, true);
  assert.equal(camera.calls[0].duration, 100);
  assert.equal(camera.target.z, 1);
  assert.ok(camera.target.x < 0);
});

test('multiple annotations frame their full union and ignore nested handles', async () => {
  const annotations = [
    { id: 'a', elements: [shape(100, 450, 100, 100)] },
    { id: 'b', elements: [shape(0, 0, 0, 0, [], [
      shape(800, 450, 100, 100),
      shape(2000, 2000, 100, 100, ['annotation-vertex-handles']),
    ])] },
  ];
  const { manager, camera } = await setup(annotations);
  const result = manager.focusAnnotations(['a', 'b']);
  assert.equal(result.moved, true);
  assert.equal(result.fullyVisible, true);
  assert.equal(result.bounds.xLow, 100);
  assert.equal(result.bounds.xHigh, 900);
  assert.ok(camera.target.z < 0.5);
});

test('right inset narrows the usable viewport and shifts framing left', async () => {
  const annotation = { id: 'a', elements: [shape(620, 450, 40, 40)] };
  const plain = await setup([annotation]);
  assert.equal(plain.manager.focusAnnotations(['a']).moved, false);
  const inset = await setup([annotation]);
  const result = inset.manager.focusAnnotations(['a'], { insets: { right: 120 } });
  assert.equal(result.moved, true);
  assert.equal(result.fullyVisible, true);
  assert.ok(inset.camera.target.x < 0);
});

test('camera rotation is retained and rotated geometry is framed', async () => {
  const annotation = { id: 'a', elements: [shape(700, 450, 180, 80)] };
  const { manager, camera } = await setup([annotation], { a: 37, z: 2 });
  const result = manager.focusAnnotations(['a']);
  assert.equal(result.moved, true);
  assert.equal(result.fullyVisible, true);
  assert.equal(camera.target.a, 37);
  assert.ok(camera.target.z <= 2);
});

test('zoom constraints can prevent a full fit and are reported', async () => {
  const annotation = { id: 'a', elements: [shape(0, 400, 1000, 200)] };
  const { manager, camera } = await setup([annotation]);
  camera.bounded = true;
  camera.minZoom = 0.8;
  camera.maxZoom = 2;
  const result = manager.focusAnnotations(['a']);
  assert.equal(camera.target.z, 0.8);
  assert.equal(result.fullyVisible, false);
});


test('real bounded camera frames a geometry pair outside the sidebar occlusion', async () => {
  const { Camera, Transform, BoundingBox, CoordinateSystem } = await core;
  const { manager } = await setup([
    { id: 'g3', elements: [shape(230, 350, 40, 80)] },
    { id: 'g5', elements: [shape(850, 550, 50, 80)] },
  ]);
  const camera = new Camera({ bounded: true, minZoom: 0.4, maxZoom: 2,
    boundingBox: new BoundingBox({ xLow: -500, yLow: -500, xHigh: 500, yHigh: 500 }),
    target: new Transform({ z: 0.4 }) });
  camera.viewport = { x: 0, y: 0, dx: 400, dy: 300, w: 400, h: 300 };
  manager.viewer.camera = camera;
  const result = manager.focusAnnotations(['g3', 'g5'], { duration: 0, insets: { right: 120 } });
  assert.equal(result.moved, true);
  assert.equal(result.fullyVisible, true);
  const projected = CoordinateSystem.getFromLayerToViewportTransformNoCamera(camera.target, camera.viewport, manager.layer.transform)
    .transformBox(new BoundingBox({ xLow: -270, xHigh: 400, yLow: -130, yHigh: 150 }));
  assert.ok(projected.xHigh <= 280, 'G5 must be left of the sidebar');
  assert.ok(projected.xLow >= 0, 'G3 must remain visible');
});

test('occluded viewport permits zooming out below the full-viewport minimum', async () => {
  const { Camera, Transform, BoundingBox } = await core;
  const { manager } = await setup([{ id: 'a', elements: [shape(0, 450, 1000, 40)] }]);
  const camera = new Camera({ bounded: true, minZoom: 0.4, maxZoom: 2,
    boundingBox: new BoundingBox({ xLow: -500, yLow: -500, xHigh: 500, yHigh: 500 }),
    target: new Transform({ z: 0.4 }) });
  camera.viewport = { x: 0, y: 0, dx: 400, dy: 300, w: 400, h: 300 };
  manager.viewer.camera = camera;
  const result = manager.focusAnnotations(['a'], { duration: 0, padding: 0, insets: { right: 120 } });
  assert.ok(camera.target.z < camera.minZoom);
  assert.equal(result.fullyVisible, true);
});


test('incomplete SVG synchronization cannot report the whole selection visible', async () => {
  const { manager, camera } = await setup([{ id: 'g3', elements: [shape(450, 450, 20, 20)] }]);
  const first = manager.focusAnnotations(['g3', 'g5'], { insets: { right: 120 } });
  assert.equal(first.fullyVisible, false);
  assert.equal(camera.calls.length, 0);
  manager.layer.annotations.push({ id: 'g5', elements: [shape(800, 500, 40, 40)] });
  const second = manager.focusAnnotations(['g3', 'g5'], { insets: { right: 120 } });
  assert.equal(second.fullyVisible, true);
  assert.equal(second.moved, true);
});
