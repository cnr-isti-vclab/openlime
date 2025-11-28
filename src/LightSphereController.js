/*
 * @fileoverview
 * LightSphereController module provides a spherical interface for controlling light direction.
 * It creates a circular canvas-based UI element that allows users to interactively adjust
 * lighting direction through pointer interactions.
 */

/**
 * LightSphereController creates an interactive sphere UI for light direction control.
 * Features:
 * - Circular interface with configurable radial gradient background
 * - Pointer-based interaction for light direction on a unit hemisphere
 * - Configurable size, position, and colors
 * - Minimum polar angle (theta) constraint to avoid grazing angles
 * - Optional visualization of training light directions as markers
 * - Optional snapping to the nearest training light direction
 * - Visual feedback with a movable marker and live-updated gradient
 * @class
 */
class LightSphereController {
    /**
     * Creates a new LightSphereController instance.
     * @param {HTMLElement|string} parent - Parent element or selector where the controller will be mounted
     * @param {Object} [options] - Configuration options
     * @param {number} [options.width=128] - Width of the controller in pixels
     * @param {number} [options.height=128] - Height of the controller in pixels
     * @param {number} [options.top=60] - Top position offset in pixels from the top of the parent
     * @param {number} [options.right=0] - Right position offset in pixels from the right edge of the parent
     * @param {number} [options.thetaMin=0] - Minimum polar angle in degrees (constrains interaction radius)
     * @param {string} [options.colorSpot='#ffffff'] - Color of the inner spot of the radial gradient
     * @param {string} [options.colorBkg='#0000ff'] - Color of the outer edge of the radial gradient
     * @param {string} [options.colorMark='#ff0000'] - Color of the main position marker
     * @param {boolean} [options.enableLightMarkers=false] - Whether to draw training light directions as small markers
     * @param {boolean} [options.enableLightSnap=false] - Whether to snap to the nearest training light direction on pointer release
     * @param {string} [options.lightMarkerColor='#3d3d3dff'] - Fill color used for training light direction markers
     */
    constructor(parent, options) {
        options = Object.assign({
            width: 128,
            height: 128,
            top: 60,
            right: 0,
            thetaMin: 0,
            colorSpot: '#ffffff',
            colorBkg: '#0000ff',
            colorMark: '#ff0000',
            enableLightMarkers: false,
            enableLightSnap: false,
            lightMarkerColor: "#3d3d3dff"
        }, options);
        Object.assign(this, options);
        this.parent = parent;
        this.layers = [];
        if (typeof (this.parent) == 'string')
            this.parent = document.querySelector(this.parent);

        this.maxRadius = 1.0;

        this.lightDir = [0, 0];
        this.lightDirs = [];

        this.containerElement = document.createElement('div');
        this.containerElement.style = `padding: 0; position: absolute; top: ${this.top}px; right: ${this.right}px;` +
            `width: ${this.width}px; height: ${this.height}px; z-index: 200; touch-action: none; visibility: visible;`;
        this.containerElement.classList.add('openlime-lsc');

        const sd = (this.width * 0.5) * (1 - 0.8);
        this.dlCanvas = document.createElement('canvas');
        this.dlCanvas.width = this.width;
        this.dlCanvas.height = this.height;
        // this.dlCanvas.style = ''
        this.dlCanvasCtx = this.dlCanvas.getContext("2d");
        this.dlGradient = '';
        this.containerElement.appendChild(this.dlCanvas);
        this.parent.appendChild(this.containerElement);

        this.r = this.width * 0.5;
        this.thetaMinRad = this.thetaMin / 180.0 * Math.PI;
        this.rmax = this.r * Math.cos(this.thetaMinRad);

        this.interactLightDir(this.width * 0.5, this.height * 0.5);

        this.pointerDown = false;
        this.dlCanvas.addEventListener("pointerdown", (e) => {
            this.pointerDown = true;
            const rect = this.dlCanvas.getBoundingClientRect();
            let clickPosX =
                (this.dlCanvas.width * (e.clientX - rect.left)) /
                rect.width;
            let clickPosY =
                (this.dlCanvas.height * (e.clientY - rect.top)) /
                rect.height;
            this.interactLightDir(clickPosX, clickPosY);
            e.preventDefault();
        });

        this.dlCanvas.addEventListener("pointermove", (e) => {
            if (this.pointerDown) {
                const rect = this.dlCanvas.getBoundingClientRect();
                let clickPosX =
                    (this.dlCanvas.width * (e.clientX - rect.left)) /
                    rect.width;
                let clickPosY =
                    (this.dlCanvas.height * (e.clientY - rect.top)) /
                    rect.height;
                this.interactLightDir(clickPosX, clickPosY);
                e.preventDefault();
            }
        });

        this.dlCanvas.addEventListener("pointerup", () => {
            this.pointerDown = false;
            // Snap to closest light direction if enabled
            if (this.enableLightMarkers && this.enableLightSnap && this.lightDirs && this.lightDirs.length > 0) {
                const closestDir = this.findClosestLightDir(this.lightDir);
                if (closestDir) {
                    this.animateToLightDir([closestDir[0], closestDir[1]], 200);
                }
            }
        });

    }

