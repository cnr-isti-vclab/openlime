// Run with: node --experimental-vm-modules --test tests/viewer-resize-camera-fit.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class Element {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.style = {};
    this.children = [];
    this.classList = { add() {} };
  }
  querySelector(selector) {
    return selector === 'canvas'
      ? this.children.find(child => child.tagName === 'CANVAS') ?? null
      : null;
  }
  prepend(child) { this.children.unshift(child); }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener() {}
}

class Camera {
  constructor() {
    this.viewport = null;
    this.boundingBox = {};
    this.transform = { x: 0, y: 0, z: 1, a: 0 };
    this.fitCalls = [];
    this.viewportCalls = [];
  }
  setViewport(view, preserveTransform = false) {
    this.viewport = { ...view };
    this.viewportCalls.push({ view: { ...view }, preserveTransform });
    if (!preserveTransform && this.viewportCalls.length > 1) {
      this.transform.z *= 2;
    }
  }
  fitCameraBox(duration) {
    this.fitCalls.push(duration);
    this.transform = { x: 0, y: 0, z: 1, a: 0 };
  }
}

class Canvas {
  constructor(canvasElement, overlayElement, camera, options = {}) {
    this.canvasElement = canvasElement;
    this.overlayElement = overlayElement;
    this.camera = camera;
    this.layers = options.layers ?? {};
    this.events = {};
  }
  addEvent(name, callback) { (this.events[name] ??= []).push(callback); }
  emit(name, ...args) { for (const callback of this.events[name] ?? []) callback(...args); }
  updateSize() { this.emit('updateSize'); }
  prefetch() {}
  draw() { return true; }
  addLayer() {}
  clearLayers() {}
  removeLayer() {}
}

class PointerManager {
  onEvent() {}
}

class ResizeObserver {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
}

function addSignals(Type, ...names) {
  Type.prototype.addEvent = function (name, callback) {
    (this._events ??= {})[name] ??= [];
    this._events[name].push(callback);
  };
  Type.prototype.emit = function (name, ...args) {
    for (const callback of this._events?.[name] ?? []) callback(...args);
  };
  Type.prototype._signalNames = names;
}

async function loadViewer() {
  const source = fs.readFileSync(require.resolve('../src/Viewer.js'), 'utf8');
  const document = { createElement: tag => new Element(tag), querySelector: () => null };
  const context = vm.createContext({
    console,
    document,
    performance: { now: () => 0 },
    requestAnimationFrame: () => 1,
    cancelAnimationFrame() {},
    ResizeObserver,
  });
  const mod = new vm.SourceTextModule(source, { context });
  const mocks = {
    './Canvas.js': { Canvas },
    './Camera.js': { Camera },
    './PointerManager.js': { PointerManager },
    './Controller.js': { Controller: class {} },
    './Signals.js': { addSignals },
  };
  await mod.link(specifier => new vm.SyntheticModule(Object.keys(mocks[specifier]), function () {
    for (const [name, value] of Object.entries(mocks[specifier])) this.setExport(name, value);
  }, { context }));
  await mod.evaluate();
  return mod.namespace.Viewer;
}

async function loadUIBasic() {
  const source = fs.readFileSync(require.resolve('../src/UIBasic.js'), 'utf8');
  const context = vm.createContext({
    console,
    document: { createElement: tag => new Element(tag) },
    window: {},
    queueMicrotask: null,
    setTimeout: () => 1,
    clearTimeout() {},
  });
  const mod = new vm.SourceTextModule(source, { context });
  class ControllerStub {
    constructor() { this.active = false; }
    addEvent() {}
    setActive(active) { this.active = active; }
  }
  const mocks = {
    './Skin': { Skin: { url: null } },
    './Util': { Util: {} },
    './Controller2D': { Controller2D: ControllerStub },
    './ControllerBearing': { ControllerBearing: ControllerStub },
    './ControllerPanZoom': { ControllerPanZoom: ControllerStub },
    './Ruler': { Ruler: class {} },
    './ScaleBar': { ScaleBar: class {} },
    './Signals': { addSignals },
    './Minimap': { Minimap: class {} },
    './LayerSvgAnnotation': { LayerSvgAnnotation: class {} },
  };
  await mod.link(specifier => new vm.SyntheticModule(Object.keys(mocks[specifier]), function () {
    for (const [name, value] of Object.entries(mocks[specifier])) this.setExport(name, value);
  }, { context }));
  await mod.evaluate();
  return mod.namespace.UIBasic;
}

function createViewer(Viewer, options = {}) {
  const container = new Element('div');
  container.appendChild(new Element('canvas'));
  const camera = new Camera();
  const viewer = new Viewer(container, {
    camera,
    canvas: { layers: { image: { status: 'ready', controls: {}, getModes: () => [] } } },
    ...options,
  });
  return { viewer, camera };
}

test('resize fits by default and updates the viewport', async () => {
  const Viewer = await loadViewer();
  const UIBasic = await loadUIBasic();
  const { viewer, camera } = createViewer(Viewer);
  const ui = new UIBasic(viewer);

  viewer.resize(640, 480);

  assert.equal(viewer.fitCameraOnResize, true);
  assert.deepEqual(camera.viewport, { x: 0, y: 0, dx: 640, dy: 480, w: 640, h: 480 });
  assert.deepEqual(camera.fitCalls, [0]);
  assert.equal(camera.viewportCalls[0].preserveTransform, false);

  camera.transform = { x: 4, y: 8, z: 2, a: 15 };
  ui.actions.home.task();
  assert.deepEqual(camera.fitCalls, [0, 250]);
  assert.deepEqual(camera.transform, { x: 0, y: 0, z: 1, a: 0 });
});

test('resize preservation keeps pan, zoom, and rotation while initial fit and Home still fit', async () => {
  const Viewer = await loadViewer();
  const UIBasic = await loadUIBasic();
  const { viewer, camera } = createViewer(Viewer, { fitCameraOnResize: false });

  viewer.resize(800, 600);
  const ui = new UIBasic(viewer);

  viewer.canvas.emit('ready');
  assert.deepEqual(camera.fitCalls, [0], 'ready layers retain the initial auto-fit');

  camera.transform = { x: 37, y: -19, z: 3.25, a: 42 };
  const beforeResize = { ...camera.transform };
  viewer.resize(900, 525);

  assert.deepEqual(camera.viewport, { x: 0, y: 0, dx: 900, dy: 525, w: 900, h: 525 });
  assert.deepEqual(camera.transform, beforeResize);
  assert.deepEqual(camera.fitCalls, [0], 'resize does not fit the camera');
  assert.equal(camera.viewportCalls[1].preserveTransform, true);

  ui.actions.home.task();
  assert.deepEqual(camera.fitCalls, [0, 250]);
  assert.deepEqual(camera.transform, { x: 0, y: 0, z: 1, a: 0 });
});
