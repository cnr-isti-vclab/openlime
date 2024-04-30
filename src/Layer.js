import { Transform } from './Transform.js'
import { Layout } from './Layout.js'
import { Cache } from './Cache.js'
import { BoundingBox } from './BoundingBox.js'
import { addSignals } from './Signals.js'


/**
 * The Layer class is responsible for drawing slides in the OpenLIME viewer. 
 * Layers can directly draw their contents on the viewer or be combined with each other to obtain more complex visualizations.
 * OpenLIME provides a set of ready-to-use layers that allows developers to quickly publish their datasets on the web
 * or make kiosk applications. Ready-to-use layers ranging from images, to multi-channel data (such as, for example, RTI or BRDF)
 * or the combination of multiple layers or for visualization through lenses.
 * 
 * A Layer takes raster data (images) as input which are managed by the layout. A layer stores all the information
 * and functions needed to render the graphics (shaders, shader parameters, data structures, etc.), and takes care
 * of data prefetching and communication with the cache.
 * 
 * The Layer is a kind of primitive class from which other Layer classes can inherit.
 * Each derived class "registers" on the Layer base class, the user can then use an instance of 
 * Layer by indicating the chosen `type` in the `options`.
 * 
 * In the example below a Layer of type 'rti' is created, then a LayerRTI (class derived from Layer) is instantiated and added to the viewer's layer stack.
 * 
 * @example
 *      const layer1 = new OpenLIME.Layer({
 *          layout: 'deepzoom',
 *          label: 'Ancient Roman coin',
 *          type: 'rti',
 *          url: '../../assets/rti/hsh/info.json',
 *          normals: false
 *      });
 *      viewer.addLayer('coin1', layer1);
 */

