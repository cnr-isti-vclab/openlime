import {Controller} from './Controller.js'
import {Lens} from './Lens.js'

class ControllerLens extends Controller {
	constructor(options) {

		super(options);

        if (!this.handleEvent) {
            throw "ControllerLens handleEvent callback option required";
        }
        
        if (!this.updatePosition) {
            throw "ControllerLens updatePosition callback option required";
        }
        if (!this.wheelEvent) {
            throw "ControllerLens wheelEvent callback option required";
        }
        if(!options.box)
            this.box = [-0.99, -0.99, 0.99, 0.99];

		this.panning = false;
    }

	update(x, y, rect) {
		x = Math.max(0, Math.min(1, x/rect.width));
		y = Math.max(0, Math.min(1, 1 - y/rect.height));
		x = this.box[0] + x*(this.box[2] - this.box[0]);
		y = this.box[1] + y*(this.box[3] - this.box[1]);
		return {x:x, y:y};
    }


	panStart(e, x, y) {
        const p = this.update(x, y, e.rect);
        this.panning = false;

        if (this.handleEvent(p.x, p.y)) {
            this.panning = true;
           
        }
        return this.panning;
	}

	panMove(e, x, y) {
        let result = false;
        if(this.panning) {
            const p = this.update(x, y, e.rect);
            this.updatePosition(p.x, p.y);
            result = true;
        }
        return result;
	}

	panEnd(e, x, y) {
		if(!this.panning)
			return false;
		this.panning = false;
		return true;
	}

    wheelDelta(e, x, y, delta) {
        const p = this.update(x, y, e.rect);
        let result = false;
        if (this.handleEvent(p.x, p.y)) {
            this.wheelEvent(delta);
            result = true;
        } 
        return result;
    }
    
}

export { ControllerLens }