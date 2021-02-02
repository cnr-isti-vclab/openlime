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
	}

	panStart(x, y, e) {
		this.panning = true;
		this.startMouse = { x: x, y: y };

		let now = performance.now();
		this.startPosition = this.camera.getCurrentTransform(now);
		this.camera.target = this.startPosition.copy(); //stop animation.
	}

	panEnd(x, y, e) {
		this.panning = false;
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

	pinchStart(x, y, scale, e) {
		console.log('Pinch Start ', x, y, scale);
		this.zooming = true;
	}

	pinchMove(x, y, scale, e) {
		console.log('Pinch Move ', x, y, scale);
		if (!this.zooming)
			return;
	}

	pinchEnd(x, y, scale, e) { 
		console.log('Pinch End ', x, y, scale);
		this.zooming = false;
	}
	
	wheelDelta(x, y, delta, e) {
		let pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
		let zoom = Math.pow(this.zoomAmount, delta);
		this.camera.zoom(this.delay, zoom, pos.x, pos.y,);
	}

}

export { PanZoomController }
