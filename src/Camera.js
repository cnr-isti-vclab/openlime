import { Transform } from './Transform.js'
import { BoundingBox } from './BoundingBox.js'

/**
 * The type Viewport defines a rectangular viewing region inside a (wxh) area
 * @typedef {Object} Viewport
 * @property {number} x x-component of the lower left corner.
 * @property {number} y y-component of the lower left corner.
 * @property {number} dx x-component of the top right corner.
 * @property {number} dy y-component of the top right corner.
 * @property {number} w the viewport width.
 * @property {number} w the viewport height.
 */

/**
 * The class Camera does not have an operational role, but it is rather a container of parameters 
 * needed by the system to define the viewport, the camera position and to calculate the appropriate view.
 * 
 * To enable the animation, a camera contains two view matrices (two {@link Transform} objects): a `source` with the 
 * current position and a `target` with the position the camera will arrive at in a time `dt`. 
 * 
 * The member function `setPosition()` takes care of defining the target, the OpenLIME system automatically animates the 
 * camera to bring it from source to target, unless the user manually interrupts the current animation.
 * 
 * User-generated device events (such as touch events or mouse events) can modify camera parameters via an appropriate {@link Controller}.
 */
class Camera {
	/**
	 * Creates a scene's camera. An update event is issued when the camera has completed its positioning.
 	 * Additionally, an object literal with Viewer `options` can be specified.
 	 * @param {Object} [options]
 	 * @param {bool} options.bounded=true Weather to limit the translation of the camera to the boundary of the scene.
 	 * @param {number} options.maxFixedZoom=2 The maximum pixel size.
  	 * @param {number} options.minScreenFraction=1 The minimum portion of the screen to zoom in.
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
			signals: { 'update': [] }
		});
		Object.assign(this, options);
		this.target = new Transform(this.target);
		this.source = this.target.copy();
		this.easing = 'linear';
	}

	/**
	 * Defines the copy constructor.
	 * @returns A copy of the Camera.
	 */
	copy() {
		let camera = new Camera();
		Object.assign(camera, this);
		return camera;
	}

	/** @ignore */
	addEvent(event, callback) {
		this.signals[event].push(callback);
	}

	/** @ignore */
	emit(event) {
		for (let r of this.signals[event])
			r(this);
	}

	/**
	 * Sets the viewport and updates the camera position as close as possible to the.
	 * @param {Viewport} view The new viewport (in CSS coordinates). 
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
	* Gets the current viewport (in device coordinates).
	* @return the current viewport
	*/
	glViewport() {
		let d = window.devicePixelRatio;
		let viewport = {};
		for (let i in this.viewport)
			viewport[i] = this.viewport[i] * d;
		return viewport;
	}

	/**
	 * Map coordinate relative to the canvas into scene coords using the specified transform.
	 * @return {Object} {X, Y} in scene coordinates (relative to the center of the viewport).
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
	 * Map coordinate relative to the scene into canvas coords using the specified transform.
	 * @return {Object} {X, Y} in canvas coordinates.
	 */
	sceneToCanvas(x, y, transform) {
		let r = Transform.rotate(x, y, transform.a);
		x = r.x * transform.z;
		y = r.y * transform.z;
		x += transform.x;
		y += transform.y;
		x += this.viewport / 2;
		y += this.viewport / 2;
		return { x: x, y: y };
	}

	/**
	 * Sets the camera target parameters (position, rotation, )
	 * @param {number} dt The animation duration in millisecond.
	 * @param {*} x The x coordinate
	 * @param {*} y The y coordinate
	 * @param {*} z The z coordinate
	 * @param {*} a The angular rotation (in degrees)
	 * @param {Easing} easing The function aimed at making the camera movement less severe or pronounced.
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
			const dx = Math.abs(bw - sw) / 2;
			x = Math.min(Math.max(-dx, x), dx);

			const dy = Math.abs(bh - sh) / 2;
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
		this.emit('update');
	}

	/**
	 * Pan the camera (in canvas coords)
	 * @param {number} dt The animation duration in millisecond.
	 * @param {number} dx The horizontal amount to pan.
	 * @param {number} dy The vertical amount to pan. 
	 */
	pan(dt, dx, dy) {
		let now = performance.now();
		let m = this.getCurrentTransform(now);
		m.dx += dx;
		m.dy += dy;
		this.setPosition(dt, m.x, m.y, m.z, m.a);
	}

	/** Zoom in or out at a specific point (in canvas coords)
	 * @param {number} dt The animation duration in millisecond.
	 * @param {number} z The distance of the camera from the canvas.
	 * @param {number} x The x coord to zoom in|out
	 * @param {number} y The y coord to zoom in|out
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
	 * Rotate the camera around its z-axis by an `a` angle (in degrees) 
	 * @param {number} dt The animation duration in millisecond.
	 * @param {angle} a The rotation angle (in degrees).
	 */
	rotate(dt, a) {

		let now = performance.now();
		let m = this.getCurrentTransform(now);

		this.setPosition(dt, m.x, m.y, m.z, this.target.a + a);
	}

	/** Zoom in or out at a specific point (in canvas coords)
	 * @param {number} dt The animation duration in millisecond.
	 * @param {number} dz The scroll amount for the z-axis.
	 * @param {number} x=0 The x coord to zoom in|out
	 * @param {number} y=0 The y coord to zoom in|out
	 */
	deltaZoom(dt, dz, x=0, y=0) {

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
	 * Gets the camera transform at `time` in canvas coords.
	 * @param {time} time The current time (a DOMHighResTimeStamp variable, as in `performance.now()`).
	 * @returns {Transform} The current transform
	 */
	getCurrentTransform(time) {
		let pos = new Transform();
		if (time < this.source.t)
			Object.assign(pos, this.source);
		if (time >= this.target.t)
			Object.assign(pos, this.target);
		else
			pos.interpolate(this.source, this.target, time, this.easing);

		pos.t = time;
		return pos;
	}

	/**
	 * Gets the camera transform at `time` in device coords.
	 * @param {time} time The current time (a DOMHighResTimeStamp variable, as in `performance.now()`).
	 * @returns {Transform} The current transform
	 */
	 getGlCurrentTransform(time) {
		const pos = this.getCurrentTransform(time);
		pos.x *= window.devicePixelRatio;
		pos.y *= window.devicePixelRatio;
		pos.z *= window.devicePixelRatio;
		return pos;
	}


	/**
	 * Modify the camera settings to frame the specified `box` 
	 * @param {BoundingBox} box The specified rectangle [minx, miny, maxx, maxy] in the canvas.
	 * @param {number} dt The animation duration in millisecond 
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

		this.setPosition(dt, -c[0], -c[1], z, 0);
	}

	/**
	 * Modify the camera settings to the factory values (home). 
	 * @param {number} dt animation duration in millisecond
	 */
	fitCameraBox(dt) {
		this.fit(this.boundingBox, dt);
	}

	/** @ignore */
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

export { Camera }
