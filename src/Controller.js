/**
 * @param {dom} element DOM element where mouse events will be listening.
 * @param {options} options 
 * * *delay* inertia of the movement in ms.
 */

class Controller {
	constructor(options) {
		Object.assign(this, {
			active: true,
			debug: false,
			delay: 0
		});

		Object.assign(this, options);
	}

	captureEvents() {
		this.capture = true; //il mouse oppure quel touch
	}

	releaseEvents() {
		this.capture = false;
	}

/* Implement these functions to interacts with mouse/touch/resize events. */

/*
	panStart(e, x, y) { if (this.debug) console.log('Pan Start ', x, y); return false; }

	panMove(e, x, y) { if (this.debug) console.log('Pan Move ', x, y); return false; }

	panEnd(e, x, y) { if (this.debug) console.log('Pan End ', x, y); return false; }

	pinchStart(e, x, y, scale) { if (this.debug) console.log('Pinch Start ', x, y, scale); return false; }

	pinchMove(e, x, y, scale) { if (this.debug) console.log('Pinch Move ', x, y, scale); return false; }

	pinchEnd(e, x, y, scale) { if (this.debug) console.log('Pinch End ', x, y, scale); return false; }

	wheelDelta(e, x, y, d) { if (this.debug) console.log('Wheel ', x, y, d); return false; }

	singleTap(e, x, y) { if (this.debug) console.log('Single Tap ', x, y); return false; }

	doubleTap(e, x, y) { if (this.debug) console.log('Double Tap ', x, y); return false; }

	resize(e, width, height) { if(this.debug) console.log('Rezize ', width, height); return false; }
*/

}

export { Controller }
