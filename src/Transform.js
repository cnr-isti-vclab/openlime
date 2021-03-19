/**
 * 
 * @param {number} x position
 * @param {number} y position
 * @param {number} z scale
 * @param {number} a rotation in degrees
 * @param {number} t time
 *
 */

import { BoundingBox } from "./BoundingBox";

class Transform {
	constructor(options) {
		Object.assign(this, { x:0, y:0, z:1, a:0, t:0 });

		if(!this.t) this.t = performance.now();
		
		if(typeof(options) == 'object')
			Object.assign(this, options);
	}

	copy() {
		let transform = new Transform();
		Object.assign(transform, this);
		return transform;
	}

	apply(x, y) {
		//TODO! ROTATE
		let r = Transform.rotate(x, y, this.a);
		return { 
			x: r.x*this.z + this.x,
			y: r.y*this.z + this.y
		}
	}

	inverse() {
		let r = this.rotate(this.x, this.y, -this.a);
		return new Transform({x:-r.x, y:-r.y, z:1/this.z, a:-this.a, t:this.t});
	}

	static normalizeAngle(a) {
		while(a > 360) a -= 360;
		while(a < 0) a += 360;
		return a;
	}
	
	static rotate(x, y, angle) {
		angle = Math.PI*(angle/180);
		let ex =  Math.cos(angle)*x + Math.sin(angle)*y;
		let ey = -Math.sin(angle)*x + Math.cos(angle)*y;
		return {x:ex, y:ey};
	}

	// first get applied this (a) then  transform (b).
	compose(transform) {
		let a = this.copy();
		let b = transform;
		a.z *= b.z;
		a.a += b.a;
		var r = Transform.rotate(a.x, a.y, b.a);
		a.x = r.x*b.z + b.x;
		a.y = r.y*b.z + b.y; 
		return a;
	}

	/* transform the box (for example -w/2, -h/2 , w/2, h/2 in scene coords) */
	transformBox(lbox) {
		let box = new BoundingBox();
		for(let i = 0; i < 4; i++) {
			let c = lbox.corner(i);
			let p = this.apply(c[0], c[1]);
			box.mergePoint(p);
		}
		return box;
	}

/*  get the bounding box (in image coordinate sppace) of the vieport. 
 */
	getInverseBox(viewport) {
		let inverse = this.inverse();
		let corners = [
			{x:viewport.x,               y:viewport.y},
			{x:viewport.x + viewport.dx, y:viewport.y},
			{x:viewport.x,               y:viewport.y + viewport.dy},
			{x:viewport.x + viewport.dx, y:viewport.y + viewport.dy}
		];
		let box = new BoundingBox();
		for(let corner of corners) {
			let p = inverse.apply(corner.x -viewport.w/2, corner.y - viewport.h/2);
			box.merge(p);
		}
		return box;
	}

	interpolate(source, target, time) {
		let t = (target.t - source.t);

		this.t = time;
		if(time < source.t) 
			return Object.assign(this, source);
		if(time > target.t || t < 0.0001) 
			return Object.assign(this, target);		

		let tt = (time - source.t)/t;
		let st = (target.t - time)/t;
		
		for(let i of ['x', 'y', 'z', 'a'])
			this[i] = (st*source[i] + tt*target[i]);
	}



/**
 *  Combines the transform with the viewport to the viewport with the transform
 * @param {Object} transform a {@link Transform} class.
 */
	projectionMatrix(viewport) {
		let z = this.z;

		// In coords with 0 in lower left corner map x0 to -1, and x0+v.w to 1
		// In coords with 0 at screen center and x0 at 0, map -v.w/2 -> -1, v.w/2 -> 1 
		// With x0 != 0: x0 -> x0-v.w/2 -> -1, and x0+dx -> x0+v.dx-v.w/2 -> 1
		// Where dx is viewport width, while w is window width
		//0, 0 <-> viewport.x + viewport.dx/2 (if x, y =
		
		let zx = 2/viewport.dx;
		let zy = 2/viewport.dy;

		let dx =  zx * this.x + (2/viewport.dx)*(viewport.w/2-viewport.x)-1;
		let dy = -zy * this.y + (2/viewport.dy)*(viewport.h/2-viewport.y)-1;

		let a = Math.PI *this.a/180;
		let matrix = [
			 Math.cos(a)*zx*z, Math.sin(a)*zy*z,  0,  0, 
			-Math.sin(a)*zx*z, Math.cos(a)*zy*z,  0,  0,
			 0,  0,  1,  0,
			dx, dy, 0,  1];
		return matrix;
	}

/**
 * TODO (if needed)
 */ 
	toMatrix() {
		let z = this.z;
		return [
			z,   0,   0,   0,
			0,   z,   0,   0, 
			0,   0,   1,   0,
			z*x, z*y, 0,   1,
		];
	}

