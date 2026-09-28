import { addSignals } from './Signals.js';

/**
 * @typedef {Object} InteractiveToolDefinition
 * @property {string} id Stable, unique tool identifier.
 * @property {string} [group='primary-pointer-tool'] Mutual-exclusion group.
 * @property {boolean} [fallback=false] Restore this tool when another tool in the group is deactivated.
 * @property {boolean} [initiallyActive=false] Activate the tool as soon as it is registered.
 * @property {function(): void} [activate] Enables the underlying interaction.
 * @property {function(): void} [deactivate] Disables the underlying interaction.
 * @property {function(): void} [suspend] Temporarily yields input without changing logical active state.
 * @property {function(): void} [resume] Restores input after suspension.
 */

/**
 * Coordinates mutually exclusive interactive tools without coupling their implementations.
 * Only one tool can be active in a group. Deactivating a non-fallback tool automatically
 * restores the group's fallback tool.
 *
 * @example
 * const interactions = new ToolCoordinator();
 * interactions.register({
 *     id: 'navigation', fallback: true, initiallyActive: true,
 *     activate: () => panzoom.active = true,
 *     deactivate: () => panzoom.active = false
 * });
 * interactions.register({ id: 'measure', activate: startRuler, deactivate: stopRuler });
 * interactions.toggle('measure');
 */
class ToolCoordinator {
	/** Creates an empty interaction coordinator. */
	constructor() {
		this._tools = new Map();
		this._activeByGroup = new Map();
		this._suspensions = new Map();
	}

	/**
	 * Subscribes to an interaction signal. Runtime behavior is supplied by {@link addSignals}.
	 * @param {'change'|'suspend'} event Signal name.
	 * @param {Function} callback Listener callback.
	 * @returns {void}
	 */
	addEvent(event, callback) {
		this.signals?.hasOwnProperty(event) || this.initSignals?.();
		this.signals?.[event]?.push(callback);
	}

	/**
	 * Removes one listener, or every listener for a signal when callback is omitted.
	 * @param {'change'|'suspend'} event Signal name.
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
	 * Registers an interactive tool.
	 * @param {InteractiveToolDefinition} definition Tool lifecycle callbacks and grouping information.
	 * @returns {function(): boolean} Function that unregisters the tool.
	 * @throws {Error} If the identifier is absent or already registered.
	 */
	register(definition) {
		if (!definition?.id) throw new Error('ToolCoordinator.register: missing tool id');
		if (this._tools.has(definition.id))
			throw new Error(`ToolCoordinator.register: tool '${definition.id}' is already registered`);
		const tool = {
			group: 'primary-pointer-tool',
			fallback: false,
			activate: () => {},
			deactivate: () => {},
			...definition,
			active: false
		};
		this._tools.set(tool.id, tool);
		if (tool.initiallyActive) this.activate(tool.id);
		return () => this.unregister(tool.id);
	}

	/**
	 * Unregisters a tool, deactivating it first when needed.
	 * @param {string} id Tool identifier.
	 * @returns {boolean} `true` when the tool existed.
	 */
	unregister(id) {
		const tool = this._tools.get(id);
		if (!tool) return false;
		if (tool.active) this.deactivate(id, { restoreFallback: false });
		this._tools.delete(id);
		return true;
	}

	/**
	 * Activates a tool and deactivates the current member of its group.
	 * @param {string} id Tool identifier.
	 * @returns {boolean} `true` when the tool is active.
	 * @throws {Error} If the tool is unknown or its activation callback fails.
	 */
	activate(id) {
		const tool = this._tools.get(id);
		if (!tool) throw new Error(`ToolCoordinator.activate: unknown tool '${id}'`);
		if (tool.active) return true;

		const currentId = this._activeByGroup.get(tool.group);
		if (currentId && currentId !== id)
			this.deactivate(currentId, { restoreFallback: false });

		tool.active = true;
		this._activeByGroup.set(tool.group, id);
		try {
			tool.activate();
		} catch (error) {
			tool.active = false;
			this._activeByGroup.delete(tool.group);
			throw error;
		}
		this.emit('change', id, true, tool.group);
		return true;
	}

