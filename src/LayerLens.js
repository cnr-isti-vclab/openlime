import { CoordinateSystem } from './CoordinateSystem.js';
import { Layer } from './Layer.js'
import { LayerCombiner } from './LayerCombiner.js'
import { ShaderLens } from './ShaderLens.js'

/**
 * @typedef {Object} LayerLensOptions
 * @property {Layer[]} [layers] - Array of layers available in the lens (optional)
 * @property {number} [activeLayerIndex=0] - Index of the layer to display in the lens
 * @property {boolean} [overlay=true] - Whether the lens renders as an overlay
 * @property {number} [radius=100] - Initial lens radius in pixels
 * @property {number[]} [borderColor=[0.078, 0.078, 0.078, 1]] - RGBA border color
 * @property {number} [borderWidth=12] - Border width in pixels
 * @property {boolean} [borderEnable=false] - Whether to show lens border
 * @property {boolean} [medianFilter=false] - Enable a 3x3 median filter
 * @property {boolean} [equalize=false] - Enable local histogram equalization
 * @property {Object} [dashboard=null] - Dashboard UI component for lens control
 * @property {Camera} camera - Camera instance (required)
 * @extends LayerCombinerOptions
 */

/**
 * LayerLens implements a magnifying lens effect that displays a single selected layer.
 * It provides an interactive lens that can be moved and resized, showing magnified content
 * of the active layer inside the lens area only - no other layers are rendered by the lens.
 * 
 * Features:
 * - Interactive lens positioning and sizing
 * - Support for multiple layers with dynamic switching
 * - Single active layer display (mutually exclusive)
 * - Animated transitions
 * - Customizable border appearance
 * - Dashboard UI integration
 * - Optimized viewport rendering
 * 
 * Technical Details:
 * - Renders only the active layer to avoid output in background
 * - Uses framebuffer composition for single layer rendering
 * - Implements viewport optimization for performance
 * - Handles coordinate transformations between systems
 * - Supports animated parameter changes
 * - Manages WebGL resources efficiently
 * 
 * @extends LayerCombiner
 * 
 * @example
 * ```javascript
 * // Create lens with multiple layers (shows first by default)
 * const lens = new OpenLIME.LayerLens({
 *   camera: viewer.camera,
 *   layers: [layer1, layer2, layer3],
 *   activeLayerIndex: 0,
 *   radius: 150,
 *   borderEnable: true,
 *   borderColor: [0, 0, 0, 1]
 * });
 * 
 * // Switch to different layer
 * lens.setActiveLayer(1);
 * 
 * // Animate lens position
 * lens.setCenter(500, 500, 1000, 'ease-out');
 * 
 * // Add to viewer
 * viewer.addLayer('lens', lens);
 * ```
 */
class LayerLens extends LayerCombiner {
	/**
	 * Creates a new LayerLens instance
	 * @param {LayerLensOptions} options - Configuration options
	 * @throws {Error} If camera is not provided
	 */
	constructor(options) {
		options = Object.assign({
			overlay: true,
			radius: 100,
			borderColor: [0.078, 0.078, 0.078, 1],
			borderWidth: 12,
			borderEnable: false,
			medianFilter: false,
			equalize: false,
			dashboard: null,
			activeLayerIndex: 0,
			colorEncoding: 'linear',
		}, options);
		super(options);

		if (!this.camera) {
			console.log("Missing camera");
			throw "Missing Camera"
		}

		// Track which layer is active in the lens (mutually exclusive)
		this.activeLayerIndex = Math.max(0, Math.min(options.activeLayerIndex, this.layers.length - 1));

		// Create shader lens - only single layer rendering now
		let shader = new ShaderLens({ medianFilter: this.medianFilter });
		this.shaders['lens'] = shader;
		this.setShader('lens');

		this.addControl('center', [0, 0]);
		this.addControl('radius', [this.radius, 0]);
		this.addControl('borderColor', this.borderColor);
		this.addControl('borderWidth', [this.borderWidth]);

		this.oldRadius = -9999;
		this.oldCenter = [-9999, -9999];

		this.useGL = true;
		this.equalize = Boolean(options.equalize);
		this._equalizeLutTexture = null;
		this._equalizeLastUpdate = -Infinity;
		this._equalizeNeedsUpdate = true;
		this.shader.setEqualize(this.equalize);

		if (this.dashboard) this.dashboard.lensLayer = this;
	}

