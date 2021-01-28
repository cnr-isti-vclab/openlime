/**
 * @param {dom} element DOM element where mouse events will be listening.
 * @param {options} options 
 * * *delay* inertia of the movement in ms.
 */

class Controller {
	constructor(element, options) {
		Object.assign(this, {
			element:element,
			debug: true,
			delay: 100
		});

		Object.assign(this, options);

		this.initEvents();
	}

	mouseDown(x, y, e) {  if(this.debug) console.log('Down ', x, y);}

	mouseUp(x, y, e) {  if(this.debug) console.log('Up ', x, y); }
	
	mouseMove(x, y, e) { if(this.debug) console.log('Move ', x, y); }

	zoomDelta(x, y, d, e) {  if(this.debug) console.log('Delta ', x, y, d); }

	zoomStart(pos1, pos2, e) {if(this.debug) console.log('ZStart ', pos1, pos2); }

	zoomMove(pos1, pos2, e) {if(this.debug) console.log('ZMove ', pos1, pos2); }


	eventToPosition(e, touch) {
		let rect = e.currentTarget.getBoundingClientRect();
		let cx = e.clientX;
		let cy = e.clientY;
		if(typeof(touch) != 'undefined') {
			cx = e.targetTouches[touch].clientX;
			cy = e.targetTouches[touch].clientY;
		}
		let x = cx - rect.left;
		let y = cy - rect.top;
		return { x:x, y:y }
	}

	initEvents() {

/* //TODO when the canvas occupy only part of the document we would like to prevent any mouseover/etc 
  when the user is panning !! Example demo code here.

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

		element.addEventListener('mouseup', (e) => {
			let pos = this.eventToPosition(e);
			this.mouseUp(pos.x, pos.y, e);
			e.preventDefault(); 
			return false;
		});

		element.addEventListener('mousedown', (e) => {
			let pos = this.eventToPosition(e);
			this.mouseDown(pos.x, pos.y, e);
			e.preventDefault(); 
			return false;
		}, { capture: true });

		element.addEventListener('mousemove', (e) => {
			let pos = this.eventToPosition(e);
			this.mouseMove(pos.x, pos.y, e);
			e.preventDefault(); 
			return false;
		});

		element.addEventListener('touchstart', function (e) {
			e.preventDefault();
	
			let pos0 = this.eventToPosition(e, 0);
			if (e.targetTouches.length == 1) {
				this.mouseDown(pos0.x, pos0.y, e);

			} else if (e.targetTouches.length == 2) {
				let pos1 = this.eventToPosition(e, 1);
				this.zoomStart(pos0, pos1, e);
			}
		}, false);

		element.addEventListener('touchend', function (e) {
			let pos = this.eventToPosition(e);
			this.mouseUp(pos.x, pos.y, e);
			e.preventDefault();
		}, false);

		element.addEventListener('touchmove', function (evt) {
			let pos0 = this.eventToPosition(e, 0);
			if (e.targetTouches.length == 1) {
				this.mouseMove(pos0.x, pos0.y, e);
			} else if (e.targetTouches.length == 2) {
				let pos1 = this.eventToPosition(e, 1);
				this.zoomMove(pos0, pos1, e);
			}
			e.preventDefault();
		}, false);

	}
}

export { Controller }
