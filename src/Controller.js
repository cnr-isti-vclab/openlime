/**
 * @param {dom} element DOM element where mouse events will be listening.
 * @param {options} options 
 * * *delay* inertia of the movement in ms.
 */

//https://github.com/cnr-isti-vclab/relight/blob/master/js/relight-interface.js
import * as Hammer from 'hammerjs';
import TouchEmulator from 'hammer-touchemulator';

class Controller {
	constructor(element, options) {
		Object.assign(this, {
			element: element,
			debug: true,
			delay: 0
		});

		Object.assign(this, options);

		this.initEvents();
	}

	panStart(x, y, e) { if (this.debug) console.log('Pan Start ', x, y); }

	panMove(x, y, e) { if (this.debug) console.log('Pan Move ', x, y); }

	panEnd(x, y, e) { if (this.debug) console.log('Pan End ', x, y); }

	pinchStart(x, y, scale, e) { if (this.debug) console.log('Pinch Start ', x, y, scale); }

	pinchMove(x, y, scale, e) { if (this.debug) console.log('Pinch Move ', x, y, scale); }

	pinchEnd(x, y, scale, e) { if (this.debug) console.log('Pinch End ', x, y, scale); }

	wheelDelta(x, y, d, e) { if (this.debug) console.log('Wheel ', x, y, d); }

	singleTap(x, y, e) { if (this.debug) console.log('Single Tap ', x, y); }

	doubleTap(x, y, e) { if (this.debug) console.log('Double Tap ', x, y); }

	hammerEventToPosition(e) {
		let rect = this.element.getBoundingClientRect();
		let x = e.center.x - rect.left;
		let y = e.center.y - rect.top;
		return { x: x, y: y }
	}

	eventToPosition(e, touch) {
		let rect = e.currentTarget.getBoundingClientRect();
		let cx = e.clientX;
		let cy = e.clientY;
		if (typeof (touch) != 'undefined') {
			cx = e.targetTouches[touch].clientX;
			cy = e.targetTouches[touch].clientY;
		}
		let x = cx - rect.left;
		let y = cy - rect.top;
		return { x: x, y: y }
	}

