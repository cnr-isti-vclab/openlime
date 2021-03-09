import { Controller } from './Controller.js'

/*
 * Controller that turn the position of the mouse on the screen to a [0,1]x[0,1] parameter
 * @param {Function} callback 
 */

class Controller2D extends Controller {

	constructor(callback, options) {
		super(options);

		this.callback = callback;
		if(!this.box)
			this.box = [-0.99, -0.99, 0.99, 0.99];

		this.panning = false;
	}

	update(e) {
		let rect = e.target.getBoundingClientRect();
		let x = Math.max(0, Math.min(1, e.offsetX/rect.width));
		let y = Math.max(0, Math.min(1, 1 - e.offsetY/rect.height));
		x = this.box[0] + x*(this.box[2] - this.box[0]);
		y = this.box[1] + y*(this.box[3] - this.box[1]);
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
