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
        if(!this.box)
            this.box = [-0.99, -0.99, 0.99, 0.99];

		this.panning = false;
    }


	getPosition(e) {
        let x = e.offsetX;
        let y = e.offsetY;
        let rect = e.target.getBoundingClientRect();
		x = Math.max(0, Math.min(1, x/rect.width));
		y = Math.max(0, Math.min(1, 1 - y/rect.height));
		x = this.box[0] + x*(this.box[2] - this.box[0]);
		y = this.box[1] + y*(this.box[3] - this.box[1]);
		return {x:x, y:y};
    }

	panStart(e) {
        const p = this.getPosition(e);
        this.panning = false;

        if (this.handleEvent(p.x, p.y)) {
            this.panning = true;
            e.preventDefault();
           
        }
        return this.panning;
	}

	panMove(e) {
        let result = false;
        if(this.panning) {
            const p = this.getPosition(e);
            this.updatePosition(p.x, p.y);
            result = true;
        }
        return result;
	}

	panEnd(e) {
		if(!this.panning)
			return false;
		this.panning = false;
		return true;
	}

    mouseWheel(e) {
        const p = this.getPosition(e);
        let result = false;
        if (this.handleEvent(p.x, p.y)) {
            let delta = e.deltaY > 0 ? 1 : -1;
		    this.wheelEvent(delta);
            result = true;
            e.preventDefault();
        } 
        
        return result;
    }
    
}

export { ControllerLens }