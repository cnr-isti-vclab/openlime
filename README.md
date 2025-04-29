# OpenLIME (Open Layered IMage Explorer)

<p align="center" style="margin-top: 20px; margin-bottom: 15px;">
  <img src="https://cnr-isti-vclab.github.io/openlime/img/openlime-teaser.jpg" alt="OpenLIME Teaser" width="600">
</p>


**OpenLIME** (Open Layered IMage Explorer) is an open-source JavaScript library for the efficient display of scalable high-resolution relightable images.

**OpenLime** is jointly developed by [CRS4 Visual and Data-intensive Computing Group](https://www.crs4.it/research/visual-and-data-intensive-computing/) and [CNR ISTI - Visual Computing Lab](http://vcg.isti.cnr.it/). 

**OpenLIME** natively supports BRDF and RTI datasets, and can be easily extended for other multi-channel raster datasets, such as hyper spectral imaging or other reflectance modeling. Input data can be combined in a multi-layer visualization system using opacity and blending modes, and interactive lenses.

All web image types (*jpg*, *png*, *gif*, etc...) are supported as well as the most common multi-resolution image formats (*deepzoom*, *zoomify*, *IIIF*, *google maps*), which are suitable for large images.

**OpenLIME** provides a set of ready-to-use layers that allows developers to quickly publish their datasets on the web or make kiosk applications. Ready-to-use layers ranging from images, to multi-channel data (such as, for example, RTI or BRDF) or the combination of multiple layers or for visualization through lenses.

The **OpenLIME** library comes with a responsive user iterface that works well with both desktop monitors and multitouch systems. Additionally, it is designed to be highly configurable, so it will be easy for the experienced developer to build their own custom interface. 

The library contains a convenient set of examples that can be used both to understand how the library works and as a starting point for programming with **OpenLIME** itself.

API Docs: https://cnr-isti-vclab.github.io/openlime/

## Using OpenLIME in your project

### Via CDN (recommended for quick start)

The easiest way to use OpenLIME is via a CDN like unpkg or jsdelivr:

```html
<!-- Using unpkg -->
<link rel="stylesheet" href="https://unpkg.com/openlime@1.2.1/dist/css/skin.css">
<link rel="stylesheet" href="https://unpkg.com/openlime@1.2.1/dist/css/light.css">
<script src="https://unpkg.com/openlime@1.2.1/dist/js/openlime.min.js"></script>

<!-- OR using jsdelivr -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/openlime@1.2.1/dist/css/skin.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/openlime@1.2.1/dist/css/light.css">
<script src="https://cdn.jsdelivr.net/npm/openlime@1.2.1/dist/js/openlime.min.js"></script>
```

### Installing via npm

If you're using a build system like webpack or rollup:

```bash
npm install openlime
```

Then import it into your project:

#### ES Module (ESM)
```javascript
import * as OpenLIME from 'openlime';

// Or import specific components
import { Viewer, Layer, LayerImage } from 'openlime';
```

#### CommonJS (CJS)
```javascript
const OpenLIME = require('openlime');
```

#### UMD (in browser with module bundler)
```javascript
import OpenLIME from 'openlime';
```

### Basic Usage Example

Here's a simple example of how to create a viewer with a single image layer:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>OpenLIME Basic Example</title>
  <link rel="stylesheet" href="https://unpkg.com/openlime@1.2.1/dist/css/lime.css">
  <style>
    #viewer {
      width: 100%;
      height: 600px;
    }
  </style>
</head>
<body>
  <div id="viewer"></div>

  <script src="https://unpkg.com/openlime@1.2.1/dist/js/openlime.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Create a viewer
      const viewer = new OpenLIME.Viewer('viewer', {
        prefetchBorder: 1,
        layout: 'basic'
      });

      // Create and add an image layer
      const imageLayer = new OpenLIME.LayerImage({
        id: 'base-image',
        layout: 'image',
        url: 'path/to/your/image.jpg'
      });
      
      viewer.addLayer(imageLayer);
      
      // Add pan/zoom controller
      const controller = new OpenLIME.ControllerPanZoom();
      viewer.addController(controller);
    });
  </script>
