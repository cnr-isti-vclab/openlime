import { addSignals } from './Signals.js';

/**
 * @typedef {Object} ActionExecutionContext
 * @property {ActionRegistry} actions Observable registry executing the command.
 * @property {ActionState} action Read-only snapshot of the action being executed.
 * @property {Event|null} event Optional originating DOM event.
 * @property {*} data Optional application payload.
 * @property {Viewer} [viewer] Viewer when supplied by {@link ViewerTools}.
 * @property {ViewerTools} [tools] Owning tools facade when supplied by {@link ViewerTools}.
 * @property {ToolCoordinator} [interactions] Interaction coordinator when supplied by {@link ViewerTools}.
 * Additional custom properties supplied to {@link ActionRegistry#constructor} are included at runtime.
 */

/**
 * @typedef {Object} ActionDefinition
 * @property {string} id Stable, unique command identifier.
 * @property {function(ActionExecutionContext): *} execute Command implementation.
 * @property {string} [title=id] Human-readable action title.
 * @property {string|SVGElement} [icon] Skin selector, SVG markup, URL, or SVG element.
 * @property {string|null} [shortcut=null] Exact `KeyboardEvent.key` handled by {@link ViewerTools}.
 * @property {boolean} [visible=true] Whether visual adapters should expose the action.
 * @property {boolean} [enabled=true] Whether the action can currently be executed.
 * @property {boolean} [active=false] State of toggle-like actions.
 * @property {number} [order=0] Sort order used by registry consumers.
 * @property {Object<string, *>} [metadata] Application-specific metadata.
 */

/**
 * Immutable public representation of an action. The private `execute` callback is intentionally omitted.
 * @typedef {Object} ActionState
 * @property {string} id
 * @property {string} title
 * @property {string|SVGElement} icon
 * @property {string|null} shortcut
 * @property {boolean} visible
 * @property {boolean} enabled
 * @property {boolean} active
 * @property {number} order
 * @property {Object<string, *>} [metadata]
 */

/**
 * Observable, DOM-independent registry of viewer commands.
 * UI implementations can render {@link ActionState} snapshots and subscribe to
 * state changes without depending on viewer controllers.
 *
 * @example
 * const actions = new ActionRegistry({ viewer });
 * const unregister = actions.register({
 *     id: 'reset',
 *     title: 'Reset view',
 *     execute: ({ viewer }) => viewer.camera.fitCameraBox(250)
 * });
 * actions.execute('reset');
 * unregister();
 */
class ActionRegistry {
	/**
	 * Creates an action registry.
	 * @param {Object<string, *>} [context={}] Values injected into every action execution context.
	 */
	constructor(context = {}) {
		this.context = context;
		this._actions = new Map();
	}

	/**
	 * Subscribes to a registry signal. Runtime behavior is supplied by {@link addSignals}.
	 * @param {'change'|'execute'} event Signal name.
	 * @param {Function} callback Listener callback.
	 * @returns {void}
	 */
	addEvent(event, callback) {
		this.signals?.hasOwnProperty(event) || this.initSignals?.();
		this.signals?.[event]?.push(callback);
	}

	/**
	 * Removes one listener, or every listener for a signal when callback is omitted.
	 * @param {'change'|'execute'} event Signal name.
	 * @param {Function} [callback] Listener to remove.
	 * @returns {boolean}
	 */
	removeEvent(event, callback) {
		if (!this.signals?.[event]) return false;
		if (callback === undefined) {
			const found = this.signals[event].length > 0;
			this.signals[event] = [];
			return found;
		}
		const length = this.signals[event].length;
		this.signals[event] = this.signals[event].filter(listener => listener !== callback);
		return length !== this.signals[event].length;
	}

