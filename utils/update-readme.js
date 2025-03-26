// utils/update-readme.js
const fs = require('fs');
const path = require('path');

// Use the correct path to package.json (one directory up from utils)
const packageJson = require(path.join(__dirname, '..', 'package.json'));
const currentVersion = packageJson.version;

// Path to README.md (one directory up from utils)
const readmePath = path.join(__dirname, '..', 'README.md');

// Read the README.md content
let readmeContent = fs.readFileSync(readmePath, 'utf8');

// Regular expressions to match CDN URLs with version numbers
const unpkgRegex = /(https:\/\/unpkg\.com\/openlime@)[\d\.]+\//g;
const jsdelivrRegex = /(https:\/\/cdn\.jsdelivr\.net\/npm\/openlime@)[\d\.]+\//g;

// Replace all occurrences with the current version
readmeContent = readmeContent.replace(unpkgRegex, `$1${currentVersion}/`);
readmeContent = readmeContent.replace(jsdelivrRegex, `$1${currentVersion}/`);

// Write the updated content back to README.md
fs.writeFileSync(readmePath, readmeContent, 'utf8');

console.log(`README.md updated with version ${currentVersion}`);