</body>
</html>
```

For multi-resolution images:

```javascript
// Using a DeepZoom image
const deepZoomLayer = new OpenLIME.LayerImage({
  id: 'deepzoom-image',
  layout: 'deepzoom',
  url: 'path/to/your/deepzoom_files/'
});

// Using a Zoomify image
const zoomifyLayer = new OpenLIME.LayerImage({
  id: 'zoomify-image',
  layout: 'zoomify',
  url: 'path/to/your/zoomify/'
});

// Using an IIIF image
const iiifLayer = new OpenLIME.LayerImage({
  id: 'iiif-image',
  layout: 'iiif',
  url: 'https://your-iiif-server.org/your-image-id'
});
```

## Development Setup

### Installing npm

### Ubuntu

```bash
sudo apt install npm
```

#### Ubuntu 18.04
You might have some problem using the old npm version shipped with Ubuntu18.04, and even upgrading it. This worked for me:
```bash
sudo npm install -g npm@latest-6
```

### Windows
To obtain npm for Windows, you need to download the Windows version
of node.js from https://nodejs.org/en/download/ .
You can download either the Windows Installer (.msi) or
the Windows Binary (.zip).  If you download 
and expand the Windows
Binary zip file, you will afterwards
need to set your `PATH` variable
to include the directory that contains the npm executable
(this directory is the subdirectory `node_modules\npm\bin`).

## Setting up npm (all platforms)

The following step should be performed in the `openlime`
directory that was cloned from this repository.

Before using npm, you need to install the required 
packages locally.  This only needs to be done once.
The following command tells npm to download
all the webpack packages (and their dependencies) listed in the
`package.json` file.  These will be put in the `./node_modules`
directory.

```bash
npm install
```

The downloaded packages include `rollup`, `documentation`,
and `nodemon`, which will be used below.
 
## Using npm (all platforms)

These steps should be performed in the `openlime`
directory that was cloned from this repository.

### Build the code

The following command reads the javascript code in `./src`, and
puts the transpiled webpack code in `./dist/main.js`.
```bash
npm run build
```

The webpack code is used, for example, by the
`./dist/index.html` web page.

### Run the node.js server

If you wish, you can run the node.js development server
to serve your web pages.
This server will use `./dist` as the home directory.
The server is run in "hot" mode, which means that 
whenever you change a file in the `./src` directory, 
the webpack code will automatically be rebuilt, and
your web browser will automatically refresh, to reflect
your latest changes.
```bash
npm run start
```

Then access the demo app at http://localhost:8080 (which
by default is `./dist/index.html`).

If you prefer to serve from a different port, say 8088, you can call
```bash
npm run start -- --port 8088
```

### Create a rollup file to use with other servers

To create a rollup file that can be used with other servers, you don't need to rely on Node.js as the server. Instead, you can embed the rollup file directly in your web page using the `<script>` tag. You can reference either `./dist/js/openlime.min.js` or `./dist/js/openlime.js`.

In the `./dist/examples` folder, you'll find simple **openLIME** web apps that demonstrate how to use this approach. These files will display correctly when served from any web server.

To generate the rollup files, simply run the following command:
```bash
npm run rollup
```

### Keep the rollup files up to date

If you keep a `nodemon` (**node** **mon**itor) script running, it
will automatically update the rollup files
`./dist/js/openlime.min.js`
and 
`./dist/js/openlime.js` 
whenever anything changes in the `./src` directory.
Note that, unlike with the node.js server, the browser will
not refresh automatically; you will have to do that yourself
once the rollup files have been updated.

```bash
npm run nodemon
```

### Create documentation

The documentation is created from structured comments in the
source code (in `./src`).
Once created, it is accessible from `./docs/index.html`

```bash
npm run doc
```

### Customization

skin.css

skin.svg

Run 
```bash
svgo -p 1 skin.svg -o skin.min.svg
```
to minimize svg.


Documentation.js supports markdown syntax and JSDoc syntax.



JSON example of the configuration:


```
{
	camera: { 
	},
	canvas: {
		rasters: [
			{
				id:
				name:
				width: //optional
				height: //optional
				url: 
				layout: <image|google|deepzoom|zoomify|iip|iiif> //optional if can be determined from the url.
				

			}
		]
	},
	overlay: {
	}
}
```