import {Controller} from './Controller.js'
import { FocusContext } from './FocusContext.js';

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
        this.startPos = [0, 0];
    }

	panStart(e) {
        if (!this.active)
            return;

        const p = this.getScenePosition(e);
        this.panning = false;

        const hit = this.isInsideLens(p);
        if (hit.inside) {
            // if (hit.border) {
            //     this.zooming = true;
            //     const p = this.getPixelPosition(e);
            //     this.zoomStart(p);
            // } else {
            //     this.panning = true;
            // }
            this.panning = true;
            this.startPos = p;

            e.preventDefault();
        }
	}

	panMove(e) {
        // Discard events due to cursor outside window
        const p = this.getPixelPosition(e);
        if (Math.abs(e.offsetX) > 64000 || Math.abs(e.offsetY) > 64000) return;
        if(this.panning) {
            const p = this.getScenePosition(e);
            const dx = p[0]-this.startPos[0];
            const dy = p[1]-this.startPos[1];
            const c = this.lensLayer.getTargetCenter();
    
            this.lensLayer.setCenter(c[0] + dx, c[1] + dy);
            this.startPos = p;
            e.preventDefault();
        }
        //  else if (this.zooming) {
        //     const p = this.getPixelPosition(e);
        //     this.zoomMove(p);
        // }
	}

	panEnd(e) {
		this.panning = false;
        this.zooming = false;
	}

	pinchStart(e1, e2) {
        if (!this.active)
            return;

        const p0 = this.getScenePosition(e1);
        const p1 = this.getScenePosition(e2);
        const pc = [(p0[0]+ p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];

        if (this.isInsideLens(pc).inside) {
            this.zooming = true;
            this.initialDistance = this.distance(e1, e2);
            this.initialRadius = this.lensLayer.getRadius();
            this.startPos = pc;

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
        if (this.isInsideLens(p).inside) {
            const delta = e.deltaY > 0 ? 1 : -1;
            const factor = delta > 0 ? 1.2 : 1/1.2;
            const r = this.lensLayer.getRadius();
            this.lensLayer.setRadius(r*factor);
            this.startPos = p;

            result = true;
            e.preventDefault();
        } 
        
        return result;
    }

	getScenePosition(e, t = null) {
        let x = e.offsetX;
        let y = e.offsetY;
        let rect = e.target.getBoundingClientRect();

        // Transform canvas p to scene coords
        if (t == null) {
            let now = performance.now();
            t = this.camera.getCurrentTransform(now);
        }
        const p = t.viewportToSceneCoords(this.camera.viewport, [x, rect.height- y]);
        
        return p;
    }

	distance(e1, e2) {
		return Math.sqrt(Math.pow(e1.x - e2.x, 2) + Math.pow(e1.y - e2.y, 2));
	}

    
    /**
     * Start zoom operation clicking on lens border. Call it at start of pointerdown event on lens border
     * @param {*} p pixel position in 0,wh (y up)
     */
     zoomStart(p) {
        this.zooming = true;
        this.oldCursorPos = p; // Used by derived class
        const t = this.camera.getCurrentTransform(performance.now());
        p = t.viewportToSceneCoords(this.camera.viewport, p);
        const lens = this.getFocus();
        const r = lens.radius;
        const c = lens.position;
        const v = [p[0]-c[0], p[1]-c[1]];
        const d = Math.sqrt(v[0]*v[0] + v[1]*v[1]);

        // Difference between radius and |Click-LensCenter| will be used by zoomMove
        this.deltaR = d - r;
    }

    /**
     * Zoom dragging lens border. Call it during pointermove event on lens border
     * @param {*} p pixel position in 0,wh (y up)
     */
     zoomMove(p) {
        if (this.zooming) {
            let t = this.camera.getCurrentTransform(performance.now()); 
            p = t.viewportToSceneCoords(this.camera.viewport, p); 

            const lens = this.getFocus();
            const c = lens.position;
            const v = [p[0]-c[0], p[1]-c[1]];
            const d = Math.sqrt(v[0]*v[0] + v[1]*v[1]);

            //  Set as new radius |Click-LensCenter|(now) - |Click-LensCenter|(start)
            const radiusRange = FocusContext.getRadiusRangeCanvas(this.camera.viewport);
            const newRadius = Math.max(radiusRange.min / t.z, d - this.deltaR);

            this.lensLayer.setRadius(newRadius, this.zoomDelay);
        }
    }

    /**
     * End of zoom operation on lens border
     */
    zoomEnd() {
        this.zooming = false;
    }

    getPixelPosition(e) {
        let x = e.offsetX;
        let y = e.offsetY;
        const h = this.camera.viewport.h;
        return [x, h - y];
    }

    getFocus() {
        const p = this.lensLayer.getCurrentCenter();
        const r = this.lensLayer.getRadius();
        return  {position: p, radius: r}
    }

    isInsideLens(p) {
        const c = this.lensLayer.getCurrentCenter();
        const dx = p[0] - c[0];
        const dy = p[1] - c[1];
        const d  = Math.sqrt(dx*dx + dy*dy);
        const r = this.lensLayer.getRadius();
        const inside = d < r;

        const t = this.camera.getCurrentTransform(performance.now());
        const b = this.lensLayer.getBorderWidth() / t.z;
        const border = inside && d > r-b;
        //console.log("IsInside " + d.toFixed(0) + " r " + r.toFixed(0) + ", b " + b.toFixed(0) + " IN " + inside + " B " + border);
        return {inside:inside, border:border};
    }

}

export { ControllerLens }