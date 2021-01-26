import { Transform } from './Transform.js'

/**
 * @param {object} options
 * * *bounded*: limit translation of the camera to the boundary of the scene.
 * * *maxZoom*: maximum zoom, 1:maxZoom is screen pixel to image pixel ratio.
 */

class Camera {

	constructor(options) {
		Object.assign(this, {
			bounded: true,
			maxZoom: 4,
			minZoom: 'full'
		});
		Object.assign(this, options);
		this.target = new Transform(this.target);
		this.source = this.target.copy();
		console.log(this.target, this.source);
	}

	getCurrentTransform(time) {
		if(time < this.target.source)
			return this.source;
		if(time > this.target.t)
			return this.target;

		let pos = new Transform();
		pos.interpolate(this.source, this.target, time);
		return pos;
	}
}

export { Camera }
