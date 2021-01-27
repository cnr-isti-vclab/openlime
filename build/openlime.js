(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.OpenLIME = {}));
}(this, (function (exports) { 'use strict';

	/**
	 * 
	 * @param {number} x position
	 * @param {number} y position
	 * @param {number} z scale
	 * @param {number} a rotation
	 * @param {number} t time
	 *
	 */

	class Transform {
		constructor(x, y, z, a, t) {
			if(x === null) {
				let initial = { x: 0.0, y: 0.0, z: 1.0, a: 0.0, t: 0.0 };
				Object.assing(this, initial());
				return;
			}
			this.x = x ? x : 0.0;
			this.y = y ? y : 0.0;
			this.z = z ? z : 1.0;
			this.a = a ? a : 0.0;
			this.t = t ? t : 0.0;
		}

		copy() {
			return Object.assign({}, this);
		}

		interpolate(source, target, time) {
			if(time < source.t) return source;
			if(time > target.t) return target;

			let t = (target.t - source.t);
			if(t < 0.0001)
				return target;

			let tt = (time - source.t)/t;
			let st = (target.t - t)/t;

			for(let i of ['x', 'y', 'z', 'a'])
				this[i] = (st*source[i] + tt*target[i]);
			this.t = time;
		}
	}

	/**
	 * @param {object} options
	 * * *bounded*: limit translation of the camera to the boundary of the scene.
	 * * *maxZoom*: maximum zoom, 1:maxZoom is screen pixel to image pixel ratio.
	 */

	class Camera {

		constructor(options) {
			Object.assign(this, {
				bounded: true,
				maxZoom: 4,
				minZoom: 'full'
			});
			Object.assign(this, options);
			this.target = new Transform(this.target);
			this.source = this.target.copy();
			console.log(this.target, this.source);
		}

		getCurrentTransform(time) {
			if(time < this.target.source)
				return this.source;
			if(time > this.target.t)
				return this.target;

			let pos = new Transform();
			pos.interpolate(this.source, this.target, time);
			return pos;
		}
	}

	class Canvas {
		constructor(canvas, overlay, options) {
			let initial = 
			Object.assign(this, { 
				preserveDrawingBuffer: false, 
				viewport: [0, 0, 0, 0], 
				gl: null,
				layers: {}
			});

			if(options) {
				Object.assign(this, options);
				for(let id in this.layers)
					this.layers[i] = new Layer(id, this.layers[i]);
			}

			this.camera = new Camera(this.camera);

			this.initElement(canvas);
			
		}

		resize(width, height) {
			this.canvas.width = width;
			this.canvas.height = height;

			this.prefetch();
			this.redraw();
		}

		initElement(canvas) {
			if(!canvas)
				throw "Missing element parameter"

			if(typeof(canvas) == 'string') {
				canvas = document.querySelector(canvas);
				if(!canvas)
					throw "Could not find dom element.";
			}

			if(!canvas.tagName)
				throw "Element is not a DOM element"

			if(canvas.tagName != "CANVAS")
				throw "Element is not a canvas element";


			let glopt = { antialias: false, depth: false, preserveDrawingBuffer: this.preserveDrawingBuffer };
			this.gl = this.gl || 
				canvas.getContext("webgl2", glopt) || 
				canvas.getContext("webgl", glopt) || 
				canvas.getContext("experimental-webgl", glopt) ;

			if (!this.gl)
				throw "Could not create a WebGL context";

			this.canvas = canvas;
		}

		setPosition(dt, x, y, z, a) {
		}

		draw(time) {
			let pos = this.camera.getCurrentTransform(time);

			//todo we could actually prefetch toward the future a little bit
			this.prefetch(pos);

			//draw layers using zindex.
			let ordered = Object.values(this.layers).sort( (a, b) => a.zindex - b.zindex);

			for(let layer of ordered)
				if(ordered.visible)
					ordered.draw(pos);

	//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.
			return pos.t == this.camera.target.t;
		}

	/**
	 * This function have each layer to check which tiles are needed and schedule them for download.
	 * @param {object} transform is the camera position (layer will combine with local transform).
	 */
		prefetch(transform) {
			for(let id in this.layers)
				this.layers[id].prefetch(transform, this.viewport);
		}
	}

	/**
	 * Raster is a providers of images and planes of coefficies.
	 * It support all files format supported by browser and a set of tiled formats.
	 *
	 * Layout can be:
	 * * image: a single image (.jpg, .png etc.)
	 * * google: there is no config file, so layout, suffix is mandatory if not .jpg,  and url is the base folder of the tiles.
	 * * deepzoom: requires only url, can be autodetected from the extension (.dzi)
	 * * zoomify: requires url, can be autodetected, from the ImageProperties.xml, suffix is required if not .jpg
	 * * iip: requires url, can be autodetected from the url
	 * * iiif: layout is mandatory, url should point to base url {scheme}://{server}{/prefix}/{identifier}
	 *
	 * @param {string} id an unique id for each raster
	 * @param {url} url of the content
	 * @param {object} options 
	 * * *type*: vec3 (default value) for standard images, vec4 when including alpha, vec2, float other purpouses.
	 * * *attribute*: <coeff|kd|ks|gloss|normals|dem> meaning of the image.
	 * * *colorSpace*: <linear|srgb> colorspace used for rendering.
	 */

	class Raster {

		constructor(options) {

			Object.assign(this, { 
				type: 'vec3', 
				colorSpace: 'linear',
				attribute: 'kd'
			 });

			Object.assign(this, options);
		}
	}

	/**
	 *  @param {object} options
	 * *label*: used for menu
	 * *samplers*: array of rasters {id:, type: } color, normals, etc.
	 * *uniforms*:
	 * *body*: code actually performing the rendering, needs to return a vec4
	 * *name*: name of the body function
	 */

	class Shader {
		constructor(id, options) {
			this.id = id;
			Object.assign(this, {
				samplers: [],
				uniforms: {},
				name: "",
				body: "",
				program: null   //webgl program
			});
		}

		createProgram(gl) {

			let vert = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vertShader, this.vertShaderSrc(100));

			let compiled = gl.compileShader(vert);
			if(!compiled) {
				console.log(gl.getShaderInfoLog(vert));
				throw "Failed vertex shader compilation: see console log and ask for support.";
			}

			let frag = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(frag, this.fragShaderSrc());
			gl.compileShader(frag);

			let program = gl.createProgram();

			compiled = gl.getShaderParameter(frag, gl.COMPILE_STATUS);
			if(!compiled) {
				console.log(gl.getShaderInfoLog(t.fragShader));
				throw "Failed fragment shader compilation: see console log and ask for support.";
			}

			gl.attachShader(program, vert);
			gl.attachShader(program, frag);
			gl.linkProgram(program);

			this.program = program;
		}

		vertShaderSrc(version) {
			if(!version) version = 100;
			return `
#version ${version}
precision highp float; 
precision highp int; 

uniform mat4 u_matrix;
attribute vec4 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
	gl_Position = u_matrix * a_position;
	v_texCoord = a_texCoord;
}`;
		}

		fragShaderSrc() {
			let str = this.header();
			str += this.attributes();
			str += `
vec4 ${name}() {
${this.body}
}
`;
			str += this.main();
			return str;
		}


		header() {
			let str = `

#ifdef GL_ES
precision highp float;
precision highp int;
#endif

varying vec2 v_texcoord;

`;
			str += uniformsHeader();
			return str;
		}


		uniformsHeader() {
			return "";
		}


		main() {
			let str = `
void main() {
	vec4 color = ${this.id}();
	color.a *= opacity;
	fragColor = color;
}
`;
			return str;
		}

	}

	/**
	 * @param {string} id unique id for layer.
	 * @param {object} options
	 *  * *label*:
	 *  * *transform*: relative coordinate [transformation](#transform) from layer to canvas
	 *  * *visible*: where to render or not
	 *  * *zindex*: stack ordering of the layer higher on top
	 *  * *opacity*: from 0.0 to 1.0 (0.0 is fully transparent)
	 *  * *rasters*: [rasters](#raster) used for rendering.
	 *  * *controls*: shader parameters that can be modified (eg. light direction)
	 *  * *shader*: [shader](#shader) used for rendering
	 *  * *layout*: all the rasters in the layer MUST have the same layout.
	 *  * *mipmapBias*: default 0.5, when to switch between different levels of the mipmap
	 *  * *prefetchBorder*: border tiles prefetch (default 1)
	 *  * *maxRequest*: max number of simultaneous requests (should be GLOBAL not per layer!) default 4
	 */

	class Layer$1 {
		constructor(options) {

			Object.assign(this, {
				transform: new Transform(),
				visible: true,
				zindex: 0,
				opacity: 1.0,
				layout: null,
				rasters: [],
				controls: {},
				shaders: {},
				layout: 'image',
				shader: null, //current shader.

				prefetchBorder: 1,
				mipmapBias: 0.5,
				maxRequest: 4,

				update: [],  //update callbacks for a redraw

		//internal stuff, should not be passed as options.
				tiles: [],      //keep references to each texture (and status) indexed by level, x and y.
								//each tile is tex: [.. one for raster ..], missing: 3 missing tex before tile is ready.
								//only raster used by the shader will be loade.
				queued: [],     //queue of tiles to be loaded.
				requested: {},  //tiles requested.
			});

			Object.assign(this, options);

			//create from derived class if type specified
			if(this.type) {
				if(this.type in this.types) {
					options.type = null; //avoid infinite recursion!
					return this.types[this.type](options);
				}
				throw "Layer type: " + this.type + " has not been loaded";
			}

			//create members from options.
			this.rasters = this.rasters.map((raster) => new Raster(raster));


			//layout needs to becommon among all rasters.
			if(typeof(this.layout) != 'object' && this.rasters.length)
				this.layout = new Layout(this.rasters[0], this.layout);

			if(this.shader)
				this.shader = new Shader(this.shader);
		}

		

	/**
	 * @param {bool} visible
	 */
		setVisible(visible) {
			this.visible = visible;
			this.emit('update');
		}

	/**
	 * @param {int} zindex
	 */
		setZindex(zindex) {
			this.zindex = zindex;
			this.emit('update');
		}


		draw(transform, gl) {
			//how linear or srgb should be specified here.
	//		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
			if(this.status != 'ready')
				return;

			if(!this.shader)
				throw "Shader not specified!";

			this.prepareWebGL(gl);

	//		find which quads to draw

	//		draw quads.
			drawTile(gl, transform, 0, 0, 0);

	//		gl.uniform1f(t.opacitylocation, t.opacity);
		}

		drawTile(gl, transform, level, x, y) {
			var index = this.layout.index(level, x, y);
			let tile = this.tiles[index];
			if(tile.missing != 0) 
				throw "Attempt to draw tile still missing textures"

			//setup matrix

			//setup coords and tex (depends on layout/overlay boundaries).
			
			//update coords and texture buffers
			updateTileBuffers(gl, coords, tcoords);

			//bind textures
			for(var i = 0; i < this.shader.samplers; i++) {
				let id = this.shader.samplers[i];
				gl.activeTexture(gl.TEXTURE0 + i);
				gl.bindTexture(gl.TEXTURE_2D, tile.tex[id]);
			}
			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);
		}



		updateTileBuffers() {
			//TODO join buffers, and just make one call per draw! (except the bufferData, which is per node)
			gl.bindBuffer(gl.ARRAY_BUFFER, t.vbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);

			gl.vertexAttribPointer(t.coordattrib, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(t.coordattrib);

			gl.bindBuffer(gl.ARRAY_BUFFER, t.tbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, tcoords, gl.STATIC_DRAW);

			gl.vertexAttribPointer(t.texattrib, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(t.texattrib);
		}

		setShader(id) {
			if(!id in shaders)
				throw "Unknown shader: " + id;
			this.shader = shaders[id];

			if(!this.shader.program) {
				this.shader.createProgram(gl);

				//send uniforms here!
			}
		}

		prepareWebGL(gl) {
			//interpolate uniforms from controls!
			//update uniforms

			gl.useProgram(this.shader.program);

			if(this.ibuffer) //this part might go into another function.
				return;

			this.ibuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([3,2,1,3,1,0]), gl.STATIC_DRAW);

			this.vbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]), gl.STATIC_DRAW);

			this.tbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0,  0, 1,  1, 1,  1, 0]), gl.STATIC_DRAW);

			this.coordattrib = gl.getAttribLocation(this.program, "a_position");
			gl.vertexAttribPointer(t.coordattrib, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.coordattrib);

			this.texattrib = gl.getAttribLocation(this.program, "a_texcoord");
			gl.vertexAttribPointer(t.texattrib, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(t.texattrib);
		}

	/**
	*  @param {object] transform is the canvas coordinate transformation
	*  @param {viewport} is the viewport for the rendering, note: for lens might be different! Where we change it? here layer should know!
	*/
		prefetch(transform, viewport) {
			if(this.layout.status != 'ready' || !this.visible)
				return;
		}
	}

	Layer$1.prototype.types = {};

	class Layout$1 {
		constructor(url, type) {
			Object.assign(this, {
				width:0,
				height: 0,
				tilesize: 256,
				overlap: 0, 
				nlevels: 1,        //level 0 is the top, single tile level.
				ntiles: 1,         //tot number of tiles
				suffix: 'jpg',
				qbox: [],          //array of bounding box in tiles, one for mipmap 
				bbox: [],          //array of bounding box in pixels (w, h)

				ready: [],          //callbacks when the layout is ready.
				status: null
			});

			if(typeof(url) == 'string') {

				callback = () => {
					this.ntiles = initBoxes();
					this.status = 'ready';
					this.emit('ready');
				};

				switch(this.layout) {
					case 'image':    this.initImage(callback); break;
					case 'google':   this.initGoogle(callback); break;
					case 'deepzoom': this.initDeepzoom(callback); break;
				}
				return;
			}

			if(typeof(url) == 'object')
				Object.assign(this, url);
		}

		emit(event) {
			for(let r of this[event])
				r(this);
		}

		index(level, x, y) {
			var startindex = 0;
			for(var i = this.nlevels-1; i > level; i--) {
				startindex += this.qbox[i][2]*this.qbox[i][3];
			}
			return startindex + y*this.qbox[level][2] + x;
		}

	/*
	 * returns number of tiles.
	*/

		initBoxes() {
			this.qbox = []; //by level (0 is the bottom)
			this.bbox = [];
			var w = this.width;
			var h = this.height;

			var count = 0;
			for(var level = this.nlevels - 1; level >= 0; level--) {
				var ilevel = this.nlevels -1 - level;
				this.qbox[ilevel] = [0, 0, 0, 0];
				this.bbox[ilevel] = [0, 0, w, h];
				for(var y = 0; y*this.tilesize < h; y++) {
					this.qbox[ilevel][3] = y+1;
					for(var x = 0; x*this.tilesize < w; x ++) {
						count++;
						this.qbox[ilevel][2] = x+1;
					}
				}
				w >>>= 1;
				h >>>= 1;
			}
			return count;
		}

		tileCoords(level, x, y) {
			var coords  = new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]);
			var tcoords = new Float32Array([0, 0,     0, 1,     1, 1,     1, 0]);


			if(t.layout == "image")
				return { coords: coords, tcoords: tcoords }


			var sx = 2.0/t.canvas.width;
			var sy = 2.0/t.canvas.height;

			var side =  this.tilesize*(1<<(level)); //tile size in imagespace
			var tx = side;
			var ty = side;

			if(this.layout != "google") {  //google does not clip border tiles
				if(side*(x+1) > t.width) {
					tx = (t.width  - side*x);
				}
				if(side*(y+1) > t.height) {
					ty = (t.height - side*y);
				}
			}

			var lx  = this.qbox[level][2]-1; //last tile x pos, if so no overlap.
			var ly  = this.qbox[level][3]-1;

			var over = this.overlap;
			if(over) {
				var dtx = over / (tx/(1<<level) + (x==0?0:over) + (x==lx?0:over));
				var dty = over / (ty/(1<<level) + (y==0?0:over) + (y==ly?0:over));

				tcoords[0] = tcoords[2] = (x==0? 0: dtx);
				tcoords[1] = tcoords[7] = (y==0? 0: dty);
				tcoords[4] = tcoords[6] = (x==lx? 1: 1 - dtx);
				tcoords[3] = tcoords[5] = (y==ly? 1: 1 - dty);
			}
			return { coords: coords, tcoords: tcoords }
		}


	/**
	 * Given a viewport and a transform computes the tiles needed for each level.
	 * @param {array} viewport array with left, bottom, width, height
	 * @param {border} border is radius (in tiles units) of prefetch
	 * @returns {object} with level: the optimal level in the pyramid, pyramid: array of bounding boxes in tile units.
	 */
		neededBox(viewport, transform, border) {
			if(this.layout == "image")
				return { level:0, box: [[0, 0, 1, 1]] };

			var minlevel = Math.max(0, Math.min(Math.floor(Math.log2(transform.z) + this.mipmapbias), this.nlevels-1));


			var pyramid = [];
			for(var level = this.nlevels-1; level >= minlevel; level--) {
				var bbox = this.getIBox(viewport, transform); //thats the reverse.
				var side = this.tilesize*Math.pow(2, level);

				//quantized bbox
				var qbox = [
					Math.floor((bbox[0])/side),
					Math.floor((bbox[1])/side),
					Math.floor((bbox[2]-1)/side) + 1,
					Math.floor((bbox[3]-1)/side) + 1];

				//clamp!
				qbox[0] = Math.max(qbox[0]-border, this.qbox[level][0]);
				qbox[1] = Math.max(qbox[1]-border, this.qbox[level][1]);
				qbox[2] = Math.min(qbox[2]+border, this.qbox[level][2]);
				qbox[3] = Math.min(qbox[3]+border, this.qbox[level][3]);
				pyramid[level] = qbox;
			}
			return { level:minlevel, pyramid: pyramid };
		}



		getTileURL(url, level, x, y) {}

		loadImage(url, level, x, y, callback) {

			let path = this.getTileURL(url, level, x, y);
			(async () => {
				var response = await fetch(path);
				if(!response.ok) {
					console.log();
					callback("Failed loading " + path + ": " + response.statusText);
					return;
				}

				let blob = await response.blob();

				if(typeof createImageBitmap != 'undefined') {
					var isFirefox = typeof InstallTrigger !== 'undefined';
					//firefox does not support options for this call, BUT the image is automatically flipped.
					if(isFirefox) {
						createImageBitmap(blob).then(callback);
					} else {
						createImageBitmap(blob, { imageOrientation: 'flipY' }).then(callback);
					}

				} else { //fallback for IOS
					var urlCreator = window.URL || window.webkitURL;
					var img = document.createElement('img');
					img.onerror = function(e) { console.log("Texture loading error!"); };
					img.src = urlCreator.createObjectURL(blob);

					img.onload = function() {
						urlCreator.revokeObjectURL(img.src);
						callback(img);
					};
				}
			})().catch(e => { callback(e); });
		}


		initImage() {
		}

	/*
	 * witdh and height
	*/
		initImage(callback) {
			this.nlevels = 1;
			this.tilesize = 0;
			this.qbox = [[0, 0, 1, 1]];
			this.bbox = [[0, 0, this.width, this.height]];

			callback();
		}

	/**
	 *  url points to the folder (without /)
	 *  width and height must be defined
	 */
		initGoogle(callback) {
			if(!this.width || !this.height)
				throw "Google rasters require to specify width and height";

			this.tilesize = 256;
			this.overlap = 0;

			let max = Math.max(this.width, this.height)/this.tilesize;
			this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

			this.getTileURL = (x, y, level) => {
				var ilevel = parseInt(this.nlevels - 1 - level);
				return this.url + "/" + ilevel + "/" + y + "/" + x + '.' + this.suffix;
			};
			callback();
		}


	/**
	 * Expects the url to point to .dzi config file
	 */
		initDeepzoom(callback) {
			(async () => {
				var response = await fetch(this.url);
				if(!response.ok) {
					this.status = "Failed loading " + this.url + ": " + response.statusText;
					return;
				}
				let text = await response.text();
				let xml = (new window.DOMParser()).parseFromString(text, "text/xml");

				let doc = xml.documentElement;
				this.suffix = doc.getAttribute('Format');
				this.tilesize = doc.getAttribute('TileSize');
				this.overlap = doc.getAttribute('Overlap');

				let size = doc.querySelector('Size');
				this.width = size.getAttribute('Width');
				this.height = size.getAttribute('Height');

				let max = Math.max(this.width, this.height)/this.tilesize;
				this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

				this.url = this.url.substr(0, this.url.lastIndexOf(".")) + '_files/';

				this.getTileURL = (x, y, level) => {
					let ilevel = parseInt(this.nlevels - 1 - level);
					return this.url + ilevel + '/' + x + '_' + y + '.' + this.suffix;
				}; 

				callback();

			})().catch(e => { console.log(e); this.status = e; });
		}


	/**
	 * Expects the url to point to ImageProperties.xml file.
	 */
		initZoomify() {
			this.overlap = 0;
			(async () => {
				var response = await fetch(this.url);
				if(!response.ok) {
					this.status = "Failed loading " + this.url + ": " + response.statusText;
					return;
				}
				let text = await response.text();

				let tmp = response.split('"');
				this.tilesize = parseInt(tmp[11]);

				let max = Math.max(t.width, t.height)/t.tilesize;
				this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

				this.url = this.url.substr(0, this.url.lastIndexOf("/"));

				t.getTileURL = (x, y, level) => {
					let ilevel = parseInt(this.nlevels - 1 - level);
					let index = this.index(level, x, y)>>>0;
					let group = index >> 8;
					return this.url + "/TileGroup" + group + "/" + ilevel + "-" + x + "-" + y + "." + this.suffix;
				};

				callback();

			})().catch(e => { console.log(e); this.status = e; });
		}
	}

	/**
	 * Manages an OpenLIME viewer functionality on a canvas
	 * how do I write more substantial documentation.
	 *
	 * @param {element} element of the DOM or selector (es. '#canvasid'), or a canvas.
	 * @param {string} options is a url to a JSON describing the viewer content
	 * @param {object} options is a JSON describing the viewer content
	 *  * **animate**: default *true*, calls requestAnimation() and manages refresh.
	 *  * test:
	 */

	class OpenLIME {

		constructor(element, options) {
			if(typeof(element) == 'string')
				element = document. querySelector(element);

			if(!element)
				throw "Missing element parameter";

			this.containerElement = element;
			this.canvasElement = element.querySelector('canvas');
			if(!this.canvasElement) {
				this.canvasElement = document.createElement('canvas');
				element.appendChild(this.canvasElement);
			}
			this.canvasElement.addEventListener('resize', (e) => this.resize());

			Object.assign(this, { background: [0, 0, 0, 1] });

			this.canvas = new Canvas(this.canvasElement, this.canvas);
		}

		/**
		* Resize the canvas (and the overlay) and triggers a redraw.
		*/
		resize(event) {
			console.log(event);
			redraw();
		}

		/**
		*
		* Schedule a drawing.
		*/
		redraw() {
			if(this.animaterequest) return;
			this.animaterequest = requestAnimationFrame( (time) => { this.draw(time); });
		}

		/**
		* Do not call this if OpenLIME is animating, use redraw()
		* @param {time} time as in performance.now()
		*/
		draw(time) {
			console.log('drawing');
			if(!time) time = performance.now();
			this.animaterequest = null;

			let gl = this.canvas.gl;
			gl.viewport(0, 0, this.canvas.width, this.canvas.height);
			var b = this.background;
			gl.clearColor(b[0], b[1], b[2], b[3], b[4]);
			gl.clear(gl.COLOR_BUFFER_BIT);

			let done = this.canvas.draw(time);
			if(!done)
				this.redraw();
		}
	}

	exports.Camera = Camera;
	exports.Canvas = Canvas;
	exports.Layer = Layer$1;
	exports.Layout = Layout$1;
	exports.OpenLIME = OpenLIME;
	exports.Raster = Raster;
	exports.Shader = Shader;
	exports.Transform = Transform;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
