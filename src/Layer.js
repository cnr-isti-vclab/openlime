import { Transform } from './Transform.js'
import { Layout } from './Layout.js'
import { Cache } from './Cache.js'
import { BoundingBox } from './BoundingBox.js'
import { addSignals } from './Signals.js'
import { Util } from './Util.js'

/**
 * @typedef {Object} LayerOptions
 * @property {string|Layout} [layout='image'] - Layout/format of input raster images
 * @property {string} [type] - Identifier for specific derived layer class
 * @property {string} [id] - Unique layer identifier
 * @property {string} [label] - Display label for UI (defaults to id)
 * @property {Transform} [transform] - Transform from layer to canvas coordinates
 * @property {boolean} [visible=true] - Whether layer should be rendered
 * @property {number} [zindex=0] - Stack order for rendering (higher = on top)
 * @property {boolean} [overlay=false] - Whether layer renders in overlay mode
 * @property {number} [prefetchBorder=1] - Tile prefetch threshold in tile units
 * @property {number} [mipmapBias=0.4] - Texture resolution selection bias (0=highest, 1=lowest)
 * @property {Object.<string, Shader>} [shaders] - Map of available shaders
 * @property {Controller[]} [controllers] - Array of active UI controllers
 * @property {Layer} [sourceLayer] - Layer to share tiles with
 * @property {number} [pixelSize=0.0] - Physical size of a pixel in mm
 */

/**
 * Layer is the core class for rendering content in OpenLIME.
 * It manages raster data display, tile loading, and shader-based rendering.
 * 
 * Features:
 * - Tile-based rendering with level-of-detail
 * - Shader-based visualization effects
 * - Automatic tile prefetching and caching
 * - Coordinate system transformations
 * - Animation and interpolation of shader parameters
 * - Support for multiple visualization modes
 * - Integration with layout systems for different data formats
 * 
 * Layers can be used directly or serve as a base class for specialized layer types.
 * The class uses a registration system where derived classes register themselves,
 * allowing instantiation through the 'type' option.
 * 
 * @fires Layer#ready - Fired when layer is initialized
 * @fires Layer#update - Fired when redraw is needed
 * @fires Layer#loaded - Fired when all tiles are loaded
 * @fires Layer#updateSize - Fired when layer size changes
 * 
 * @example
 * ```javascript
 * // Create a basic image layer
 * const layer = new OpenLIME.Layer({
 *   layout: 'deepzoom',
 *   type: 'image',
 *   url: 'path/to/image.dzi',
 *   label: 'Main Image'
 * });
 * 
 * // Add to viewer
 * viewer.addLayer('main', layer);
 * 
 * // Listen for events
 * layer.addEvent('ready', () => {
 *   console.log('Layer initialized');
 * });
 * ```
 */
class Layer {
	/**
	* Creates a Layer. Additionally, an object literal with Layer `options` can be specified.
	* Signals are triggered when:
	* ready: the size and layout of the layer is known
	* update: some new tile is available, or some visualization parameters has changed
	* loaded: is fired when all the images needed have been downloaded
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
	* @param {number} options.mipmapBias=0.2 Determine which texture is used when scale is not a power of 2. 0: use always the highest resulution, 1 the lowest, 0.5 switch halfway.
	* @param {Object} options.shaders A map (shadersId, shader) of the shaders usable for the layer rendering. See @link {Shader}.
	* @param {Controller[]} options.controllers An array of UI device controllers active on the layer.
	* @param {Layer} options.sourceLayer The layer from which to take the tiles (in order to avoid tile duplication).
	* @param {boolean} [options.debug=false] - Enable debug output
	*/
	constructor(options) {
		//create from derived class if type specified
		options = Object.assign({
			isLinear: false,
			isSrgbSimplified: true
		}, options);


		if (options.type) {
			let type = options.type;
			delete options.type;
			if (type in this.types) {

				return this.types[type](options);
			}
			throw "Layer type: " + type + "  module has not been loaded";
		}

		this.init(options);
	}