    /**
     * Adds a layer to be controlled by this light sphere.
     * The layer must support light control operations.
     * If the layer exposes a `lightDirs()` function, its directions
     * are used as the training set for snapping and marker rendering.
     * @param {Layer} l - Layer instance to be controlled
     */
    addLayer(l) {
        this.layers.push(l);
        // Check if layer provides a lightDirs() function
        if (typeof l.lightDirs === "function") {
            const dirs = l.lightDirs();
            // Check if returned value is a valid array
            if (Array.isArray(dirs) && dirs.length > 0) {
                this.setLightDirs(dirs);
            }
        }
    }

    /**
     * Finds the closest light direction from the training set to the current light direction.
     * @param {number[]} currentLightDir - Current light direction [x, y]
     * @returns {number[]|null} Closest light direction or null if no training directions available
     * @private
     */
    findClosestLightDir(currentLightDir) {
        if (!this.lightDirs || this.lightDirs.length === 0) return null;

        let minDistance = Infinity;
        let closestDir = null;

        for (const dir of this.lightDirs) {
            const dx = currentLightDir[0] - dir[0];
            const dy = currentLightDir[1] - dir[1];
            const distance = dx * dx + dy * dy; // squared distance is sufficient for comparison

            if (distance < minDistance) {
                minDistance = distance;
                closestDir = dir;
            }
        }

        return closestDir;
    }

    /**
     * Computes the Z component of a unit-length direction on the upper hemisphere
     * from its X and Y components.
     * Assumes x^2 + y^2 <= 1.
     * @param {number} x - X component in [-1, 1]
     * @param {number} y - Y component in [-1, 1]
     * @returns {number} Z component (non-negative) such that x^2 + y^2 + z^2 = 1
     * @private
     * @static
     */
    static zed(x, y) {
        return Math.sqrt(1.0 - (x ** 2 + y ** 2));
    }

    /**
     * Computes the radial distance of the projected light direction
     * on the z=0 plane. Given a 3D unit vector v = [x, y, z],
     * this function returns √(x² + y²), i.e. the length of the
     * projection of v onto the XY plane.
     *
     * It is used to determine how far the pointer (light cursor)
     * lies from the center in the 2D controller, and to clamp the
     * cursor so it never exceeds the maximum radius of the dataset
     * (maxRadius).
     *
     * @param {number[]} v - Light direction projected on the selector, [x, y]
     * @returns {number} Radial distance of v from the origin in the XY plane
     * @static
     * @private
     */
    static radius(v) {
        return Math.sqrt(v[0] ** 2 + v[1] ** 2);
    }

