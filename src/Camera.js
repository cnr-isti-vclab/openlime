import { Transform } from './Transform.js'
import { BoundingBox } from './BoundingBox.js'

/**
 * Creates a scene's camera.
 * Additionally, an object literal with Viewer `options` can be specified.
 *  NOTICE TODO: the camera has the transform relative to the whole canvas NOT the viewport.
 * @param {object} options
 * * *bounded*: limit translation of the camera to the boundary of the scene.
 * * *maxZoom*: maximum zoom, 1:maxZoom is screen pixel to image pixel ratio.
 * * *minZoom*: minimum zoom,
 * * *minScreenFraction: the minimum portion of the screen to zoom in
 * * *maxFixedZoom: maximum pixel size
 * Signals:
 * Emits 'update' event when target is changed.
 */

class Camera {

	constructor(options) {
		Object.assign(this, {
			viewport: null,
			bounded: true,
			minScreenFraction: 1,
			maxFixedZoom: 2,
			maxZoom: 2,
			minZoom: 1,
			boundingBox: new BoundingBox,

			signals: {'update':[]}
		});
		Object.assign(this, options);
		this.target = new Transform(this.target);
		this.source = this.target.copy();
    		this.easing = 'linear';
	}

	copy() {
		let camera = new Camera();
		Object.assign(camera, this);
		return camera;
	}

	addEvent(event, callback) {
		this.signals[event].push(callback);
	}

	emit(event) {
		for(let r of this.signals[event])
			r(this);
	}

/**
 *  Set the viewport and updates the camera for an as close as possible.
 */
	setViewport(view) {
		if(this.viewport) {
			let rz = Math.sqrt((view.w/this.viewport.w)*(view.h/this.viewport.h));
			this.viewport = view;
			const {x, y, z, a } = this.target;
			this.setPosition(0, x, y, z*rz, a);
		} else {
			this.viewport = view;
		}
	}

	glViewport() {
		let d = window.devicePixelRatio;
		let viewport = {};
		for (let i in this.viewport) 
			viewport[i] = this.viewport[i]*d;
		return viewport;
	}
/**
 *  Map coordinate relative to the canvas into scene coords. using the specified transform.
 * @returns [X, Y] in scene coordinates.
 */
	mapToScene(x, y, transform) {
		//compute coords relative to the center of the viewport.
		x -= this.viewport.w/2;
		y -= this.viewport.h/2;
		x -= transform.x;
		y -= transform.y;
		x /= transform.z;
		y /= transform.z;
		let r = Transform.rotate(x, y, -transform.a);
		return {x:r.x, y:r.y};
	}
    	sceneToCanvas(x, y, transform) {
    		let r = Transform.rotate(x, y, transform.a);
    		x = r.x * transform.z;
    		y = t.y * transform.z;
    		x += transform.x;
    		y += transform.y;
    		x += this.viewport/2;
    		y += this.viewport/2;
    		return { x: x, y: y };
    	}

	setPosition(dt, x, y, z, a, easing) {
		// Discard events due to cursor outside window
		//if (Math.abs(x) > 64000 || Math.abs(y) > 64000) return;
		this.easing = easing || this.easing;

		if (this.bounded) {
			const sw = this.viewport.dx;
			const sh = this.viewport.dy;

			//
			let xform = new Transform({x:x, y:y, z:z, a:a,t:0});
			let tbox = xform.transformBox(this.boundingBox);
			const bw = tbox.width();
			const bh = tbox.height();

			// Screen space offset between image boundary and screen boundary
			// Do not let transform offet go beyond this limit.
			// if (scaled-image-size < screen) it remains fully contained
			// else the scaled-image boundary closest to the screen cannot enter the screen.
			const dx = Math.abs(bw-sw)/2;
			x = Math.min(Math.max(-dx, x), dx);

			const dy = Math.abs(bh-sh)/2;
			y = Math.min(Math.max(-dy, y), dy);
		}

		let now = performance.now();
		this.source = this.getCurrentTransform(now);
		//the angle needs to be interpolated in the shortest direction.
		//target it is kept between 0 and +360, source is kept relative.
		a = Transform.normalizeAngle(a);
		this.source.a = Transform.normalizeAngle(this.source.a);
		if(a - this.source.a > 180) this.source.a += 360;
		if(this.source.a - a > 180) this.source.a -= 360;
		Object.assign(this.target, { x: x, y:y, z:z, a:a, t:now + dt });
		this.emit('update');
	}
	

/*
 * Pan the camera 
 * @param {number} dx move the camera by dx pixels (positive means the image moves right).
 */
	pan(dt, dx, dy) {
		let now = performance.now();
		let m = this.getCurrentTransform(now);
		m.dx += dx;
		m.dy += dy;
	}

/* zoom in or out at a specific point in canvas coords!
 * TODO: this is not quite right!
 */
	zoom(dt, z, x, y) {
		if(!x) x = 0;
		if(!y) y = 0;

		let now = performance.now();
		let m = this.getCurrentTransform(now);

		if (this.bounded) {
			z = Math.min(Math.max(z, this.minZoom), this.maxZoom);
		}

		//x, an y should be the center of the zoom.
		m.x += (m.x+x)*(m.z - z)/m.z;
		m.y += (m.y+y)*(m.z - z)/m.z;

		this.setPosition(dt, m.x, m.y, z, m.a);
	}

