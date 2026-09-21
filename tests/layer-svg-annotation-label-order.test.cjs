// Run with: node --experimental-vm-modules --test tests/layer-svg-annotation-label-order.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

class SvgNode {
  constructor(tagName) {
    this.tagName = tagName;
    this.attributes = {};
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.classes = new Set();
    this.classList = {
      add: (...names) => names.forEach(name => this.classes.add(name)),
      remove: (...names) => names.forEach(name => this.classes.delete(name)),
      contains: name => this.classes.has(name),
      toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name),
    };
  }

  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }

  append(...nodes) { nodes.forEach(node => this.appendChild(node)); }

  appendChild(node) {
    if (node.parentNode) node.remove();
    this.children.push(node);
    node.parentNode = this;
    return node;
  }

  remove() {
    if (this.parentNode) {
      const index = this.parentNode.children.indexOf(this);
      if (index >= 0) this.parentNode.children.splice(index, 1);
    }
    this.parentNode = null;
  }

  querySelectorAll(selector) {
    const annotation = selector.match(/^\[data-annotation(?:="([^"]+)")?\]$/);
    const matches = node => annotation
      && node.getAttribute('data-annotation') !== null
      && (annotation[1] === undefined || node.getAttribute('data-annotation') === annotation[1]);
    const result = [];
    const visit = node => {
      for (const child of node.children) {
        if (matches(child)) result.push(child);
        visit(child);
      }
    };
    visit(this);
    return result;
  }
}

const document = {
  createElementNS(namespace, tagName) { return new SvgNode(tagName); },
  createElement(tagName) { return new SvgNode(tagName); },
};

async function loadLayer() {
  const source = fs.readFileSync(require.resolve('../src/LayerSvgAnnotation.js'), 'utf8');
  const context = vm.createContext({ console, document, Set });
  const mod = new vm.SourceTextModule(source, { context });
  class Layer {}
  Layer.prototype.types = {};
  class LayerAnnotation {
    constructor(options) {
      Object.assign(this, options);
      this.annotations = options.annotations ?? [];
      this.selected = options.selected ?? new Set();
      this.status = options.status ?? 'ready';
      this.visible = options.visible ?? true;
      this.style = options.style ?? '';
      this.transform = options.transform ?? { compose: value => value };
    }
    clearSelected() { this.selected.clear(); }
    setSelected(annotation, on) {
      if (on) this.selected.add(annotation.id);
      else this.selected.delete(annotation.id);
    }
    deleteAnnotationById() { return null; }
  }
  const mocks = {
    './Util': { Util: {} },
    './Layer': { Layer },
    './Annotation': { Annotation: class {} },
    './LayerAnnotation': { LayerAnnotation },
    './CoordinateSystem': { CoordinateSystem: { reflectY: value => value } },
  };
  await mod.link(specifier => {
    const exports = mocks[specifier];
    assert.ok(exports, `Unexpected dependency ${specifier}`);
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
    }, { context });
  });
  await mod.evaluate();
  return mod.namespace.LayerSvgAnnotation;
}

const element = (tagName, ...classes) => {
  const node = new SvgNode(tagName);
  node.classList.add(...classes);
  return node;
};

test('labels use a paint layer above creation-ordered annotation geometry', async () => {
  const LayerSvgAnnotation = await loadLayer();
  const firstGeometry = element('path', 'annotation-shape');
  const firstLabel = element('text', 'annotation-label');
  const secondGeometry = element('rect', 'annotation-shape');
  const thirdGeometry = element('circle', 'annotation-shape');
  const structuredBackground = element('rect', 'annotation-label-bg');
  const structuredParts = element('g', 'annotation-label-parts');
  const annotations = [
    { id: 'first', visible: true, ready: true, needsUpdate: true,
      semanticClass: 'one', elements: [firstGeometry, firstLabel] },
    { id: 'second', visible: true, ready: true, needsUpdate: true,
      semanticClass: 'two', elements: [secondGeometry] },
    { id: 'third', visible: true, ready: true, needsUpdate: true,
      semanticClass: 'three', elements: [thirdGeometry, structuredBackground, structuredParts] },
  ];
  const overlayElement = new SvgNode('div');
  const measuredParents = [];
  const layer = new LayerSvgAnnotation({
    annotations,
    overlayElement,
    shadow: false,
    annotationUpdate(annotation) {
      for (const node of annotation.elements.filter(item => item.classList.contains('annotation-label')
        || item.classList.contains('annotation-label-bg')
        || item.classList.contains('annotation-label-parts'))) {
        measuredParents.push(node.parentNode);
      }
    },
  });
  layer.boundingBox = () => ({ corner: () => ({ x: 0, y: 0 }) });

  layer.prefetch({ x: 0, y: 0, z: 1, a: 0 });

  assert.deepEqual(layer.svgElement.children, [layer.svgGeometryGroup, layer.svgLabelGroup]);
  assert.deepEqual(layer.svgGeometryGroup.children, [firstGeometry, secondGeometry, thirdGeometry]);
  assert.deepEqual(layer.svgLabelGroup.children, [firstLabel, structuredBackground, structuredParts]);
  assert.equal(layer.svgLabelGroup.getAttribute('pointer-events'), 'none');
  assert.ok(layer.svgLabelGroup.children.every(node => node.getAttribute('pointer-events') === 'none'));
  assert.ok(measuredParents.every(parent => parent === layer.svgLabelGroup),
    'annotationUpdate sees labels after they enter the DOM');
  assert.equal(firstLabel.getAttribute('data-annotation'), 'first');
  assert.ok(firstLabel.classList.contains('openlime-annotation'));

  const replacementGeometry = element('polygon', 'annotation-shape');
  annotations[0].elements = [replacementGeometry];
  annotations[0].needsUpdate = true;
  layer.prefetch({ x: 0, y: 0, z: 1, a: 0 });

  assert.equal(firstGeometry.parentNode, null);
  assert.equal(firstLabel.parentNode, null, 'stale labels are removed from the label group');
  assert.deepEqual(layer.svgGeometryGroup.children,
    [secondGeometry, thirdGeometry, replacementGeometry]);
});
