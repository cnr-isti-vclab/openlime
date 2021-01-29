import { Transform } from './Transform.js'

/**
 * @param {object} options
 * * *bounded*: limit translation of the camera to the boundary of the scene.
 * * *maxZoom*: maximum zoom, 1:maxZoom is screen pixel to image pixel ratio.
 */

class Camera {

	constructor(options) {
		Object.assign(this, {
			viewport: [0, 0, 1, 1],
			bounded: true,
			maxZoom: 4,
			minZoom: 'full',

			signals: {'update':[]}
		});
		Object.assign(this, options);
		this.target = new Transform(this.target);
		this.source = this.target.copy();
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
		this.viewport = view;
		//TODO!
	}

/**
 *  Map coordinate relative to the canvas into scene coords. using the specified transform.
 * @returns [X, Y] in scene coordinates.
 */
	mapToScene(x, y, transform) {
		//compute coords relative to the center of the viewport.
		x -= (this.viewport[2] + this.viewport[0])/2;
		y -= (this.viewport[3] + this.viewport[1])/2;
		x /= transform.z;
		y /= transform.z;
		x -= transform.x;
		y -= transform.y;
		//TODO add rotation!
		return {x:x, y:y};
	}


	setPosition(dt, x, y, z, a) {
		let now = performance.now();
		this.source = this.getCurrentTransform(now);
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
 *
 */
	zoom(dt, dz, x, y) {
		if(!x) x = 0;
		if(!y) y = 0;

		let now = performance.now();
		let m = this.getCurrentTransform(now);


		//x, an y should be the center of the zoom.

		console.log("diff:", m.x, x, dz, m.z);
		m.x += (m.x+x)*(1 - dz);
		m.y += (m.y+y)*(1 - dz);

//		m.x += x*(m.z - m.z*dz);
//		m.y += y*(m.z - m.z*dz);
//		m.x = (m.x - ox + ox*(dz);
//		m.y = (m.x - oy + oy*(dz);
		this.setPosition(dt, m.x, m.y, m.z*dz, m.a);
	}

	getCurrentTransform(time) {
		if(time < this.source.t)
			return this.source.copy();
		if(time >= this.target.t)
			return this.target.copy();

		let pos = new Transform();
		pos.interpolate(this.source, this.target, time);
		return pos;
	}

/**
 * @param {Array} box fit the specified rectangle [minx, miny, maxx, maxy] in the canvas.
 * @param {number} dt animation duration in millisecond 
 * @param {string} size how to fit the image: <contain | cover> default is contain (and cover is not implemented
 */
	fit(box, dt, size) {
		if(!dt) dt = 0;

		//find if we align the topbottom borders or the leftright border.
		let w = this.viewport[2] - this.viewport[0];
		let h = this.viewport[3] - this.viewport[1];
		let bw = box[2] - box[0];
		let bh = box[3] - box[1];
		let z = Math.min(w/bw, h/bh);

		this.setPosition(dt, (box[0] + box[2])/2, (box[1] + box[3])/2, z, 0);
	}

}

export { Camera }