	/**
	 * Deactivates an active tool.
	 * @param {string} id Tool identifier.
	 * @param {Object} [options={}] Deactivation options.
	 * @param {boolean} [options.restoreFallback=true] Reactivate the group fallback.
	 * @returns {boolean} `true` when an active tool was deactivated.
	 */
	deactivate(id, options = {}) {
		const { restoreFallback = true } = options;
		const tool = this._tools.get(id);
		if (!tool || !tool.active) return false;
		tool.active = false;
		if (this._activeByGroup.get(tool.group) === id)
			this._activeByGroup.delete(tool.group);
		tool.deactivate();
		this.emit('change', id, false, tool.group);

		if (restoreFallback) {
			const fallback = [...this._tools.values()]
				.find(candidate => candidate.group === tool.group && candidate.fallback && candidate.id !== id);
			if (fallback) this.activate(fallback.id);
		}
		return true;
	}

	/**
	 * Toggles or forces a tool's active state.
	 * @param {string} id Tool identifier.
	 * @param {boolean} [force] Desired state; omit to toggle.
	 * @returns {boolean} Result of activation or deactivation.
	 */
	toggle(id, force) {
		const active = this.isActive(id);
		const next = force === undefined ? !active : !!force;
		return next ? this.activate(id) : this.deactivate(id);
	}

	/**
	 * Tests the logical active state of a tool.
	 * @param {string} id Tool identifier.
	 * @returns {boolean}
	 */
	isActive(id) {
		return !!this._tools.get(id)?.active;
	}

	/**
	 * Returns the active tool in a mutual-exclusion group.
	 * @param {string} group Group identifier.
	 * @returns {string|null} Active tool identifier.
	 */
	activeInGroup(group) {
		return this._activeByGroup.get(group) ?? null;
	}

	/**
	 * Temporarily hands interaction input to the group's fallback without changing
	 * the active tool's logical state. Tokens allow independent callers to resume
	 * only the suspension they own.
	 * @param {string} group Group identifier.
	 * @param {string} [token=group] Unique suspension token.
	 * @returns {boolean} `true` when input was suspended.
	 */
	suspend(group, token = group) {
		if (this._suspensions.has(token)) return false;
		const activeId = this._activeByGroup.get(group);
		const active = this._tools.get(activeId);
		const fallback = [...this._tools.values()]
			.find(candidate => candidate.group === group && candidate.fallback);
		if (!active || !fallback || active === fallback) return false;

		if (typeof active.suspend === 'function') active.suspend();
		else active.deactivate();
		fallback.activate();
		this._suspensions.set(token, { group, active, fallback });
		this.emit('suspend', group, true, token);
		return true;
	}

	/**
	 * Resumes a previously suspended interaction.
	 * @param {string} token Suspension token passed to {@link ToolCoordinator#suspend}.
	 * @returns {boolean} `true` when a matching suspension was resumed.
	 */
	resume(token) {
		const state = this._suspensions.get(token);
		if (!state) return false;
		this._suspensions.delete(token);
		state.fallback.deactivate();
		if (typeof state.active.resume === 'function') state.active.resume();
		else state.active.activate();
		this.emit('suspend', state.group, false, token);
		return true;
	}

	/** Resumes outstanding suspensions, deactivates tools, and clears the registry. */
	destroy() {
		for (const token of [...this._suspensions.keys()]) this.resume(token);
		for (const tool of [...this._tools.values()])
			if (tool.active) this.deactivate(tool.id, { restoreFallback: false });
		this._tools.clear();
		this._activeByGroup.clear();
	}
}

/**
 * Fired when a tool's logical active state changes.
 * @event ToolCoordinator#change
 * @type {Object}
 * @property {string} id Tool identifier.
 * @property {boolean} active New active state.
 * @property {string} group Mutual-exclusion group.
 */

/**
 * Fired when a group is suspended or resumed.
 * @event ToolCoordinator#suspend
 * @type {Object}
 * @property {string} group Group identifier.
 * @property {boolean} suspended Whether the group is currently suspended.
 * @property {string} token Suspension owner token.
 */

addSignals(ToolCoordinator, 'change', 'suspend');

export { ToolCoordinator };
