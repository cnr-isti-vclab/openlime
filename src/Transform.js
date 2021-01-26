
/**
 * 
 * @param {number} x position
 * @param {number} y position
 * @param {number} z scale
 * @param {number} a rotation
 * @param {number} t time
 *
 */

class Transform {
	constructor(x, y, z, a, t) {
		if(x === null) {
			let initial = { x: 0.0, y: 0.0, z: 1.0, a: 0.0, t: 0.0 };
			Object.assing(this, initial());
			return;
		}
		this.x = x ? x : 0.0;
		this.y = y ? y : 0.0;
		this.z = z ? z : 1.0;
		this.a = a ? a : 0.0;
		this.t = t ? t : 0.0;
	}

	copy() {
		return Object.assign({}, this);
	}

	interpolate(source, target, time) {
		if(time < source.t) return source;
		if(time > target.t) return target;

		let t = (target.t - source.t);
		if(t < 0.0001)
			return target;

		let tt = (time - source.t)/t;
		let st = (target.t - t)/t;

		for(let i of ['x', 'y', 'z', 'a'])
			this[i] = (st*source[i] + tt*target[i]);
		this.t = time;
	}
}

export { Transform }
