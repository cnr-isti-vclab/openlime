import {ControllerLens} from './ControllerLens.js'
import { FocusContext } from './FocusContext.js';

class ControllerFocusContext extends ControllerLens {
    static callUpdate(param) {
        param.update();
    }
    
    constructor(options) {
        super(options);
        if (!options.lensLayer) {
            console.log("ControllerFocusContext lensLayer option required");
            throw "ControllerFocusContext lensLayer option required";
        }
 
        if (!options.camera) {
            console.log("ControllerFocusContext camera option required");
            throw "ControllerFocusContext camera option required";
        }

        if (!options.canvas) {
            console.log("ControllerFocusContext canvas option required");
            throw "ControllerFocusContext canvas option required";
        }

        let callback = () => {
            const discardHidden = true;
            const bbox = this.camera.boundingBox;
            this.maxDatasetSize = Math.max(bbox.width(), bbox.height());
            this.minDatasetSize = Math.min(bbox.width(), bbox.height());
            this.setDatasetDimensions(bbox.width(), bbox.height());
		};
        this.canvas.addEvent('updateSize', callback);

        this.updateTimeInterval = 10;
        this.updateDelay = 200; 
        this.zoomDelay = 200;
        this.zoomAmount = 1.2;
        this.imageSize = { w: 1, h: 1 };
        this.FocusContextEnabled = true;

        this.centerToClickOffset = [0, 0];
        this.previousClickPos = [0, 0];
        this.currentClickPos = [0, 0];

        this.insideLens = false;
        this.panning = false;
        this.zooming = false;
        this.panningCamera = false;

        // Handle only camera panning
        this.startPos = [0, 0];
        this.initialTransform = this.camera.getCurrentTransform(performance.now());
        
        // Handle pinchZoom
        this.initialPinchDistance = 1;
        this.initialPinchRadius = 1;
        this.initialPinchPos = [0,0];
    }

	panStart(e) {
        if (!this.active)
            return;
            
        const t = this.camera.getCurrentTransform(performance.now());
        const p = this.getScenePosition(e, t);
        this.panning = false;
        this.insideLens = this.isInsideLens(p);

        if (this.insideLens) {
            const startPos = this.getPixelPosition(e); 

            const lc = this.getScreenPosition(this.getFocus().position, t);
            this.centerToClickOffset = [startPos[0] - lc[0], startPos[1] - lc[1]];
            this.currentClickPos = [startPos[0], startPos[1]];
            this.panning = true;
        } else {
            this.startPos = { x: e.offsetX, y: e.offsetY };
            this.initialTransform = t;
            this.camera.target = this.initialTransform.copy(); //stop animation.
            this.panningCamera = true;
        }
        e.preventDefault();

        // Activate a timeout to call update() in order to update position also when mouse is clicked but steady
        // Stop the time out on panEnd
        this.timeOut = setInterval(this.update.bind(this), 50);
	}

    panMove(e) {
        if (Math.abs(e.offsetX) > 64000 || Math.abs(e.offsetY) > 64000) return;
        if(this.panning) {
            this.currentClickPos = this.getPixelPosition(e);
        } else if (this.panningCamera) {
            let m = this.initialTransform;
            let dx = (e.offsetX - this.startPos.x);
            let dy = (e.offsetY - this.startPos.y);

            this.camera.setPosition(this.updateDelay, m.x + dx, m.y + dy, m.z, m.a);
        }
    }

