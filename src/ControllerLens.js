import {Controller} from './Controller.js'
import {Lens} from './Lens.js'


class ControllerLens extends Controller {
	constructor(options) {

		super(options);

        if (!options.lensLayer) {
            console.log("ControllerLens lensLayer option required");
            throw "ControllerLens lensLayer option required";
        }
 
        if (!options.camera) {
            console.log("ControllerLens camera option required");
            throw "ControllerLens camera option required";
        }

        this.panning = false;
        this.zooming = false;
        this.initialDistance = 0;
    }

	panStart(e) {
        if (!this.active)
            return;

        const p = this.getScenePosition(e);
        this.panning = false;

        if (this.isInsideLens(p)) {
            this.panning = true;
            e.preventDefault();
           
        }
	}

	panMove(e) {
        // Discard events due to cursor outside window
        if (Math.abs(e.offsetX) > 64000 || Math.abs(e.offsetY) > 64000) return;
        if(this.panning) {
            const p = this.getScenePosition(e);
            const dx = p[0]-this.startPos[0];
            const dy = p[1]-this.startPos[1];
            const c = this.lensLayer.getTargetCenter();
    
            this.lensLayer.setCenter(c[0] + dx, c[1] + dy);
            this.startPos = p;
        }
	}

	panEnd(e) {
		if(!this.panning)
			return;
		this.panning = false;
	}

	pinchStart(e1, e2) {
        if (!this.active)
            return;

        const p0 = this.getScenePosition(e1);
        const p1 = this.getScenePosition(e2);
        const pc = [(p0[0]+ p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];

        if (this.isInsideLens(pc)) {
            this.zooming = true;
            this.initialDistance = this.distance(e1, e2);
            this.initialRadius = this.lensLayer.getRadius();

            e1.preventDefault();
        } 
	}

	pinchMove(e1, e2) {
		if (!this.zooming)
            return;
        const d = this.distance(e1, e2);
		const scale = d / (this.initialDistance + 0.00001);
        const newRadius = scale * this.initialRadius;
        this.lensLayer.setRadius(newRadius);
	}

	pinchEnd(e, x, y, scale) {
		this.zooming = false;
    }
    
    mouseWheel(e) {
        const p = this.getScenePosition(e);
        let result = false;
        if (this.isInsideLens(p)) {
            const delta = e.deltaY > 0 ? 1 : -1;
            const factor = delta > 0 ? 1.2 : 1/1.2;
            const r = this.lensLayer.getRadius();
            this.lensLayer.setRadius(r*factor);

            result = true;
            e.preventDefault();
        } 
        
        return result;
    }

	getScenePosition(e) {
        let x = e.offsetX;
        let y = e.offsetY;
        let rect = e.target.getBoundingClientRect();

        // Transform canvas p to scene coords
        let now = performance.now();
        const t = this.camera.getCurrentTransform(now);
        const p = t.viewportToSceneCoords(this.camera.viewport, [x, rect.height- y]);
        
        return p;
    }

	distance(e1, e2) {
		return Math.sqrt(Math.pow(e1.x - e2.x, 2) + Math.pow(e1.y - e2.y, 2));
	}

    isInsideLens(p) {
        const c = this.lensLayer.getCurrentCenter();
        const dx = p[0] - c[0];
        const dy = p[1] - c[1];
        const d2 = dx*dx + dy*dy;
        const r = this.lensLayer.getRadius();
        const res = d2 < r * r;
        if (res) { this.startPos = p;}
        return res;
    }
}

export { ControllerLens }