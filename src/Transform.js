import { BoundingBox } from "./BoundingBox";

/**
 * A [x, y] point.
 * @typedef APoint
 * @property {number} p.0 The x-coordinate.
 * @property {number} p.1 The y-coordinate.
 */

/**
 * A {x, y} point.
 * @typedef {Object} Point
 * @property {number} x The x-coordinate.
 * @property {number} y The y-coordinate.
 */

/**
 * The class **Transform** implements a 2D affine map to convert coordinates between two systems.
 * The map is internally represented by four values:
 * * `x` the x-component of the translation vector
 * * `y` the y-component of the translation vector
 * * `a` the rotation angle around the z-axis (in degrees)
 * * `z` the scale factor
 * 
 * A transformation between a point P to P' is defined by
 * ```
 * P' = z*rot(a)*P + t
 * ```
 * where `z` is the scale factor, `a` is the rotation angle, and `t(x,y)` is the translation vector.
 * 
 * The class implements a set of geometric transformations useful to position the camera, create animations, etc... 
 */

class Transform { //FIXME Add translation to P?
	/**
	 * Instantiates a Transform object.
	 * @param {Object} [options] An object literal with Transform parameters.
	 * @param {number} options.x=0 The x-component of the translation vector.
	 * @param {number} options.y=0 The y-component of the translation vector.
	 * @param {number} options.a=0 The rotation angle (in degrees).
	 * @param {number} options.z=1 The scale factor.
	 * @param {time} options.t=0 The current time.
	 */
	constructor(options) {
		Object.assign(this, { x:0, y:0, z:1, a:0, t:0 });

		if(!this.t) this.t = performance.now();
		
		if(typeof(options) == 'object')
			Object.assign(this, options);
	}

	/**
	 * Gets a copy of `this` Transform.
	 * @returns {Transform} The copy of the Transform.
	 */
	copy() {
		let transform = new Transform();
		Object.assign(transform, this);
		return transform;
	}

	/**
	 * Applies `this` Transform to a point P(x,y) to get P'(x',y').
	 * @param {number} x x-coordinate of the point P.
	 * @param {number} y y-coordinate of the point P.
	 * @returns {{x, y}} The point P'.
	 */
	apply(x, y) {
		//TODO! ROTATE
		let r = Transform.rotate(x, y, this.a);
		return { 
			x: r.x*this.z + this.x,
			y: r.y*this.z + this.y
		}
	}

	/**
	 * Computes the inverse of `this` Transform.
	 * @returns {Transform} The inverse Transform.
	 */
	inverse() {
		let r = Transform.rotate(this.x/this.z, this.y/this.z, -this.a);
		return new Transform({x:-r.x, y:-r.y, z:1/this.z, a:-this.a, t:this.t});
	}

	/**
	 * Maps an angle `a` to range from 0 to 360 degrees.
	 * @param {number} a The angle (in degrees).
	 * @returns {number} The normalized angle.
	 */
	static normalizeAngle(a) {
		while(a > 360) a -= 360;
		while(a < 0) a += 360;
		return a;
	}

	/**
	 * Computes the rotation of a point P(x,y) by an angle `a` around the z-axis to get P'(x',y').
	 * @param {*} x x-coordinate of the point P.
	 * @param {*} y y-coordinate of the point P.
	 * @param {*} a The rotation angle (in degrees)
	 * @returns {{x,y}} The point P'.
	 */
	static rotate(x, y, a) {
		a = Math.PI*(a/180);
		let ex =  Math.cos(a)*x + Math.sin(a)*y;
		let ey = -Math.sin(a)*x + Math.cos(a)*y;
		return {x:ex, y:ey};
	}

	// first get applied this (a) then  transform (b).
	/**
	 * Composes (multiplies) `this` Transform with an other `transform`.
	 * @param {Transform} transform 
	 * @returns {Transform} The result of the composition.
	 */
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

	/**
	 * Applyes `this` Transform to a bounding box.
	 * @param {BoundingBox} lbox 
	 * @returns {BoundingBox} The result.
	 */
	transformBox(lbox) {
		let box = new BoundingBox();
		for(let i = 0; i < 4; i++) {
			let c = lbox.corner(i);
			let p = this.apply(c[0], c[1]);
			box.mergePoint(p);
		}
		return box;
	}

	/**
	 * Gets the bounding box (in image coordinate space) of the vieport. The viewport y-axis points up.
	 * The image and screen transform has y pointing down.
	 * @param {Viewport} viewport 
	 * @returns {BoundingBox} The bounding box.
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
			let p = inverse.apply(corner.x -viewport.w/2, -corner.y + viewport.h/2);
			box.mergePoint(p);
		}
		return box;
	}

	/**
	* The type Easing defines the function that regulates the movement of the camera
	* @typedef {('linear'|'ease-out'|'ease-in-out')} Transform#Easing
	*/

	/**
	 * Computes the interpolated transform at time `time` between `source` and `target` 
	 * @param {Transform} source The source transform.
	 * @param {Transform} target The target transform.
	 * @param {time} time The time at which to compute the interpolation.
	 * @param {Transform#Easing} easing The easing function.
	 * @returns {Transform} The interpolated transform.
	 */
	static interpolate(source, target, time, easing) { //FIXME STATIC
		const pos = new Transform();
		let t = (target.t - source.t);
		if (time < source.t) {
			Object.assign(pos, source);
		} else if (time > target.t || t < 0.001) {
			Object.assign(pos, target);
		} else {
			let tt = (time - source.t) / t;
			switch (easing) {
				case 'ease-out': tt = 1 - Math.pow(1 - tt, 2); break;
				case 'ease-in-out': tt = tt < 0.5 ? 2 * tt * tt : 1 - Math.pow(-2 * tt + 2, 2) / 2; break;
			}
			let st = 1 - tt;
			for (let i of ['x', 'y', 'z', 'a'])
				pos[i] = (st * source[i] + tt * target[i]);
		}
		pos.t = time;
		return pos;
	}

	/**
	 * Combines `this` Transform with the viewport to get the WebGL projection matrix.
	 * @param {Viewport} viewport The viewport. 
	 * @returns {number[]} The result.
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
	 * Transforms the point `p` from scene (0 at image center) to [0,wh]  .
	 * @param {Viewport} viewport The viewport.
	 * @param {APoint} p The point in scene (0,0 at image center)
	 * @returns {APoint} The point in range [0..w-1,0..h-1]
	 */ 
	sceneToViewportCoords(viewport, p) { //FIXME Point is an array, but in other places it is an Object...
        return [p[0] * this.z  + this.x - viewport.x + viewport.w/2, 
                p[1] * this.z  - this.y + viewport.y + viewport.h/2 ];
    }

	/**
     * Transforms the point `p` from [0,wh] to scene (0 at image center).
	 * 
	 * @param {Viewport} viewport The viewport.
	 * @param {APoint} p The point in range [0..w-1,0..h-1]
	 * @returns {APoint} The point in scene (0,0 at image center)
	 */
    viewportToSceneCoords(viewport, p) {
        return [(p[0] + viewport.x - viewport.w/2 - this.x) / this.z,
                (p[1] - viewport.y - viewport.h/2 + this.y) / this.z];
    }
}

export { Transform }
