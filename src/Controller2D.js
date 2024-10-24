import { BoundingBox } from './BoundingBox.js';
import { Controller } from './Controller.js'

/**
 * Callback for position updates.
 * @callback updatePosition
 * @param {number} x - X coordinate in the range [-1, 1]
 * @param {number} y - Y coordinate in the range [-1, 1]
 */

/**
 * Clamps a value between a minimum and maximum.
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {number} Clamped value
 * @private
 */
function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

/**
 * Controller for handling 2D position updates based on pan and tap events.
 * Extends the base Controller to track a 2D position (x, y) of the device pointer.
 * 
 * Supports two coordinate systems:
 * - Absolute: Coordinates mapped to [-1, 1] with origin at bottom-left of canvas
 * - Relative: Coordinates based on distance from initial pan position, scaled by speed
 * 
 * @extends Controller
 */
class Controller2D extends Controller {
	/**
	 * Creates a new Controller2D instance.
	 * @param {updatePosition} callback - Function called when position is updated
	 * @param {Object} [options] - Configuration options
	 * @param {boolean} [options.relative=false] - Whether to use relative coordinate system
	 * @param {number} [options.speed=2.0] - Scaling factor for relative coordinates
	 * @param {BoundingBox} [options.box] - Bounding box for coordinate constraints
	 * @param {updatePosition} [options.onPanStart] - Callback for pan start event
	 * @param {updatePosition} [options.onPanEnd] - Callback for pan end event
	 * @param {boolean} [options.active=true] - Whether the controller is active
	 * @param {number[]} [options.activeModifiers=[0]] - Array of active modifier states
	 */
	constructor(callback, options) {
		super(options);
		Object.assign(this, {
			relative: false,
			speed: 2.0,
			start_x: 0,
			start_y: 0,
			current_x: 0,
			current_y: 0,
			onPanStart: null,
			onPanEnd: null
		}, options);

		//By default the controller is active only with no modifiers.
		//you can select which subsets of the modifiers are active.
		this.callback = callback;

		if (!this.box) { //FIXME What is that? Is it used?
			this.box = new BoundingBox({ xLow: -0.99, yLow: -0.99, xHigh: 0.99, yHigh: 0.99 });
		}

		this.panning = false;
	}

	/**
	 * Updates the stored position for relative coordinate system.
	 * This is a convenience method typically used within callbacks.
	 * @param {number} x - New X coordinate in range [-1, 1]
	 * @param {number} y - New Y coordinate in range [-1, 1]
	 */
	setPosition(x, y) {
		this.current_x = x;
		this.current_y = y;
		this.callback(x, y);
	}

	/**
	 * Maps canvas pixel coordinates to normalized coordinates [-1, 1].
	 * @param {MouseEvent|TouchEvent} e - Mouse or touch event
	 * @returns {number[]} Array containing [x, y] in normalized coordinates
	 * @private
	 */
	project(e) {
		let rect = e.target.getBoundingClientRect();
		let x = 2 * e.offsetX / rect.width - 1;
		let y = 2 * (1 - e.offsetY / rect.height) - 1;
		return [x, y]
	}

	/**
	 * Converts event coordinates to the appropriate coordinate system (absolute or relative).
	 * @param {MouseEvent|TouchEvent} e - Mouse or touch event
	 * @returns {number[]} Array containing [x, y] in the chosen coordinate system
	 * @private
	 */
	rangeCoords(e) {
		let [x, y] = this.project(e);

		if (this.relative) {
			x = clamp(this.speed * (x - this.start_x) + this.current_x, -1, 1);
			y = clamp(this.speed * (y - this.start_y) + this.current_y, -1, 1);
		}
		return [x, y];
	}

	/**
	 * Handles start of pan gesture.
	 * @param {MouseEvent|TouchEvent} e - Pan start event
	 * @override
	 */
	panStart(e) {
		if (!this.active || !this.activeModifiers.includes(this.modifierState(e)))
			return;

		if (this.relative) {
			let [x, y] = this.project(e);
			this.start_x = x;
			this.start_y = y;
		}
		if (this.onPanStart)
			this.onPanStart(...this.rangeCoords(e));
		this.callback(...this.rangeCoords(e));
		this.panning = true;
		e.preventDefault();
	}

	/**
	 * Handles pan movement.
	 * @param {MouseEvent|TouchEvent} e - Pan move event
	 * @returns {boolean} False if not currently panning
	 * @override
	 */
	panMove(e) {
		if (!this.panning)
			return false;
		this.callback(...this.rangeCoords(e));
	}

	/**
	 * Handles end of pan gesture.
	 * @param {MouseEvent|TouchEvent} e - Pan end event
	 * @returns {boolean} False if not currently panning
	 * @override
	 */
	panEnd(e) {
		if (!this.panning)
			return false;
		this.panning = false;
		if (this.relative) {
			let [x, y] = this.project(e);
			this.current_x = clamp(this.speed * (x - this.start_x) + this.current_x, -1, 1);
			this.current_y = clamp(this.speed * (y - this.start_y) + this.current_y, -1, 1);
		}
		if (this.onPanEnd)
			this.onPanEnd(...this.rangeCoords(e));
	}

	/**
	 * Handles single tap/click events.
	 * Only processes events in absolute coordinate mode.
	 * @param {MouseEvent|TouchEvent} e - Tap event
	 * @override
	 */
	fingerSingleTap(e) {
		if (!this.active || !this.activeModifiers.includes(this.modifierState(e)))
			return;
		if (this.relative)
			return;

		this.callback(...this.rangeCoords(e));
		e.preventDefault();
	}

}

export { Controller2D }
