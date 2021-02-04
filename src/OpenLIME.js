import { Canvas } from './Canvas.js'
import { Camera } from './Camera.js'
import { Transform } from './Transform.js'
import { Layer } from './Layer.js'
import { Layout } from './Layout.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'

import { Controller } from './Controller.js'
import { PanZoomController } from './PanZoomController.js'


import * as Hammer from 'hammerjs';


/**
 * Manages an OpenLIME viewer functionality on a canvas
 * how do I write more substantial documentation.
 *
 * @param {div} div of the DOM or selector (es. '#canvasid'), or a canvas.
 * @param {string} options is a url to a JSON describing the viewer content
 * @param {object} options is a JSON describing the viewer content
 *  * **animate**: default *true*, calls requestAnimation() and manages refresh.
 *  * test:
 */

class OpenLIME {

	constructor(div, options) {

		Object.assign(this, { 
			background: [0, 0, 0, 1],
			canvas: {},
			controllers: [],
			camera: new Camera()
		});


		if(typeof(div) == 'string')
			div = document.querySelector(div);

		if(!div)
			throw "Missing element parameter";

		this.containerElement = div;
		this.canvasElement = div.querySelector('canvas');
		if(!this.canvasElement) {
			this.canvasElement = document.createElement('canvas');
			div.appendChild(this.canvasElement);
		}

		this.initCanvasElement(this.canvasElement);


		this.canvas = new Canvas(this.gl, this.camera, this.canvas);
		this.canvas.addEvent('update', () => { this.redraw(); });

		this.camera.addEvent('update', () => { this.redraw(); });

		this.controllers.push(new PanZoomController(this.camera));

		var resizeobserver = new ResizeObserver( entries => {
			for (let entry of entries) {
				this.resize(entry.contentRect.width, entry.contentRect.height);
				this.processEvent('resize', {}, entry.contentRect.width, entry.contentRect.height);
			}
		});
		resizeobserver.observe(this.canvasElement);

		this.resize(this.canvasElement.clientWidth, this.canvasElement.clientHeight);

		this.initEvents();
	}


	initCanvasElement(canvas) {
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
	}

	/**
	* Resize the canvas (and the overlay) and triggers a redraw.
	*/

	resize(width, height) {
		this.canvasElement.width = width;
		this.canvasElement.height = height;

		this.camera.setViewport({x:0, y:0, dx:width, dy:height, w:width, h:height});
		this.canvas.prefetch();
		this.redraw();
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
		if(!time) time = performance.now();
		this.animaterequest = null;

		let done = this.canvas.draw(time);
		if(!done)
			this.redraw();
	}

	processEvent(event, e, x, y, scale) {
		//if events are captured

		//first check layers from top to bottom
		let ordered = Object.values(this.canvas.layers).sort( (a, b) => b.zindex - a.zindex);
		ordered.push(this);
		for(let layer of ordered) {
			for(let controller of layer.controllers) {
				if(controller.active && controller[event] && controller[event](e, x, y, scale))
					return;
			}
		}
	}

	hammerEventToPosition(e) {
		let rect = this.canvasElement.getBoundingClientRect();
		let x = e.center.x - rect.left;
		let y = e.center.y - rect.top;
		return { x: x, y: y }
	}

	eventToPosition(e, touch) {
		let rect = e.currentTarget.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		return { x: x, y: y }
	}


	initEvents() {

		let element = this.canvasElement;

		element.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			return false;
		});

		const mc = new Hammer.Manager(element); 

		mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
		mc.add(new Hammer.Tap({ event: 'singletap', taps: 1 }));
		mc.get('doubletap').recognizeWith('singletap');
		mc.get('singletap').requireFailure('doubletap');
		mc.add(new Hammer.Pan({ pointers: 1, direction: Hammer.DIRECTION_ALL, threshold: 0 }));
		mc.add(new Hammer.Pinch());

		let events = {
			'singletap':'singleTap', 'doubletap':'doubleTap', 
			'panstart':'panStart', 'panmove':'panMove', 'panend pancancel': 'panEnd',
			'pinchstart': 'pinchStart', 'pinchmove':'pinchMove', 'pinchend pinchcancel': 'pinchEnd'
		};
		for(let [event, callback] of Object.entries(events)) {
			mc.on(event, (e) => {
				const pos = this.hammerEventToPosition(e);
				const scale = e.scale;
				this.processEvent(callback, e, pos.x, pos.y, scale);
				e.preventDefault();
				return false;
			});
		}

		element.addEventListener('wheel', (e) => {
			//TODO support for delta X?
			const pos = this.eventToPosition(e);
			let delta = e.deltaY > 0 ? 1 : -1;
			this.processEvent('wheelDelta', e, pos.x, pos.y, delta);
			e.preventDefault();
		});
	}
}

export { OpenLIME, Canvas, Camera, Transform, Layer, Raster, Shader, Layout }

