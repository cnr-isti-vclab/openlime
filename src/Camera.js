import { Transform } from './Transform.js'
import { BoundingBox } from './BoundingBox.js'
import { addSignals } from './Signals.js'

/**
 * Defines a rectangular viewing region inside a canvas area.
 * @typedef {Object} Viewport
 * @property {number} x - X-coordinate of the lower-left corner
 * @property {number} y - Y-coordinate of the lower-left corner
 * @property {number} dx - Width of the viewport
 * @property {number} dy - Height of the viewport
 * @property {number} w - Total canvas width
 * @property {number} h - Total canvas height
 */

/**
 * Camera class that manages viewport parameters and camera transformations.
 * Acts as a container for parameters needed to define the viewport and camera position,
 * supporting smooth animations between positions using source and target transforms.
 * 
 * The camera maintains two Transform objects:
 * - source: represents current position
 * - target: represents destination position
 * 
 * Animation between positions is handled automatically by the OpenLIME system
 * unless manually interrupted by user input.
 */
class Camera {
	/**
	 * Creates a new Camera instance.
	 * @param {Object} [options] - Configuration options
	 * @param {boolean} [options.bounded=true] - Whether to limit camera translation to scene boundaries
	 * @param {number} [options.maxFixedZoom=2] - Maximum allowed pixel size
	 * @param {number} [options.minScreenFraction=1] - Minimum portion of screen to show when zoomed in
	 * @param {Transform} [options.target] - Initial target transform
	 * @fires Camera#update
	 */
	constructor(options) {
		Object.assign(this, {
			viewport: null,
			bounded: true,
			minScreenFraction: 1,
			maxFixedZoom: 2,
			maxZoom: 2,
			minZoom: 1,
			boundingBox: new BoundingBox,
		});
		Object.assign(this, options);
		this.target = new Transform(this.target);
		this.source = this.target.copy();
		this.easing = 'linear';
	}

	/**
	 * Creates a deep copy of the camera instance.
	 * @returns {Camera} A new Camera instance with copied properties
	 */
	copy() {
		let camera = new Camera();
		Object.assign(camera, this);
		return camera;
	}

	/**
	* Updates the viewport while maintaining the camera position as close as possible to the previous one.
	* @param {Viewport} view - The new viewport in CSS coordinates
	*/
	setViewport(view) {
		if (this.viewport) {
			let rz = Math.sqrt((view.w / this.viewport.w) * (view.h / this.viewport.h));
			this.viewport = view;
			const { x, y, z, a } = this.target;
			this.setPosition(0, x, y, z * rz, a);
		} else {
			this.viewport = view;
		}
	}

	/**
	 * Returns the current viewport in device coordinates (accounting for device pixel ratio).
	 * @returns {Viewport} The current viewport scaled for device pixels
	 */
	glViewport() {
		let d = window.devicePixelRatio;
		let viewport = {};
		for (let i in this.viewport)
			viewport[i] = this.viewport[i] * d;
		return viewport;
	}

	/**
	 * Converts canvas coordinates to scene coordinates using the specified transform.
	 * @param {number} x - X coordinate relative to canvas
	 * @param {number} y - Y coordinate relative to canvas
	 * @param {Transform} transform - Transform to use for conversion
	 * @returns {{x: number, y: number}} Coordinates in scene space relative to viewport center
	 */
	mapToScene(x, y, transform) {
		//compute coords relative to the center of the viewport.
		x -= this.viewport.w / 2;
		y -= this.viewport.h / 2;
		x -= transform.x;
		y -= transform.y;
		x /= transform.z;
		y /= transform.z;
		let r = Transform.rotate(x, y, -transform.a);
		return { x: r.x, y: r.y };
	}