//FIXME: prefetchborder and mipmapbias should probably go into layout
class Layer {
	/**
	* Creates a Layer. Additionally, an object literal with Layer `options` can be specified.
	* Signals are triggered when the layer is ready (i.e. completely initialized) or if its state variables have been updated (a redraw is needed).
	* @param {Object} [options]
	* @param {(string|Layout)} options.layout='image' The layout (the format of the input raster images).
	* @param {string} options.type A string identifier to select the specific derived layer class to instantiate.
	* @param {string} options.id The layer unique identifier.
	* @param {string} options.label A string with a more comprehensive definition of the layer. If it exists, it is used in the UI layer menu, otherwise the `id` value is taken.
	* @param {Transform} options.transform The relative coords from layer to canvas.
	* @param {bool} options.visible=true Whether to render the layer.
	* @param {number} options.zindex Stack ordering value for the rendering of layers (higher zindex on top).
	* @param {bool} options.overlay=false  Whether the layer must be rendered in overlay mode.
	* @param {number} options.prefetchBorder=1 The threshold (in tile units) around the current camera position for which to prefetch tiles.
	* @param {number} options.mipmapBias=0.4 The mipmap bias of the texture.
	* @param {Object} options.shaders A map (shadersId, shader) of the shaders usable for the layer rendering. See @link {Shader}.
	* @param {Controller[]} options.controllers An array of UI device controllers active on the layer.
	* @param {Layer} options.sourceLayer The layer from which to take the tiles (in order to avoid tile duplication).
	*/
	constructor(options) {
		//create from derived class if type specified
		if (options.type) {
			let type = options.type;
			delete options.type;
			if (type in this.types) {

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

	/** @ignore */
	init(options) {
		Object.assign(this, {
			transform: new Transform(),
			viewport: null,
			debug: false,
			visible: true,
			zindex: 0,
			overlay: false, //in the GUI it won't affect the visibility of the other layers
			rasters: [],
			layers: [],
			controls: {},
			controllers: [],
			shaders: {},
			layout: 'image',
			shader: null, //current shader.
			gl: null,
			width: 0,
			height: 0,
			prefetchBorder: 1,
			mipmapBias: 0.4,

			//signals: { update: [], ready: [], updateSize: [] },  //update callbacks for a redraw, ready once layout is known.

			//internal stuff, should not be passed as options.
			tiles: new Map(),      //keep references to each texture (and status) indexed by level, x and y.
			//each tile is tex: [.. one for raster ..], missing: 3 missing tex before tile is ready.
			//only raster used by the shader will be loade.
			queue: [],     //queue of tiles to be loaded.
			requested: {},  //tiles requested.
		});

		Object.assign(this, options);
		if (this.sourceLayer) this.tiles = this.sourceLayer.tiles; //FIXME avoid tiles duplication

		this.transform = new Transform(this.transform);

		if (typeof (this.layout) == 'string') {
			let size = { width: this.width, height: this.height };
			this.setLayout(new Layout(null, this.layout, size));
		} else {
			this.setLayout(this.layout);
		}
	}

	setViewport(view) {
		this.viewport = view;
		this.emit('update');
	}
	addShaderFilter(f) {
		if (!this.shader) throw "Shader not implemented";
		this.shader.addFilter(f);
	}

	removeShaderFilter(name) {
		if (!this.shader) throw "Shader not implemented";
		this.shader.removeFilter(name);
	}

	clearShaderFilters() {
		if (!this.shader) throw "Shader not implemented";
		this.shader.clearFilters();
	}

	/**
	 * Sets the state of the layer 
	 */
	setState(state, dt, easing = 'linear') {
		if ('controls' in state)
			for (const [key, v] of Object.entries(state.controls)) {
				this.setControl(key, v, dt, easing);
			}
		if ('mode' in state && state.mode) {
			this.setMode(state.mode);
		}
	}

	/**
	 * Gets the state variables of the layer.
	 * @return {Object} An object with state variables 
	 */
	getState(stateMask = null) {
		const state = {};
		state.controls = {};
		for (const [key, v] of Object.entries(this.controls)) {
			if (!stateMask || ('controls' in stateMask && key in stateMask.controls))
				state.controls[key] = v.current.value;
		}
		if (!stateMask || 'mode' in stateMask)
			if (this.getMode())
				state.mode = this.getMode();
		return state;
	}

	/** @ignore */
	setLayout(layout) {
		/**
		* The event is fired when a layer is initialized.
		* @event Layer#ready
		*/
		/**
		* The event is fired if a redraw is needed.
		* @event Layer#update
		*/
		this.layout = layout;

		let callback = () => {
			this.status = 'ready';
			this.setupTiles(); //setup expect status to be ready!

			this.emit('ready');
			this.emit('update');
		};
		if (layout.status == 'ready') //layout already initialized.
			callback();
		else
			layout.addEvent('ready', callback);

		// Set signal to acknowledge change of bbox when it is known. Let this signal go up to canvas
		this.layout.addEvent('updateSize', () => {
			if(this.shader)
				this.shader.setTileSize(this.layout.getTileSize());
			this.emit('updateSize');
		});
	}

	// OK
	setTransform(tx) { //FIXME
		this.transform = tx;
		this.emit('updateSize');
	}

	/**
	 * Sets the shader to use
	 * @param {*} id the current shader identifier (the shader must already be registered in the `shaders` array)
	 */
	setShader(id) {
		if (!id in this.shaders)
			throw "Unknown shader: " + id;
		this.shader = this.shaders[id];
		this.setupTiles();
		this.shader.addEvent('update', () => { this.emit('update'); });
	}

	/**
	 * Gets the current shader mode.
	 * @returns {string} the shader mode
	 */
	getMode() {
		if (this.shader)
			return this.shader.mode;
		return null;
	}

	/**
	 * Gets an arrays of all the modes implemented in the current shader.
	 * @returns {string[]} arrays of modes
	 */
	getModes() {
		if (this.shader)
			return this.shader.modes;
		return [];
	}

	/**
	 * Set the mode of the current shader.
	 * @param {string} mode the mode of the current shader.
	 */
	setMode(mode) {
		this.shader.setMode(mode);
		this.emit('update');
	}

	/**
	 * Sets a value that indicates whether the layer is visible.
	 * @param {bool} visible The value.
	 */
	setVisible(visible) {
		this.visible = visible;
		this.previouslyNeeded = null;
		this.emit('update');
	}

	/**
	 * Sets the layer zindex value (stack ordering value for the rendering of layers).
	 * @param {int} zindex The value.
	 */
	setZindex(zindex) {
		this.zindex = zindex;
		this.emit('update');
	}

	/**
	 * Computes the minum scale value of the `layers`.
	 * @param {Layer[]} layers 
	 * @param {bool} discardHidden Whether hidden layers are not to be included in the computation.
	 * @returns {number} the minimum scale.
	 * @static
	 */
	static computeLayersMinScale(layers, discardHidden) {
		if (layers == undefined || layers == null) {
			console.log("ASKING SCALE INFO ON NO LAYERS");
			return 1;
		}
		let layersScale = 1;
		for (let layer of Object.values(layers)) {
			if (!discardHidden || layer.visible) {
				let s = layer.scale();
				layersScale = Math.min(layersScale, s);
			}
		}
		return layersScale;
	}

	/**
	 * Gets the scale of the layer transformation
	 * @returns {number} The scale
	 */
	scale() {
		// FIXME: this do not consider children layers
		return this.transform.z;
	}

	/**
	 * Gets the layer bounding box (<FIXME> Change name: box is in scene coordinates)
	 * @returns {BoundingBox} The bounding box 
	 */
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

	/**
	  * Computes the merge bounding box of all the 'layers`
	  * @param {Layer[]} layers 
	  * @param {bool} discardHidden Whether hidden layers are not to be included in the computation.
	  * @returns {BoundingBox} The bounding box 
	* @static 
	  */
	static computeLayersBBox(layers, discardHidden) {
		if (layers == undefined || layers == null) {
			console.log("ASKING BBOX INFO ON NO LAYERS");
			let emptyBox = new BoundingBox();
			return emptyBox;
		}
		let layersBbox = new BoundingBox();
		for (let layer of Object.values(layers)) {
			if ((!discardHidden || layer.visible) && layer.layout.width) {
				const bbox = layer.boundingBox();
				layersBbox.mergeBox(bbox);
			}
		}
		return layersBbox;
	}

	/**
	 * Gets the shader parameter control corresponding to `name`
	 * @param {*} name The name of the control.
	 * return {*} The control
	 */
	getControl(name) {
		let control = this.controls[name] ? this.controls[name] : null;
		if (control) {
			let now = performance.now();
			this.interpolateControl(control, now);
		}
		return control;
	}

	/**
	 * Adds a new shader parameter control.
	 * @param {string} name The name of the control.
	 * @param {*} value The value for initialization.
	 */
	addControl(name, value) {
		if (this.controls[name])
			throw new Error(`Control "$name" already exist!`);
		let now = performance.now();
		this.controls[name] = { 'source': { 'value': value, 't': now }, 'target': { 'value': value, 't': now }, 'current': { 'value': value, 't': now }, 'easing': 'linear' };
	}

	/**
	 * Set a shader parameter control with new value
	 * @param {*} name The name of the control.
	 * @param {*} value The value for initialization.
	 * @param {time} dt Duration of the interpolation (0=no interpolation).
	 */
	setControl(name, value, dt, easing = 'linear') { //When are created?
		let now = performance.now();
		let control = this.controls[name];
		this.interpolateControl(control, now);

		control.source.value = [...control.current.value];
		control.source.t = now;

		control.target.value = [...value];
		control.target.t = now + dt;

		control.easing = easing;

		this.emit('update');
	}
	/**
	 * Update the current values of the parameter controls.
	 * @returns {bool} Weather the interpolation is finished (the time has now gone).
	 */
	interpolateControls() {
		let now = performance.now();
		let done = true;
		for (let control of Object.values(this.controls))
			done = this.interpolateControl(control, now) && done;
		return done;
	}

	/** @ignore */
	interpolateControl(control, time) {
		let source = control.source;
		let target = control.target;
		let current = control.current;

		current.t = time;
		if (time < source.t) {
			current.value = [...source.value];
			return false;
		}

		if (time > target.t - 0.0001) {
			let done = current.value.every((e, i) => e === target.value[i]);
			current.value = [...target.value];
			return done;
		}

		let dt = (target.t - source.t);
		let tt = (time - source.t) / dt;
		switch (control.easing) {
			case 'ease-out': tt = 1 - Math.pow(1 - tt, 2); break;
			case 'ease-in-out': tt = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2; break;
		}
		let st = 1 - tt;

		current.value = [];
		for (let i = 0; i < source.value.length; i++)
			current.value[i] = (st * source.value[i] + tt * target.value[i]);
		return false;
	}

	/////////////
	/// CACHE HANDLING & RENDERING

	/** @ignore */
	dropTile(tile) {
		for (let i = 0; i < tile.tex.length; i++) {
			if (tile.tex[i]) {
				this.gl.deleteTexture(tile.tex[i]);
			}
		}
		this.tiles.delete(tile.index);
	}

	/** @ignore */
	clear() {
		this.ibuffer = this.vbuffer = null;
		Cache.flushLayer(this);
		this.tiles = new Map(); //TODO We need to drop these tile textures before clearing Map
		this.setupTiles();
		this.queue = [];
		this.previouslyNeeded = false;
	}

	/*
	 * Renders the layer
	 */
	/** @ignore */
	draw(transform, viewport) {
		//exception for layout image where we still do not know the image size
		//how linear or srgb should be specified here.
		//		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
		if (this.status != 'ready')// || this.tiles.size == 0)
			return true;

		if (!this.shader)
			throw "Shader not specified!";

		let done = this.interpolateControls();

		let parent_viewport = viewport;
		if(this.viewport) {
			viewport = this.viewport;
			this.gl.viewport(viewport.x, viewport.y, viewport.dx, viewport.dy);
		}
		

		this.prepareWebGL();

		//		find which quads to draw and in case request for them
		let available = this.layout.available(viewport, transform, this.transform, 0, this.mipmapBias, this.tiles);

		transform = this.transform.compose(transform);
		let matrix = transform.projectionMatrix(viewport);
		this.gl.uniformMatrix4fv(this.shader.matrixlocation, this.gl.FALSE, matrix);

		this.updateAllTileBuffers(available);

		// bind filter textures
		let iSampler = this.shader.samplers.length;
		for (const f of this.shader.filters) {
			for (let i = 0; i < f.samplers.length; i++) {
				this.gl.uniform1i(f.samplers[i].location, iSampler);
				this.gl.activeTexture(this.gl.TEXTURE0 + iSampler);
				this.gl.bindTexture(this.gl.TEXTURE_2D, f.samplers[i].tex);
				iSampler++;
			}
		}

		let i = 0;
		for (let tile of Object.values(available)) {
			//			if(tile.complete)
			this.drawTile(tile, i);
			++i;
		}
		if(this.vieport) 
			this.gl.viewport(parent_viewport.x, parent_viewport.y, parent_viewport.dx, parent_viewport.dy);

		return done;
	}

	/** @ignore */
	drawTile(tile, index) {
		//let tiledata = this.tiles.get(tile.index);
		if (tile.missing != 0)
			throw "Attempt to draw tile still missing textures"

		//coords and texture buffers updated once for all tiles from main draw() call

		//bind textures
		let gl = this.gl;
		for (var i = 0; i < this.shader.samplers.length; i++) {
			let id = this.shader.samplers[i].id;
			gl.uniform1i(this.shader.samplers[i].location, i);
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, tile.tex[id]);
		}

		// for (var i = 0; i < this.shader.samplers.length; i++) {
		// 	let id = this.shader.samplers[i].id;
		// 	gl.uniform1i(this.shader.samplers[i].location, i);
		// 	gl.activeTexture(gl.TEXTURE0 + i);
		// 	gl.bindTexture(gl.TEXTURE_2D, tile.tex[id]);
		// } // FIXME - TO BE REMOVED?

		const byteOffset = this.getTileByteOffset(index);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, byteOffset);
	}

	getTileByteOffset(index) {
		return index * 6 * 2;
	}

	/* given the full pyramid of needed tiles for a certain bounding box, 
	 *  starts from the preferred levels and goes up in the hierarchy if a tile is missing.
	 *  complete is true if all of the 'brothers' in the hierarchy are loaded,
	 *  drawing incomplete tiles enhance the resolution early at the cost of some overdrawing and problems with opacity.
	 */
	/** @ignore */
	/*toRender(needed) {

		let torender = {}; //array of minlevel, actual level, x, y (referred to minlevel)
		let brothers = {};

		let minlevel = needed.level;
		let box = needed.pyramid[minlevel];

		for (let y = box.yLow; y < box.yHigh; y++) {
			for (let x = box.xLow; x < box.xHigh; x++) {
				let level = minlevel;
				while (level >= 0) {
					let d = minlevel - level;
					let index = this.layout.index(level, x >> d, y >> d);
					if (this.tiles.has(index) && this.tiles.get(index).missing == 0) {
						torender[index] = this.tiles.get(index); //{ index: index, level: level, x: x >> d, y: y >> d, complete: true };
						break;
					} else {
						let sx = (x >> (d + 1)) << 1;
						let sy = (y >> (d + 1)) << 1;
						brothers[this.layout.index(level, sx, sy)] = 1;
						brothers[this.layout.index(level, sx + 1, sy)] = 1;
						brothers[this.layout.index(level, sx + 1, sy + 1)] = 1;
						brothers[this.layout.index(level, sx, sy + 1)] = 1;
					}
					level--;
				}
			}
		}
		for (let index in brothers) {
			if (index in torender)
				torender[index].complete = false;
		}
		return torender;
	}*/

	/** @ignore */
	// Update tile vertex and texture coords.
	// Currently called by derived classes 
	updateTileBuffers(coords, tcoords) {
		let gl = this.gl;
		//TODO to reduce the number of calls (probably not needed) we can join buffers, and just make one call per draw! (except the bufferData, which is per node)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
		//FIXME this is not needed every time.
		gl.vertexAttribPointer(this.shader.coordattrib, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.shader.coordattrib);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, tcoords, gl.STATIC_DRAW);

		gl.vertexAttribPointer(this.shader.texattrib, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.shader.texattrib);
	}


