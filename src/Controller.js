/**
 * Base class that handles user interaction via device events (mouse/touch events).
 * Provides an abstract user interface to define interaction actions such as panning, pinching, tapping, etc...
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
 * @abstract
 * @example
 * // Create a pan-zoom controller and associate it with the viewer's pointer manager
 * const panzoom = new OpenLIME.ControllerPanZoom(viewer.camera, {
 *     priority: -1000,
 *     activeModifiers: [0, 1]
 * });
 * viewer.pointerManager.onEvent(panzoom);
 */
class Controller {
	/**
	 * Creates a new Controller instance.
	 * @param {Object} [options] - Configuration options
	 * @param {boolean} [options.active=true] - Whether the controller is initially active
	 * @param {boolean} [options.debug=false] - Enable debug logging
	 * @param {number} [options.panDelay=50] - Inertial value for panning movements in milliseconds
	 * @param {number} [options.zoomDelay=200] - Delay for smoothing zoom events in milliseconds
	 * @param {number} [options.priority=0] - Controllers with higher priority are invoked first
	 * @param {number[]} [options.activeModifiers=[0]] - Array of modifier states that activate this controller
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
	 * Gets the modifier state from an event.
	 * @param {Event} e - The event to check
	 * @returns {number} Modifier state bitmask where:
	 * - 0 = No modifiers
	 * - 1 = Ctrl key
	 * - 2 = Shift key
	 * - 4 = Alt key
	 * Multiple modifiers combine their values (e.g., Ctrl+Shift = 3)
	 */
	modifierState(e) {
		let state = 0;
		if (e.ctrlKey) state += 1;
		if (e.shiftKey) state += 2;
		if (e.altKey) state += 4;

		return state;
	}

	/**
	 * Captures all events, preventing them from reaching other controllers.
	 * @private
	 */
	captureEvents() {
		this.capture = true;
	}

	/**
	 * Releases event capture, allowing events to reach other controllers.
	 * @private
	 */
	releaseEvents() {
		this.capture = false;
	}

	/**
	 * Handles the start of a pan gesture.
	 * @virtual
	 * @param {Event} e - The pan start event
	 * @description Called when user starts panning (mouse down or finger touch).
	 * Call e.preventDefault() to capture the event.
	 */
	panStart(e) { }

	/**
	 * Handles pan movement.
	 * @virtual
	 * @param {Event} e - The pan move event
	 * @description Called continuously during panning.
	 */
	panMove(e) { }

	/**
	 * Handles the end of a pan gesture.
	 * @virtual
	 * @param {Event} e - The pan end event
	 * @description Called when panning ends (mouse up or finger lift).
	 */
	panEnd(e) { }

	/**
	 * Handles the start of a pinch gesture.
	 * @virtual
	 * @param {Event} e1 - First finger event
	 * @param {Event} e2 - Second finger event
	 * @description Called when user starts a two-finger pinch.
	 * Call e1.preventDefault() to capture the event.
	 */
	pinchStart(e1, e2) { }

	/**
	 * Handles pinch movement.
	 * @virtual
	 * @param {Event} e1 - First finger event
	 * @param {Event} e2 - Second finger event
	 * @description Called continuously during pinching.
	 */
	pinchMove(e1, e2) { }

	/**
	 * Handles the end of a pinch gesture.
	 * @virtual
	 * @param {Event} e1 - First finger event
	 * @param {Event} e2 - Second finger event
	 * @description Called when pinch ends (finger lift).
	 */
	pinchEnd(e1, e2) { }

	/**
	 * Handles mouse wheel events.
	 * @virtual
	 * @param {WheelEvent} e - The wheel event
	 * @description Called when user rotates mouse wheel.
	 */
	mouseWheel(e) { }

	/**
	 * Handles single tap/click events.
	 * @virtual
	 * @param {Event} e - The tap event
	 * @description Called for quick mouse press or short finger touch.
	 */
	fingerSingleTap(e) { }

	/**
	 * Handles double tap/click events.
	 * @virtual
	 * @param {Event} e - The double tap event
	 * @description Called for quick double mouse press or double finger touch.
	 */
	fingerDoubleTap(e) { }
}

export { Controller }