	/**
	 * Converts scene coordinates to canvas coordinates using the specified transform.
	 * @param {number} x - X coordinate in scene space
	 * @param {number} y - Y coordinate in scene space
	 * @param {Transform} transform - Transform to use for conversion
	 * @returns {{x: number, y: number}} Coordinates in canvas space
	 */
	sceneToCanvas(x, y, transform) {
		let r = Transform.rotate(x, y, transform.a);
		x = r.x * transform.z + transform.x - this.viewport.x + this.viewport.w / 2;
		y = r.y * transform.z - transform.y + this.viewport.y + this.viewport.h / 2;
		return { x: x, y: y };
	}

	/**
	 * Sets the camera target parameters for a new position.
	 * @param {number} dt - Animation duration in milliseconds
	 * @param {number} x - X component of translation
	 * @param {number} y - Y component of translation
	 * @param {number} z - Zoom factor
	 * @param {number} a - Rotation angle in degrees
	 * @param {string} [easing] - Easing function name for animation
	 * @fires Camera#update
	 */
	setPosition(dt, x, y, z, a, easing) {
		/**
		* The event is fired when the camera target is changed.
		* @event Camera#update
		*/

		// Discard events due to cursor outside window
		//if (Math.abs(x) > 64000 || Math.abs(y) > 64000) return;
		this.easing = easing || this.easing;

		if (this.bounded) {
			const sw = this.viewport.dx;
			const sh = this.viewport.dy;

			//
			let xform = new Transform({ x: x, y: y, z: z, a: a, t: 0 });
			let tbox = xform.transformBox(this.boundingBox);
			const bw = tbox.width();
			const bh = tbox.height();

			// Screen space offset between image boundary and screen boundary
			// Do not let transform offet go beyond this limit.
			// if (scaled-image-size < screen) it remains fully contained
			// else the scaled-image boundary closest to the screen cannot enter the screen.
			const dx = Math.abs(bw - sw) / 2;// + this.boundingBox.center().x- tbox.center().x;
			x = Math.min(Math.max(-dx, x), dx);

			const dy = Math.abs(bh - sh) / 2;// + this.boundingBox.center().y - tbox.center().y;
			y = Math.min(Math.max(-dy, y), dy);
		}

		let now = performance.now();
		this.source = this.getCurrentTransform(now);
		//the angle needs to be interpolated in the shortest direction.
		//target it is kept between 0 and +360, source is kept relative.
		a = Transform.normalizeAngle(a);
		this.source.a = Transform.normalizeAngle(this.source.a);
		if (a - this.source.a > 180) this.source.a += 360;
		if (this.source.a - a > 180) this.source.a -= 360;
		Object.assign(this.target, { x: x, y: y, z: z, a: a, t: now + dt });
		console.assert(!isNaN(this.target.x));
		this.emit('update');
	}

	/**
	 * Pans the camera by a specified amount in canvas coordinates.
	 * @param {number} dt - Animation duration in milliseconds
	 * @param {number} dx - Horizontal displacement
	 * @param {number} dy - Vertical displacement
	 */
	pan(dt, dx, dy) {
		let now = performance.now();
		let m = this.getCurrentTransform(now);
		m.x += dx;
		m.y += dy;
		this.setPosition(dt, m.x, m.y, m.z, m.a);
	}

	/**
	 * Zooms the camera to a specific point in canvas coordinates.
	 * @param {number} dt - Animation duration in milliseconds
	 * @param {number} z - Target zoom level
	 * @param {number} [x=0] - X coordinate to zoom towards
	 * @param {number} [y=0] - Y coordinate to zoom towards
	 */
	zoom(dt, z, x, y) {
		if (!x) x = 0;
		if (!y) y = 0;

		let now = performance.now();
		let m = this.getCurrentTransform(now);

		if (this.bounded) {
			z = Math.min(Math.max(z, this.minZoom), this.maxZoom);
		}

		//x, an y should be the center of the zoom.
		m.x += (m.x + x) * (m.z - z) / m.z;
		m.y += (m.y + y) * (m.z - z) / m.z;

		this.setPosition(dt, m.x, m.y, z, m.a);
	}

