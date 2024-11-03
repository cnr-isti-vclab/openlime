import { BoundingBox } from "./BoundingBox";

/**
 * @typedef {Array<number>} APoint
 * A tuple of [x, y] representing a 2D point.
 * @property {number} 0 - X coordinate
 * @property {number} 1 - Y coordinate
 * 
 * @example
 * ```javascript
 * const point: APoint = [10, 20]; // [x, y]
 * const x = point[0];  // x coordinate
 * const y = point[1];  // y coordinate
 * ```
 */

/**
 * @typedef {Object} Point
 * Object representation of a 2D point
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */

/**
 * @typedef {Object} TransformParameters
 * @property {number} [x=0] - X translation component
 * @property {number} [y=0] - Y translation component
 * @property {number} [a=0] - Rotation angle in degrees
 * @property {number} [z=1] - Scale factor
 * @property {number} [t=0] - Timestamp for animations
 */

/**
 * @typedef {'linear'|'ease-out'|'ease-in-out'} EasingFunction
 * Animation easing function type
 */

/**
 * 
 * Implements a 2D affine transformation system for coordinate manipulation.
 * Provides a complete set of operations for coordinate system conversions,
 * camera transformations, and animation support.
 * 
 * Mathematical Model:
 * Transformation of point P to P' follows the equation:
 *
 * P' = z * R(a) * P + T
 *
 * where:
 * - z: scale factor
 * - R(a): rotation matrix for angle 'a'
 * - T: translation vector (x,y)
 * 
 * Key Features:
 * - Full affine transformation support
 * - Camera positioning utilities
 * - Animation interpolation
 * - Viewport projection
 * - Coordinate system conversions
 * - Bounding box transformations
 * 
 *
 * Coordinate Systems and Transformations:
 * 
 * 1. Scene Space:
 * - Origin at image center
 * - Y-axis points up
 * - Unit scale
 * 
 * 2. Viewport Space:
 * - Origin at top-left
 * - Y-axis points down
 * - Pixel units [0..w-1, 0..h-1]
 * 
 * 3. WebGL Space:
 * - Origin at center
 * - Y-axis points up
 * - Range [-1..1, -1..1]
 * 
 * Transform Pipeline:
 * ```
 * Scene -> Transform -> Viewport -> WebGL
 * ```
 * 
 * Animation System:
 * - Time-based interpolation
 * - Multiple easing functions
 * - Smooth transitions
 * 
 * Performance Considerations:
 * - Matrix operations optimized for 2D
 * - Cached transformation results
 * - Efficient composition
 */
class Transform { //FIXME Add translation to P?
	/**
	 * Creates a new Transform instance
	 * @param {TransformParameters} [options] - Transform configuration
	 * 
	 * @example
	 * ```javascript
	 * // Create identity transform
	 * const t1 = new Transform();
	 * 
	 * // Create custom transform
	 * const t2 = new Transform({
	 *     x: 100,    // Translate 100 units in x
	 *     y: 50,     // Translate 50 units in y
	 *     a: 45,     // Rotate 45 degrees
	 *     z: 2       // Scale by factor of 2
	 * });
	 * ```
	 */
	constructor(options) {
		Object.assign(this, { x: 0, y: 0, z: 1, a: 0, t: 0 });

		if (!this.t) this.t = performance.now();

		if (typeof (options) == 'object')
			Object.assign(this, options);
	}

	/**
	 * Creates a deep copy of the transform
	 * @returns {Transform} New transform with identical parameters
	 */
	copy() {
		let transform = new Transform();
		Object.assign(transform, this);
		return transform;
	}

	/**
	 * Applies transform to a point (x,y)
	 * Performs full affine transformation: scale, rotate, translate
	 * 
	 * @param {number} x - X coordinate to transform
	 * @param {number} y - Y coordinate to transform
	 * @returns {Point} Transformed point
	 * 
	 * @example
	 * ```javascript
	 * const transform = new Transform({x: 10, y: 20, a: 45, z: 2});
	 * const result = transform.apply(5, 5);
	 * // Returns rotated, scaled, and translated point
	 * ```
	 */
	apply(x, y) {
		//TODO! ROTATE
		let r = Transform.rotate(x, y, this.a);
		return {
			x: r.x * this.z + this.x,
			y: r.y * this.z + this.y
		}
	}

	/**
	 * Computes inverse transformation
	 * Creates transform that undoes this transform's effects
	 * @returns {Transform} Inverse transform
	 */
	inverse() {
		let r = Transform.rotate(this.x / this.z, this.y / this.z, -this.a);
		return new Transform({ x: -r.x, y: -r.y, z: 1 / this.z, a: -this.a, t: this.t });
	}

	/**
	 * Normalizes angle to range [0, 360]
	 * @param {number} a - Angle in degrees
	 * @returns {number} Normalized angle
	 * @static
	 */
	static normalizeAngle(a) {
		while (a > 360) a -= 360;
		while (a < 0) a += 360;
		return a;
	}

	/**
	 * Rotates point (x,y) by angle a around Z axis
	 * @param {number} x - X coordinate to rotate
	 * @param {number} y - Y coordinate to rotate
	 * @param {number} a - Rotation angle in degrees
	 * @returns {Point} Rotated point
	 * @static
	 */
	static rotate(x, y, a) {
		a = Math.PI * (a / 180);
		let ex = Math.cos(a) * x - Math.sin(a) * y;
		let ey = Math.sin(a) * x + Math.cos(a) * y;
		return { x: ex, y: ey };
	}

