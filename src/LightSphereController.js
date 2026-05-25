/*
 * @fileoverview
 * LightSphereController module provides a spherical interface for controlling light direction.
 * It creates a circular canvas-based UI element that allows users to interactively adjust
 * lighting direction through pointer interactions.
 */

/**
 * LightSphereController creates an interactive sphere UI for light direction control.
 * Features:
 * - Circular interface with gradient background
 * - Pointer-based interaction for light direction
 * - Configurable size, position, and colors
 * - Minimum theta angle constraint
 * - Visual feedback with gradient and marker
 */
class LightSphereController {
    /**
     * Creates a new LightSphereController instance.
     * @param {HTMLElement|string} parent - Parent element or selector where the controller will be mounted
     * @param {Object} [options] - Configuration options
     * @param {number} [options.width=128] - Width of the controller in pixels
     * @param {number} [options.height=128] - Height of the controller in pixels
     * @param {number} [options.top=60] - Top position offset in pixels
     * @param {number} [options.right=0] - Right position offset in pixels
     * @param {number} [options.thetaMin=0] - Minimum theta angle in degrees (constrains interaction radius)
     * @param {string} [options.colorSpot='#ffffff'] - Color of the central spot in the gradient
     * @param {string} [options.colorBkg='#0000ff'] - Color of the outer edge of the gradient
     * @param {string} [options.colorMark='#ff0000'] - Color of the position marker
     * @param {boolean} [options.showCoordinates=false] - Show xyz coordinate inputs below the sphere (x and y are editable, z is read-only)
     * @param {number} [options.coordsFontSize=11] - Font size in pixels for the coordinate inputs
     * @param {string} [options.coordsColor='#ffffff'] - Text color for the coordinate labels and inputs
     */    
    constructor(parent, options) {        
        options = Object.assign({
            width: 128,
            height: 128,
            top: 60,
            right: 0,
            thetaMin: 0,
            colorSpot: '#ffffff',
            colorBkg: '#b3a940',
            colorMark: '#ff0000',
            showCoordinates: false,
            coordsFontSize: 13,
            coordsColor: '#000'
        }, options);
        Object.assign(this, options);
        this.parent = parent;
        this.layers = [];
        if (typeof (this.parent) == 'string')
            this.parent = document.querySelector(this.parent);

        this.maxRadius = 1.0;
        this.active = true;
        this.viewer = this.parent && this.parent._openlimeViewer ? this.parent._openlimeViewer : null;

        this.lightDir = [0, 0];
        this.lightDirs = [];

        const coordsHeight = this.showCoordinates ? Math.round(this.coordsFontSize * 7.5) : 0;
        this.containerElement = document.createElement('div');
        this.containerElement.style = `width:${this.width}px; height:${this.height + coordsHeight}px; top:${this.top}px; right:${this.right}px;`;
        this.containerElement.classList.add('openlime-lightsphere');

        const sd = (this.width * 0.5) * (1 - 0.8);
        this.dlCanvas = document.createElement('canvas');
        this.dlCanvas.width = this.width;
        this.dlCanvas.height = this.height;
        // this.dlCanvas.style = ''
        this.dlCanvasCtx = this.dlCanvas.getContext("2d");
        this.dlGradient = '';
        this.containerElement.appendChild(this.dlCanvas);

        if (this.showCoordinates) {
            const fs = this.coordsFontSize;

            this.coordsDiv = document.createElement('div');
            this.coordsDiv.className = 'openlime-lightsphere-coords';
            this.coordsDiv.style.fontSize = `${fs}px`;
            this.coordsDiv.style.color = this.coordsColor;
            this.coordsDiv.innerHTML = `
                <span><label>x:</label><input type="number" step="0.01" min="-1" max="1"></span>
                <span><label>y:</label><input type="number" step="0.01" min="-1" max="1"></span>
                <span><label>z:</label><input type="number" step="0.01" min="-1" max="1" readonly tabindex="-1"></span>`;
            this.containerElement.appendChild(this.coordsDiv);

            [this.xInput, this.yInput, this.zInput] = this.coordsDiv.querySelectorAll('input');

            const applyCoords = () => {
                const ldx = parseFloat(this.xInput.value) || 0;
                const ldy = parseFloat(this.yInput.value) || 0;
                this.setLightDirection(ldx, ldy);
            };

            for (const inp of [this.xInput, this.yInput]) {
                inp.addEventListener('change', applyCoords);
                inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { applyCoords(); e.preventDefault(); } });
                inp.addEventListener('pointerdown', (e) => e.stopPropagation());
            }
        }

        this.parent.appendChild(this.containerElement);

        this.r = this.width * 0.5;
        this.thetaMinRad = this.thetaMin / 180.0 * Math.PI;
        this.rmax = this.r * Math.cos(this.thetaMinRad);

        this.interactLightDir(this.width * 0.5, this.height * 0.5);

        this.pointerDown = false;
        this.dlCanvas.addEventListener("pointerdown", (e) => {
            this.pointerDown = true;
            this.setupDocumentListeners();
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

        this.dlCanvas.addEventListener("pointerup", (e) => {
            this.pointerDown = false;
            // Snap to closest light direction if enabled
            if (this.enableLightMarkers && this.enableLightSnap && this.lightDirs && this.lightDirs.length > 0) {
                const closestDir = this.findClosestLightDir(this.lightDir);
                if (closestDir) {
                    this.animateToLightDir([closestDir[0], closestDir[1]], 200);
                }
            }
        });

        if (this.viewer)
            this.bindToViewer(this.viewer);

    }

    /**
     * Binds this controller to a viewer and auto-attaches all light-capable layers.
     * Once bound, this controller participates in viewer-level single active
     * light-controller arbitration.
     * @param {Viewer} viewer - OpenLIME viewer instance
     * @returns {LightSphereController} this
     */
    bindToViewer(viewer) {
        if (!viewer) return this;

        this.viewer = viewer;

        const ui = this.viewer.ui;
        if (ui && ui.actions && ui.actions.light) {
            ui.actions.light.display = false;
            ui.actions.light.active = false;
            if (typeof ui.toggleLightController === 'function')
                ui.toggleLightController(false);
            if (ui.actions.light.element)
                ui.actions.light.element.style.display = 'none';
        }

        for (const layer of Object.values(viewer.canvas.layers)) {
            if (layer && layer.controls && layer.controls.light)
                this.addLayer(layer);
        }

        if (typeof viewer.setActiveLightController === 'function')
            viewer.setActiveLightController(this);

        return this;
    }

    // Listener sul document per drag fuori dal canvas
    setupDocumentListeners() {
        this.docPointerMove = (e) => {
            if (this.pointerDown) {
                const rect = this.dlCanvas.getBoundingClientRect();
                let clickPosX = (this.dlCanvas.width * (e.clientX - rect.left)) / rect.width;
                let clickPosY = (this.dlCanvas.height * (e.clientY - rect.top)) / rect.height;
                this.interactLightDir(clickPosX, clickPosY);
                e.preventDefault();
            }
        };
        this.docPointerUp = (e) => {
            this.pointerDown = false;
            this.removeDocumentListeners();
        };

        document.addEventListener('pointermove', this.docPointerMove);
        document.addEventListener('pointerup', this.docPointerUp);
    }

    removeDocumentListeners() {
        if (this.docPointerMove) document.removeEventListener('pointermove', this.docPointerMove);
        if (this.docPointerUp) document.removeEventListener('pointerup', this.docPointerUp);
    }


    /**
     * Updates the coordinate input fields to reflect the current light direction.
     * Has no effect when showCoordinates is false.
     * @private
     */
    updateCoordinateDisplay() {
        if (!this.showCoordinates) return;
        const [ldx, ldy] = this.lightDir;
        const ldz = Math.sqrt(Math.max(0, 1 - ldx * ldx - ldy * ldy));
        this.xInput.value = ldx.toFixed(3);
        this.yInput.value = ldy.toFixed(3);
        this.zInput.value = ldz.toFixed(3);
    }

    /**
     * Sets the light direction programmatically from normalized x and y values.
     * z is derived as sqrt(1 - x² - y²). Values are clamped to the valid range
     * enforced by thetaMin.
     * @param {number} ldx - X component of the light direction (range: -1 to 1)
     * @param {number} ldy - Y component of the light direction (range: -1 to 1)
     */
    setLightDirection(ldx, ldy) {
        const maxMag = Math.pow(Math.cos(this.thetaMinRad), 2);
        const mag = Math.sqrt(ldx * ldx + ldy * ldy);
        if (mag > maxMag) {
            const scale = maxMag / mag;
            ldx *= scale;
            ldy *= scale;
        }
        this.lightDir[0] = ldx;
        this.lightDir[1] = ldy;
        for (const l of this.layers) {
            if (l.controls.light) l.setControl('light', this.lightDir, 5);
        }
        const markerX = this.r * (1 + ldx);
        const markerY = this.r * (1 - ldy);
        this.computeGradient();
        this.drawLightSelector(markerX, markerY);
        this.updateCoordinateDisplay();
    }

    /**
     * Adds a layer to be controlled by this light sphere.
     * The layer must support light control operations.
     * @param {Layer} layer - Layer to be controlled
     */
    addLayer(l) {
        if (!l) return;

        if (!this.layers.includes(l))
            this.layers.push(l);

        if (!this.viewer && l.viewer)
            this.viewer = l.viewer;

        if (this.viewer && typeof this.viewer.setActiveLightController === 'function')
            this.viewer.setActiveLightController(this);

        // Check if layer provides a lightDirs() function
        if (typeof l.lightDirs === "function") {
            const dirs = l.lightDirs();
            // Check if returned value is a valid array
            if (Array.isArray(dirs) && dirs.length > 0) {
                this.setLightDirs(dirs);
            }
        }

        if (this.active) {
            for (const c of l.controllers) {
                if (c.control === 'light') c.active = false;
            }
        }
    }

    /**
     * Viewer-level hook to enforce a single active light controller.
     * @param {boolean} on - Whether this controller should be active
     */
    setActive(on) {
        this.active = !!on;
        this.containerElement.style.pointerEvents = this.active ? 'auto' : 'none';
        if (!this.active)
            this.pointerDown = false;

        if (this.active && this.viewer && this.viewer.canvas && this.viewer.canvas.layers) {
            for (const layer of Object.values(this.viewer.canvas.layers)) {
                if (!layer.controls || !layer.controls.light)
                    continue;
                if (!this.layers.includes(layer))
                    this.layers.push(layer);
            }
        }

        for (const l of this.layers) {
            if (!l || !l.controllers) continue;
            for (const c of l.controllers) {
                if (c.control === 'light')
                    c.active = !this.active;
            }
        }
    }

    /**
     * Viewer-level hook called when a new layer is added.
     * @param {Layer} layer - Newly added layer
     */
    onLayerAdded(layer) {
        if (!layer || !layer.controls || !layer.controls.light)
            return;
        this.addLayer(layer);
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

    static zed(x, y) {
        return Math.sqrt(1.0 - (x ** 2 + y ** 2));
    }

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
            // console.log('LD ', this.lightDir[0] + ":" + this.lightDir[1] + ":" + LightSphereController.zed(this.lightDir[0], this.lightDir[1]));
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
     * Sets the array of light directions and redraws the selector.
     * @param {number[][]} dirs - Array of light direction triplets [x,y,z].
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
     * @returns {string} The visibility style value
     */
    show() {
        return this.containerElement.style.visibility = 'visible';
    }

    /**
     * Hides the controller.
     * @returns {string} The visibility style value
     */
    hide() {
        return this.containerElement.style.visibility = 'hidden';
    }

    /**
     * Computes the radial gradient based on current light direction.
     * Creates a gradient that provides visual feedback about the light position.
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
        if (!this.active) return;

        let xc = x - this.r;
        let yc = this.r - y;
        const phy = Math.atan2(yc, xc);
        let l = Math.sqrt(xc * xc + yc * yc);
        l = l > this.rmax ? this.rmax : l;
        xc = l * Math.cos(this.thetaMinRad) * Math.cos(phy);
        yc = l * Math.cos(this.thetaMinRad) * Math.sin(phy);
        x = xc + this.r;
        y = this.r - yc;
        this.lightDir[0] = 2 * (x / this.dlCanvas.width - 0.5);
        this.lightDir[1] = 2 * (1 - y / this.dlCanvas.height - 0.5);
        const r = LightSphereController.radius(this.lightDir);
        if (r > 0 && r > this.maxRadius) {
            const scale = this.maxRadius / r;
            this.lightDir[0] *= scale;
            this.lightDir[1] *= scale;

            x = (this.lightDir[0] + 1.0) * this.dlCanvas.width * 0.5;
            y = (-this.lightDir[1] + 1.0) * this.dlCanvas.height * 0.5;
        }

        //console.log('LD ', this.lightDir[0] + ":" + this.lightDir[1] + ":" + LightSphereController.zed(this.lightDir[0], this.lightDir[1]));
        for (const l of this.layers) {
            if (l.controls.light) l.setControl('light', this.lightDir, 5);
        }
        this.computeGradient();
        this.drawLightSelector(x, y);
        this.updateCoordinateDisplay();
    }

    /**
     * Draws all light directions stored in this.lightDirs as small black circles.
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
 *     enableLightSnap: true  // Enable snapping to nearest training light direction
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
 * @property {number[]} lightDir - Current light direction vector [x, y]
 * @property {number[][]} lightDirs - Array of training light directions from layers
 * @property {boolean} enableLightSnap - Whether to snap to nearest training direction on release
 * @property {HTMLElement} containerElement - Main container element
 * @property {HTMLCanvasElement} dlCanvas - Canvas element for drawing
 * @property {CanvasRenderingContext2D} dlCanvasCtx - Canvas 2D rendering context
 * @property {CanvasGradient} dlGradient - Current radial gradient
 * @property {number} r - Radius of the control sphere
 * @property {number} thetaMinRad - Minimum theta angle in radians
 * @property {number} rmax - Maximum interaction radius based on thetaMin
 * @property {boolean} pointerDown - Whether pointer is currently pressed
 * @property {Layer[]} layers - Array of layers being controlled
 */

export { LightSphereController }