	/**
	 * Rotates the camera around its z-axis.
	 * @param {number} dt - Animation duration in milliseconds
	 * @param {number} a - Rotation angle in degrees
	 */
	rotate(dt, a) {

		let now = performance.now();
		let m = this.getCurrentTransform(now);

		this.setPosition(dt, m.x, m.y, m.z, this.target.a + a);
	}

	/**
	 * Applies a relative zoom change at a specific point.
	 * @param {number} dt - Animation duration in milliseconds
	 * @param {number} dz - Relative zoom change factor
	 * @param {number} [x=0] - X coordinate to zoom around
	 * @param {number} [y=0] - Y coordinate to zoom around
	 */
	deltaZoom(dt, dz, x = 0, y = 0) {

		let now = performance.now();
		let m = this.getCurrentTransform(now);

		//rapid firing wheel event need to compound.
		//but the x, y in input are relative to the current transform.
		dz *= this.target.z / m.z;

		if (this.bounded) {
			if (m.z * dz < this.minZoom) dz = this.minZoom / m.z;
			if (m.z * dz > this.maxZoom) dz = this.maxZoom / m.z;
		}

		//transform is x*z + dx = X , there x is positrion in scene, X on screen
		//we want x*z*dz + dx1 = X (stay put, we need to find dx1.
		let r = Transform.rotate(x, y, m.a);
		m.x += r.x * m.z * (1 - dz);
		m.y += r.y * m.z * (1 - dz);

		this.setPosition(dt, m.x, m.y, m.z * dz, m.a);
	}

	/**
	 * Gets the camera transform at a specific time.
	 * @param {number} time - Current time in milliseconds (from performance.now())
	 * @returns {Transform} The interpolated transform at the specified time
	 */
	getCurrentTransform(time) {
		if (time > this.target.t) this.easing = 'linear';
		return Transform.interpolate(this.source, this.target, time, this.easing);
	}

	/**
	 * Gets the camera transform at a specific time in device coordinates.
	 * @param {number} time - Current time in milliseconds (from performance.now())
	 * @returns {Transform} The interpolated transform scaled for device pixels
	 */
	getGlCurrentTransform(time) {
		const pos = this.getCurrentTransform(time);
		pos.x *= window.devicePixelRatio;
		pos.y *= window.devicePixelRatio;
		pos.z *= window.devicePixelRatio;
		return pos;
	}

	/**
	 * Adjusts the camera to frame a specified bounding box.
	 * @param {BoundingBox} box - The box to frame in canvas coordinates
	 * @param {number} [dt=0] - Animation duration in milliseconds
	 */
	fit(box, dt) {
		if (box.isEmpty()) return;
		if (!dt) dt = 0;

		//find if we align the topbottom borders or the leftright border.
		let w = this.viewport.dx;
		let h = this.viewport.dy;

		let bw = box.width();
		let bh = box.height();
		let c = box.center();
		let z = Math.min(w / bw, h / bh);

		this.setPosition(dt, -c.x * z, -c.y * z, z, 0);
	}

	/**
	 * Resets the camera to show the entire scene.
	 * @param {number} dt - Animation duration in milliseconds
	 */
	fitCameraBox(dt) {
		this.fit(this.boundingBox, dt);
	}

	/**
	 * Updates the camera's boundary constraints and zoom limits.
	 * @private
	 * @param {BoundingBox} box - New bounding box for constraints
	 * @param {number} minScale - Minimum scale factor
	 */
	updateBounds(box, minScale) {
		this.boundingBox = box;
		const w = this.viewport.dx;
		const h = this.viewport.dy;

		let bw = this.boundingBox.width();
		let bh = this.boundingBox.height();

		this.minZoom = Math.min(w / bw, h / bh) * this.minScreenFraction;
		this.maxZoom = minScale > 0 ? this.maxFixedZoom / minScale : this.maxFixedZoom;
		this.maxZoom = Math.max(this.minZoom, this.maxZoom);
	}
}

addSignals(Camera, 'update');

export { Camera }
