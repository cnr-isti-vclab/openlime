// Run with: node --experimental-vm-modules --test tests/manager-svg-label-parts.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class SvgNode {
  constructor(tag) {
    this.tagName = tag;
    this.attrs = {};
    this.children = [];
    this.parentNode = null;
    this.textContent = '';
    this.classList = { contains: name => (this.attrs.class ?? '').split(' ').includes(name) };
  }
  setAttribute(name, value) { this.attrs[name] = String(value); }
  getAttribute(name) { return this.attrs[name] ?? null; }
  removeAttribute(name) { delete this.attrs[name]; }
  appendChild(child) { this.children.push(child); child.parentNode = this; return child; }
  insertBefore(child, sibling) {
    this.children.splice(this.children.indexOf(sibling), 0, child);
    child.parentNode = this;
  }
  replaceChildren() { this.children = []; }
  remove() {
    if (this.parentNode) this.parentNode.children.splice(this.parentNode.children.indexOf(this), 1);
    this.parentNode = null;
  }
  getBBox() {
    if (this.tagName === 'text') {
      const font = Number(this.attrs['font-size'] ?? this.parentNode?.attrs['font-size'] ?? 14);
      return { x: 0, y: -font * 0.8, width: this.textContent.length * font * 0.6, height: font };
    }
    return { x: Number(this.attrs.x ?? 0), y: Number(this.attrs.y ?? 0),
      width: Number(this.attrs.width ?? 0), height: Number(this.attrs.height ?? 0) };
  }
  getComputedTextLength() { return this.getBBox().width; }
}

