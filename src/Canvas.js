import { Camera } from './Camera.js'
import { Layer  } from './Layer.js'
import { Cache } from './Cache.js'

//// HELPERS

window.structuredClone = structuredClone  || function (value) { return  JSON.parse(JSON.stringify(value)); };


/**
 * Creates the WebGL context for the `canvas`. It stores information related to the `overlay` DOM element and the `camera` of the scene.
 * Signals are triggered in case of scene modifications.
 * Additionally, an object literal with Canvas `options` can be specified.
 * @param {(element|string)} canvas DOM element or selector for a `<canvas>`.
 * @param {(element|string)} overlay DOM element or selector for overlay decorations (i.e. annotations, glyphs, etc...)
 * @param {Camera} camera  The scene's camera.
 * @param {Object} [options] An object literal.
 * @param {Object} options.layers Object specifies layers (see. {@link Layer})
 * @param {bool} options.preserveDrawingBuffer=false Whether to preserve the buffers until manually cleared or overwritten. Needed for screenshots 
 * (otherwise is just a performance penalty).
 * 
*/

class Canvas {

	constructor(canvas, overlay, camera, options) {
		Object.assign(this, { 
			canvasElement: null,
			preserveDrawingBuffer: false, 
			gl: null,
			overlayElement: null,
			camera: camera,
			layers: {},
			signals: {'update':[], 'updateSize':[], 'ready': []}
		});
		Object.assign(this, options);

		this.init(canvas, overlay);
			
		for(let id in this.layers)
			this.addLayer(id, new Layer(this.layers[id]));
		this.camera.addEvent('update', () => this.emit('update'));
	}

	/*
 	* Adds a Canvas Event
 	* @param {*} event A label to identify the event.
 	* @param {*} callback The event callback function.
 	*/
	/** @ignore */
	addEvent(event, callback) {
		this.signals[event].push(callback);
	}

	/*
 	* Emits an event (running all the callbacks referred to it).
 	* @param {*} event The event name
 	*/
	/** @ignore */ 	
	emit(event) {
		for(let r of this.signals[event])
			r(this);
	}

	/** @ignore */
	init(canvas, overlay) {
		if(!canvas)
			throw "Missing element parameter"

		if(typeof(canvas) == 'string') {
			canvas = document.querySelector(canvas);
			if(!canvas)
				throw "Could not find dom element.";
		}

		if(!overlay)
			throw "Missing element parameter"

		if(typeof(overlay) == 'string') {
			overlay = document.querySelector(overlay);
			if(!overlay)
				throw "Could not find dom element.";
		}

		if(!canvas.tagName)
			throw "Element is not a DOM element"

		if(canvas.tagName != "CANVAS")
			throw "Element is not a canvas element";

		this.canvasElement = canvas;
		this.overlayElement = overlay;

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
	}

	/**
	 * Sets the state variables of all the system
	 * @param {Object} state An object with state variables.
	 * @param {number} dt The animation duration in millisecond.
	 * @param {Easing} easing The function aimed at making the camera movement or control adjustments less severe or pronounced.
	 */
	setState(state, dt, easing = 'linear') {
		if ('camera' in state) {
			const m = state.camera;
			this.camera.setPosition(dt, m.x, m.y, m.z, m.a, easing);
		}
		if ('layers' in state)
			for (const [k, layerState] of Object.entries(state.layers))
				if (k in this.layers) {
					const layer = this.layers[k];
					layer.setState(layerState, dt, easing);
				}
	}

	/**
	 * Gets the state variables of all the system as described in the stateMask
	 * @return {Object} An object with state variables.
	 */
	getState(stateMask=null) {
		let state = {};
		if (!stateMask || stateMask.camera) {
			let now = performance.now();
			let m = this.camera.getCurrentTransform(now);
			state.camera = { 'x': m.x, 'y': m.y, 'z': m.z, 'a': m.a };
		}
		state.layers = {};
		for (let layer of Object.values(this.layers)) {
			const layerMask = window.structuredClone(stateMask);
			if (stateMask && stateMask.layers) Object.assign(layerMask, stateMask.layers[layer.id]);
			state.layers[layer.id] = layer.getState(layerMask);
		}
		return state;
	}

