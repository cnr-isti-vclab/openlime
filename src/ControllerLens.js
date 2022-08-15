import {Controller} from './Controller.js'
import {CoordinateSystem} from './CoordinateSystem.js'
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
        this.startPos = {x:0, y:0};
        this.oldCursorPos = {x:0, y:0};
        this.useGL = false;
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
            const dx = p.x-this.startPos.x;
            const dy = p.y-this.startPos.y;
            const c = this.lensLayer.getTargetCenter();
    
            this.lensLayer.setCenter(c.x + dx, c.y + dy);
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
        const pc = {x:(p0.x+ p1.x) * 0.5, y: (p0.y + p1.y) * 0.5};

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


    
    /**
     * Start zoom operation clicking on lens border. Call it at start of pointerdown event on lens border
     * @param {*} pe pixel position in CanvasHtml
     */
     zoomStart(pe) {
        this.zooming = true;
        this.oldCursorPos = pe; // Used by derived class
        // const t = this.camera.getCurrentTransform(performance.now());
        // p = t.viewportToSceneCoords(this.camera.viewport, p);
        const p = this.getScenePosition(pe);
        const lens = this.getFocus();
        const r = lens.radius;
        const c = lens.position;
        let v = {x: p.x-c.x, y: p.y-c.y};
        let d = Math.sqrt(v.x*v.x + v.y*v.y);

        // Difference between radius and |Click-LensCenter| will be used by zoomMove
        this.deltaR = d - r;
    }

    /**
     * Zoom dragging lens border. Call it during pointermove event on lens border
     * @param {*} pe pixel position CanvasHTml
     */
     zoomMove(pe) {
        if (this.zooming) {
            const p = this.getScenePosition(pe);

            const lens = this.getFocus();
            const c = lens.position;
            let v = {x: p.x-c.x, y: p.y-c.y};
            let d = Math.sqrt(v.x*v.x + v.y*v.y);

            //  Set as new radius |Click-LensCenter|(now) - |Click-LensCenter|(start)
            const scale = this.camera.getCurrentTransform(performance.now()).z; 
            const radiusRange = FocusContext.getRadiusRangeCanvas(this.camera.viewport);
            const newRadius = Math.max(radiusRange.min / scale, d - this.deltaR);

            this.lensLayer.setRadius(newRadius, this.zoomDelay);
        }
    }

    /**
     * End of zoom operation on lens border
     */
    zoomEnd() {
        this.zooming = false;
    }

    getFocus() {
        const p = this.lensLayer.getCurrentCenter();
        const r = this.lensLayer.getRadius();
        return  {position: p, radius: r}
    }

    isInsideLens(p) {
        const c = this.lensLayer.getCurrentCenter();
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        const r = this.lensLayer.getRadius();
        const inside = d < r;

        const t = this.camera.getCurrentTransform(performance.now());
        const b = this.lensLayer.getBorderWidth() / t.z;
        const border = inside && d > r-b;
        //console.log("IsInside " + d.toFixed(0) + " r " + r.toFixed(0) + ", b " + b.toFixed(0) + " IN " + inside + " B " + border);
        return {inside:inside, border:border};
    }

    /**
     * Convert position from CanvasHtml to Viewport
     * @param {*} e contain offsetX,offsetY position in CanvasHtml (0,0 top,left, y Down)
     * @returns Position in Viewport (0,0 at bottom,left, y Up)
     */
    getPixelPosition(e) {
        const p = {x: e.offsetX, y: e.offsetY};
        return CoordinateSystem.fromCanvasHtmlToViewport(p, this.camera, this.useGL);
    }

    /**
     * Convert position from CanvasHtml to Scene
     * @param {*} e must contain offsetX,offsetY position in CanvasHtml (0,0 top,left, y Down)
     * @returns Point in Scene coordinates (0,0 at center, y Up)
     */
	getScenePosition(e) {
        const p = {x: e.offsetX, y: e.offsetY};
        return CoordinateSystem.fromCanvasHtmlToScene(p, this.camera, this.useGL);
    }

	distance(e1, e2) {
		return Math.sqrt(Math.pow(e1.x - e2.x, 2) + Math.pow(e1.y - e2.y, 2));
	}
}

export { ControllerLens }