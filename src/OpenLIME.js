import { Canvas } from './Canvas.js'

/**
 * Manages an OpenLIME viewer functionality on a canvas
 * how do I write more substantial documentation.
 *
 * @param {element} element of the DOM or selector (es. '#openlime'), of a <canvas> or a container element.
 * @param {string} options is a url to a JSON describing the viewer content
 * @param {object} options is a JSON describing the viewer content
 *  * **animate**: default *true*, calls requestAnimation() and manages refresh.
 *  * test:
 */

class OpenLIME {

	constructor(element, options) {
		console.log("This is just a test");
		this.canvas = new Canvas(element, options);
	}

	/**
	* Resize the canvas (and the overlay) and triggers a redraw.
	*/
	resize(width, height) {
	}
}


export { OpenLIME }

