// Run with: node --experimental-vm-modules --test tests/canvas-layer-renderer-context.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function createModule(filename, cache) {
  filename = fs.existsSync(filename) ? filename : `${filename}.js`;
  if (cache.has(filename)) return cache.get(filename);
  const module = new vm.SourceTextModule(fs.readFileSync(filename, 'utf8'), {
    context: cache.context,
    identifier: filename,
  });
  cache.set(filename, module);
  return module;
}

async function loadLayersAndCanvas() {
  const cache = new Map();
  cache.context = vm.createContext({
    console,
    window: {},
    fetch: async () => ({ ok: false, statusText: 'not used by this test' }),
    performance: { now: () => 0 },
  });
  const modules = {
    rti: createModule(require.resolve('../src/LayerRTI.js'), cache),
    combiner: createModule(require.resolve('../src/LayerCombiner.js'), cache),
    canvas: createModule(require.resolve('../src/Canvas.js'), cache),
  };

  for (const module of Object.values(modules)) {
    await module.link((specifier, referencingModule) =>
      createModule(path.resolve(path.dirname(referencingModule.identifier), specifier), cache));
  }
  for (const module of Object.values(modules)) await module.evaluate();

  return {
    Canvas: modules.canvas.namespace.Canvas,
    LayerCombiner: modules.combiner.namespace.LayerCombiner,
    LayerRTI: modules.rti.namespace.LayerRTI,
  };
}

test('Canvas propagates renderer context through nested combiners to an RTI child', async () => {
  const { Canvas, LayerCombiner, LayerRTI } = await loadLayersAndCanvas();
  const rtiChild = new LayerRTI({ url: 'base/info.json' });
  const nestedCombiner = new LayerCombiner({ layers: [rtiChild] });
  const composite = new LayerCombiner({ layers: [nestedCombiner] });
  const gl = { label: 'webgl2' };
  const overlayElement = { label: 'overlay' };
  const canvas = Object.assign(Object.create(Canvas.prototype), {
    layers: {},
    gl,
    overlayElement,
    isSrgbSimplified: false,
    prefetch() {},
    emit() {},
    updateSize() {},
  });

  canvas.addLayer('composite', composite);

  assert.equal(canvas.layers.composite, composite);
  assert.equal(Object.keys(canvas.layers).length, 1);
  for (const layer of [nestedCombiner, rtiChild]) {
    assert.equal(layer.gl, gl);
    assert.equal(layer.canvas, canvas);
    assert.equal(layer.overlayElement, overlayElement);
    assert.equal(layer.isSrgbSimplified, false);
  }
});
