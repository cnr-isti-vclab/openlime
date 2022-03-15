import {ControllerLens} from './ControllerLens.js'

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
        this.radiusFactorFromBoundary = 1.5; // Distance Lens Center Canvas Border in radii
        this.maxMinRadiusRatio = 3;

        this.image_width = 1;
        this.image_height = 1;
        
        this.FocusContextEnabled = true;

        this.centerToClickOffset = [0, 0];
        this.previousClickPos = [0, 0];
        this.currentClickPos = [0, 0];

        this.insideLens = false;
        
        // this.touchZoom = false;
        // this.touchZoomDist = 0;
        // this.previousTouchZoomDist = 0;
        // this.lastDeltaTouchZoomDist = 0;
    }

	panStart(e) {
        if (!this.active)
            return;
            
        const t = this.camera.getCurrentTransform(performance.now());
        const p = this.getScenePosition(e, t);
        this.panning = false;
        this.insideLens = this.isInsideLens(p);

        if (this.insideLens) {
            e.preventDefault();
            const startPos = this.getPixelPosition(e); 
            this.panning = true;

            const lc = this.getScreenPosition(this.getFocus().position, t);
            this.centerToClickOffset = [startPos[0] - lc[0], startPos[1] - lc[1]];
            this.currentClickPos = [startPos[0], startPos[1]];
        } 

        // Activate a timeout to call update() in order to update position also when mouse is clicked but steady
        // Stop the time out on panEnd
        this.timeOut = setInterval(this.update.bind(this), 20);
	}

    panMove(e) {
        if (Math.abs(e.offsetX) > 64000 || Math.abs(e.offsetY) > 64000) return;
        if(this.panning) {
            this.currentClickPos = this.getPixelPosition(e);
        }  
    }

    mouseWheel(e) {
        const p = this.getScenePosition(e);
        this.insideLens = this.isInsideLens(p);
        let focus = this.getFocus();
        const now = performance.now();
        let context = this.camera.getCurrentTransform(now);

        if (this.insideLens) {
            const dz = e.deltaY  > 0 ? this.zoomAmount : 1/this.zoomAmount;
            this.scaleLensContext(focus, context, dz);
        } else {
            const pos = this.camera.mapToScene(e.offsetX, e.offsetY, this.camera.getCurrentTransform(now));
            let dz =  e.deltaY < 0 ? this.zoomAmount : 1/this.zoomAmount;

            // Clamp to zoom limits
            const maxDeltaZoom = this.camera.maxZoom / context.z;
            const minDeltaZoom = this.camera.minZoom / context.z;
            dz = Math.min(maxDeltaZoom, Math.max(minDeltaZoom, dz));
            
            // Zoom aroun cursor position
            this.camera.deltaZoom(this.updateDelay, dz, pos.x, pos.y);
            context = this.camera.getCurrentTransform(performance.now());
        }  

        e.preventDefault();
        return true;
    }

    scaleLensContext(focus, context, dz) {
        const zoomAmountMax = 1.5;
        const zoomAmountMin = 1.3;

        const minRadius = Math.min(this.canvas.gl.canvas.clientWidth,  this.canvas.gl.canvas.clientHeight) * 0.1;
        const maxRadius = minRadius * this.maxMinRadiusRatio;
        const r = focus.radius * context.z;

        // Distribute lens scale between radius scale and context scale
        // When radius is going outside radius boundary, scale of the inverse amounts radius and zoom scale | screen size constant
        // When radius is changing from boundary condition to a valid one change radius of maxamount, and no change to zoom scale.
        // In between interpolate.
        const t = Math.max(0, Math.min(1, (r - minRadius) / (maxRadius - minRadius)));
        let zoomScaleAmount = dz > 1 ? 1 * (1-t) + (1 / zoomAmountMin) * t       : (1-t) * zoomAmountMin + 1 * t;
        let radiusScaleAmount = dz > 1 ? zoomAmountMax * (1-t) + zoomAmountMin * t : (1-t) / zoomAmountMin + 1 /zoomAmountMax * t;
        const newR = r * radiusScaleAmount;

        // Clamp radius
        if (newR < minRadius) {
            radiusScaleAmount = minRadius / r;
        } else if (newR > maxRadius) {
            radiusScaleAmount = maxRadius / r;
        }
        // Clamp scale
        if (context.z * zoomScaleAmount < this.camera.minZoom) {
            zoomScaleAmount = this.camera.minZoom / context.z;
        } else if (context.z * zoomScaleAmount > this.camera.maxZoom) {
            zoomScaleAmount = this.camera.maxZoom / context.z;
        }

        // Scale around lens center
        context.x += focus.position[0]*context.z*(1 - zoomScaleAmount);
        context.y -= focus.position[1]*context.z*(1 - zoomScaleAmount);
        context.z = context.z * zoomScaleAmount;  
        focus.radius *= radiusScaleAmount;

        // Bring the lens within the focus&context condition after a zoom operation
        if (dz != 1) {
            const delta = this.getCanvasBorder(focus, context);
            let box = this.getShrinkedBox(delta);
            const screenP = context.sceneToViewportCoords(this.camera.viewport, focus.position);
            for(let i = 0; i < 2; ++i) {
                const deltaMin = Math.max(0, (box.min[i] - screenP[i]));
                const deltaMax = Math.min(0, (box.max[i] - screenP[i]));
                let delta = deltaMin != 0 ? deltaMin : deltaMax;
                if (i == 0) {
                    context.x += delta;
                } else {
                    context.y -= delta;
                }
            }
        }

        // Apply scales
        this.camera.setPosition(this.zoomDelay, context.x, context.y, context.z, context.a);
        this.lensLayer.setRadius(focus.radius, this.zoomDelay);
    }

    panEnd() {
        this.panning = false;
        this.zooming = false;
        clearTimeout(this.timeOut);
    }

     update() {
        if (this.panning) {
            const t = this.camera.getCurrentTransform(performance.now());
            let lensDeltaPosition = this.lastInteractionDelta(t);
            lensDeltaPosition[0] /= t.z;
            lensDeltaPosition[1] /= t.z;
            this.panLens(lensDeltaPosition);
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

    panLens(delta) {
        let context = this.camera.getCurrentTransform(performance.now());
        let focus = this.getFocus();

        if (this.FocusContextEnabled) { 
            // adjust camera to maintain the focus and context condition
            let txy = this.getAmountOfFocusContext(this.camera.viewport, focus, context, delta);
            // When t is 1: already in focus&context, move only the lens.
            // When t is 0.5: border situation, move both focus & context to keep the lens steady on screen.
            // In this case the context should be moved of deltaFocus*scale to achieve steadyness.
            // Thus interpolate deltaContext between 0 and deltaFocus*s (with t ranging from 1 to 0.5)
            const deltaFocus = [delta[0] * txy[0], delta[1] * txy[1]];
            const deltaContext = [-deltaFocus[0] * context.z * 2 * (1-txy[0]), 
                                   deltaFocus[1] * context.z * 2 * (1-txy[1])];
            context.x += deltaContext[0];
            context.y += deltaContext[1];

            focus.position[0] += deltaFocus[0];
            focus.position[1] += deltaFocus[1];

            // Clamp lens position on dataset boundaries
            if (Math.abs(focus.position[0]) > this.image_width/2) {
                focus.position[0] = this.image_width/2 * Math.sign(focus.position[0]);
            }

            if (Math.abs(focus.position[1]) > this.image_height/2) {
                focus.position[1] = this.image_height/2 * Math.sign(focus.position[1]);
            } 

            // Apply changes to camera and lens
            this.camera.setPosition(this.updateDelay, context.x, context.y, context.z, context.a);
            this.lensLayer.setCenter(focus.position[0], focus.position[1], this.updateDelay);
            this.lensLayer.setRadius(focus.radius);
        } else {
            this.lensLayer.setCenter(focus.position[0] + delta[0], focus.position[1] + delta[1], this.updateDelay);
        }
    }

    getFocus() {
        const p = this.lensLayer.getCurrentCenter();
        const r = this.lensLayer.getRadius();
        return  {position: p, radius: r}
    }
    
    setDatasetDimensions(width, height) {
        this.image_width = width;
        this.image_height = height;
    }

    initLens() {
        const t = this.camera.getCurrentTransform(performance.now());
        const imageRadius = 100 / t.z;
        this.lensLayer.setRadius(imageRadius);
        this.lensLayer.setCenter(this.image_width * 0.5, this.image_height);
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
    
    getAmountOfFocusContext(viewport, focus, context, panDir) {
        // Return a value among 0.5 and 1. 1 is full focus and context,
        // 0.5 is borderline focus and context. 
        const delta = this.getCanvasBorder(focus, context);
        const box = this.getShrinkedBox(delta);
        const p = context.sceneToViewportCoords(viewport, focus.position); 

        const halfCanvasW = this.canvas.gl.canvas.clientWidth / 2 - delta;
        const halfCanvasH = this.canvas.gl.canvas.clientHeight / 2 - delta;
    
        let xDistance = (panDir[0] > 0 ?
          Math.max(0, Math.min(halfCanvasW, box.max[0] - p[0])) / (halfCanvasW) :
          Math.max(0, Math.min(halfCanvasW, p[0] - box.min[0])) / (halfCanvasW));
        xDistance = this.smoothstep(xDistance, 0, 0.75);
    
        let yDistance = (panDir[1] > 0 ?
          Math.max(0, Math.min(halfCanvasH, box.max[1] - p[1])) / (halfCanvasH) :
          Math.max(0, Math.min(halfCanvasH, p[1] - box.min[1])) / (halfCanvasH));
        yDistance = this.smoothstep(yDistance, 0, 0.75);
        
        // Use d/2+05, because when d = 0.5 camera movement = lens movement 
        // with the effect of the lens not moving from its canvas position.
        const txy =  [xDistance / 2 + 0.5, yDistance / 2 + 0.5];
        return txy;
    }

    getCanvasBorder(focus, context) {
        return context.z * focus.radius * this.radiusFactorFromBoundary; // Distance Lens Center Canvas Border
    }
      
    getShrinkedBox(delta) {
        const width = this.canvas.gl.canvas.clientWidth;
        const height = this.canvas.gl.canvas.clientHeight;
        const box = {
        min: [delta, delta],
        max: [width - delta, height - delta]
        };
        return box;
    }

    smoothstep(x, x0, x1) {
        if (x < x0) {
            return 0;
        } else if (x > x1) {
            return 1;
        } else {
            const t = (x - x0) / (x1 - x0);
            return t * t * (-2 * t + 3);
        }
    }

    // pinchStart(e0, e1) {
    //     this.touchZoom = true;
    //     this.isInteractionActive = true;

    //     const p0 = this.getScenePosition(e1);
    //     const p1 = this.getScenePosition(e2);
    //     const pc = [(p0[0]+ p1[0]) * 0.5, (p0[1] + p1[1]) * 0.5];

    //     // const d01 = [p0[0] - p1[0], p0[1] - p1[1]];
    //     // this.touchZoomDist = Math.sqrt(d01[0] * d01[0] + d01[1] * d01[1]);
    //     // this.previousTouchZoomDist = this.touchZoomDist;
    //     // this.startPos = [pc[0], pc[1]];
    
    //     if (this.isInsideLens(pc)) {
    //         this.interactionType = InteractionType.TOUCHZOOM;
    //         this.initialDistance = this.distance(e1, e2);
    //         this.initialRadius = this.lensLayer.getRadius();

    //         e1.preventDefault();
    //     }

    //     this.lastUpdateTimeEvent = new Date();
    // }

	// pinchMove(e1, e2) {
    //     if (this.zooming) {
        //     const d = this.distance(e1, e2);
        //     const scale = d / (this.initialDistance + 0.00001);
        //     const newRadius = scale * this.initialRadius;
        //     this.lensLayer.setRadius(newRadius);
    //     }
    // }

    // pinchEnd(e, x, y, scale) {
	// 	this.zooming = false;
    //  this.touchZoom = false;
    // }

}

export { ControllerFocusContext }