	/**
	 * Sets layer visibility and updates dashboard if present
	 * Extends parent setVisible() to also manage dashboard UI
	 * @param {boolean} visible - Whether layer should be visible
	 * @override
	 */
	setVisible(visible) {
		// Update dashboard UI (LayerLens-specific behavior)
		if (this.dashboard) {
			this.dashboard.container.style.display = visible ? 'block' : 'none';
		}
		// Delegate to parent for core visibility logic
		super.setVisible(visible);
	}

	/**
	 * Sets the active layer to be displayed inside the lens.
	 * Only the active layer is rendered by the lens; others are ignored.
	 * @param {number} index - Index of the layer to display
	 * @throws {Error} If index is out of bounds
	 * @fires Layer#update
	 */
	setActiveLayer(index) {
		if (index < 0 || index >= this.layers.length) {
			console.warn(`Layer index ${index} out of bounds (0-${this.layers.length - 1})`);
			return;
		}
		this.activeLayerIndex = index;
		this._equalizeNeedsUpdate = true;
		this.emit('update');
	}

	/** @override */
	deleteFramebuffers() {
		super.deleteFramebuffers();
		if (this._equalizeLutTexture && this.gl) {
			this.gl.deleteTexture(this._equalizeLutTexture);
			this._equalizeLutTexture = null;
		}
		this._equalizeNeedsUpdate = true;
	}

	/**
	 * Enables or disables median filtering of the composed lens image.
	 * @param {boolean} enabled Whether the 3x3 median filter is enabled.
	 */
	setMedianFilter(enabled) {
		this.shader.setMedianFilter(enabled);
		this.emit('update');
	}

	/**
	 * Enables local histogram equalization for the active lens layer.
	 * The CDF is sampled from the lens framebuffer and refreshed at most every
	 * 150 ms while the lens or illumination changes.
	 * @param {boolean} enabled Whether to apply the lens CDF lookup.
	 */
	setEqualize(enabled) {
		this.equalize = Boolean(enabled);
		this._equalizeNeedsUpdate = true;
		this.shader.setEqualize(this.equalize);
		this.emit('update');
	}

