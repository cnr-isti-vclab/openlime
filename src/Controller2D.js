import { BoundingBox } from './BoundingBox.js';
import { Controller } from './Controller.js'

/**
 * Callback invoked when the position (x, y) is updated.
 * @callback updatePosition
 * @param {number} x The x coordinate.
 * @param {number} y The y coordinate.
 */

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

/** **Controller2D** intercepts pan and single-tap events in the canvas and updates a 2D position (x, y) of the device pointer.
 * If `options.relative` is false the coordinates are both mapped between [-1, 1] with origin in the bottom left corner of the canvas, 
 * otherwise the coordinates have origin in the initial position of the panning and ranges both between [-1, 1] according to the distance
 * from the local origin (multiplied by a `options.speed` value).
 * When updated, the (x, y) position is passed to a `callback` for further custom computations.
 */
class Controller2D extends Controller {
	/**
	 * Instantiates a Controller2D object.
	 * @param {updatePosition} callback The callback invoked when the postion (x, y) is updated.
	 * @param {Object} [options] An object literal with controller parameters.
	 * @param {bool} options.relative=false Whether the coordinate system is local.
	 * @param {number} options.speed=2.0 Enhancement factor for computation of local coordinates.
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
		
		if(!this.box) { //FIXME What is that? Is it used?
			this.box = new BoundingBox({xLow:-0.99, yLow: -0.99, xHigh: 0.99, yHigh: 0.99});
		}

		this.panning = false;
	}

	/**
	 * Stores the final position for local coordinate system. This is a convenience function to be used in callback.
	 * @param {number} x The x-axis coordinate.
	 * @param {number} y The y-axis coordinate.
	 */
	setPosition(x, y) {
		this.current_x = x;
		this.current_y = y;
		this.callback(x, y);
	}

	/*
	 * Computes the mapping between the canvas pixel coordinates to [-1, 1].
	 * @param {event} e The device event. 
	 * @returns {{x, y}} The projected position.
	 */
	/** @ignore */
	project(e) {
		let rect = e.target.getBoundingClientRect();
		let x = 2*e.offsetX/rect.width - 1;
		let y = 2*(1 - e.offsetY/rect.height) -1;
		return [x, y]
	}

	/** @ignore */
	rangeCoords(e) {
		let [x, y] = this.project(e);

		if(this.relative) {
			x = clamp(this.speed*(x - this.start_x) + this.current_x, -1, 1);
			y = clamp(this.speed*(y - this.start_y) + this.current_y, -1, 1);
		}
		return [x, y];
	}

	/** @ignore */
	panStart(e) {
		if(!this.active || !this.activeModifiers.includes(this.modifierState(e)))
			return;

		if(this.relative) {
			let [x, y] = this.project(e);
			this.start_x = x;
			this.start_y = y;
		}
		if(this.onPanStart)
			this.onPanStart(...this.rangeCoords(e));
		this.callback(...this.rangeCoords(e));
		this.panning = true;
		e.preventDefault();
	}

	/** @ignore */
	panMove(e) {
		if(!this.panning)
			return false;
		this.callback(...this.rangeCoords(e));
	}

	/** @ignore */
	panEnd(e) {
		if(!this.panning)
			return false;
		this.panning = false;
		if(this.relative) {
			let [x, y] = this.project(e);
			this.current_x = clamp(this.speed*(x - this.start_x) + this.current_x, -1, 1);
			this.current_y = clamp(this.speed*(y - this.start_y) + this.current_y, -1, 1);
		}
		if(this.onPanEnd)
			this.onPanEnd(...this.rangeCoords(e));
	}

	/** @ignore */
	fingerSingleTap(e) {
		if(!this.active || !this.activeModifiers.includes(this.modifierState(e)))
			return;
		if(this.relative)
			return;
			
		this.callback(...this.rangeCoords(e));
		e.preventDefault();
	}

}

export { Controller2D }
