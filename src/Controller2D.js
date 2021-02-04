import { Controller } from './Controller.js'

/*
 * Controller that turn the position of the mouse on the screen to a [0,1]x[0,1] parameter
 */

class Controller2D extends Controller {

	constructor(callback, options) {
		super(options);
		Object.assign(this, {
			hover: false,    //mouseover is enough if true, otherwise needs a button down.
			panning:false,
			box: [-0.99, -0.99, 0.99, 0.99] //event mapped to this box.
		});
		this.callback = callback;
	}

	update(x, y, rect) {
		x = Math.max(0, Math.min(1, x/rect.width));
		y = Math.max(0, Math.min(1, 1 - y/rect.height));
		x = this.box[0] + x*(this.box[2] - this.box[0]);
		y = this.box[1] + y*(this.box[3] - this.box[1]);
		this.callback(x, y);
	}

	panStart(e, x, y) {
		this.panning = true;
		this.update(x, y, e.rect);
		return true;
	}

	panMove(e, x, y) {
		if(this.panning || this.hover) {
			this.update(x, y, e.rect);
			return true;
		}
		return false;
	}

	panEnd(e, x, y) {
		if(this.panning) {
			this.panning = false;
			return true;
		}
		return false;
	}

	singleTap(e, x, y) {
		this.update(x, y, e.rect);
		return true;
	}

}

export { Controller2D }
