# Openlime (Open Layered IMage Explorer)
Web-based, advanced images viewer (RTI, multispectral, BRDF, etc. )

## Installing npm

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

You do not need to use node.js as the server.  Instead, you
can use the `<script>` approach, embedding a rollup file, either
`./build/openlime.min.js`
or 
`./build/openlime.js`,
in your web page.  
The files
`./dist/ui_custom.html` and `./dist/ui_svg.html` are examples of
this approach.  
Such files will display correctly when served from any web server.
To create the rollup files, call `rollup`:

```bash
npm run rollup
```

### Keep the rollup files up to date

If you keep a `nodemon` (**node** **mon**itor) script running, it
will automatically update the rollup files
`./build/openlime.min.js`
and 
`./build/openlime.js` 
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
npm run documentation
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



