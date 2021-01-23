import { Camera } from './Camera.js'

class Canvas {
	constructor(canvas, overlay, options) {
		let initial = 
		Object.assign(this, { 
			preserveDrawingBuffer: false, 
			viewport: [0, 0, 0, 0], 
			gl: null 
		});

		if(options)
			Object.assign(this, options);

		this.camera = new Camera(this.camera);

		this.initElement(canvas);
		
	}

	resize(width, height) {
		this.canvas.width = width;
		this.canvas.height = height;

//		this.layers.forEach((layer) => { layer.prefetch(); });
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

	draw(time) {
		let pos = this.camera.getCurrentTransform(time);
	}
}

export { Canvas }
