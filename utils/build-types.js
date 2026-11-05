const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const projectRoot = path.join(__dirname, '..');
const defaultTypesDir = path.join(projectRoot, 'dist', 'types');

function writeTypesIndex(typesDir) {
  if (!fs.existsSync(typesDir) || !fs.statSync(typesDir).isDirectory()) {
    throw new Error(`Types directory does not exist: ${typesDir}`);
  }

  const declarations = fs.readdirSync(typesDir, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.d.ts') && entry.name !== 'index.d.ts')
    .map(entry => entry.name)
    .sort();

  if (declarations.length === 0) {
    throw new Error(`No declaration files found in: ${typesDir}`);
  }

  const barrel = declarations
    .map(file => `export * from './${file.slice(0, -'.d.ts'.length)}';`)
    .join('\n') + '\n';

  const indexPath = path.join(typesDir, 'index.d.ts');
  fs.writeFileSync(indexPath, barrel, 'utf8');
  console.log(`Generated ${indexPath} with ${declarations.length} exports.`);
}

function compileTypes() {
  fs.rmSync(defaultTypesDir, { recursive: true, force: true });

  const tsc = require.resolve('typescript/bin/tsc');
  const result = spawnSync(
    process.execPath,
    [tsc, '-p', path.join(projectRoot, 'tsconfig.types.json')],
    { cwd: projectRoot, stdio: 'inherit' }
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`TypeScript compiler exited with status ${result.status}`);
  }

  writeTypesIndex(defaultTypesDir);
}

function main(args) {
  if (args[0] === '--index-only' && args.length === 2) {
    writeTypesIndex(path.resolve(args[1]));
    return;
  }
  if (args.length !== 0) {
    throw new Error('Usage: node utils/build-types.js [--index-only <types-directory>]');
  }

  compileTypes();
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(`build-types: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { writeTypesIndex };
