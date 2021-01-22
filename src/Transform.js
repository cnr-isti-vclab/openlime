
/**
 * 
 * @param {number} scale
 * @param {number} rotate
 * @param {Array<number>} pos [x, y]
 *
 */

class Transform {
	constructor(x, y, z, a, t) {
		this.x = x ? x : 0.0;
		this.y = y ? y : 0.0;
		this.z = z ? z : 1.0;
		this.a = a ? a : 0.0;
		this.t = t ? t : 0.0;
	}

	setScale() {
	}

	setRotate() {
	}

	setTranslate() {
	}

	setTime() {
	}

	interpolate(source, target, time) {
		let t = (target.time - source.time);
		let tt = time - source.time;
		let st = target.time - time;
		for(let i of ['x', 'y', 'z', 'a'])
			this[i] = st*source[i] + tt*target[i];
		this.t = time;
	}
}
