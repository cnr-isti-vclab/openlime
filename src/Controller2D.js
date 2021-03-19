import { BoundingBox } from './BoundingBox.js';
import { Controller } from './Controller.js'

/*
 * Controller that turn the position of the mouse on the screen to a [0,1]x[0,1] parameter
 */

class Controller2D extends Controller {

	constructor(callback, options) {
		super(options);

		this.callback = callback;
		if(!this.box) {
			this.box = new BoundingBox({xLow:-0.99, yLow: -0.99, xHigh: 0.99, yHigh: 0.99});
		}

		this.panning = false;
	}

	update(e) {
		let rect = e.target.getBoundingClientRect();
		let x = Math.max(0, Math.min(1, e.offsetX/rect.width));
		let y = Math.max(0, Math.min(1, 1 - e.offsetY/rect.height));
		x = this.box.xLow + x*this.box.width();
		y = this.box.yLow + y*this.box.height();
		this.callback(x, y);
	}

	panStart(e) {
		if(!this.active)
			return;
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
	}

	fingerSingleTap(e) {
		this.update(e);
		e.preventDefault();
	}

}

export { Controller2D }
