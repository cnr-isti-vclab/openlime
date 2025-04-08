import { Util } from './Util'
import { Camera } from './Camera'
import { Layer } from './Layer'
import { Cache } from './Cache'
import { addSignals } from './Signals'

//// HELPERS

window.structuredClone = typeof (structuredClone) == "function" ? structuredClone : function (value) { return JSON.parse(JSON.stringify(value)); };


/**
 * Canvas class that manages WebGL context, layers, and scene rendering.
 * Handles layer management, WebGL context creation/restoration, and render timing.
 */
class Canvas {
	/**
	 * Creates a new Canvas instance with WebGL context and overlay support.
	 * @param {HTMLCanvasElement|string} canvas - Canvas DOM element or selector
	 * @param {HTMLElement|string} overlay - Overlay DOM element or selector for decorations (annotations, glyphs)
	 * @param {Camera} camera - Scene camera instance
	 * @param {Object} [options] - Configuration options
	 * @param {Object} [options.layers] - Layer configurations mapping layer IDs to Layer instances
	 * @param {boolean} [options.preserveDrawingBuffer=false] - Whether to preserve WebGL buffers until manually cleared
	 * @param {number} [options.targetfps=30] - Target frames per second for rendering
	 * @param {boolean} [options.srgb=true] - Whether to enable sRGB color space or display-P3 for the output framebuffer
	 * @param {boolean} [options.stencil=false] - Whether to enable stencil buffer support
	 * @fires Canvas#update
	 * @fires Canvas#updateSize
	 * @fires Canvas#ready
	 */
	constructor(canvas, overlay, camera, options) {
		Object.assign(this, {
			canvasElement: null,
			preserveDrawingBuffer: false,
			gl: null,
			overlayElement: null,
			camera: camera,
			layers: {},
			targetfps: 30,
			fps: 0,
			timing: [16], //records last 30 frames time from request to next draw, rolling, primed to avoid /0
			timingLength: 5, //max number of timings.
			overBudget: 0, //fraction of frames that took too long to render.
			srgb: true,     // Enable sRGB color space by default
			stencil: false, // Disable stencil buffer by default

			signals: { 'update': [], 'updateSize': [], 'ready': [] }
		});
		Object.assign(this, options);

		this.init(canvas, overlay);

		for (let id in this.layers)
			this.addLayer(id, new Layer(this.layers[id]));
		this.camera.addEvent('update', () => this.emit('update'));
	}

	/**
	 * Records render timing information and updates FPS statistics.
	 * @param {number} elapsed - Time elapsed since last frame in milliseconds
	 * @private
	 */
	addRenderTiming(elapsed) {
		this.timing.push(elapsed);
		while (this.timing.length > this.timingLength)
			this.timing.shift();
		this.overBudget = this.timing.filter(t => t > 1000 / this.targetfps).length / this.timingLength;
		this.fps = 1000 / (this.timing.reduce((sum, a) => sum + a, 0) / this.timing.length);
	}

	/**
	 * Initializes WebGL context and sets up event listeners.
	 * @param {HTMLCanvasElement|string} canvas - Canvas element or selector
	 * @param {HTMLElement|string} overlay - Overlay element or selector
	 * @throws {Error} If canvas or overlay elements cannot be found or initialized
	 * @private
	 */
	init(canvas, overlay) {
		if (!canvas)
			throw "Missing element parameter"

		if (typeof (canvas) == 'string') {
			canvas = document.querySelector(canvas);
			if (!canvas)
				throw "Could not find dom element.";
		}

		if (!overlay)
			throw "Missing element parameter"

		if (typeof (overlay) == 'string') {
			overlay = document.querySelector(overlay);
			if (!overlay)
				throw "Could not find dom element.";
		}

		if (!canvas.tagName)
			throw "Element is not a DOM element"

		if (canvas.tagName != "CANVAS")
			throw "Element is not a canvas element";

		this.canvasElement = canvas;
		this.overlayElement = overlay;

		/* test context loss */
		/* canvas = WebGLDebugUtils.makeLostContextSimulatingCanvas(canvas);
		canvas.loseContextInNCalls(1000); */

		const glopt = {
			antialias: false,
			depth: false,
			stencil: this.stencil,
			preserveDrawingBuffer: this.preserveDrawingBuffer,
			colorSpace: this.srgb ? 'srgb' : 'display-p3'
		};
		
		this.gl = this.gl ||
			canvas.getContext("webgl2", glopt) ||
			canvas.getContext("webgl", glopt) ||
			canvas.getContext("experimental-webgl", glopt);

		if (!this.gl)
			throw "Could not create a WebGL context";

		canvas.addEventListener("webglcontextlost", (event) => { console.log("Context lost."); event.preventDefault(); }, false);
		canvas.addEventListener("webglcontextrestored", () => { this.restoreWebGL(); }, false);
		document.addEventListener("visibilitychange", (event) => { if (this.gl.isContextLost()) { this.restoreWebGL(); } });
	}

