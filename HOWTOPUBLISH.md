# How to Publish OpenLIME to npm

This document contains instructions for managing the OpenLIME package on npm.

## Publishing the Package

### First-time Setup

1. **Create an npm account** if you don't already have one:
   - Go to https://www.npmjs.com/signup
   - Or run `npm adduser` in your terminal and follow the prompts

2. **Log in to npm** via the command line:
   ```bash
   npm login
   ```
   Enter your username, password, and email when prompted.

### Publishing Process

1. **Prepare your package**:
   - Ensure your package.json has the correct version number
   - Run `npm run update-readme` to update version numbers in the README
   - Check that all files are correctly included in the `files` array in package.json

2. **Check what files will be published**:
   ```bash
   npm pack --dry-run
   ```
   This shows exactly what will be included in the published package without actually publishing.

3. **Publish your package**:
   ```bash
   npm publish
   ```
   This will run the `prepublishOnly` script, which will:
   - Update the README.md with the current version
   - Build the library using rollup
   - Generate documentation
   - Then publish the package to npm

### Updating the Package

1. **Update the version number** in package.json using semantic versioning:
   ```bash
   npm version patch  # for bug fixes (1.0.1 -> 1.0.2)
   npm version minor  # for new features (1.0.1 -> 1.1.0)
   npm version major  # for breaking changes (1.0.1 -> 2.0.0)
   ```
   This will update package.json and create a git tag.

2. **Publish the new version**:
   ```bash
   npm publish
   ```

## Managing Package Ownership

### Adding a New Owner

To add another user who can publish updates to OpenLIME:

1. **Make sure you're logged in** as the current owner:
   ```bash
   npm login
   ```

2. **Add the new owner** by their npm username:
   ```bash
   npm owner add username openlime
   ```
   Replace `username` with the npm username of the person you want to add.

3. **Verify the owners** of the package:
   ```bash
   npm owner ls openlime
   ```

The new owner will need to have an npm account, and they'll have full publishing rights to the package.

### Removing an Owner

If you need to remove an owner:
```bash
npm owner rm username openlime
```

## Unpublishing or Deprecating

### Important Considerations

- **npm's unpublish policy**: 
  - Packages with fewer than 72 hours since publication can be completely unpublished
  - After 72 hours, you can only unpublish specific versions if no other packages depend on them
  - Completely removing a package after 72 hours requires contacting npm support
- Unpublishing can break projects that depend on your package

### Unpublishing a Specific Version

To remove just one version:
```bash
npm unpublish openlime@1.0.1
```

### Unpublishing the Entire Package

Only possible if less than 72 hours old:
```bash
npm unpublish openlime --force
```

### Deprecating (Recommended Alternative)

Instead of unpublishing, consider deprecating:

```bash
# Deprecate a specific version
npm deprecate openlime@1.0.1 "This version is deprecated, please use version x.y.z instead"

# Deprecate all versions
npm deprecate openlime "This package is no longer maintained"
```

This adds a warning message when anyone installs the package but keeps it available.

### For Packages Older Than 72 Hours

If you need to remove a package older than 72 hours:
- Contact npm support: https://www.npmjs.com/support
- Provide a valid reason (security issues, name infringement, etc.)

## CDN Access

After publishing, your package will automatically be available at:
- https://unpkg.com/openlime@[version]/dist/js/openlime.min.js
- https://cdn.jsdelivr.net/npm/openlime@[version]/dist/js/openlime.min.js

Or for the latest version:
- https://unpkg.com/openlime/dist/js/openlime.min.js
- https://cdn.jsdelivr.net/npm/openlime/dist/js/openlime.min.js
