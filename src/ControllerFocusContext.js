import { ControllerLens } from './ControllerLens.js'
import { CoordinateSystem } from './CoordinateSystem.js';
import { FocusContext } from './FocusContext.js';
import { addSignals } from './Signals.js'

/**
 * Controller for handling Focus+Context visualization interactions.
 * Manages lens-based focus region and context region interactions including
 * panning, zooming, and lens radius adjustments.
 * @fires ControllerFocusContext#panStart - Emitted when a pan operation begins, with timestamp
 * @fires ControllerFocusContext#panEnd - Emitted when a pan operation ends, with timestamp
 * @fires ControllerFocusContext#pinchStart - Emitted when a pinch operation begins, with timestamp
 * @fires ControllerFocusContext#pinchEnd - Emitted when a pinch operation ends, with timestamp
 * @extends ControllerLens
 */
class ControllerFocusContext extends ControllerLens {
    /**
     * Helper method to trigger updates.
     * @param {Object} param - Object containing update method
     * @private
     */
    static callUpdate(param) {
        param.update();
    }

    /**
     * Creates a new ControllerFocusContext instance.
     * @param {Object} options - Configuration options
     * @param {number} [options.updateTimeInterval=50] - Time interval for position updates in ms
     * @param {number} [options.updateDelay=100] - Delay for position updates in ms
     * @param {number} [options.zoomDelay=150] - Delay for zoom animations in ms
     * @param {number} [options.zoomAmount=1.5] - Scale factor for zoom operations
     * @param {number} [options.priority=-100] - Controller priority
     * @param {boolean} [options.enableDirectContextControl=true] - Enable direct manipulation of context region
     * @param {Layer} options.lensLayer - Layer to use for lens visualization
     * @param {Camera} options.camera - Camera instance to control
     * @param {Canvas} options.canvas - Canvas instance to monitor
     * @throws {Error} If required options (lensLayer, camera, canvas) are missing
     */
    constructor(options) {
        super(options);
        Object.assign(this, {
            updateTimeInterval: 50,
            updateDelay: 100,
            zoomDelay: 150,
            zoomAmount: 1.5,
            priority: -100,
            enableDirectContextControl: true
        }, options);

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

        this.imageSize = { w: 1, h: 1 };
        this.FocusContextEnabled = true;

        this.centerToClickOffset = { x: 0, y: 0 };
        this.previousClickPos = { x: 0, y: 0 };
        this.currentClickPos = { x: 0, y: 0 };

        this.insideLens = { inside: false, border: false };
        this.panning = false;
        this.zooming = false;
        this.panningCamera = false;

        // Handle only camera panning
        this.startPos = { x: 0, y: 0 };
        this.initialTransform = this.camera.getCurrentTransform(performance.now());

        // Handle pinchZoom
        this.initialPinchDistance = 1;
        this.initialPinchRadius = 1;
        this.initialPinchPos = { x: 0, y: 0 };
        addSignals(ControllerFocusContext, 'panStart', 'panEnd', 'pinchStart', 'pinchEnd');
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
        this.insideLens = this.isInsideLens(p);
        const startPos = this.getPixelPosition(e);

        if (this.lensLayer.visible && this.insideLens.inside) {
            const lc = CoordinateSystem.fromSceneToViewport(this.getFocus().position, this.camera, this.useGL);

            this.centerToClickOffset = { x: startPos.x - lc.x, y: startPos.y - lc.y };
            this.currentClickPos = { x: startPos.x, y: startPos.y };
            this.panning = true;
        } else {
            if (this.enableDirectContextControl) {
                this.startPos = startPos;
                this.initialTransform = this.camera.getCurrentTransform(performance.now());
                this.camera.target = this.initialTransform.copy(); //stop animation.
                this.panningCamera = true;
            }
        }
        e.preventDefault();
        this.emit('panStart', Date.now());
        // Activate a timeout to call update() in order to update position also when mouse is clicked but steady
        // Stop the time out on panEnd
        this.timeOut = setInterval(this.update.bind(this), 50);
    }

