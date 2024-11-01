import { Transform } from "./Transform";
import { CoordinateSystem } from "./CoordinateSystem";

/**
 * @typedef {Object} Viewport
 * @property {number} x - Viewport x position
 * @property {number} y - Viewport y position
 * @property {number} dx - Viewport horizontal offset
 * @property {number} dy - Viewport vertical offset
 * @property {number} w - Viewport width
 * @property {number} h - Viewport height
 */

/**
 * @typedef {Object} Focus
 * @property {Object} position - Lens center position in dataset coordinates
 * @property {number} position.x - X coordinate
 * @property {number} position.y - Y coordinate
 * @property {number} radius - Lens radius in dataset units
 */

/**
 * FocusContext manages the focus+context visualization technique for lens-based interaction.
 * It handles the distribution of user interactions between lens movement (focus) and camera
 * movement (context) to maintain optimal viewing conditions.
 * 
 * Key responsibilities:
 * - Maintains proper spacing between lens and viewport boundaries
 * - Distributes pan and zoom operations between lens and camera
 * - Ensures lens stays within valid viewport bounds
 * - Adapts camera transform to accommodate lens position
 * - Manages lens radius constraints
 */
class FocusContext {
    /**
     * Distributes a pan operation between lens movement and camera transform to maintain focus+context
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object to be updated
     * @param {Transform} context - The camera transform to be updated
     * @param {Object} delta - Pan amount in dataset pixels
     * @param {number} delta.x - Horizontal pan amount
     * @param {number} delta.y - Vertical pan amount
     * @param {Object} imageSize - Dataset dimensions
     * @param {number} imageSize.w - Dataset width
     * @param {number} imageSize.h - Dataset height
     */

    static pan(viewport, focus, context, delta, imageSize) {
        let txy = this.getAmountOfFocusContext(viewport, focus, context, delta);

        // When t is 1: already in focus&context, move only the lens.
        // When t is 0.5: border situation, move both focus & context to keep the lens steady on screen.
        // In this case the context should be moved of deltaFocus*scale to achieve steadyness.
        // Thus interpolate deltaContext between 0 and deltaFocus*s (with t ranging from 1 to 0.5)
        const deltaFocus = { x: delta.x * txy.x, y: delta.y * txy.y };
        const deltaContext = {
            x: -deltaFocus.x * context.z * 2 * (1 - txy.x),
            y: -deltaFocus.y * context.z * 2 * (1 - txy.y)
        };
        context.x += deltaContext.x;
        context.y += deltaContext.y;

        focus.position.x += deltaFocus.x;
        focus.position.y += deltaFocus.y;

        // Clamp lens position on dataset boundaries
        if (Math.abs(focus.position.x) > imageSize.w / 2) {
            focus.position.x = imageSize.w / 2 * Math.sign(focus.position.x);
        }

        if (Math.abs(focus.position.y) > imageSize.h / 2) {
            focus.position.y = imageSize.h / 2 * Math.sign(focus.position.y);
        }
    }