	/**
	 * Registers a command and emits {@link ActionRegistry#event:change}.
	 * @param {ActionDefinition} definition Action declaration.
	 * @returns {function(): boolean} Function that unregisters the action.
	 * @throws {Error} If the identifier is missing, duplicated, or `execute` is not a function.
	 */
	register(definition) {
		if (!definition || typeof definition.id !== 'string' || !definition.id)
			throw new Error('ActionRegistry.register: action.id must be a non-empty string');
		if (typeof definition.execute !== 'function')
			throw new Error(`ActionRegistry.register: action '${definition.id}' must define execute()`);
		if (this._actions.has(definition.id))
			throw new Error(`ActionRegistry.register: action '${definition.id}' is already registered`);

		const action = {
			title: definition.id,
			icon: `.openlime-${definition.id}`,
			shortcut: null,
			visible: true,
			enabled: true,
			active: false,
			order: 0,
			...definition
		};
		this._actions.set(action.id, action);
		this.emit('change', this.get(action.id), 'register');
		return () => this.unregister(action.id);
	}

	/**
	 * Removes a registered action.
	 * @param {string} id Action identifier.
	 * @returns {boolean} `true` when an action was removed.
	 */
	unregister(id) {
		const action = this._actions.get(id);
		if (!action) return false;
		this._actions.delete(id);
		this.emit('change', this._snapshot(action), 'unregister');
		return true;
	}

	/**
	 * Applies a partial state or implementation update.
	 * @param {string} id Action identifier.
	 * @param {Partial<ActionDefinition>} [patch={}] Properties to replace; the identifier is immutable.
	 * @returns {boolean} `false` if the action does not exist.
	 */
	update(id, patch = {}) {
		const action = this._actions.get(id);
		if (!action) return false;
		if ('id' in patch && patch.id !== id)
			throw new Error('ActionRegistry.update: action id cannot be changed');
		Object.assign(action, patch, { id });
		this.emit('change', this.get(id), 'update');
		return true;
	}

	/**
	 * Returns an immutable action snapshot.
	 * @param {string} id Action identifier.
	 * @returns {ActionState|null}
	 */
	get(id) {
		const action = this._actions.get(id);
		return action ? this._snapshot(action) : null;
	}

	/**
	 * Lists immutable action snapshots ordered by their `order` property.
	 * @param {Object} [options={}] Query options.
	 * @param {boolean} [options.visibleOnly=false] Exclude actions whose `visible` state is false.
	 * @returns {ActionState[]}
	 */
	list(options = {}) {
		const { visibleOnly = false } = options;
		return [...this._actions.values()]
			.filter(action => !visibleOnly || action.visible)
			.sort((a, b) => a.order - b.order)
			.map(action => this._snapshot(action));
	}

	/**
	 * Executes an enabled action.
	 * @param {string} id Action identifier.
	 * @param {Event|null} [event=null] Originating DOM event, when applicable.
	 * @param {*} [data] Optional application payload.
	 * @returns {*} The command result, `true` for a void result, or `false` when unavailable/disabled.
	 */
	execute(id, event = null, data = undefined) {
		const action = this._actions.get(id);
		if (!action || !action.enabled) return false;
		const result = action.execute({
			...this.context,
			actions: this,
			action: this._snapshot(action),
			event,
			data
		});
		this.emit('execute', this.get(id), result);
		return result === undefined ? true : result;
	}

	/** Removes every registered action and its observable state. */
	destroy() {
		for (const id of [...this._actions.keys()]) this.unregister(id);
	}

	/**
	 * Creates the immutable representation exposed to consumers.
	 * @param {ActionDefinition} action Internal action record.
	 * @returns {ActionState}
	 * @private
	 */
	_snapshot(action) {
		const { execute, ...state } = action;
		return Object.freeze({ ...state });
	}
}

/**
 * Fired after an action is registered, updated, or unregistered.
 * @event ActionRegistry#change
 * @type {Object}
 * @property {ActionState} action Current action snapshot.
 * @property {'register'|'update'|'unregister'} change Change kind.
 */

/**
 * Fired after an action has been executed.
 * @event ActionRegistry#execute
 * @type {Object}
 * @property {ActionState} action Executed action.
 * @property {*} result Raw command result.
 */

addSignals(ActionRegistry, 'change', 'execute');

export { ActionRegistry };
