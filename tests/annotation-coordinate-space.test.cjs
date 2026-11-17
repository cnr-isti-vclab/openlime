// Run with: node --experimental-vm-modules --test tests/annotation-coordinate-space.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function loadLayerSvg() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'LayerSvgAnnotation.js'), 'utf8');
  const context = vm.createContext({
    console,
    performance,
    document: { createElementNS: () => ({ classList: { add() {} }, append() {} }) },
  });
  const mod = new vm.SourceTextModule(source, { context });
  class Layer {}
  Layer.prototype.types = {};
  class LayerAnnotation {
    constructor(options = {}) {
      Object.assign(this, {
        transform: { compose(t) { return t; }, x: 0, y: 0, z: 1, a: 0 },
        layout: {
          boundingBox: () => ({
            width: () => 100,
            height: () => 100,
            corner: () => ({ x: -50, y: -50 }),
          }),
        },
        ...options,
      });
    }
    boundingBox() { return this.layout.boundingBox(); }
  }
  const { Transform } = await loadTransform(context);
  const mocks = {
    './Util.js': { Util: {} },
    './Util': { Util: {} },
    './Layer.js': { Layer },
    './Layer': { Layer },
    './Annotation.js': { Annotation: class {} },
    './Annotation': { Annotation: class {} },
    './LayerAnnotation.js': { LayerAnnotation },
    './LayerAnnotation': { LayerAnnotation },
    './CoordinateSystem.js': {
      CoordinateSystem: {
        reflectY: (t) => new Transform({ x: t.x, y: -t.y, z: t.z, a: t.a, t: t.t }),
      },
    },
    './CoordinateSystem': {
      CoordinateSystem: {
        reflectY: (t) => new Transform({ x: t.x, y: -t.y, z: t.z, a: t.a, t: t.t }),
      },
    },
  };
  await mod.link((specifier) => {
    const key = specifier.endsWith('.js') ? specifier : `${specifier}.js`;
    const exports = mocks[specifier] || mocks[key] || mocks[specifier.replace(/^\.\//, '')];
    assert.ok(exports, `Unexpected dependency ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await mod.evaluate();
  return { LayerSvgAnnotation: mod.namespace.LayerSvgAnnotation, Transform };
}

async function loadTransform(context) {
  const cache = new Map();
  function moduleFor(file) {
    if (!path.extname(file)) file += '.js';
    if (cache.has(file)) return cache.get(file);
    const source = fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8');
    const mod = new vm.SourceTextModule(source, { context, identifier: file });
    cache.set(file, mod);
    return mod;
  }
  const root = moduleFor('Transform.js');
  await root.link((specifier) => moduleFor(path.basename(specifier)));
  await root.evaluate();
  return {
    Transform: root.namespace.Transform,
    BoundingBox: cache.get('BoundingBox.js')?.namespace?.BoundingBox,
  };
}

async function loadManagerCore() {
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
  await root.link((specifier) => moduleFor(path.basename(specifier)));
  await root.evaluate();
  return {
    Manager: root.namespace.ManagerSvgAnnotation,
    Transform: cache.get('Transform.js').namespace.Transform,
    BoundingBox: cache.get('BoundingBox.js').namespace.BoundingBox,
    CoordinateSystem: cache.get('CoordinateSystem.js').namespace.CoordinateSystem,
  };
}

test('layer-image draw transform keeps layout corner offset', async () => {
  const { LayerSvgAnnotation, Transform } = await loadLayerSvg();
  const layer = new LayerSvgAnnotation({ coordinateSpace: 'layer-image' });
  assert.equal(layer.coordinateSpace, 'layer-image');
  const svg = layer.getSvgGroupTransform(new Transform({ x: 10, y: 20, z: 2, a: 0 }));
  assert.match(svg, /translate\(-50 -50\)/);
  assert.match(svg, /scale\(2 2\)/);
});

test('scene draw transform uses camera only (no layout corner)', async () => {
  const { LayerSvgAnnotation, Transform } = await loadLayerSvg();
  const layer = new LayerSvgAnnotation({ coordinateSpace: 'scene' });
  assert.equal(layer.coordinateSpace, 'scene');
  const svg = layer.getSvgGroupTransform(new Transform({ x: 10, y: 20, z: 2, a: 0 }));
  assert.equal(svg.includes('translate(-50 -50)'), false);
  assert.match(svg, /translate\(10 -20\)/);
  assert.match(svg, /scale\(2 2\)/);
});

test('scene mode maps canvas HTML through scene space', async () => {
  const { Manager, Transform, CoordinateSystem } = await loadManagerCore();
  const manager = Object.create(Manager.prototype);
  manager.coordinateSpace = 'scene';
  manager.viewer = {
    camera: {
      viewport: { x: 0, y: 0, dx: 200, dy: 100, w: 200, h: 100 },
      getCurrentTransform() { return new Transform(); },
    },
  };
  const scene = manager._canvasHtmlToAnnotationCoords({ x: 100, y: 50 });
  assert.ok(scene);
  assert.ok(Math.abs(scene.x) < 1e-6);
  assert.ok(Math.abs(scene.y) < 1e-6);

  const back = manager._imageToCanvasHtml(scene);
  assert.ok(back);
  assert.ok(Math.abs(back.x - 100) < 1e-6);
  assert.ok(Math.abs(back.y - 50) < 1e-6);

  const direct = CoordinateSystem.fromCanvasHtmlToScene({ x: 100, y: 50 }, manager.viewer.camera, false);
  assert.ok(Math.abs(direct.x - scene.x) < 1e-9);
});

test('focusAnnotations in scene mode treats SVG bounds as scene coords', async () => {
  const { Manager, Transform, BoundingBox } = await loadManagerCore();
  const manager = Object.create(Manager.prototype);
  manager.coordinateSpace = 'scene';
  manager.emit = () => assert.fail('unexpected emit');
  const viewport = { x: 0, y: 0, dx: 400, dy: 300, w: 400, h: 300 };
  const camera = {
    viewport,
    bounded: false,
    target: new Transform({ z: 1 }),
    getCurrentTransform() { return this.target.copy(); },
    calls: [],
    setPosition(duration, x, y, z, a) {
      this.calls.push({ duration, x, y, z, a });
      this.target = new Transform({ x, y, z, a });
    },
  };
  manager.viewer = { camera };
  manager.layer = {
    annotations: [{
      id: 'a',
      elements: [{
        classList: { contains: () => false },
        children: [],
        getBBox() { return { x: -10, y: -10, width: 20, height: 20 }; },
      }],
    }],
    selected: new Set(),
    transform: new Transform({ x: 500, y: 0 }),
    layout: {
      boundingBox: () => new BoundingBox({ xLow: -50, yLow: -50, xHigh: 50, yHigh: 50 }),
    },
  };

  const result = manager.focusAnnotations(['a']);
  assert.equal(result.fullyVisible, true);
  assert.equal(result.moved, false);
  assert.equal(camera.calls.length, 0);
  assert.deepEqual(
    JSON.parse(JSON.stringify(result.bounds)),
    { xLow: -10, yLow: -10, xHigh: 10, yHigh: 10 },
  );
});

test('existing focusAnnotations layer-image behaviour is unchanged', async () => {
  const { Manager, Transform, BoundingBox } = await loadManagerCore();
  const manager = Object.create(Manager.prototype);
  manager.coordinateSpace = 'layer-image';
  manager.emit = () => {};
  const viewport = { x: 0, y: 0, dx: 400, dy: 300, w: 400, h: 300 };
  manager.viewer = {
    camera: {
      viewport,
      bounded: false,
      target: new Transform({ z: 1 }),
      getCurrentTransform() { return this.target.copy(); },
      setPosition() {},
    },
  };
  manager.layer = {
    annotations: [{
      id: 'a',
      elements: [{
        classList: { contains: () => false },
        children: [],
        getBBox() { return { x: 450, y: 450, width: 20, height: 20 }; },
      }],
    }],
    selected: new Set(),
    transform: new Transform(),
    layout: {
      boundingBox: () => new BoundingBox({ xLow: -500, yLow: -500, xHigh: 500, yHigh: 500 }),
    },
  };
  const result = manager.focusAnnotations(['a']);
  assert.equal(result.fullyVisible, true);
  assert.equal(result.moved, false);
});