    /**
     * Handles pan movement.
     * @param {PointerEvent} e - Pan move event
     * @override
     */
    panMove(e) {
        if (Math.abs(e.offsetX) > 64000 || Math.abs(e.offsetY) > 64000) return;
        this.currentClickPos = this.getPixelPosition(e);
        if (this.panning) {
            // Update is performed within update() function
        } else if (this.panningCamera) {
            let m = this.initialTransform;
            let dx = (this.currentClickPos.x - this.startPos.x);
            let dy = (this.currentClickPos.y - this.startPos.y);

            this.camera.setPosition(this.updateDelay, m.x + dx, m.y + dy, m.z, m.a);
        }
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
        const p = { x: (p0.x + p1.x) * 0.5, y: (p0.y + p1.y) * 0.5 };
        this.initialPinchPos = { x: (e1.offsetX + e2.offsetX) * 0.5, y: (e1.offsetY + e2.offsetY) * 0.5 };
        this.insideLens = this.isInsideLens(p);
        this.zooming = true;
        this.initialPinchDistance = this.distance(e1, e2);
        this.initialPinchRadius = this.lensLayer.getRadius();

        e1.preventDefault();
        this.emit('pinchStart', Date.now());
    }

    /**
     * Handles pinch movement.
     * @param {PointerEvent} e1 - First finger event
     * @param {PointerEvent} e2 - Second finger event
     * @override
     */
    pinchMove(e1, e2) {
        if (this.zooming) {
            const d = this.distance(e1, e2);
            const scale = d / (this.initialPinchDistance + 0.00001);
            if (this.lensLayer.visible && this.insideLens.inside) {
                const newRadius = scale * this.initialPinchRadius;
                const currentRadius = this.lensLayer.getRadius();
                const dz = newRadius / currentRadius;
                // Zoom around initial pinch pos, and not current center to avoid unwanted drifts
                this.updateRadiusAndScale(dz);
                //this.initialPinchDistance = d;
            } else {
                if (this.enableDirectContextControl) {
                    this.updateScale(this.initialPinchPos.x, this.initialPinchPos.y, scale);
                    this.initialPinchDistance = d;
                }
            }
        }
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
        this.emit('pinchEnd', Date.now());
    }

    /**
     * Starts zoom operation when clicking on lens border.
     * @param {PointerEvent} pe - Pointer event
     */
    zoomStart(pe) {
        if (this.lensLayer.visible) {
            super.zoomStart(pe);

            // Ask to call zoomUpdate at regular interval during zoommovement
            this.timeOut = setInterval(this.zoomUpdate.bind(this), 50);
        }
    }

    /**
     * Handles zoom movement when dragging lens border.
     * @param {PointerEvent} pe - Pointer event
     */
    zoomMove(pe) {
        if (this.zooming) {
            this.oldCursorPos = pe;
            let t = this.camera.getCurrentTransform(performance.now());
            // let p = t.viewportToSceneCoords(this.camera.viewport, pe); 
            const p = this.getScenePosition(pe);

            const lens = this.getFocus();
            const c = lens.position;
            let v = { x: p.x - c.x, y: p.y - c.y };
            let d = Math.sqrt(v.x * v.x + v.y * v.y);

            //Set as new radius |Click-LensCenter|(now) - |Click-LensCenter|(start)
            const radiusRange = FocusContext.getRadiusRangeCanvas(this.camera.viewport);
            const newRadius = Math.max(radiusRange.min / t.z, d - this.deltaR);
            const dz = newRadius / lens.radius;
            this.updateRadiusAndScale(dz);
        }
    }

    /**
     * Updates zoom during continuous operation.
     * @private
     */
    zoomUpdate() {
        // Give continuity to zoom  scale also when user is steady.
        // If lens border is able to reach user pointer zoom stops.
        // If this is not possible due to camera scale update, 
        // zoom will continue with a speed proportional to the radius/cursor distance

        if (this.zooming) {
            const p = this.getScenePosition(this.oldCursorPos);

            const lens = this.getFocus();
            const c = lens.position;
            let v = { x: p.x - c.x, y: p.y - c.y };
            let d = Math.sqrt(v.x * v.x + v.y * v.y);

            //Set as new radius |Click-LensCenter|(now) - |Click-LensCenter|(start)
            const radiusRange = FocusContext.getRadiusRangeCanvas(this.camera.viewport);
            let t = this.camera.getCurrentTransform(performance.now());
            const newRadius = Math.max(radiusRange.min / t.z, d - this.deltaR);
            const dz = newRadius / lens.radius;
            this.updateRadiusAndScale(dz);
        }
    }

    /**
     * Handles end of zoom operation.
     */
    zoomEnd() {
        if (this.lensLayer.visible) {
            super.zoomEnd();
            // Stop calling zoomUpdate
            clearTimeout(this.timeOut);
        }
    }

