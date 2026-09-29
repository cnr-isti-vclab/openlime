// Run with: node --experimental-vm-modules --test tests/scale-bar-units.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

async function loadUnits() {
  const source = fs.readFileSync(require.resolve('../src/ScaleBar.js'), 'utf8');
  const context = vm.createContext({});
  const mod = new vm.SourceTextModule(source, { context });
  await mod.link(specifier => {
    if (specifier !== './Util') throw new Error(`Unexpected import: ${specifier}`);
    return new vm.SyntheticModule(['Util'], function () {
      this.setExport('Util', {});
    }, { context });
  });
  await mod.evaluate();
  return mod.namespace.Units;
}

test('Units formats millimeter values in inches and feet', async () => {
  const Units = await loadUnits();
  const units = new Units();

  assert.equal(units.format(25.4, 'in'), '1.00in');
  assert.equal(units.format(304.8, 'ft'), '1.00ft');
});
