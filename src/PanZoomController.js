import { Controller } from './Controller.js'
import { Camera } from './Camera.js'

class PanZoomController extends Controller {

	constructor(element, camera, options) {
		super(element, options);
		this.camera = camera;
		this.zoomAmount = 1.2;
		this.panning = false;
		this.zooming = false;
		this.startPosition = null;
		this.startMouse = null;
		this.prevScale = 1.0;
	}

	panStart(x, y, e) {
		this.panning = true;
		this.startMouse = { x: x, y: y };

		let now = performance.now();
		this.startPosition = this.camera.getCurrentTransform(now);
		this.camera.target = this.startPosition.copy(); //stop animation.
	}

	panMove(x, y, e) {
		if (!this.panning)
			return;

		let dx = x - this.startMouse.x;
		let dy = y - this.startMouse.y;

		let z = this.startPosition.z;
		let ex = this.startPosition.x + dx / z;
		let ey = this.startPosition.y + dy / z;
		let a = this.startPosition.a;

		this.camera.setPosition(this.delay, ex, ey, z, a);
	}

	panEnd(x, y, e) {
		this.panning = false;
	}

	pinchStart(x, y, scale, e) {
		this.zooming = true;
		this.prevScale = scale;
	}

	pinchMove(x, y, scale, e) {
		if (!this.zooming)
			return;
		const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
		const deltaScale = scale - this.prevScale;
		const dz = Math.pow(2.0, deltaScale); // why not using scale?
		this.camera.zoom(this.delay, dz, pos.x, pos.y);
		this.prevScale = scale;
	}

	pinchEnd(x, y, scale, e) {
		this.zooming = false;
	}

	wheelDelta(x, y, delta, e) {
		const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
		const dz = Math.pow(this.zoomAmount, delta);
		this.camera.zoom(this.delay, dz, pos.x, pos.y);
	}

	doubleTap(x, y, e) {
		const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
		const dz = this.zoomAmount;
		this.camera.zoom(this.delay, dz, pos.x, pos.y);
	}

}

export { PanZoomController }