	pinchStart(e1, e2) {
        if (!this.active)
            return;

        const p0 = this.getScenePosition(e1);
        const p1 = this.getScenePosition(e2);
        const p = [(p0[0] + p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];
        this.initialPinchPos = [(e1.offsetX + e2.offsetX) * 0.5, (e1.offsetY + e2.offsetY) * 0.5];
        this.insideLens = this.isInsideLens(p);
        this.zooming = true;
        this.initialPinchDistance = this.distance(e1, e2);
        this.initialPinchRadius = this.lensLayer.getRadius();
        this.initialScale = this.camera.getCurrentTransform(performance.now()).z; 
        
        console.log("Start pinchZoom inside " + this.insideLens);

        e1.preventDefault();
	}

	pinchMove(e1, e2) {
        if (this.zooming) {
            const d = this.distance(e1, e2);
            const scale = d / (this.initialPinchDistance + 0.00001);
            if (this.insideLens) {
                const newRadius = scale * this.initialPinchRadius;
                const currentRadius = this.lensLayer.getRadius();
                const dz = newRadius / currentRadius;
                // Zoom around initial pinch pos, and not current center to avoid unwanted drifts
                //console.log("D " + d.toFixed(2) + "/ InitD " + this.initialPinchDistance.toFixed(2) + " =Sc " + scale.toFixed(2));
                this.updateRadiusAndScale(dz);
                //this.initialPinchDistance = d;
            } else {
                this.updateScale(this.initialPinchPos[0], this.initialPinchPos[1], scale);
                this.initialPinchDistance = d;
            }
        }
    }

    pinchEnd(e, x, y, scale) {
		this.zooming = false;
    }

    mouseWheel(e) {
        const p = this.getScenePosition(e);
        this.insideLens = this.isInsideLens(p);
        const dz = e.deltaY  > 0 ? this.zoomAmount : 1/this.zoomAmount;
        if (this.insideLens) {
            this.updateRadiusAndScale(dz);
        } else {
            // Invert scale when updating scale instead of lens radius, to obtain the same zoom direction
            this.updateScale(e.offsetX, e.offsetY, 1/dz);
        }
        e.preventDefault();
    }

    updateRadiusAndScale(dz) {
        let focus = this.getFocus();
        const now = performance.now();
        let context = this.camera.getCurrentTransform(now);

        // Subdivide zoom between focus and context
        FocusContext.scale(this.camera, focus, context, dz);
        
        // Bring focus within context constraints
        FocusContext.adaptContextPosition(this.camera.viewport, focus, context);
        
        // Set new focus and context in camera and lens
        this.camera.setPosition(this.zoomDelay, context.x, context.y, context.z, context.a);
        this.lensLayer.setRadius(focus.radius, this.zoomDelay);
    }

    updateScale(x, y, dz) {
        const now = performance.now();
        let context = this.camera.getCurrentTransform(now);
        const pos = this.camera.mapToScene(x, y, context);

        const maxDeltaZoom = this.camera.maxZoom / context.z;
        const minDeltaZoom = this.camera.minZoom / context.z;
        dz = Math.min(maxDeltaZoom, Math.max(minDeltaZoom, dz));
        
        // Zoom around cursor position
        this.camera.deltaZoom(this.updateDelay, dz, pos.x, pos.y);
    }

    panEnd() {
        this.panning = false;
        this.panningCamera = false;
        this.zooming = false;
        clearTimeout(this.timeOut);
    }

     update() {
        if (this.panning) {
            const t = this.camera.getCurrentTransform(performance.now());
            let lensDeltaPosition = this.lastInteractionDelta(t);
            lensDeltaPosition[0] /= t.z;
            lensDeltaPosition[1] /= t.z;

            let context = this.camera.getCurrentTransform(performance.now());
            let focus = this.getFocus();
            if (this.FocusContextEnabled) {
                FocusContext.pan(this.camera.viewport, focus, context, lensDeltaPosition, this.imageSize);
                this.camera.setPosition(this.updateDelay, context.x, context.y, context.z, context.a);
            } else {
                focus.position[0] += lensDeltaPosition[0];
                focus.position[1] += lensDeltaPosition[1];
            }

            this.lensLayer.setCenter(focus.position[0], focus.position[1], this.updateDelay);
            this.previousClickPos = [this.currentClickPos[0], this.currentClickPos[1]];
        } 
    }

    lastInteractionDelta(t) {
        let result = [0, 0];
        // Compute delta with respect to previous position
        if (this.panning && this.insideLens) {
            // For lens pan Compute delta wrt previous lens position
            const lc = this.getScreenPosition(this.getFocus().position, t);
            result =
                [this.currentClickPos[0] - lc[0] - this.centerToClickOffset[0],
                 this.currentClickPos[1] - lc[1] - this.centerToClickOffset[1]];
        } else {
            // For camera pan Compute delta wrt previous click position
            result = 
                [this.currentClickPos[0] - this.previousClickPos[0],
                 this.currentClickPos[1] - this.previousClickPos[1]];
        }
      
        return result;
    }

    getFocus() {
        const p = this.lensLayer.getCurrentCenter();
        const r = this.lensLayer.getRadius();
        return  {position: p, radius: r}
    }
    
    setDatasetDimensions(width, height) {
        this.imageSize = {w: width, h:height};
    }

    initLens() {
        const t = this.camera.getCurrentTransform(performance.now());
        const imageRadius = 100 / t.z;
        this.lensLayer.setRadius(imageRadius);
        this.lensLayer.setCenter(this.imageSize.w * 0.5, this.imageSize.h*0.5);
    }
    
    getPixelPosition(e) {
        let x = e.offsetX;
        let y = e.offsetY;
        let rect = e.target.getBoundingClientRect();
        return [x, rect.height - y];
    }

    getScreenPosition(p, t) {
        // Transform from p expressed wrt world center (at dataset center is 0,0)
        // to Viewport coords 0,w 0,h
        const c = t.sceneToViewportCoords(this.camera.viewport, p);
        return c;
    }

    isInsideLens(p) {
        const c = this.lensLayer.getTargetCenter();
        const dx = p[0] - c[0];
        const dy = p[1] - c[1];
        const d = Math.sqrt(dx*dx + dy*dy);
        const r = this.lensLayer.getRadius();
        const within = d < r;
        //const onBorder = within && d >= r-this.lensLayer.border;
        return within;
    }

}

export { ControllerFocusContext }