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
    
    toScene(x, y) {
        // Transform canvas p to image coords
        let now = performance.now();
        const t = this.camera.getCurrentTransform(now);
        const v = this.camera.viewport; 
        const p = {x:(x - v.w/2) / t.z - t.x , // Put +w/2
                   y:(y - v.h/2) / t.z - t.y};
        
        return p;

    }

	panStart(e, x, y) {
        const p = this.toScene(x, y);
        
        if (!this.lens.isInside(p)) {
            return false;
        }
        this.startPos = p;
		this.panning = true;
		return true;
	}

	panMove(e, x, y) {
        const p = this.toScene(x, y);
        let result = false;
        if(this.panning) {
            let dx = p.x - this.startPos.x;
            let dy = p.y - this.startPos.y;
            this.lens.x += dx;
            this.lens.y += dy;
            this.startPos = {x: p.x, y: p.y };
            
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
        const p = this.toScene(x, y);
        if (!this.lens.isInside(p)) {
            return false;
        }
        console.log("ControllerLens wheel " + delta.toFixed(2));
        let factor = delta > 0 ? 1.1 : 1/1.1;
        this.lens.radius *= factor;

        return true;
    }
    
}

export { ControllerLens }