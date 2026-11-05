const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const buildTypesScript = path.join(__dirname, '..', 'utils', 'build-types.js');
const { writeTypesIndex } = require(buildTypesScript);

function temporaryDirectory(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'openlime-types-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('writes a sorted barrel containing every sibling declaration', t => {
  const directory = temporaryDirectory(t);
  fs.writeFileSync(path.join(directory, 'Viewer.d.ts'), 'export class Viewer {}\n');
  fs.writeFileSync(path.join(directory, 'Annotation.d.ts'), 'export class Annotation {}\n');
  fs.writeFileSync(path.join(directory, 'index.d.ts'), 'stale content\n');
  fs.writeFileSync(path.join(directory, 'README.txt'), 'not a declaration\n');
  fs.mkdirSync(path.join(directory, 'Nested.d.ts'));

  writeTypesIndex(directory);

  assert.equal(
    fs.readFileSync(path.join(directory, 'index.d.ts'), 'utf8'),
    "export * from './Annotation';\nexport * from './Viewer';\n"
  );
});

test('refuses to write a barrel when there are no declarations', t => {
  const directory = temporaryDirectory(t);

  assert.throws(
    () => writeTypesIndex(directory),
    /No declaration files found/
  );
  assert.equal(fs.existsSync(path.join(directory, 'index.d.ts')), false);
});
