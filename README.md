# openlime
Web-based, advanced images viewer (RTI, multispectral, BRDF, etc. )


Install the package:
```bash
npm install
```

Build the libraries
```bash
npm run build
```

Run the dev server:
```bash
npm run start
```

Then access the demo app at: http://localhost:8080


Run rollup to compile a lib (build/openlime.min.js) that can be used for <script>  approach.

```bash
rollup -c rollup.config.js 
```
or
```bash
npm run rollup
```

Documentation is created using documentation.js. To generate the docs, install documentation

```bash
sudo npm install -g documentation
```

and generate the docs.


```bash
npm run documentation
```

Customization:

skin.css

skin.svg

Run 
```bash
svgo -p skin.svg -o skin.min.svg
```
 to minimize svg.


Documentation.js supports markdown syntax and JSDoc syntax.



JSON example of the configuration:


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
				layout: <image|google|deepzoom|zoomify|iip|iiif> //ooptional if can be recovered from the url.
				

			}
		]
	},
	overlay: {
	}
}



