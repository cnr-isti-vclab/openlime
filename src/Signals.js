/**
 * @typedef {Object} SignalHandler
 * @property {Object.<string, Function[]>} signals - Map of event names to arrays of callback functions
 * @property {string[]} allSignals - List of all registered signal names
 */

/**
 * Adds event handling capabilities to a prototype.
 * Creates a simple event system that allows objects to emit and listen to events.
 * 
 * The function modifies the prototype by adding:
 * - Event registration methods
 * - Event emission methods
 * - Signal initialization
 * - Signal storage
 * 
 * @function
 * @param {Object} proto - The prototype to enhance with signal capabilities
 * @param {...string} signals - Names of signals to register
 * 
 * @example
 * ```javascript
 * // Add events to a class
 * class MyClass {}
 * addSignals(MyClass, 'update', 'change');
 * 
 * // Use events
 * const obj = new MyClass();
 * obj.addEvent('update', () => console.log('Updated!'));
 * obj.emit('update');
 * ```
 * 
 * @example
 * ```javascript
 * // Multiple signals
 * class DataHandler {}
 * addSignals(DataHandler, 
 *     'dataLoaded',
 *     'dataProcessed',
 *     'error'
 * );
 * 
 * const handler = new DataHandler();
 * handler.addEvent('dataLoaded', (data) => {
 *     console.log('Data loaded:', data);
 * });
 * ```
 */
function addSignals(proto, ...signals) {

	if (!proto.prototype.allSignals)
		proto.prototype.allSignals = [];
	proto.prototype.allSignals = [...proto.prototype.allSignals, ...signals];

	/**
	 * Methods added to the prototype
	 */

	/**
	 * Initializes the signals system for an instance.
	 * Creates the signals storage object and populates it with empty arrays
	 * for each registered signal type.
	 * 
	 * @memberof SignalHandler
	 * @instance
	 * @private
	 */
	proto.prototype.initSignals = function () {
		this.signals = Object.fromEntries(this.allSignals.map(s => [s, []]));
	}


	/**
	 * Registers a callback function for a specific event.
	 * 
	 * @memberof SignalHandler
	 * @instance
	 * @param {string} event - The event name to listen for
	 * @param {Function} callback - Function to be called when event is emitted
	 * @throws {Error} Implicitly if event doesn't exist
	 * 
	 * @example
	 * ```javascript
	 * obj.addEvent('update', (param1, param2) => {
	 *     console.log('Update occurred with:', param1, param2);
	 * });
	 * ```
	 */
	proto.prototype.addEvent = function (event, callback) {
		if (!this.signals)
			this.initSignals();
		this.signals[event].push(callback);
	}

/**
 * Emits an event, triggering all registered callbacks.
 * Callbacks are executed in the order they were registered.
 * 
 * @memberof SignalHandler
 * @instance
 * @param {string} event - The event name to emit
 * @param {...*} parameters - Parameters to pass to the callback functions
 * 
 * @example
 * ```javascript
 * obj.emit('update', 'param1', 42);
 * ```
 */
	proto.prototype.emit = function (event, ...parameters) {
		if (!this.signals)
			this.initSignals();
		for (let r of this.signals[event])
			r(...parameters);
	}
}

/**
 * Implementation Details
 * 
 * The signal system works by:
 * 1. Extending the prototype with signal tracking properties
 * 2. Maintaining arrays of callbacks for each signal type
 * 3. Providing methods to register and trigger callbacks
 * 
 * Signal Storage Structure:
 * ```javascript
 * {
 *     signals: {
 *         'eventName1': [callback1, callback2, ...],
 *         'eventName2': [callback3, callback4, ...]
 *     },
 *     allSignals: ['eventName1', 'eventName2', ...]
 * }
 * ```
 * 
 * Performance Considerations:
 * - Callbacks are stored in arrays for fast iteration
 * - Signals are initialized lazily on first use
 * - Direct property access for quick event emission
 * 
 * Usage Notes:
 * - Events must be registered before they can be used
 * - Multiple callbacks can be registered for the same event
 * - Callbacks are executed synchronously
 * - Parameters are passed through to callbacks unchanged
 */

export { addSignals }