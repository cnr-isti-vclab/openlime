// Run with: node --experimental-vm-modules --test tests/manager-svg-disk-radius-scale.test.cjs
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
    './BoundingBox.js': { BoundingBox: class {} },
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
  return mod.namespace;
}

function diskElement() {
  const attributes = new Map();
  return {
    dataset: {},
    classList: { contains: name => name === 'annotation-disk' },
    style: { filter: '', cursor: '', removeProperty(name) { this[name] = ''; } },
    setAttribute(name, value) { attributes.set(name, String(value)); },
    removeAttribute(name) { attributes.delete(name); },
    getAttribute(name) { return attributes.get(name) ?? null; },
  };
}

test('selected structural radiusScale updates disk radius and respects explicit structural class', async () => {
  const { ManagerSvgAnnotation, DiskMarker } = await loadManager();
  const manager = Object.create(ManagerSvgAnnotation.prototype);
  const disk = diskElement();
  const annotation = {
    id: 'point',
    data: { _markerType: 'disk', _x: 10, _y: 20 },
    elements: [disk],
    label: '',
  };

  manager.layer = { selected: new Set(['point']) };
  manager.markerOptions = { radius: 10 };
  manager.semanticClasses = {};
  manager.semanticClassOrder = [];
  manager.structuralClasses = {
    selected: { radiusScale: 1.5 },
    underEditing: { stroke: '#f00' },
  };
  manager.defaultFill = '#000';
  manager.defaultStroke = '#fff';
  manager.defaultFillOpacity = 1;
  manager.defaultStrokeWidth = 2;
  manager.preloadStructuralFilters = false;
  manager._pencilEnabled = true;
  manager._inspectEnabled = false;
  manager._interactionSuspended = false;
  manager._mode = 'edit';
  manager.labelVisibility = 'none';
  manager._instantiateMarker = () => new DiskMarker(manager.markerOptions);

  manager._onAnnotationUpdate(annotation, { z: 1 });
  assert.equal(disk.getAttribute('r'), '15');

  manager.layer.selected.clear();
  manager._onAnnotationUpdate(annotation, { z: 1 });
  assert.equal(disk.getAttribute('r'), '10');

  manager.layer.selected.add('point');
  annotation.structuralClass = 'underEditing';
  manager._onAnnotationUpdate(annotation, { z: 1 });
  assert.equal(disk.getAttribute('r'), '10');
});
