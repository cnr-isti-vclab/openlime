import { Controller } from './Controller.js'
import { CoordinateSystem } from './CoordinateSystem.js'
import { FocusContext } from './FocusContext.js';

/**
 * Controller for handling lens-based interactions.
 * Manages user interactions with a lens overlay including panning, zooming,
 * and lens radius adjustments through mouse/touch events.
 * @extends Controller
 */
class ControllerLens extends Controller {
    /**
     * Creates a new ControllerLens instance.
     * @param {Object} options - Configuration options
     * @param {Object} options.lensLayer - Layer used for lens visualization
     * @param {Camera} options.camera - Camera instance to control
     * @param {boolean} [options.useGL=false] - Whether to use WebGL coordinates
     * @param {boolean} [options.active=true] - Whether the controller is initially active
     * @throws {Error} If required options (lensLayer, camera) are missing
     */
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
        this.startPos = { x: 0, y: 0 };
        this.oldCursorPos = { x: 0, y: 0 };
        this.useGL = false;
    }

    /**
     * Handles start of pan operation.
     * @param {PointerEvent} e - Pan start event
     * @override
     */
    panStart(e) {
        if (!this.active)
            return;

        const p = this.getScenePosition(e);
        this.panning = false;

        const hit = this.isInsideLens(p);
        if (this.lensLayer.visible && hit.inside) {
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

    /**
     * Handles pan movement.
     * @param {PointerEvent} e - Pan move event
     * @override
     */
    panMove(e) {
        // Discard events due to cursor outside window
        const p = this.getPixelPosition(e);
        if (Math.abs(e.offsetX) > 64000 || Math.abs(e.offsetY) > 64000) return;
        if (this.panning) {
            const p = this.getScenePosition(e);
            const dx = p.x - this.startPos.x;
            const dy = p.y - this.startPos.y;
            const c = this.lensLayer.getTargetCenter();

            this.lensLayer.setCenter(c.x + dx, c.y + dy);
            this.startPos = p;
            e.preventDefault();
        }
    }

    /**
     * Handles end of pan operation.
     * @param {PointerEvent} e - Pan end event
     * @override
     */
    panEnd(e) {
        this.panning = false;
        this.zooming = false;
    }

    /**
     * Handles start of pinch operation.
     * @param {PointerEvent} e1 - First finger event
     * @param {PointerEvent} e2 - Second finger event
     * @override
     */
    pinchStart(e1, e2) {
        if (!this.active)
            return;

        const p0 = this.getScenePosition(e1);
        const p1 = this.getScenePosition(e2);
        const pc = { x: (p0.x + p1.x) * 0.5, y: (p0.y + p1.y) * 0.5 };

        if (this.lensLayer.visible && this.isInsideLens(pc).inside) {
            this.zooming = true;
            this.initialDistance = this.distance(e1, e2);
            this.initialRadius = this.lensLayer.getRadius();
            this.startPos = pc;

            e1.preventDefault();
        }
    }

    /**
     * Handles pinch movement.
     * @param {PointerEvent} e1 - First finger event
     * @param {PointerEvent} e2 - Second finger event
     * @override
     */
    pinchMove(e1, e2) {
        if (!this.zooming)
            return;
        const d = this.distance(e1, e2);
        const scale = d / (this.initialDistance + 0.00001);
        const newRadius = scale * this.initialRadius;
        this.lensLayer.setRadius(newRadius);
    }

    /**
     * Handles end of pinch operation.
     * @param {PointerEvent} e - End event
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} scale - Final scale value
     * @override
     */
    pinchEnd(e, x, y, scale) {
        this.zooming = false;
    }

    /**
     * Handles mouse wheel events.
     * @param {WheelEvent} e - Wheel event
     * @returns {boolean} True if event was handled
     * @override
     */
    mouseWheel(e) {
        const p = this.getScenePosition(e);
        let result = false;
        if (this.lensLayer.visible && this.isInsideLens(p).inside) {
            const delta = e.deltaY > 0 ? 1 : -1;
            const factor = delta > 0 ? 1.2 : 1 / 1.2;
            const r = this.lensLayer.getRadius();
            this.lensLayer.setRadius(r * factor);
            this.startPos = p;

            result = true;
            e.preventDefault();
        }

        return result;
    }

    /**
     * Initiates zoom operation when clicking on lens border.
     * @param {Object} pe - Pixel position in canvas coordinates
     * @param {number} pe.offsetX - X offset from canvas left
     * @param {number} pe.offsetY - Y offset from canvas top
     */
    zoomStart(pe) {
        if (!this.lensLayer.visible) return;

        this.zooming = true;
        this.oldCursorPos = pe; // Used by derived class
        const p = this.getScenePosition(pe);
        const lens = this.getFocus();
        const r = lens.radius;
        const c = lens.position;
        let v = { x: p.x - c.x, y: p.y - c.y };
        let d = Math.sqrt(v.x * v.x + v.y * v.y);

        // Difference between radius and |Click-LensCenter| will be used by zoomMove
        this.deltaR = d - r;
    }

    /**
     * Updates zoom when dragging lens border.
     * @param {Object} pe - Pixel position in canvas coordinates
     * @param {number} pe.offsetX - X offset from canvas left
     * @param {number} pe.offsetY - Y offset from canvas top
     */
    zoomMove(pe) {
        if (this.zooming) {
            const p = this.getScenePosition(pe);

            const lens = this.getFocus();
            const c = lens.position;
            let v = { x: p.x - c.x, y: p.y - c.y };
            let d = Math.sqrt(v.x * v.x + v.y * v.y);

            //  Set as new radius |Click-LensCenter|(now) - |Click-LensCenter|(start)
            const scale = this.camera.getCurrentTransform(performance.now()).z;
            const radiusRange = FocusContext.getRadiusRangeCanvas(this.camera.viewport);
            const newRadius = Math.max(radiusRange.min / scale, d - this.deltaR);

            this.lensLayer.setRadius(newRadius, this.zoomDelay);
        }
    }

    /**
     * Ends zoom operation.
     */
    zoomEnd() {
        this.zooming = false;
    }

    /**
     * Gets current focus state.
     * @returns {{position: {x: number, y: number}, radius: number}} Focus state object
     */
    getFocus() {
        const p = this.lensLayer.getCurrentCenter();
        const r = this.lensLayer.getRadius();
        return { position: p, radius: r }
    }

    /**
     * Checks if a point is inside the lens.
     * @param {Object} p - Point to check in scene coordinates
     * @param {number} p.x - X coordinate
     * @param {number} p.y - Y coordinate
     * @returns {{inside: boolean, border: boolean}} Whether point is inside lens and/or on border
     */
    isInsideLens(p) {
        const c = this.lensLayer.getCurrentCenter();
        const dx = p.x - c.x;
        const dy = p.y - c.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        const r = this.lensLayer.getRadius();
        const inside = d < r;

        const t = this.camera.getCurrentTransform(performance.now());
        const b = this.lensLayer.getBorderWidth() / t.z;
        const border = inside && d > r - b;
        //console.log("IsInside " + d.toFixed(0) + " r " + r.toFixed(0) + ", b " + b.toFixed(0) + " IN " + inside + " B " + border);
        return { inside: inside, border: border };
    }

    /**
     * Converts position from canvas HTML coordinates to viewport coordinates.
     * @param {PointerEvent} e - event
     * @returns {{x: number, y: number}} Position in viewport coordinates (origin at bottom-left, y up)
     */
    getPixelPosition(e) {
        const p = { x: e.offsetX, y: e.offsetY };
        return CoordinateSystem.fromCanvasHtmlToViewport(p, this.camera, this.useGL);
    }

    /**
     * Converts position from canvas HTML coordinates to scene coordinates.
     * @param {PointerEvent} e - event
     * @returns {{x: number, y: number}} Position in scene coordinates (origin at center, y up)
     */
    getScenePosition(e) {
        const p = { x: e.offsetX, y: e.offsetY };
        return CoordinateSystem.fromCanvasHtmlToScene(p, this.camera, this.useGL);
    }

    /**
     * Calculates distance between two points.
     * @param {PointerEvent} e1 - event
     * @param {PointerEvent} e2 - event
     * @returns {number} Distance between points
     * @private
     */
    distance(e1, e2) {
        return Math.sqrt(Math.pow(e1.x - e2.x, 2) + Math.pow(e1.y - e2.y, 2));
    }
}

export { ControllerLens }