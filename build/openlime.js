(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.OpenLIME = {}));
}(this, (function (exports) { 'use strict';

    class BoundingBox {
        constructor(options) {
            Object.assign(this, {
                xLow: 1e20,
                yLow: 1e20,
                xHigh: -1e20, 
                yHigh: -1e20 });
            Object.assign(this, options);
        }

        fromArray(x) {
            this.xLow = x[0];
            this.yLow = x[1]; 
            this.xHigh = x[2];
            this.yHigh  = x[3];
        }
        
        toEmpty() {
            this.xLow = 1e20;
            this.yLow = 1e20; 
            this.xHigh = -1e20;
            this.yHigh  = -1e20;
        }

        isEmpty() {
            return this.xLow > this.xHigh || this.yLow > this.yHigh;
        }

        toArray() {
            return [this.xLow, this.yLow, this.xHigh, this. yHigh];
        }

        toString() {
            return this.xLow.toString() + " " + this.yLow.toString() + " " + this.xHigh.toString() + " " + this.yHigh.toString();
        }

        mergeBox(box) {
    		if (box == null) {
                return this;
            } else {
                this.xLow = Math.min(this.xLow,  box.xLow);
                this.yLow = Math.min(this.yLow,  box.yLow);
                this.xHigh = Math.max(this.xHigh, box.xHigh);
                this.yHigh = Math.max(this.yHigh, box.yHigh);
            }
        }

        mergePoint(p) {
            this.xLow = Math.min(this.xLow, p.x);
            this.yLow = Math.min(this.yLow, p.y);
            this.xHigh = Math.max(this.xHigh, p.x);
            this.yHigh = Math.max(this.yHigh, p.y);
        }
        
        shift(dx, dy) {
            this.xLow += dx;
            this.yLow += dy;
            this.xHigh += dx;
            this.yHigh += dy;
        }

        quantize(side) {
            this.xLow =  Math.floor(this.xLow/side);
            this.yLow =  Math.floor(this.yLow/side);
            this.xHigh = Math.floor((this.xHigh-1)/side) + 1;
            this.yHigh = Math.floor((this.yHigh-1)/side) + 1;
        }

        width() {
            return this.xHigh - this.xLow;
        }
        
        height() {
            return this.yHigh - this.yLow;
        }

        center() {
            return [(this.xLow+this.xHigh)/2, (this.yLow+this.yHigh)/2];
        }

        corner(i) {
            // To avoid the switch
            let v = this.toArray();
            return [ v[0 + (i&0x1)<<1],  v[1 + (i&0x2)] ];
        }

        print() {
            console.log("BOX=" + this.xLow.toFixed(2) + ", " + this.yLow.toFixed(2) + ", " + this.xHigh.toFixed(2) + ", " + this.yHigh.toFixed(2));
        }

    }

    /**
     * 
     * @param {number} x position
     * @param {number} y position
     * @param {number} z scale
     * @param {number} a rotation in degrees
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
    		let r = Transform.rotate(x, y, this.a);
    		return { 
    			x: r.x*this.z + this.x,
    			y: r.y*this.z + this.y
    		}
    	}

    	inverse() {
    		let r = Transform.rotate(this.x/this.z, this.y/this.z, -this.a);
    		return new Transform({x:-r.x, y:-r.y, z:1/this.z, a:-this.a, t:this.t});
    	}

    	static normalizeAngle(a) {
    		while(a > 360) a -= 360;
    		while(a < 0) a += 360;
    		return a;
    	}

    	static rotate(x, y, angle) {
    		angle = Math.PI*(angle/180);
    		let ex =  Math.cos(angle)*x + Math.sin(angle)*y;
    		let ey = -Math.sin(angle)*x + Math.cos(angle)*y;
    		return {x:ex, y:ey};
    	}

    	// first get applied this (a) then  transform (b).
    	compose(transform) {
    		let a = this.copy();
    		let b = transform;
    		a.z *= b.z;
    		a.a += b.a;
    		var r = Transform.rotate(a.x, a.y, b.a);
    		a.x = r.x*b.z + b.x;
    		a.y = r.y*b.z + b.y; 
    		return a;
    	}

    	/* transform the box (for example -w/2, -h/2 , w/2, h/2 in scene coords) */
    	transformBox(lbox) {
    		let box = new BoundingBox();
    		for(let i = 0; i < 4; i++) {
    			let c = lbox.corner(i);
    			let p = this.apply(c[0], c[1]);
    			box.mergePoint(p);
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
    		let box = new BoundingBox();
    		for(let corner of corners) {
    			let p = inverse.apply(corner.x -viewport.w/2, corner.y - viewport.h/2);
    			box.mergePoint(p);
    		}
    		return box;
    	}

    	interpolate(source, target, time) {
    		let t = (target.t - source.t);

    		this.t = time;
    		if(time < source.t) 
    			return Object.assign(this, source);
    		if(time > target.t || t < 0.0001) 
    			return Object.assign(this, target);		

    		let tt = (time - source.t)/t;
    		let st = (target.t - time)/t;
    		
    		for(let i of ['x', 'y', 'z', 'a'])
    			this[i] = (st*source[i] + tt*target[i]);
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
    		//0, 0 <-> viewport.x + viewport.dx/2 (if x, y =
    		
    		let zx = 2/viewport.dx;
    		let zy = 2/viewport.dy;

    		let dx =  zx * this.x + (2/viewport.dx)*(viewport.w/2-viewport.x)-1;
    		let dy = -zy * this.y + (2/viewport.dy)*(viewport.h/2-viewport.y)-1;

    		let a = Math.PI *this.a/180;
    		let matrix = [
    			 Math.cos(a)*zx*z, Math.sin(a)*zy*z,  0,  0, 
    			-Math.sin(a)*zx*z, Math.cos(a)*zy*z,  0,  0,
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
            return [p[0] * this.z  + this.x - viewport.x + viewport.w/2, 
                    p[1] * this.z  - this.y + viewport.y + viewport.h/2 ];
        }

    	/**
         * Transform p from  [0,wh] to scene (0 at image center)
    	 * 
    	 * @param {*} viewport viewport(x,y,dx,dy,w,h)
    	 * @param {*} p point in range [0..w-1,0..h-1]
    	 */
        viewportToSceneCoords(viewport, p) {
            return [(p[0] + viewport.x - viewport.w/2 - this.x) / this.z,
                    (p[1] - viewport.y - viewport.h/2 + this.y) / this.z];

        }

    }

    /**
     *  NOTICE TODO: the camera has the transform relative to the whole canvas NOT the viewport.
     * @param {object} options
     * * *bounded*: limit translation of the camera to the boundary of the scene.
     * * *maxZoom*: maximum zoom, 1:maxZoom is screen pixel to image pixel ratio.
     * * *minZoom*: minimum zoom,
     * 
     * Signals:
     * Emits 'update' event when target is changed.
     */

    class Camera {

    	constructor(options) {
    		Object.assign(this, {
    			viewport: null,
    			bounded: true,
    			minScreenFraction: 1,
    			maxFixedZoom: 2,
    			maxZoom: 2,
    			minZoom: 1,
    			boundingBox: new BoundingBox,

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
    		if(this.viewport) {
    			let rz = Math.sqrt((view.w/this.viewport.w)*(view.h/this.viewport.h));
    			this.viewport = view;
    			const {x, y, z, a } = this.target;
    			this.setPosition(0, x, y, z*rz, a);
    		} else {
    			this.viewport = view;
    		}
    	}

    /**
     *  Map coordinate relative to the canvas into scene coords. using the specified transform.
     * @returns [X, Y] in scene coordinates.
     */
    	mapToScene(x, y, transform) {
    		//compute coords relative to the center of the viewport.
    		x -= this.viewport.w/2;
    		y -= this.viewport.h/2;
    		x -= transform.x;
    		y -= transform.y;
    		x /= transform.z;
    		y /= transform.z;
    		let r = Transform.rotate(x, y, -transform.a);
    		return {x:r.x, y:r.y};
    	}

    	setPosition(dt, x, y, z, a) {
    		// Discard events due to cursor outside window
    		if (Math.abs(x) > 64000 || Math.abs(y) > 64000) return;

    		if (this.bounded) {
    			const sw = this.viewport.dx;
    			const sh = this.viewport.dy;

    			//
    			let xform = new Transform({x:x, y:y, z:z, a:a,t:0});
    			let tbox = xform.transformBox(this.boundingBox);
    			const bw = tbox.width();
    			const bh = tbox.height();

    			// Screen space offset between image boundary and screen boundary
    			// Do not let transform offet go beyond this limit.
    			// if (scaled-image-size < screen) it remains fully contained
    			// else the scaled-image boundary closest to the screen cannot enter the screen.
    			const dx = Math.abs(bw-sw)/2;
    			x = Math.min(Math.max(-dx, x), dx);

    			const dy = Math.abs(bh-sh)/2;
    			y = Math.min(Math.max(-dy, y), dy);
    		}

    		let now = performance.now();
    		this.source = this.getCurrentTransform(now);
    		//the angle needs to be interpolated in the shortest direction.
    		//target it is kept between 0 and +360, source is kept relative.
    		a = Transform.normalizeAngle(a);
    		this.source.a = Transform.normalizeAngle(this.source.a);
    		if(a - this.source.a > 180) this.source.a += 360;
    		if(this.source.a - a > 180) this.source.a -= 360;
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

    		if (this.bounded) {
    			z = Math.min(Math.max(z, this.minZoom), this.maxZoom);
    		}

    		//x, an y should be the center of the zoom.
    		m.x += (m.x+x)*(m.z - z)/m.z;
    		m.y += (m.y+y)*(m.z - z)/m.z;

    		this.setPosition(dt, m.x, m.y, z, m.a);
    	}

    	rotate(dt, a) {

    		let now = performance.now();
    		let m = this.getCurrentTransform(now);

    		this.setPosition(dt, m.x, m.y, m.z, this.target.a + a);
    	}

    	deltaZoom(dt, dz, x, y) {
    		if(!x) x = 0;
    		if(!y) y = 0;

    		let now = performance.now();
    		let m = this.getCurrentTransform(now);


    		//rapid firing wheel event need to compound.
    		//but the x, y in input are relative to the current transform.
    		dz *= this.target.z/m.z;

    		if (this.bounded) {
    			if (m.z*dz < this.minZoom) dz = this.minZoom / m.z;
    			if (m.z*dz > this.maxZoom) dz = this.maxZoom / m.z;
    		}

    		//transform is x*z + dx = X , there x is positrion in scene, X on screen
    		//we want x*z*dz + dx1 = X (stay put, we need to find dx1.
    		let r = Transform.rotate(x, y, m.a);
    		m.x += r.x*m.z*(1 - dz);
    		m.y += r.y*m.z*(1 - dz);

    		
    		this.setPosition(dt, m.x, m.y, m.z*dz, m.a);
    	}


    	getCurrentTransform(time) {
    		let pos = new Transform();
    		if(time < this.source.t)
    			Object.assign(pos, this.source);
    		if(time >= this.target.t)
    			Object.assign(pos, this.target);
    		else 
    			pos.interpolate(this.source, this.target, time);

    		pos.t = time;
    		return pos;
    	}

    /**
     * @param {Array} box fit the specified rectangle [minx, miny, maxx, maxy] in the canvas.
     * @param {number} dt animation duration in millisecond 
     * @param {string} size how to fit the image: <contain | cover> default is contain (and cover is not implemented
     */

    //TODO should fit keeping the same angle!
    	fit(box, dt, size) {
    		if (box.isEmpty()) return;
    		if(!dt) dt = 0;

    		//find if we align the topbottom borders or the leftright border.
    		let w = this.viewport.dx;
    		let h = this.viewport.dy;


    		let bw = box.width();
    		let bh = box.height();
    		let c = box.center();
    		let z = Math.min(w/bw, h/bh);

    		this.setPosition(dt, -c[0], -c[1], z, 0);
    	}

    	fitCameraBox(dt) {
    		this.fit(this.boundingBox, dt);
    	}

    	updateBounds(box, minScale) {
    		this.boundingBox = box;
    		const w = this.viewport.dx;
    		const h = this.viewport.dy;

    		let bw = this.boundingBox.width();
    		let bh = this.boundingBox.height();
    	
    		this.minZoom = Math.min(w/bw, h/bh) * this.minScreenFraction;
    		this.maxZoom = minScale > 0 ? this.maxFixedZoom / minScale : this.maxFixedZoom;
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
     * * *cors*: use cross orgini fetch (default: true), if false will use slower image.src method.
     */

    class Raster {

    	constructor(options) {

    		Object.assign(this, { 
    			type: 'vec3', 
    			colorSpace: 'linear',
    			attribute: 'kd',
    		 });

    		Object.assign(this, options);
    	}


    	loadImage(tile, gl, callback) {
    		(async () => {
    			let options = {};
    			if(tile.end)
    				options.headers = { range: `bytes=${tile.start}-${tile.end}`, 'Accept-Encoding': 'indentity' };
    			var response = await fetch(tile.url, options);
    			if(!response.ok) {
    				callback("Failed loading " + tile.url + ": " + response.statusText);
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
    				let urlCreator = window.URL || window.webkitURL;
    				let img = document.createElement('img');
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
    			program: null,      //webgl program
    			modes: [],
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

    	restoreWebGL(gl) {
    		this.createProgram(gl);
    	}

    	setUniform(name, value) {
    		let u = this.uniforms[name];
    		u.value = value;
    		u.needsUpdate = true;
    		this.emit('update');
    	}

    	createProgram(gl) {

    		let vert = gl.createShader(gl.VERTEX_SHADER);
    		gl.shaderSource(vert, this.vertShaderSrc(gl));

    		gl.compileShader(vert);
    		let compiled = gl.getShaderParameter(vert, gl.COMPILE_STATUS);
    		if(!compiled) {
    			console.log(gl.getShaderInfoLog(vert));
    			throw Error("Failed vertex shader compilation: see console log and ask for support.");
    		}

    		let frag = gl.createShader(gl.FRAGMENT_SHADER);
    		gl.shaderSource(frag, this.fragShaderSrc(gl));
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

    		for(let uniform of Object.values(this.uniforms)) {
    			uniform.location = null;
    			uniform.needsUpdate = true;
    		}
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
    					case 'float': gl.uniform1f(uniform.location, value); break;
    					case 'int':   gl.uniform1i (uniform.location, value); break;
    					default: throw Error('Unknown uniform type: ' + u.type);
    				}
    			}
    		}
    	}

    	vertShaderSrc(gl) {
    		let gl2 = gl instanceof WebGL2RenderingContext;
    		return `${gl2? '#version 300 es':''}

precision highp float; 
precision highp int; 

uniform mat4 u_matrix;
${gl2? 'in' : 'attribute'} vec4 a_position;
${gl2? 'in' : 'attribute'} vec2 a_texcoord;

${gl2? 'out' : 'varying'} vec2 v_texcoord;

void main() {
	gl_Position = u_matrix * a_position;
	v_texcoord = a_texcoord;
}`;
    	}

    	fragShaderSrc(gl) {
    		throw 'Unimplemented!'
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
    			width: 0,
    			height: 0,
    			tilesize: 256,
    			overlap: 0, 
    			nlevels: 1,        //level 0 is the top, single tile level.
    			tiles: [],
    			suffix: 'jpg',
    			qbox: [],          //array of bounding box in tiles, one for mipmap 
    			bbox: [],          //array of bounding box in pixels (w, h)

    			signals: { ready: [], updateSize: [] },          //callbacks when the layout is ready.
    			status: null
    		});
    		if(options)
    			Object.assign(this, options);

    		if(typeof(url) == 'string') {
    			this.url = url;

    			(async () => {
    				switch(this.type) {
    					case 'image':    await this.initImage(); break;
    					case 'google':   await this.initGoogle(); break;
    					case 'deepzoom1px': await this.initDeepzoom(true); break;
    					case 'deepzoom': await this.initDeepzoom(false); break;
    					case 'tarzoom':  await this.initTarzoom(); break;
    					case 'zoomify':  await this.initZoomify(); break;
    					case 'iiif':     await this.initIIIF(); break;
    				}
    				this.initBoxes();
    				this.status = 'ready';
    				this.emit('ready');
    				
    			})().catch(e => { console.log(e); this.status = e; });
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
    		if(!this.width) throw "Layout not initialized still";
    		return new BoundingBox({xLow:-this.width/2, yLow: -this.height/2, xHigh: this.width/2, yHigh: this.height/2});
    	}

    /**
     *  Each tile is assigned an unique number.
     */

    	index(level, x, y) {
    		let startindex = 0;
    		for(let i = 0; i < level; i++)
    			startindex += this.qbox[i].xHigh*this.qbox[i].yHigh;
    		return startindex + y*this.qbox[level].xHigh + x;
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
    			this.qbox[0] = new BoundingBox({xLow:0, yLow: 0, xHigh: 1, yHigh: 1});
    			this.bbox[0] = new BoundingBox({xLow:0, yLow: 0, xHigh: w, yHigh: h}); 
    			this.tiles.push({index:0, level:0, x:0, y:0});
    			// Acknowledge bbox change (useful for knowing scene extension (at canvas level))
    			this.emit('updateSize');
    			return 1;
    		}

    		let tiles = [];
    		for(let level = this.nlevels - 1; level >= 0; level--) {
    			this.qbox[level] = new BoundingBox({xLow:0, yLow: 0, xHigh: 0, yHigh: 0});
    			this.bbox[level] = new BoundingBox({xLow:0, yLow: 0, xHigh: w, yHigh: h}); 
    			for(let y = 0; y*this.tilesize < h; y++) {
    				this.qbox[level].yHigh = y+1;
    				for(let x = 0; x*this.tilesize < w; x ++) {
    					this.qbox[level].xHigh = x+1;
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

    		// Acknowledge bbox (useful for knowing scene extension (at canvas level))
    		this.emit('updateSize');
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

    		var lx  = this.qbox[level].xHigh-1; //last tile x pos, if so no overlap.
    		var ly  = this.qbox[level].yHigh-1;

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
    			return { level:0, pyramid: [new BoundingBox({ xLow:0, yLow:0, xHigh:1, yHigh:1 })] };

    		//here we are computing with inverse levels; level 0 is the bottom!
    		let iminlevel = Math.max(0, Math.min(Math.floor(-Math.log2(transform.z) + bias), this.nlevels-1));
    		let minlevel = this.nlevels-1-iminlevel;
    		//
    		let bbox = transform.getInverseBox(viewport);
    		//find box in image coordinates where (0, 0) is in the upper left corner.
    		bbox.shift(this.width/2, this.height/2);

    		let pyramid = [];
    		for(let level = 0; level <= minlevel; level++) {
    			let ilevel = this.nlevels -1 -level;
    			let side = this.tilesize*Math.pow(2, ilevel);

    			let qbox = new BoundingBox(bbox);
    			qbox.quantize(side);

    			//clamp!
    			qbox.xLow  = Math.max(qbox.xLow  - border, this.qbox[level].xLow);
    			qbox.yLow  = Math.max(qbox.yLow  - border, this.qbox[level].yLow);
    			qbox.xHigh = Math.min(qbox.xHigh + border, this.qbox[level].xHigh);
    			qbox.yHigh = Math.min(qbox.yHigh + border, this.qbox[level].yHigh);
    			pyramid[level] = qbox;
    		}
    		return { level: minlevel, pyramid: pyramid };
    	}

    	getTileURL(url, tile) {
    		throw Error("Layout not defined or ready.");
    	}



    /*
     * Witdh and height can be recovered once the image is downloaded.
    */
    	initImage() {
    		this.getTileURL = (url, tile) => { return url; };
    		this.nlevels = 1;
    		this.tilesize = 0;
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

    		this.getTileURL = (url, tile) => {
    			return url + "/" + tile.level + "/" + tile.y + "/" + tile.x + '.' + this.suffix;
    		};
    	}


    /**
     * Expects the url to point to .dzi config file
     */
    	async initDeepzoom(onepixel) {		
    		var response = await fetch(this.url);
    		if(!response.ok) {
    			this.status = "Failed loading " + this.url + ": " + response.statusText;
    			return;
    		}
    		let text = await response.text();
    		let xml = (new window.DOMParser()).parseFromString(text, "text/xml");

    		let doc = xml.documentElement;
    		this.suffix = doc.getAttribute('Format');
    		this.tilesize = parseInt(doc.getAttribute('TileSize'));
    		this.overlap = parseInt(doc.getAttribute('Overlap'));

    		let size = doc.querySelector('Size');
    		this.width = parseInt(size.getAttribute('Width'));
    		this.height = parseInt(size.getAttribute('Height'));

    		let max = Math.max(this.width, this.height)/this.tilesize;
    		this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

    		this.url = this.url.substr(0, this.url.lastIndexOf(".")) + '_files/';
    		this.skiplevels = 0;
    		if(onepixel)
    			this.skiplevels = Math.ceil(Math.log(this.tilesize) / Math.LN2);

    		this.getTileURL = (url, tile) => {
    			let level = tile.level + this.skiplevels;
    			url = url.substr(0, url.lastIndexOf(".")) + '_files/';
    			return url + level + '/' + tile.x + '_' + tile.y + '.' + this.suffix;
    		}; 
    	}

    	async initTarzoom() {		
    		var response = await fetch(this.url);
    		if(!response.ok) {
    			this.status = "Failed loading " + this.url + ": " + response.statusText;
    			return;
    		}
    		let json = await response.json();
    		Object.assign(this, json); //suffix, tilesize, overlap, width, height, levels
    		//this.nlevels = this.levels.length;
    		this.url = this.url.substr(0, this.url.lastIndexOf(".")) + '.tzb';

    		this.getTileURL = (url, tile) => {
    			tile.start = this.offsets[tile.index];
    			tile.end = this.offsets[tile.index+1];
    			url = url.substr(0, url.lastIndexOf(".")) + '.tzb';
    			return url; // + level + '/' + x + '_' + y + '.' + this.suffix;
    		}; 
    	}



    /**
     * Expects the url to point to ImageProperties.xml file.
     */
    	async initZoomify() {
    		this.overlap = 0;
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

    		this.getTileURL = (url, tile) => {
    			//let index = this.index(level, x, y)>>>0;
    			let group = tile.index >> 8;
    			url = url.substr(0, url.lastIndexOf("/"));
    			return this.url + "/TileGroup" + group + "/" + tile.level + "-" + tile.x + "-" + tile.y + "." + this.suffix;
    		};
    	}

    	async initIIIF() {
    		this.overlap = 0;

    		var response = await fetch(this.url);
    		if(!response.ok) {
    			this.status = "Failed loading " + this.url + ": " + response.statusText;
    			return;
    		}
    		let info = await response.json();
    		this.width = info.width;
    		this.height = info.height;
    		this.nlevels = info.tiles[0].scaleFactors.length;
    		this.tilesize = info.tiles[0].width;

    		this.url = this.url.substr(0, this.url.lastIndexOf("/"));

    		this.getTileURL = (url, tile) => {
    			let tw = this.tilesize;
    			let ilevel = parseInt(this.nlevels - 1 - tile.level);
    			let s = Math.pow(2, tile.level);

    			//region parameters
    			let xr = tile.x * tw * s;
    			let yr = tile.y * tw * s;
    			let wr = Math.min(tw * s, this.width - xr);
    			let hr = Math.min(tw * s, this.height - yr);

    			// pixel size parameters /ws,hs/
    			let ws = tw;
    			if (xr + tw*s > this.width)
    				ws = (this.width - xr + s - 1) / s;  
    			let hs = tw;
    			if (yr + tw*s > this.height)
    				hs = (this.height - yr + s - 1) / s;

    			url = url.substr(0, url.lastIndexOf("/"));
    			return `${url}/${xr},${yr},${wr},${hr}/${ws},${hs}/0/default.jpg`;
    		};
    	}
    }

    /* Cache holds the images and the tile textures.
     *  Each tile has a priority 0 and above means it is visible, 
     *  negative depends on how far from the border and how more zoomed you need to go
     * 
     * * *capacity*: in bytes, max amount of GPU RAM used.
     * *size*: current size (read only!)
     * *maxRequest*: max number of concurrent HTTP requests
     * *requested*: current number of HTTP requests (read only!)
     * *maxPrefetch*: max number of tile prefetched (each tile might require multiple httprequests)
     * *prefetched*: current number of tiles requested (read only!)
    */

    class _Cache {
    	constructor(options) {
    		Object.assign(this, {
    			capacity: 512*(1<<20),  //256 MB total capacity available
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
     *  * *layout*: one of image, deepzoom, google, iiif, or zoomify
     *  * *mipmapBias*: default 0.5, when to switch between different levels of the mipmap
     *  * *prefetchBorder*: border tiles prefetch (default 1)
     *  * *maxRequest*: max number of simultaneous requests (should be GLOBAL not per layer!) default 4
     */

    class Layer {
    	constructor(options) {

    			//create from derived class if type specified
    		if(options.type) {
    			let type = options.type;
    			delete options.type;
    			if(type in this.types) {
    				
    				return this.types[type](options);
    			}
    			throw "Layer type: " + type + "  module has not been loaded";
    		} 

    		this.init(options);

    		/*
    		//create members from options.
    		this.rasters = this.rasters.map((raster) => new Raster(raster));

    		//layout needs to be the same for all rasters
    		if(this.rasters.length) {
    			if(typeof(this.layout) != 'object')
    				this.layout = new Layout(this.rasters[0].url, this.layout)
    			this.setLayout(this.layout)

    			if(this.rasters.length)
    				for(let raster in this.rasters)
    					raster.layout = this.layout;
    		}

    		if(this.shader)
    			this.shader = new Shader(this.shader);
    		*/
    	}

    	init(options) {
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

    			signals: { update: [], ready: [], updateSize: [] },  //update callbacks for a redraw, ready once layout is known.

    	//internal stuff, should not be passed as options.
    			tiles: [],      //keep references to each texture (and status) indexed by level, x and y.
    							//each tile is tex: [.. one for raster ..], missing: 3 missing tex before tile is ready.
    							//only raster used by the shader will be loade.
    			queue: [],     //queue of tiles to be loaded.
    			requested: {},  //tiles requested.
    		});

    		Object.assign(this, options);

    		this.transform = new Transform(this.transform);

    		
    	}

    	addEvent(event, callback) {
    		this.signals[event].push(callback);
    	}

    	emit(event, ...parameters) {
    		for(let r of this.signals[event])
    			r(this, ...parameters);
    	}

    	setLayout(layout) {
    		let callback = () => {
    						//this ckeck is needed for tarzom where all layout are loaded separately.
    			for(let r of this.rasters)
    				if(r.layout.status != "ready") {
    					r.layout.addEvent('ready', callback);
    					return;
    				}

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

    		// Set signal to acknowledge change of bbox when it is known. Let this signal go up to canvas
    		this.layout.addEvent('updateSize', () => { this.emit('updateSize'); });
    	}

    	setTransform(tx) {
    		this.transform = tx;
    		this.emit('updateSize'); 
    	}

    	setShader(id) {
    		if(!id in this.shaders)
    			throw "Unknown shader: " + id;
    		this.shader = this.shaders[id];
    		this.setupTiles();
    		this.shader.setEvent('update', ()=>{ this.emit('update'); });
    	}

    	getMode() {
    		return this.shader.mode;
    	}

    	getModes() {
    		if(this.shader)
    			return this.shader.modes;
    		return [];
    	}

    	setMode(mode) {
    		this.shader.setMode(mode);
    		this.emit('update');
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

    	static computeLayersMinScale(layers, discardHidden) {
    		if (layers == undefined || layers == null) {
    			console.log("ASKING SCALE INFO ON NO LAYERS");
    			return 1;
    		}
    		let layersScale = 1;
    		for(let layer of Object.values(layers)) {
    			if (!discardHidden || layer.visible) {
    				let s = layer.scale();
    				layersScale = Math.min(layersScale, s);
    			}
    		}
    		return layersScale;
    	}

    	scale() {
    		// FIXME: this do not consider children layers
    		return this.transform.z;
    	}

    	boundingBox() {
    		// FIXME: this do not consider children layers
    		// Take layout bbox
    		let result = this.layout.boundingBox();
    		
    		// Apply layer transform to bbox
    		if (this.transform != null && this.transform != undefined) {
    			result = this.transform.transformBox(result);
    		}
    		
    		return result;
    	}

    	static computeLayersBBox(layers, discardHidden) {
    		if (layers == undefined || layers == null) {
    			console.log("ASKING BBOX INFO ON NO LAYERS");
    			let emptyBox = new BoundingBox(); 
    			return emptyBox;
    		}
    		let layersBbox = new BoundingBox();
    		for(let layer of Object.values(layers)) {
    			if ((!discardHidden || layer.visible) && layer.layout.width) {
    				const bbox = layer.boundingBox();
    				layersBbox.mergeBox(bbox);
    			}
    		}
    		return layersBbox;
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
    			let done = current.value.every((e, i) => e === target.value[i]);
    			current.value = [...target.value];
    			return done;
    		}

    		let t = (target.t - source.t);
    		let tt = (time - source.t)/t;
    		let st = (target.t - time)/t;

    		current.value = [];
    		for(let i  = 0; i < source.value.length; i++)
    			current.value[i] = (st*source.value[i] + tt*target.value[i]);
    		return false;
    	}
    	
    	clear() {
    		this.ibuffer = this.vbuffer = null;
    		this.tiles = [];
    		this.setupTiles();
    		this.queue = [];
    		this.previouslyNeeded = false;
    		this.prefetch();
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
    		let needed = this.layout.neededBox(viewport, transform, 0, this.mipmapBias);
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

    		for(var y = box.yLow; y < box.yHigh; y++) {
    			for(var x = box.xLow; x < box.xHigh; x++) {
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

    		if(typeof(this.layout) != 'object')
    			throw "AH!";

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
    			for(let y = box.yLow; y < box.yHigh; y++) {
    				for(let x = box.xLow; x < box.xHigh; x++) {
    					let index = this.layout.index(level, x, y);
    					let tile = this.tiles[index];
    					tile.time = now;
    					tile.priority = needed.level - level;
    					if(tile.missing != 0 && !this.requested[index])
    						tmp.push(tile);
    				}
    			}
    			let c = box.center();
    			//sort tiles by distance to the center TODO: check it's correct!
    			tmp.sort(function(a, b) { return Math.abs(a.x - c[0]) + Math.abs(a.y - c[1]) - Math.abs(b.x - c[0]) - Math.abs(b.y - c[1]); });
    			this.queue = this.queue.concat(tmp);
    		}
    		Cache.setCandidates(this);
    	}

    	loadTile(tile, callback) {
    		if(this.requested[tile.index])
    			throw "AAARRGGHHH double request!";

    		this.requested[tile.index] = true;

    		for(let sampler of this.shader.samplers) {
    			
    			let raster = this.rasters[sampler.id];
    			tile.url = raster.layout.getTileURL(raster.url, tile);

    			raster.loadImage(tile, this.gl, (tex, size) => {

    				if(this.layout.type == "image") {
    					this.layout.width = raster.width;
    					this.layout.height = raster.height;
    					this.layout.initBoxes();
    				}
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


    Layer.prototype.types = {};

    /**
     * @param {Element|String} canvas dom element or query selector for a <canvas> element.
     * @param {Element} overlay DIV containing annotations, TODO: at the moment it is just passed to the layers (might need refactoring)
     * @param {Camera} camera (see {@link Camera})
     * @param {Object} options
     * * *layers*: Object specifies layers (see. {@link Layer})
     * * *preserveDrawingBuffer* needed for screenshots (otherwise is just a performance penalty)
     * 
     * **Signals:**
     * Emits *"update"* event when a layer updates or is added or removed.
     * 
     */

    class Canvas {
    	constructor(canvas, overlay, camera, options) {
    		Object.assign(this, { 
    			canvasElement: null,
    			preserveDrawingBuffer: false, 
    			gl: null,
    			overlayElement: overlay,
    			camera: camera,
    			layers: {},
    			signals: {'update':[], 'updateSize':[]}
    		});
    		Object.assign(this, options);

    		this.init(canvas);
    			
    		for(let id in this.layers)
    			this.addLayer(id, new Layer(id, this.layers[id]));

    	}

    	addEvent(event, callback) {
    		this.signals[event].push(callback);
    	}

    	emit(event) {
    		for(let r of this.signals[event])
    			r(this);
    	}

    	//TODO move gl context to canvas!
    	init(canvas) {
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

    		this.canvasElement = canvas;

    		/* test context loss */
    		/* canvas = WebGLDebugUtils.makeLostContextSimulatingCanvas(canvas);
    		canvas.loseContextInNCalls(1000); */


    		let glopt = { antialias: false, depth: false, preserveDrawingBuffer: this.preserveDrawingBuffer };
    		this.gl = this.gl || 
    			canvas.getContext("webgl2", glopt) || 
    			canvas.getContext("webgl", glopt) || 
    			canvas.getContext("experimental-webgl", glopt) ;

    		if (!this.gl)
    			throw "Could not create a WebGL context";

    		canvas.addEventListener("webglcontextlost", (event) => { console.log("Context lost."); event.preventDefault(); }, false);
    		canvas.addEventListener("webglcontextrestored", ()  => { this.restoreWebGL(); }, false);
    		document.addEventListener("visibilitychange", (event) => { if(this.gl.isContextLost()) { this.restoreWebGL(); }});

    		/* DEBUG OpenGL calls */
    		/*function logGLCall(functionName, args) {   
    			console.log("gl." + functionName + "(" + 
    			WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");   
    		} 
    		this.gl = WebGLDebugUtils.makeDebugContext(this.gl, undefined, logGLCall);  */


    	}

    	restoreWebGL() {
    		let glopt = { antialias: false, depth: false, preserveDrawingBuffer: this.preserveDrawingBuffer };
    		this.gl = this.gl || 
    			canvas.getContext("webgl2", glopt) || 
    			canvas.getContext("webgl", glopt) || 
    			canvas.getContext("experimental-webgl", glopt) ;

    		for(let layer of Object.values(this.layers)) {
    			layer.gl = this.gl;
    			layer.clear();
    			if(layer.shader)
    				layer.shader.restoreWebGL(this.gl);
    		}
    		this.emit('update');
    	}

    	addLayer(id, layer) {
    		layer.id = id;
    		layer.addEvent('update', () => { this.emit('update'); });
    		layer.addEvent('updateSize', () => { this.updateSize(); });
    		layer.gl = this.gl;
    		layer.overlayElement = this.overlayElement;
    		this.layers[id] = layer;
    		this.prefetch();
    	}

    	updateSize() {
    		const discardHidden = true;
    		let sceneBBox = Layer.computeLayersBBox(this.layers, discardHidden);
    		let minScale =  Layer.computeLayersMinScale(this.layers, discardHidden);
    		
    		if (sceneBBox != null) this.camera.updateBounds(sceneBBox, minScale);
    		this.emit('updateSize');
    	}

    	draw(time) {
    		let gl = this.gl;
    		let view = this.camera.viewport;
    		gl.viewport(view.x, view.y, view.dx, view.dy);

    		var b = [0, 0, 0, 0];
    		gl.clearColor(b[0], b[1], b[2], b[3], b[4]);
    		gl.clear(gl.COLOR_BUFFER_BIT);

    		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    		gl.enable(gl.BLEND);

    		//TODO: getCurren shoudl redurn {position, done}
    		let pos = this.camera.getCurrentTransform(time);
    		//todo we could actually prefetch toward the future a little bit
    		this.prefetch(pos);

    		//pos layers using zindex.
    		let ordered = Object.values(this.layers).sort( (a, b) => a.zindex - b.zindex);

    		//NOTICE: camera(pos) must be relative to the WHOLE canvas
    		let done = true;
    		for(let layer of ordered)
    			if(layer.visible)
    				done = layer.draw(pos, view) && done;

    		//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.
    		return done && pos.t >= this.camera.target.t;
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
     *  @param {object} options
     * *compose*: compose operation: add, subtract, multiply, etc.
     */

    class RTIShader extends Shader {
    	constructor(options) {
    		super({});

    		Object.assign(this, {
    			modes: ['light', 'normals', 'diffuse', 'specular'],
    			mode: 'normal',
    			type:        ['ptm', 'hsh',  'sh', 'rbf', 'bln'],
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
    		Object.assign(this, options);

    		if(this.relight)
    			this.init(this.relight);

    		this.setMode('light');
    	}

    	setMode(mode) {
    		if(!(this.modes.includes(mode)))
    			throw Error("Unknown mode: " + mode);
    		this.mode = mode;

    		if( mode != 'light') {
    			this.lightWeights([ 0.612,  0.354, 0.707], 'base');
    			this.lightWeights([-0.612,  0.354, 0.707], 'base1');
    			this.lightWeights([     0, -0.707, 0.707], 'base2');
    		}
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
    	setSpecularExp(value) {
    		this.setUniform('specular_exp', value);
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
    		if(this.normals)
    			this.samplers.push({id:this.njpegs, name:'normals', type:'vec3' });

    		if(this.normals)
    			this.samplers.push({ id:this.njpegs, name:'normals', type:'vec3'});

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
    			specular_exp: { type: 'float', needsUpdate: false, size: 1, value: 10 },
    			bias:  { type: 'vec3', needsUpdate: true, size: this.nplanes/3, value: this.bias },
    			scale: { type: 'vec3', needsUpdate: true, size: this.nplanes/3, value: this.scale },
    			base:  { type: 'vec3', needsUpdate: true, size: this.nplanes },
    			base1: { type: 'vec3', needsUpdate: false, size: this.nplanes },
    			base2: { type: 'vec3', needsUpdate: false, size: this.nplanes }
    		};

    		this.lightWeights([0, 0, 1], 'base');
    	}

    	lightWeights(light, basename, time) {
    		let value;
    		switch(this.type) {
    			case 'ptm': value = PTM.lightWeights(light); break;
    			case 'hsh': value = HSH.lightWeights(light); break;
    			case 'sh' : value = SH.lightWeights(light); break;
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

    	fragShaderSrc(gl) {
    		let basetype = 'vec3'; //(this.colorspace == 'mrgb' || this.colorspace == 'mycc')?'vec3':'float';
    		let gl2 = gl instanceof WebGL2RenderingContext;
    		let str = `${gl2? '#version 300 es' : ''}

precision highp float; 
precision highp int; 

#define np1 ${this.nplanes + 1}

${gl2? 'in' : 'varying'} vec2 v_texcoord;
${gl2? 'out' : ''} vec4 color;

const mat3 T = mat3(8.1650e-01, 4.7140e-01, 4.7140e-01,
	-8.1650e-01, 4.7140e-01,  4.7140e-01,
	-1.6222e-08, -9.4281e-01, 4.7140e-01);

uniform vec3 light;
uniform float specular_exp;
uniform vec3 bias[np1];
uniform vec3 scale[np1];

uniform ${basetype} base[np1];
uniform ${basetype} base1[np1];
uniform ${basetype} base2[np1];
`;

    		for(let n = 0; n < this.njpegs; n++) 
    			str += `
uniform sampler2D plane${n};
`;

    		if(this.normals)
    			str += `
uniform sampler2D normals;
`;

    		if(this.colorspace == 'mycc')
    			str +=
`

const int ny0 = ${this.yccplanes[0]};
const int ny1 = ${this.yccplanes[1]};
`;

    		switch(this.colorspace) {
    			case 'rgb':  str +=  RGB.render(this.njpegs, gl2); break;
    			case 'mrgb': str += MRGB.render(this.njpegs, gl2); break;
    			case 'mycc': str += MYCC.render(this.njpegs, this.yccplanes[0], gl2); break;
    		}

    		str += `

void main(void) {

`;
    		if(this.mode == 'light') {
    			str += `
	color = render(base);
`;
    		} else  {
    			if(this.normals)
    				str += `
	vec3 normal = (texture${gl2?'':'2D'}(normals, v_texcoord).zyx *2.0) - 1.0;
	normal.z = sqrt(1.0 - normal.x*normal.x - normal.y*normal.y);
`;
    			else
    				str += `
	vec3 normal;
	normal.x = dot(render(base ).xyz, vec3(1));
	normal.y = dot(render(base1).xyz, vec3(1));
	normal.z = dot(render(base2).xyz, vec3(1));
	normal = normalize(T * normal);
`; 
    			switch(this.mode) {
    			case 'normals':  str += `
	normal = (normal + 1.0)/2.0;
	color = vec4(0.0, normal.xy, 1);
`;
    			break;

    			case 'diffuse': str += `
	color = vec4(vec3(dot(light, normal)), 1);
`;
    			break;

    			case 'specular': 
    			default: str += `
	float s = pow(dot(light, normal), specular_exp);
	//color = vec4(render(base).xyz*s, 1.0);
	color = vec4(s, s, s, 1.0);
`;
    			break;
    			}
    		}

    		str += `
	${gl2?'':'gl_FragColor = color;'}
}`;
    		return str;
    	}
    }



    class RGB {
    	static render(njpegs, gl2) {
    		let str = `
vec4 render(vec3 base[np1]) {
	vec4 rgb = vec4(0, 0, 0, 1);`;

    		for(let j = 0; j < njpegs; j++) {
    			str += `
	{
		vec4 c = texture${gl2?'':'2D'}(plane${j}, v_texcoord);
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
    	static render(njpegs, gl2) {
    		let str = `
vec4 render(vec3 base[np1]) {
	vec3 rgb = base[0];
	vec4 c;
	vec3 r;
`;
    		for(let j = 0; j < njpegs; j++) {
    			str +=
`	c = texture${gl2?'':'2D'}(plane${j}, v_texcoord);
	r = (c.xyz - bias[${j}])* scale[${j}];

	rgb += base[${j}*3+1]*r.x;
	rgb += base[${j}*3+2]*r.y;
	rgb += base[${j}*3+3]*r.z;
`    ;
    		}
    		str += `
	return vec4(rgb, 1);
}
`;
    		return str;
    	}
    }

    class MYCC {

    	static render(njpegs, ny1, gl2) {
    		let str = `
vec3 toRgb(vec3 ycc) {
 	vec3 rgb;
	rgb.g = ycc.r + ycc.b/2.0;
	rgb.b = ycc.r - ycc.b/2.0 - ycc.g/2.0;
	rgb.r = rgb.b + ycc.g;
	return rgb;
}

vec4 render(vec3 base[np1]) {
	vec3 rgb = base[0];
	vec4 c;
	vec3 r;
`;
    		for(let j = 0; j < njpegs; j++) {
    			str += `

	c = texture${gl2?'':'2D'}(plane${j}, v_texcoord);

	r = (c.xyz - bias[${j}])* scale[${j}];
`;

    			if(j < ny1) {
    				str += `
	rgb.x += base[${j}*3+1].x*r.x;
	rgb.y += base[${j}*3+2].y*r.y;
	rgb.z += base[${j}*3+3].z*r.z;
`;
    			} else {
    				str += `
	rgb.x += base[${j}*3+1].x*r.x;
	rgb.x += base[${j}*3+2].x*r.y;
	rgb.x += base[${j}*3+3].x*r.z;
`;
    			}
    		}
    		str += `	
	return vec4(toRgb(rgb), 1);
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
    		let theta = Math.min(Math.acos(v[2]), PI / 2 - 0.1);

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

    class SH {
    	/* @param {Array} v expects light direction as [x, y, z]
    	*/
    	static lightWeights(v) {
    		let PI = 3.1415;
    		let A = 0.5*Math.sqrt(3.0/PI);
    		let B = 0.5*Math.sqrt(15/PI);
    		let b = [
    			0.5/Math.sqrt(PI),
    			A*v[0],
    			A*v[2],
    			A*v[1],
    			B*v[0]*v[1],
    			B*v[0]*v[2],
    			0.5*Math.sqrt(5/PI)*(3*v[2]*v[2] - 1),
    			B*v[1]*v[2],
    			0.5*B*(v[1]*v[1] - v[0]*v[0])
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
    	static lightWeights(lpos, shader) {

    		let weights = RBF.rbf(lpos, shader);

    		let np = shader.nplanes;
    		let lweights = new Float32Array((np + 1) * 3);

    		for(let p = 0; p < np+1; p++) {
    			for(let k = 0; k < 3; k++) {
    				for(let l = 0; l < weights.length; l++) {
    					let o = shader.baseLightOffset(p, weights[l][0], k);
    					lweights[3*p + k] += weights[l][1]*shader.basis[o];
    				}
    			}
    		}
    		return lweights;
    	}

    	static rbf(lpos, shader) {
    		let radius = 1/(shader.sigma*shader.sigma);
    		let weights = new Array(shader.ndimensions);

    		//compute rbf weights
    		let totw = 0.0;
    		for(let i = 0; i < weights.length; i++) {
    			let dx = shader.lights[i*3+0] - lpos[0];
    			let dy = shader.lights[i*3+1] - lpos[1];
    			let dz = shader.lights[i*3+2] - lpos[2];

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
    	static lightWeights(lpos, shader) {
    		let np = shader.nplanes;
    		let s = Math.abs(lpos[0]) + Math.abs(lpos[1]) + Math.abs(lpos[2]);

    		//rotate 45 deg.
    		let x = (lpos[0] + lpos[1])/s;
    		let y = (lpos[1] - lpos[0])/s;
    		x = (x + 1.0)/2.0;
    		y = (y + 1.0)/2.0;
    		x = x*(shader.resolution - 1.0);
    		y = y*(shader.resolution - 1.0);

    		let sx = Math.min(shader.resolution-2, Math.max(0, Math.floor(x)));
    		let sy = Math.min(shader.resolution-2, Math.max(0, Math.floor(y)));
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
    				let o00 = shader.basePixelOffset(p, sx, sy, k);
    				let o10 = shader.basePixelOffset(p, sx+1, sy, k);
    				let o01 = shader.basePixelOffset(p, sx, sy+1, k);
    				let o11 = shader.basePixelOffset(p, sx+1, sy+1, k);

    				lweights[3*p + k] = 
    					s00*shader.basis[o00] + 
    					s10*shader.basis[o10] +
    					s01*shader.basis[o01] +
    					s11*shader.basis[o11];

    			}
    		}
    		return lweights;
    	}
    }

    /**
     * Extends {@link Layer}.
     * @param {options} options Same as {@link Layer}, but url and layout are required.
     * **url**: points to a relight format .json
     * **plane**: url for the first coefficient (plane_0), needed for IIIF and IIP (without /info.json)
     */

    class RTILayer extends Layer {
    	constructor(options) {
    		super(options);

    		if(Object.keys(this.rasters).length != 0)
    			throw "Rasters options should be empty!";

    		if(!this.url)
    			throw "Url option is required";

    		if(!this.layout)
    			this.layout = 'image';

    		this.shaders['rti'] = new RTIShader({ normals: this.normals });
    		this.setShader('rti');

    		let now = performance.now();
    		this.controls['light'] = { source:{ value: [0, 0], t: now }, target:{ value:[0, 0], t:now }, current:{ value:[0, 0], t:now } };
    		this.worldRotation = 0; //if the canvas or the layer rotate, light direction neeeds to be rotated too.
    		if(this.url)
    			this.loadJson(this.url);
    	}

    	imageUrl(url, plane) {
    		let path = this.url.substring(0, this.url.lastIndexOf('/')+1);
    		switch(this.layout) {
    			case 'image':    return path + plane + '.jpg';			case 'google':   return path + plane;			case 'deepzoom': return path + plane + '.dzi';			case 'tarzoom':  return path + plane + '.tzi';			case 'zoomify':  return path + plane + '/ImageProperties.xml';			//case 'iip':      return this.plane.throw Error("Unimplemented");
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

    	loadJson(url) {
    		(async () => {
    			var response = await fetch(this.url);
    			if(!response.ok) {
    				this.status = "Failed loading " + this.url + ": " + response.statusText;
    				return;
    			}
    			let json = await response.json();
    			this.shader.init(json);

    			let size = {width:this.width, height:this.height};
    			for(let p = 0; p < this.shader.njpegs; p++) {
    				let url = this.imageUrl(this.url, 'plane_' + p);
    				let raster = new Raster({ url: url, type: 'vec3', attribute: 'coeff', colorspace: 'linear' });
    				//Tarzoom need to load all the indexes for all of the rasters (others just reuse the first layout).
    				if(p == 0 || this.layout == 'tarzoom')
    					raster.layout = new Layout(url, this.layout, size);
    				else
    					raster.layout = this.rasters[0].layout;
    				this.rasters.push(raster);
    			}
    			if(this.normals) {
    				let url = this.imageUrl(this.url, 'normals');
    				let raster = new Raster({ url: url, type: 'vec3', attribute: 'coeff', colorspace: 'linear' });
    				raster.layout = new Layout(url, this.layout, size);
    				this.rasters.push(raster);
    				
    			}			
    			this.setLayout(this.rasters[0].layout);

    		})().catch(e => { console.log(e); this.status = e; });
    	}

    /*
     *  Internal function: light control maps to light direction in the shader.
     */
    	interpolateControls() {
    		let done = super.interpolateControls();
    		if(!done) {
    			let light = this.controls['light'].current.value;
    			//this.shader.setLight(light);
    			let rotated = Transform.rotate(light[0], light[1], this.worldRotation*Math.PI);
    			this.shader.setLight([rotated.x, rotated.y]);
    		}
    		return done;
    	}
    	draw(transform, viewport) {
    		this.worldRotation = transform.a + this.transform.a;
    		return super.draw(transform, viewport);
    	}
    }

    Layer.prototype.types['rti'] = (options) => { return new RTILayer(options); };

    /**
     *  @param {object} options
     *   mode: default is ward, can be [ward, diffuse, specular, normals]
     */

    class ShaderBRDF extends Shader {
    	constructor(options) {
    		super({});

    		this.modes = ['ward', 'diffuse', 'specular', 'normals'];
    		this.mode = 'ward';
    		this.alphaLimits = [0.01, 0.5];
    		Object.assign(this, options);
    		
    		this.uniforms = {
    			uLightInfo:          { type: 'vec4', needsUpdate: true, size: 4, value: [0.1, 0.1, 0.9, 0] },
    			uAlphaLimits:        { type: 'vec2', needsUpdate: true, size: 2, value: this.alphaLimits },
    			uInputColorSpaceKd:  { type: 'int', needsUpdate: true, size: 1, value: this.colorspaces['kd'] },
    			uInputColorSpaceKs:  { type: 'int', needsUpdate: true, size: 1, value: this.colorspaces['ks'] },
    		};

    		this.innerCode = '';
    		this.setMode(this.mode);
    	}

    	setLight(light) {
    		// Light with 4 components (Spot: 4th==1, Dir: 4th==0)
    		this.setUniform('uLightInfo', light);
    	}

    	setMode(mode) {
    		this.mode = mode;
    		switch(mode) {
    			case 'ward':
    				this.innerCode = 
    				`vec3 linearColor = (kd + ks * spec) * NdotL;
				linearColor += kd * 0.02; // HACK! adding just a bit of ambient`;
    			break;
    			case 'diffuse':
    				this.innerCode = 
    				`vec3 linearColor = kd;`;
    			break;
    			case 'specular':
    				this.innerCode = 
    				`vec3 linearColor = clamp((ks * spec) * NdotL, 0.0, 1.0);`;
    			break;
    			case 'normals':
    				this.innerCode = 
    				`vec3 linearColor = (N+vec3(1.))/2.;
				applyGamma = false;`;
    			break;
    			default:
    				console.log("ShaderBRDF: Unknown mode: " + mode);
    				throw Error("ShaderBRDF: Unknown mode: " + mode);
    		}
    		
    	}
    	fragShaderSrc(gl) {
    		let gl2 = gl instanceof WebGL2RenderingContext;
    		let str = `${gl2? '#version 300 es' : ''}

precision highp float; 
precision highp int; 

#define NULL_NORMAL vec3(0,0,0)
#define SQR(x) ((x)*(x))
#define PI (3.14159265359)
#define ISO_WARD_EXPONENT (4.0)

${gl2? 'in' : 'varying'} vec2 v_texcoord;
uniform sampler2D uTexKd;
uniform sampler2D uTexKs;
uniform sampler2D uTexNormals;
uniform sampler2D uTexGloss;

uniform vec4 uLightInfo; // [x,y,z,w] (if .w==0 => Directional, if w==1 => Spot)
uniform vec2 uAlphaLimits;
uniform int uInputColorSpaceKd; // 0: Linear; 1: sRGB
uniform int uInputColorSpaceKs; // 0: Linear; 1: sRGB

${gl2? 'out' : ''}  vec4 color;

vec3 getNormal(const in vec2 texCoord) {
	vec3 n = texture(uTexNormals, texCoord).xyz;
	n = 2. * n - vec3(1.);
	float norm = length(n);
	if(norm < 0.5) return NULL_NORMAL;
	else return n/norm;
}

vec3 linear2sRGB(vec3 linearRGB) {
    bvec3 cutoff = lessThan(linearRGB, vec3(0.0031308));
    vec3 higher = vec3(1.055)*pow(linearRGB, vec3(1.0/2.4)) - vec3(0.055);
    vec3 lower = linearRGB * vec3(12.92);
    return mix(higher, lower, cutoff);
}

vec3 sRGB2Linear(vec3 sRGB) {
    bvec3 cutoff = lessThan(sRGB, vec3(0.04045));
    vec3 higher = pow((sRGB + vec3(0.055))/vec3(1.055), vec3(2.4));
    vec3 lower = sRGB/vec3(12.92);
    return mix(higher, lower, cutoff);
}

float ward(in vec3 V, in vec3 L, in vec3 N, in vec3 X, in vec3 Y, in float alpha) {

	vec3 H = normalize(V + L);

	float H_dot_N = dot(H, N);
	float sqr_alpha_H_dot_N = SQR(alpha * H_dot_N);

	if(sqr_alpha_H_dot_N < 0.00001) return 0.0;

	float L_dot_N_mult_N_dot_V = dot(L,N) * dot(N,V);
	if(L_dot_N_mult_N_dot_V <= 0.0) return 0.0;

	float spec = 1.0 / (4.0 * PI * alpha * alpha * sqrt(L_dot_N_mult_N_dot_V));
	
	//float exponent = -(SQR(dot(H,X)) + SQR(dot(H,Y))) / sqr_alpha_H_dot_N; // Anisotropic
	float exponent = -SQR(tan(acos(H_dot_N))) / SQR(alpha); // Isotropic
	
	spec *= exp( exponent );

	return spec;
}


void main() {
	vec3 N = getNormal(v_texcoord);
	if(N == NULL_NORMAL) {
		color = vec4(0.0);
		return;
	}

	vec3 L = (uLightInfo.w == 0.0) ? normalize(uLightInfo.xyz) : normalize(uLightInfo.xyz - gl_FragCoord.xyz);
	vec3 V = vec3(0.0,0.0,1.0);
    vec3 H = normalize(L + V);
	float NdotL = max(dot(N,L),0.0);

	vec3 kd = texture(uTexKd, v_texcoord).xyz;
	vec3 ks = texture(uTexKs, v_texcoord).xyz;
	if(uInputColorSpaceKd == 1) {
		kd = sRGB2Linear(kd);
	}
	if(uInputColorSpaceKs == 1) {
		ks = sRGB2Linear(ks);
	}
	kd /= PI;

	float gloss = texture(uTexGloss, v_texcoord).x;
	float minGloss = 1.0 - pow(uAlphaLimits[1], 1.0 / ISO_WARD_EXPONENT);
	float maxGloss = 1.0 - pow(uAlphaLimits[0], 1.0 / ISO_WARD_EXPONENT);

	float alpha = pow(1.0 - gloss * (maxGloss - minGloss) - minGloss, ISO_WARD_EXPONENT);
	
	
	vec3 e = vec3(0.0,0.0,1.0);
	vec3 T = normalize(cross(N,e));
	vec3 B = normalize(cross(N,T));
	float spec = ward(V, L, N, T, B, alpha);
	
	bool applyGamma = true;

	${this.innerCode}
	
	vec3 finalColor = applyGamma ? pow(linearColor * 1.0, vec3(1.0/2.2)) : linearColor;
	color = vec4(finalColor, 1.0);
	${gl2?'':'gl_FragColor = color;'}
}
`;
    	return str;
    	}

    }

    /**
     * Extends {@link Layer}.
     * @param {options} options Same as {@link Layer}, but channels(ks,kd,normals,gloss) are required.
     */

    class BRDFLayer extends Layer {
    	constructor(options) {
    		super(options);

    		if(Object.keys(this.rasters).length != 0)
    			throw "Rasters options should be empty!";

    		if(!this.channels)
    			throw "channels option is required";
    	
    		if(!this.colorspaces) {
    			console.log("LayerBRDF: missing colorspaces: force both to linear");
    			this.colorspaces['kd'] = 'linear';
    			this.colorspaces['ks'] = 'linear';
    		}

    		if(!this.layout)
    			this.layout = new Layout('image');

    		this.rasters.push(new Raster({ url: this.channels['kd'],      type: 'vec3',  attribute: 'kd',      colorspace: this.colorspaces['kd'] }));
    		this.rasters.push(new Raster({ url: this.channels['ks'],      type: 'vec3',  attribute: 'ks',      colorspace: this.colorspaces['ks'] }));
    		this.rasters.push(new Raster({ url: this.channels['normals'], type: 'vec3',  attribute: 'normals', colorspace: 'linear' }));
    		this.rasters.push(new Raster({ url: this.channels['gloss'],   type: 'float', attribute: 'gloss',   colorspace: 'linear' }));

    		let size = {width:this.width, height:this.height};

    		for(let raster of this.rasters)
    			raster.layout = new Layout(raster.url, this.layout, size);

    		this.setLayout(this.rasters[0].layout); 
    		
    		let now = performance.now();
    		this.controls['light'] = { source:{ value: [0, 0], t: now }, target:{ value:[0, 0], t:now }, current:{ value:[0, 0], t:now } };

    		let shader = new ShaderBRDF({'label': 'Rgb', 
    									 'samplers': [ { id:0, name: 'uTexKd'}, 
    												   { id:1, name: 'uTexKs'},
    												   { id:2, name: 'uTexNormals'},
    												   { id:3, name: 'uTexGloss'}],
    									 'colorspaces': this.colorspaces});

    		this.shaders['brdf'] = shader;
    		this.setShader('brdf');
    	}

    	setLight(light, dt) {
    		this.setControl('light', light, dt);
    	}

    	interpolateControls() {
    		let done = super.interpolateControls();
    		if(!done) {
    			let light = this.controls['light'].current.value;
    			let z = Math.sqrt(1 - light[0]*light[0] - light[1]*light[1]);
    			this.shader.setLight([light[0], light[1], z, 0]);
    		}
    		return done;
    	}
    }


    Layer.prototype.types['brdf'] = (options) => { return new BRDFLayer(options); };

    /**
     * Display a simple image. Extends {@link Layer}.
     * @param {options} options Same as {@link Layer}, but url and layout are required.
     */

    class ImageLayer extends Layer {
    	constructor(options) {
    		super(options);

    		if(Object.keys(this.rasters).length != 0)
    			throw "Rasters options should be empty!";

    		if(!this.url)
    			throw "Url option is required";

    		if(!this.layout)
    			this.layout = 'image';

    		

    		let size = {width:this.width || 0, height:this.height || 0 };
    		this.setLayout(new Layout(this.url, this.layout, size));
    		let raster = new Raster({ url: this.url, type: 'vec3', attribute: 'kd', colorspace: 'sRGB' });
    		raster.layout = this.layout;

    		this.rasters.push(raster);
    		

    		let shader = new Shader({
    			'label': 'Rgb',
    			'samplers': [{ id:0, name:'kd', type:'vec3' }]
    		});
    		
    		shader.fragShaderSrc = function(gl) {

    			let gl2 = gl instanceof WebGL2RenderingContext;
    			let str = `${gl2? '#version 300 es' : ''}

precision highp float;
precision highp int;

uniform sampler2D kd;

${gl2? 'in' : 'varying'} vec2 v_texcoord;
${gl2? 'out' : ''} vec4 color;


void main() {
	color = texture(kd, v_texcoord);
	${gl2? '':'gl_FragColor = color;'}
}
`;
    			return str;

    		};

    		this.shaders = {'standard': shader };
    		this.setShader('standard');
    	}
    }

    Layer.prototype.types['image'] = (options) => { return new ImageLayer(options); };

    /**
     * Virtual nase class for controllers: classes that handle mouse and touch events and links to pan, zoom, etc.
     * Callbacks supporte are:
     * * *panStart(event)* calling event.preventDefault() will capture the panning gestire
     * * *panMove(event)*
     * * *panEnd(event)*
     * * *pinchStart(event)* calling event.preventDefault() will capture the pinch gestire
     * * *pinchMove(event)*
     * * *pinchEnd(event)*
     * * *wheelDelta(event)*
     * * *singleTap(event)*
     * * *wheelDelta(event)*
     * * *doubleTap(event)*
     * * *resize(event)*
     * 
     * In general event.preventDefault() will capture the event and wont be propagated to other controllers.

     * 
     * @param {options} options 
     * * *panDelay* inertia of the movement in ms for panning movements (default 100)
     * * *zoomDelay* a zoom event is smoothed over this delay in ms (default 200)
     * * *priority* higher priority controllers are invoked in advance.
     */

    class Controller {
    	constructor(options) {
    		Object.assign(this, {
    			active: true,
    			debug: false,
    			panDelay: 50,
    			zoomDelay: 200,
    			priority: 0
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

    }

    /*
     * Controller that turn the position of the mouse on the screen to a [0,1]x[0,1] parameter
     * @param {Function} callback 
     */

    class Controller2D extends Controller {

    	constructor(callback, options) {
    		super(options);

    		this.callback = callback;
    		if(!this.box) {
    			this.box = new BoundingBox({xLow:-0.99, yLow: -0.99, xHigh: 0.99, yHigh: 0.99});
    		}

    		this.panning = false;
    	}

    	update(e) {
    		let rect = e.target.getBoundingClientRect();
    		let x = Math.max(0, Math.min(1, e.offsetX/rect.width));
    		let y = Math.max(0, Math.min(1, 1 - e.offsetY/rect.height));
    		x = this.box.xLow + x*this.box.width();
    		y = this.box.yLow + y*this.box.height();
    		this.callback(x, y);
    	}

    	panStart(e) {
    		if(!this.active)
    			return;
    		this.update(e);
    		this.panning = true;
    		e.preventDefault();
    	}

    	panMove(e) {
    		if(!this.panning)
    			return false;
    		this.update(e);
    	}

    	panEnd(e) {
    		if(!this.panning)
    			return false;
    		this.panning = false;		
    	}

    	fingerSingleTap(e) {
    		this.update(e);
    		e.preventDefault();
    	}

    }

    class ControllerPanZoom extends Controller {

    	constructor(camera, options) {
    		super(options);

    		this.camera = camera;
    		this.zoomAmount = 1.2;          //for wheel or double tap event
    		
    		
    		this.panning = false;           //true if in the middle of a pan
    		this.initialTransform = null;
    		this.startMouse = null;

    		this.zooming = false;           //true if in the middle of a pinch
    		this.initialDistance = 0.0;
    	}

    	panStart(e) {
    		if(!this.active || this.panning)
    			return;
    		this.panning = true;

    		this.startMouse = { x: e.offsetX, y: e.offsetY };

    		let now = performance.now();
    		this.initialTransform = this.camera.getCurrentTransform(now);
    		this.camera.target = this.initialTransform.copy(); //stop animation.
    		e.preventDefault();
    	}

    	panMove(e) {
    		if (!this.panning)
    			return;

    		let m = this.initialTransform;
    		let dx = (e.offsetX - this.startMouse.x);
    		let dy = (e.offsetY - this.startMouse.y);
    		
    		this.camera.setPosition(this.panDelay, m.x + dx, m.y + dy, m.z, m.a);
    	}

    	panEnd(e) {
    		this.panning = false;
    	}

    	distance(e1, e2) {
    		return Math.sqrt(Math.pow(e1.x - e2.x, 2) + Math.pow(e1.y - e2.y, 2));
    	}

    	pinchStart(e1, e2) {
    		this.zooming = true;
    		this.initialDistance = this.distance(e1, e2);
    		e1.preventDefault();
    		//e2.preventDefault(); //TODO this is optional?
    	}

    	pinchMove(e1, e2) {
    		if (!this.zooming)
    			return;
    		const scale = this.distance(e1, e2);
    		const pos = this.camera.mapToScene((e1.offsetX + e2.offsetX)/2, (e1.offsetY + e2.offsetY)/2, this.camera.getCurrentTransform(performance.now()));
    		const dz = scale/this.initialDistance;
    		this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
    		this.initialDistance = scale;
    	}

    	pinchEnd(e, x, y, scale) {
    		this.zooming = false;
    	}

    	mouseWheel(e) {
    		let delta = e.deltaY > 0 ? 1 : -1;
    		const pos = this.camera.mapToScene(e.offsetX, e.offsetY, this.camera.getCurrentTransform(performance.now()));
    		const dz = Math.pow(this.zoomAmount, delta);		
    		this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
    		e.preventDefault();
    	}

    	fingerDoubleTap(e) {
    		const pos = this.camera.mapToScene(e.offsetX, e.offsetY, this.camera.getCurrentTransform(performance.now()));
    		const dz = this.zoomAmount;
    		this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
    	}

    }

    /**
     * Manages handles simultaneous events from a target. 
     * how do I write more substantial documentation.
     *
     * @param {div} target is the DOM element from which the events are generated
     * @param {object} options is a JSON describing the options
     *  * **diagonal**: default *27*, the screen diagonal in inch
     */
    class PointerManager {
        constructor(target, options) {

            this.target = target;

            Object.assign(this, {
                diagonal: 27,                // Standard monitor 27"
                pinchMaxInterval: 200        // in ms, fingerDown event max distance in time to trigger a pinch.
            });

            if (options)
                Object.assign(this, options);

            this.currentPointers = [];
            this.eventObservers = new Map();
            this.ppmm = PointerManager.getPPMM(this.diagonal);

            this.target.style.touchAction = "none";
            this.target.addEventListener('pointerdown', (e) => this.handleEvent(e), false);
            this.target.addEventListener('pointermove', (e) => this.handleEvent(e), false);
            this.target.addEventListener('pointerup', (e) => this.handleEvent(e), false);
            this.target.addEventListener('pointercancel', (e) => this.handleEvent(e), false);
            this.target.addEventListener('wheel', (e) => this.handleEvent(e), false);
        }

        ///////////////////////////////////////////////////////////
        /// Constants
        static get ANYPOINTER() { return -1; }

        ///////////////////////////////////////////////////////////
        /// Utilities

        static splitStr(str) {
            return str.trim().split(/\s+/g);
        }

        static getPPMM(diagonal) {
            // sqrt(w^2 + h^2) / diagonal / 1in
            return Math.round(Math.sqrt(screen.width **2  + screen.height **2) / diagonal / 25.4);
        }

        ///////////////////////////////////////////////////////////
        /// Class interface

        // register pointer handlers.
        on(eventTypes, obj, idx = PointerManager.ANYPOINTER) {
            eventTypes = PointerManager.splitStr(eventTypes);

            if (typeof (obj) == 'function') {
                obj = Object.fromEntries(eventTypes.map(e => [e, obj]));
                obj.priority = -1000;
            }

            eventTypes.forEach(eventType => {
                if (idx == PointerManager.ANYPOINTER) {
                    this.broadcastOn(eventType, obj);
                } else {
                    const p = this.currentPointers[idx];
                    if (!p) {
                        throw new Error("Bad Index");
                    }
                    p.on(eventType, obj);
                }
            });
            return obj;
        }

        // unregister pointer handlers
        off(eventTypes, callback, idx = PointerManager.ANYPOINTER) {
            if (idx == PointerManager.ANYPOINTER) {
                this.broadcastOff(eventTypes, callback);
            } else {
                PointerManager.splitStr(eventTypes).forEach(eventType => {
                    const p = this.currentPointers[idx];
                    if (!p) {
                        throw new Error("Bad Index");
                    }
                    p.off(eventType, callback);
                });
            }
        }

        onEvent(handler) {
            const cb_properties = ['fingerHover', 'fingerSingleTap', 'fingerDoubleTap', 'fingerHold', 'mouseWheel'];
            if (!handler.hasOwnProperty('priority'))
                throw new Error("Event handler has not priority property");

            if (!cb_properties.some((e) => typeof (handler[e]) == 'function'))
                throw new Error("Event handler properties are wrong or missing");

            for (let e of cb_properties)
                if (typeof (handler[e]) == 'function') {
                    this.on(e, handler);
                }
            if(handler.panStart)
                this.onPan(handler);
            if(handler.pinchStart)
                this.onPinch(handler);
        }

        onPan(handler) {
            const cb_properties = ['panStart', 'panMove', 'panEnd'];
            if (!handler.hasOwnProperty('priority'))
                throw new Error("Event handler has not priority property");

            if (!cb_properties.every((e) => typeof (handler[e]) == 'function'))
                throw new Error("Pan handler is missing one of this functions: panStart, panMove or panEnd");

            handler.fingerMovingStart = (e) => {
                handler.panStart(e);
                if (!e.defaultPrevented) return;
                 this.on('fingerMoving', (e1) => {
                    handler.panMove(e1);
                }, e.idx);
                this.on('fingerMovingEnd', (e2) => {
                    handler.panEnd(e2);
                }, e.idx);
            };
            this.on('fingerMovingStart', handler);
        }

        onPinch(handler) {
            const cb_properties = ['pinchStart', 'pinchMove', 'pinchEnd'];
            if (!handler.hasOwnProperty('priority'))
                throw new Error("Event handler has not priority property");

            if (!cb_properties.every((e) => typeof (handler[e]) == 'function'))
                throw new Error("Pinch handler is missing one of this functions: pinchStart, pinchMove or pinchEnd");

            handler.fingerDown = (e1) => {
                //find other pointers not in moving status
                const filtered = this.currentPointers.filter(cp => cp && cp.idx != e1.idx && cp.status == cp.stateEnum.DETECT);
                if (filtered.length == 0) return;

                //for each pointer search for the last fingerDown event.
                const fingerDownEvents = [];
                for (let cp of filtered) {
                    let down = null;
                    for (let e of cp.eventHistory.toArray())
                        if (e.fingerType == 'fingerDown')
                            down = e;
                    if (down)
                        fingerDownEvents.push(down);
                }
                //we start from the closest one
                //TODO maybe we should sort by distance instead.
                fingerDownEvents.sort((a, b) => b.timeStamp - a.timeStamp);
                for (let e2 of fingerDownEvents) {
                    if (e1.timeStamp - e2.timeStamp > this.pinchInterval) break; 

                    handler.pinchStart(e1, e2);
                    if (!e1.defaultPrevented) break;

                    clearTimeout(this.currentPointers[e1.idx].timeout);
                    clearTimeout(this.currentPointers[e2.idx].timeout);

                    this.on('fingerMovingStart', (e) => e.preventDefault(), e1.idx); //we need to capture this event (pan conflict)
                    this.on('fingerMovingStart', (e) => e.preventDefault(), e2.idx);
                    this.on('fingerMoving',      (e) => e2 && handler.pinchMove(e1 = e, e2), e1.idx); //we need to assign e1 and e2, to keep last position.
                    this.on('fingerMoving',      (e) => e1 && handler.pinchMove(e1, e2 = e), e2.idx);

                    this.on('fingerMovingEnd', (e) => {
                        if (e2)
                            handler.pinchEnd(e, e2);
                        e1 = e2 = null;
                    }, e1.idx);
                    this.on('fingerMovingEnd', (e) => {
                        if (e1)
                            handler.pinchEnd(e1, e);
                        e1 = e2 = null;
                    }, e2.idx);

                    break;
                }
            };
            this.on('fingerDown', handler);
        }
        ///////////////////////////////////////////////////////////
        /// Implementation stuff

        // register broadcast handlers
        broadcastOn(eventType, obj) {
            const handlers = this.eventObservers.get(eventType);
            if (handlers)
                handlers.push(obj);
            else
                this.eventObservers.set(eventType, [obj]);
        }

        // unregister broadcast handlers
        broadcastOff(eventTypes, obj) {
            PointerManager.splitStr(eventTypes).forEach(eventType => {
                if (this.eventObservers.has(eventType)) {
                    if (!obj) {
                        this.eventObservers.delete(eventType);
                    } else {
                        const handlers = this.eventObservers.get(eventType);
                        const index = handlers.indexOf(obj);
                        if (index > -1) {
                            handlers.splice(index, 1);
                        }
                        if (handlers.length == 0) {
                            this.eventObservers.delete(eventType);
                        }
                    }
                }
            });
        }

        // emit broadcast events
        broadcast(e) {
            if (!this.eventObservers.has(e.fingerType)) return;
            this.eventObservers.get(e.fingerType)
                .sort((a, b) => b.priority - a.priority)
                .every(obj => {
                    obj[e.fingerType](e);
                    return !e.defaultPrevented;
                });  // the first obj returning a defaultPrevented event breaks the every loop
        }

        addCurrPointer(cp) {
            let result = -1;
            for (let i = 0; i < this.currentPointers.length && result < 0; i++) {
                if (this.currentPointers[i] == null) {
                    result = i;
                }
            }
            if (result < 0) {
                this.currentPointers.push(cp);
                result = this.currentPointers.length - 1;
            } else {
                this.currentPointers[result] = cp;
            }

            return result;
        }

        removeCurrPointer(index) {
            this.currentPointers[index] = null;
            while ((this.currentPointers.length > 0) && (this.currentPointers[this.currentPointers.length - 1] == null)) {
                this.currentPointers.pop();
            }
        }

        handleEvent(e) {
            if (e.type == 'pointerdown') this.target.setPointerCapture(e.pointerId);
            if (e.type == 'pointercancel') console.log(e);

            let handled = false;
            for (let i = 0; i < this.currentPointers.length && !handled; i++) {
                const cp = this.currentPointers[i];
                if (cp) {
                    handled = cp.handleEvent(e);
                    if (cp.isDone())
                        this.removeCurrPointer(i);
                }
            }
            if (!handled) {
                const cp = new SinglePointerHandler(this, e.pointerId, { ppmm: this.ppmm });
                handled = cp.handleEvent(e);
            }
            //e.preventDefault();
        }

    }


    class SinglePointerHandler {
        constructor(parent, pointerId, options) {

            this.parent = parent;
            this.pointerId = pointerId;

            Object.assign(this, {
                ppmm: 3, // 27in screen 1920x1080 = 3 ppmm
            });
            if (options)
                Object.assign(this, options);

            this.eventHistory = new CircularBuffer(10);
            this.isActive = false;
            this.startTap = 0;
            this.threshold = 15; // 15mm

            this.eventObservers = new Map();
            this.isDown = false;
            this.done = false;

            this.stateEnum = {
                IDLE: 0,
                DETECT: 1,
                HOVER: 2,
                MOVING_START: 3,
                MOVING: 4,
                MOVING_END: 5,
                HOLD: 6,
                TAPS_DETECT: 7,
                SINGLE_TAP: 8,
                DOUBLE_TAP_DETECT: 9,
                DOUBLE_TAP: 10,
            };
            this.status = this.stateEnum.IDLE;
            this.timeout = null;
            this.holdTimeoutThreshold = 600;
            this.tapTimeoutThreshold = 100;
            this.oldDownPos = { clientX: 0, clientY: 0 };
            this.movingThreshold = 1; // 1mm
            this.idx = this.parent.addCurrPointer(this);
        }

        ///////////////////////////////////////////////////////////
        /// Utilities

        static distance(x0, y0, x1, y1) {
            return Math.sqrt((x1 - x0) ** 2 + (y1 - y0) ** 2);
        }

        distanceMM(x0, y0, x1, y1) {
            return SinglePointerHandler.distance(x0, y0, x1, y1) / this.ppmm;
        }

        ///////////////////////////////////////////////////////////
        /// Class interface

        on(eventType, obj) {
            this.eventObservers.set(eventType, obj);
        }

        off(eventType) {
            if (this.eventObservers.has(eventType)) {
                this.eventObservers.delete(eventType);
            }
        }

        ///////////////////////////////////////////////////////////
        /// Implementation stuff

        addToHistory(e) {
            this.eventHistory.push(e);
        }

        prevPointerEvent() {
            return this.eventHistory.last();
        }

        handlePointerDown(e) {
            this.startTap = e.timeStamp;
        }

        handlePointerUp(e) {
            const tapDuration = e.timeStamp - this.startTap;
        }

        isLikelySamePointer(e) {
            let result = this.pointerId == e.pointerId;
            if (!result && !this.isDown && e.type == "pointerdown") {
                const prevP = this.prevPointerEvent();
                if (prevP) {
                    result = (e.pointerType == prevP.pointerType) && this.distanceMM(e.clientX, e.clientY, prevP.clientX, prevP.clientY) < this.threshold;
                }
            }
            return result;
        }

        // emit+broadcast
        emit(e) {
            if (this.eventObservers.has(e.fingerType)) {
                this.eventObservers.get(e.fingerType)[e.fingerType](e);
                if (e.defaultPrevented) return;
            }
            this.parent.broadcast(e);
        }

        // output Event, speed is computed only on pointermove
        createOutputEvent(e, type) {
            const result = e;
            result.fingerType = type;
            result.originSrc = this.originSrc;
            result.speedX = 0;
            result.speedY = 0;
            result.idx = this.idx;
            const prevP = this.prevPointerEvent();
            if (prevP && (e.type == 'pointermove')) {
                const dt = result.timeStamp - prevP.timeStamp;
                if (dt > 0) {
                    result.speedX = (result.clientX - prevP.clientX) / dt * 1000.0;  // px/s
                    result.speedY = (result.clientY - prevP.clientY) / dt * 1000.0;  // px/s
                }
            }
            return result;
        }

        // Finite State Machine
        processEvent(e) {
            let distance = 0;
            if (e.type == "pointerdown") {
                this.oldDownPos.clientX = e.clientX;
                this.oldDownPos.clientY = e.clientY;
                this.isDown = true;
            }
            if (e.type == "pointerup" || e.type == "pointercancel") this.isDown = false;
            if (e.type == "pointermove" && this.isDown) {
                distance = this.distanceMM(e.clientX, e.clientY, this.oldDownPos.clientX, this.oldDownPos.clientY);
            }

            if (e.type == "wheel") {
                this.emit(this.createOutputEvent(e, 'mouseWheel'));
                return;
            }

            switch (this.status) {
                case this.stateEnum.HOVER:
                case this.stateEnum.IDLE:
                    if (e.type == 'pointermove') {
                        this.emit(this.createOutputEvent(e, 'fingerHover'));
                        this.status = this.stateEnum.HOVER;
                        this.originSrc = e.composedPath()[0];
                    } else if (e.type == 'pointerdown') {
                        this.status = this.stateEnum.DETECT;
                        this.emit(this.createOutputEvent(e, 'fingerDown'));
                        if (e.defaultPrevented) { // An observer captured the fingerDown event
                            this.status = this.stateEnum.MOVING;
                            break;
                        }
                        this.originSrc = e.composedPath()[0];
                        this.timeout = setTimeout(() => {
                            this.emit(this.createOutputEvent(e, 'fingerHold'));
                            if(e.defaultPrevented) this.status = this.stateEnum.IDLE;
                        }, this.holdTimeoutThreshold);
                    }
                    break;
                case this.stateEnum.DETECT:
                    if (e.type == 'pointercancel') { /// For Firefox
                        clearTimeout(this.timeout);
                        this.status = this.stateEnum.IDLE;
                        this.emit(this.createOutputEvent(e, 'fingerHold'));
                    } else if (e.type == 'pointermove' && distance > this.movingThreshold) {
                        clearTimeout(this.timeout);
                        this.status = this.stateEnum.MOVING;
                        this.emit(this.createOutputEvent(e, 'fingerMovingStart'));
                    } else if (e.type == 'pointerup') {
                        clearTimeout(this.timeout);
                        this.status = this.stateEnum.TAPS_DETECT;
                        this.timeout = setTimeout(() => {
                            this.status = this.stateEnum.IDLE;
                            this.emit(this.createOutputEvent(e, 'fingerSingleTap'));
                        }, this.tapTimeoutThreshold);
                    }
                    break;
                case this.stateEnum.TAPS_DETECT:
                    if (e.type == 'pointerdown') {
                        clearTimeout(this.timeout);
                        this.status = this.stateEnum.DOUBLE_TAP_DETECT;
                        this.timeout = setTimeout(() => {
                            this.emit(this.createOutputEvent(e, 'fingerHold'));
                            if(e.defaultPrevented) this.status = this.stateEnum.IDLE;
                        }, this.tapTimeoutThreshold);
                    } else if (e.type == 'pointermove' && distance > this.movingThreshold) {
                        clearTimeout(this.timeout);
                        this.status = this.stateEnum.IDLE;
                        this.emit(this.createOutputEvent(e, 'fingerHover'));
                    }
                    break;
                case this.stateEnum.DOUBLE_TAP_DETECT:
                    if (e.type == 'pointerup' || e.type == 'pointercancel') {
                        clearTimeout(this.timeout);
                        this.status = this.stateEnum.IDLE;
                        this.emit(this.createOutputEvent(e, 'fingerDoubleTap'));
                    }
                    break;
                case this.stateEnum.DOUBLE_TAP_DETECT:
                    if (e.type == 'pointermove' && distance > this.movingThreshold) {
                        this.status = this.stateEnum.MOVING;
                        this.emit(this.createOutputEvent(e, 'fingerMovingStart'));
                    }
                    break;
                case this.stateEnum.MOVING:
                    if (e.type == 'pointermove') {
                        // Remain MOVING
                        this.emit(this.createOutputEvent(e, 'fingerMoving'));
                    } else if (e.type == 'pointerup' || e.type == 'pointercancel') {
                        this.status = this.stateEnum.IDLE;
                        this.emit(this.createOutputEvent(e, 'fingerMovingEnd'));
                    }
                    break;
                default:
                    console.log("ERROR " + this.status);
                    console.log(e);
                    break;
            }

            this.addToHistory(e);
        }

        handleEvent(e) {
            let result = false;
            if (this.isLikelySamePointer(e)) {
                this.pointerId = e.pointerId; //it's mine
                this.processEvent(e);
                result = true;
            }
            return result;
        }

        isDone() {
            return this.status == this.stateEnum.IDLE;
        }

    }


    class CircularBuffer {
        constructor(capacity) {
            if (typeof capacity != "number" || !Number.isInteger(capacity) || capacity < 1)
                throw new TypeError("Invalid capacity");
            this.buffer = new Array(capacity);
            this.capacity = capacity;
            this.first = 0;
            this.size = 0;
        }

        clear() {
            this.first = 0;
            this.size = 0;
        }

        empty() {
            return this.size == 0;
        }

        size() {
            return this.size;
        }

        capacity() {
            return this.capacity;
        }

        first() {
            let result = null;
            if (this.size > 0) result = this.buffer[this.first];
            return result;
        }

        last() {
            let result = null;
            if (this.size > 0) result = this.buffer[(this.first + this.size - 1) % this.capacity];
            return result;
        }

        enqueue(v) {
            this.first = (this.first > 0) ? this.first - 1 : this.first = this.capacity - 1;
            this.buffer[this.first] = v;
            if (this.size < this.capacity) this.size++;
        }

        push(v) {
            if (this.size == this.capacity) {
                this.buffer[this.first] = v;
                this.first = (this.first + 1) % this.capacity;
            } else {
                this.buffer[(this.first + this.size) % this.capacity] = v;
                this.size++;
            }
        }

        dequeue() {
            if (this.size == 0) throw new RangeError("Dequeue on empty buffer");
            const v = this.buffer[(this.first + this.size - 1) % this.capacity];
            this.size--;
            return v;
        }

        pop() {
            return this.dequeue();
        }

        shift() {
            if (this.size == 0) throw new RangeError("Shift on empty buffer");
            const v = this.buffer[this.first];
            if (this.first == this.capacity - 1) this.first = 0; else this.first++;
            this.size--;
            return v;
        }

        get(start, end) {
            if (this.size == 0 && start == 0 && (end == undefined || end == 0)) return [];
            if (typeof start != "number" || !Number.isInteger(start) || start < 0) throw new TypeError("Invalid start value");
            if (start >= this.size) throw new RangeError("Start index past end of buffer: " + start);

            if (end == undefined) return this.buffer[(this.first + start) % this.capacity];

            if (typeof end != "number" || !Number.isInteger(end) || end < 0) throw new TypeError("Invalid end value");
            if (end >= this.size) throw new RangeError("End index past end of buffer: " + end);

            if (this.first + start >= this.capacity) {
                start -= this.capacity;
                end -= this.capacity;
            }
            if (this.first + end < this.capacity)
                return this.buffer.slice(this.first + start, this.first + end + 1);
            else
                return this.buffer.slice(this.first + start, this.capacity).concat(this.buffer.slice(0, this.first + end + 1 - this.capacity));
        }

        toArray() {
            if (this.size == 0) return [];
            return this.get(0, this.size - 1);
        }

    }

    /** coordinates for annotations are relative to the top left corner!!!!
     */

    class Annotation {
    	constructor(options) {
    		Object.assign(
    			this, 
    			{
    				id: Annotation.UUID(),
    				code: null,
    				description: null,
    				class: null,
    				target: null,
    				selector: { type: null, value: null, elements: [] }, //svg element (could be a group... a circle a path.)
    				data: {},
    				style: null,
    				bbox: null,

    				ready: false, //already: convertted to svg
    				needsUpdate: true,
    				editing: false,
    			}, 
    			options);
    	}

    	static UUID() {
    		return 'axxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    			return v.toString(16);
    		});
    	}

    	getBBoxFromElements() {
    		let box = { x: 0, y: 0, width: 0, height: 0 };
    		if(!this.selector.elements.length)
    			return box;
    		let { x, y, width, height } = this.selector.elements[0].getBBox();
    		for(let shape of this.selector.elements) {
    				const { sx, sy, swidth, sheight } = shape.getBBox();
    				x = Math.min(x, sx);
    				y = Math.min(x, sy);
    				width = Math.max(width + x, sx + swidth) - x; 
    				height = Math.max(height + y, sy + sheight) - y; 
    		}
    		return { x, y, width, height };
    	}

    	static fromJsonLd(entry) {
    		if(entry.type != 'Annotation')
    			throw "Not a jsonld annotation.";
    		let options = {id: entry.id};

    		let rename = { 'identifying': 'code', 'describing': 'description', 'classifying':'class' };
    		for(let item of entry.body) {
    			let field = rename[item.purpose];
    			if(field)
    				options[field] = item.value;
    		}
    		let selector = entry.target && entry.target.selector;
    		if(selector) {
    			switch(selector.type) {
    			case 'SvgSelector':
    				options.selector = { type: 'svg', value: selector.value, elements:[] };
    				break;
    			default:
    				throw "Unsupported selector: " + selector.type;
    			}
    		}
    		return new Annotation(options);
    	}
    	toJsonLd() {
    		let body = [];
    		if(this.code !== null)
    			body.push( { type: 'TextualBody', value: this.code, purpose: 'indentifying' });
    		if(this.class !== null)
    			body.push( { type: 'TextualBody', value: this.class, purpose: 'classifying' });
    		if(this.description !== null)
    			body.push( { type: 'TextualBody', value: this.description, purpose: 'describing' });

    		let obj = {
    			"@context": "http://www.w3.org/ns/anno.jsonld",
    			id: this.id,
    			type: "Annotation",
    			body: body,
    			target: { selector: {} }
    		};
    		if(this.target)
    			target.selector.source = this.target;


    		if(this.element) {
    			var s = new XMLSerializer();
    			obj.target.selector.type = 'SvgSelector';
    			obj.target.selector.value = s.serializeToString(this.element);
    		}
    	}
    }

    /**
     * SVG or OpenGL polygons/lines/points annotation layer
     * @param {object} options
     * * *svgURL*: url for the svg containing the annotations
     * * *svgXML*: svg string containing the annotatiosn
     * * *geometry*: TODO: should contain the areas/lines/points for OpenGL rendering
     * * *style*: css style for the annotation elements (shadow dom allows css to apply only to this layer)
     * * *annotations*: collection of annotations info: each annotations is id: { label, svg (optional), data (custom data) (TODO)
     */


    class AnnotationLayer extends Layer {
    	constructor(options) {
    		options = Object.assign({
    			viewBox: null,
    			svgURL: null,
    			svgXML: null, 
    			geometry: null,
    			style: null,
    			annotations: {},
    			overlayElement: null,
    			shadow: true,
    			hoverable: false, //display info about annotation on mousehover.
    			selected: new Set,
    			annotationsListEntry: null,

    			svgElement: null, //the svg layer
    			svgGroup: null,
    		}, options);
    		super(options);

    		this.signals = {...this.signals, ...{ 'createAnnotation':[], 'updateAnnotation':[], 'deleteAnnotation':[] } };


    		if(typeof(this.viewBox) == "string") {
    			this.viewBox = this.viewBox.split(' '); 
    		}
    		if (Array.isArray(this.viewBox)) {
    			let box = new BoundingBox(); 
    			box.fromArray(this.viewBox);
    			this.viewBox = box;
    		}


    		(async () => {
    			if(typeof(this.annotations) == "string") { //assume it is an URL
    				await this.loadAnnotations(this.annotations);
    			}
    			if(this.svgURL)
    				await this.loadSVG(this.svgURL);
    			
    			this.createSVGElement();

    			this.status = 'ready';
    			this.emit('update');

    		})();/*.catch(e => { 
    			console.log(e); 
    			this.status = e; 
    		});*/
    	}
    	async loadAnnotations(url) {
    		var response = await fetch(url);
    		if(!response.ok) {
    			this.status = "Failed loading " + this.url + ": " + response.statusText;
    			return;
    		}
    		this.annotations = await response.json();
    		this.annotations = this.annotations.map(a => {
    			if('@context' in a) 
    				return Annotation.fromJsonLd(a);
    			return a;
    		});
    		if(this.annotationsListEntry)
    			this.createAnnotationsList();
    	}

    	newAnnotation() {
    		let svg = createElement('svg');
    		let annotation = new Annotation({ element: svg, selector_type: 'SvgSelector'});
    		this.addAnnotation(annotation, true);
    		return annotation;
    	}

    	annotationsEntry() {
    		return this.annotationsListEntry =  {
    			html: this.editable? '<a href="#" class="openlime-entry">New annotation...</a>': '',
    			list: [], //will be filled later.
    			classes: 'openlime-annotations',
    			status: () => 'active',
    			onclick: this.editable? () => { this.newAnnotation(); } : null,
    			oncreate: () => { 
    				if(Array.isArray(this.annotations))
    					this.createAnnotationsList();
    			}
    		}
    	}



    	addAnnotation(annotation, selected = true) {
    		this.annotations.push(annotation);
    		let html = this.createAnnotationEntry(annotation);
    		let template = document.createElement('template');
    		template.innerHTML = html.trim();
    		
    		let list =  this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
    		list.appendChild(template.content.firstChild);
    		this.emit('createAnnotation', annotation);
    		this.clearSelected();
    		this.setSelected(annotation.id);
    	}

    	
    	createAnnotationEntry(a) {
    		let title = a.title? a.title : (a.class? a.class : '');
    		return `<a href="#" data-annotation="${a.id}" class="openlime-entry">${a.code || a.code} ${title}</a>`;
    	}
    	createAnnotationEdit(a) {
    		//should just fill the template with some stuff<<
    	}

    	createAnnotationsList() {
    		let html ='';
    		for(let a of this.annotations) {
    			html += this.createAnnotationEntry(a);
    		}
    		let list =  this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
    		list.addEventListener('click', (e) =>  { 
    			let id = e.srcElement.getAttribute('data-annotation');
    			this.clearSelected();

    			if(id) {
    				let anno = this.getAnnotationById(id);
    				if(anno.editing)  {
    					e.srcElement.classList.toggle('selected', on);
    				} else
    					this.setSelected(id);
    			}
    		});
    		list.innerHTML = html;
    	}

    	getAnnotationById(id) {
    		for(const anno of this.annotations)
    			if(anno.id == id)
    				return anno;
    		return null;
    	}

    	async loadSVG(url) {
    		var response = await fetch(url);
    		if(!response.ok) {
    			this.status = "Failed loading " + this.url + ": " + response.statusText;
    			return;
    		}
    		let text = await response.text();
    		let parser = new DOMParser();
    		this.svgXML = parser.parseFromString(text, "image/svg+xml").documentElement;
    		throw "if viewbox is set in svgURL should it overwrite options.viewbox or viceversa?"
    	}

    	createSVGElement() {
    		this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    		this.svgElement.classList.add('openlime-svgoverlay');
    		this.svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    		this.svgElement.append(this.svgGroup);
    		this.svgElement.setAttribute('viewBox', this.viewBox.toString()); // box is currently a string of numbers

    		let root = this.overlayElement;
    		if(this.shadow)
    			root = this.overlayElement.attachShadow( { mode: "open" });

    		if(this.style) {
    			const style = document.createElement('style');
    			style.textContent = this.style;
    			root.append(style);
    		}
    		root.appendChild(this.svgElement);


    		//this.svgElement.addEventListener('click', (e) => { console.log('a', e); }, true);
    	}

    	boundingBox() {
    		return this.viewBox;
    	}

    	setVisible(visible) {
    		if(this.svgElement) {
    			this.svgElement.style.display = visible? 'block' : 'none';
    		}
    		super.setVisible(visible);
    	}
    	clearSelected() {
    		let entry = document.querySelector(`div[data-annotation]`);
    		if(this.edited) {
    			entry.replaceWith(this.edited);
    			this.edited = null;
    		}
    		this.svgGroup.querySelectorAll('[data-layer]').forEach((e) => e.classList.remove('selected'));
    	}
    	//set selected class for annotation
    	setSelected(id, on = true) {
    		let anno = this.getAnnotationById(id);

    		if(on)
    			this.selected.add(id);
    		else
    			this.selected.delete(id);
    			
    		for(let a of this.svgElement.querySelectorAll(`[id=${id}]`))
    			a.classList.toggle('selected', on);

    		if(!this.editable)
    			return;
    		//find corresponding entry
    		let entry = document.querySelector(`[data-annotation="${id}"]`);

    		let html = `
	<div data-annotation="${id}" class="openlime-annotation-edit">
		<span>Code:</span> <input name="code" type="text" value="${anno.code}">
		<span>Class:</span> <input name="class" type="text" value="${anno.class}">
		<span>Description:</span> <input name="description" type="text" value="${anno.description}">
		<button name="save" type="button">Save</button>
		<button name="edit" type="button">Edit</button>
		<button name="delete" type="button">Delete</button>
	</div>`;


    		//this should definitely be a function in some 'utils'.
    		let template = document.createElement('template');
    		template.innerHTML = html.trim();
    		let edit = template.content.firstChild;
    		entry.replaceWith(edit);
    		this.edited = entry;
    		edit.querySelector('button[name="save"]').addEventListener('click', (e) => this.saveAnnotation(edit, anno));
    		edit.querySelector('button[name="edit"]').addEventListener('click', (e) => this.editAnnotation(edit, anno));
    		edit.querySelector('button[name="delete"]').addEventListener('click', (e) => this.deleteAnnotation(edit, anno));
    	}

    	saveAnnotation(edit, anno) {
    		anno.editing = false;
    		anno.code = edit.querySelector('[name=code]').value;
    		anno.class = edit.querySelector('[name=class]').value;
    		anno.description = edit.querySelector('[name=description]').value;
    		
    		anno.bbox = anno.getBBoxFromElements();
    		let serializer = new XMLSerializer();
    		anno.selector.value = `<svg xmlns="http://www.w3.org/2000/svg">
			${anno.selector.elements.map((s) => { s.classList.remove('selected'); return serializer.serializeToString(s) }).join("\n")}  
			</svg>`;
    		this.emit('updateAnnotation', anno);
    	}

    	deleteAnnotation(edit, anno) {
    		//remove svg elements from the canvas
    		for(let e  of this.svgGroup.querySelectorAll('#' + anno.id))
    			e.remove();
    		//remove entry from the list
    		let list =  this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
    		for(let e of list.querySelectorAll(`[data-annotation="${anno.id}"]`))
    			e.remove();
    		this.edited = null;

    		this.annotations = this.annotations.filter(a => a !== anno);
    		this.emit('deleteAnnotation', anno);
    	}

    	editAnnotation(edit, anno) {
    		anno.editing = true;
    		this.editor.setTool(this, anno, 'line');
    	}

    	draw(transform, viewport) {
    		if(!this.svgElement)
    			return;

    		let t =  this.transform.compose(transform);
    		this.svgElement.setAttribute('viewBox', `${-viewport.w/2} ${-viewport.h/2} ${viewport.w} ${viewport.h}`);
    		let c = this.viewBox.center();
    		this.svgGroup.setAttribute("transform", 
    			`translate(${t.x} ${t.y}) rotate(${-t.a} 0 0) scale(${t.z} ${t.z}) translate(${-c[0]} ${-c[1]})`); 
    		return true;
    	}

    	prefetch(transform) {
    		if(!this.visible) return;
    		if(!this.svgElement) return;

    		//find which annotations needs to be added to the ccanvas, some 
    		//indexing whould be used, for the moment we just iterate all of them.

    		for(let a of this.annotations) {

    			//TODO check for class visibility and bbox culling (or maybe should go to prefetch?)
    			if(!a.ready && typeof a.selector.value == 'string') {
    				let parser = new DOMParser();
    				let element = parser.parseFromString(a.selector.value, "image/svg+xml").documentElement;
    				for(let c of element.children)
    					a.selector.elements.push(c);
    				a.ready = true;

    /*				} else if(this.svgXML) {
    					a.svgElement = this.svgXML.querySelector(`#${a.id}`);
    					if(!a.svgElement)
    						throw Error(`Could not find element with id: ${id} in svg`);
    				} */
    			}

    			if(!a.needsUpdate)
    				continue;

    			for(let e of this.svgGroup.querySelectorAll(`[id="${a.id}"]`))
    				e.remove();
    			//second time will be 0 elements, but we need to 
    			//store somewhere knowledge of which items in the scene and which still not.
    			for(let child of a.selector.elements) {
    				let c = child; //.cloneNode(true);
    				c.setAttribute('id', a.id);
    				c.setAttribute('data-layer', this.id);
    				c.classList.add('openlime-annotation');
    				if(this.selected.has(a.id))
    					c.classList.add('selected');
    				this.svgGroup.appendChild(c);

    					
    				//utils

    /*				let parser = new DOMParser();
    				let use = createElement('use', { 'xlink:href': '#' + a.id,  'stroke-width': 10,  'pointer-events': 'stroke' });
    				//let use = parser.parseFromString(`<use xlink:href="${a.id}" stroke-width="10" pointer-events="stroke"/>`, "image/svg+xml");
    				this.svgGroup.appendChild(use);  */
    			}
    			a.needsUpdate = false;
    		}
    	}
    }

    function createElement(tag, attributes) {
    	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    	if(attributes)
    		for(const [key, value] of Object.entries(attributes))
    			e.setAttribute(key, value);
    	return e;
    } 

    Layer.prototype.types['annotations'] = (options) => { return new AnnotationLayer(options); };

    /* FROM: https://stackoverflow.com/questions/40650306/how-to-draw-a-smooth-continuous-line-with-mouse-using-html-canvas-and-javascript */


    function simplify(points, length) {
    	let length2 = Math.pow(length, 2);

        var simplify1 = function(start, end) { // recursize simplifies points from start to end
            var index, i, xx , yy, dx, dy, ddx, ddy,  t, dist, dist1;
            let p1 = points[start];
            let p2 = points[end];   
            xx = p1.x;
            yy = p1.y;
            ddx = p2.x - xx;
            ddy = p2.y - yy;
            dist1 = ddx * ddx + ddy * ddy;
            let maxDist = length2;
            for (var i = start + 1; i < end; i++) {
                let p = points[i];
                if (ddx !== 0 || ddy !== 0) {
                    t = ((p.x - xx) * ddx + (p.y - yy) * ddy) / dist1;
                    if (t > 1) {
                        dx = p.x - p2.x;
                        dy = p.y - p2.y;
                    } else 
                    if (t > 0) {
                        dx = p.x - (xx + ddx * t);
                        dy = p.y - (yy + ddy * t);
                    } else {
                        dx = p.x - xx;
                        dy = p.y - yy;
                    }
                } else {
                    dx = p.x - xx;
                    dy = p.y - yy;
                }
                dist = dx * dx + dy * dy; 
                if (dist > maxDist) {
                    index = i;
                    maxDist = dist;
                }
            }

            if (maxDist > length2) { 
                if (index - start > 1){
                    simplify1(start, index);
                }
                newLine.push(points[index]);
                if (end - index > 1){
                    simplify1(index, end);
                }
            }
        };    
        var end = points.length - 1;
        var newLine = [points[0]];
        simplify1(0, end);
        newLine.push(points[end]);
        return newLine;
    }



    function smooth(points, cornerThres, match) {
    	cornerThres *= 3.1415/180;
    	let newPoints = []; // array for new points

    	if(points.length <= 2)
    		return points.map((p) => [p.x, p.y]);

    	let nx1, ny1, nx2, ny2, dist1, dist2;

    	function dot(x, y, xx, yy) {  // get do product
    		// dist1,dist2,nx1,nx2,ny1,ny2 are the length and  normals and used outside function
    		// normalise both vectors
    		
    		dist1 = Math.sqrt(x * x + y * y); // get length
    		if (dist1  > 0) {  // normalise
    			nx1 = x / dist1 ;
    			ny1 = y / dist1 ;
    		} else {
    			nx1 = 1;  // need to have something so this will do as good as anything
    			ny1 = 0;
    		}
    		dist2  = Math.sqrt(xx * xx + yy * yy);
    		if (dist2  > 0) {
    			nx2 = xx / dist2;
    			ny2 = yy / dist2;
    		} else {
    			nx2 = 1;
    			ny2 = 0;
    		}
    		return Math.acos(nx1 * nx2 + ny1 * ny2 ); // dot product
    	}

    	let p1 = points[0];
    	let endP = points[points.length-1];
    	let i = 0;  // start from second poitn if line not closed
    	let closed = false;
    	let len = Math.hypot(p1.x- endP.x, p1.y-endP.y);
    	
    	if(len < Math.SQRT2){  // end points are the same. Join them in coordinate space
    		endP =  p1;
    		i = 0;			 // start from first point if line closed
    		p1 = points[points.length-2];
    		closed = true;
    	}	   
    	newPoints.push([points[i].x,points[i].y]);
    	for(; i < points.length-1; i++){
    		let p2 = points[i];
    		let p3 = points[i + 1];
    		let angle = Math.abs(dot(p2.x - p1.x, p2.y - p1.y, p3.x - p2.x, p3.y - p2.y));
    		if(dist1 !== 0){  // dist1 and dist2 come from dot function
    			if( angle < cornerThres){ // bend it if angle between lines is small
    				  if(match){
    					  dist1 = Math.min(dist1,dist2);
    					  dist2 = dist1;
    				  }
    				  // use the two normalized vectors along the lines to create the tangent vector
    				  let x = (nx1 + nx2) / 2;  
    				  let y = (ny1 + ny2) / 2;
    				  len = Math.sqrt(x * x + y * y);  // normalise the tangent
    				  if(len === 0){
    					  newPoints.push([p2.x,p2.y]);								  
    				  } else {
    					  x /= len;
    					  y /= len;
    					  if(newPoints.length > 0){
    						  var np = newPoints[newPoints.length-1];
    						  np.push(p2.x-x*dist1*0.25);
    						  np.push(p2.y-y*dist1*0.25);
    					  }
    					  newPoints.push([  // create the new point with the new bezier control points.
    							p2.x,
    							p2.y,
    							p2.x+x*dist2*0.25,
    							p2.y+y*dist2*0.25
    					  ]);
    				  }
    			} else {
    				newPoints.push([p2.x,p2.y]);			
    			}
    		}
    		p1 = p2;
    	}  
    	if(closed){ // if closed then copy first point to last.
    		p1 = [];
    		for(i = 0; i < newPoints[0].length; i++){
    			p1.push(newPoints[0][i]);
    		}
    		newPoints.push(p1);
    	}else {
    		newPoints.push([points[points.length-1].x,points[points.length-1].y]);	  
    	}
    	return newPoints;	
    }

    function smoothToPath(smoothed) {
    	let p = smoothed[0];
    	let d = [`M${p[0]} ${p[1]}`];

    	
    	let p1;
    	for(let i = 0; i < smoothed.length-1; i++) {
    		p = smoothed[i];
    		p1 = smoothed[i+1];
    		if(p.length == 2)
    			d.push(`l${(p1[0]-p[0]).toFixed(1)} ${(p1[1]-p[1]).toFixed(1)}`);
    		else if(p.length == 4) 
    			d.push(`q${(p[2]-p[0]).toFixed(1)} ${(p[3]-p[1]).toFixed(1)} ${(p1[0]-p[0]).toFixed(1)} ${(p1[1]-p[1]).toFixed(1)}`);
    		else
    			d.push(`c${(p[2]-p[0]).toFixed(1)} ${(p[3]-p[1]).toFixed(1)} ${(p[4]-p[0]).toFixed(1)} ${(p[5]-p[1]).toFixed(1)} ${(p1[0]-p[0]).toFixed(1)} ${(p1[1]-p[1]).toFixed(1)}`);
    	}
    	//if(p.length == 2)
    	//	d.push(`L${p1[0]} ${p1[1]}`);
    	return d.join();
    }

    /**annotation editor interface:
       click a button and we get into a modality:
          new line: when user pan start start drawing a line. on end can eigher get out or remain in this mode until a new button  is pressed (or ex)
    	  new box (same thing)
    	  new polygon: just finget SingleTab. how to finish? either click on first point, hit esc or enter doubleclick.
    	  new point (just fingerSingleTap) (and you can zoom)

    	problems: allow pan and drawing at the same time! especially in the line after line mode: 
    	   middle mouse for panning (two fingers for mobile?)

    	events:
    		modeChanged: when entering some editing mode (point, line etc.)
    		createAnnotation(editor, annotation)
    		deleteAnnotation(editor, annotation)
    		updateAnnotation(editor, annotation)

    		Annotation parameter is a json containing all the data of the annotation (see Annotation.js)
    */
    class AnnotationEditor {
    	constructor(lime, options) {
    		Object.assign(this, {
    			lime: lime,
    			panning: false,
    			tool: null, //doing nothing, could: ['line', 'polygon', 'point', 'box', 'circle']
    			startPoint: null, //starting point for box and  circle
    			currentLine: [],
    			annotation: null,
    			priority: 20000,
    			multiple: false, //if true multiple elements per annotation.
    			signals: {'toolChanged':[], 'createAnnotation':[], 'deleteAnnotation':[], 'updateAnnotation':[]},
    			tools: { 
    				point: { 
    					img: '<svg width=24 height=24><circle cx=12 cy=12 r=3 fill="red" stroke="gray"/></svg>',
    					tooltip: 'New point',
    					tool: Point,
    				},
    				line: {
    					img: `<svg width=24 height=24>
							<path d="m 4.7,4.5 c 0.5,4.8 0.8,8.5 3.1,11 2.4,2.6 4.2,-4.8 6.3,-5 2.7,-0.3 5.1,9.3 5.1,9.3" stroke-width="3" fill="none" stroke="grey"/>
							<path d="m 4.7,4.5 c 0.5,4.8 0.8,8.5 3.1,11 2.4,2.6 4.2,-4.8 6.3,-5 2.7,-0.3 5.1,9.3 5.1,9.3" stroke-width="1" fill="none" stroke="red"/></svg>`,
    					tooltip: 'New line',
    					tool: Line,
    				},
    				box: {
    					img: '<svg width=24 height=24><rect x=5 y=5 width=14 height=14 fill="red" stroke="gray"/></svg>',
    					tooltip: 'New box',
    					tool: Box,
    				},
    				circle: {
    					img: '<svg width=24 height=24><circle cx=12 cy=12 r=7 fill="red" stroke="gray"/></svg>',
    					tooltip: 'New circle',
    					tool: Circle,
    				}
    			}
    		});
    		if(options)
    			Object.assign(this, options);
    		
    		//at the moment is not really possible to unregister the events registered here.
    		this.lime.pointerManager.onEvent(this);
    	}
    	addEvent(event, callback) { this.signals[event].push(callback); }
    	emit(event, ...parameters) { for(let r of this.signals[event]) r(this, ...parameters); }

    /*	newAnnotation() {
    		let svg = createElement('svg');
    		this.annotation = new Annotation({ element: svg, selector_type: 'SvgSelector'});
    	}

    	saveAnnotation() {
    		let { x, y, width, height } = this.annotation.svg.firstChild.getBBox();
    		for(let shape of this.annotation.svg.children) {
    			const { sx, sy, swidth, sheight } = shape.getBBox();
    			x = Math.min(x, sx);
    			y = Math.min(x, sy);
    			width = Math.max(width + x, sx + swidth) - x; 
    			height = Math.max(height + y, sy + sheight) - y; 
    		}
    		this.annotation.bbox = { x, y, width, height };
    		this.annotation.selector_value = '<svg xmlns="http://www.w3.org/2000/svg">';
    		let serializer = new XMLSerializer();
    		for(let shape of this.annotation.svg.children) 
    			this.annotation.selector_value += serializer.serializeToString(this.annotation.shape)
    		//this.annotation.selector_value = '<svg xmlns="http://www.w3.org/2000/svg">' + (new XMLSerializer()).serializeToString(this.annotation.shape) + '</svg>';
    		this.layer.emit('createAnnotation', this.annotation);

    		this.layer.annotations.push(this.annotation);
    		this.annotation = null;
    	} */

    	setTool(layer, annotation, tool) {
    		this.layer = layer; //needsd for bounding box
    		this.annotation = annotation;
    		this.tool = tool;
    		if(tool) {

    			if(!tool in this.tools)
    				throw "Unknown editor tool: " + tool;

    			this.factory = new this.tools[tool].tool;
    		}
    		this.emit('toolChanged');
    	}
    /*
    	menuWidget(layer) {
    		let menu = [];
    		for(const [id, tool] of Object.entries(this.tools))
    			menu.push({
    				button: tool.img,
    				tooltip: tool.tooltip,
    				onclick: () => { this.setTool(layer, id); },
    				status: () => this.tool == id ? 'active': '' ,
    				classes: 'openlime-tool'
    			});

    		let toolbar = {
    			html: '',
    			classes: 'openlime-tools',
    			list: menu,
    			status: () => 'active'
    		};	
    		return toolbar;
    	} */

    	keyUp(e) {
    		if(e.defaultPrevented) return;
    		switch(e.key) {
    		case 'Escape':
    			if(this.tool) {
    				this.setTool(null, null);
    				e.preventDefault();
    			}
    			break;
    		case 'Delete':
    			if(!this.layer.selected.size)
    				return;
    			if(confirm(`Deleting`))
    				return;
    		case 'Backspace':
    			break;	
    		case 'z':
    			if(!e.ctrlKey)
    				break;
    			//undo!
    			break;
    		}
    	}

    	panStart(e) {
    		if(e.buttons != 1)
    			return;
    		if(!['line', 'box', 'circle'].includes(this.tool))
    			return;
    		this.panning = true;
    		e.preventDefault();

    		const pos = this.mapToSvg(e);
    		let shape = this.factory.create(pos);

    		this.annotation.selector.elements.push(shape);
    		this.annotation.needsUpdate = true;
    		
    		this.lime.redraw();
    	}

    	panMove(e) {
    		if(!this.panning)
    			return false;

    		const pos = this.mapToSvg(e);
    		this.factory.adjust(pos);
    	}

    	panEnd(e) {
    		if(!this.panning)
    			return false;
    		this.panning = false;

    		const pos = this.mapToSvg(e);
    		let shape = this.factory.finish(pos);

    		this.annotation.selector.elements.push(shape);
    		this.annotation.needsUpdate = true;

    /*		const { x, y, width, height } = shape.getBBox();
    		this.currentAnnotation.bbox = { x, y, width, height };
    		this.currentAnnotation.selector_value = '<svg xmlns="http://www.w3.org/2000/svg">' + (new XMLSerializer()).serializeToString(this.currentAnnotation.shape) + '</svg>';
    		this.layer.emit('createAnnotation', this.currentAnnotation);*/

    		if(!this.multiple)
    			this.setTool(null, null);
    	}

    	fingerSingleTap(e) {
    		//if(!this.layer) return true;
    		
    //		console.log("Editor:", e, e.composedPath());

    		if(!['point', 'polygon'].includes(this.tool))
    			return;
    		e.preventDefault();

    		const pos = this.mapToSvg(e);
    		let shape = this.factory.create(pos);
    		
    		//const { x, y, width, height } = shape.getBBox();
    //		this.currentAnnotation = new Annotation({element: svg, bbox: {x, y, width, height } });
    //		this.annotation.selector_value = '<svg xmlns="http://www.w3.org/2000/svg">' + (new XMLSerializer()).serializeToString(this.annotation.shape) + '</svg>';
    		
    		this.annotations.elements.push(shape);
    		this.annotation.needsUpdate = true;
    		
    		if(!this.multiple)
    			this.setTool(null, null);
    		this.lime.redraw();
    	}

    	mapToSvg(e) {
    		let camera = this.lime.camera;
    		let transform = camera.getCurrentTransform(performance.now());
    		let pos = camera.mapToScene(e.offsetX, e.offsetY, transform);
    		pos.x += this.layer.boundingBox().width()/2;
    		pos.y += this.layer.boundingBox().height()/2;
    		pos.z = transform.z;
    		return pos;
    	}
    }

    class Point {
    	create(pos) {
    		//const pos = this.mapToSvg(e);
    		let point = createElement$1('circle', { cx: pos.x, cy: pos.y, r: 10, class:'point' });
    		//point.classList.add('selected');
    		return point;
    	}
    }

    class Box {
    	constructor() {
    		this.origin = null;
    		this.box = null;
    	}

    	create(pos) {
    		this.origin = pos;
    		this.box = createElement$1('rect', { x: pos.x, y: pos.y, width: 0, height: 0, class: 'rect' });
    		return this.box;
    	}

    	adjust(pos) {
    		let p = this.origin;

    		this.box.setAttribute('x', Math.min(p.x, pos.x));
    		this.box.setAttribute('width', Math.abs(pos.x - p.x));
    		this.box.setAttribute('y', Math.min(p.y, pos.y));
    		this.box.setAttribute('height', Math.abs(pos.y - p.y));
    	}

    	finish(pos) {
    		return this.box;
    	}
    }

    class Circle {
    	constructor() {
    		this.origin = null;
    		this.circle = null;
    	}
    	create(pos) {
    		this.origin = pos;
    		this.circle = createElement$1('circle', { cx: pos.x, cy: pos.y, r: 0, class: 'circle' });
    		return this.circle;
    	}
    	adjust(pos) {
    		let p = this.origin;
    		let r = Math.hypot(pos.x - p.x, pos.y - p.y);
    		this.circle.setAttribute('r', r);
    	}
    	finish() {
    		return this.circle;
    	}
    }

    class Line {
    	constructor() {
    		this.points = [];
    	}

    	create(pos) {
    		this.points = [pos];
    		this.path = createElement$1('path', { d: `M${pos.x} ${pos.y}`, class: 'line' });
    		return this.path;
    	}

    	adjust(pos) {
    		let gap = this.distanceToLast(this.points, pos);
    		if(gap*pos.z < 2) return;

    		this.points.push(pos);

    		let d = this.path.getAttribute('d');
    		this.path.setAttribute('d', d + `L${pos.x} ${pos.y}`);
    	}

    	finish(pos) {
    		//todo should pick the last one? or the smallest?
    		let tolerance = 2/this.points[0].z;
    		let tmp = simplify(this.points, tolerance);

    		let smoothed = smooth(tmp, 90, true);
    		let d = smoothToPath(smoothed);

    		this.path.setAttribute('d', d);
    		return this.path;
    	}

    	distanceToLast(line, point) {
    		let last = line[line.length-1];
    		let dx = last.x - point.x;
    		let dy = last.y - point.y; 
    		return Math.sqrt(dx*dx + dy*dy);
    	}
    }

    //utils
    function createElement$1(tag, attributes) {
    	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    	if(attributes)
    		for(const [key, value] of Object.entries(attributes))
    			e.setAttribute(key, value);
    	return e;
    }

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
     * 
     * How the menu works:
     * Each entry eg: { title: 'Coin 16' }
     * title: large title
     * section: smaller title
     * html: whatever html
     * button: visually a button, attributes: group, layer, mode
     * slider: callback(percent)
     * list: an array of entries.
     * 
     * Additional attributes:
     * onclick: a function(event) {}
     * group: a group of entries where at most one is active
     * layer: a layer id: will be active if layer is visible
     * mode: a layer visualization mode, active if it's the current mode.
     * layer + mode: if both are specified, both must be current for an active.
     */

    class UIBasic {
    	constructor(lime, options) {
    		//we need to know the size of the scene but the layers are not ready.
    		let camera = lime.camera;
    		Object.assign(this, {
    			lime: lime,
    			camera: lime.camera,
    			skin: 'skin.svg',
    			autoFit: true,
    			//skinCSS: 'skin.css', // TODO: probably not useful
    			actions: {
    				home:       { title: 'Home',       display: true,   key: 'Home', task: (event) => { if(camera.boundingBox) camera.fitCameraBox(250); } },
    				fullscreen: { title: 'Fullscreen', display: true,   key: 'f', task: (event) => { this.toggleFullscreen(); } },
    				layers:     { title: 'Layers',     display: true,   key: 'Escape', task: (event) => { this.toggleLayers(event); } },
    				zoomin:     { title: 'Zoom in',    display: false,  key: '+', task: (event) => { camera.deltaZoom(250, 1.25, 0, 0); } },
    				zoomout:    { title: 'Zoom out',   display: false,  key: '-', task: (event) => { camera.deltaZoom(250, 1/1.25, 0, 0); } },
    				rotate:     { title: 'Rotate',     display: false,  key: 'r', task: (event) => { camera.rotate(250, -45); } },
    				light:      { title: 'Light',      display: 'auto', key: 'l', task: (event) => { this.toggleLightController(); } },
    				ruler:      { title: 'Ruler',      display: false,            task: (event) => { this.startRuler(); } },
    			},
    			viewport: [0, 0, 0, 0], //in scene coordinates
    			scale: null,
    			unit: null,
    			info: new Info(lime.containerElement),
    			editor: new AnnotationEditor(lime),
    		});

    		Object.assign(this, options);
    		if (this.autoFit)
    			this.lime.canvas.addEvent('updateSize', () => this.lime.camera.fitCameraBox(0));

    		this.menu = [];

    		/*let element = entry.element;
    		let group = element.getAttribute('data-group');
    		let layer = element.getAttribute('data-layer');
    		let mode = element.getAttribute('data-mode');
    		let active = (layer && this.lime.canvas.layers[layer].visible) &&
    			(!mode || this.lime.canvas.layers[layer].getMode() == mode);
    		entry.element.classList.toggle('active', active); */

    		this.menu.push({ section: "Layers" });
    		for (let [id, layer] of Object.entries(this.lime.canvas.layers)) {
    			let modes = [];
    			for (let m of layer.getModes()) {
    				let mode = { 
    					button: m, 
    					mode: m, 
    					layer: id, 
    					onclick: () => { layer.setMode(m); this.updateMenu(); },
    					status: () => layer.getMode() == m ? 'active' : '',
    				};
    				if (m == 'specular')
    					mode.list = [{ slider: '', oninput: (e) => { layer.shader.setSpecularExp(e.target.value); } }];
    				modes.push(mode);
    			}
    			let layerEntry = {
    				button: layer.label || id, 
    				onclick: ()=> { this.setLayer(layer); },
    				status: () => layer.visible? 'active' : '',
    				list: modes,
    				layer: id
    			};
    			if(layer.annotations) {
    				layerEntry.list.push(layer.annotationsEntry());
    				if(layer.editable) 
    					layer.editor = this.editor;
    			}
    			this.menu.push(layerEntry);
    		}
    		if (queueMicrotask) queueMicrotask(() => { this.init(); }); //allows modification of actions and layers before init.
    		else setTimeout(() => { this.init(); }, 0);
    	}



    	init() {
    		(async () => {

    			document.addEventListener('keydow', (e) => this.keyDown(e), false);
    			document.addEventListener('keyup', (e) => this.keyUp(e), false);

    			let panzoom = new ControllerPanZoom(this.lime.camera, { priority: -1000 });
    			this.lime.pointerManager.onEvent(panzoom); //register wheel, doubleclick, pan and pinch
    			this.lime.pointerManager.on("fingerSingleTap", {"fingerSingleTap": (e) => { this.showInfo(e);}, priority: 10000 });
    			
    			//this.lime.pointerManager.on("fingerHover", {"fingerHover": (e) => { this.showInfo(e);}, priority: 10000 });

    			this.editor.addEvent('toolChanged', ()=> { this.updateMenu(); });
    			this.createMenu();
    			this.updateMenu();

    			let lightLayers = [];
    			for (let [id, layer] of Object.entries(this.lime.canvas.layers))
    				if (layer.controls.light) lightLayers.push(layer);

    			if (lightLayers.length) {
    				if (this.actions.light && this.actions.light.display === 'auto')
    					this.actions.light.display = true;

    				let controller = new Controller2D((x, y) => {
    					for (let layer of lightLayers)
    						layer.setLight([x, y], 0);
    				}, { active: false, control: 'light' });

    				controller.priority = 0;
    				this.lime.pointerManager.onEvent(controller);
    				for (let layer of lightLayers) {
    					layer.setLight([0.5, 0.5], 0);
    					layer.controllers.push(controller);
    				}

    			}


    			if (this.skin)
    				await this.loadSkin();
    			/* TODO: this is probably not needed
    			if(this.skinCSS)
    				await this.loadSkinCSS();
    			*/

    			this.setupActions();
    			this.setupScale();

    			for (let l of Object.values(this.lime.canvas.layers)) {
    				//this.setLayer(l);
    				break;
    			}

    			if (this.actions.light.active == true)
    				this.toggleLightController();

    		})().catch(e => { console.log(e); throw Error("Something failed") });
    	}

    	keyDown(e) {
    	}

    	keyUp(e) {
    		if(e.target != document.body && e.target.closest('input, textarea') != null)
    		return;

    		this.editor.keyUp(e);
    		if(e.defaultPrevented) return;
    		
    		for(const a of Object.values(this.actions)) {
    			if('key' in a && a.key == e.key) {
    				e.preventDefault();
    				a.task(e);
    				return;
    			}
    		}
    	}

    	showInfo(e) {
    		if(!e.originSrc) {
    			throw "This should never happen!";
    		}

    		let layer = e.originSrc.getAttribute('data-layer');
    		if(!layer)
    			return this.info.hide();
    			
    		layer = this.lime.canvas.layers[layer];

    		if(e.fingerType == 'fingerHover' && !layer.hoverable)
    			return;

    		let id = e.originSrc.getAttribute('id');
    		layer.setSelected(id);

    		//this.info.show(e, layer, id);
    	}

    	
    	async loadSkin() {
    		var response = await fetch(this.skin);
    		if (!response.ok) {
    			throw Error("Failed loading " + url + ": " + response.statusText);
    		}

    		let text = await response.text();
    		let parser = new DOMParser();
    		let skin = parser.parseFromString(text, "image/svg+xml").documentElement;


    		let toolbar = document.createElement('div');
    		toolbar.classList.add('openlime-toolbar');
    		this.lime.containerElement.appendChild(toolbar);


    		//toolbar manually created with parameters (padding, etc) + css for toolbar positioning and size.
    		{
    			for (let [name, action] of Object.entries(this.actions)) {

    				if (action.display !== true)
    					continue;

    				let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

    				toolbar.appendChild(svg);

    				let element = skin.querySelector('.openlime-' + name).cloneNode(true);
    				if (!element) continue;
    				svg.appendChild(element);
    				let box = element.getBBox();

    				let tlist = element.transform.baseVal;
    				if (tlist.numberOfItems == 0)
    					tlist.appendItem(svg.createSVGTransform());
    				tlist.getItem(0).setTranslate(-box.x, -box.y);

    				svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
    				svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    			}

    		}
    	}

    	setupActions() {
    		for (let [name, action] of Object.entries(this.actions)) {
    			let element = this.lime.containerElement.querySelector('.openlime-' + name);
    			if (!element)
    				continue;
    			// let pointerManager = new PointerManager(element);
    			// pointerManager.onEvent({ fingerSingleTap: action.task, priority: -2000 });
    			element.addEventListener('click', (e) => {
    				action.task(e);
    				e.preventDefault();
    			});
    		}
    		let items = document.querySelectorAll('.openlime-layers-button');
    		for (let item of items) {
    			let id = item.getAttribute('data-layer');
    			if (!id) continue;
    			item.addEventListener('click', () => {
    				this.setLayer(this.lime.layers[id]);
    			});
    		}
    	}
    	//find best length for scale from min -> max
    	//zoom 2 means a pixel in image is now 2 pixel on screen, scale is
    	bestScaleLength(min, max, scale, zoom) {
    		scale /= zoom;
    		//closest power of 10:
    		let label10 = Math.pow(10, Math.floor(Math.log(max*scale)/Math.log(10)));
    		let length10 = label10/scale;
    		if(length10 > min) return { length: length10, label: label10 };

    		let label20 = label10 * 2;
    		let length20 = length10 * 2;
    		if(length20 > min) return { length: length20, label: label20 };

    		let label50 = label10 * 5;
    		let length50 = length10 * 5;

    		if(length50 > min) return { length: length50, label: label50 };
    		return { length: 0, label: 0 }
    	}
    	
    	updateScale(line, text) {
    		//let zoom = this.lime.camera.getCurrentTransform(performance.now()).z;
    		let zoom = this.lime.camera.target.z;
    		if(zoom == this.lastScaleZoom)
    			return;
    		this.lastScaleZoom = zoom;
    		let s = this.bestScaleLength(100, 200, this.scale, zoom);
    		//let line = document.querySelector('.openlime-scale > line');
    		let margin = 200 - 10 - s.length;
    		line.setAttribute('x1', margin/2);
    		line.setAttribute('x2', 200 - margin/2);
    		//let text = document.querySelector('.openlime-scale > text');
    		text.textContent = s.label + "mm";


    	}

    	//scale is length of a pixel in mm
    	setupScale() {
    		if(!this.scale) return;
    		this.scales = { 'mm': 1, 'cm':10, 'm':1000, 'km':1000000 };

    		
    		let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    		svg.setAttribute('viewBox', `0 0 200 40`);
    		svg.classList.add('openlime-scale');
    		let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    		line.setAttribute('x1', 5);
    		line.setAttribute('y1', 26.5);
    		line.setAttribute('x2', 195);
    		line.setAttribute('y2', 26.5);
    		let text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    		text.setAttribute('x', '50%');
    		text.setAttribute('y', '16px');
    		text.setAttribute('dominant-baseline', 'middle');
    		text.setAttribute('text-anchor', 'middle');
    		text.textContent = "10mm";
    		//var label = document.createTextNode("10mm");
    		//text.appendChild(label);


    		svg.appendChild(line);
    		svg.appendChild(text);
    		this.lime.containerElement.appendChild(svg);
    		this.lime.camera.addEvent('update', () => { this.updateScale(line, text); } );
    	}

    	//we need the concept of active layer! so we an turn on and off light.
    	toggleLightController() {
    		let div = this.lime.containerElement;
    		let active = div.classList.toggle('openlime-light-active');
    		this.lightActive = active;

    		for (let layer of Object.values(this.lime.canvas.layers))
    			for (let c of layer.controllers)
    				if (c.control == 'light')
    					c.active = active;
    	}

    	toggleFullscreen() {
    		let canvas = this.lime.canvasElement;
    		let div = this.lime.containerElement;
    		let active = div.classList.toggle('openlime-fullscreen-active');

    		if (!active) {
    			var request = document.exitFullscreen || document.webkitExitFullscreen ||
    				document.mozCancelFullScreen || document.msExitFullscreen;
    			request.call(document);document.querySelector('.openlime-scale > line');

    			this.lime.resize(canvas.offsetWidth, canvas.offsetHeight);
    		} else {
    			var request = div.requestFullscreen || div.webkitRequestFullscreen ||
    				div.mozRequestFullScreen || div.msRequestFullscreen;
    			request.call(div);
    		}
    		this.lime.resize(canvas.offsetWidth, canvas.offsetHeight);
    	}

    	startRuler() {
    	}

    	endRuler() {
    	}

    	/* Layer management */

    	createEntry(entry) {
    		if (!('id' in entry))
    			entry.id = 'entry_' + (this.entry_count++);

    		let id = `id="${entry.id}"`;
    		let tooltip = 'tooltip' in entry ? `title="${entry.tooltip}"` : '';
    		let classes = 'classes' in entry ? entry.classes : '';
    		let html = '';
    		if ('title' in entry) {
    			html += `<h2 ${id} class="openlime-title ${classes}" ${tooltip}>${entry.title}</h2>`;

    		} else if ('section' in entry) {
    			html += `<h3 ${id} class="openlime-section ${classes}" ${tooltip}>${entry.section}</h3>`;

    		} else if ('html' in entry) {
    			html += `<div ${id} class="${classes}">${entry.html}</div>`;

    		} else if ('button' in entry) {
    			let group = 'group' in entry ? `data-group="${entry.group}"` : '';
    			let layer = 'layer' in entry ? `data-layer="${entry.layer}"` : '';
    			let mode = 'mode' in entry ? `data-mode="${entry.mode}"` : '';
    			html += `<a href="#" ${id} ${group} ${layer} ${mode} ${tooltip} class="openlime-entry ${classes}">${entry.button}</a>`;
    		} else if ('slider' in entry) {
    			html += `<input type="range" min="1" max="100" value="50" class="openlime-slider ${classes}" ${id}>`;
    		}

    		if ('list' in entry) {
    			let ul = `<div class="openlime-list ${classes}">`;
    			for (let li of entry.list)
    				ul += this.createEntry(li);
    			ul += '</div>';
    			html += ul;
    		}
    		return html;
    	}
    	addEntryCallbacks(entry) {
    		entry.element = this.layerMenu.querySelector('#' + entry.id);
    		if (entry.onclick)
    			entry.element.addEventListener('click', (e) => {
    				entry.onclick();
    				//this.updateMenu();
    			});
    		if (entry.oninput)
    			entry.element.addEventListener('input', entry.oninput);
    		if(entry.oncreate)
    			entry.oncreate();

    		if ('list' in entry)
    			for (let e of entry.list)
    				this.addEntryCallbacks(e);
    	}

    	updateEntry(entry) {
    		let status = entry.status ? entry.status() : '';
    		entry.element.classList.toggle('active', status == 'active');

    		if ('list' in entry)
    			for (let e of entry.list)
    				this.updateEntry(e);
    	}

    	updateMenu() {
    		for (let entry of this.menu)
    			this.updateEntry(entry);
    	}

    	createMenu() {
    		this.entry_count = 0;
    		let html = `<div class="openlime-layers-menu">`;
    		for (let entry of this.menu) {
    			html += this.createEntry(entry);
    		}
    		html += '</div>';


    		let template = document.createElement('template');
    		template.innerHTML = html.trim();
    		this.layerMenu = template.content.firstChild;
    		this.lime.containerElement.appendChild(this.layerMenu);

    		for (let entry of this.menu) {
    			this.addEntryCallbacks(entry);
    		}


    		/*		for(let li of document.querySelectorAll('[data-layer]'))
    					li.addEventListener('click', (e) => {
    						this.setLayer(this.lime.canvas.layers[li.getAttribute('data-layer')]);
    					}); */
    	}

    	toggleLayers(event) {
    		this.layerMenu.classList.toggle('open');
    	}

    	setLayer(layer_on) {
    		if (typeof layer_on == 'string')
    			layer_on = this.lime.canvas.layers[layer_on];

    		if(layer_on instanceof AnnotationLayer) { //just toggle
    			layer_on.setVisible(!layer_on.visible);

    		} else {
    			for (let layer of Object.values(this.lime.canvas.layers)) {
    				if(layer instanceof AnnotationLayer)
    					continue;

    				layer.setVisible(layer == layer_on);
    				for (let c of layer.controllers) {
    					if (c.control == 'light')
    						c.active = this.lightActive && layer == layer_on;
    				}
    			}
    		}
    		this.updateMenu();
    		this.lime.redraw();
    	}

    	closeLayersMenu() {
    		this.layerMenu.style.display = 'none';
    	}
    }


    class Info {
    	constructor(container) {
    		Object.assign(this, {
    			element: null,
    			//svgElement: null,  //svg for annotation, TODO: should be inside annotation!
    			layer: null,
    			annotation: null,
    			container: container
    		});			
    	}
    	
    	hide() {
    		if(!this.element) return;
    		this.element.style.display = 'none';

    		if(this.layer)
    			this.layer.setSelected(this.annotation.id, false);
    		
    		this.annotation = null;
    		this.layer = null;
    	}

    	show(e, layer, id) {
    		if(!this.element) {
    			let html = '<div class="openlime-info"></div>';
    			let template = document.createElement('template');
    			template.innerHTML = html.trim();
    			this.element = template.content.firstChild;
    			this.container.appendChild(this.element);
    		}

    		if(this.annotation && id == this.annotation.id)
    			return;

    		this.hide();
    		
    		let annotation = layer.getAnnotationById(id);
    		this.element.innerHTML = layer.infoTemplate ? layer.infoTemplate(annotation) : this.template(annotation);
    		this.annotation = annotation;
    		this.layer = layer;

    		this.element.style.display = '';
    		//todo position info appropriately.
    		e.preventDefault();
    	}
    	template(annotation) {
    		return `
		<p>${annotation.description}</p>
		<p>${annotation.class}</p>
		`;
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
     *  * **background**: css style for background (overwrites css if present)
     */

    class OpenLIME {

    	constructor(div, options) {

    		Object.assign(this, { 
    			background: null,
    			canvas: {},
    			controllers: [],
    			camera: new Camera()
    		});

    		
    		if(typeof(div) == 'string')
    			div = document.querySelector(div);

    		if(!div)
    			throw "Missing element parameter";

    		Object.assign(this, options);
    		if(this.background)
    			div.style.background = this.background;

    		this.containerElement = div;
    		this.canvasElement = div.querySelector('canvas');
    		if(!this.canvasElement) {
    			this.canvasElement = document.createElement('canvas');
    			div.prepend(this.canvasElement);
    		}

    		this.overlayElement = document.createElement('div');
    		this.overlayElement.classList.add('openlime-overlay');
    		this.containerElement.appendChild(this.overlayElement);


    		this.canvas = new Canvas(this.canvasElement, this.overlayElement, this.camera, this.canvas);
    		this.canvas.addEvent('update', () => { this.redraw(); });
    		this.camera.addEvent('update', () => { this.redraw(); });

    		this.pointerManager = new PointerManager(this.overlayElement);

    		this.canvasElement.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                return false;
            });
    		
    		var resizeobserver = new ResizeObserver( entries => {
    			for (let entry of entries) {
    				this.resize(entry.contentRect.width, entry.contentRect.height);
    				this.processEvent('resize', {}, entry.contentRect.width, entry.contentRect.height);
    			}
    		});
    		resizeobserver.observe(this.canvasElement);

    		this.resize(this.canvasElement.clientWidth, this.canvasElement.clientHeight);
    	}


    	/* Convenience function, it actually passes to Canvas
    	*/
    	addLayer(id, layer) {
    		canvas.addLayer(id, layer);
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
    		if(!done)
    			this.redraw();
    	}

    	processEvent(event, e, x, y, scale) {

    		//first check layers from top to bottom
    		let ordered = Object.values(this.canvas.layers).sort( (a, b) => b.zindex - a.zindex);
    		ordered.push(this);
    		for(let layer of ordered) {
    			for(let controller of layer.controllers) {
    				if(controller.active && controller[event])
    					controller[event](e);
    				if(e.defaultPrevented)
    					return;
    			}
    		}
    	}
    }

    exports.Annotation = Annotation;
    exports.AnnotationEditor = AnnotationEditor;
    exports.AnnotationLayer = AnnotationLayer;
    exports.Camera = Camera;
    exports.Canvas = Canvas;
    exports.Layer = Layer;
    exports.Layout = Layout;
    exports.OpenLIME = OpenLIME;
    exports.RTILayer = RTILayer;
    exports.Raster = Raster;
    exports.Shader = Shader;
    exports.Transform = Transform;
    exports.UIBasic = UIBasic;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
