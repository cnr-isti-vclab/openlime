import { addSignals } from './Signals.js';

/** Coordinates mutually-exclusive interactive tools without coupling them. */
class ToolCoordinator {
	constructor() {
		this._tools = new Map();
		this._activeByGroup = new Map();
		this._suspensions = new Map();
	}

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

	unregister(id) {
		const tool = this._tools.get(id);
		if (!tool) return false;
		if (tool.active) this.deactivate(id, { restoreFallback: false });
		this._tools.delete(id);
		return true;
	}

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

	toggle(id, force) {
		const active = this.isActive(id);
		const next = force === undefined ? !active : !!force;
		return next ? this.activate(id) : this.deactivate(id);
	}

	isActive(id) {
		return !!this._tools.get(id)?.active;
	}

	activeInGroup(group) {
		return this._activeByGroup.get(group) ?? null;
	}

	/** Temporarily hands pointer input to a fallback without changing tool state. */
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

	destroy() {
		for (const token of [...this._suspensions.keys()]) this.resume(token);
		for (const tool of [...this._tools.values()])
			if (tool.active) this.deactivate(tool.id, { restoreFallback: false });
		this._tools.clear();
		this._activeByGroup.clear();
	}
}

addSignals(ToolCoordinator, 'change', 'suspend');

export { ToolCoordinator };
