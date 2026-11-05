const LOCAL_ID = /^[A-Za-z][A-Za-z0-9._:-]*$/;

function rotate(x, y, degrees) {
	const radians = Math.PI * (degrees / 180);
	return {
		x: Math.cos(radians) * x - Math.sin(radians) * y,
		y: Math.sin(radians) * x + Math.cos(radians) * y
	};
}

/**
 * Same similarity as OpenLIME Transform: P' = z * R(a) * P + T.
 * compose applies this first and the argument second, matching Transform.compose.
 */
class Similarity {
	constructor(options = {}) {
		this.x = options.x || 0;
		this.y = options.y || 0;
		this.z = options.z === undefined ? 1 : options.z;
		this.a = options.a || 0;
	}

	copy() {
		return new Similarity(this);
	}

	apply(x, y) {
		const rotated = rotate(x, y, this.a);
		return { x: rotated.x * this.z + this.x, y: rotated.y * this.z + this.y };
	}

	inverse() {
		const rotated = rotate(this.x / this.z, this.y / this.z, -this.a);
		return new Similarity({ x: -rotated.x, y: -rotated.y, z: 1 / this.z, a: -this.a });
	}

	compose(next) {
		const combined = this.copy();
		combined.z *= next.z;
		combined.a += next.a;
		const rotated = rotate(combined.x, combined.y, next.a);
		combined.x = rotated.x * next.z + next.x;
		combined.y = rotated.y * next.z + next.y;
		return combined;
	}
}

function finiteNumber(value, fallback) {
	if (value === undefined) return fallback;
	return typeof value === 'number' && Number.isFinite(value) ? value : NaN;
}

/**
 * Parse a similarity2d value into a Similarity. Phase 2 copies x, y, a, and z onto a layer Transform.
 * `compose` applies `this` first and the argument second, so callers that
 * want the local transform before its parent use `local.compose(parent)`.
 * @param {Object|null|undefined} value
 * @param {string} path
 * @param {Array} diagnostics
 * @returns {Similarity|null}
 */
function parseSimilarity(value, path, diagnostics) {
	if (value == null || value.type === 'identity') return new Similarity();
	if (value.type === 'affine2d') {
		diagnostics.push({
			severity: 'error',
			code: 'TRANSFORM_AFFINE_UNSUPPORTED',
			path,
			message: 'affine2d is rejected. This renderer only applies similarity2d.'
		});
		return null;
	}
	if (value.type !== undefined && value.type !== 'similarity2d') {
		diagnostics.push({
			severity: 'error',
			code: 'TRANSFORM_UNKNOWN',
			path,
			message: `Unknown transform type "${value.type}".`
		});
		return null;
	}

	const translation = value.translation || [0, 0];
	const x = finiteNumber(translation[0], 0);
	const y = finiteNumber(translation[1], 0);
	const rotation = finiteNumber(value.rotation, 0);
	const scale = finiteNumber(value.scale, 1);
	if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(rotation) || !Number.isFinite(scale) || scale <= 0) {
		diagnostics.push({
			severity: 'error',
			code: 'TRANSFORM_INVALID',
			path,
			message: 'similarity2d needs a finite translation, a finite rotation, and a scale greater than zero.'
		});
		return null;
	}
	return new Similarity({ x, y, a: rotation, z: scale });
}

function isLocalId(id) {
	return typeof id === 'string' && LOCAL_ID.test(id);
}

function isGlobalId(id) {
	return typeof id === 'string' && id.includes(':') && !/\s/.test(id);
}

export { Similarity, parseSimilarity, isLocalId, isGlobalId };