	initEvents() {
		TouchEmulator();

		/* //TODO when the canvas occupy only part of the document we would like to prevent any mouseover/etc 
		  when the user is panning !! Example demo code here, to be testes.
		
		function preventGlobalMouseEvents () {
		  document.body.style['pointer-events'] = 'none';
		}
		
		function restoreGlobalMouseEvents () {
		  document.body.style['pointer-events'] = 'auto';
		}
		
		function mousemoveListener (e) {
		  e.stopPropagation ();
		  // do whatever is needed while the user is moving the cursor around
		}
		
		function mouseupListener (e) {
		  restoreGlobalMouseEvents ();
		  document.removeEventListener ('mouseup',   mouseupListener,   {capture: true});
		  document.removeEventListener ('mousemove', mousemoveListener, {capture: true});
		  e.stopPropagation ();
		}
		
		function captureMouseEvents (e) {
		  preventGlobalMouseEvents ();
		  document.addEventListener ('mouseup',   mouseupListener,   {capture: true});
		  document.addEventListener ('mousemove', mousemoveListener, {capture: true});
		  e.preventDefault ();
		  e.stopPropagation ();
		}
		*/
		let element = this.element;

		element.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			return false;
		});

		const mc = new Hammer.Manager(element, {
			inputClass: Hammer.SUPPORT_POINTER_EVENTS ? Hammer.PointerEventInput : Hammer.TouchInput
		});
		//const mc = new Hammer.Manager(element);

		mc.add(new Hammer.Tap({ event: 'doubletap', taps: 2 }));
		mc.add(new Hammer.Tap({ event: 'singletap', taps: 1 }));
		mc.get('doubletap').recognizeWith('singletap');
		mc.get('singletap').requireFailure('doubletap');

		mc.on('singletap', (e) => {
			const pos = this.hammerEventToPosition(e);
			this.singleTap(pos.x, pos.y, e);
			e.preventDefault();
			return false;
		});

		mc.on('doubletap', (e) => {
			const pos = this.hammerEventToPosition(e);
			this.doubleTap(pos.x, pos.y, e);
			e.preventDefault();
			return false;
		});

		mc.add(new Hammer.Pan({ pointers: 1, direction: Hammer.DIRECTION_ALL, threshold: 0 }));
		mc.on('panstart', (e) => {
			const pos = this.hammerEventToPosition(e);
			this.panStart(pos.x, pos.y, e);
			e.preventDefault();
			return false;
		});

		mc.on('panmove', (e) => {
			const pos = this.hammerEventToPosition(e);
			this.panMove(pos.x, pos.y, e);
			e.preventDefault();
			return false;
		});

		mc.on('panend pancancel', (e) => {
			const pos = this.hammerEventToPosition(e);
			this.panEnd(pos.x, pos.y, e);
			e.preventDefault();
			return false;
		});

		mc.add(new Hammer.Pinch());
		mc.on('pinchstart', (e) => {
			const pos = this.hammerEventToPosition(e);
			const scale = e.scale;
			this.pinchStart(pos.x, pos.y, scale, e);
			e.preventDefault();
			return false;
		});

		mc.on('pinchmove', (e) => {
			const pos = this.hammerEventToPosition(e);
			const scale = e.scale;
			this.pinchMove(pos.x, pos.y, scale, e);
			e.preventDefault();
			return false;
		});

		mc.on('pinchend pinchcancel', (e) => {
			const pos = this.hammerEventToPosition(e);
			const scale = e.scale;
			this.pinchEnd(pos.x, pos.y, scale, e);
			e.preventDefault();
			return false;
		});

		element.addEventListener('wheel', (e) => {
			//TODO support for delta X?
			const pos = this.eventToPosition(e);
			let delta = e.deltaY > 0 ? 1 : -1;
			this.wheelDelta(pos.x, pos.y, delta, e);
			e.preventDefault();
		});

		// function log(ev) {
		// 	console.log(ev);
		// }

		// document.body.addEventListener('touchstart', log, false);
		// document.body.addEventListener('touchmove', log, false);
		// document.body.addEventListener('touchend', log, false);



		// // element.addEventListener('mouseup', (e) => {
		// 	const pos = this.eventToPosition(e);
		// 	this.mouseUp(pos.x, pos.y, e);
		// 	e.preventDefault(); 
		// 	return false;
		// });

		// element.addEventListener('mousedown', (e) => {
		// 	const pos = this.eventToPosition(e);
		// 	this.mouseDown(pos.x, pos.y, e);
		// 	e.preventDefault(); 
		// 	return false;
		// }, { capture: true });

		// element.addEventListener('mousemove', (e) => {
		// 	const pos = this.eventToPosition(e);
		// 	this.mouseMove(pos.x, pos.y, e);
		// 	e.preventDefault(); 
		// 	return false;
		// });

		// element.addEventListener('touchstart', (e) => {
		// 	e.preventDefault();

		// 	const pos0 = this.eventToPosition(e, 0);
		// 	if (e.targetTouches.length == 1) {
		// 		this.mouseDown(pos0.x, pos0.y, e);

		// 	} else if (e.targetTouches.length == 2) {
		// 		const pos1 = this.eventToPosition(e, 1);
		// 		this.pinchStart(pos0, pos1, e);
		// 	}
		// }, false);

		// element.addEventListener('touchend', (e) => {
		// 	const pos = this.eventToPosition(e);
		// 	this.mouseUp(pos.x, pos.y, e);
		// 	e.preventDefault();
		// }, false);

		// element.addEventListener('touchmove', (e) => {
		// 	const pos0 = this.eventToPosition(e, 0);
		// 	if (e.targetTouches.length == 1) {
		// 		this.mouseMove(pos0.x, pos0.y, e);
		// 	} else if (e.targetTouches.length == 2) {
		// 		const pos1 = this.eventToPosition(e, 1);
		// 		this.pinchMove(pos0, pos1, e);
		// 	}
		// 	e.preventDefault();
		// }, false);

		// element.addEventListener('wheel', (e) => {
		// 	//TODO support for delta X?
		// 	const pos = this.eventToPosition(e);

		// 	let delta = e.deltaY > 0? 1 : -1;
		// 	this.wheelDelta(pos.x, pos.y, delta, e);
		// 	e.preventDefault();
		// });

	}
}

export { Controller }