    /**
     * Distributes a scale operation between lens radius and camera zoom to maintain focus+context
     * @param {Camera} camera - The camera object containing viewport and zoom constraints
     * @param {Focus} focus - The lens object to be updated
     * @param {Transform} context - The camera transform to be updated
     * @param {number} dz - Scale factor to be applied (multiplier)
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
            const t1 = (t - 0.5) * 2;
            zoomScaleAmount = 1 * (1 - t1) + t1 / dz;
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
        context.x += focus.position.x * context.z * (1 - zoomScaleAmount);
        context.y += focus.position.y * context.z * (1 - zoomScaleAmount);
        context.z = context.z * zoomScaleAmount;
        focus.radius *= radiusScaleAmount;
    }

    /**
     * Adjusts the camera transform to ensure focus+context conditions are met for a given lens
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The camera transform to be updated
     * @param {number} desiredScale - Target scale for the camera transform
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

        const delta = [pNew.x - pOld.x, pNew.y - pOld.y];
        context.x -= delta.x;
        context.y += delta.y;

        // Force annotation inside the viewport
        FocusContext.adaptContextPosition(viewport, focus, context);
    }

    /**
     * Adjusts camera scale to ensure projected lens fits within viewport bounds
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The camera transform to be updated
     * @private
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
     * Adjusts camera position to maintain proper focus+context conditions
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The camera transform to be updated
     * @private
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
     * Calculates focus+context distribution factors for pan operations
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The current camera transform
     * @param {Object} panDir - Pan direction vector
     * @param {number} panDir.x - Horizontal direction (-1 to 1)
     * @param {number} panDir.y - Vertical direction (-1 to 1)
     * @returns {Object} Distribution factors for x and y directions (0.5 to 1)
     * @private
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
            Math.max(0, Math.min(halfCanvasW, p.x - box.xLow)) / (    /**
                * Distributes a pan operation between lens movement and camera transform to maintain focus+context
                * @param {Viewport} viewport - The current viewport
                * @param {Focus} focus - The lens object to be updated
                * @param {Transform} context - The camera transform to be updated
                * @param {Object} delta - Pan amount in dataset pixels
                * @param {number} delta.x - Horizontal pan amount
                * @param {number} delta.y - Vertical pan amount
                * @param {Object} imageSize - Dataset dimensions
                * @param {number} imageSize.w - Dataset width
                * @param {number} imageSize.h - Dataset height
                */halfCanvasW));
        xDistance = this.smoothstep(xDistance, 0, 0.75);

        let yDistance = (panDir.y > 0 ?
            Math.max(0, Math.min(halfCanvasH, box.yHigh - p.y)) / (halfCanvasH) :
            Math.max(0, Math.min(halfCanvasH, p.y - box.yLow)) / (halfCanvasH));
        yDistance = this.smoothstep(yDistance, 0, 0.75);

        // Use d/2+05, because when d = 0.5 camera movement = lens movement 
        // with the effect of the lens not moving from its canvas position.
        const txy = { x: xDistance / 2 + 0.5, y: yDistance / 2 + 0.5 };
        return txy;
    }

    /**
     * Calculates minimum required distance between lens center and viewport boundary
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The camera transform
     * @returns {number} Minimum distance in canvas pixels
     * @private
     */
    static getCanvasBorder(focus, context) {
        // Return the min distance in canvas pixel of the lens center from the boundary.
        const radiusFactorFromBoundary = 1.5;
        return context.z * focus.radius * radiusFactorFromBoundary; // Distance Lens Center Canvas Border
    }

    /**
     * Creates a viewport box shrunk by specified padding
     * @param {Viewport} viewport - The current viewport
     * @param {number} delta - Padding amount in pixels
     * @returns {Object} Box with xLow, yLow, xHigh, yHigh coordinates
     * @private
     */
    static getShrinkedBox(viewport, delta) {
        // Return the viewport box in canvas pixels, shrinked of delta pixels on the min,max corners
        const box = {
            xLow: delta,
            yLow: delta,
            xHigh: viewport.w - delta,
            yHigh: viewport.h - delta
        };
        return box;
    }

    /**
     * Calculates acceptable lens radius range for current viewport
     * @param {Viewport} viewport - The current viewport
     * @returns {Object} Range object with min and max radius values in pixels
     * @private
     */
    static getRadiusRangeCanvas(viewport) {
        //  Returns the acceptable lens radius range in pixel for a certain viewport
        const maxMinRadiusRatio = 3;
        const minRadius = Math.min(viewport.w, viewport.h) * 0.1;
        const maxRadius = minRadius * maxMinRadiusRatio;
        return { min: minRadius, max: maxRadius };
    }

    /**
     * Implements smoothstep interpolation between two values
     * @param {number} x - Input value
     * @param {number} x0 - Lower bound
     * @param {number} x1 - Upper bound
     * @returns {number} Smoothly interpolated value between 0 and 1
     * @private
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