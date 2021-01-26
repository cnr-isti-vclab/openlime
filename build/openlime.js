(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.OpenLIME = {}));
}(this, (function (exports) { 'use strict';

	/**
	 * 
	 * @param {number} x position
	 * @param {number} y position
	 * @param {number} z scale
	 * @param {number} a rotation
	 * @param {number} t time
	 *
	 */

	class Transform {
		constructor(x, y, z, a, t) {
			if(x === null) {
				let initial = { x: 0.0, y: 0.0, z: 1.0, a: 0.0, t: 0.0 };
				Object.assing(this, initial());
				return;
			}
			this.x = x ? x : 0.0;
			this.y = y ? y : 0.0;
			this.z = z ? z : 1.0;
			this.a = a ? a : 0.0;
			this.t = t ? t : 0.0;
		}

		copy() {
			return Object.assign({}, this);
		}

		interpolate(source, target, time) {
			if(time < source.t) return source;
			if(time > target.t) return target;

			let t = (target.t - source.t);
			if(t < 0.0001)
				return target;

			let tt = (time - source.t)/t;
			let st = (target.t - t)/t;

			for(let i of ['x', 'y', 'z', 'a'])
				this[i] = (st*source[i] + tt*target[i]);
			this.t = time;
		}
	}

	/**
	 * @param {object} options
	 * * *bounded*: limit translation of the camera to the boundary of the scene.
	 * * *maxZoom*: maximum zoom, 1:maxZoom is screen pixel to image pixel ratio.
	 */

	class Camera {

		constructor(options) {
			Object.assign(this, {
				bounded: true,
				maxZoom: 4,
				minZoom: 'full'
			});
			Object.assign(this, options);
			this.target = new Transform(this.target);
			this.source = this.target.copy();
			console.log(this.target, this.source);
		}

		getCurrentTransform(time) {
			if(time < this.target.source)
				return this.source;
			if(time > this.target.t)
				return this.target;

			let pos = new Transform();
			pos.interpolate(this.source, this.target, time);
			return pos;
		}
	}

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
					ordered.draw(pos);

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

	/**
	 * Manages an OpenLIME viewer functionality on a canvas
	 * how do I write more substantial documentation.
	 *
	 * @param {element} element of the DOM or selector (es. '#canvasid'), or a canvas.
	 * @param {string} options is a url to a JSON describing the viewer content
	 * @param {object} options is a JSON describing the viewer content
	 *  * **animate**: default *true*, calls requestAnimation() and manages refresh.
	 *  * test:
	 */

	class OpenLIME {

		constructor(element, options) {
			if(typeof(element) == 'string')
				element = document. querySelector(element);

			if(!element)
				throw "Missing element parameter";

			this.containerElement = element;
			this.canvasElement = element.querySelector('canvas');
			if(!this.canvasElement) {
				this.canvasElement = document.createElement('canvas');
				element.appendChild(this.canvasElement);
			}
			this.canvasElement.addEventListener('resize', (e) => this.resize());

			Object.assign(this, { background: [0, 0, 0, 1] });

			this.canvas = new Canvas(this.canvasElement, this.canvas);
		}

		/**
		* Resize the canvas (and the overlay) and triggers a redraw.
		*/
		resize(event) {
			console.log(event);
			redraw();
		}

		/**
		*
		* Schedule a drawing.
		*/
		redraw() {
			if(this.animaterequest) return;
			this.animaterequest = requestAnimationFrame( (time) => { this.draw(time); });
		}

		/**
		* Do not call this if OpenLIME is animating, use redraw()
		* @param {time} time as in performance.now()
		*/
		draw(time) {
			console.log('drawing');
			if(!time) time = performance.now();
			this.animaterequest = null;

			let gl = this.canvas.gl;
			gl.viewport(0, 0, this.canvas.width, this.canvas.height);
			var b = this.background;
			gl.clearColor(b[0], b[1], b[2], b[3], b[4]);
			gl.clear(gl.COLOR_BUFFER_BIT);

			let done = this.canvas.draw(time);
			if(!done)
				this.redraw();
		}
	}

	exports.OpenLIME = OpenLIME;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