	rotate(dt, a) {

		let now = performance.now();
		let m = this.getCurrentTransform(now);

		this.setPosition(dt, m.x, m.y, m.z, this.target.a + a);
	}

	deltaZoom(dt, dz, x, y) {
		if(!x) x = 0;
		if(!y) y = 0;

		let now = performance.now();
		let m = this.getCurrentTransform(now);


		//rapid firing wheel event need to compound.
		//but the x, y in input are relative to the current transform.
		dz *= this.target.z/m.z;

		if (this.bounded) {
			if (m.z*dz < this.minZoom) dz = this.minZoom / m.z;
			if (m.z*dz > this.maxZoom) dz = this.maxZoom / m.z;
		}

		//transform is x*z + dx = X , there x is positrion in scene, X on screen
		//we want x*z*dz + dx1 = X (stay put, we need to find dx1.
		let r = Transform.rotate(x, y, m.a);
		m.x += r.x*m.z*(1 - dz);
		m.y += r.y*m.z*(1 - dz);

		
		this.setPosition(dt, m.x, m.y, m.z*dz, m.a);
	}


	getCurrentTransform(time) {
		let pos = new Transform();
		if(time < this.source.t)
			Object.assign(pos, this.source);
		if(time >= this.target.t)
			Object.assign(pos, this.target);
		else 
			pos.interpolate(this.source, this.target, time, this.easing);

		pos.t = time;
		return pos;
	}

	getGlCurrentTransform(time) {
		const pos = this.getCurrentTransform(time);
		pos.x *= window.devicePixelRatio;
		pos.y *= window.devicePixelRatio;
		pos.z *= window.devicePixelRatio;
		return pos;
	}
/**
 * @param {Array} box fit the specified rectangle [minx, miny, maxx, maxy] in the canvas.
 * @param {number} dt animation duration in millisecond 
 * @param {string} size how to fit the image: <contain | cover> default is contain (and cover is not implemented
 */

//TODO should fit keeping the same angle!
	fit(box, dt, size) {
		if (box.isEmpty()) return;
		if(!dt) dt = 0;

		//find if we align the topbottom borders or the leftright border.
		let w = this.viewport.dx;
		let h = this.viewport.dy;


		let bw = box.width();
		let bh = box.height();
		let c = box.center();
		let z = Math.min(w/bw, h/bh);

		this.setPosition(dt, -c[0], -c[1], z, 0);
	}

	fitCameraBox(dt) {
		this.fit(this.boundingBox, dt);
	}

	updateBounds(box, minScale) {
		this.boundingBox = box;
		const w = this.viewport.dx;
		const h = this.viewport.dy;

		let bw = this.boundingBox.width();
		let bh = this.boundingBox.height();
	
		this.minZoom = Math.min(w/bw, h/bh) * this.minScreenFraction;
		this.maxZoom = minScale > 0 ? this.maxFixedZoom / minScale : this.maxFixedZoom;
		this.maxZoom = Math.max(this.minZoom, this.maxZoom);
	}
}

export { Camera }
