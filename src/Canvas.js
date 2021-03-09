import { Camera } from './Camera.js'

/**
 * @param {WebGL} gl is the WebGL context
 * @param {Object} options
 * * *layers*: Object specifies layers (see. {@link Layer})
 */

class Canvas {
	constructor(canvas, overlay, camera, options) {
		Object.assign(this, { 
			canvasElement: null,
			preserveDrawingBuffer: false, 
			gl: null,
			overlayElement: overlay,
			camera: camera,
			layers: {},
			signals: {'update':[]}
		});
		Object.assign(this, options);

		this.init(canvas);
			
		for(let id in this.layers)
			this.addLayer(id, new Layer(id, this.layers[id]));

	}

	addEvent(event, callback) {
		this.signals[event].push(callback);
	}

	emit(event) {
		for(let r of this.signals[event])
			r(this);
	}

	//TODO move gl context to canvas!
	init(canvas) {
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

		this.canvasElement = canvas;

		/* test context loss */
		/* canvas = WebGLDebugUtils.makeLostContextSimulatingCanvas(canvas);
		canvas.loseContextInNCalls(1000); */


		let glopt = { antialias: false, depth: false, preserveDrawingBuffer: this.preserveDrawingBuffer };
		this.gl = this.gl || 
			canvas.getContext("webgl2", glopt) || 
			canvas.getContext("webgl", glopt) || 
			canvas.getContext("experimental-webgl", glopt) ;

		if (!this.gl)
			throw "Could not create a WebGL context";

		canvas.addEventListener("webglcontextlost", (event) => { console.log("contextlost"); event.preventDefault(); }, false);
		canvas.addEventListener("webglcontextrestored", ()  => { this.restoreWebGL(); }, false);
		document.addEventListener("visibilitychange", (event) => { if(this.gl.isContextLost()) this.restoreWebGL(); });

		/* DEBUG OpenGL calls */
		/*function logGLCall(functionName, args) {   
			console.log("gl." + functionName + "(" + 
			WebGLDebugUtils.glFunctionArgsToString(functionName, args) + ")");   
		} 
		this.gl = WebGLDebugUtils.makeDebugContext(this.gl, undefined, logGLCall);  */


	}

	restoreWebGL() {
		this.init(canvas);
		for(let layer of Object.values(this.layers)) {
			layer.gl = this.gl;
			layer.clear();
			if(layer.shader)
				layer.shader.restoreWebGL(this.gl);
		}
		this.emit('update');
	}

	addLayer(id, layer) {
		layer.addEvent('update', () => { this.emit('update'); });
		layer.layout.addEvent('updateSize', () => { this.updateSize(); });
		layer.gl = this.gl;
		layer.overlayElement = this.overlayElement;
		this.layers[id] = layer;
		this.prefetch();
	}

	updateSize() {
		let sceneBBox = [10000,10000,-10000,-10000];
		for(let layer of Object.values(this.layers)) {
			const bbox = layer.boundingBox();
			if (bbox != null) {
				sceneBBox[0] = Math.min(sceneBBox[0], bbox[0]);
				sceneBBox[1] = Math.min(sceneBBox[1], bbox[1]);
				sceneBBox[2] = Math.max(sceneBBox[2], bbox[2]);
				sceneBBox[3] = Math.max(sceneBBox[3], bbox[3]);
			}
		}
		console.log("Update Scene BBox " + sceneBBox);
	}

	draw(time) {
		let gl = this.gl;
		let view = this.camera.viewport;
		gl.viewport(view.x, view.y, view.dx, view.dy);

		var b = [0, 0, 0, 0];
		gl.clearColor(b[0], b[1], b[2], b[3], b[4]);
		gl.clear(gl.COLOR_BUFFER_BIT);

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		//TODO: getCurren shoudl redurn {position, done}
		let pos = this.camera.getCurrentTransform(time);
		//todo we could actually prefetch toward the future a little bit
		this.prefetch(pos);

		//pos layers using zindex.
		let ordered = Object.values(this.layers).sort( (a, b) => a.zindex - b.zindex);

		//NOTICE: camera(pos) must be relative to the WHOLE canvas
		let done = true;
		for(let layer of ordered)
			if(layer.visible)
				done = layer.draw(pos, view) && done;

		//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.
		return done && pos.t == this.camera.target.t;
	}

/**
 * This function have each layer to check which tiles are needed and schedule them for download.
 * @param {object} transform is the camera position (layer will combine with local transform).
 */
	prefetch(transform) {
		if(!transform)
			transform = this.camera.getCurrentTransform(performance.now());
		for(let id in this.layers) {
			let layer = this.layers[id];
			if(layer.visible)
				layer.prefetch(transform, this.camera.viewport);
		}
	}
}

export { Canvas }