	/** @private */
	_ensureEqualizeLutTexture() {
		if (this._equalizeLutTexture) return;
		const gl = this.gl;
		const identity = new Uint8Array(256);
		for (let i = 0; i < identity.length; ++i) identity[i] = i;
		this._equalizeLutTexture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, this._equalizeLutTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 256, 1, 0, gl.RED, gl.UNSIGNED_BYTE, identity);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	/** @private */
	_updateEqualizeLut(lensViewport, lensUniforms) {
		if (!this.equalize) return;
		const now = performance.now();
		if (!this._equalizeNeedsUpdate && now - this._equalizeLastUpdate < 150) return;

		const gl = this.gl;
		const x = Math.max(0, lensViewport.x);
		const y = Math.max(0, lensViewport.y);
		const right = Math.min(this.layout.width, lensViewport.x + lensViewport.dx);
		const top = Math.min(this.layout.height, lensViewport.y + lensViewport.dy);
		const width = Math.max(0, right - x);
		const height = Math.max(0, top - y);
		if (!width || !height) return;

		const pixels = new Uint8Array(width * height * 4);
		gl.readPixels(x, y, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
		const histogram = new Uint32Array(256);
		let count = 0;
		for (let row = 0; row < height; ++row) {
			for (let column = 0; column < width; ++column) {
				const dx = x + column + 0.5 - lensUniforms[0];
				const dy = y + row + 0.5 - lensUniforms[1];
				if (dx * dx + dy * dy > lensUniforms[2] * lensUniforms[2]) continue;
				const offset = (row * width + column) * 4;
				if (pixels[offset + 3] === 0) continue;
				histogram[pixels[offset]]++;
				count++;
			}
		}
		if (!count) return;

		const lut = new Uint8Array(256);
		let cumulative = 0;
		let cdfMin = 0;
		for (let i = 0; i < 256; ++i) {
			cumulative += histogram[i];
			if (!cdfMin && cumulative) cdfMin = cumulative;
			lut[i] = count === cdfMin ? i : Math.round(255 * Math.max(0, cumulative - cdfMin) / (count - cdfMin));
		}
		this._ensureEqualizeLutTexture();
		gl.bindTexture(gl.TEXTURE_2D, this._equalizeLutTexture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, 256, 1, 0, gl.RED, gl.UNSIGNED_BYTE, lut);
		this._equalizeLastUpdate = now;
		this._equalizeNeedsUpdate = false;
	}

	/**
	 * Gets the currently active layer index
	 * @returns {number} Index of the active layer
	 */
	getActiveLayer() {
		return this.activeLayerIndex;
	}

	/**
	 * Sets the base layer (legacy method - sets layers[0])
	 * For backward compatibility. Prefer setActiveLayer() for new code.
	 * @param {Layer} layer - Layer instance
	 * @fires Layer#update
	 */
	setBaseLayer(l) {
		this.layers[0] = l;
		this.activeLayerIndex = 0;
		this.emit('update');
	}

	/**
	 * Sets lens radius with optional animation
	 * @param {number} radius - New radius in pixels
	 * @param {number} [delayms=100] - Animation duration
	 * @param {string} [easing='linear'] - Animation easing function
	 */
	setRadius(r, delayms = 100, easing = 'linear') {
		this.setControl('radius', [r, 0], delayms, easing);
	}

	/**
	 * Gets current lens radius
	 * @returns {number} Current radius in pixels
	 */
	getRadius() {
		return this.controls['radius'].current.value[0];
	}

	/**
	 * Sets lens center position with optional animation
	 * @param {number} x - X coordinate in scene space
	 * @param {number} y - Y coordinate in scene space
	 * @param {number} [delayms=100] - Animation duration
	 * @param {string} [easing='linear'] - Animation easing function
	 */
	setCenter(x, y, delayms = 100, easing = 'linear') {
		this.setControl('center', [x, y], delayms, easing);
	}

	/**
	 * Gets current lens center position
	 * @returns {{x: number, y: number}} Center position in scene coordinates
	 */
	getCurrentCenter() {
		const p = this.controls['center'].current.value;
		return { x: p[0], y: p[1] };
	}

	/**
	 * Gets target lens position for ongoing animation
	 * @returns {{x: number, y: number}} Target position in scene coordinates
	 */
	getTargetCenter() {
		const p = this.controls['center'].target.value;
		return { x: p[0], y: p[1] };
	}

	/**
	 * Gets current border color
	 * @returns {number[]} RGBA color array
	 */
	getBorderColor() {
		return this.controls['borderColor'].current.value;
	}

	/**
	 * Gets current border width
	 * @returns {number} Border width in pixels
	 */
	getBorderWidth() {
		return this.controls['borderWidth'].current.value[0];
	}

	/**
	 * Renders the lens effect with only the active layer
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @returns {boolean} Whether all animations are complete
	 * @override
	 * @private
	 */
	draw(transform, viewport) {
		if (this.layers[0] === null)
			return true;

		let done = this.interpolateControls();

		// Cache frequently accessed values
		const currentCenter = this.getCurrentCenter();
		const currentRadius = this.getRadius();
		const borderColor = this.getBorderColor();

		// Update dashboard size & pos
		if (this.dashboard) {
			this.dashboard.update(currentCenter.x, currentCenter.y, currentRadius);
			this.oldCenter = currentCenter;
			this.oldRadius = currentRadius;
		}

		// Check that active layer is ready
		if (this.activeLayerIndex >= this.layers.length || this.layers[this.activeLayerIndex].status != 'ready')
			return false;

		if (!this.shader)
			throw "Shader not specified!";

		let gl = this.gl;

		// Draw on a restricted viewport around the lens, to lower down the number of required tiles
		let lensViewport = this.getLensViewport(transform, viewport);

		gl.viewport(lensViewport.x, lensViewport.y, lensViewport.dx, lensViewport.dy);

		// Keep the framebuffer to the window size in order to avoid changing at each scale event
		if (!this.framebuffers.length || this.layout.width != viewport.w || this.layout.height != viewport.h) {
			this.deleteFramebuffers();
			this.layout.width = viewport.w;
			this.layout.height = viewport.h;
			// Create only one framebuffer for the active layer
			this.createFramebuffers();
		}

		var b = [0, 0, 0, 0];
		gl.clearColor(b[0], b[1], b[2], b[3]);

		// Save the active framebuffer from Canvas before drawing
		const activeFramebuffer = this.canvas.getActiveFramebuffer();

		// Draw ONLY the active layer within the viewport enclosing the lens
		const vl = this.getLensInViewportCoords(transform, viewport);
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[0]);
		gl.clear(gl.COLOR_BUFFER_BIT);
		this.layers[this.activeLayerIndex].draw(transform, lensViewport);
		this._updateEqualizeLut(lensViewport, vl);

		// Restore the active framebuffer from Canvas
		this.canvas.setActiveFramebuffer(activeFramebuffer);

		// Set in the lensShader the proper lens position wrt the window viewport
		this.shader.setLensUniforms(vl, [viewport.w, viewport.h], borderColor, this.borderEnable);

		this.prepareWebGL();

		// Bind only the active layer texture
		gl.uniform1i(this.shader.samplers[0].location, 0);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
		this._ensureEqualizeLutTexture();
		gl.uniform1i(this.shader.samplers[1].location, 1);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this._equalizeLutTexture);