    /**
     * Handles mouse wheel events to simulate a pinch event.
     * @param {WheelEvent} e - Wheel event
     * @override
     */
    mouseWheel(e) {
        const p = this.getScenePosition(e);
        this.insideLens = this.isInsideLens(p);
        const dz = e.deltaY > 0 ? this.zoomAmount : 1 / this.zoomAmount;
        if (this.lensLayer.visible && this.insideLens.inside) {
            this.updateRadiusAndScale(dz);
        } else {
            if (this.enableDirectContextControl) {
                // Invert scale when updating scale instead of lens radius, to obtain the same zoom direction
                const p = this.getPixelPosition(e);
                this.updateScale(p.x, p.y, 1 / dz);
            }
        }
        e.preventDefault();
    }

    /**
     * Updates lens radius and adjusts camera to maintain Focus+Context condition.
     * @param {number} dz - Scale factor for radius adjustment
     */
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

    /**
     * Updates camera scale around a specific point.
     * @param {number} x - X coordinate of zoom center
     * @param {number} y - Y coordinate of zoom center
     * @param {number} dz - Scale factor
     * @private
     */
    updateScale(x, y, dz) {
        const now = performance.now();
        let context = this.camera.getCurrentTransform(now);
        const pos = CoordinateSystem.fromCanvasHtmlToScene({x,y}, this.camera, this.useGL);
        //const pos = this.camera.mapToScene(x, y, context);

        const maxDeltaZoom = this.camera.maxZoom / context.z;
        const minDeltaZoom = this.camera.minZoom / context.z;
        dz = Math.min(maxDeltaZoom, Math.max(minDeltaZoom, dz));

        // Zoom around cursor position
        this.camera.deltaZoom(this.updateDelay, dz, pos.x, pos.y);
    }

    /**
     * Handles end of pan operation.
     * @override
     */
    panEnd() {
        if (this.panning) { clearTimeout(this.timeOut); }

        this.panning = false;
        this.panningCamera = false;
        this.zooming = false;
        this.emit('panEnd', Date.now());
    }

    /**
     * Updates lens and camera positions based on current interaction.
     * @private
     */
    update() {
        if (this.panning) {
            let context = this.camera.getCurrentTransform(performance.now());
            let lensDeltaPosition = this.lastInteractionDelta();
            lensDeltaPosition.x /= context.z;
            lensDeltaPosition.y /= context.z;

            let focus = this.getFocus();
            if (this.FocusContextEnabled) {
                FocusContext.pan(this.camera.viewport, focus, context, lensDeltaPosition, this.imageSize);
                this.camera.setPosition(this.updateDelay, context.x, context.y, context.z, context.a);
            } else {
                focus.position.x += lensDeltaPosition.x;
                focus.position.y += lensDeltaPosition.y;
            }

            this.lensLayer.setCenter(focus.position.x, focus.position.y, this.updateDelay);
            this.previousClickPos = [this.currentClickPos.x, this.currentClickPos.y];
        }
    }

    /**
     * Calculates movement delta since last interaction.
     * @returns {{x: number, y: number}} Position delta
     * @private
     */
    lastInteractionDelta() {
        let result = { x: 0, y: 0 };
        // Compute delta with respect to previous position
        if (this.panning && this.insideLens.inside) {
            // For lens pan Compute delta wrt previous lens position
            const lc = CoordinateSystem.fromSceneToViewport(this.getFocus().position, this.camera, this.useGL);
            result =
            {
                x: this.currentClickPos.x - lc.x - this.centerToClickOffset.x,
                y: this.currentClickPos.y - lc.y - this.centerToClickOffset.y
            };
        } else {
            // For camera pan Compute delta wrt previous click position
            result =
            {
                x: this.currentClickPos.x - this.previousClickPos.x,
                y: this.currentClickPos.y - this.previousClickPos.y
            };
        }

        return result;
    }

    /**
     * Sets the dimensions of the dataset (image) being visualized.
     * @param {number} width - Dataset width
     * @param {number} height - Dataset height
     * @private
     */
    setDatasetDimensions(width, height) {
        this.imageSize = { w: width, h: height };
    }

    /**
     * Initializes lens position and size.
     */
    initLens() {
        const t = this.camera.getCurrentTransform(performance.now());
        const imageRadius = 100 / t.z;
        this.lensLayer.setRadius(imageRadius);
        this.lensLayer.setCenter(this.imageSize.w * 0.5, this.imageSize.h * 0.5);
    }

}

export { ControllerFocusContext }