    /**
	 * Transform p from scene (0 at image center) to [0,wh] 
	 * @param {*} viewport viewport(x,y,dx,dy,w,h)
	 * @param {*} p point in scene: 0,0 at image center
	 */ 
	sceneToViewportCoords(viewport, p) {
        return [p[0] * this.z  + this.x - viewport.x + viewport.w/2, 
                p[1] * this.z  - this.y + viewport.y + viewport.h/2 ];
    }

	/**
     * Transform p from  [0,wh] to scene (0 at image center)
	 * 
	 * @param {*} viewport viewport(x,y,dx,dy,w,h)
	 * @param {*} p point in range [0..w-1,0..h-1]
	 */
    viewportToSceneCoords(viewport, p) {
        return [(p[0] + viewport.x - viewport.w/2 - this.x) / this.z,
                (p[1] - viewport.y - viewport.h/2 + this.y) / this.z];

    }

}

function matrixMul(a, b) {
	let r = new Array(16);
	for (let i = 0; i < 4; i++) {
		for (let j = 0; j < 4; j++) {
			r[j + i*4] = 0;
			for (let k = 0; k < N; k++) {
				r[j + i*4] += a[k + i*4]*b[k + j*4]
			}
		}
	}
	return r;
}

function matMul(a, b) {
	let r = new Array(16);
	r[ 0] = a[0]*b[0] + a[4]*b[1] + a[8]*b[2] + a[12]*b[3];
	r[ 1] = a[1]*b[0] + a[5]*b[1] + a[9]*b[2] + a[13]*b[3];
	r[ 2] = a[2]*b[0] + a[6]*b[1] + a[10]*b[2] + a[14]*b[3];
	r[ 3] = a[3]*b[0] + a[7]*b[1] + a[11]*b[2] + a[15]*b[3];

	r[ 4] = a[0]*b[4] + a[4]*b[5] + a[8]*b[6] + a[12]*b[7];
	r[ 5] = a[1]*b[4] + a[5]*b[5] + a[9]*b[6] + a[13]*b[7];
	r[ 6] = a[2]*b[4] + a[6]*b[5] + a[10]*b[6] + a[14]*b[7];
	r[ 7] = a[3]*b[4] + a[7]*b[5] + a[11]*b[6] + a[15]*b[7];

	r[ 8] = a[0]*b[8] + a[4]*b[9] + a[8]*b[10] + a[12]*b[11];
	r[ 9] = a[1]*b[8] + a[5]*b[9] + a[9]*b[10] + a[13]*b[11];
	r[10] = a[2]*b[8] + a[6]*b[9] + a[10]*b[10] + a[14]*b[11];
	r[11] = a[3]*b[8] + a[7]*b[9] + a[11]*b[10] + a[15]*b[11];

	r[12] = a[0]*b[12] + a[4]*b[13] + a[8]*b[14] + a[12]*b[15];
	r[13] = a[1]*b[12] + a[5]*b[13] + a[9]*b[14] + a[13]*b[15];
	r[14] = a[2]*b[12] + a[6]*b[13] + a[10]*b[14] + a[14]*b[15];
	r[15] = a[3]*b[12] + a[7]*b[13] + a[11]*b[14] + a[15]*b[15];
	return r;
}

export { Transform, matMul }
