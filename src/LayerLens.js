import { CoordinateSystem } from './CoordinateSystem.js';
import { Layer } from './Layer.js'
import { LayerCombiner } from './LayerCombiner.js'
import { ShaderLens } from './ShaderLens.js'

/**
 * @typedef {Object} LayerLensOptions
 * @property {boolean} [overlay=true] - Whether the lens renders as an overlay
 * @property {number} [radius=100] - Initial lens radius in pixels
 * @property {number[]} [borderColor=[0.078, 0.078, 0.078, 1]] - RGBA border color
 * @property {number} [borderWidth=12] - Border width in pixels
 * @property {boolean} [borderEnable=false] - Whether to show lens border
 * @property {Object} [dashboard=null] - Dashboard UI component for lens control
 * @property {Camera} camera - Camera instance (required)
 * @extends LayerCombinerOptions
 */

/**
 * LayerLens implements a magnifying lens effect that can display content from one or two layers.
 * It provides an interactive lens that can be moved and resized, showing different layer content
 * inside and outside the lens area.
 * 
 * Features:
 * - Interactive lens positioning and sizing
 * - Support for base and overlay layers
 * - Animated transitions
 * - Customizable border appearance
 * - Dashboard UI integration
 * - Optimized viewport rendering
 * 
 * Technical Details:
 * - Uses framebuffer composition for layer blending
 * - Implements viewport optimization for performance
 * - Handles coordinate transformations between systems
 * - Supports animated parameter changes
 * - Manages WebGL resources efficiently
 * 
 * @extends LayerCombiner
 * 
 * @example
 * ```javascript
 * // Create lens with base layer
 * const lens = new OpenLIME.LayerLens({
 *   camera: viewer.camera,
 *   radius: 150,
 *   borderEnable: true,
 *   borderColor: [0, 0, 0, 1]
 * });
 * 
 * // Set layers
 * lens.setBaseLayer(baseLayer);
 * lens.setOverlayLayer(overlayLayer);
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
			dashboard: null,
		}, options);
		super(options);

		if (!this.camera) {
			console.log("Missing camera");
			throw "Missing Camera"
		}

		// Shader lens currently handles up to 2 layers
		let shader = new ShaderLens();
		if (this.layers.length == 2) shader.setOverlayLayerEnabled(true); //FIXME Is it a mode? Control?
		this.shaders['lens'] = shader;
		this.setShader('lens');

		this.addControl('center', [0, 0]);
		this.addControl('radius', [this.radius, 0]);
		this.addControl('borderColor', this.borderColor);
		this.addControl('borderWidth', [this.borderWidth]);

		this.oldRadius = -9999;
		this.oldCenter = [-9999, -9999];

		this.useGL = true;

		if (this.dashboard) this.dashboard.lensLayer = this;
	}

	/**
	 * Sets layer visibility and updates dashboard if present
	 * @param {boolean} visible - Whether layer should be visible
	 * @override
	 */
	setVisible(visible) {
		if (this.dashboard) {
			if (visible) {
				this.dashboard.container.style.display = 'block';
			} else {
				this.dashboard.container.style.display = 'none';
			}
		}
		super.setVisible(visible);
	}

	/**
	 * Removes the overlay layer, returning to single layer mode
	 */
	removeOverlayLayer() {
		this.layers.length = 1;
		this.shader.setOverlayLayerEnabled(false);
	}

	/**
	 * Sets the base layer (shown outside lens)
	 * @param {Layer} layer - Base layer instance
	 * @fires Layer#update
	 */
	setBaseLayer(l) {
		this.layers[0] = l;
		this.emit('update');
	}

	/**
	 * Sets the overlay layer (shown inside lens)
	 * @param {Layer} layer - Overlay layer instance
	 */
	setOverlayLayer(l) {
		this.layers[1] = l;
		this.layers[1].setVisible(true);
		this.shader.setOverlayLayerEnabled(true);

		this.regenerateFrameBuffers();
	}

	/**
	 * Sets the overlay layer (shown inside lens)
	 * @param {Layer} layer - Overlay layer instance
	 */
	regenerateFrameBuffers() {
		// Regenerate frame buffers
		const w = this.layout.width;
		const h = this.layout.height;
		this.deleteFramebuffers();
		this.layout.width = w;
		this.layout.height = h;
		this.createFramebuffers();
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
	 * Renders the lens effect
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @returns {boolean} Whether all animations are complete
	 * @override
	 * @private
	 */
	draw(transform, viewport) {
		let done = this.interpolateControls();

		// Update dashboard size & pos
		if (this.dashboard) {
			const c = this.getCurrentCenter();
			const r = this.getRadius();
			this.dashboard.update(c.x, c.y, r);
			this.oldCenter = c;
			this.oldRadius = r;
		}
		// const vlens = this.getLensInViewportCoords(transform, viewport);
		// this.shader.setLensUniforms(vlens, [viewport.w, viewport.h], this.borderColor);
		// this.emit('draw');
		// super.draw(transform, viewport);

		for (let layer of this.layers)
			if (layer.status != 'ready')
				return false;

		if (!this.shader)
			throw "Shader not specified!";

		let gl = this.gl;

		// Draw on a restricted viewport around the lens, to lower down the number of required tiles
		let lensViewport = this.getLensViewport(transform, viewport);

		// If an overlay is present, merge its viewport with the lens one
		let overlayViewport = this.getOverlayLayerViewport(transform, viewport);
		if (overlayViewport != null) {
			lensViewport = this.joinViewports(lensViewport, overlayViewport);
		}

		gl.viewport(lensViewport.x, lensViewport.y, lensViewport.dx, lensViewport.dy);

		// Keep the framwbuffer to the window size in order to avoid changing at each scale event
		if (!this.framebuffers.length || this.layout.width != viewport.w || this.layout.height != viewport.h) {
			this.deleteFramebuffers();
			this.layout.width = viewport.w;
			this.layout.height = viewport.h;
			this.createFramebuffers();
		}
		var b = [0, 0, 0, 0];
		gl.clearColor(b[0], b[1], b[2], b[3]);

		// Draw the layers only within the viewport enclosing the lens
		for (let i = 0; i < this.layers.length; i++) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[i]);
			gl.clear(gl.COLOR_BUFFER_BIT);
			this.layers[i].draw(transform, lensViewport);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}

		// Set in the lensShader the proper lens position wrt the window viewport
		const vl = this.getLensInViewportCoords(transform, viewport);
		this.shader.setLensUniforms(vl, [viewport.w, viewport.h], this.getBorderColor(), this.borderEnable);

		this.prepareWebGL();

		// Bind all textures and combine them with the shaderLens
		for (let i = 0; i < this.layers.length; i++) {
			gl.uniform1i(this.shader.samplers[i].location, i);
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
		}

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
		gl.viewport(viewport.x, viewport.x, viewport.dx, viewport.dy);

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