    /**
     * Animates the light direction marker to a target direction with linear interpolation.
     * @param {number[]} targetDir - Target light direction [x, y]
     * @param {number} [duration=200] - Animation duration in milliseconds
     * @private
     */
    animateToLightDir(targetDir, duration = 200) {
        if (!targetDir) return;

        const startDir = [...this.lightDir];
        const startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Linear interpolation
            this.lightDir[0] = startDir[0] + (targetDir[0] - startDir[0]) * progress;
            this.lightDir[1] = startDir[1] + (targetDir[1] - startDir[1]) * progress;
            console.log('LD ', this.lightDir[0] + ":" + this.lightDir[1] + ":" + LightSphereController.zed(this.lightDir[0], this.lightDir[1]));
            // Update layer controls
            for (const l of this.layers) {
                if (l.controls.light) l.setControl('light', this.lightDir, 0); // No animation on layer side
            }

            // Redraw the UI
            this.computeGradient();
            const x = (this.lightDir[0] + 1.0) * this.dlCanvas.width * 0.5;
            const y = (-this.lightDir[1] + 1.0) * this.dlCanvas.height * 0.5;
            this.drawLightSelector(x, y);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    /**
     * Sets the array of training light directions and redraws the selector overlay.
     * @param {number[][]} dirs - Array of light direction triplets [x,y,z].
     * @private
     */
    setLightDirs(dirs) {
        this.lightDirs = dirs || [];

        if (!this.lightDirs || this.lightDirs.length == 0) return;

        this.maxRadius = Math.max(
            ...this.lightDirs.map(([x, y]) => Math.sqrt(x * x + y * y))
        );

        const x = (this.lightDir[0] + 1.0) * this.dlCanvas.width * 0.5;
        const y = (-this.lightDir[1] + 1.0) * this.dlCanvas.height * 0.5;
        this.drawLightSelector(x, y);
    }

    /**
     * Makes the controller visible.
     * @returns {string} The visibility style value ('visible')
     */
    show() {
        return this.containerElement.style.visibility = 'visible';
    }

    /**
     * Hides the controller.
     * @returns {string} The visibility style value ('hidden')
     */
    hide() {
        return this.containerElement.style.visibility = 'hidden';
    }

    /**
     * Computes the radial gradient used as background for the selector.
     * Centered at the current light direction.
     * @private
     */
    computeGradient() {
        const x = (this.lightDir[0] + 1.0) * this.dlCanvas.width * 0.5;
        const y = (-this.lightDir[1] + 1.0) * this.dlCanvas.height * 0.5;
        this.dlGradient = this.dlCanvasCtx.createRadialGradient(
            x, y, this.dlCanvas.height / 8.0,
            x, y, this.dlCanvas.width / 1.2
        );
        this.dlGradient.addColorStop(0, this.colorSpot);
        this.dlGradient.addColorStop(1, this.colorBkg);
    }

    /**
     * Handles interaction to update light direction.
     * Converts pointer position to light direction vector while respecting constraints.
     * @private
     * @param {number} x - X coordinate in canvas space
     * @param {number} y - Y coordinate in canvas space
     */
    interactLightDir(x, y) {
        let xc = x - this.r;
        let yc = this.r - y;
        const phy = Math.atan2(yc, xc);
        let l = Math.sqrt(xc * xc + yc * yc);
        l = l > this.rmax ? this.rmax : l;
        xc = l * Math.cos(this.thetaMinRad) * Math.cos(phy);
        yc = l * Math.cos(this.thetaMinRad) * Math.sin(phy);

        this.lightDir[0] = xc / this.r;
        this.lightDir[1] = yc / this.r;

        const r = LightSphereController.radius(this.lightDir);
        if (r > 0 && r > this.maxRadius) {
            this.lightDir[0] *= this.maxRadius / r;
            this.lightDir[1] *= this.maxRadius / r;
        }

        for (const l of this.layers) {
            if (l.controls.light) l.setControl('light', this.lightDir, 100);
        }

        console.log("LD ",
            this.lightDir[0] + ":" + this.lightDir[1] + ":" + LightSphereController.zed(this.lightDir[0], this.lightDir[1])
        );
        this.computeGradient();
        this.drawLightSelector(x, y);
    }

    /**
     * Draws the additional light directions provided in {@link lightDirs}
     * as small circular markers on the selector.
     * The directions are mapped to the 2D selector space using the same
     * projection used for the main light direction marker.
     * @private
     */
    drawLightDirs() {
        if (!this.enableLightMarkers || !this.lightDirs || this.lightDirs.length === 0) return;

        const ctx = this.dlCanvasCtx;
        const w = this.dlCanvas.width;
        const h = this.dlCanvas.height;

        ctx.save();
        ctx.fillStyle = this.lightMarkerColor;

        for (const dir of this.lightDirs) {
            const dx = dir[0];
            const dy = dir[1];
            // dz unused for projection in this UI

            // Convert direction [-1,1] to canvas coordinates
            const x = (dx + 1.0) * 0.5 * w;
            const y = (-dy + 1.0) * 0.5 * h;

            ctx.beginPath();
            ctx.arc(x, y, w / 40, 0, 2 * Math.PI);
            ctx.fill();
        }

        ctx.restore();
    }

    /**
     * Draws the light direction selector UI.
     * Renders:
     * - Circular background with gradient
     * - Position marker at current light direction
     * - Optional markers for training light directions
     * @private
     * @param {number} x - X coordinate for position marker
     * @param {number} y - Y coordinate for position marker
     */
    drawLightSelector(x, y) {
        this.dlCanvasCtx.clearRect(0, 0, this.dlCanvas.width, this.dlCanvas.height);

        // Background circle
        this.dlCanvasCtx.beginPath();
        this.dlCanvasCtx.arc(
            this.dlCanvas.width / 2,
            this.dlCanvas.height / 2,
            this.dlCanvas.width / 2,
            0, 2 * Math.PI
        );
        this.dlCanvasCtx.fillStyle = this.dlGradient;
        this.dlCanvasCtx.fill();

        // Draw all additional light dirs (black)
        this.drawLightDirs();

        // Main selector marker (red)
        this.dlCanvasCtx.beginPath();
        this.dlCanvasCtx.arc(x, y, this.dlCanvas.width / 30, 0, 2 * Math.PI);
        this.dlCanvasCtx.strokeStyle = this.colorMark;
        this.dlCanvasCtx.lineWidth = 2;
        this.dlCanvasCtx.stroke();
        this.dlCanvasCtx.fillStyle = this.colorMark;
        this.dlCanvasCtx.fill();
    }

}

/**
 * Example usage of LightSphereController:
 * ```javascript
 * // Create controller with custom options and light snapping enabled
 * const lightController = new LightSphereController('#container', {
 *     width: 200,
 *     height: 200,
 *     top: 80,
 *     right: 20,
 *     thetaMin: 15,
 *     colorSpot: '#ffff00',
 *     colorBkg: '#000066',
 *     colorMark: '#ff3333',
 *     enableLightMarkers: true,             // Draw all training light directions as small markers
 *     enableLightSnap: true,                // Enable snapping to nearest training light direction
 *     lightMarkerColor: '#3d3d3dff'         // Color used for training light direction markers
 * });
 *
 * // Add layers to be controlled
 * lightController.addLayer(layer1);
 * lightController.addLayer(layer2);
 *
 * // Show/hide controller
 * lightController.show();
 * lightController.hide();
 *
 * // Enable/disable light snapping at runtime
 * lightController.enableLightSnap = true;
 * ```
 *
 * @property {HTMLElement|string} parent - Parent element or selector used to mount the controller
 * @property {number} width - Width of the controller canvas in pixels
 * @property {number} height - Height of the controller canvas in pixels
 * @property {number} top - Top offset in pixels relative to the parent element
 * @property {number} right - Right offset in pixels relative to the parent element
 * @property {number} thetaMin - Minimum polar angle in degrees for the light direction
 * @property {string} colorSpot - Color of the inner spot of the radial gradient
 * @property {string} colorBkg - Color of the outer edge of the radial gradient
 * @property {string} colorMark - Color of the main selector marker
 * @property {boolean} enableLightMarkers - Whether training light directions are drawn as markers
 * @property {boolean} enableLightSnap - Whether to snap to the nearest training direction on pointer release
 * @property {string} lightMarkerColor - Fill color used for training light direction markers
 * @property {number[]} lightDir - Current light direction vector projected to the selector [x, y]
 * @property {number[][]} lightDirs - Array of training light directions [x, y, z] coming from attached layers
 * @property {HTMLElement} containerElement - Main container element wrapping the canvas
 * @property {HTMLCanvasElement} dlCanvas - Canvas element used for drawing the selector
 * @property {CanvasRenderingContext2D} dlCanvasCtx - Canvas 2D rendering context
 * @property {CanvasGradient} dlGradient - Current radial gradient used as background
 * @property {number} r - Radius of the control sphere in pixels
 * @property {number} thetaMinRad - Minimum polar angle in radians
 * @property {number} rmax - Maximum interaction radius based on thetaMinRad
 * @property {number} maxRadius - Maximum radius of projected training light directions in selector space
 * @property {boolean} pointerDown - Whether the pointer is currently pressed inside the selector
 * @property {Layer[]} layers - Array of layers that are controlled by this instance
 */

export { LightSphereController }
