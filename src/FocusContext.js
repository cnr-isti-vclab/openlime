import { Transform } from "./Transform";
import { CoordinateSystem } from "./CoordinateSystem";

/**
 * The FocusContext class is responsible for identifying a good Focus and Context situation.
 * During interaction it distributes user inputs on lens, into camera and lens movement
 * in order to keep the lens in focus and context situation, within the viewport, with enough
 * space between the lens and the viewport boundaries, for both panning and zooming actions.
 * It also computes a good transform given a lens to properly display the lens within
 * the current viewport (used for stored annotations)
 */
class FocusContext {

    /**
     *  Subdivide pan amount (delta) between lens (focus) and camera transform (context).
     * @param {*} viewport {x, y, dx, dy, w, h}
     * @param {*} focus    lens : {position,radius}. Contain current lens in dataset coords, which will be updated to translated lens
     * @param {Transform} context Contain current transform, which  will be updated to translated context
     * @param {Number} delta amount of pan in dataset pixels
     * @param {*} imageSize {w,h} Size of the dataset width height (to clamp movement on boundaries)
     */
    static pan(viewport, focus, context, delta, imageSize) {
        let txy = this.getAmountOfFocusContext(viewport, focus, context, delta);

        // When t is 1: already in focus&context, move only the lens.
        // When t is 0.5: border situation, move both focus & context to keep the lens steady on screen.
        // In this case the context should be moved of deltaFocus*scale to achieve steadyness.
        // Thus interpolate deltaContext between 0 and deltaFocus*s (with t ranging from 1 to 0.5)
        const deltaFocus = {x:delta.x * txy.x, y: delta.y * txy.y};
        const deltaContext = {x:-deltaFocus.x * context.z * 2 * (1-txy.x), 
                              y:-deltaFocus.y * context.z * 2 * (1-txy.y)};
        context.x += deltaContext.x;
        context.y += deltaContext.y;

        focus.position.x += deltaFocus.x;
        focus.position.y += deltaFocus.y;

        // Clamp lens position on dataset boundaries
        if (Math.abs(focus.position.x) > imageSize.w/2) {
            focus.position.x = imageSize.w/2 * Math.sign(focus.position.x);
        }

        if (Math.abs(focus.position.y) > imageSize.h/2) {
            focus.position.y = imageSize.h/2 * Math.sign(focus.position.y);
        } 
    }

    /**
     * Distribute scale between radius and camera scale in order to keep focus and context situation
     * @param {Camera}    camera 
     * @param {*}         focus    lens : {position,radius}. Contain current lens in dataset coords, which will be updated to translated lens
     * @param {Transform} context Contain current transform, which  will be updated to translated context
     * @param {Number} dz amount of scale (which should multiply scale)
     */
    static scale(camera, focus, context, dz) {
        const viewport = camera.viewport;
        const radiusRange = this.getRadiusRangeCanvas(viewport);
      
        const r = focus.radius * context.z;

        // Distribute lens scale between radius scale and context scale
        // When radius is going outside radius boundary, scale of the inverse amounts radius and zoom scale | screen size constant
        // When radius is changing from boundary condition to a valid one change only radius  and no change to zoom scale.
        // From 0.5 to boundary condition, zoomScale vary is interpolated between 1 and 1/dz.
        
        const t = Math.max(0, Math.min(1, (r - radiusRange.min) / (radiusRange.max - radiusRange.min)));
        let zoomScaleAmount = 1;
        if (dz > 1 && t > 0.5) {
            const t1 = (t - 0.5)*2;
            zoomScaleAmount = 1 * (1-t1) + t1 / dz;
        } else if (dz < 1 && t < 0.5) {
            const t1 = 2 * t;
            zoomScaleAmount = (1 - t1) / dz + t1 * 1;
        }
        let radiusScaleAmount = dz;
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
        context.x += focus.position.x*context.z*(1 - zoomScaleAmount);
        context.y += focus.position.y*context.z*(1 - zoomScaleAmount);
        context.z = context.z * zoomScaleAmount;  
        focus.radius *= radiusScaleAmount;
    }
        
    /**
     * Adapt context in order to have focus & context condition satisfied for the requested focus
     * @param {*}         viewport {x, y, dx, dy, w, h}
     * @param {*}         focus    lens : {position,radius}. Contain current lens in dataset coords
     * @param {Transform} context Contain current transform, which  will be updated to translated context
     * @param {Number}    desiredScale context desired scale (which will be clamped within min max scale)
     */
    static adaptContext(viewport, focus, context, desiredScale) {
        // Get current projected annotation center position
        //const pOld = context.sceneToViewportCoords(viewport, focus.position);
        const useGL = true;
        const pOld = CoordinateSystem.fromSceneToViewportNoCamera(focus.position, context, viewport, useGL);
        context.z = desiredScale;

        FocusContext.adaptContextScale(viewport, focus, context);
        
        // After scale, restore projected annotation position, in order to avoid
        // moving the annotation center outside the boundaries
        //const pNew = context.sceneToViewportCoords(viewport, focus.position);
        const pNew = CoordinateSystem.fromSceneToViewportNoCamera(focus.position, context, viewport, useGL);

        const delta = {x:pNew.x - pOld.x, y:pNew.y - pOld.y};
        context.x -= delta.x;
        context.y += delta.y;

        // Force annotation inside the viewport
        FocusContext.adaptContextPosition(viewport, focus, context);
    }

