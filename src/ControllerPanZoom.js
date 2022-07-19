import { Controller } from './Controller.js'
import { CoordinateSystem } from './CoordinateSystem.js';
import { addSignals } from './Signals.js'


/** **ControllerPanZoom** intercepts pan, zoom, single tap, and wheel events in the canvas and updates the scene camera parameters.
*/

class ControllerPanZoom extends Controller {
	/**
	 * Instantiates a ControllerPanZoom object.
	 * @param {Camera} camera The scene camera.
	 * @param {Object} [options] An object literal with controller parameters.
	 * @param {number} options.zoomAmount=1.2 The incremental value for zoom in/out.
	 */
	constructor(camera, options) {
		super(options);

		this.camera = camera;
		this.zoomAmount = 1.2;          //for wheel or double tap event
		this.controlZoom = false;       //require control+wheel to zoom
		
		this.panning = false;           //true if in the middle of a pan
		this.initialTransform = null;
		this.startMouse = null;

		this.zooming = false;           //true if in the middle of a pinch
		this.initialDistance = 0.0;
		this.useGLcoords = false;

		if(options)
			Object.assign(this, options);
	}

	/** @ignore */
	panStart(e) {
		if(!this.active || this.panning || !this.activeModifiers.includes(this.modifierState(e)))
			return;
		this.panning = true;

		this.startMouse = CoordinateSystem.fromCanvasHtmlToViewport({ x: e.offsetX, y: e.offsetY }, this.camera, this.useGLcoords);

		let now = performance.now();
		this.initialTransform = this.camera.getCurrentTransform(now);
		this.camera.target = this.initialTransform.copy(); //stop animation.
		e.preventDefault();
	}

	/** @ignore */
	panMove(e) {
		if (!this.panning)
			return;

		let m = this.initialTransform;
		const p = CoordinateSystem.fromCanvasHtmlToViewport({ x: e.offsetX, y: e.offsetY }, this.camera, this.useGLcoords);
		let dx = (p.x - this.startMouse.x);
		let dy = (p.y - this.startMouse.y);
		
		this.camera.setPosition(this.panDelay, m.x + dx, m.y + dy, m.z, m.a);
	}

	/** @ignore */
	panEnd(e) {
		this.panning = false;
	}

	/** @ignore */
	distance(e1, e2) {
		return Math.sqrt(Math.pow(e1.x - e2.x, 2) + Math.pow(e1.y - e2.y, 2));
	}

	/** @ignore */
	pinchStart(e1, e2) {
		this.zooming = true;
		this.initialDistance = Math.max(30, this.distance(e1, e2));
		e1.preventDefault();
		//e2.preventDefault(); //TODO this is optional?
	}

	/** @ignore */
	pinchMove(e1, e2) {
		if (!this.zooming)
			return;
		let rect1 = e1.target.getBoundingClientRect();
		let offsetX1 = e1.clientX - rect1.left;
		let offsetY1 = e1.clientY - rect1.top;
		let rect2 = e2.target.getBoundingClientRect();
		let offsetX2 = e2.clientX - rect2.left;
		let offsetY2 = e2.clientY - rect2.top;
		const scale = this.distance(e1, e2);
		// FIXME CHECK ON TOUCH SCREEN
		//const pos = this.camera.mapToScene((offsetX1 + offsetX2)/2, (offsetY1 + offsetY2)/2, this.camera.getCurrentTransform(performance.now()));
		const pos = CoordinateSystem.fromCanvasHtmlToScene({ x: (offsetX1 + offsetX2)/2, y: (offsetY1 + offsetY2)/2 }, this.camera, this.useGLcoords);

		const dz = scale/this.initialDistance;
		this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
		this.initialDistance = scale;
		e1.preventDefault();
	}

	/** @ignore */
	pinchEnd(e, x, y, scale) {
		this.zooming = false;
		e.preventDefault();
	}

	/** @ignore */
	mouseWheel(e) {
		if(this.controlZoom && !e.ctrlKey) {
			this.emit('nowheel');
			return;
		}
		let delta = -e.deltaY/53;
		//const pos = this.camera.mapToScene(e.offsetX, e.offsetY, this.camera.getCurrentTransform(performance.now()));
		const pos = CoordinateSystem.fromCanvasHtmlToScene({ x: e.offsetX, y: e.offsetY }, this.camera, this.useGLcoords);
		const dz = Math.pow(this.zoomAmount, delta);		
		this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
		e.preventDefault();
	}

	/** @ignore */
	fingerDoubleTap(e) {
		if(!this.active || !this.activeModifiers.includes(this.modifierState(e)))
			return;
		//const pos = this.camera.mapToScene(e.offsetX, e.offsetY, this.camera.getCurrentTransform(performance.now()));
		const pos = CoordinateSystem.fromCanvasHtmlToScene({ x: e.offsetX, y: e.offsetY }, this.camera, this.useGLcoords);

		const dz = this.zoomAmount;
		this.camera.deltaZoom(this.zoomDelay, dz, pos.x, pos.y);
	}

}
addSignals(ControllerPanZoom, 'nowheel');

export { ControllerPanZoom }
