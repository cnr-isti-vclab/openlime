import { Controller } from './Controller.js'
import { Camera } from './Camera.js'

class PanZoomController extends Controller {

	constructor(camera, options) {
		super(options);
		this.camera = camera;
		this.zoomAmount = 1.2;
		this.panning = false;
		this.zooming = false;
		this.startPosition = null;
		this.startMouse = null;
		this.prevScale = 1.0;
	}

	panStart(e, x, y) {
		this.panning = true;
		this.startMouse = { x: x, y: y };

		let now = performance.now();
		this.startPosition = this.camera.getCurrentTransform(now);
		this.camera.target = this.startPosition.copy(); //stop animation.
	}

	panMove(e, x, y) {
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

	panEnd(e, x, y) {
		this.panning = false;
	}

	pinchStart(e, x, y, scale) {
		this.zooming = true;
		this.prevScale = scale;
	}

	pinchMove(e, x, y, scale) {
		if (!this.zooming)
			return;
		const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
		const absoluteZoom = camera.target.z * this.prevScale/scale;
		this.camera.zoom(this.delay, absoluteZoom, pos.x, pos.y);
		this.prevScale = scale;
	}

	pinchEnd(e, x, y, scale) {
		this.zooming = false;
	}

	wheelDelta(e, x, y, delta) {
		const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
		const dz = Math.pow(this.zoomAmount, delta);
		this.camera.deltaZoom(this.delay, dz, pos.x, pos.y);
	}

	doubleTap(e, x, y) {
		const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
		const dz = this.zoomAmount;
		this.camera.deltaZoom(this.delay, dz, pos.x, pos.y);
	}

}

export { PanZoomController }
