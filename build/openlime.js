(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('hammerjs')) :
	typeof define === 'function' && define.amd ? define(['exports', 'hammerjs'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.OpenLIME = {}, global.Hammer));
}(this, (function (exports, Hammer) { 'use strict';

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
		constructor(options) {
			Object.assign(this, { x:0, y:0, z:1, a:0, t:0 });

			if(!this.t) this.t = performance.now();
			
			if(typeof(options) == 'object')
				Object.assign(this, options);
		}

		copy() {
			let transform = new Transform();
			Object.assign(transform, this);
			return transform;
		}

		apply(x, y) {
			//TODO! ROTATE
			let r = this.rotate(x, y, this.a);
			return { 
				x: r.x*this.z + this.x,
				y: r.y*this.z + this.y
			}
		}

		inverse() {
			let r = this.rotate(this.x, this.y, -this.a);
			return new Transform({x:-r.x, y:-r.y, z:1/this.z, a:-this.a, t:this.t});
		}

		rotate(x, y, angle) {
			angle = Math.PI*(angle/180);
			let ex =  Math.cos(angle)*x + Math.sin(angle)*y;
			let ey = -Math.sin(angle)*x + Math.cos(angle)*y;
			return {x:ex, y:ey};
		}

		compose(transform) {
			let a = this.copy();
			let b = transform;
			a.z *= b.z;
			a.a += b.a;
			var r = this.rotate(a.x, a.y, b.a);
			a.x = r.x*b.z + b.x;
			a.y = r.y*b.z + b.y; 
			return a;
		}

		/* transform the box (for example -w/2, -h/2 , w/2, h/2 in scene coords) */
		transformBox(lbox) {
			let box = [ 1e20, 1e20, -1e20, -1e20];
			for(let i = 0; i < 4; i++) {
				let p = this.apply(lbox[0 + (i&0x1)<<1], lbox[1 + (i&0x2)]);
				box[0] = Math.min(p.x, box[0]);
				box[1] = Math.min(p.y, box[1]);
				box[2] = Math.max(p.x, box[2]);
				box[3] = Math.max(p.y, box[3]);
			}
			return box;
		}

	/*  get the bounding box (in image coordinate sppace) of the vieport. 
	 */
		getInverseBox(viewport) {
			let inverse = this.inverse();
			let corners = [
				{x:viewport.x,               y:viewport.y},
				{x:viewport.x + viewport.dx, y:viewport.y},
				{x:viewport.x,               y:viewport.y + viewport.dy},
				{x:viewport.x + viewport.dx, y:viewport.y + viewport.dy}
			];
			let box = [ 1e20, 1e20, -1e20, -1e20];
			for(let corner of corners) {
				let p = inverse.apply(corner.x -viewport.w/2, corner.y - viewport.h/2);
				box[0] = Math.min(p.x, box[0]);
				box[1] = Math.min(p.y, box[1]);
				box[2] = Math.max(p.x, box[2]);
				box[3] = Math.max(p.y, box[3]);
			}
			return box;
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



	/**
	 *  Combines the transform with the viewport to the viewport with the transform
	 * @param {Object} transform a {@link Transform} class.
	 */
		projectionMatrix(viewport) {
			let z = this.z;

			// In coords with 0 in lower left corner map x0 to -1, and x0+v.w to 1
			// In coords with 0 at screen center and x0 at 0, map -v.w/2 -> -1, v.w/2 -> 1 
			// With x0 != 0: x0 -> x0-v.w/2 -> -1, and x0+dx -> x0+v.dx-v.w/2 -> 1
			// Where dx is viewport width, while w is window width

			let zx = 2*z/viewport.dx;
			let zy = 2*z/viewport.dy;

			let dx = zx * this.x + (2/viewport.dx)*(viewport.w/2-viewport.x)-1;
			let dy = -zy * this.y + (2/viewport.dy)*(viewport.h/2-viewport.y)-1;

	//		let r = this.rotate(this.x, this.y, this.a);

			let a = Math.PI *this.a/180;
			let matrix = [
				 Math.cos(a)*zx, Math.sin(a)*zy,  0,  0, 
				-Math.sin(a)*zx, Math.cos(a)*zy,  0,  0,
				 0,  0,  1,  0,
				dx, dy, 0,  1];
			return matrix;
		}

	/**
	 * TODO (if needed)
	 */ 
		toMatrix() {
			let z = this.z;
			return [
				z,   0,   0,   0,
				0,   z,   0,   0, 
				0,   0,   1,   0,
				z*x, z*y, 0,   1,
			];
		}

	    /**
		 * Transform p from scene (0 at image center) to [0,wh] 
		 * @param {*} viewport viewport(x,y,dx,dy,w,h)
		 * @param {*} p point in scene: 0,0 at image center
		 */ 
		sceneToViewportCoords(viewport, p) {
	        return [(p[0] + this.x) * this.z - viewport.x + viewport.w/2, 
	                (p[1] - this.y) * this.z + viewport.y + viewport.h/2 ];
	    }

		/**
	     * Transform p from  [0,wh] to scene (0 at image center)
		 * 
		 * @param {*} viewport viewport(x,y,dx,dy,w,h)
		 * @param {*} p point in range [0..w-1,0..h-1]
		 */
	    viewportToSceneCoords(viewport, p) {
	        return [(p[0] + viewport.x - viewport.w/2) / this.z - this.x,
	                (p[1] - viewport.y - viewport.h/2) / this.z + this.y];

	    }

	}

	/**
	 *  NOTICE TODO: the camera has the transform relative to the whole canvas NOT the viewport.
	 * @param {object} options
	 * * *bounded*: limit translation of the camera to the boundary of the scene.
	 * * *maxZoom*: maximum zoom, 1:maxZoom is screen pixel to image pixel ratio.
	 */

	class Camera {

		constructor(options) {
			Object.assign(this, {
				viewport: null,
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
			//TODO! update camera to keep the center in place and zoomm to approximate the content before.
		}

	/**
	 *  Map coordinate relative to the canvas into scene coords. using the specified transform.
	 * @returns [X, Y] in scene coordinates.
	 */
		mapToScene(x, y, transform) {
			//compute coords relative to the center of the viewport.
			x -= this.viewport.w/2;
			y -= this.viewport.h/2;
			x /= transform.z;
			y /= transform.z;
			x -= transform.x;
			y -= transform.y;
			//TODO add rotation!
			return {x:x, y:y};
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
			let now = performance.now();
			let m = this.getCurrentTransform(now);
			m.dx += dx;
			m.dy += dy;
		}

	/* zoom in or out at a specific point in canvas coords!
	 * TODO: this is not quite right!
	 */
		zoom(dt, z, x, y) {
			if(!x) x = 0;
			if(!y) y = 0;

			let now = performance.now();
			let m = this.getCurrentTransform(now);


			//x, an y should be the center of the zoom.
			m.x += (m.x+x)*(m.z - z)/m.z;
			m.y += (m.y+y)*(m.z - z)/m.z;

			this.setPosition(dt, m.x, m.y, z, m.a);
		}

		deltaZoom(dt, dz, x, y) {
			if(!x) x = 0;
			if(!y) y = 0;

			let now = performance.now();
			let m = this.getCurrentTransform(now);


			//x, an y should be the center of the zoom.


			m.x += (m.x+x)*(1 - dz);
			m.y += (m.y+y)*(1 - dz);

			this.setPosition(dt, m.x, m.y, this.target.z*dz, m.a);
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

	//TODO should fit keeping the same angle!
		fit(box, dt, size) {
			if(!dt) dt = 0;

			//find if we align the topbottom borders or the leftright border.
			let w = this.viewport.dx;
			let h = this.viewport.dy;

			//center of the viewport.

			let bw = box[2] - box[0];
			let bh = box[3] - box[1];
			let z = Math.min(w/bw, h/bh);

			this.setPosition(dt, (box[0] + box[2])/2, (box[1] + box[3])/2, z, 0);
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
			layer.addEvent('update', () => { this.emit('update'); });
			layer.gl = this.gl;
			this.layers[id] = layer;
			this.prefetch();
		}


		draw(time) {
			let gl = this.gl;
			let view = this.camera.viewport;
			gl.viewport(view.x, view.y, view.dx, view.dy);

			var b = [0, 1, 0, 1];
			gl.clearColor(b[0], b[1], b[2], b[3], b[4]);
			gl.clear(gl.COLOR_BUFFER_BIT);

			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
			gl.enable(gl.BLEND);

			//TODO: getCurren shoudl redurn {position, done}
			let pos = this.camera.getCurrentTransform(time);
			//todo we could actually prefetch toward the future a little bit
			this.prefetch(pos);

			//draw layers using zindex.
			let ordered = Object.values(this.layers).sort( (a, b) => a.zindex - b.zindex);

			//NOTICE: camera(pos) must be relative to the WHOLE canvas
			let done = true;
			for(let layer of ordered)
				if(layer.visible)
					done = done && layer.draw(pos, view);

	//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.
			return done && pos.t == this.camera.target.t;
		}

	/**
	 * This function have each layer to check which tiles are needed and schedule them for download.
	 * @param {object} transform is the camera position (layer will combine with local transform).
	 */
		prefetch(transform) {
			if(!transform)
				transform = this.camera.getCurrentTransform(performance.now());
			for(let id in this.layers) {
				let layer = this.layers[id];
				if(layer.visible)
					layer.prefetch(transform, this.camera.viewport);
			}
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
						createImageBitmap(blob).then((img) => this.loadTexture(gl, img, callback));
					} else {
						createImageBitmap(blob, { imageOrientation1: 'flipY' }).then((img) => this.loadTexture(gl, img, callback));
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
	/*
	 * @param {function} callback as function(tex, sizeinBytes)
	 */

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
			//TODO 3 is not accurate for type of image, when changing from rgb to grayscale, fix this value.
			callback(tex, img.width*img.height*3);
		}
	}

	/**
	 *  @param {object} options
	 * *label*: used for menu
	 * *samplers*: array of rasters {id:, type: } color, normals, etc.
	 * *uniforms*: type = <vec4|vec3|vec2|float|int>, needsUpdate controls when updated in gl, size is unused, value is and array or a float, 
	 *             we also want to support interpolation: source (value is the target), start, end are the timing (same as camera interpolation)
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
				program: null,      //webgl program
				needsUpdate: true,
				signals: { 'update':[] }
			});

			Object.assign(this, options);
		}

		setEvent(event, callback) {
			this.signals[event] = [callback];
		}

		emit(event) {
			for(let r of this.signals[event])
				r(this);
		}

		setUniform(name, value) {
			let u = this.uniforms[name];
			u.value = value;
			u.needsUpdate = true;
			this.emit('update');
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

			if(this.program)
				gl.deleteProgram(this.program);

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

			//sampler units;
			for(let sampler of this.samplers)
				sampler.location = gl.getUniformLocation(program, sampler.name);

			this.coordattrib = gl.getAttribLocation(program, "a_position");
			gl.vertexAttribPointer(this.coordattrib, 3, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.coordattrib);

			this.texattrib = gl.getAttribLocation(program, "a_texcoord");
			gl.vertexAttribPointer(this.texattrib, 2, gl.FLOAT, false, 0, 0);
			gl.enableVertexAttribArray(this.texattrib);

			this.matrixlocation = gl.getUniformLocation(program, "u_matrix");

			this.program = program;
			this.needsUpdate = false;
		}

		updateUniforms(gl, program) {
			let now = performance.now();
			for(const [name, uniform] of Object.entries(this.uniforms)) {
				if(!uniform.location)
					uniform.location = gl.getUniformLocation(program, name);

				if(!uniform.location)  //uniform not used in program
					continue; 

				if(uniform.needsUpdate) {
					let value = uniform.value;
					switch(uniform.type) {
						case 'vec4':  gl.uniform4fv(uniform.location, value); break;
						case 'vec3':  gl.uniform3fv(uniform.location, value); break;
						case 'vec2':  gl.uniform2fv(uniform.location, value); break;
						case 'float': gl.uniform1fv(uniform.location, value); break;
						case 'int':   gl.uniform1i (uniform.location, value); break;
						default: throw Error('Unknown uniform type: ' + u.type);
					}
				}
			}
		}

		vertShaderSrc() {
			return `#version 300 es

precision highp float; 
precision highp int; 

uniform mat4 u_matrix;
in vec4 a_position;
in vec2 a_texcoord;

out vec2 v_texcoord;

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
	 * @param {string|Object} url URL of the image or the tiled config file, 
	 * @param {string} type select one among: <image, {@link https://www.microimages.com/documentation/TechGuides/78googleMapsStruc.pdf google}, {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN deepzoom}, {@link http://www.zoomify.com/ZIFFileFormatSpecification.htm zoomify}, {@link https://iipimage.sourceforge.io/ iip}, {@link https://iiif.io/api/image/3.0/ iiif}>
	 */
	class Layout {
		constructor(url, type, options) {
			Object.assign(this, {
				type: type,
				width: 1,
				height: 1,
				tilesize: 256,
				overlap: 0, 
				nlevels: 1,        //level 0 is the top, single tile level.
				tiles: [],
				suffix: 'jpg',
				qbox: [],          //array of bounding box in tiles, one for mipmap 
				bbox: [],          //array of bounding box in pixels (w, h)

				signals: { ready: [] },          //callbacks when the layout is ready.
				status: null
			});
			if(options)
				Object.assign(this, options);

			if(typeof(url) == 'string') {
				this.url = url;
				let callback = () => {
					this.initBoxes();
					this.status = 'ready';
					this.emit('ready');
				};

				switch(this.type) {
					case 'image':    this.initImage(this.width, this.height); break;
					case 'google':   this.initGoogle(callback); break;
					case 'deepzoom': this.initDeepzoom(callback); break;
					case 'zoomify': this.initZoomify(callback); break;
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

		isReady() {
			return this.status == 'ready' && this.width && this.height;
		}

		boundingBox() {
			return [-this.width/2, -this.height/2, this.width/2, this.height/2];
		}

	/**
	 *  Each tile is assigned an unique number.
	 */

		index(level, x, y) {
			let startindex = 0;
			for(let i = 0; i < level; i++)
				startindex += this.qbox[i][2]*this.qbox[i][3];
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
				this.tiles.push({index:0, level:0, x:0, y:0});
				return 1;
			}

			let tiles = [];
			for(let level = this.nlevels - 1; level >= 0; level--) {
				this.qbox[level] = [0, 0, 0, 0];
				this.bbox[level] = [0, 0, w, h];
				for(let y = 0; y*this.tilesize < h; y++) {
					this.qbox[level][3] = y+1;
					for(let x = 0; x*this.tilesize < w; x ++) {
						this.qbox[level][2] = x+1;
						tiles.push({level:level, x:x, y:y});
					}
				}
				w >>>= 1;
				h >>>= 1;
			}
			this.tiles = [];
			for(let tile of tiles) {
				let index = this.index(tile.level, tile.x, tile.y);
				tile.index = index;
				this.tiles[index] = tile;
			}
		}

	/** Return the coordinates of the tile (in [0, 0, w h] image coordinate system) and the texture coords associated. 
	 *
	 */
		tileCoords(level, x, y) {
			let w = this.width;
			let h = this.height;
			//careful: here y is inverted due to textures not being flipped on load (Firefox fault!).
			var tcoords = new Float32Array([0, 1,     0, 0,     1, 0,     1, 1]);

			if(this.type == "image") {
				return { 
					coords: new Float32Array([-w/2, -h/2, 0,  -w/2, h/2, 0,  w/2, h/2, 0,  w/2, -h/2, 0]),
					tcoords: tcoords 
				};
			}

			let coords = new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]);

			let ilevel = this.nlevels - 1 - level;
			let side =  this.tilesize*(1<<(ilevel)); //tile size in imagespace
			let tx = side;
			let ty = side;

			if(side*(x+1) > this.width) {
				tx = (this.width  - side*x);
				if(this.type == 'google')
					tcoords[4] = tcoords[6] = tx/side;
			}
			if(side*(y+1) > this.height) {
				ty = (this.height - side*y);
				if(this.type == 'google')
					tcoords[1] = tcoords[7] = ty/side;
			}

			var lx  = this.qbox[level][2]-1; //last tile x pos, if so no overlap.
			var ly  = this.qbox[level][3]-1;

			var over = this.overlap;
			if(over) {
				let dtx = over / (tx/(1<<ilevel) + (x==0?0:over) + (x==lx?0:over));
				let dty = over / (ty/(1<<ilevel) + (y==0?0:over) + (y==ly?0:over));

				tcoords[0] = tcoords[2] = (x==0? 0: dtx);
				tcoords[3] = tcoords[5] = (y==0? 0: dty);
				tcoords[4] = tcoords[6] = (x==lx? 1: 1 - dtx);
				tcoords[1] = tcoords[7] = (y==ly? 1: 1 - dty);
			} 
			//flip Y coordinates 
			//TODO cleanup this mess!
			let tmp = tcoords[1];
			tcoords[1] = tcoords[7] = tcoords[3];
			tcoords[3] = tcoords[5] = tmp;

			for(let i = 0; i < coords.length; i+= 3) {
				coords[i]   =  coords[i]  *tx + side*x - this.width/2;
				coords[i+1] = -coords[i+1]*ty - side*y + this.height/2;
			}

			return { coords: coords, tcoords: tcoords }
		}


	/**
	 * Given a viewport and a transform computes the tiles needed for each level.
	 * @param {array} viewport array with left, bottom, width, height
	 * @param {border} border is radius (in tiles units) of prefetch
	 * @returns {object} with level: the optimal level in the pyramid, pyramid: array of bounding boxes in tile units.
	 */
		neededBox(viewport, transform, border, bias) {
			if(this.type == "image")
				return { level:0, pyramid: [[0, 0, 1, 1]] };

			//here we are computing with inverse levels; level 0 is the bottom!
			let iminlevel = Math.max(0, Math.min(Math.floor(-Math.log2(transform.z) + bias), this.nlevels-1));
			let minlevel = this.nlevels-1-iminlevel;
			//
			let bbox = transform.getInverseBox(viewport);
			//find box in image coordinates where (0, 0) is in the upper left corner.
			bbox[0] += this.width/2;
			bbox[2] += this.width/2;
			bbox[1] += this.height/2;
			bbox[3] += this.height/2;

			let pyramid = [];
			for(let level = 0; level <= minlevel; level++) {
				let ilevel = this.nlevels -1 -level;
				let side = this.tilesize*Math.pow(2, ilevel);

				//quantized bbox
				let qbox = [
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
			return { level: minlevel, pyramid: pyramid };
		}

		getTileURL(url, level, x, y) {
			throw Error("Layout not defined or ready.");
		}



	/*
	 * Witdh and height can be recovered once the image is downloaded.
	*/
		initImage(width, height) {
			this.getTileURL = (url, x, y, level) => { return url; };
			this.nlevels = 1;
			this.tilesize = 0;

			if(width && height) {
				this.width = width;
				this.height = height;
				this.initBoxes();

				this.status = 'ready';
				this.emit('ready');
			}
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
				return url + "/" + level + "/" + y + "/" + x + '.' + this.suffix;
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
					return url + level + '/' + x + '_' + y + '.' + this.suffix;
				}; 

				callback();

			})().catch(e => { console.log(e); this.status = e; });
		}


	/**
	 * Expects the url to point to ImageProperties.xml file.
	 */
		initZoomify(callback) {
			this.overlap = 0;
			(async () => {
				var response = await fetch(this.url);
				if(!response.ok) {
					this.status = "Failed loading " + this.url + ": " + response.statusText;
					return;
				}
				let text = await response.text();
				let xml = (new window.DOMParser()).parseFromString(text, "text/xml");
				let doc = xml.documentElement;
				this.tilesize = parseInt(doc.getAttribute('TILESIZE'));
				this.width = parseInt(doc.getAttribute('WIDTH'));
				this.height = parseInt(doc.getAttribute('HEIGHT'));
				if(!this.tilesize || !this.height || !this.width)
					throw "Missing parameter files for zoomify!";

				let max = Math.max(this.width, this.height)/this.tilesize;
				this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

				this.url = this.url.substr(0, this.url.lastIndexOf("/"));

				this.getTileURL = (url, x, y, level) => {
					let index = this.index(level, x, y)>>>0;
					let group = index >> 8;
					url = url.substr(0, url.lastIndexOf("/"));
					return this.url + "/TileGroup" + group + "/" + level + "-" + x + "-" + y + "." + this.suffix;
				};

				callback();

			})().catch(e => { console.log(e); this.status = e; });
		}
	}

	/* Cache holds the images and the tile textures.
	 *  Each tile has a priority 0 and above means it is visible, 
	 * negative depends on how far from the border and how more zoomed you need to go.
	*/

	class _Cache {
		constructor(options) {
			Object.assign(this, {
				capacity: 10*(1<<20),  //256 MB total capacity available
				size: 0,                //amount of GPU ram used

				maxRequest: 4,          //max number of concurrent HTTP requests
				requested: 0,
				maxPrefetch: 8*(1<<20), //max amount of prefetched tiles.
				prefetched: 0           //amount of currently prefetched GPU ram.
			});

			Object.assign(this, options);
			this.layers = [];   //map on layer.
		}

	/*  Queue is an ordered array of tiles needed by a layer.
	 */
		setCandidates(layer) {
			if(!this.layers.includes(layer))
				this.layers.push(layer);
			setTimeout(() => { this.update(); }, 0); //ensure all the queues are set before updating.
		}

	/* Look for best tile to load and schedule load from the web.
	 */
		update() {
			if(this.requested > this.maxRequest)
				return;

			let best = this.findBestCandidate();
			if(!best) return;
			while(this.size > this.capacity) { //we need to make room.
				let worst = this.findWorstTile();
				if(!worst) {
					console.log("BIG problem in the cache");
					break;
				}
				if(worst.tile.time < best.tile.time)
					this.dropTile(worst.layer, worst.tile);
				else
					return; 
			}
			this.loadTile(best.layer, best.tile);
		}

		findBestCandidate() {
			let best = null;
			for(let layer of this.layers) {
				if(!layer.queue.length)
					continue;
				let tile = layer.queue.shift();
				if(!best ||
					tile.time > best.tile.time ||
					(tile.time == best.tile.time && tile.priority > best.tile.priority))
					best = { layer, tile };
			}
			return best;
		}

		findWorstTile() {
			let worst = null;
			for(let layer of this.layers) {
				for(let tile of layer.tiles) {
					//TODO might be some are present when switching shaders.
					if(tile.missing != 0) continue;
					if(!worst || 
					   tile.time < worst.tile.time || 
					   (tile.time == worst.tile.time && tile.priority < worst.tile.priority)) {
						worst = {layer, tile};
					}
				}
			}
			return worst;
		}

	/* 
	 */
		loadTile(layer, tile) {
			this.requested++;
			layer.loadTile(tile, (size) => { this.size += size; this.requested--; this.update(); } );
		}
	/*
	 */
		dropTile(layer, tile) {
			for(let i = 0; i < tile.tex.length; i++) {
				if(tile.tex[i]) {
					layer.gl.deleteTexture(tile.tex[i]);
					tile.tex[i] = null;
					tile.missing++;
				}
			}
			this.size -= tile.size;
			tile.size = 0;
		}
	/* Flush all memory
	 */
		flush() {
		}

	/* Flush all tiles for a layer.
	 */
		flush(layer) {
		}

	/* 
	 */
	}

	let Cache = new _Cache;

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
				layers: [],
				controls: {},
				controllers: [],
				shaders: {},
				layout: 'image',
				shader: null, //current shader.
				gl: null,

				prefetchBorder: 1,
				mipmapBias: 0.5,
				maxRequest: 4,

				signals: { update: [], ready: [] },  //update callbacks for a redraw, ready once layout is known.

		//internal stuff, should not be passed as options.
				tiles: [],      //keep references to each texture (and status) indexed by level, x and y.
								//each tile is tex: [.. one for raster ..], missing: 3 missing tex before tile is ready.
								//only raster used by the shader will be loade.
				queue: [],     //queue of tiles to be loaded.
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
			this.transform = new Transform(this.transform);

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
				this.emit('ready');
				this.emit('update');
			};
			if(layout.status == 'ready') //layout already initialized.
				callback();
			else
				layout.addEvent('ready', callback);
			this.layout = layout;
		}


		setShader(id) {
			if(!id in this.shaders)
				throw "Unknown shader: " + id;
			this.shader = this.shaders[id];
			this.setupTiles();
			this.shader.setEvent('update', ()=>{ this.emit('update'); });
		}

	/**
	 * @param {bool} visible
	 */
		setVisible(visible) {
			this.visible = visible;
			this.previouslyNeeded = null;
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
			return this.layout.boundingBox();
		}


		setControl(name, value, dt) {
			let now = performance.now();
			let control = this.controls[name];
			this.interpolateControl(control, now);

			control.source.value = [...control.current.value];
			control.source.t = now;

			control.target.value = [...value];
			control.target.t = now + dt;

			this.emit('update');
		}

		interpolateControls() {
			let now = performance.now();
			let done = true;
			for(let control of Object.values(this.controls))
				done = this.interpolateControl(control, now) && done;
			return done;
		}

		interpolateControl(control, time) {
			let source = control.source;
			let target = control.target;
			let current = control.current;

			current.t = time;
			if(time < source.t) {
				current.value = [...source.value];
				return false;
			}

			if(time > target.t - 0.0001) {
				current.value = [...target.value];
				return true;
			}

			let t = (target.t - source.t);
			let tt = (time - source.t)/t;
			let st = (target.t - time)/t;

			current.value = [];
			for(let i  = 0; i < source.value.length; i++)
				current.value[i] = (st*source.value[i] + tt*target.value[i]);
			return false;
		}

	/**
	 *  render the 
	 */
		draw(transform, viewport) {
			//exception for layout image where we still do not know the image size
			//how linear or srgb should be specified here.
	//		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
			if(!this.status == 'ready' || this.tiles.length == 0)
				return;

			if(!this.shader)
				throw "Shader not specified!";

			let done = this.interpolateControls();
			this.prepareWebGL();

	//		find which quads to draw and in case request for them
			transform = this.transform.compose(transform);
			let needed = this.layout.neededBox(viewport, transform, this.prefetchBorder, this.mipmapBias);
			let torender = this.toRender(needed);

			let matrix = transform.projectionMatrix(viewport);
			this.gl.uniformMatrix4fv(this.shader.matrixlocation, this.gl.FALSE, matrix);

			for(let index in torender) {
				let tile = torender[index];
	//			if(tile.complete)
					this.drawTile(torender[index]);
			}

	//		gl.uniform1f(t.opacitylocation, t.opacity);
			return done;
		}

		drawTile(tile) {
			let tiledata = this.tiles[tile.index];
			if(tiledata.missing != 0) 
				throw "Attempt to draw tile still missing textures"

			//TODO might want to change the function to oaccept tile as argument
			let c = this.layout.tileCoords(tile.level, tile.x, tile.y);

			//update coords and texture buffers
			this.updateTileBuffers(c.coords, c.tcoords);

			//bind textures
			let gl = this.gl;
			for(var i = 0; i < this.shader.samplers.length; i++) {
				let id = this.shader.samplers[i].id;
				gl.uniform1i(this.shader.samplers[i].location, i);
				gl.activeTexture(gl.TEXTURE0 + i);
				gl.bindTexture(gl.TEXTURE_2D, tiledata.tex[id]);
			}
			gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);
		}

	/* given the full pyramid of needed tiles for a certain bounding box, 
	 *  starts from the preferred levels and goes up in the hierarchy if a tile is missing.
	 *  complete is true if all of the 'brothers' in the hierarchy are loaded,
	 *  drawing incomplete tiles enhance the resolution early at the cost of some overdrawing and problems with opacity.
	 */

		toRender(needed) {

			var torender = {}; //array of minlevel, actual level, x, y (referred to minlevel)
			var brothers = {};

			let minlevel = needed.level;
			var box = needed.pyramid[minlevel];

			for(var y = box[1]; y < box[3]; y++) {
				for(var x = box[0]; x < box[2]; x++) {
					var level = minlevel;
					while(level >= 0) {
						var d = minlevel - level;
						var index = this.layout.index(level, x>>d, y>>d);
						if(this.tiles[index].missing == 0) {
							torender[index] = {index:index, level:level, x:x>>d, y:y>>d, complete:true};
							break;
						} else {
							var sx = (x>>(d+1))<<1;
							var sy = (y>>(d+1))<<1;
							brothers[this.layout.index(level, sx, sy)] = 1;
							brothers[this.layout.index(level, sx+1, sy)] = 1;
							brothers[this.layout.index(level, sx+1, sy+1)] = 1;
							brothers[this.layout.index(level, sx, sy+1)] = 1;
						}
						level--;
					}
				}
			}
			for(let index in brothers) {
				if(index in torender)
					torender[index].complete = false;
			}
			return torender;
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



	/**
	 *  If layout is ready and shader is assigned, creates or update tiles to keep track of what is missing.
	 */
		setupTiles() {
			if(!this.shader || !this.layout || this.layout.status != 'ready')
				return;

			if(!this.tiles.length) {
				this.tiles = JSON.parse(JSON.stringify(this.layout.tiles));
				for(let tile of this.tiles) {
					tile.tex = new Array(this.shader.samplers.length);
					tile.missing = this.shader.samplers.length;
					tile.size = 0;
				}
				return;
			}

			for(let tile of this.tiles) {
				tile.missing = this.shader.samplers.length;			for(let sampler of this.shader.samplers) {
					if(tile.tex[sampler.id])
						tile.missing--;
				}
			}
		}

		prepareWebGL() {

			let gl = this.gl;

			if(this.shader.needsUpdate)
				this.shader.createProgram(gl);

			gl.useProgram(this.shader.program);
			this.shader.updateUniforms(gl, this.shader.program);


			//interpolate uniforms from controls!
			//update uniforms

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

		sameNeeded(a, b) {
			return a.level == b.level &&
			a.pyramid[a.level][0] == b.pyramid[a.level][0] &&
			a.pyramid[a.level][1] == b.pyramid[a.level][1] &&
			a.pyramid[a.level][2] == b.pyramid[a.level][2] &&
			a.pyramid[a.level][3] == b.pyramid[a.level][3];
		}
	/**
	*  @param {object] transform is the canvas coordinate transformation
	*  @param {viewport} is the viewport for the rendering, note: for lens might be different! Where we change it? here layer should know!
	*/
		prefetch(transform, viewport) {
			if(this.layers.length != 0) { //combine layers
				for(let layer of this.layers)
					layer.prefetch(transform, viewport);
			}

			if(this.rasters.length == 0)
				return;

			if(this.status != 'ready') 
				return;

			let needed = this.layout.neededBox(viewport, transform, this.prefetchBorder, this.mipmapBias);
			if(this.previouslyNeeded && this.sameNeeded(this.previouslyNeeded, needed))
					return;
			this.previouslyNeeded = needed;




			this.queue = [];
			let now = performance.now();
			//look for needed nodes and prefetched nodes (on the pos destination

			for(let level = 0; level <= needed.level; level++) {
				let box = needed.pyramid[level];
				let tmp = [];
				for(let y = box[1]; y < box[3]; y++) {
					for(let x = box[0]; x < box[2]; x++) {
						let index = this.layout.index(level, x, y);
						let tile = this.tiles[index];
						tile.time = now;
						tile.priority = needed.level - level;
						if(tile.missing != 0 && !this.requested[index])
							tmp.push(tile);
					}
				}
				let cx = (box[0] + box[2])/2;
				let cy = (box[1] + box[3])/2;
				//sort tiles by distance to the center TODO: check it's correct!
				tmp.sort(function(a, b) { return Math.abs(a.x - cx) + Math.abs(a.y - cy) - Math.abs(b.x - cx) - Math.abs(b.y - cy); });
				this.queue = this.queue.concat(tmp);
			}
			Cache.setCandidates(this);
		}

		loadTile(tile, callback) {
			if(this.requested[tile.index])
				throw "AAARRGGHHH double request!";

			this.requested[tile.index] = true;

			for(let sampler of this.shader.samplers) {
				let path = this.layout.getTileURL(this.rasters[sampler.id].url, tile.x, tile.y, tile.level );
				let raster = this.rasters[sampler.id];
				raster.loadImage(path, this.gl, (tex, size) => {

					if(this.layout.type == "image")
						this.layout.initImage(raster.width, raster.height);

					tile.size += size;
					tile.tex[sampler.id] = tex;
					tile.missing--;
					if(tile.missing <= 0) {
						this.emit('update');
						delete this.requested[tile.index];
						if(callback) callback(size);
					}
				});
			}
		}

	}


	Layer$1.prototype.types = {};

	/**
	 *  @param {object} options
	 * *compose*: compose operation: add, subtract, multiply, etc.
	 */

	class RTIShader extends Shader {
		constructor(options) {
			super(options);

			Object.assign(this, {
				modes: ['light', 'normals', 'diffuse', 'specular'],
				mode: 'normal',
				type:        ['ptm', 'hsh',  'rbf', 'bln'],
				colorspaces: ['lrgb', 'rgb', 'mrgb', 'mycc'],

				nplanes: null,     //number of coefficient planes
				yccplanes: null,     //number of luminance planes for mycc color space
				njpegs: null,      //number of textures needed (ceil(nplanes/3))
				material: null,    //material parameters
				lights: null,      //light directions (needed for rbf interpolation)
				sigma: null,       //rbf interpolation parameter
				ndimensions: null, //PCA dimension space (for rbf and bln)

				scale: null,      //factor and bias are used to dequantize coefficient planes.
				bias: null,

				basis: null,       //PCA basis for rbf and bln
				lweights: null    //light direction dependent coefficients to be used with coefficient planes
			});

			if(this.relight)
				this.init(this.relight);

			this.setMode('light');
		}

		setMode(mode) {
			if(!(this.modes.includes(mode)))
				throw Error("Unknown mode: " + mode);
			this.mode = mode;
			if(mode != 'light') {
				this.lightWeights([ 0.612,  0.354, 0.707], 'base');
				this.lightWeights([-0.612,  0.354, 0.707], 'base1');
				this.lightWeights([     0, -0.707, 0.707], 'base2');
			}
			this.body = this.template();
			this.needsUpdate = true;
		}

		setLight(light) {
			if(!this.uniforms.light) 
				throw "Shader not initialized, wait on layer ready event for setLight."

			let x = light[0];
			let y = light[1];

			//map the square to the circle.
			let r = Math.sqrt(x*x + y*y);
			if(r > 1) {
				x /= r;
				y /= r;
			}
			let z = Math.sqrt(Math.max(0, 1 - x*x - y*y));
			light = [x, y, z];

			if(this.mode == 'light')
				this.lightWeights(light, 'base');
			this.setUniform('light', light);
		}

		init(relight) {
			Object.assign(this, relight);
			if(this.colorspace == 'mycc')
				this.nplanes = this.yccplanes[0] + this.yccplanes[1] + this.yccplanes[2];
			else 
				this.yccplanes = [0, 0, 0];


			this.planes = [];
			this.njpegs = 0;
			while(this.njpegs*3 < this.nplanes)
				this.njpegs++;

			for(let i = 0; i < this.njpegs; i++)
				this.samplers.push({ id:i, name:'plane'+i, type:'vec3' });

			this.material = this.materials[0];

			if(this.lights)
				this.lights + new Float32Array(this.lights);

			if(this.type == "rbf")
				this.ndimensions = this.lights.length/3;

			if(this.type == "bilinear") {
				this.ndimensions = this.resolution*this.resolution;
				this.type = "bln";
			}

			this.scale = this.material.scale;
			this.bias = this.material.bias;


			if(['mrgb', 'mycc'].includes(this.colorspace))
				this.loadBasis(this.basis);


			this.uniforms = {
				light: { type: 'vec3', needsUpdate: true, size: 3,              value: [0.0, 0.0, 1] },
				bias:  { type: 'vec3', needsUpdate: true, size: this.nplanes/3, value: this.bias },
				scale: { type: 'vec3', needsUpdate: true, size: this.nplanes/3, value: this.scale },
				base:  { type: 'vec3', needsUpdate: true, size: this.nplanes },
				base1: { type: 'vec3', needsUpdate: false, size: this.nplanes },
				base2: { type: 'vec3', needsUpdate: false, size: this.nplanes }
			};

			this.lightWeights([0, 0, 1], 'base');

			this.body = this.template();
		}

		lightWeights(light, basename, time) {
			let value;
			switch(this.type) {
				case 'ptm': value = PTM.lightWeights(light); break;
				case 'hsh': value = HSH.lightWeights(light); break;
				case 'rbf': value = RBF.lightWeights(light, this); break;
				case 'bln': value = BLN.lightWeights(light, this); break;
			}
			this.setUniform(basename, value, time);
		}

		baseLightOffset(p, l, k) {
			return (p*this.ndimensions + l)*3 + k;
		}

		basePixelOffset(p, x, y, k) {
			return (p*this.resolution*this.resolution + (x + y*this.resolution))*3 + k;
		}

		loadBasis(data) {
			let tmp = new Uint8Array(data);
			this.basis = new Float32Array(data.length);
			for(let plane = 0; plane < this.nplanes+1; plane++) {
				for(let c = 0; c < this.ndimensions; c++) {
					for(let k = 0; k < 3; k++) {
						let o = this.baseLightOffset(plane, c, k);
						if(plane == 0)
							this.basis[o] = tmp[o]/255;
						else
							this.basis[o] = ((tmp[o] - 127)/this.material.range[plane-1]);
					}
				}
			}
		}



		template() {

			let basetype = 'vec3'; //(this.colorspace == 'mrgb' || this.colorspace == 'mycc')?'vec3':'float';

			let str = `#version 300 es

precision highp float; 
precision highp int; 

#define np1 ${this.nplanes + 1}

in vec2 v_texcoord;
out vec4 color;

const mat3 T = mat3(8.1650e-01, 4.7140e-01, 4.7140e-01,
	-8.1650e-01, 4.7140e-01,  4.7140e-01,
	-1.6222e-08, -9.4281e-01, 4.7140e-01);

uniform vec3 light;
uniform vec3 bias[np1];
uniform vec3 scale[np1];

uniform ${basetype} base[np1];
uniform ${basetype} base1[np1];
uniform ${basetype} base2[np1];
`;

			for(let n = 0; n < this.njpegs; n++) 
				str += 
`uniform sampler2D plane${n};
`	;

			if(this.colorspace == 'mycc')
				str +=
`

const int ny0 = ${this.yccplanes[0]};
const int ny1 = ${this.yccplanes[1]};
`;


			switch(this.colorspace) {
				case 'rgb':  str +=  RGB.render(this.njpegs); break;
				case 'mrgb': str += MRGB.render(this.njpegs); break;
			}

			str += `

void main(void) {

`;
			if(this.mode == 'light') {
				str += `
	color = render(base);
`;
			} else {
				str += `
	vec3 normal;
	normal.x = dot(render(base).xyz, vec3(1));
	normal.y = dot(render(base1).xyz, vec3(1));
	normal.z = dot(render(base2).xyz, vec3(1));
`; 
				switch(this.mode) {
				case 'normals':  str += `
	normal = (normalize(T * normal) + 1.0)/2.0;
	color = vec4(normal, 1);
`;
				break;
				case 'diffuse': str += `
	normal = normalize(T * normal);
	color = vec4(vec3(dot(light, normal)), 1);
`;
				}
			}
			str += `
}`;
			return str;
		}
	}


	class RGB {
		static render(njpegs) {
			let str = `
vec4 render(vec3 base[np1]) {
	vec4 rgb = vec4(0, 0, 0, 1);`;

			for(let j = 0; j < njpegs; j++) {
				str += `
	{
		vec4 c = texture(plane${j}, v_texcoord);
		rgb.x += base[${j}].x*(c.x - bias[${j}].x)*scale[${j}].x;
		rgb.y += base[${j}].y*(c.y - bias[${j}].y)*scale[${j}].y;
		rgb.z += base[${j}].z*(c.z - bias[${j}].z)*scale[${j}].z;
	}
`;
			}
			str += `
	return rgb;
}
`;
			return str;
		}
	}

	class MRGB {
		static render(njpegs) {

			let str = `
vec4 render(vec3 base[np1]) {
	vec3 rgb = base[0];
	vec4 c;
`;
			for(let j = 0; j < njpegs; j++) {
				str +=
`	c = texture(plane${j}, v_texcoord);
	rgb += base[${j}*3+1]*(c.x - bias[${j}].x)*scale[${j}].x;
	rgb += base[${j}*3+2]*(c.y - bias[${j}].y)*scale[${j}].y;
	rgb += base[${j}*3+3]*(c.z - bias[${j}].z)*scale[${j}].z;

`	;
			}
			str += `
	return vec4(rgb, 1);
}
`;
			return str;
		}
	}



	/* PTM utility functions 
	 */
	class PTM {
		/* @param {Array} v expects light direction as [x, y, z]
		*/
		static lightWeights(v) {
			let b = [1.0, v[0], v[1], v[0]*v[0], v[0]*v[1], v[1]*v[1]];
			let base = new Float32Array(18);
			for(let i = 0; i < 18; i++)
				base[3*i] = base[3*i+1] = base[3*i+2] = b[i];
			return base;
		}
	}


	/* HSH utility functions 
	 */
	class HSH {
		/* @param {Array} v expects light direction as [x, y, z]
		*/
		static lightWeights(v) {
			let PI = 3.1415;
			let phi = Math.atan2(v[1], v[0]);
			if (phi < 0)
				phi = 2 * PI + phi;
			let theta = Math.min(Math.acos(v[2]), PI / 2 - 0.5);

			let cosP = Math.cos(phi);
			let cosT = Math.cos(theta);
			let cosT2 = cosT * cosT;

			let b = [
				1.0 / Math.sqrt(2 * PI),

				Math.sqrt(6 / PI) * (cosP * Math.sqrt(cosT-cosT2)),
				Math.sqrt(3 / (2 * PI)) * (-1 + 2*cosT),
				Math.sqrt(6 / PI) * (Math.sqrt(cosT - cosT2) * Math.sin(phi)),

				Math.sqrt(30 / PI) * (Math.cos(2 * phi) * (-cosT + cosT2)),
				Math.sqrt(30 / PI) * (cosP*(-1 + 2 * cosT) * Math.sqrt(cosT - cosT2)),
				Math.sqrt(5  / (2 * PI)) * (1 - 6 * cosT + 6 * cosT2),
				Math.sqrt(30 / PI) * ((-1 + 2 * cosT) * Math.sqrt(cosT - cosT2) * Math.sin(phi)),
				Math.sqrt(30 / PI) * ((-cosT + cosT2) * Math.sin(2*phi))
			];
			let base = new Float32Array(27);
			for(let i = 0; i < 27; i++)
				base[3*i] = base[3*i+1] = base[3*i+2] = b[i];
			return base;
		}
	}

	class RBF {
		/* @param {Array} v expects light direction as [x, y, z]
		*/
		static lightWeights(lpos, layer) {

			let weights = RBF.rbf(lpos, layer);

			let np = layer.nplanes;
			let lweights = new Float32Array((np + 1) * 3);

			for(let p = 0; p < np+1; p++) {
				for(let k = 0; k < 3; k++) {
					for(let l = 0; l < weights.length; l++) {
						let o = layer.baseLightOffset(p, weights[l][0], k);
						lweights[3*p + k] += weights[l][1]*layer.basis[o];
					}
				}
			}
			return lweights;
		}

		static rbf(lpos, layer) {
			let radius = 1/(layer.sigma*layer.sigma);
			let weights = new Array(layer.ndimensions);

			//compute rbf weights
			let totw = 0.0;
			for(let i = 0; i < weights.length; i++) {
				let dx = layer.lights[i*3+0] - lpos[0];
				let dy = layer.lights[i*3+1] - lpos[1];
				let dz = layer.lights[i*3+2] - lpos[2];

				let d2 = dx*dx + dy*dy + dz*dz;
				let w = Math.exp(-radius * d2);

				weights[i] = [i, w];
				totw += w;
			}
			for(let i = 0; i < weights.length; i++)
				weights[i][1] /= totw;


			//pick only most significant and renormalize
			let count = 0;
			totw = 0.0;
			for(let i = 0; i < weights.length; i++) {
				if(weights[i][1] > 0.001) {
					weights[count++] =  weights[i];
					totw += weights[i][1];
				}
			}

			weights = weights.slice(0, count); 
			for(let i = 0; i < weights.length; i++)
				weights[i][1] /= totw;

			return weights;
		}
	}

	class BLN {
		static lightWeights(lpos, layer) {
			let np = layer.nplanes;
			let s = Math.abs(lpos[0]) + Math.abs(lpos[1]) + Math.abs(lpos[2]);

			//rotate 45 deg.
			let x = (lpos[0] + lpos[1])/s;
			let y = (lpos[1] - lpos[0])/s;
			x = (x + 1.0)/2.0;
			y = (y + 1.0)/2.0;
			x = x*(layer.resolution - 1.0);
			y = y*(layer.resolution - 1.0);

			let sx = Math.min(layer.resolution-2, Math.max(0, Math.floor(x)));
			let sy = Math.min(layer.resolution-2, Math.max(0, Math.floor(y)));
			let dx = x - sx;
			let dy = y - sy;

			//bilinear interpolation coefficients.
			let s00 = (1 - dx)*(1 - dy);
			let s10 =      dx *(1 - dy);
			let s01 = (1 - dx)* dy;
			let s11 =      dx * dy;

			let lweights = new Float32Array((np + 1) * 3);

			//TODO optimize away basePixel

			for(let p = 0; p < np+1; p++) {
				for(let k = 0; k < 3; k++) {
					let o00 = layer.basePixelOffset(p, sx, sy, k);
					let o10 = layer.basePixelOffset(p, sx+1, sy, k);
					let o01 = layer.basePixelOffset(p, sx, sy+1, k);
					let o11 = layer.basePixelOffset(p, sx+1, sy+1, k);

					lweights[3*p + k] = 
						s00*layer.basis[o00] + 
						s10*layer.basis[o10] +
						s01*layer.basis[o01] +
						s11*layer.basis[o11];

				}
			}
			return lweights;
		}
	}

	/**
	 * @param {dom} element DOM element where mouse events will be listening.
	 * @param {options} options 
	 * * *delay* inertia of the movement in ms.
	 */

	class Controller {
		constructor(options) {
			Object.assign(this, {
				active: true,
				debug: false,
				delay: 100
			});

			Object.assign(this, options);
		}

		captureEvents() {
			this.capture = true; //TODO should actually specify WHAT it is capturing: which touch etc.
		}

		releaseEvents() {
			this.capture = false;
		}

	/* Implement these functions to interacts with mouse/touch/resize events. */

	/*
		panStart(e, x, y) { if (this.debug) console.log('Pan Start ', x, y); return false; }

		panMove(e, x, y) { if (this.debug) console.log('Pan Move ', x, y); return false; }

		panEnd(e, x, y) { if (this.debug) console.log('Pan End ', x, y); return false; }

		pinchStart(e, x, y, scale) { if (this.debug) console.log('Pinch Start ', x, y, scale); return false; }

		pinchMove(e, x, y, scale) { if (this.debug) console.log('Pinch Move ', x, y, scale); return false; }

		pinchEnd(e, x, y, scale) { if (this.debug) console.log('Pinch End ', x, y, scale); return false; }

		wheelDelta(e, x, y, d) { if (this.debug) console.log('Wheel ', x, y, d); return false; }

		singleTap(e, x, y) { if (this.debug) console.log('Single Tap ', x, y); return false; }

		doubleTap(e, x, y) { if (this.debug) console.log('Double Tap ', x, y); return false; }

		resize(e, width, height) { if(this.debug) console.log('Rezize ', width, height); return false; }
	*/

	}

	/*
	 * Controller that turn the position of the mouse on the screen to a [0,1]x[0,1] parameter
	 */

	class Controller2D extends Controller {

		constructor(callback, options) {
			super(options);

			this.callback = callback;
			if(!options || !options.box)
				this.box = [-0.99, -0.99, 0.99, 0.99];

			this.panning = false;
		}

		update(x, y, rect) {
			x = Math.max(0, Math.min(1, x/rect.width));
			y = Math.max(0, Math.min(1, 1 - y/rect.height));
			x = this.box[0] + x*(this.box[2] - this.box[0]);
			y = this.box[1] + y*(this.box[3] - this.box[1]);
			this.callback(x, y);
		}

		panStart(e, x, y) {
			this.update(x, y, e.rect);
			this.panning = true;
			return true;
		}

		panMove(e, x, y) {
			if(!this.panning)
				return false;
			this.update(x, y, e.rect);
			return true;
		}

		panEnd(e, x, y) {
			if(!this.panning)
				return false;
			this.panning = false;
			return true;
		}

		singleTap(e, x, y) {
			this.update(x, y, e.rect);
			return true;
		}

	}

	/**
	 * Extends {@link Layer}.
	 * @param {options} options Same as {@link Layer}, but url and layout are required.
	 */

	class RTILayer extends Layer$1 {
		constructor(options) {
			super(options);

			if(Object.keys(this.rasters).length != 0)
				throw "Rasters options should be empty!";

			if(!this.url)
				throw "Url option is required";

			if(!this.layout)
				this.layout = 'image';

			this.shaders['rti'] = new RTIShader();
			this.setShader('rti');

			let now = performance.now();
			this.controls['light'] = { source:{ value: [0, 0], t: now }, target:{ value:[0, 0], t:now }, current:{ value:[0, 0], t:now } };

			if(this.url)
				this.init(this.url);
		}

		planeUrl(url, plane) {
			let path = this.url.split('/').slice(0, -1).join('/') + '/';
			switch(this.layout) {
				case 'image':    return path + 'plane_' + plane + '.jpg';			case 'google':   return path + 'plane_' + plane;			case 'deepzoom': return path + 'plane_' + plane + '.dzi';			case 'zoomify':  return path + 'plane_' + plane + '/ImageProperties.xml';			case 'iip':  throw Error("Unimplemented");
				case 'iiif': throw Error("Unimplemented");
				default:     throw Error("Unknown layout: " + layout);
			}
		}

	/*
	 * Alias for setControl
	 * @param {Array} light light direction as an array [x, y]
	 * @param {number} dt delay
	 */
		setLight(light, dt) {
			this.setControl('light', light, dt);
		}

		init(url) {
			(async () => {
				var response = await fetch(this.url);
				if(!response.ok) {
					this.status = "Failed loading " + this.url + ": " + response.statusText;
					return;
				}
				let json = await response.json();
				this.shader.init(json);

				for(let p = 0; p < this.shader.njpegs; p++)
					this.rasters.push(new Raster({ url: this.planeUrl(this.url, p), type: 'vec3', attribute: 'coeff', colorspace: 'linear' }));

				let size = {width:this.width, height:this.height};
				this.setLayout(new Layout(this.planeUrl(this.url, 0), this.layout, size));

				let controller = new Controller2D((x, y)=>this.setControl('light', [x, y], 100), { active:false, control:'light' });
				this.controllers.push(controller);

			})().catch(e => { console.log(e); this.status = e; });
		}

	/*
	 *  Internal function: light control maps to light direction in the shader.
	 */
		interpolateControls() {
			let done = super.interpolateControls();
			if(!done) {
				let light = this.controls['light'].current.value;
				this.shader.setLight(light);
			}
			return done;
		}
	}

	Layer$1.prototype.types['rti'] = (options) => { return new RTILayer(options); };

	/* Basic viewer for a single layer.
	 *  we support actions through buttons: each button style is controlled by classes (trigger), active (if support status)
	 *  and custom.
	 * actions supported are:
	 *  home: reset the camera
	 *  zoomin, zoomout
	 *  fullscreen
	 *  rotate (45/90 deg rotation option.
	 *  light: turn on light changing.
	 *  switch layer(s)
	 *  lens.
	 */

	class UIBasic {
		constructor(lime, options) {
			//we need to know the size of the scene but the layers are not ready.
			lime.canvas.addEvent('update', ()=> { this.updateLayers(); });
			let camera = lime.camera;
			Object.assign(this, {
				lime: lime,
				camera: this.camera,
				skin: 'skin.svg',
				style: 'skin.css',
				actions: {
					home:       { title: 'Home',       task: (event) => { if(this.ready) camera.fit(this.viewport, 250); } },
					layers:     { title: 'Layers',     task: (event) => { this.selectLayers(event); } },
					zoomin:     { title: 'Zoom in',    task: (event) => { if(this.ready) camera.deltaZoom(250, 1.25, 0, 0); } },
					zoomout:    { title: 'Zoom out',   task: (event) => { if(this.ready) camera.deltaZoom(250, 1/1.25, 0, 0); } },
					light:      { title: 'Light',      task: (event) => { this.toggleLightController(); } },
					fullscreen: { title: 'Fullscreen', task: (event) => { this.toggleFullscreen(); } }
				},
				viewport: [0, 0, 0, 0] //in scene coordinates
			});

			if(options)
				Object.assign(this, options);

			this.init();
		}



		init() {
			(async () => {

				if(this.skin)
					await this.loadSkin();

				this.setupActions();

				for(let l of Object.values(this.lime.canvas.layers)) {
					this.setLayer(l);
					break;
				}

			})().catch(e => { console.log(e); throw Error("Something failed") });
		}

		updateLayers() {
			this.ready = true;
			let box = [1e20, 1e20, -1e20, -1e20];
			for(let layer of Object.values(this.lime.canvas.layers)) {
				if(layer.status != 'ready') {
					this.ready = false;
					continue;
				}

				let lbox = layer.transform.transformBox(layer.boundingBox());
				box[0] = Math.min(lbox[0], box[0]);
				box[1] = Math.min(lbox[1], box[1]);
				box[2] = Math.max(lbox[2], box[2]);
				box[3] = Math.max(lbox[3], box[3]);
			}
			if(box[2] > box[0])
				this.viewport = box;
		}

		async loadSkin() {
			var response = await fetch(this.skin);
			if(!response.ok) {
				throw Error("Failed loading " + url + ": " + response.statusText);
			}

			let text = await response.text();
			let parser = new DOMParser();
			let skin= parser.parseFromString(text, "image/svg+xml").documentElement;


			let toolbar = document.createElement('div');
			toolbar.classList.add('openlime-toolbar');
			this.lime.containerElement.appendChild(toolbar);


			//toolbar manually created with parameters (padding, etc) + css for toolbar positioning and size.
			{
				let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				toolbar.appendChild(svg);

				let padding = 10;
				let x = padding;
				let h = 0;
				for(let [name, action] of Object.entries(this.actions)) {
					let element = skin.querySelector('.openlime-' + name).cloneNode(true);
					if(!element) continue;
					svg.appendChild(element);
					let box = element.getBBox();
					h = Math.max(h, box.height);
					let tlist = element.transform.baseVal;
					if(tlist.numberOfItems == 0)
						tlist.appendItem(svg.createSVGTransform());
					tlist.getItem(0).setTranslate(-box.x + x,-box.y);
					x += box.width + padding;
				}
				Object.assign(svg.viewBox.baseVal, {x: 0, y: 0, width: x, height: h });
			}
		}



		setupActions() {
			for(let [name, action] of Object.entries(this.actions)) {
				let element = this.lime.containerElement.querySelector('.openlime-' + name);
				if(!element)
					continue;
				element.addEventListener('click', action.task);
			}
			let items = document.querySelectorAll('.openlime-layers-button');
			for(let item of items) {
				let id = item.getAttribute('data-layer');
				if(!id) continue;
				item.addEventListener('click', ()=> {
					this.setLayer(this.lime.layers[id]);
				});
			}
		}

		//we need the concept of active layer! so we an turn on and off light.
		toggleLightController() {
			let div = this.lime.containerElement;
			let active = div.classList.toggle('openlime-light-active');
			this.lightActive = active;

			for(let c of this.activeLayer.controllers)
				if(c.control == 'light')
					c.active = active;
		}

		toggleFullscreen() {
			let canvas = this.lime.canvasElement;
			let div = this.lime.containerElement;
			let active = div.classList.toggle('openlime-fullscreen-active');

			if(!active) {
				var request = document.exitFullscreen || document.webkitExitFullscreen ||
					document.mozCancelFullScreen || document.msExitFullscreen;
				request.call(document);

				this.lime.resize(canvas.offsetWidth, canvas.offsetHeight);
			} else {
				var request = div.requestFullscreen || div.webkitRequestFullscreen ||
					div.mozRequestFullScreen || div.msRequestFullscreen;
				request.call(div);
			}
			this.lime.resize(canvas.offsetWidth, canvas.offsetHeight);
		}

	/* Layer management */

		selectLayers(event) {
			if(!this.layerMenu) {
				let ul = document.createElement('ul');
				ul.classList.add('openlime-layers-menu');
				for(let [name, layer] of Object.entries(this.lime.canvas.layers)) {
					let li = document.createElement('li');
					li.innerHTML = layer.label || name;
					li.addEventListener('click', ()=> {
						this.setLayer(layer);
						this.closeLayersMenu();
					});
					ul.appendChild(li);
				}
				this.lime.containerElement.appendChild(ul);
				this.layerMenu = ul;
			}
			this.layerMenu.style.left = event.offsetX + 'px';
			this.layerMenu.style.top = event.offsetY + 'px';
			this.layerMenu.style.display = 'block';
		}

		setLayer(layer_on) {
			this.activeLayer = layer_on;

			for(let layer of Object.values(this.lime.canvas.layers)) {
				layer.setVisible(layer == layer_on);
				for(let c of layer.controllers) {
					if(c.control == 'light')
						c.active = this.lightActive && layer == layer_on;
				}
			}
			this.lime.redraw();
		}

		closeLayersMenu() {
			this.layerMenu.style.display = 'none';
		}
	}

	class ControllerPanZoom extends Controller {

		constructor(camera, options) {
			super(options);
			this.camera = camera;
			this.zoomAmount = 1.2;
			this.panning = false;
			this.zooming = false;
			this.startPosition = null;
			this.startMouse = null;
			this.prevScale = 1.0;
		}

		panStart(e, x, y) {
			this.panning = true;
			this.startMouse = { x: x, y: y };

			let now = performance.now();
			this.startPosition = this.camera.getCurrentTransform(now);
			this.camera.target = this.startPosition.copy(); //stop animation.
		}

		panMove(e, x, y) {
			if (!this.panning)
				return;

			let dx = x - this.startMouse.x;
			let dy = y - this.startMouse.y;

			let z = this.startPosition.z;
			let ex = this.startPosition.x + dx / z;
			let ey = this.startPosition.y + dy / z;
			let a = this.startPosition.a;

			this.camera.setPosition(this.delay, ex, ey, z, a);
		}

		panEnd(e, x, y) {
			this.panning = false;
		}

		pinchStart(e, x, y, scale) {
			this.zooming = true;
			this.prevScale = scale;
		}

		pinchMove(e, x, y, scale) {
			if (!this.zooming)
				return;
			const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
			const absoluteZoom = camera.target.z * this.prevScale/scale;
			this.camera.zoom(this.delay, absoluteZoom, pos.x, pos.y);
			this.prevScale = scale;
		}

		pinchEnd(e, x, y, scale) {
			this.zooming = false;
		}

		wheelDelta(e, x, y, delta) {
			const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
			const dz = Math.pow(this.zoomAmount, delta);
			this.camera.deltaZoom(this.delay, dz, pos.x, pos.y);
		}

		doubleTap(e, x, y) {
			const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
			const dz = this.zoomAmount;
			this.camera.deltaZoom(this.delay, dz, pos.x, pos.y);
		}

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
				overlay: {},
				controllers: [],
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
				div.prepend(this.canvasElement);
			}

			this.initCanvasElement(this.canvasElement);

			this.overlayElement = document.createElement('div');
			this.overlayElement.classList.add('openlime-overlay');
			this.containerElement.appendChild(this.overlayElement);


			this.canvas = new Canvas(this.gl, this.camera, this.canvas);
			this.canvas.addEvent('update', () => { this.redraw(); });

			this.camera.addEvent('update', () => { this.redraw(); });

			this.controllers.push(new ControllerPanZoom(this.camera));

			var resizeobserver = new ResizeObserver( entries => {
				for (let entry of entries) {
					this.resize(entry.contentRect.width, entry.contentRect.height);
					this.processEvent('resize', {}, entry.contentRect.width, entry.contentRect.height);
				}
			});
			resizeobserver.observe(this.canvasElement);

			this.resize(this.canvasElement.clientWidth, this.canvasElement.clientHeight);

			this.initEvents();
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

			this.camera.setViewport({x:0, y:0, dx:width, dy:height, w:width, h:height});
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

			let viewport = this.camera.viewport;
			let transform = this.camera.getCurrentTransform(time);

			let done = this.canvas.draw(time);
			for(let [name, layer] of Object.values(this.overlay))
				done &= layer.draw(transform, viewport);
			if(!done)
				this.redraw();
		}

		processEvent(event, e, x, y, scale) {
			//if events are captured

			//first check layers from top to bottom
			let ordered = Object.values(this.canvas.layers).sort( (a, b) => b.zindex - a.zindex);
			ordered.push(this);
			for(let layer of ordered) {
				for(let controller of layer.controllers) {
					if(controller.active && controller[event] && controller[event](e, x, y, scale))
						return;
				}
			}
		}

		hammerEventToPosition(e) {
			let rect = this.canvasElement.getBoundingClientRect();
			let x = e.center.x - rect.left;
			let y = e.center.y - rect.top;
			e.rect = rect;
			return { x: x, y: y }
		}

		eventToPosition(e, touch) {
			let rect = e.currentTarget.getBoundingClientRect();
			let x = e.clientX - rect.left;
			let y = e.clientY - rect.top;
			e.rect = rect;
			return { x: x, y: y }
		}


		initEvents() {

			let element = this.canvasElement;

			element.addEventListener('contextmenu', (e) => {
				e.preventDefault();
				return false;
			});

			const mc = new Hammer.Manager(element); 

			mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
			mc.add(new Hammer.Tap({ event: 'singletap', taps: 1 }));
			mc.get('doubletap').recognizeWith('singletap');
			mc.get('singletap').requireFailure('doubletap');
			mc.add(new Hammer.Pan({ pointers: 1, direction: Hammer.DIRECTION_ALL, threshold: 0 }));
			mc.add(new Hammer.Pinch());

			let events = {
				'singletap':'singleTap', 'doubletap':'doubleTap', 
				'panstart':'panStart', 'panmove':'panMove', 'panend pancancel': 'panEnd',
				'pinchstart': 'pinchStart', 'pinchmove':'pinchMove', 'pinchend pinchcancel': 'pinchEnd'
			};
			for(let [event, callback] of Object.entries(events)) {
				mc.on(event, (e) => {
					const pos = this.hammerEventToPosition(e);
					const scale = e.scale;
					this.processEvent(callback, e, pos.x, pos.y, scale);
					e.preventDefault();
					return false;
				});
			}

			element.addEventListener('wheel', (e) => {
				//TODO support for delta X?
				const pos = this.eventToPosition(e);
				let delta = e.deltaY > 0 ? 1 : -1;
				this.processEvent('wheelDelta', e, pos.x, pos.y, delta);
				e.preventDefault();
			});
		}
	}

	exports.Camera = Camera;
	exports.Canvas = Canvas;
	exports.Layer = Layer$1;
	exports.Layout = Layout;
	exports.OpenLIME = OpenLIME;
	exports.RTILayer = RTILayer;
	exports.Raster = Raster;
	exports.Shader = Shader;
	exports.Transform = Transform;
	exports.UIBasic = UIBasic;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
