import { Controller } from './Controller.js'
import { CoordinateSystem } from './CoordinateSystem.js';
import { addSignals } from './Signals.js'


/**
 * ControllerPanZoom handles pan, zoom, and interaction events in a canvas element to manipulate camera parameters.
 * It supports multiple interaction methods including:
 * - Mouse drag for panning
 * - Mouse wheel for zooming
 * - Touch gestures (pinch to zoom)
 * - Double tap to zoom
 * 
 * The controller maintains state for ongoing pan and zoom operations and can be configured
 * to use different coordinate systems (HTML or GL) for calculations.
 * 
 * @extends Controller
 * @fires ControllerPanZoom#nowheel - Emitted when a wheel event is received but ctrl key is required and not pressed
 */
class ControllerPanZoom extends Controller {
	/**
	 * Creates a new ControllerPanZoom instance.
	 * @param {Camera} camera - The camera object to control
	 * @param {Object} [options] - Configuration options
	 * @param {number} [options.zoomAmount=1.2] - The zoom multiplier for wheel/double-tap events
	 * @param {boolean} [options.controlZoom=false] - If true, requires Ctrl key to be pressed for zoom operations
	 * @param {boolean} [options.useGLcoords=false] - If true, uses WebGL coordinate system instead of HTML
	 * @param {number} [options.panDelay] - Delay for pan animations
	 * @param {number} [options.zoomDelay] - Delay for zoom animations
	 */
	constructor(camera, options) {
		super(options);

		this.camera = camera;
		this.zoomAmount = 1.2;          //for wheel or double tap event
		this.controlZoom = false;       //require control+wheel to zoom

		this.panning = false;           //true if in the middle of a pan
		this.initialTransform = null;
		this.startMouse = null;

		this.zooming = false;           //true if in the middle of a pinch
		this.initialDistance = 0.0;
		this.useGLcoords = false;

		if (options)
			Object.assign(this, options);
	}

	/**
	 * Handles the start of a pan operation
	 * @private
	 * @param {PointerEvent} e - The pointer event that initiated the pan
	 */
	panStart(e) {
		if (!this.active || this.panning || !this.activeModifiers.includes(this.modifierState(e)))
			return;
		this.panning = true;

		this.startMouse = CoordinateSystem.fromCanvasHtmlToViewport({ x: e.offsetX, y: e.offsetY }, this.camera, this.useGLcoords);

		let now = performance.now();
		this.initialTransform = this.camera.getCurrentTransform(now);
		this.camera.target = this.initialTransform.copy(); //stop animation.
		e.preventDefault();
	}

	/**
	 * Updates camera position during a pan operation
	 * @private
	 * @param {PointerEvent} e - The pointer event with new coordinates
	 */
	panMove(e) {
		if (!this.panning)
			return;

		let m = this.initialTransform;
		const p = CoordinateSystem.fromCanvasHtmlToViewport({ x: e.offsetX, y: e.offsetY }, this.camera, this.useGLcoords);
		let dx = (p.x - this.startMouse.x);
		let dy = (p.y - this.startMouse.y);

		this.camera.setPosition(this.panDelay, m.x + dx, m.y + dy, m.z, m.a);
	}

	/**
	 * Ends the current pan operation
	 * @private
	 * @param {PointerEvent} e - The pointer event that ended the pan
	 */
	panEnd(e) {
		this.panning = false;
	}

	/**
	 * Calculates the Euclidean distance between two points
	 * @private
	 * @param {Object} e1 - First point with x, y coordinates
	 * @param {Object} e2 - Second point with x, y coordinates
	 * @returns {number} The distance between the points
	 */
	distance(e1, e2) {
		return Math.sqrt(Math.pow(e1.x - e2.x, 2) + Math.pow(e1.y - e2.y, 2));
	}

	/**
	 * Initializes a pinch zoom operation
	 * @private
	 * @param {TouchEvent} e1 - First touch point
	 * @param {TouchEvent} e2 - Second touch point
	 */
	pinchStart(e1, e2) {
		this.zooming = true;
		this.initialDistance = Math.max(30, this.distance(e1, e2));
		e1.preventDefault();
		//e2.preventDefault(); //TODO this is optional?
	}

	/**
	 * Updates zoom level during a pinch operation
	 * @private
	 * @param {TouchEvent} e1 - First touch point
	 * @param {TouchEvent} e2 - Second touch point
	 */
	pinchMove(e1, e2) {
		if (!this.zooming)
			return;
		let rect1 = e1.target.getBoundingClientRect();
		let offsetX1 = e1.clientX - rect1.left;
		let offsetY1 = e1.clientY - rect1.top;
		let rect2 = e2.target.getBoundingClientRect();
		let offsetX2 = e2.clientX - rect2.left;
		let offsetY2 = e2.clientY - rect2.top;
		const scale = this.distance(e1, e2);
		// FIXME CHECK ON TOUCH SCREEN
		//const pos = this.camera.mapToScene((offsetX1 + offsetX2)/2, (offsetY1 + offsetY2)/2, this.camera.getCurrentTransform(performance.now()));
		const pos = CoordinateSystem.fromCanvasHtmlToScene({ x: (offsetX1 + offsetX2) / 2, y: (offsetY1 + offsetY2) / 2 }, this.camera, this.useGLcoords);

		const dz = scale / this.initialDistance;
		this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
		this.initialDistance = scale;
		e1.preventDefault();
	}

	/**
	 * Ends the current pinch zoom operation
	 * @private
	 * @param {TouchEvent} e - The touch event that ended the pinch
	 * @param {number} x - The x coordinate of the pinch center
	 * @param {number} y - The y coordinate of the pinch center
	 * @param {number} scale - The final scale factor
	 */
	pinchEnd(e, x, y, scale) {
		this.zooming = false;
		e.preventDefault();
	}

	/**
	 * Handles mouse wheel events for zooming
	 * @private
	 * @param {WheelEvent} e - The wheel event
	 * @fires ControllerPanZoom#nowheel
	 */
	mouseWheel(e) {
		if(!this.active) return;
		if (this.controlZoom && !e.ctrlKey) {
			this.emit('nowheel');
			return;
		}
		let delta = -e.deltaY / 53;
		//const pos = this.camera.mapToScene(e.offsetX, e.offsetY, this.camera.getCurrentTransform(performance.now()));
		const pos = CoordinateSystem.fromCanvasHtmlToScene({ x: e.offsetX, y: e.offsetY }, this.camera, this.useGLcoords);
		const dz = Math.pow(this.zoomAmount, delta);
		this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
		e.preventDefault();
	}

	/**
	 * Handles double tap events for zooming
	 * @private
	 * @param {PointerEvent} e - The pointer event representing the double tap
	 */
	fingerDoubleTap(e) { }
	fingerDoubleTap(e) {
		if (!this.active || !this.activeModifiers.includes(this.modifierState(e)))
			return;
		//const pos = this.camera.mapToScene(e.offsetX, e.offsetY, this.camera.getCurrentTransform(performance.now()));
		const pos = CoordinateSystem.fromCanvasHtmlToScene({ x: e.offsetX, y: e.offsetY }, this.camera, this.useGLcoords);

		const dz = this.zoomAmount;
		this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
	}

}
addSignals(ControllerPanZoom, 'nowheel');

export { ControllerPanZoom }
