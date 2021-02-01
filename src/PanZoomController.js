import { Controller } from './Controller.js'
import { Camera } from './Camera.js'

class PanZoomController extends Controller {

	constructor(element, camera, options) {
		super(element, options);
		this.camera = camera;
		this.zoomAmount = 1.2;
		this.panning = false;
		this.startPosition = null;
		this.startMouse = null;
	}

	mouseDown(x, y, e) {
		// if(!(e.buttons & 0x1)) 
		// 	return;
		this.panning = true; 
		this.startMouse = { x: x, y: y };

		let now = performance.now();
		this.startPosition = this.camera.getCurrentTransform(now);
		this.camera.target = this.startPosition.copy(); //stop animation.
	}

	mouseUp(x, y, e) { 
		this.panning = false;
	}

	mouseMove(x, y, e) { 
		if(!this.panning)
			return;

		let dx = x - this.startMouse.x;
		let dy = y - this.startMouse.y;


		let z = this.startPosition.z;
		let ex = this.startPosition.x + dx/z;
		let ey = this.startPosition.y + dy/z;
		let a = this.startPosition.a;


		this.camera.setPosition(this.delay, ex, ey, z, a);
	}

	wheelDelta(x, y, delta, e) { 
		let pos = this.camera.mapToScene(x, y, this.camera.getCurrentTransform(performance.now()));
		let zoom = Math.pow(this.zoomAmount, delta);
		this.camera.zoom(this.delay, zoom, pos.x, pos.y, );
	}

	pinchStart(pos1, pos2, e) {if(this.debug) console.log('TODO! Start ', pos1, pos2); }

	pinchMove(pos1, pos2, e) {if(this.debug) console.log('TODO! Move ', pos1, pos2); }

}

export { PanZoomController }
