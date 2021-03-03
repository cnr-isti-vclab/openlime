import { Controller } from './Controller.js'
import { Camera } from './Camera.js'

class ControllerPanZoom extends Controller {

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

	panStart(e) {
		this.panning = true;

		this.startMouse = { x: e.offsetX, y: e.offsetY };

		let now = performance.now();
		this.startPosition = this.camera.getCurrentTransform(now);
		this.camera.target = this.startPosition.copy(); //stop animation.
		e.preventDefault();
		return true;
	}

	panMove(e) {
		if (!this.panning)
			return;

		let dx = e.offsetX - this.startMouse.x;
		let dy = e.offsetY - this.startMouse.y;

		let z = this.startPosition.z;
		let ex = this.startPosition.x + dx / z;
		let ey = this.startPosition.y + dy / z;
		let a = this.startPosition.a;

		this.camera.setPosition(this.delay, ex, ey, z, a);
	}

	panEnd(e) {
		this.panning = false;
	}

	distance(e1, e2) {
		return Math.sqrt(Math.pow(e1.x - e2.x, 2) + Math.pow(e1.y - e2.y, 2));
	}

	pinchStart(e1, e2) {
		this.zooming = true;
		this.prevScale = this.distance(e1, e2);
		e1.preventDefault();
		//e2.preventDefault();
	}

	pinchMove(e1, e2) {
		if (!this.zooming)
			return;
		const scale = this.distance(e1, e2);
		const pos = this.camera.mapToScene((e1.x + e2.x)/2, (e1.y + e2.y)/2, this.camera.getCurrentTransform(performance.now()));
		const absoluteZoom = this.camera.target.z * scale/this.prevScale;
		this.camera.zoom(this.delay, absoluteZoom, pos.x, pos.y);
		this.prevScale = scale;
	}

	pinchEnd(e, x, y, scale) {
		this.zooming = false;
	}

	mouseWheel(e) {
		let delta = e.deltaY > 0 ? 1 : -1;
		const pos = this.camera.mapToScene(e.offsetX, e.offsetY, this.camera.getCurrentTransform(performance.now()));
		const dz = Math.pow(this.zoomAmount, delta);
		console.log(e, e.deltaY, dz);
		this.camera.deltaZoom(this.delay, dz, pos.x, pos.y);
		e.preventDefault();
	}

	fingerDoubleTap(e, x, y) {
		const pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
		const dz = this.zoomAmount;
		this.camera.deltaZoom(this.delay, dz, pos.x, pos.y);
	}

}

export { ControllerPanZoom }
