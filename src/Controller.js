/**
 * **Controller** is a virtual base class that handles user interaction via device events (mouse/touch events).
 * It provides an abstract user interface to define interaction actions such as panning, pinching, tapping, etc...
 * The actions are implemented by pre-defined callback functions:
 * * `panStart(e)` intercepts the initial pan event (movement of the mouse after pressing a mouse button or moving a finger).
 * The event is captured calling `e.preventDefault()`.
 * * `panMove(e)` receives and handles the pan event.
 * * `panEnd(e)` intercepts the final pan event (the user releases the left mouse button or removes his finger from the screen).
 * * `pinchStart(e1, e2)` intercepts the initial pinch event (a continuous gesture that tracks the positions between the first two fingers that touch the screen).
 * The event is captured calling `e1.preventDefault()`.
 * * `pinchMove(e1,e2)` receives and handles the pinch event.
 * * `pinchEnd(e1,e2)` intercepts the final pinch event (the user removes one of their two fingers from the screen).
 * * `mouseWheel(e)` receives and handles the mouse wheel event (the user rotates the mouse wheel button).
 * * `fingerSingleTap(e)` receives and handles the single-tap event (the user presses a mouse button quickly or touches the screen shortly with a finger).
 * * `fingerDoubleTap(e)` receives and handles the double-tap event (the user quickly presses a mouse button twice or shortly touches the screen with a finger twice).
 * 
 * `e.preventDefault()` will capture the event and wont be propagated to other controllers.
 * 
 * This class only describes user interactions by implementing actions or callbacks. A **Controller** works in concert with a **PointerManager** object 
 * that emits events and links them to actions.
 * 
 * In the example below a **ControllerPanZoom** object (derived from **Controller**) is created and associated with the `pointerManager` of the `viewer`.
 * ```
 * const panzoom = new OpenLIME.ControllerPanZoom(viewer.camera, {
 *     priority: -1000,
 *     activeModifiers: [0, 1]
 * });
 * viewer.pointerManager.onEvent(panzoom);
 * ```	
 */
class Controller {
	/**
	 * Instantiates a Controller object.
	 * @param {Object} [options] An object literal with controller parameters.
	 * @param {number} options.panDelay=50 Inertial value of the movement in ms for panning movements.
	 * @param {number} options.zoomDelay=200 A zoom event is smoothed over this delay in ms,
	 * @param {number} options.priority=0 Higher priority controllers are invoked first.
	 */
	constructor(options) {
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

	/**
	 * Returns the modifier state of the event `e`. Modifiers are keyboard events that happens simultaneously 
	 * with a device event (e.g. shift + left mouse button).
	 * The modifiers handled by a controller are:
	 * * NoModifiers = 0
	 * * CrtlModifier = 1
	 * * ShiftModifier = 2
	 * * AltModifier = 4
	 * 
	 * The modifier state is the sum of values above corresponding to the key pressed (CTRL, SHIFT or ALT).
	 * @param {Event} e 
	 * @returns {number} The modifier state.
	 */
	modifierState(e) {
		let state = 0;
		if(e.ctrlKey) state += 1;
		if(e.shiftKey) state += 2;
		if(e.altKey) state += 4;
		
		return state;
	}

	/** @ignore */
	captureEvents() {
		this.capture = true;
	}

	/** @ignore */
	releaseEvents() {
		this.capture = false;
	}
}

export { Controller }
