import { Transform } from "./Transform";

class FocusContext {

    /**
     *  Subdivide pan amount (delta) between lens (focus) and camera transform (context).
     * @param {*} viewport {x,y,dx,dy,w,h}
     * @param {*} focus    lens : {position,radius}
     * @param {@link Transform} context 
     * @param {*Number} delta amount of pan
     * @param {*} imageSize {w,h}
     */
    static pan(viewport, focus, context, delta, imageSize) {
        let txy = this.getAmountOfFocusContext(viewport, focus, context, delta);

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
        if (Math.abs(focus.position[0]) > imageSize.w/2) {
            focus.position[0] = imageSize.w/2 * Math.sign(focus.position[0]);
        }

        if (Math.abs(focus.position[1]) > imageSize.h/2) {
            focus.position[1] = imageSize.h/2 * Math.sign(focus.position[1]);
        } 
    }

    /**
     * Distribute scale between radius and camera scale
     * @param {@link Camera} camera 
     * @param {lens} focus position and radius
     * @param {@link Transform} context 
     * @param {* Number} dz amount of scale
     */
    static scale(camera, focus, context, dz) {
        const zoomAmountMax = 1.5;
        const zoomAmountMin = 1.3;

        const viewport = camera.viewport;
        const radiusRange = this.getRadiusRangeCanvas(viewport);
      
        const r = focus.radius * context.z;

        // Distribute lens scale between radius scale and context scale
        // When radius is going outside radius boundary, scale of the inverse amounts radius and zoom scale | screen size constant
        // When radius is changing from boundary condition to a valid one change radius of maxamount, and no change to zoom scale.
        // In between interpolate.
        const t = Math.max(0, Math.min(1, (r - radiusRange.min) / (radiusRange.max - radiusRange.min)));
        let zoomScaleAmount = dz > 1 ? 1 * (1-t) + (1 / zoomAmountMin) * t       : (1-t) * zoomAmountMin + 1 * t;
        let radiusScaleAmount = dz > 1 ? zoomAmountMax * (1-t) + zoomAmountMin * t : (1-t) / zoomAmountMin + 1 /zoomAmountMax * t;
        const newR = r * radiusScaleAmount;

        // Clamp radius
        if (newR < radiusRange.min) {
            radiusScaleAmount = radiusRange.min / r;
        } else if (newR > radiusRange.max) {
            radiusScaleAmount = radiusRange.max / r;
        }
        // Clamp scale
        if (context.z * zoomScaleAmount < camera.minZoom) {
            zoomScaleAmount = camera.minZoom / context.z;
        } else if (context.z * zoomScaleAmount > camera.maxZoom) {
            zoomScaleAmount = camera.maxZoom / context.z;
        }

        // Scale around lens center
        context.x += focus.position[0]*context.z*(1 - zoomScaleAmount);
        context.y -= focus.position[1]*context.z*(1 - zoomScaleAmount);
        context.z = context.z * zoomScaleAmount;  
        focus.radius *= radiusScaleAmount;
    }
        
    /**
     * Fix context scale to make projected lens fit within viewport
     * @param {*} viewport {x,y,dx,dy,w,h}
     * @param {*} focus    lens : {position,radius}
     * @param {@link Transform} context 
     */
    static adaptContextScale(viewport, focus, context) {
        const oldZ = context.z;
        const radiusRange = this.getRadiusRangeCanvas(viewport);
        const focusRadiusCanvas = focus.radius * context.z;
        if (focusRadiusCanvas < radiusRange.min) {
            context.z = radiusRange.min / focus.radius;
        } else if (focusRadiusCanvas > radiusRange.max) {
            context.z = radiusRange.max / focus.radius;
        }
    }

    /**
     * Translate context in order to put lens (focus) in focus and context condition
     * @param {*} viewport {x,y,dx,dy,w,h}
     * @param {*} focus    lens : {position,radius}
     * @param {@link Transform} context 
     */
    static adaptContextPosition(viewport, focus, context) {
        const delta = this.getCanvasBorder(focus, context);
        let box = this.getShrinkedBox(viewport, delta);
        const screenP = context.sceneToViewportCoords(viewport, focus.position);
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

    /**
     * Returns a value t which is used to distribute pan between focus and context. 
     * When it's 0.5 it's equally subdivided. When is 1, it's in focus and context
     * and only the focus can be moved
     * @param {*} viewport 
     * @param {*} focus 
     * @param {*} context 
     * @param {*} panDir 
     * @returns Return a value t in [0.5] t=0.5 : no focus and context. 1: full focus and context
     */
    static getAmountOfFocusContext(viewport, focus, context, panDir) {
        // Return a value among 0.5 and 1. 1 is full focus and context,
        // 0.5 is borderline focus and context. 
        const delta = this.getCanvasBorder(focus, context);
        const box = this.getShrinkedBox(viewport, delta);
        const p = context.sceneToViewportCoords(viewport, focus.position); 

        const halfCanvasW = viewport.w / 2 - delta;
        const halfCanvasH = viewport.h / 2 - delta;
    
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

    static getCanvasBorder(focus, context) {
        const radiusFactorFromBoundary = 1.5;
        return context.z * focus.radius * radiusFactorFromBoundary; // Distance Lens Center Canvas Border
    }
      
    static getShrinkedBox(viewport, delta) {
        const box = {
            min: [delta, delta],
            max: [viewport.w - delta, viewport.h - delta]
        };
        return box;
    }

    static getRadiusRangeCanvas(viewport) {
        const maxMinRadiusRatio = 3;
        const minRadius = Math.min(viewport.w,  viewport.h) * 0.1;
        const maxRadius = minRadius * maxMinRadiusRatio;
        return {min:minRadius, max:maxRadius};
    }

    static smoothstep(x, x0, x1) {
        if (x < x0) {
            return 0;
        } else if (x > x1) {
            return 1;
        } else {
            const t = (x - x0) / (x1 - x0);
            return t * t * (-2 * t + 3);
        }
    }

}

export { FocusContext }