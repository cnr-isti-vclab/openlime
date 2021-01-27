import { Canvas } from './Canvas.js'
import { Camera } from './Camera.js'
import { Transform } from './Transform.js'
import { Layer } from './Layer.js'
import { Layout } from './Layout.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'

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
			canvas: {}
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


		this.canvas = new Canvas(this.gl, this.canvas);
		this.canvas.addEvent('update', () => { this.redraw(); });


		var resizeobserver = new ResizeObserver( entries => {
			for (let entry of entries) {
				this.resize(entry.contentRect.width, entry.contentRect.height);
			}
		});
		resizeobserver.observe(this.canvasElement);
//TODO here is not exactly clear which assumption we make on canvas and container div size.
//		resizeobserver.observe(this.containerElement); 
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

		this.canvas.viewport = [0, 0, width, height];
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
		console.log('drawing');
		if(!time) time = performance.now();
		this.animaterequest = null;

		let done = this.canvas.draw(time);
		if(!done)
			this.redraw();
	}
}

export { OpenLIME, Canvas, Camera, Transform, Layer, Raster, Shader, Layout }

