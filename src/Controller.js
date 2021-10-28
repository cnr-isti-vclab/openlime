/**
 * Virtual nase class for controllers: classes that handle mouse and touch events and links to pan, zoom, etc.
 * Callbacks supporte are:
 * * *panStart(event)* calling event.preventDefault() will capture the panning gestire
 * * *panMove(event)*
 * * *panEnd(event)*
 * * *pinchStart(event)* calling event.preventDefault() will capture the pinch gestire
 * * *pinchMove(event)*
 * * *pinchEnd(event)*
 * * *wheelDelta(event)*
 * * *singleTap(event)*
 * * *wheelDelta(event)*
 * * *doubleTap(event)*
 * * *resize(event)*
 * 
 * In general event.preventDefault() will capture the event and wont be propagated to other controllers.

 * 
 * @param {options} options 
 * * *panDelay* inertia of the movement in ms for panning movements (default 100)
 * * *zoomDelay* a zoom event is smoothed over this delay in ms (default 200)
 * * *priority* higher priority controllers are invoked in advance.
 */

class Controller {
	constructor(options) {

/*	For some reason can't define these variables static, for the moment just use the numeric value.
	static NoModifiers = 0;
	static CrtlModifier = 1;
	static ShiftModifier = 2;
	static AltModifier = 4; */

		Object.assign(this, {
			active: true,
			debug: false,
			panDelay: 50,
			zoomDelay: 200,
			priority: 0,
			activeModifiers: [0]
		});

		Object.assign(this, options);

	}

	modifierState(e) {
		let state = 0;
		if(e.ctrlKey) state += 1;
		if(e.shiftKey) state += 2;
		if(e.altKey) state += 4;
		
		return state;
	}

	captureEvents() {
		this.capture = true; //TODO should actually specify WHAT it is capturing: which touch etc.
	}

	releaseEvents() {
		this.capture = false;
	}

/* Implement these functions to interacts with mouse/touch/resize events. */

}

export { Controller }