const createSVGElement = (tag, attrs = {}) => {
  const node = new SvgNode(tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
};

async function loadManager() {
  const source = fs.readFileSync(require.resolve('../src/ManagerSvgAnnotation.js'), 'utf8');
  const context = vm.createContext({ console, Map, Set, performance });
  const mod = new vm.SourceTextModule(source, { context });
  const mocks = {
    './Annotation.js': { Annotation: class {} },
    './LayerSvgAnnotation.js': { LayerSvgAnnotation: class {} },
    './CoordinateSystem.js': { CoordinateSystem: class {} },
    './BoundingBox.js': { BoundingBox: class {} },
    './Util.js': { Util: { createSVGElement } },
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

function setup(ManagerSvgAnnotation) {
  const manager = Object.create(ManagerSvgAnnotation.prototype);
  manager.labelVisibility = 'all';
  manager.labelStyle = { fontSizePx: 14, paddingPx: 6, offsetYPx: 4,
    textFill: 'white', backgroundFill: 'black', textFillSelected: 'yellow',
    backgroundFillSelected: 'blue', textFillUnderEditing: 'red',
    backgroundFillUnderEditing: 'green' };
  manager._getClassStyle = () => ({ stroke: 'yellow' });
  manager._resolveStructuralClassId = value => value;
  const geometry = createSVGElement('rect', { x: 10, y: 20, width: 20, height: 20 });
  const annotation = { label: 'Plain', labelParts: [
    { type: 'badge', text: 'G123' }, { type: 'text', text: ' ' },
    { type: 'badge', text: 'D1' }, { type: 'text', text: ' <Lacuna>&' },
  ], elements: [geometry], data: { _x: 20, _y: 20 }, needsUpdate: false };
  return { manager, annotation };
}

const node = (annotation, className) => annotation.elements.find(el => el.classList.contains(className));

test('structured parts render in order with circular inverse badges and literal text', async () => {
  const { manager, annotation } = setup(await Manager);
  annotation.label = '';
  manager._updateLabelElement(annotation, { z: 1 });
  const group = node(annotation, 'annotation-label-parts');
  const bg = node(annotation, 'annotation-label-bg');
  assert.ok(group && bg);
  assert.equal(node(annotation, 'annotation-label'), undefined);
  assert.deepEqual(group.children.map(el => el.tagName), ['circle', 'text', 'text', 'circle', 'text', 'text']);
  assert.equal(group.children[1].textContent, 'G123');
  assert.equal(group.children[5].textContent, ' <Lacuna>&');
  assert.equal(group.children[0].getAttribute('fill'), 'white');
  assert.equal(group.children[1].getAttribute('fill'), 'black');
  assert.equal(group.children[2].getAttribute('fill'), null);
  assert.equal(group.children[0].getAttribute('cy'), '0');
  assert.ok(Number(group.children[0].getAttribute('r')) > Number(group.children[3].getAttribute('r')));
  assert.equal(Number(bg.getAttribute('y')) + Number(bg.getAttribute('height')), 16);
});

test('explicit breaks form left-aligned rows with a zoom-stable gap and widest-row background', async () => {
  const { manager, annotation } = setup(await Manager);
  manager.labelStyle.lineGapPx = 6;
  annotation.labelParts = [
    { type: 'badge', text: 'G123' }, { type: 'text', text: ' Lacuna' },
    { type: 'break' },
    { type: 'badge', text: 'D4' }, { type: 'text', text: ' Corrosion' },
  ];
  manager._updateLabelElement(annotation, { z: 1 });
  const group = node(annotation, 'annotation-label-parts');
  const bg = node(annotation, 'annotation-label-bg');
  const [first, , firstText, second, , secondText] = group.children;
  const left = circle => Number(circle.getAttribute('cx')) - Number(circle.getAttribute('r'));
  const gap = () => Number(second.getAttribute('cy')) - Number(second.getAttribute('r'))
    - Number(first.getAttribute('cy')) - Number(first.getAttribute('r'));
  assert.deepEqual(group.children.map(el => el.tagName), ['circle', 'text', 'text', 'circle', 'text', 'text']);
  assert.ok(Math.abs(left(first) - left(second)) < 1e-9);
  assert.ok(Number(second.getAttribute('cy')) > Number(first.getAttribute('cy')));
  assert.ok(Math.abs(gap() - 6) < 1e-9);
  const firstWidth = Number(first.getAttribute('r')) * 2 + firstText.getBBox().width;
  const secondWidth = Number(second.getAttribute('r')) * 2 + secondText.getBBox().width;
  assert.ok(secondWidth > firstWidth);
  assert.ok(Math.abs(Number(bg.getAttribute('width')) - secondWidth - 12) < 1e-9);
  assert.ok(Math.abs(Number(bg.getAttribute('height'))
    - (2 * Number(first.getAttribute('r')) + 2 * Number(second.getAttribute('r')) + 6 + 12)) < 1e-9);
  assert.equal(Number(bg.getAttribute('y')) + Number(bg.getAttribute('height')), 16);
  assert.equal(firstText.textContent, ' Lacuna');
  assert.equal(secondText.textContent, ' Corrosion');

  const size = { width: Number(bg.getAttribute('width')), height: Number(bg.getAttribute('height')),
    radius: Number(first.getAttribute('r')) };
  manager._updateLabelElement(annotation, { z: 2 });
  const [zoomFirst, , , zoomSecond] = group.children;
  const zoomGap = Number(zoomSecond.getAttribute('cy')) - Number(zoomSecond.getAttribute('r'))
    - Number(zoomFirst.getAttribute('cy')) - Number(zoomFirst.getAttribute('r'));
  assert.ok(Math.abs(zoomGap * 2 - 6) < 1e-9);
  assert.ok(Math.abs(Number(bg.getAttribute('width')) * 2 - size.width) < 1e-9);
  assert.ok(Math.abs(Number(bg.getAttribute('height')) * 2 - size.height) < 1e-9);
  assert.equal(Number(zoomFirst.getAttribute('r')) * 2, size.radius);

  manager._updateLabelElement(annotation, { z: 2 }, true);
  assert.equal(group.children[0].getAttribute('fill'), 'yellow');
  assert.equal(group.children[1].getAttribute('fill'), 'blue');
  assert.equal(group.children[3].getAttribute('fill'), 'yellow');
  assert.equal(group.children[4].getAttribute('fill'), 'blue');
  annotation.structuralClass = 'underEditing';
  manager._updateLabelElement(annotation, { z: 2 }, true);
  assert.equal(group.children[3].getAttribute('fill'), 'red');
  assert.equal(group.children[4].getAttribute('fill'), 'green');
});

test('multiline parts update, hide, and switch to single-line parts or a plain label', async () => {
  const { manager, annotation } = setup(await Manager);
  annotation.labelParts = [
    { type: 'badge', text: 'G2' }, { type: 'text', text: ' Lacuna' },
    { type: 'break' }, { type: 'badge', text: 'D4' }, { type: 'text', text: ' Corrosion' },
  ];
  manager._updateLabelElement(annotation, { z: 1 });
  const bg = node(annotation, 'annotation-label-bg');
  const multilineHeight = Number(bg.getAttribute('height'));
  annotation.labelParts[4].text = ' Very long corrosion';
  manager._updateLabelElement(annotation, { z: 1 });
  assert.equal(node(annotation, 'annotation-label-parts').children[5].textContent, ' Very long corrosion');

  manager.labelVisibility = 'selected';
  manager._updateLabelElement(annotation, { z: 1 }, false);
  assert.equal(node(annotation, 'annotation-label-parts'), undefined);
  manager._updateLabelElement(annotation, { z: 1 }, true);
  assert.ok(node(annotation, 'annotation-label-parts'));
  manager.labelVisibility = 'none';
  manager._updateLabelElement(annotation, { z: 1 }, true);
  assert.equal(node(annotation, 'annotation-label-bg'), undefined);

  manager.labelVisibility = 'all';
  annotation.labelParts = [{ type: 'badge', text: 'G2' }, { type: 'text', text: ' Lacuna' }];
  manager._updateLabelElement(annotation, { z: 1 });
  const group = node(annotation, 'annotation-label-parts');
  assert.equal(Number(group.children[0].getAttribute('cy')), 0);
  assert.ok(Number(node(annotation, 'annotation-label-bg').getAttribute('height')) < multilineHeight);
  annotation.labelParts = [{ type: 'break' }];
  manager._updateLabelElement(annotation, { z: 1 });
  assert.equal(node(annotation, 'annotation-label-parts'), undefined);
  delete annotation.labelParts;
  manager._updateLabelElement(annotation, { z: 1 });
  assert.equal(node(annotation, 'annotation-label').textContent, 'Plain');
  assert.equal(node(annotation, 'annotation-label-parts'), undefined);
});

test('zoom, selection, structural colors, cache, visibility, and plain-label fallback', async () => {
  const { manager, annotation } = setup(await Manager);
  manager._updateLabelElement(annotation, { z: 1 });
  const first = node(annotation, 'annotation-label-parts');
  const radius = Number(first.children[0].getAttribute('r'));
  manager._updateLabelElement(annotation, { z: 2 });
  const group = node(annotation, 'annotation-label-parts');
  assert.equal(Number(group.children[0].getAttribute('r')) * 2, radius);
  assert.equal(Number(group.getAttribute('font-size')), 7);

  manager._updateLabelElement(annotation, { z: 2 }, true);
  assert.equal(group.children[0].getAttribute('fill'), 'yellow');
  assert.equal(group.children[1].getAttribute('fill'), 'blue');
  annotation.structuralClass = 'underEditing';
  manager._updateLabelElement(annotation, { z: 2 }, true);
  assert.equal(group.children[0].getAttribute('fill'), 'red');
  assert.equal(group.children[1].getAttribute('fill'), 'green');

  annotation.labelParts[0].text = 'G12345';
  manager._updateLabelElement(annotation, { z: 2 }, true);
  assert.equal(group.children[1].textContent, 'G12345');
  manager.labelVisibility = 'selected';
  manager._updateLabelElement(annotation, { z: 2 }, false);
  assert.equal(node(annotation, 'annotation-label-parts'), undefined);
  assert.equal(node(annotation, 'annotation-label-bg'), undefined);
  manager._updateLabelElement(annotation, { z: 2 }, true);
  assert.ok(node(annotation, 'annotation-label-parts'));
  manager.labelVisibility = 'none';
  manager._updateLabelElement(annotation, { z: 2 }, true);
  assert.equal(node(annotation, 'annotation-label-parts'), undefined);

  manager.labelVisibility = 'all';
  annotation.labelParts = [];
  manager._updateLabelElement(annotation, { z: 1 });
  assert.equal(node(annotation, 'annotation-label-parts'), undefined);
  delete annotation.labelParts;
  manager._updateLabelElement(annotation, { z: 1 });
  assert.equal(node(annotation, 'annotation-label').textContent, 'Plain');
  assert.equal(node(annotation, 'annotation-label-parts'), undefined);
});

test('updateAnnotation changes presentation parts without writing annotation data', async () => {
  const { manager, annotation } = setup(await Manager);
  annotation.id = 'one';
  manager.getAnnotationById = id => id === 'one' ? annotation : null;
  let redraws = 0;
  manager.viewer = { redraw() { redraws++; } };
  manager.emit = () => {};
  const data = annotation.data;
  manager.updateAnnotation('one', { labelParts: [
    { type: 'badge', text: 'X9' }, { type: 'break' }, { type: 'text', text: ' Detail' },
  ] });
  assert.equal(annotation.labelParts[0].text, 'X9');
  assert.equal(annotation.labelParts[1].type, 'break');
  assert.equal(annotation.data, data);
  assert.equal(redraws, 1);
  manager.updateAnnotation('one', { labelParts: null });
  assert.equal(annotation.labelParts, undefined);
  assert.equal(redraws, 2);
});
