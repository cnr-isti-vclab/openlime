import { Camera } from './Camera.js'

class Canvas {
	constructor(canvas, overlay, options) {
		let initial = 
		Object.assign(this, { 
			preserveDrawingBuffer: false, 
			viewport: [0, 0, 0, 0], 
			gl: null,
			layers: {}
		});

		if(options) {
			Object.assign(this, options);
			for(let id in this.layers)
				this.layers[i] = new Layer(id, this.layers[i]);
		}

		this.camera = new Camera(this.camera);

		this.initElement(canvas);
		
	}

	resize(width, height) {
		this.canvas.width = width;
		this.canvas.height = height;

		this.prefetch();
		this.redraw();
	}

	initElement(canvas) {
		if(!canvas)
			throw "Missing element parameter"

		if(typeof(canvas) == 'string') {
			canvas = document.querySelector(canvas);
			if(!canvas)
				throw "Could not find dom element.";
		}

		if(!canvas.tagName)
			throw "Element is not a DOM element"

		if(canvas.tagName != "CANVAS")
			throw "Element is not a canvas element";


		let glopt = { antialias: false, depth: false, preserveDrawingBuffer: this.preserveDrawingBuffer };
		this.gl = this.gl || 
			canvas.getContext("webgl2", glopt) || 
			canvas.getContext("webgl", glopt) || 
			canvas.getContext("experimental-webgl", glopt) ;

		if (!this.gl)
			throw "Could not create a WebGL context";

		this.canvas = canvas;
	}

	setPosition(dt, x, y, z, a) {
	}

	draw(time) {
		let pos = this.camera.getCurrentTransform(time);

		//todo we could actually prefetch toward the future a little bit
		this.prefetch(pos);

		//draw layers using zindex.
		let ordered = Object.values(this.layers).sort( (a, b) => a.zindex - b.zindex);

		for(let layer of ordered)
			if(ordered.visible)
				ordered.draw(pos)

//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.
		return pos.t == this.camera.target.t;
	}

/**
 * This function have each layer to check which tiles are needed and schedule them for download.
 * @param {object} transform is the camera position (layer will combine with local transform).
 */
	prefetch(transform) {
		for(let id in this.layers)
			this.layers[id].prefetch(transform, this.viewport);
	}
}

export { Canvas }
