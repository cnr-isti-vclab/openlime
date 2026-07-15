import { addSignals } from './Signals.js';

/**
 * Observable registry of viewer commands. It contains no DOM code and can be
 * consumed by any UI framework.
 */
class ActionRegistry {
	constructor(context = {}) {
		this.context = context;
		this._actions = new Map();
	}

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

	unregister(id) {
		const action = this._actions.get(id);
		if (!action) return false;
		this._actions.delete(id);
		this.emit('change', this._snapshot(action), 'unregister');
		return true;
	}

	update(id, patch = {}) {
		const action = this._actions.get(id);
		if (!action) return false;
		if ('id' in patch && patch.id !== id)
			throw new Error('ActionRegistry.update: action id cannot be changed');
		Object.assign(action, patch, { id });
		this.emit('change', this.get(id), 'update');
		return true;
	}

	get(id) {
		const action = this._actions.get(id);
		return action ? this._snapshot(action) : null;
	}

	list(options = {}) {
		const { visibleOnly = false } = options;
		return [...this._actions.values()]
			.filter(action => !visibleOnly || action.visible)
			.sort((a, b) => a.order - b.order)
			.map(action => this._snapshot(action));
	}

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

	destroy() {
		for (const id of [...this._actions.keys()]) this.unregister(id);
	}

	_snapshot(action) {
		const { execute, ...state } = action;
		return Object.freeze({ ...state });
	}
}

addSignals(ActionRegistry, 'change', 'execute');

export { ActionRegistry };
