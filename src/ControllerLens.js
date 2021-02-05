import {Controller} from './Controller.js'
import {Lens} from './Lens.js'

class ControllerLens extends Controller {
	constructor(callback, options) {

		super(options);

		this.callback = callback;
        
        if (!this.lens) {
            throw "ControllerLens lens option required";
        }
        
        if (!this.camera) {
            throw "ControllerLens camera option required";
        }
        
		this.panning = false;
    }
    
    update(x, y, rect) {
        
    }

	panStart(e, x, y) {
        y = e.rect.height - y;
        if (!this.lens.isInside(x, y)) {
            return false;
        }
        this.startPos = [x, y];
		this.panning = true;
		return true;
	}

	panMove(e, x, y) {
        y = e.rect.height - y;
        let result = false;
        if(this.panning) {
            let dx = x - this.startPos[0];
            let dy = y - this.startPos[1];
            this.lens.center[0] += dx;
            this.lens.center[1] += dy;
            this.startPos = [x, y];
            this.callback(this.lens.toVector());
            
            result = true;
        }
        return result;
	}

	panEnd(e, x, y) {
        y = e.rect.height - y;
		if(!this.panning)
			return false;
		this.panning = false;
		return true;
	}

    wheelDelta(e, x, y, delta) {
        y = e.rect.height - y;
        if (!this.lens.isInside(x, y)) {
            return false;
        }
        console.log("ControllerLens wheel " + delta.toFixed(2));
        let factor = delta > 0 ? 1.1 : 1/1.1;
        this.lens.radius *= factor;
        
        this.callback(this.lens.toVector());
        return true;
    }
    
}

export { ControllerLens }