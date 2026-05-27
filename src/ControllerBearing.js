import { Controller } from './Controller.js'

/**
 * Controller for rotating the camera by dragging anywhere in the viewer.
 * The rotation angle is computed as the angular change relative to the
 * center of `element` between `panStart` and each `panMove`.
 *
 * Typical setup (handled automatically by {@link UIBasic} when the bearing
 * overlay is shown):
 * ```js
 * const ctrl = new ControllerBearing(camera, containerElement, {
 *     active: false,
 *     onRotate: () => updateDialVisual()
 * });
 * viewer.pointerManager.onEvent(ctrl);
 * ```
 *
 * @extends Controller
 */
class ControllerBearing extends Controller {
	/**
	 * Creates a new ControllerBearing instance.
	 * @param {Camera} camera - Camera to rotate.
	 * @param {HTMLElement} element - Element whose centre is used as the pivot
	 *   for computing the drag angle (normally the viewer container element).
	 * @param {Object} [options] - Options forwarded to {@link Controller}.
	 * @param {boolean} [options.active=false] - Start inactive; activated by
	 *   {@link UIBasic#toggleBearingController}.
	 * @param {Function} [options.onRotate] - Called after every camera update
	 *   so the bearing dial overlay can be redrawn.
	 */
	constructor(camera, element, options) {
		super(options);
		Object.assign(this, {
			active: false,
			onRotate: null,
		}, options);
		this.camera = camera;
		this.element = element;
		this.panning = false;
		this.startPointerAngle = null;
		this.startCameraAngle = null;
	}

	/**
	 * Returns the angle (degrees) from the element centre to the pointer.
	 * @param {PointerEvent} e
	 * @returns {number}
	 * @private
	 */
	_angleFromCenter(e) {
		const rect = this.element.getBoundingClientRect();
		const cx = rect.left + rect.width / 2;
		const cy = rect.top + rect.height / 2;
		return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
	}

	/**
	 * @override
	 */
	panStart(e) {
		if (!this.active || !this.activeModifiers.includes(this.modifierState(e))) return;
		this.panning = true;
		this.startPointerAngle = this._angleFromCenter(e);
		this.startCameraAngle = this.camera.getCurrentTransform(performance.now()).a;
		e.preventDefault();
	}

	/**
	 * @override
	 */
	panMove(e) {
		if (!this.panning) return;
		const delta = this._angleFromCenter(e) - this.startPointerAngle;
		const m = this.camera.getCurrentTransform(performance.now());
		this.camera.setPosition(0, m.x, m.y, m.z, this.startCameraAngle - delta);
		if (this.onRotate) this.onRotate();
		e.preventDefault();
	}

	/**
	 * @override
	 */
	panEnd(e) {
		this.panning = false;
	}
}

export { ControllerBearing }
