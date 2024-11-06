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
 *
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
	 * Adds a one-time event listener that will be automatically removed after first execution.
	 * Once the event is emitted, the listener is automatically removed before the callback
	 * is executed.
	 * 
	 * @memberof SignalHandler
	 * @instance
	 * @param {string} event - The event name to listen for once
	 * @param {Function} callback - Function to be called once when event is emitted
	 * @throws {Error} Implicitly if event doesn't exist or callback is not a function
	 * 
	 * @example
	 * ```javascript
	 * obj.once('update', (param) => {
	 *     console.log('This will only run once:', param);
	 * });
	 * ```
	 */
	proto.prototype.once = function (event, callback) {
			if (!callback || typeof callback !== 'function') {
					console.error('Callback must be a function');
					return;
			}

			const wrappedCallback = (...args) => {
					// Remove the listener before calling the callback
					// to prevent recursion if the callback emits the same event
					this.removeEvent(event, wrappedCallback);
					callback.apply(this, args);
			};

			this.addEvent(event, wrappedCallback);
	}

	/**
	 * Removes an event callback or all callbacks for a specific event.
	 * If no callback is provided, all callbacks for the event are removed.
	 * If a callback is provided, only that specific callback is removed.
	 * 
	 * @memberof SignalHandler
	 * @instance
	 * @param {string} event - The event name to remove callback(s) from
	 * @param {Function} [callback] - Optional specific callback function to remove
	 * @returns {boolean} True if callback(s) were removed, false if event or callback not found
	 * @throws {Error} Implicitly if event doesn't exist
	 * 
	 * @example
	 * ```javascript
	 * // Remove specific callback
	 * const callback = (data) => console.log(data);
	 * obj.addEvent('update', callback);
	 * obj.removeEvent('update', callback);
	 * 
	 * // Remove all callbacks for an event
	 * obj.removeEvent('update');
	 * ```
	 */
	proto.prototype.removeEvent = function (event, callback) {
			if (!this.signals) {
					this.initSignals();
					return false;
			}

			if (!this.signals[event]) {
					return false;
			}

			if (callback === undefined) {
					// Remove all callbacks for this event
					const hadCallbacks = this.signals[event].length > 0;
					this.signals[event] = [];
					return hadCallbacks;
			}

			// Find and remove specific callback
			const initialLength = this.signals[event].length;
			this.signals[event] = this.signals[event].filter(cb => cb !== callback);
			return initialLength > this.signals[event].length;
	}

	/**
	 * Emits an event, triggering all registered callbacks.
	 * Callbacks are executed in the order they were registered.
	 * Creates a copy of the callbacks array before iteration to prevent
	 * issues if callbacks modify the listeners during emission.
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
			// Create a copy of the callbacks array to safely iterate even if
			// callbacks modify the listeners
			const callbacks = [...this.signals[event]];
			for (let r of callbacks)
					r(...parameters);
	}
}

export { addSignals }