		// Get texture coords of the lensViewport with respect to the framebuffer sz
		const lx = lensViewport.x / lensViewport.w;
		const ly = lensViewport.y / lensViewport.h;
		const hx = (lensViewport.x + lensViewport.dx) / lensViewport.w;
		const hy = (lensViewport.y + lensViewport.dy) / lensViewport.h;

		this.updateTileBuffers(
			new Float32Array([-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0]),
			new Float32Array([lx, ly, lx, hy, hx, hy, hx, ly]));
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);

		// Restore old viewport
		gl.viewport(viewport.x, viewport.y, viewport.dx, viewport.dy);

		return done;
	}

	/**
	 * Calculates viewport region affected by lens
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @returns {Object} Viewport specification for lens region
	 * @private
	 */
	getLensViewport(transform, viewport) {
		const lensC = this.getCurrentCenter();
		const l = CoordinateSystem.fromSceneToViewport(lensC, this.camera, this.useGL);
		const r = this.getRadius() * transform.z;
		return { x: Math.floor(l.x - r) - 1, y: Math.floor(l.y - r) - 1, dx: Math.ceil(2 * r) + 2, dy: Math.ceil(2 * r) + 2, w: viewport.w, h: viewport.h };
	}

	/**
	 * Calculates viewport region for overlay layer
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @returns {Object|null} Viewport specification for overlay or null
	 * @private
	 */
	getOverlayLayerViewport(transform, viewport) {
		let result = null;
		if (this.layers.length == 2) {
			// Get overlay projected viewport
			let bbox = this.layers[1].boundingBox();
			const p0v = CoordinateSystem.fromSceneToViewport({ x: bbox.xLow, y: bbox.yLow }, this.camera, this.useGL);
			const p1v = CoordinateSystem.fromSceneToViewport({ x: bbox.xHigh, y: bbox.yHigh }, this.camera, this.useGL);

			// Intersect with window viewport
			const x0 = Math.min(Math.max(0, Math.floor(p0v.x)), viewport.w);
			const y0 = Math.min(Math.max(0, Math.floor(p0v.y)), viewport.h);
			const x1 = Math.min(Math.max(0, Math.ceil(p1v.x)), viewport.w);
			const y1 = Math.min(Math.max(0, Math.ceil(p1v.y)), viewport.h);

			const width = x1 - x0;
			const height = y1 - y0;
			result = { x: x0, y: y0, dx: width, dy: height, w: viewport.w, h: viewport.h };
		}
		return result;
	}

	/**
	 * Combines two viewport regions
	 * @param {Object} v0 - First viewport
	 * @param {Object} v1 - Second viewport
	 * @returns {Object} Combined viewport encompassing both regions
	 * @private
	 */
	joinViewports(v0, v1) {
		const xm = Math.min(v0.x, v1.x);
		const xM = Math.max(v0.x + v0.dx, v1.x + v1.dx);
		const ym = Math.min(v0.y, v1.y);
		const yM = Math.max(v0.y + v0.dy, v1.y + v1.dy);
		const width = xM - xm;
		const height = yM - ym;

		return { x: xm, y: ym, dx: width, dy: height, w: v0.w, h: v0.h };
	}

	/**
	 * Converts lens parameters to viewport coordinates
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @returns {number[]} [centerX, centerY, radius, borderWidth] in viewport coordinates
	 * @private
	 */
	getLensInViewportCoords(transform, viewport) {
		const lensC = this.getCurrentCenter();
		const c = CoordinateSystem.fromSceneToViewport(lensC, this.camera, this.useGL);
		const r = this.getRadius();
		return [c.x, c.y, r * transform.z, this.getBorderWidth()];
	}

}

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['lens'] = (options) => { return new LayerLens(options); }

export { LayerLens }
