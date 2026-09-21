// Run with: node --experimental-vm-modules --test tests/manager-svg-double-tap.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function loadManager() {
  const source = fs.readFileSync(require.resolve('../src/ManagerSvgAnnotation.js'), 'utf8');
  const context = vm.createContext({ console, Map, Set, performance });
  const mod = new vm.SourceTextModule(source, { context });
  const mocks = {
    './Annotation.js': { Annotation: class {} },
    './LayerSvgAnnotation.js': { LayerSvgAnnotation: class {} },
    './CoordinateSystem.js': { CoordinateSystem: class {} },
    './Util.js': { Util: {} },
    './Signals.js': { addSignals() {} },
    './Simplify.js': { ramerDouglasPeucker() {}, smooth() {}, relaxDenseZigZagPoints() {} },
  };
  await mod.link(specifier => {
    const exports = mocks[specifier];
    assert.ok(exports, `Unexpected dependency ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await mod.evaluate();
  return mod.namespace.ManagerSvgAnnotation;
}

const Manager = loadManager();

function setup(ManagerSvgAnnotation, markerMode) {
  const manager = Object.create(ManagerSvgAnnotation.prototype);
  manager._mode = 'edit';
  manager._pencilEnabled = true;
  manager._session = null;
  manager.activeMarker = markerMode === 'sequence' ? 'polyline' : 'rect';
  manager.markerOptions = {};
  manager.layer = { layout: {}, selected: new Set(['selected']) };
  manager.viewer = { panzoom: { enableDoubleTapZoom: false }, camera: {
    getCurrentTransform: () => ({ z: 1 })
  } };
  manager._syncPointerEvents = () => {};
  manager._instantiateMarker = () => ({ interactionMode: () => markerMode });
  manager._eventToImageCoords = () => ({ x: 12, y: 34 });
  const starts = [];
  manager._startSession = (...args) => starts.push(args);
  manager.createAnnotation = () => assert.fail('double-tap must not create an annotation');
  const event = { prevented: 0, stopped: 0,
    target: { closest: selector => selector === '.openlime-annotation' ? {} : null },
    preventDefault() { this.prevented++; },
    stopPropagation() { this.stopped++; }
  };
  return { manager, event, starts };
}

test('edit mode leaves a sequence double-tap untouched and selection available', async () => {
  const { manager, event, starts } = setup(await Manager, 'sequence');
  manager.emit = () => {};
  manager.setActiveMarker('polyline');
  manager.setMode('edit');
  manager._onDoubleTap(event);
  assert.equal(manager._mode, 'edit');
  assert.equal(manager._session, null);
  assert.equal(starts.length, 0);
  assert.equal(event.prevented, 0);
  assert.equal(event.stopped, 0);

  manager.deselectAll = () => assert.fail('annotation selection should remain');
  manager._onSingleTap(event);
  assert.ok(manager.layer.selected.has('selected'));
  assert.equal(manager._mode, 'edit');
});

test('edit mode leaves a drag-marker double-tap and vertex drag untouched', async () => {
  const { manager, event, starts } = setup(await Manager, 'drag');
  manager.emit = () => {};
  manager.setActiveMarker('rect');
  manager.setMode('edit');
  manager._onDoubleTap(event);
  manager._onDragStart(event);
  assert.equal(manager._mode, 'edit');
  assert.equal(starts.length, 0);
  assert.equal(event.prevented, 0);
  assert.equal(event.stopped, 0);
});

test('setActiveMarker arms create mode and a sequence double-tap starts drawing', async () => {
  const { manager, event, starts } = setup(await Manager, 'sequence');
  manager.emit = () => {};
  manager.setActiveMarker('polyline');
  assert.equal(manager._mode, 'create');
  manager._onDoubleTap(event);
  assert.equal(starts.length, 1);
  assert.equal(starts[0][0].x, 12);
  assert.equal(starts[0][0].y, 34);
  assert.equal(event.prevented, 1);
  assert.equal(event.stopped, 1);
});

test('setActiveMarker arms create mode and a drag marker starts on drag', async () => {
  const { manager, event, starts } = setup(await Manager, 'drag');
  manager.emit = () => {};
  manager.setActiveMarker('rect');
  manager._onDoubleTap(event);
  assert.equal(starts.length, 0);
  manager._onDragStart(event);
  assert.equal(starts.length, 1);
  assert.equal(event.prevented, 2);
  assert.equal(event.stopped, 1);
});

test('double-tap still finalizes an active sequence session', async () => {
  const { manager, event, starts } = setup(await Manager, 'sequence');
  const vertices = [];
  const annotation = { needsUpdate: false };
  manager._session = { annotation, marker: { addVertex: (...args) => vertices.push(args) } };
  let finalized = false;
  manager._finalizeSession = () => { finalized = true; manager._session = null; };
  manager._onDoubleTap(event);
  assert.equal(vertices.length, 1);
  assert.equal(annotation.needsUpdate, true);
  assert.equal(finalized, true);
  assert.equal(starts.length, 0);
  assert.equal(event.prevented, 1);
  assert.equal(event.stopped, 1);
});