	/**
	 * Creates a new Layer that shares tiles with this layer but uses a different shader.
	 * This method allows efficient creation of derivative layers that share the same source textures,
	 * which is useful for applying different visual effects to the same image data without duplicating resources.
	 * 
	 * @param {Object} [options={}] - Options for the new layer
	 * @param {Object} [options.shaders] - Map of shaders for the new layer
	 * @param {string} [options.defaultShader] - ID of shader to set as active
	 * @param {string} [options.label] - Label for the new layer (defaults to original label)
	 * @param {number} [options.zindex] - Z-index for the new layer (defaults to original + 1)
	 * @param {boolean} [options.visible] - Layer visibility (defaults to same as original)
	 * @param {Transform} [options.transform] - Custom transform (defaults to copy of original)
	 * @param {number} [options.mipmapBias] - Custom mipmap bias (defaults to original value)
	 * @param {number} [options.pixelSize] - Custom pixel size (defaults to original value)
	 * @param {boolean} [options.debug] - Debug mode flag (defaults to original value)
	 * @returns {Layer} A new layer sharing textures with this one
	 * 
	 * @example
	 * ```javascript
	 * // Create a derived layer with edge detection shader
	 * const enhancedShader = new OpenLIME.ShaderEdgeDetection();
	 * const derivedLayer = originalLayer.derive({
	 *     label: 'Edge Detection',
	 *     shaders: { 'edge': enhancedShader },
	 *     defaultShader: 'edge',
	 *     zindex: 10
	 * });
	 * viewer.addLayer('edges', derivedLayer);
	 * ```
	 * or
	 * ```javascript
	 * const enhancedShader = new OpenLIME.ShaderEdgeDetection();
	 * const derivedLayer = layer.derive({
	 *     label: 'Enhanced Image'
	 * });
	 * derivedLayer.addShader('enhanced', enhancedShader);
	 * derivedLayer.setShader('enhanced');
	 * viewer.addLayer('Enhanced Image', derivedLayer);
	 * ```
	 */
	derive(options = {}) {
		// Create options for the new layer
		const derivedOptions = {
			// Keep the same layout
			layout: this.layout,
			// Reference the source layer for shared tiles
			sourceLayer: this,
			// Inherit other properties but allow overrides
			label: options.label || this.label,
			zindex: options.zindex !== undefined ? options.zindex : this.zindex + 1,
			visible: options.visible !== undefined ? options.visible : this.visible,
			transform: options.transform || this.transform.copy(),
			// Use provided shaders or inherit
			shaders: options.shaders || Object.assign({}, this.shaders),
			mipmapBias: options.mipmapBias || this.mipmapBias,
			pixelSize: options.pixelSize || this.pixelSize,
			debug: options.debug !== undefined ? options.debug : this.debug
		};

		// Create the new layer
		const derivedLayer = new Layer(derivedOptions);

		// Set initial shader if specified
		if (options.defaultShader && derivedOptions.shaders[options.defaultShader]) {
			derivedLayer.setShader(options.defaultShader);
		}

		return derivedLayer;
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
			pixelSize: 0.0,

			//signals: { update: [], ready: [], updateSize: [] },  //update callbacks for a redraw, ready once layout is known.

			//internal stuff, should not be passed as options.
			tiles: new Map(),      //keep references to each texture (and status) indexed by level, x and y.
			//each tile is tex: [.. one for raster ..], missing: 3 missing tex before tile is ready.
			//only raster used by the shader will be loade.
			queue: [],     //queue of tiles to be loaded.
			requested: new Map,  //tiles requested.
		});

		Object.assign(this, options);
		if (this.sourceLayer) this.tiles = this.sourceLayer.tiles; //FIXME avoid tiles duplication

		this.transform = new Transform(this.transform);

		if (typeof (this.layout) == 'string') {
			let size = { width: this.width, height: this.height };
			if (this.server) size.server = this.server;
			this.setLayout(new Layout(null, this.layout, size));
		} else {
			this.setLayout(this.layout);
		}
	}

	/**
	 * Sets the layer's viewport
	 * @param {Object} view - Viewport specification
	 * @param {number} view.x - X position
	 * @param {number} view.y - Y position
	 * @param {number} view.dx - Width 
	 * @param {number} view.dy - Height
	 * @fires Layer#update
	 */
	setViewport(view) {
		this.viewport = view;
		this.emit('update');
	}

	/**
	 * Adds a shader to the layer's available shaders
	 * @param {string} id - Unique identifier for the shader
	 * @param {Shader} shader - Shader instance to add
	 * @throws {Error} If shader with the same id already exists
	 * @returns {Layer} This layer instance for method chaining
	 * 
	 * @example
	 * ```javascript
	 * const customShader = new OpenLIME.Shader({...});
	 * layer.addShader('custom', customShader);
	 * layer.setShader('custom');
	 * ```
	 */
	addShader(id, shader) {
		if (id in this.shaders) {
			throw new Error(`Shader with id '${id}' already exists`);
		}
		shader.isLinear = this.isLinear;
		shader.isSrgbSimplified = this.isSrgbSimplified;
		this.shaders[id] = shader;

		// If this is the first shader, set it as active
		if (Object.keys(this.shaders).length === 1 && !this.shader) {
			this.setShader(id);
		}

		return this;
	}

	/**
	 * Removes a shader from the layer's available shaders
	 * @param {string} id - Identifier of the shader to remove
	 * @throws {Error} If shader with the specified id doesn't exist
	 * @returns {Layer} This layer instance for method chaining
	 * 
	 * @example
	 * ```javascript
	 * // Remove a shader that's no longer needed
	 * layer.removeShader('oldEffect');
	 * ```
	 */
	removeShader(id) {
		if (!(id in this.shaders)) {
			throw new Error(`Shader with id '${id}' does not exist`);
		}

		// Check if removing the active shader
		const isActive = this.shader === this.shaders[id];

		// Remove the shader
		delete this.shaders[id];

		// Reset current shader if it was the active one
		if (isActive) {
			this.shader = null;

			// Try to set another shader if any are available
			const remainingShaders = Object.keys(this.shaders);
			if (remainingShaders.length > 0) {
				this.setShader(remainingShaders[0]);
			}

			// Emit update since the rendering has changed
			this.emit('update');
		}

		return this;
	}

	/**
	 * Adds a filter to the current shader
	 * @param {Object} filter - Filter specification
	 * @throws {Error} If no shader is set
	 */
	addShaderFilter(f) {
		if (!this.shader) throw "Shader not implemented";
		this.shader.addFilter(f);
	}

	/**
	 * Removes a filter from the current shader
	 * @param {Object} name - Filter name
	 * @throws {Error} If no shader is set
	 */
	removeShaderFilter(name) {
		if (!this.shader) throw "Shader not implemented";
		this.shader.removeFilter(name);
	}

	/**
	 * Removes all filters from the current shader
	 * @param {Object} name - Filter name
	 * @throws {Error} If no shader is set
	 */
	clearShaderFilters() {
		if (!this.shader) throw "Shader not implemented";
		this.shader.clearFilters();
	}

	/**
	 * Sets the layer state with optional animation
	 * @param {Object} state - State object with controls and mode
	 * @param {number} [dt] - Animation duration in ms
	 * @param {string} [easing='linear'] - Easing function ('linear'|'ease-out'|'ease-in-out')
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
	 * Gets the current layer state
	 * @param {Object} [stateMask] - Optional mask to filter returned state properties
	 * @returns {Object} Current state object
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
			if (this.shader)
				this.shader.setTileSize(this.layout.getTileSize());
			this.emit('updateSize');
		});
	}

	/**
	 * Sets the layer's transform
	 * @param {Transform} tx - New transform
	 * @fires Layer#updateSize
	 */
	setTransform(tx) { //FIXME
		this.transform = tx;
		this.emit('updateSize');
	}

	/**
	 * Sets the active shader
	 * @param {string} id - Shader identifier from registered shaders
	 * @throws {Error} If shader ID is not found
	 * @fires Layer#update
	 */
	setShader(id) {
		if (!id in this.shaders)
			throw "Unknown shader: " + id;
		this.shader = this.shaders[id];
		this.shader.isLinear = this.isLinear;
		this.shader.isSrgbSimplified = this.isSrgbSimplified;
		this.setupTiles();
		this.shader.addEvent('update', () => { this.emit('update'); });
	}

	/**
	 * Gets the current shader visualization mode
	 * @returns {string|null} Current mode or null if no shader
	 */
	getMode() {
		if (this.shader)
			return this.shader.mode;
		return null;
	}

	/**
	 * Gets available shader modes
	 * @returns {string[]} Array of available modes
	 */
	getModes() {
		if (this.shader)
			return this.shader.modes;
		return [];
	}

	/**
	 * Sets shader visualization mode
	 * @param {string} mode - Mode to set
	 * @fires Layer#update
	 */
	setMode(mode) {
		this.shader.setMode(mode);
		this.emit('update');
	}

	/**
	 * Sets layer visibility
	 * @param {boolean} visible - Whether layer should be visible
	 * @fires Layer#update
	 */
	setVisible(visible) {
		this.visible = visible;
		this.previouslyNeeded = null;
		this.emit('update');
	}

	/**
	 * Sets layer rendering order
	 * @param {number} zindex - Stack order value
	 * @fires Layer#update
	 */
	setZindex(zindex) {
		this.zindex = zindex;
		this.emit('update');
	}

	/**
	 * Computes minimum scale across layers
	 * @param {Object.<string, Layer>} layers - Map of layers
	 * @param {boolean} discardHidden - Whether to ignore hidden layers
	 * @returns {number} Minimum scale value
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
	 * Gets layer scale
	 * @returns {number} Current scale value
	 */
	scale() {
		// FIXME: this do not consider children layers
		return this.transform.z;
	}


	/**
	 * Gets pixel size in millimeters
	 * @returns {number} Size of one pixel in mm
	 */
	pixelSizePerMM() {
		return this.pixelSize * this.transform.z;
	}


	/**
	 * Gets layer bounding box in scene coordinates
	 * @returns {BoundingBox} Bounding box
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
	 * Computes combined bounding box of multiple layers
	 * @param {Object.<string, Layer>} layers - Map of layers
	 * @param {boolean} discardHidden - Whether to ignore hidden layers
	 * @returns {BoundingBox} Combined bounding box
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
	 * Adds a shader parameter control
	 * @param {string} name - Control identifier
	 * @param {*} value - Initial value
	 * @throws {Error} If control already exists
	 */
	addControl(name, value) {
		if (this.controls[name])
			throw new Error(`Control "$name" already exist!`);
		let now = performance.now();
		this.controls[name] = { 'source': { 'value': value, 't': now }, 'target': { 'value': value, 't': now }, 'current': { 'value': value, 't': now }, 'easing': 'linear' };
	}

	/**
	 * Sets a shader control value with optional animation
	 * @param {string} name - Control identifier
	 * @param {*} value - New value
	 * @param {number} [dt] - Animation duration in ms
	 * @param {string} [easing='linear'] - Easing function
	 * @fires Layer#update
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
	 * Updates control interpolation
	 * @returns {boolean} Whether all interpolations are complete
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

	/**
	 * Clears layer resources and resets state
	 * @private
	 */
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
		if (this.viewport) {
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
		if (this.vieport)
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
			// this.shader.debug = this.debug;
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

	/**
	 * Initiates tile prefetching based on viewport
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @private
	 */
	prefetch(transform, viewport) {
		if (this.viewport)
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
		Cache.getInstance().setCandidates(this);
	}

	/**
	 * Loads and processes a single image tile with optimized resource management.
	 * Implements request batching, concurrent loading, and proper error handling.
	 * 
	 * @async
	 * @param {Object} tile - Tile specification object
	 * @param {string} tile.index - Unique tile identifier
	 * @param {string} tile.url - Base URL for tile resource 
	 * @param {number} [tile.start] - Start byte for partial content (for tarzoom)
	 * @param {number} [tile.end] - End byte for partial content (for tarzoom)
	 * @param {Object[]} [tile.offsets] - Byte offsets for interleaved formats
	 * @param {Function} callback - Completion callback(error, size)
	 * @returns {Promise<void>}
	 * @throws {Error} If tile is already in processing queue
	 */
	async loadTile(tile, callback) {
		// Validate tile isn't already loaded or in processing queue
		if (this.tiles.has(tile.index)) {
			const error = new Error(`Tile with index ${tile.index} already exists in cache`);
			callback(error);
			return;
		}

		if (this.requested.has(tile.index)) {
			// Log warning but continue - don't throw since this could be a race condition
			console.warn(`Duplicate tile request for index ${tile.index}`);
			callback(new Error("Duplicate tile request"));
			return;
		}

		// Track the tile in collections before loading starts
		this.tiles.set(tile.index, tile);
		this.requested.set(tile.index, true);

		// Initialize progress tracking
		tile.size = 0;
		tile.missing = this.shader.samplers.length;
		tile.tex = [];

		try {
			// Handle specialized tarzoom format differently from regular tiles
			if (this.layout.type === 'itarzoom') {
				await this._loadInterleaved(tile, callback);
			} else {
				await this._loadParallel(tile, callback);
			}
		} catch (error) {
			// Clean up after error
			this.requested.delete(tile.index);
			this.tiles.delete(tile.index);
			console.error(`Error loading tile ${tile.index}:`, error);
			callback(error);
		}
	}

	/**
	* Loads an interleaved tile format (itarzoom) where all textures are in one file
	* 
	* @private
	* @async
	* @param {Object} tile - Tile specification object
	* @param {Function} callback - Completion callback
	* @returns {Promise<void>}
	*/
	async _loadInterleaved(tile, callback) {
		// Configure URL and fetch options
		tile.url = this.layout.getTileURL(null, tile);
		const options = {};

		// Set range headers if we're using byte ranges
		if (tile.end) {
			options.headers = {
				range: `bytes=${tile.start}-${tile.end}`,
				'Accept-Encoding': 'identity'  // Prevent compression which breaks byte ranges
			};
		}

		// Use HTTP/2 if available through the fetch() API
		const response = await fetch(tile.url, options);

		if (!response.ok) {
			throw new Error(`Failed loading ${tile.url}: ${response.statusText} (${response.status})`);
		}

		// Get whole blob and then process parts of it for each texture
		const blob = await response.blob();

		// Process each sampler in the shader
		for (let i = 0; i < this.shader.samplers.length; i++) {
			const sampler = this.shader.samplers[i];
			const raster = this.rasters[sampler.id];

			// Extract the specific portion for this texture from the blob
			const imgblob = blob.slice(tile.offsets[i], tile.offsets[i + 1]);

			// Convert to image and create texture - use texture pool if available
			const img = await raster.blobToImage(imgblob, this.gl);
			const tex = raster.loadTexture(this.gl, img);

			// Store result and track size
			const size = img.width * img.height * this.getPixelSize(sampler.id);
			tile.size += size;
			tile.tex[sampler.id] = tex;
			tile.w = img.width;
			tile.h = img.height;
		}

		// Mark as complete
		tile.missing = 0;

		// Trigger updates and notify
		this.emit('update');
		this.requested.delete(tile.index);

		if (callback) callback(null, tile.size);
	}

	/**
	* Loads textures in parallel for regular tile formats
	* 
	* @private
	* @async
	* @param {Object} tile - Tile specification object
	* @param {Function} callback - Completion callback
	* @returns {Promise<void>}
	*/
	async _loadParallel(tile, callback) {
		// Track completion for clean callback handling
		let completed = 0;
		let errors = [];

		// Create promises for all texture loads but don't await yet
		const loadPromises = this.shader.samplers.map(async (sampler) => {
			try {
				const raster = this.rasters[sampler.id];
				tile.url = this.layout.getTileURL(sampler.id, tile);

				// Load the image using the raster loader
				const [tex, size] = await raster.loadImage(tile, this.gl);

				// For image layout, we might need to update layer dimensions
				if (this.layout.type === "image") {
					this.layout.width = raster.width;
					this.layout.height = raster.height;
					this.layout.emit('updateSize');
				}

				// Update tile information
				tile.size += size;
				tile.tex[sampler.id] = tex;

				// Track completion status
				tile.missing--;
				completed++;

				// If this tile is now complete, emit update
				if (tile.missing <= 0) {
					this.emit('update');

					if (this.requested.size === 0) {
						this.emit('loaded');
					}
				}

				return { success: true, size };
			} catch (error) {
				errors.push(error);
				return { success: false, error };
			}
		});

		// Use Promise.allSettled to wait for all texture loads, handling errors gracefully
		const results = await Promise.allSettled(loadPromises);

		// Handle errors and clean up
		this.requested.delete(tile.index);

		if (errors.length > 0) {
			callback(errors[0]); // Return first error
		} else {
			callback(null, tile.size);
		}
	}

	/**
	* Determines the number of bytes per pixel for a given sampler
	* 
	* @private
	* @param {number} samplerId - Sampler identifier
	* @returns {number} Bytes per pixel
	*/
	getPixelSize(samplerId) {
		// Default to 3 bytes per pixel (RGB)
		let bytesPerPixel = 3;

		// Check format of the raster if available
		const raster = this.rasters[samplerId];
		if (raster && raster.format) {
			switch (raster.format) {
				case 'vec4':
					bytesPerPixel = 4; // RGBA
					break;
				case 'vec3':
					bytesPerPixel = 3; // RGB
					break;
				case 'float':
					bytesPerPixel = 1; // Single channel
					break;
			}
		}

		return bytesPerPixel;
	}

/**
 * Gets pixel values for a specific pixel location
 * Works with both single images and tiled formats
 *  
 * @param {number} x - X coordinate in image space (0,0 at top-left)
 * @param {number} y - Y coordinate in image space (0,0 at top-left)
 * @returns {Array<Uint8Array>} Array containing RGBA values for each raster at the specified pixel
 */
getPixelValues(x, y) {
  // Check if shader and GL context are initialized
  if (!this.shader) {
    throw new Error("WebGL resources not initialized");
  }

  if (!this.gl) {
    console.log("Not a GL Layer");
    return null;
  }

  // Ensure coordinates are integers
  x = Math.floor(x);
  y = Math.floor(y);

  // Check if coordinates are within image bounds
  if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
    console.warn(`Coordinates (${x}, ${y}) outside image bounds (${this.width}x${this.height})`);
    return [];
  }

  // Create array to hold pixel data for each raster
  const pixelData = Array(this.rasters.length).fill(null);
  
  try {
    // Create framebuffer for reading pixel data
    const framebuffer = this.gl.createFramebuffer();
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    
    // Handle differently based on layout type
    if (this.layout.type === 'image' || this.layout.type === 'itarzoom') {
      // For image layout, all textures are in a single tile
      const tile = this.tiles.get(0);
      
      if (tile && tile.missing === 0) {
        // Read pixel data for each raster
        for (let i = 0; i < this.rasters.length; i++) {
          if (i < tile.tex.length && tile.tex[i]) {
            // Attach the texture to the framebuffer
            this.gl.framebufferTexture2D(
              this.gl.FRAMEBUFFER,
              this.gl.COLOR_ATTACHMENT0,
              this.gl.TEXTURE_2D,
              tile.tex[i],
              0  // mipmap level
            );
            
            if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE) {
              // Read the pixel data
              const pData = new Uint8Array(4); // RGBA
              this.gl.readPixels(x, y, 1, 1, this.gl.RGBA, this.gl.UNSIGNED_BYTE, pData);
              pixelData[i] = pData;
            }
          }
        }
      }
    } else {
      // For tiled layouts, find the appropriate tile
      let foundTile = false;
      
      // Look through all available levels starting from the highest resolution
      for (let level = this.layout.nlevels - 1; level >= 0; level--) {
        // Get tile size at this level
        const tileSize = this.layout.getTileSize();
        const scale = Math.pow(2, this.layout.nlevels - 1 - level);
        const scaledTileWidth = tileSize[0] * scale;
        const scaledTileHeight = tileSize[1] * scale;
        
        // Find which tile contains our coordinates
        const tileX = Math.floor(x / scaledTileWidth);
        const tileY = Math.floor(y / scaledTileHeight);
        
        // Get the tile index
        const tileIndex = this.layout.index(level, tileX, tileY);
        
        // Check if this tile exists in our cache
        if (this.tiles.has(tileIndex)) {
          const tile = this.tiles.get(tileIndex);
          
          // Only proceed if the tile is fully loaded
          if (tile.missing === 0) {
            // Calculate local coordinates within the tile
            const localX = x - (tileX * scaledTileWidth);
            const localY = y - (tileY * scaledTileHeight);
            
            // Scale local coordinates to match the actual texture dimensions
            const texWidth = tile.w || tileSize[0];
            const texHeight = tile.h || tileSize[1];
            
            const texX = Math.min(Math.floor(localX * texWidth / scaledTileWidth), texWidth - 1);
            const texY = Math.min(Math.floor(localY * texHeight / scaledTileHeight), texHeight - 1);
            
            let foundPixelInTile = false;
            
            // For each raster, read the corresponding texture data
            for (let i = 0; i < this.rasters.length; i++) {
              // If we already have data for this raster, skip
              if (pixelData[i] !== null) continue;
              
              // Get the texture for this raster
              if (i < tile.tex.length && tile.tex[i]) {
                // Attach the texture to the framebuffer
                this.gl.framebufferTexture2D(
                  this.gl.FRAMEBUFFER,
                  this.gl.COLOR_ATTACHMENT0,
                  this.gl.TEXTURE_2D,
                  tile.tex[i],
                  0
                );
                
                if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE) {
                  // Read the pixel data
                  const pData = new Uint8Array(4); // RGBA
                  this.gl.readPixels(
                    texX, texY, 1, 1,
                    this.gl.RGBA, this.gl.UNSIGNED_BYTE,
                    pData
                  );
                  
                  pixelData[i] = pData;
                  foundPixelInTile = true;
                }
              }
            }
            
            if (foundPixelInTile) {
              foundTile = true;
              // If we've found a usable tile, we can stop searching further levels
              if (pixelData.every(p => p !== null)) {
                break;
              }
            }
          }
        }
      }
      
      // If we couldn't find any appropriate tile, log a warning
      if (!foundTile) {
        console.warn(`No suitable tile found for coordinates (${x}, ${y})`);
      }
    }
    
    // Clean up
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
    this.gl.deleteFramebuffer(framebuffer);
    
    // Fill any missing pixel data with default values
    for (let i = 0; i < pixelData.length; i++) {
      if (pixelData[i] === null) {
        pixelData[i] = new Uint8Array([0, 0, 0, 255]);
      }
    }
  } catch (err) {
    console.error("Error reading pixel data:", err);
  }
  
  return pixelData;
}

}

Layer.prototype.types = {}
addSignals(Layer, 'ready', 'update', 'loaded', 'updateSize');

export { Layer }