    /**
     * Fix context scale to make projected lens fit within viewport.
     * @param {*} viewport {x, y, dx, dy, w, h}
     * @param {*} focus    lens : {position,radius}. Contain current lens in dataset coords
     * @param {Transform} context Contain current transform, whose scale will be updated to keep lens in focus and context after scale
     */
    static adaptContextScale(viewport, focus, context) {
        const oldZ = context.z;
        const radiusRange = this.getRadiusRangeCanvas(viewport);
        const focusRadiusCanvas = focus.radius * context.z;
        let zoomScaleAmount = 1;
        if (focusRadiusCanvas < radiusRange.min) {
            context.z = radiusRange.min / focus.radius;
            // zoomScaleAmount = (radiusRange.min / focus.radius) / context.z;
        } else if (focusRadiusCanvas > radiusRange.max) {
            context.z = radiusRange.max / focus.radius;
            // zoomScaleAmount = (radiusRange.max / focus.radius) / context.z;
        }
    }

    /**
     * Translate context in order to put lens (focus) in focus and context condition
     * @param {*} viewport {x,y,dx,dy,w,h}
     * @param {*} focus    lens : {position,radius}
     * @param {Transform} context 
     */
    static adaptContextPosition(viewport, focus, context) {
        const delta = this.getCanvasBorder(focus, context);
        let box = this.getShrinkedBox(viewport, delta);
        const useGL = true;
        const screenP = CoordinateSystem.fromSceneToViewportNoCamera(focus.position, context, viewport, useGL);
       
        const deltaMinX = Math.max(0, (box.xLow - screenP.x));
        const deltaMaxX = Math.min(0, (box.xHigh - screenP.x));
        context.x += deltaMinX != 0 ? deltaMinX : deltaMaxX;
        
        const deltaMinY = Math.max(0, (box.yLow - screenP.y));
        const deltaMaxY = Math.min(0, (box.yHigh - screenP.y));
        context.y += deltaMinY != 0 ? deltaMinY : deltaMaxY;
    }

    /**
     * @ignore
     */
    static getAmountOfFocusContext(viewport, focus, context, panDir) {
        // Returns a value t which is used to distribute pan between focus and context. 
        // Return a value among 0.5 and 1. 1 is full focus and context,
        // 0.5 is borderline focus and context. 
        const delta = this.getCanvasBorder(focus, context);
        const box = this.getShrinkedBox(viewport, delta);
        //  const p = context.sceneToViewportCoords(viewport, focus.position); 
        const useGL = true;
        const p = CoordinateSystem.fromSceneToViewportNoCamera(focus.position, context, viewport, useGL);
        

        const halfCanvasW = viewport.w / 2 - delta;
        const halfCanvasH = viewport.h / 2 - delta;
    
        let xDistance = (panDir.x > 0 ?
          Math.max(0, Math.min(halfCanvasW, box.xHigh - p.x)) / (halfCanvasW) :
          Math.max(0, Math.min(halfCanvasW, p.x - box.xLow)) / (halfCanvasW));
        xDistance = this.smoothstep(xDistance, 0, 0.75);
    
        let yDistance = (panDir.y > 0 ?
          Math.max(0, Math.min(halfCanvasH, box.yHigh - p.y)) / (halfCanvasH) :
          Math.max(0, Math.min(halfCanvasH, p.y - box.yLow)) / (halfCanvasH));
        yDistance = this.smoothstep(yDistance, 0, 0.75);
        
        // Use d/2+05, because when d = 0.5 camera movement = lens movement 
        // with the effect of the lens not moving from its canvas position.
        const txy =  {x:xDistance / 2 + 0.5, y: yDistance / 2 + 0.5};
        return txy;
    }

    /**
     * @ignore
     */
    static getCanvasBorder(focus, context) {
        // Return the min distance in canvas pixel of the lens center from the boundary.
        const radiusFactorFromBoundary = 1.5;
        return context.z * focus.radius * radiusFactorFromBoundary; // Distance Lens Center Canvas Border
    }
      
    /**
     * @ignore
     */
    static getShrinkedBox(viewport, delta) {
        // Return the viewport box in canvas pixels, shrinked of delta pixels on the min,max corners
        const box = {
           xLow:delta, 
           yLow:delta,
           xHigh:viewport.w - delta, 
           yHigh:viewport.h - delta
        };
        return box;
    }

    /**
     * @ignore
     */
    static getRadiusRangeCanvas(viewport) {
        //  Returns the acceptable lens radius range in pixel for a certain viewport
        const maxMinRadiusRatio = 3;
        const minRadius = Math.min(viewport.w,  viewport.h) * 0.1;
        const maxRadius = minRadius * maxMinRadiusRatio;
        return {min:minRadius, max:maxRadius};
    }

    /**
     * @ignore
     */
    static smoothstep(x, x0, x1) {
        // Return the smoothstep interpolation at x, between x0 and x1. 
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