	/**
	* Updates the state of the canvas and its components.
	* @param {Object} state - State object containing updates
	* @param {Object} [state.camera] - Camera state updates
	* @param {Object} [state.layers] - Layer state updates
	* @param {number} dt - Animation duration in milliseconds
	* @param {string} [easing='linear'] - Easing function for animations
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
	* Retrieves current state of the canvas and its components.
	* @param {Object} [stateMask=null] - Optional mask to filter returned state properties
	* @returns {Object} Current state object
	*/
	getState(stateMask = null) {
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

	/**
	 * Restores WebGL context after loss.
	 * Reinitializes shaders and textures for all layers.
	 * @private
	 */
	restoreWebGL() {
		let glopt = {
			antialias: false,
			depth: false,
			stencil: this.stencil,
			preserveDrawingBuffer: this.preserveDrawingBuffer,
			colorSpace: this.srgb ? 'srgb' : 'display-p3'
		};
		
		this.gl = this.gl ||
			this.canvasElement.getContext("webgl2", glopt) ||
			this.canvasElement.getContext("webgl", glopt) ||
			this.canvasElement.getContext("experimental-webgl", glopt);

		for (let layer of Object.values(this.layers)) {
			layer.gl = this.gl;
			layer.clear();
			if (layer.shader)
				layer.shader.restoreWebGL(this.gl);
		}
		this.prefetch();
		this.emit('update');
	}

	/**
	 * Adds a layer to the canvas.
	 * @param {string} id - Unique identifier for the layer
	 * @param {Layer} layer - Layer instance to add
	 * @fires Canvas#update
	 * @fires Canvas#ready
	 * @throws {Error} If layer ID already exists
	 */
	addLayer(id, layer) {

		console.assert(!(id in this.layers), "Duplicated layer id");

		layer.id = id;
		layer.addEvent('ready', () => {
			if (Object.values(this.layers).every(l => l.status == 'ready'))
				this.emit('ready');
			this.prefetch();
		});
		layer.addEvent('update', () => { this.emit('update'); });
		layer.addEvent('updateSize', () => { this.updateSize(); });
		layer.gl = this.gl;
		layer.canvas = this;
		layer.overlayElement = this.overlayElement;
		this.layers[id] = layer;
		this.prefetch();
	}

	/**
	 * Removes a layer from the canvas.
	 * @param {Layer} layer - Layer instance to remove
	 * @example
	 * const layer = new Layer(options);
	 * canvas.addLayer('map', layer);
	 * // ... later ...
	 * canvas.removeLayer(layer);
	 */
	removeLayer(layer) {
		layer.clear(); //order is important.

		delete this.layers[layer.id];
		delete Cache.layers[layer];
		this.prefetch();
	}

	/**
	 * Updates canvas size and camera bounds based on layers.
	 * @fires Canvas#updateSize
	 * @private
	 */
	updateSize() {
		const discardHidden = false;
		let sceneBBox = Layer.computeLayersBBox(this.layers, discardHidden);
		let minScale = Layer.computeLayersMinScale(this.layers, discardHidden);

		if (sceneBBox != null && this.camera.viewport)
			this.camera.updateBounds(sceneBBox, minScale);
		this.emit('updateSize');
	}

	/**
	 * Renders a frame at the specified time.
	 * @param {number} time - Current time in milliseconds
	 * @returns {boolean} True if all animations are complete
	 * @private
	 */
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
		let ordered = Object.values(this.layers).sort((a, b) => a.zindex - b.zindex);

		//NOTICE: camera(pos) must be relative to the WHOLE canvas
		let done = true;
		for (let layer of ordered) {
			if (layer.visible)
				done = layer.draw(pos, view) && done;
		}

		//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.
		return done && pos.t >= this.camera.target.t;
	}

	/**
	 * Schedules tile downloads based on current view.
	 * @param {Object} [transform] - Optional transform override, defaults to current camera transform
	 * @private
	 */
	prefetch(transform) {
		if (!transform)
			transform = this.camera.getGlCurrentTransform(performance.now());
		for (let id in this.layers) {
			let layer = this.layers[id];
			//console.log(layer);
			//console.log(layer.layout.status);
			if (layer.visible && layer.status == 'ready') {
				layer.prefetch(transform, this.camera.glViewport());
			}
		}
	}
	
}

/**
 * Fired when canvas content is updated (layer changes, camera moves).
 * @event Canvas#update
 */

/**
 * Fired when canvas or layout size changes.
 * @event Canvas#updateSize
 */

/**
 * Fired when all layers are initialized and ready to display.
 * @event Canvas#ready
 */

addSignals(Canvas, 'update', 'updateSize', 'ready');

export { Canvas }