	/**
	 * Composes two transforms: this * transform
	 * Applies this transform first, then the provided transform
	 * 
	 * @param {Transform} transform - Transform to compose with
	 * @returns {Transform} Combined transformation
	 * 
	 * @example
	 * ```javascript
	 * const t1 = new Transform({x: 10, a: 45});
	 * const t2 = new Transform({z: 2});
	 * const combined = t1.compose(t2);
	 * // Results in rotation, then scale, then translation
	 * ```
	 */
	compose(transform) {
		let a = this.copy();
		let b = transform;
		a.z *= b.z;
		a.a += b.a;
		var r = Transform.rotate(a.x, a.y, b.a);
		a.x = r.x * b.z + b.x;
		a.y = r.y * b.z + b.y;
		return a;
	}

	/**
	 * Transforms a bounding box through this transform
	 * @param {BoundingBox} box - Box to transform
	 * @returns {BoundingBox} Transformed bounding box
	 */
	transformBox(lbox) {
		let box = new BoundingBox();
		for (let i = 0; i < 4; i++) {
			let c = lbox.corner(i);
			let p = this.apply(c.x, c.y);
			box.mergePoint(p);
		}
		return box;
	}

	/**
	 * Computes viewport bounds in image space
	 * Accounts for coordinate system differences between viewport and image
	 * 
	 * @param {Viewport} viewport - Current viewport
	 * @returns {BoundingBox} Bounds in image space
	 */
	getInverseBox(viewport) {
		let inverse = this.inverse();
		let corners = [
			{ x: viewport.x, y: viewport.y },
			{ x: viewport.x + viewport.dx, y: viewport.y },
			{ x: viewport.x, y: viewport.y + viewport.dy },
			{ x: viewport.x + viewport.dx, y: viewport.y + viewport.dy }
		];
		let box = new BoundingBox();
		for (let corner of corners) {
			let p = inverse.apply(corner.x - viewport.w / 2, -corner.y + viewport.h / 2);
			box.mergePoint(p);
		}
		return box;
	}

	/**
	 * Interpolates between two transforms
	 * @param {Transform} source - Starting transform
	 * @param {Transform} target - Ending transform
	 * @param {number} time - Current time for interpolation
	 * @param {EasingFunction} easing - Easing function type
	 * @returns {Transform} Interpolated transform
	 * @static
	 * 
	 * @example
	 * ```javascript
	 * const start = new Transform({x: 0, y: 0});
	 * const end = new Transform({x: 100, y: 100});
	 * const mid = Transform.interpolate(start, end, 500, 'ease-out');
	 * ```
	 */
	static interpolate(source, target, time, easing) { //FIXME STATIC
		console.assert(!isNaN(source.x));
		console.assert(!isNaN(target.x));
		const pos = new Transform();
		let dt = (target.t - source.t);
		if (time < source.t) {
			Object.assign(pos, source);
		} else if (time > target.t || dt < 0.001) {
			Object.assign(pos, target);
		} else {
			let tt = (time - source.t) / dt;
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
	 * Generates WebGL projection matrix
	 * Combines transform with viewport for rendering
	 * 
	 * @param {Viewport} viewport - Current viewport
	 * @returns {number[]} 4x4 projection matrix in column-major order
	 */
	projectionMatrix(viewport) {
		let z = this.z;

		// In coords with 0 in lower left corner map x0 to -1, and x0+v.w to 1
		// In coords with 0 at screen center and x0 at 0, map -v.w/2 -> -1, v.w/2 -> 1 
		// With x0 != 0: x0 -> x0-v.w/2 -> -1, and x0+dx -> x0+v.dx-v.w/2 -> 1
		// Where dx is viewport width, while w is window width
		//0, 0 <-> viewport.x + viewport.dx/2 (if x, y =

		let zx = 2 / viewport.dx;
		let zy = 2 / viewport.dy;

		let dx = zx * this.x + (2 / viewport.dx) * (viewport.w / 2 - viewport.x) - 1;
		let dy = zy * this.y + (2 / viewport.dy) * (viewport.h / 2 - viewport.y) - 1;

		let a = Math.PI * this.a / 180;
		let matrix = [
			Math.cos(a) * zx * z, Math.sin(a) * zy * z, 0, 0,
			-Math.sin(a) * zx * z, Math.cos(a) * zy * z, 0, 0,
			0, 0, 1, 0,
			dx, dy, 0, 1];
		return matrix;
	}

	/**
	 * Converts scene coordinates to viewport coordinates
	 * @param {Viewport} viewport - Current viewport
	 * @param {APoint} p - Point in scene space
	 * @returns {APoint} Point in viewport space [0..w-1, 0..h-1]
	 */
	sceneToViewportCoords(viewport, p) { //FIXME Point is an array, but in other places it is an Object...
		return [p[0] * this.z + this.x - viewport.x + viewport.w / 2,
		p[1] * this.z - this.y + viewport.y + viewport.h / 2];
	}

	/**
	 * Converts viewport coordinates to scene coordinates
	 * @param {Viewport} viewport - Current viewport
	 * @param {APoint} p - Point in viewport space [0..w-1, 0..h-1]
	 * @returns {APoint} Point in scene space
	 */
	viewportToSceneCoords(viewport, p) {
		return [(p[0] + viewport.x - viewport.w / 2 - this.x) / this.z,
		(p[1] - viewport.y - viewport.h / 2 + this.y) / this.z];
	}

	/**
	 * Prints transform parameters for debugging
	 * @param {string} [str=""] - Prefix string
	 * @param {number} [precision=0] - Decimal precision
	 */
	print(str = "", precision = 0) {
		const p = precision;
		console.log(str + " x:" + this.x.toFixed(p) + ", y:" + this.y.toFixed(p) + ", z:" + this.z.toFixed(p) + ", a:" + this.a.toFixed(p) + ", t:" + this.t.toFixed(p));
	}
}

export { Transform }