	/** @ignore */
	// Update tile vertex and texture coords of all the tiles in a single VBO
	updateAllTileBuffers(tiles) {
		let gl = this.gl;

		//use this.tiles instead.
		let N = Object.values(tiles).length;
		if (N == 0) return;

		const szV = 12;
		const szT = 8;
		const szI = 6;
		const iBuffer = new Uint16Array(szI * N);
		const vBuffer = new Float32Array(szV * N);
		const tBuffer = new Float32Array(szT * N);
		let i = 0;
		for (let tile of Object.values(tiles)) {
			let c = this.layout.tileCoords(tile);
			vBuffer.set(c.coords, i * szV);
			tBuffer.set(c.tcoords, i * szT);

			const off = i * 4;
			tile.indexBufferByteOffset = 2 * i * szI;
			iBuffer.set([off + 3, off + 2, off + 1, off + 3, off + 1, off + 0], i * szI);
			++i;
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, iBuffer, gl.STATIC_DRAW);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, vBuffer, gl.STATIC_DRAW);

		gl.vertexAttribPointer(this.shader.coordattrib, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.shader.coordattrib);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, tBuffer, gl.STATIC_DRAW);

		gl.vertexAttribPointer(this.shader.texattrib, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.shader.texattrib);

	}

	/*
	 *  If layout is ready and shader is assigned, creates or update tiles to keep track of what is missing.
	 */
	/** @ignore */
	setupTiles() {
		if (!this.shader || !this.layout || this.layout.status != 'ready')
			return;

		for (let tile of this.tiles) {
			tile.missing = this.shader.samplers.length;
			for (let sampler of this.shader.samplers) {
				if (tile.tex[sampler.id])
					tile.missing--;
			}
		}
	}

	/** @ignore */
	prepareWebGL() {

		let gl = this.gl;

		if (!this.ibuffer) { //this part might go into another function.
			this.ibuffer = gl.createBuffer();
			gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
			gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([3, 2, 1, 3, 1, 0]), gl.STATIC_DRAW);

			this.vbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0]), gl.STATIC_DRAW);

			this.tbuffer = gl.createBuffer();
			gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]), gl.STATIC_DRAW);
		}

		if (this.shader.needsUpdate) {
			this.shader.debug = this.debug;
			this.shader.createProgram(gl);
		}

		gl.useProgram(this.shader.program);
		this.shader.updateUniforms(gl);
	}

	/** @ignore */
	sameNeeded(a, b) {
		if (a.level != b.level)
			return false;

		for (let p of ['xLow', 'xHigh', 'yLow', 'yHigh'])
			if (a.pyramid[a.level][p] != b.pyramid[a.level][p])
				return false;

		return true;
	}

	/** @ignore */
	prefetch(transform, viewport) {
		if(this.viewport)
			viewport = this.viewport;

		if (this.layers.length != 0) { //combine layers
			for (let layer of this.layers)
				layer.prefetch(transform, viewport);
		}

		if (this.rasters.length == 0)
			return;

		if (this.status != 'ready')
			return;

		if (typeof (this.layout) != 'object')
			throw "AH!";

		/*let needed = this.layout.needed(viewport, transform, this.prefetchBorder, this.mipmapBias, this.tiles);


		this.queue = [];
		let now = performance.now();
		let missing = this.shader.samplers.length;


		for(let tile of needed) {
			if(tile.missing === null)
				tile.missing = missing;
			if (tile.missing != 0 && !this.requested[index])
				tmp.push(tile);
		} */
		this.queue = this.layout.needed(viewport, transform, this.transform, this.prefetchBorder, this.mipmapBias, this.tiles);
		/*		let needed = this.layout.neededBox(viewport, transform, this.prefetchBorder, this.mipmapBias);
				if (this.previouslyNeeded && this.sameNeeded(this.previouslyNeeded, needed))
					return;
				this.previouslyNeeded = needed;
		
				this.queue = [];
				let now = performance.now();
				//look for needed nodes and prefetched nodes (on the pos destination
				let missing = this.shader.samplers.length;
		
				for (let level = 0; level <= needed.level; level++) {
					let box = needed.pyramid[level];
					let tmp = [];
					for (let y = box.yLow; y < box.yHigh; y++) {
						for (let x = box.xLow; x < box.xHigh; x++) {
							let index = this.layout.index(level, x, y);
							let tile = this.tiles.get(index) || { index, x, y, missing, tex: [], level };
							tile.time = now;
							tile.priority = needed.level - level;
							if (tile.missing != 0 && !this.requested[index])
								tmp.push(tile);
						}
					}
					let c = box.center();
					//sort tiles by distance to the center TODO: check it's correct!
					tmp.sort(function (a, b) { return Math.abs(a.x - c[0]) + Math.abs(a.y - c[1]) - Math.abs(b.x - c[0]) - Math.abs(b.y - c[1]); });
					this.queue = this.queue.concat(tmp);
				}*/
		Cache.setCandidates(this);
	}

	/** @ignore */
	async loadTile(tile, callback) {
		if (this.tiles.has(tile.index))
			throw "AAARRGGHHH double tile!";

		if (this.requested[tile.index]) {
			console.log("Warning: double request!");
			callback("Double tile request");
			return;
		}

		this.tiles.set(tile.index, tile);
		this.requested[tile.index] = true;

		if (this.layout.type == 'itarzoom') {
			tile.url = this.layout.getTileURL(null, tile);
			let options = {};
			if (tile.end)
				options.headers = { range: `bytes=${tile.start}-${tile.end}`, 'Accept-Encoding': 'indentity' }

			var response = await fetch(tile.url, options);
			if (!response.ok) {
				callback("Failed loading " + tile.url + ": " + response.statusText);
				return;
			}
			let blob = await response.blob();

			let i = 0;
			for (let sampler of this.shader.samplers) {
				let raster = this.rasters[sampler.id];
				let imgblob = blob.slice(tile.offsets[i], tile.offsets[i + 1]);
				const img = await raster.blobToImage(imgblob, this.gl);
				let tex = raster.loadTexture(this.gl, img);
				let size = img.width * img.height * 3;
				tile.size += size;
				tile.tex[sampler.id] = tex;
				tile.w = img.width;
				tile.h = img.height;
				i++;
			}
			tile.missing = 0;
			this.emit('update');
			delete this.requested[tile.index];
			if (callback) callback(tile.size);
			return;
		}
		tile.missing = this.shader.samplers.length;
		for (let sampler of this.shader.samplers) {

			let raster = this.rasters[sampler.id];
			tile.url = this.layout.getTileURL(sampler.id, tile);
			const [tex, size] = await raster.loadImage(tile, this.gl); // TODO Parallelize request and url must be a parameter (implement request ques per url)
			if (this.layout.type == "image") {
				this.layout.width = raster.width;
				this.layout.height = raster.height;
				this.layout.emit('updateSize');
			}
			tile.size += size;
			tile.tex[sampler.id] = tex;
			tile.missing--;
			if (tile.missing <= 0) {
				this.emit('update');
				delete this.requested[tile.index];
				if (callback) callback(size);
			}
		}
	}
}

Layer.prototype.types = {}
addSignals(Layer, 'update', 'ready', 'updateSize');

export { Layer }
