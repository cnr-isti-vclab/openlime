import { Canvas } from './Canvas.js'
import { Camera } from './Camera.js'
import { Transform } from './Transform.js'
import { Layer } from './Layer.js'
import { RTILayer } from './RTILayer.js'

import { Layout } from './Layout.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'

import { UIBasic } from './UIBasic.js'
import { Controller } from './Controller.js'
import { ControllerPanZoom } from './ControllerPanZoom.js'

import { PointerManager } from './PointerManager.js'

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
			div.prepend(this.canvasElement);
		}

		this.initCanvasElement(this.canvasElement);

		this.overlayElement = document.createElement('div');
		this.overlayElement.classList.add('openlime-overlay');
		this.containerElement.appendChild(this.overlayElement);


		this.canvas = new Canvas(this.gl, this.overlayElement, this.camera, this.canvas);
		this.canvas.addEvent('update', () => { this.redraw(); });

		this.camera.addEvent('update', () => { this.redraw(); });

		this.controllers.push(new ControllerPanZoom(this.camera));

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

	/* Convenience function, it actually passes to Canvas
	*/
	addLayer(id, layer) {
		canvas.addLayer(id, layer);
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

		let viewport = this.camera.viewport;
		let transform = this.camera.getCurrentTransform(time);

		let done = this.canvas.draw(time);
		if(!done)
			this.redraw();
	}

	processEvent(event, e, x, y, scale) {
		//if events are captured
		console.log(event);
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

	eventToPosition(e, touch) {
		let rect = this.containerElement.getBoundingClientRect();
		//let rect = e.currentTarget.getBoundingClientRect();
		let x = e.clientX - rect.left;
		let y = e.clientY - rect.top;
		e.rect = rect;
		return { x: x, y: y }
	}


	initEvents() {

		let element = this.canvasElement;

		const pointerManager = new PointerManager(element, {inertial: false});
		pointerManager.register('pan', 
			(e) => { 
				const pos = this.eventToPosition(e);
				this.processEvent('panStart', e, pos.x, pos.y); 
				return true;
			},
			(e) => {
				const pos = this.eventToPosition(e);
				this.processEvent('panMove', e, pos.x, pos.y); 
			},
			(e) => {
				const pos = this.eventToPosition(e);
				this.processEvent('panEnd', e, pos.x, pos.y); 
			},
			false); //no inertia
				

		pointerManager.on('fingerHover', (e) => {
			const pos = this.eventToPosition(e);
			this.processEvent('hover', e, pos.x, pos.y);
		 });

		 
		 pointerManager.on('fingerSingleTap', (e) => {
			const pos = this.eventToPosition(e);
			this.processEvent('singleTap', e, pos.x, pos.y);
		 });

		 element.addEventListener('wheel', (e) => {
			//TODO support for delta X?
			const pos = this.eventToPosition(e);
			let delta = e.deltaY > 0 ? 1 : -1;
			this.processEvent('wheelDelta', e, pos.x, pos.y, delta);
			e.preventDefault();
		});

		element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

    }
}

export { OpenLIME, Canvas, Camera, Transform, Layer, RTILayer, Raster, Shader, Layout, UIBasic }

