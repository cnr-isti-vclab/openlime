import { Canvas } from './Canvas.js'
import { Camera } from './Camera.js'
import { PointerManager } from './PointerManager.js'
import { Controller } from './Controller.js';
import { addSignals } from './Signals.js'


/** **Viewer** is the central class of the OpenLIME framework. It is used to create a viewer on a web page and manipulate it.
 * In the following example, after instantiating a Viewer, a LayerImage is added to it.
 * ```
 * // Create an OpenLIME canvas into .openlime
 * const lime = new OpenLIME.Viewer('.openlime');
 *
 * // Create an image layer and add it to the canvans
 * const layer = new OpenLIME.Layer({
 *     layout: 'image',
 *     type: 'image',
 *     url: '../../assets/lime/image/lime.jpg'
 * });
 * lime.addLayer('Base', layer);
 * 
 * // Access to internal structures
 * const camera = lime.camera;
 * const canvas = lime.canvas;
 * const layers = canvas.layers;
 * ```
*/
class Viewer {
	/**
	 * Instantiates a viewer object given the `div` element or a DOM selector of a `div` element.
	 * Additionally, an object literal with Viewer `options` can be specified.
	 * The class creates the canvas, enables the WebGL context and takes care of the content redrawing when needed.
	 * Viewer is the main class of the OpenLIME framework. It allows access to all the internal structures that make up the system.
	 * 
	 * @param {(HTMLElement|string)} div A DOM element or a selector (es. '#openlime' or '.openlime').
	 * @param {Object} [options]  An object literal describing the viewer content.
	 * @param {color} options.background CSS style for background (it overwrites CSS if present).
	 * @param {bool} options.autofit=true Whether the initial position of the camera is set to fit the scene model.
	*/
	constructor(div, options) {

		Object.assign(this, {
			background: null,
			autofit: true,
			canvas: {},
			camera: new Camera(),
		});
		if (typeof (div) == 'string')
			div = document.querySelector(div);

		if (!div)
			throw "Missing element parameter";

		Object.assign(this, options);
		if (this.background)
			div.style.background = this.background;

		this.containerElement = div;
		this.canvasElement = div.querySelector('canvas');
		if (!this.canvasElement) {
			this.canvasElement = document.createElement('canvas');
			div.prepend(this.canvasElement);
		}

		this.overlayElement = document.createElement('div');
		this.overlayElement.classList.add('openlime-overlay');
		this.containerElement.appendChild(this.overlayElement);

		this.canvas = new Canvas(this.canvasElement, this.overlayElement, this.camera, this.canvas);
		this.canvas.addEvent('update', () => { this.redraw(); });

		if (this.autofit)
			this.canvas.addEvent('updateSize', () => this.camera.fitCameraBox(0));

		this.pointerManager = new PointerManager(this.overlayElement);

		this.canvasElement.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			return false;
		});

		let resizeobserver = new ResizeObserver(entries => {
			for (let entry of entries) {
				this.resize(entry.contentRect.width, entry.contentRect.height);
			}
		});
		resizeobserver.observe(this.canvasElement);

		this.resize(this.canvasElement.clientWidth, this.canvasElement.clientHeight);

	}

	/**
	 * Adds a device event controller to the viewer.
	 * @param {Controller} controller An OpenLIME controller.
	 */
	addController(controller) {
		this.pointerManager.onEvent(controller);
	}

	/** Adds the given layer to the Viewer.
	* @param {string} id A label to identify the layer.
	* @param {Layer} layer An OpenLIME Layer object.
	*/
	addLayer(id, layer) {
		this.canvas.addLayer(id, layer);
		this.redraw();
	}

	/** Remove the given layer from the Viewer.
	* @param {(Layer|string)} layer An OpenLIME Layer or a Layer identifier.
	*/
	removeLayer(layer) {
		if (typeof (layer) == 'string')
			layer = this.canvas.layers[layer];
		if (layer) {
			this.canvas.removeLayer(layer);
			this.redraw();
		}
	}

	/* Resizes the canvas (and the overlay) and triggers a redraw.
	 * This method is internal and used by a ResizeObserver of the Canvas size.
	 * @param {number} width A width value defined in CSS pixel.
	 * @param {number} height A height value defined in CSS pixel.
	*/
	/**
	 * @ignore
	*/
	resize(width, height) {
		if(width == 0 || height == 0) return;
		// Test with retina display!
		this.canvasElement.width = width * window.devicePixelRatio;
		this.canvasElement.height = height * window.devicePixelRatio;

		let view = { x: 0, y: 0, dx: width, dy: height, w: width, h: height };
		this.camera.setViewport(view);
		this.canvas.updateSize();
		this.emit('resize', view);

		this.canvas.prefetch();
		this.redraw();
	}

	/**
	 * Schedules a redrawing.
	*/
	redraw() {
		if (this.animaterequest) return;
		this.animaterequest = requestAnimationFrame((time) => { this.draw(time); });
		this.requestTime = performance.now();
	}

	/*
	 * Renders the canvas content.
	 * This method is internal.
	 * @param {time} time The current time (a DOMHighResTimeStamp variable, as in `performance.now()`).
	*/
	/**
	* @ignore
   */
	draw(time) {
		if (!time) time = performance.now();
		this.animaterequest = null;

		let elapsed = performance.now() - this.requestTime;
		this.canvas.addRenderTiming(elapsed);
		
		let viewport = this.camera.viewport;
		let transform = this.camera.getCurrentTransform(time);

		let done = this.canvas.draw(time);
		if (!done)
			this.redraw();
		this.emit('draw');
	}
}

addSignals(Viewer, 'draw');
addSignals(Viewer, 'resize'); //args: viewport

export { Viewer };