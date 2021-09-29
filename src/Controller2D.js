import { BoundingBox } from './BoundingBox.js';
import { Controller } from './Controller.js'

/*
 * Controller that turn the position of the mouse on the screen to a [0,1]x[0,1] parameter
 * @param {Function} callback 
 * Options: relative (
 */

function clamp(value, min, max) {
	return Math.max(min, Math.min(max, value));
}

class Controller2D extends Controller {

	constructor(callback, options) {
		super(options);
		Object.assign(this, { relative: false, speed: 2.0, start_x: 0, start_y: 0, current_x: 0, current_y: 0 }, options);

		//By default the controller is active only with no modifiers.
		//you can select which subsets of the modifiers are active.
		this.callback = callback;
		
		if(!this.box) {
			this.box = new BoundingBox({xLow:-0.99, yLow: -0.99, xHigh: 0.99, yHigh: 0.99});
		}

		this.panning = false;
	}
	//TODO find a decent name for functions and variables!
	setPosition(x, y) {
		this.current_x = x;
		this.current_y = y;
		this.callback(x, y);
	}

	project(e) {
		let rect = e.target.getBoundingClientRect();
		let x = 2*e.offsetX/rect.width - 1;
		let y = 2*(1 - e.offsetY/rect.height) -1;
		return [x, y]
	}

	update(e) {
		let [x, y] = this.project(e);

		if(this.relative) {
			x = clamp(this.speed*(x - this.start_x) + this.current_x, -1, 1);
			y = clamp(this.speed*(y - this.start_y) + this.current_y, -1, 1);
		}

		this.callback(x, y);
	}

	panStart(e) {
		if(!this.active || !this.activeModifiers.includes(this.modifierState(e)))
			return;

		if(this.relative) {
			let [x, y] = this.project(e);
			this.start_x = x;
			this.start_y = y;
		}
		
		this.update(e);
		this.panning = true;
		e.preventDefault();
	}

	panMove(e) {
		if(!this.panning)
			return false;
		this.update(e);
	}

	panEnd(e) {
		if(!this.panning)
			return false;
		this.panning = false;
		if(this.relative) {
			let [x, y] = this.project(e);
			this.current_x = clamp(this.speed*(x - this.start_x) + this.current_x, -1, 1);
			this.current_y = clamp(this.speed*(y - this.start_y) + this.current_y, -1, 1);
		}
	}

	fingerSingleTap(e) {
		if(!this.active || !this.activeModifiers.includes(this.modifierState(e)))
			return;
		if(this.relative)
			return;
		this.update(e);
		e.preventDefault();
	}

}

export { Controller2D }
