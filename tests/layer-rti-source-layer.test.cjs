// Run with: node --experimental-vm-modules --test tests/layer-rti-source-layer.test.cjs
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

async function loadRTI() {
  const cache = new Map();
  cache.context = vm.createContext({
    console,
    window: {},
    fetch: async () => ({ ok: false, statusText: 'not used by this test' }),
    performance: { now: () => 0 },
  });
  const layerModule = createModule(require.resolve('../src/Layer.js'), cache);
  const rtiModule = createModule(require.resolve('../src/LayerRTI.js'), cache);
  await rtiModule.link(specifier => createModule(path.resolve(path.dirname(rtiModule.identifier), specifier), cache));
  await rtiModule.evaluate();
  return { Layer: layerModule.namespace.Layer, LayerRTI: rtiModule.namespace.LayerRTI };
}

const rtiConfig = {
  type: 'ptm',
  colorspace: 'rgb',
  nplanes: 3,
  materials: [{ scale: [1, 1, 1], bias: [0, 0, 0] }],
};

test('an RTI layer derived through sourceLayer shares resources and supports RTI modes', async () => {
  const { Layer, LayerRTI } = await loadRTI();
  const baseRtiLayer = new LayerRTI({ url: 'base/info.json' });
  baseRtiLayer.json = rtiConfig;
  baseRtiLayer.shader.init(rtiConfig);
  baseRtiLayer.rasters.push({ id: 'coefficient-plane' });
  baseRtiLayer.staticTextures.push({ id: 'static-texture' });

  const derived = new Layer({
    type: 'rti',
    sourceLayer: baseRtiLayer,
    visible: false,
  });

  assert.equal(derived.visible, false);
  assert.equal(derived.tiles, baseRtiLayer.tiles);
  assert.equal(derived.layout, baseRtiLayer.layout);
  assert.deepEqual(derived.rasters, baseRtiLayer.rasters);
  assert.notEqual(derived.rasters, baseRtiLayer.rasters);
  assert.equal(derived.rasters[0], baseRtiLayer.rasters[0]);
  assert.equal(derived.staticTextures, baseRtiLayer.staticTextures);

  derived.shader.setMode('light');
  assert.equal(derived.shader.mode, 'light');
  derived.shader.setMode('gray_diffuse');
  assert.equal(derived.shader.mode, 'gray_diffuse');
});

test('a primary RTI layer still rejects directly supplied rasters', async () => {
  const { LayerRTI } = await loadRTI();
  assert.throws(
    () => new LayerRTI({ url: 'base/info.json', rasters: [{}] }),
    error => error === 'Rasters options should be empty!',
  );
});
