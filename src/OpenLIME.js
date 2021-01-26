import { Canvas } from './Canvas.js'

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

export { OpenLIME }