	/** @ignore */
	restoreWebGL() {
		let glopt = { antialias: false, depth: false, preserveDrawingBuffer: this.preserveDrawingBuffer };
		this.gl = this.gl || 
			this.canvasElement.getContext("webgl2", glopt) || 
			this.canvasElement.getContext("webgl", glopt) || 
			this.canvasElement.getContext("experimental-webgl", glopt) ;

		for(let layer of Object.values(this.layers)) {
			layer.gl = this.gl;
			layer.clear();
			if(layer.shader)
				layer.shader.restoreWebGL(this.gl);
		}
		this.prefetch();
		this.emit('update');
	}

    /** Adds the given layer to the Canvas and connects the layer's events to it.
    * @param {string} id A label to identify the layer.
    * @param {Layer} layer An OpenLIME Layer object.
    */
	 addLayer(id, layer) {
		/**
		* The event is fired if a layer is updated, added or removed.
		* @event Canvas#update
		*/

		/** 
		* The event is fired when all the layers are ready (i.e. initialized and with data ready to be displayed).
		* @event Canvas#ready
		*/

		console.assert(!(id in this.layers), "Duplicated layer id");

		layer.id = id;
		layer.addEvent('ready', () => { 
			if(Object.values(this.layers).every( l => l.status == 'ready'))
				this.emit('ready');
			this.prefetch();
		});
		layer.addEvent('update', () => { this.emit('update'); });
		layer.addEvent('updateSize', () => { this.updateSize(); });
		layer.gl = this.gl;
		layer.overlayElement = this.overlayElement;
		this.layers[id] = layer;
		this.prefetch();
	}

    /** Remove the given layer from the Canvas
    * @param {Layer} layer An OpenLIME Layer object.
	* 
	* @example
	* let layer0 = new Layer(options);
	* canvas.addLayer('kdmap', layer0);
    * ...
	* canvas.removeLayer(layer0);
    */
	removeLayer(layer) {
		layer.clear(); //order is important.

		delete this.layers[layer.id];
		delete Cache.layers[layer];
		this.prefetch();
	}

	/** @ignore */
	updateSize() {
		/**
 		* The event is fired if a layout changes its size or position (the event forces the re-computation of the layer bounding boxes).
 		* @event Canvas#updateSize
 		*/
		const discardHidden = true;
		let sceneBBox = Layer.computeLayersBBox(this.layers, discardHidden);
		let minScale =  Layer.computeLayersMinScale(this.layers, discardHidden);
		
		if (sceneBBox != null) this.camera.updateBounds(sceneBBox, minScale);
		this.emit('updateSize');
	}

	/** @ignore */
	draw(time) {
		let gl = this.gl;
		let view = this.camera.glViewport();
		gl.viewport(view.x, view.y, view.dx, view.dy);

		var b = [0, 0, 0, 0];
		gl.clearColor(b[0], b[1], b[2], b[3], b[4]);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		//TODO: getCurren shoudl redurn {position, done}
		let pos = this.camera.getGlCurrentTransform(time);
		//todo we could actually prefetch toward the future a little bit
		this.prefetch(pos);

		//pos layers using zindex.
		let ordered = Object.values(this.layers).sort( (a, b) => a.zindex - b.zindex);

		//NOTICE: camera(pos) must be relative to the WHOLE canvas
		let done = true;
		for(let layer of ordered) {
			if(layer.visible)
				done = layer.draw(pos, view) && done;
		}

		//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.
		return done && pos.t >= this.camera.target.t;
	}

	/*
 	* This function have each layer to check which tiles are needed and schedule them for download.
 	* @param {object} transform is the camera position (layer will combine with local transform).
 	*/
	/** @ignore */
	prefetch(transform) {
		if(!transform)
			transform = this.camera.getGlCurrentTransform(performance.now());
		for(let id in this.layers) {
			let layer = this.layers[id];
			//console.log(layer);
			//console.log(layer.layout.status);
			if(layer.visible && layer.status == 'ready') {
				layer.prefetch(transform, this.camera.glViewport());
			}
		}
	}
}

export { Canvas }
