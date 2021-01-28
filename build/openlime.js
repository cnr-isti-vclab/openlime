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
			let transform = new Transform();
			Object.assign(transform, this);
			return transform;
		}

		interpolate(source, target, time) {
			if(time < source.t) return source;
			if(time > target.t) return target;

			let t = (target.t - source.t);
			if(t < 0.0001) {
				Object.assign(this, target);
				return;
			}

			let tt = (time - source.t)/t;
			let st = (target.t - time)/t;

			for(let i of ['x', 'y', 'z', 'a'])
				this[i] = (st*source[i] + tt*target[i]);
			this.t = time;
		}

		toMatrix() {
			let z = this.z;
			return [
				z,   0,   0,   0,
				0,   z,   0,   0, 
				0,   0,   1,   0,
				z*x, z*y, 0,   1,
			];
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
				viewport: [0, 0, 1, 1],
				bounded: true,
				maxZoom: 4,
				minZoom: 'full',

				signals: {'update':[]}
			});
			Object.assign(this, options);
			this.target = new Transform(this.target);
			this.source = this.target.copy();
		}

		copy() {
			let camera = new Camera();
			Object.assign(camera, this);
			return camera;
		}

		addEvent(event, callback) {
			this.signals[event].push(callback);
		}

		emit(event) {
			for(let r of this.signals[event])
				r(this);
		}

	/**
	 *  Set the viewport and updates the camera for an as close as possible.
	 */
		setViewport(view) {
			this.viewport = view;
			//TODO!
		}

	/**
	 *  Map coordinate relative to the canvas into scene coords. using the specified transform.
	 * @returns [X, Y] in scene coordinates.
	 */
		mapToScene(x, y, transform) {
			//compute coords relative to the center of the viewport.
			x -= (this.viewport[2] + this.viewport[0])/2;
			y -= (this.viewport[3] + this.viewport[1])/2;
			x /= transform.z;
			y /= transform.z;
			x -= transform.x;
			y -= transform.y;
			//TODO add rotation!
			return [x, y];
		}


		setPosition(dt, x, y, z, a) {
			let now = performance.now();
			this.source = this.getCurrentTransform(now);
			Object.assign(this.target, { x: x, y:y, z:z, a:a, t:now + dt });
			this.emit('update');
		}

	/*
	 * Pan the camera 
	 * @param {number} dx move the camera by dx pixels (positive means the image moves right).
	 */
		pan(dt, dx, dy) {
			if(!dt) dt = 0;
			this.setPosition(dt, this.x - dx/this.x, this.y - dy/this.z, this.z, this.a);
		}


		getCurrentTransform(time) {
			if(time < this.source.t)
				return this.source.copy();
			if(time >= this.target.t)
				return this.target.copy();

			let pos = new Transform();
			pos.interpolate(this.source, this.target, time);
			return pos;
		}

	/**
	 * @param {Array} box fit the specified rectangle [minx, miny, maxx, maxy] in the canvas.
	 * @param {number} dt animation duration in millisecond 
	 * @param {string} size how to fit the image: <contain | cover> default is contain (and cover is not implemented
	 */
		fit(box, dt, size) {
			if(!dt) dt = 0;

			//find if we align the topbottom borders or the leftright border.
			let w = this.viewport[2] - this.viewport[0];
			let h = this.viewport[3] - this.viewport[1];
			let bw = box[2] - box[0];
			let bh = box[3] - box[1];
			let z = Math.min(w/bw, h/bh);

			this.setPosition(dt, (box[0] + box[2])/2, (box[1] + box[3])/2, z, 0);
		}

	/**
	 * Combines the projection to the viewport with the transform
	 * @param {Object} transform a {@link Transform} class.
	 */
		projectionMatrix(transform) {
			
		}

	}

	/**
	 * @param {WebGL} gl is the WebGL context
	 * @param {Object} options
	 * * *layers*: Object specifies layers (see. {@link Layer})
	 */

	class Canvas {
		constructor(gl, camera, options) {
			Object.assign(this, { 
				preserveDrawingBuffer: false, 
				gl: gl,
				camera: camera,
				layers: {},

				signals: {'update':[]}
			});

			if(options) {
				Object.assign(this, options);
				for(let id in this.layers)
					this.addLayer(id, new Layer(id, this.layers[id]));
			}
		}

		addEvent(event, callback) {
			this.signals[event].push(callback);
		}

		emit(event) {
			for(let r of this.signals[event])
				r(this);
		}

		addLayer(id, layer) {
			layer.addEvent('update', () => { console.log('update!'); this.emit('update'); });
			layer.gl = this.gl;
			this.layers[id] = layer;
		}


		draw(time) {
			let gl = this.gl;
			let view = this.camera.viewport;
			gl.viewport(view[0], view[1], view[2], view[3]);

			var b = [0, 1, 0, 1];
			gl.clearColor(b[0], b[1], b[2], b[3], b[4]);
			gl.clear(gl.COLOR_BUFFER_BIT);

			let pos = this.camera.getCurrentTransform(time);
			//todo we could actually prefetch toward the future a little bit
			this.prefetch(pos);

			//draw layers using zindex.
			let ordered = Object.values(this.layers).sort( (a, b) => a.zindex - b.zindex);

			for(let layer of ordered)
				if(layer.visible)
					layer.draw(pos, view);

	//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.
			return pos.t == this.camera.target.t;
		}

	/**
	 * This function have each layer to check which tiles are needed and schedule them for download.
	 * @param {object} transform is the camera position (layer will combine with local transform).
	 */
		prefetch(transform) {
			for(let id in this.layers)
				this.layers[id].prefetch(transform, this.camera.viewport);
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


		loadImage(url, gl, callback) {
			(async () => {
				var response = await fetch(url);
				if(!response.ok) {
					console.log();
					callback("Failed loading " + url + ": " + response.statusText);
					return;
				}

				let blob = await response.blob();

				if(typeof createImageBitmap != 'undefined') {
					var isFirefox = typeof InstallTrigger !== 'undefined';
					//firefox does not support options for this call, BUT the image is automatically flipped.
					if(isFirefox) {
						createImageBitmap(blob).then((img) => this.loadTexture(img, callback));
					} else {
						createImageBitmap(blob, { imageOrientation: 'flipY' }).then((img) => this.loadTexture(gl, img, callback));
					}

				} else { //fallback for IOS
					var urlCreator = window.URL || window.webkitURL;
					var img = document.createElement('img');
					img.onerror = function(e) { console.log("Texture loading error!"); };
					img.src = urlCreator.createObjectURL(blob);

					img.onload = function() {
						urlCreator.revokeObjectURL(img.src);


						this.loadTexture(gl, img, callback);
					};
				}
			})().catch(e => { callback(null); });
		}

		loadTexture(gl, img, callback) {
			this.width = img.width;  //this will be useful for layout image.
			this.height = img.height;

			var tex = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tex);
			gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
			gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //_MIPMAP_LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
			callback(tex);
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
		constructor(options) {
			Object.assign(this, {
				version: 100,   //check for webglversion.
				samplers: [],
				uniforms: {},
				name: "",
				body: "",
				program: null   //webgl program
			});

			Object.assign(this, options);
		}

		createProgram(gl) {

			let vert = gl.createShader(gl.VERTEX_SHADER);
			gl.shaderSource(vert, this.vertShaderSrc(100));

			gl.compileShader(vert);
			let compiled = gl.getShaderParameter(vert, gl.COMPILE_STATUS);
			if(!compiled) {
				console.log(gl.getShaderInfoLog(vert));
				throw Error("Failed vertex shader compilation: see console log and ask for support.");
			}

			let frag = gl.createShader(gl.FRAGMENT_SHADER);
			gl.shaderSource(frag, this.fragShaderSrc());
			gl.compileShader(frag);

			let program = gl.createProgram();

			gl.getShaderParameter(frag, gl.COMPILE_STATUS);
			compiled = gl.getShaderParameter(frag, gl.COMPILE_STATUS);
			if(!compiled) {
				console.log(this.fragShaderSrc());
				console.log(gl.getShaderInfoLog(frag));
				throw Error("Failed fragment shader compilation: see console log and ask for support.");
			}

			gl.attachShader(program, vert);
			gl.attachShader(program, frag);
			gl.linkProgram(program);

			if ( !gl.getProgramParameter( program, gl.LINK_STATUS) ) {
				var info = gl.getProgramInfoLog(program);
				throw new Error('Could not compile WebGL program. \n\n' + info);
			}


			this.coordattrib = gl.getAttribLocation(program, "a_position");
			gl.vertexAttribPointer(this.coordattrib, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.coordattrib);

			this.texattrib = gl.getAttribLocation(program, "a_texcoord");
			gl.vertexAttribPointer(this.texattrib, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.texattrib);

			this.matrixlocation = gl.getUniformLocation(program, "u_matrix");

			this.program = program;
		}

		vertShaderSrc() {
			return `
#version 100

precision highp float; 
precision highp int; 

uniform mat4 u_matrix;
attribute vec4 a_position;
attribute vec2 a_texcoord;

varying vec2 v_texcoord;

void main() {
	gl_Position = u_matrix * a_position;
	v_texcoord = a_texcoord;
}`;
		}

		fragShaderSrc() {
			return this.body;
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

				rasters: [],
				controls: {},
				shaders: {},
				layout: 'image',
				shader: null, //current shader.
				gl: null,

				prefetchBorder: 1,
				mipmapBias: 0.5,
				maxRequest: 4,

				signals: { update: [] },  //update callbacks for a redraw

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
				this.setLayout(new Layout(this.rasters[0], this.layout));

			if(this.shader)
				this.shader = new Shader(this.shader);
		}

		addEvent(event, callback) {
			this.signals[event].push(callback);
		}

		emit(event) {
			for(let r of this.signals[event])
				r(this);
		}

		setLayout(layout) {
			let callback = () => { 
				this.status = 'ready';
				this.setupTiles(); //setup expect status to be ready!
				this.emit('update');
			};
			if(layout.status == 'ready') //layout already initialized.
				callback();
			else
				layout.addEvent('ready', callback);
			this.layout = layout;
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

		boundingBox() {
			return layuout.boundingBox();

		}

		draw(transform, viewport) {

			//how linear or srgb should be specified here.
	//		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
			if(this.status != 'ready')
				return;

			if(!this.shader)
				throw "Shader not specified!";

			if(!this.tiles || !this.tiles[0])
				return;

			this.prepareWebGL();

	//		find which quads to draw and in case request for them
			if(!(0 in this.requested) && this.tiles[0].missing != 0)
				this.loadTile({index: 0, level: 0, x: 0, y: 0});


	//		compute transform matric and draw quads.
			//TODO use  Transform.toMatrix and combine layer transform.

			let w = this.layout.width;
			let h = this.layout.height;

			let z = transform.z;
			let zx = 2*z/(viewport[2] - viewport[0]);
			let zy = 2*z/(viewport[3] - viewport[1]);

			let dx = (transform.x)*zx;
			let dy = -(transform.y)*zy;
			let dz = this.zindex;

			let matrix = [
				 zx,  0,  0,  0, 
				 0,  zy,  0,  0,
				 0,  0,  1,  0,
				dx, dy, dz,  1];

			this.gl.uniformMatrix4fv(this.shader.matrixlocation, this.gl.FALSE, matrix);


			if(this.tiles[0].missing == 0)
				this.drawTile(transform, 0, 0, 0);

	//		gl.uniform1f(t.opacitylocation, t.opacity);
		}

		drawTile(transform, level, x, y) {
			var index = this.layout.index(level, x, y);
			let tile = this.tiles[index];
			if(tile.missing != 0) 
				throw "Attempt to draw tile still missing textures"

			//setup matrix

			//setup coords and tex (depends on layout/overlay boundaries).
			let c = this.layout.tileCoords(level, x, y);

			//update coords and texture buffers
			this.updateTileBuffers(c.coords, c.tcoords);

			//bind textures
			let gl = this.gl;
			for(var i = 0; i < this.shader.samplers.length; i++) {
				let id = this.shader.samplers[i].id;
				gl.activeTexture(gl.TEXTURE0 + i);
				gl.bindTexture(gl.TEXTURE_2D, tile.tex[id]);
			}
			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);
		}



		updateTileBuffers(coords, tcoords) {
			let gl = this.gl;
			//TODO to reduce the number of calls (probably not needed) we can join buffers, and just make one call per draw! (except the bufferData, which is per node)
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);

			gl.vertexAttribPointer(this.shader.coordattrib, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.shader.coordattrib);

			gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, tcoords, gl.STATIC_DRAW);

			gl.vertexAttribPointer(this.shader.texattrib, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.shader.texattrib);
		}

		setShader(id) {
			if(!id in this.shaders)
				throw "Unknown shader: " + id;
			this.shader = this.shaders[id];
			this.setupTiles();
		}

	/**
	 *  If layout is ready and shader is assigned, creates or update tiles to keep track of what is missing.
	 */
		setupTiles() {
			if(!this.shader || !this.layout || this.layout.status != 'ready')
				return;

			let ntiles = this.layout.ntiles;

			if(typeof(this.tiles) != 'array' || this.tiles.length != ntiles) {
				this.tiles = new Array(ntiles);
				for(let i = 0; i < ntiles; i++)
					this.tiles[i] = { tex:new Array(this.shader.samplers.length), missing:this.shader.samplers.length };
				return;
			}

			for(let tile of this.ntiles) {
				tile.missing = this.shader.samplers.length;			for(let sampler of this.shader.samplers) {
					if(tile.tex[sampler.id])
						tile.missing--;
				}
			}
		}

		prepareWebGL() {
			//interpolate uniforms from controls!
			//update uniforms

			let gl = this.gl;

			if(!this.shader.program) {
				this.shader.createProgram(gl);
				//send uniforms here!
			}

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
		}

	/**
	*  @param {object] transform is the canvas coordinate transformation
	*  @param {viewport} is the viewport for the rendering, note: for lens might be different! Where we change it? here layer should know!
	*/
		prefetch(transform, viewport) {
			if(this.status != 'ready' || !this.visible)
				return;

			let needed = this.layout.neededBox(transform, this.prefetchBorder);
			let minlevel = needed.level;

			

	//TODO is this optimization (no change => no prefetch?) really needed?
	/*		let box = needed.box[minlevel];
			if(this.previouslevel == minlevel && box[0] == t.previousbox[0] && box[1] == this.previousbox[1] &&
			box[2] == this.previousbox[2] && box[3] == this.previousbox[3])
				return;

			this.previouslevel = minlevel;
			this.previousbox = box; */

			this.queued = [];

			//look for needed nodes and prefetched nodes (on the pos destination
			for(let level = this.layout.nlevels-1; level >= minlevel; level--) {
				let box = needed.box[level];
				let tmp = [];
				for(let y = box[1]; y < box[3]; y++) {
					for(let x = box[0]; x < box[2]; x++) {
						let index = this.layout.index(level, x, y);
						if(this.tiles[index].missing != 0 && !this.requested[index])
							tmp.push({level:level, x:x, y:y, index:index});
					}
				}
				let cx = (box[0] + box[2]-1)/2;
				let cy = (box[1] + box[3]-1)/2;
				//sort tiles by distance to the center TODO: check it's correct!
				tmp.sort(function(a, b) { return Math.abs(a.x - cx) + Math.abs(a.y - cy) - Math.abs(b.x - cx) - Math.abs(b.y - cy); });
				this.queued = this.queued.concat(tmp);
			}
			this.preload();
		}

	/**
	 * Checks load tiles from the queue. TODO this needs to be global! Not per layer.
	 *
	 */
		preload() {
			while(Object.keys(this.requested).length < this.maxRequested && this.queued.length > 0) {
				var tile = this.queued.shift();
				this.loadTile(tile);
			}
		}

		loadTile(tile) {
			if(this.requested[tile.index])
				throw "AAARRGGHHH double request!";

			this.requested[tile.index] = true;

			for(let sampler of this.shader.samplers) {
				let path = this.layout.getTileURL(this.rasters[sampler.id].url, tile.level, tile.x, tile.y);
				let raster = this.rasters[sampler.id];
				raster.loadImage(path, this.gl, (tex) => {

					if(this.layout.type == "image") {
						this.layout.width = raster.width;
						this.layout.height = raster.height;
					}
					let indextile = this.tiles[tile.index];
					indextile.tex[sampler.id] = tex;
					indextile.missing--;
					if(indextile.missing <= 0)
						this.emit('update');
				});
			}
		}

	}


	Layer$1.prototype.types = {};

	/**
	 * @param {string|Object} url URL of the image or the tiled config file, 
	 * @param {string} type select one among: <image, {@link https://www.microimages.com/documentation/TechGuides/78googleMapsStruc.pdf google}, {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN deepzoom}, {@link http://www.zoomify.com/ZIFFileFormatSpecification.htm zoomify}, {@link https://iipimage.sourceforge.io/ iip}, {@link https://iiif.io/api/image/3.0/ iiif}>
	 */
	class Layout$1 {
		constructor(url, type) {
			Object.assign(this, {
				type: type,
				width:1,
				height: 1,
				tilesize: 256,
				overlap: 0, 
				nlevels: 1,        //level 0 is the top, single tile level.
				ntiles: 1,         //tot number of tiles
				suffix: 'jpg',
				qbox: [],          //array of bounding box in tiles, one for mipmap 
				bbox: [],          //array of bounding box in pixels (w, h)

				signals: { ready: [] },          //callbacks when the layout is ready.
				status: null
			});

			if(typeof(url) == 'string') {
				this.url = url;
				let callback = () => {
					this.ntiles = this.initBoxes();
					this.status = 'ready';
					this.emit('ready');
				};

				switch(this.type) {
					case 'image':    this.initImage(callback); break;
					case 'google':   this.initGoogle(callback); break;
					case 'deepzoom': this.initDeepzoom(callback); break;
				}
				return;
			}

			if(typeof(url) == 'object')
				Object.assign(this, url);
		}

		addEvent(event, callback) {
			this.signals[event].push(callback);
		}

		emit(event) {
			for(let r of this.signals[event])
				r(this);
		}

		boundingBox() {
			return [-width/2, -height/2, width/2, height/2];
		}

	/**
	 *  Each tile is assigned an unique number.
	 */

		index(level, x, y) {
			var startindex = 0;
			for(var i = this.nlevels-1; i > level; i--) {
				startindex += this.qbox[i][2]*this.qbox[i][3];
			}
			return startindex + y*this.qbox[level][2] + x;
		}

	/*
	 * Compute all the bounding boxes (this.bbox and this.qbox).
	 * @return number of tiles in the dataset
	*/

		initBoxes() {
			this.qbox = []; //by level (0 is the bottom)
			this.bbox = [];
			var w = this.width;
			var h = this.height;

			if(this.type == 'image') {
				this.qbox[0] = [0, 0, 1, 1];
				this.bbox[0] = [0, 0, w, h];
				return 1;
			}

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


	/** Return the coordinates of the tile (in [0, 0, w h] image coordinate system) and the texture coords associated. 
	 *
	 */
		tileCoords(level, x, y) {
			let w = this.width;
			let h = this.height;
			var tcoords = new Float32Array([0, 0,     0, 1,     1, 1,     1, 0]);

			if(this.type == "image") {
				return { 
					coords: new Float32Array([-w/2, -h/2, 0,  -w/2, h/2, 0,  w/2, h/2, 0,  w/2, -h/2, 0]),
	//				coords: new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]),
					tcoords: tcoords 
				};
			}

			let coords = new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]);


			let side =  this.tilesize*(1<<(level)); //tile size in imagespace
			let tx = side;
			let ty = side;

			if(this.layout != "google") {  //google does not clip border tiles
				if(side*(x+1) > this.width) {
					tx = (this.width  - side*x);
				}
				if(side*(y+1) > this.height) {
					ty = (this.height - side*y);
				}
			}

			var lx  = this.qbox[level][2]-1; //last tile x pos, if so no overlap.
			var ly  = this.qbox[level][3]-1;

			var over = this.overlap;
			if(over) {
				let dtx = over / (tx/(1<<level) + (x==0?0:over) + (x==lx?0:over));
				let dty = over / (ty/(1<<level) + (y==0?0:over) + (y==ly?0:over));

				tcoords[0] = tcoords[2] = (x==0? 0: dtx);
				tcoords[1] = tcoords[7] = (y==0? 0: dty);
				tcoords[4] = tcoords[6] = (x==lx? 1: 1 - dtx);
				tcoords[3] = tcoords[5] = (y==ly? 1: 1 - dty);
			}
			for(let i = 0; i < coords.length; i+= 3) {
				coords[i]   = coords[i]  *tx + size*x - this.width/2;
				coords[i+1] = coords[i+1]*ty + size*y + this.height/2;
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



		getTileURL(url, level, x, y) {
			throw Error("Layout not defined or ready.");
		}



		initImage() {
		}

	/*
	 * Witdh and height can be recovered once the image is downloaded.
	*/
		initImage(callback) {
			this.nlevels = 1;
			this.tilesize = 0;
			this.getTileURL = (url, x, y, level) => { return url; };
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

			this.getTileURL = (url, x, y, level) => {
				var ilevel = parseInt(this.nlevels - 1 - level);
				return url + "/" + ilevel + "/" + y + "/" + x + '.' + this.suffix;
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

				this.getTileURL = (url, x, y, level) => {
					url = url.substr(0, url.lastIndexOf(".")) + '_files/';
					let ilevel = parseInt(this.nlevels - 1 - level);
					return url + ilevel + '/' + x + '_' + y + '.' + this.suffix;
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

				let max = Math.max(this.width, this.height)/this.tilesize;
				this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

				this.url = this.url.substr(0, this.url.lastIndexOf("/"));

				this.getTileURL = (url, x, y, level) => {
					let ilevel = parseInt(this.nlevels - 1 - level);
					let index = this.index(level, x, y)>>>0;
					let group = index >> 8;
					url = url.substr(0, url.lastIndexOf("/"));
					return this.url + "/TileGroup" + group + "/" + ilevel + "-" + x + "-" + y + "." + this.suffix;
				};

				callback();

			})().catch(e => { console.log(e); this.status = e; });
		}
	}

	/**
	 * @param {dom} element DOM element where mouse events will be listening.
	 * @param {options} options 
	 * * *delay* inertia of the movement in ms.
	 */

	class Controller {
		constructor(element, options) {
			Object.assign(this, {
				element:element,
				debug: true,
				delay: 100
			});

			Object.assign(this, options);

			this.initEvents();
		}

		mouseDown(x, y, e) {  if(this.debug) console.log('Down ', x, y);}

		mouseUp(x, y, e) {  if(this.debug) console.log('Up ', x, y); }
		
		mouseMove(x, y, e) { if(this.debug) console.log('Move ', x, y); }

		zoomDelta(x, y, d, e) {  if(this.debug) console.log('Delta ', x, y, d); }

		zoomStart(pos1, pos2, e) {if(this.debug) console.log('ZStart ', pos1, pos2); }

		zoomMove(pos1, pos2, e) {if(this.debug) console.log('ZMove ', pos1, pos2); }


		eventToPosition(e, touch) {
			let rect = e.currentTarget.getBoundingClientRect();
			let cx = e.clientX;
			let cy = e.clientY;
			if(typeof(touch) != 'undefined') {
				cx = e.targetTouches[touch].clientX;
				cy = e.targetTouches[touch].clientY;
			}
			let x = cx - rect.left;
			let y = cy - rect.top;
			return { x:x, y:y }
		}

		initEvents() {

	/* //TODO when the canvas occupy only part of the document we would like to prevent any mouseover/etc 
	  when the user is panning !! Example demo code here.

	function preventGlobalMouseEvents () {
	  document.body.style['pointer-events'] = 'none';
	}

	function restoreGlobalMouseEvents () {
	  document.body.style['pointer-events'] = 'auto';
	}

	function mousemoveListener (e) {
	  e.stopPropagation ();
	  // do whatever is needed while the user is moving the cursor around
	}

	function mouseupListener (e) {
	  restoreGlobalMouseEvents ();
	  document.removeEventListener ('mouseup',   mouseupListener,   {capture: true});
	  document.removeEventListener ('mousemove', mousemoveListener, {capture: true});
	  e.stopPropagation ();
	}

	function captureMouseEvents (e) {
	  preventGlobalMouseEvents ();
	  document.addEventListener ('mouseup',   mouseupListener,   {capture: true});
	  document.addEventListener ('mousemove', mousemoveListener, {capture: true});
	  e.preventDefault ();
	  e.stopPropagation ();
	}
	*/
			let element = this.element;
			element.addEventListener('contextmenu', (e) => { 
				e.preventDefault(); 
				return false; 
			});

			element.addEventListener('mouseup', (e) => {
				let pos = this.eventToPosition(e);
				this.mouseUp(pos.x, pos.y, e);
				e.preventDefault(); 
				return false;
			});

			element.addEventListener('mousedown', (e) => {
				let pos = this.eventToPosition(e);
				this.mouseDown(pos.x, pos.y, e);
				e.preventDefault(); 
				return false;
			}, { capture: true });

			element.addEventListener('mousemove', (e) => {
				let pos = this.eventToPosition(e);
				this.mouseMove(pos.x, pos.y, e);
				e.preventDefault(); 
				return false;
			});

			element.addEventListener('touchstart', function (e) {
				e.preventDefault();
		
				let pos0 = this.eventToPosition(e, 0);
				if (e.targetTouches.length == 1) {
					this.mouseDown(pos0.x, pos0.y, e);

				} else if (e.targetTouches.length == 2) {
					let pos1 = this.eventToPosition(e, 1);
					this.zoomStart(pos0, pos1, e);
				}
			}, false);

			element.addEventListener('touchend', function (e) {
				let pos = this.eventToPosition(e);
				this.mouseUp(pos.x, pos.y, e);
				e.preventDefault();
			}, false);

			element.addEventListener('touchmove', function (evt) {
				let pos0 = this.eventToPosition(e, 0);
				if (e.targetTouches.length == 1) {
					this.mouseMove(pos0.x, pos0.y, e);
				} else if (e.targetTouches.length == 2) {
					let pos1 = this.eventToPosition(e, 1);
					this.zoomMove(pos0, pos1, e);
				}
				e.preventDefault();
			}, false);

		}
	}

	class PanZoomController extends Controller {

		constructor(element, camera, options) {
			super(element, options);
			this.camera = camera;
			this.panning = false;
			this.startPosition = null;
			this.startMouse = null;
		}

		mouseDown(x, y, e) {
			if(!(e.buttons & 0x1)) 
				return;
			this.panning = true; 
			this.startMouse = { x: x, y: y };

			let now = performance.now();
			this.startPosition = this.camera.getCurrentTransform(now);
			this.camera.target = this.startPosition.copy(); //stop animation.
		}

		mouseUp(x, y, e) { 
			this.panning = false;
		}

		mouseMove(x, y, e) { 
			if(!this.panning)
				return;

			let dx = x - this.startMouse.x;
			let dy = y - this.startMouse.y;


			let z = this.startPosition.z;
			let ex = this.startPosition.x + dx/z;
			let ey = this.startPosition.y + dy/z;
			let a = this.startPosition.a;


			this.camera.setPosition(this.delay, ex, ey, z, a);

			if(this.debug1) console.log('Move ', x, y); 
		}

		zoomDelta(x, y, d, e) {  if(this.debug) console.log('Delta ', x, y, d); }

		zoomStart(pos1, pos2, e) {if(this.debug) console.log('ZStart ', pos1, pos2); }

		zoomMove(pos1, pos2, e) {if(this.debug) console.log('ZMove ', pos1, pos2); }

	}

	/**
	 * Manages an OpenLIME viewer functionality on a canvas
	 * how do I write more substantial documentation.
	 *
	 * @param {div} div of the DOM or selector (es. '#canvasid'), or a canvas.
	 * @param {string} options is a url to a JSON describing the viewer content
	 * @param {object} options is a JSON describing the viewer content
	 *  * **animate**: default *true*, calls requestAnimation() and manages refresh.
	 *  * test:
	 */

	class OpenLIME {

		constructor(div, options) {

			Object.assign(this, { 
				background: [0, 0, 0, 1],
				canvas: {},
				camera: new Camera()
			});


			if(typeof(div) == 'string')
				div = document.querySelector(div);

			if(!div)
				throw "Missing element parameter";

			this.containerElement = div;
			this.canvasElement = div.querySelector('canvas');
			if(!this.canvasElement) {
				this.canvasElement = document.createElement('canvas');
				div.appendChild(this.canvasElement);
			}

			this.initCanvasElement(this.canvasElement);


			this.canvas = new Canvas(this.gl, this.camera, this.canvas);
			this.canvas.addEvent('update', () => { this.redraw(); });

			this.camera.addEvent('update', () => { this.redraw(); });

			this.controller = new PanZoomController(this.containerElement, this.camera);

			var resizeobserver = new ResizeObserver( entries => {
				for (let entry of entries) {
					this.resize(entry.contentRect.width, entry.contentRect.height);
				}
			});
			resizeobserver.observe(this.canvasElement);

	/*
	//TODO here is not exactly clear which assumption we make on canvas and container div size.
	//		resizeobserver.observe(this.containerElement);
			this.containerElement.addEventListener('mousemove', (e) => {

	//			let camera = this.canvas.camera;
	//			let x = e.clientX - this.canvas.camera.viewport[2]/2;
	//			let y = e.clientY - this.canvas.camera.viewport[3]/2;
	//			let z = this.canvas.camera.target.z;
	//			camera.setPosition(0, x/z, y/z, z, 0,); 

	//			console.log(camera.mapToScene(e.clientX, e.clientY, camera.target));
	//			this.canvas.camera.target.x = 1;
	//			this.canvas.camera.target.t = performance.now();
				this.redraw();
	//			this.canvas.camera.target.x += 1;
			}); */


		}


		initCanvasElement(canvas) {
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

			
		}

		/**
		* Resize the canvas (and the overlay) and triggers a redraw.
		*/

		resize(width, height) {
			this.canvasElement.width = width;
			this.canvasElement.height = height;

			this.camera.setViewport([0, 0, width, height]);
			this.canvas.prefetch();
			this.redraw();
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
			if(!time) time = performance.now();
			this.animaterequest = null;

			let done = this.canvas.draw(time);
			if(!done)
				this.redraw();
		}

		fit(box, dt, size) {
			this.camera.fit(box, dt, size);
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
