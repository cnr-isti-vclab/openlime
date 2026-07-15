import { addSignals } from './Signals.js';
import { ActionRegistry } from './ActionRegistry.js';
import { ToolCoordinator } from './ToolCoordinator.js';

/**
 * Headless, extensible facade over Viewer capabilities.
 * Features register actions and controllers; visual components subscribe to it.
 */
class ViewerTools {
	constructor(viewer, options = {}) {
		if (!viewer) throw new Error('ViewerTools: missing viewer');
		this.viewer = viewer;
		this.interactions = new ToolCoordinator();
		this.actions = new ActionRegistry({ viewer, tools: this, interactions: this.interactions });
		this._features = new Map();
		this._shortcutTarget = options.shortcutTarget === undefined
			? (typeof document !== 'undefined' ? document : null)
			: options.shortcutTarget;
		this._temporaryPanToken = 'viewer-tools-temporary-pan';
		this._onKeyDown = event => {
			if (event.ctrlKey && event.shiftKey && !event.altKey)
				this.interactions.suspend('primary-pointer-tool', this._temporaryPanToken);
		};
		this._onKeyUp = event => this._handleShortcut(event);
		this._onBlur = () => this.interactions.resume(this._temporaryPanToken);
		this._shortcutTarget?.addEventListener?.('keydown', this._onKeyDown, false);
		this._shortcutTarget?.addEventListener?.('keyup', this._onKeyUp, false);
		if (typeof window !== 'undefined') window.addEventListener('blur', this._onBlur, false);

		for (const feature of options.features ?? []) this.addFeature(feature);
	}

	addFeature(feature) {
		if (typeof feature === 'function') feature = feature();
		if (!feature?.id || typeof feature.install !== 'function')
			throw new Error('ViewerTools.addFeature: a feature needs id and install(context)');
		if (this._features.has(feature.id))
			throw new Error(`ViewerTools.addFeature: feature '${feature.id}' is already installed`);

		const context = {
			viewer: this.viewer,
			tools: this,
			actions: this.actions,
			interactions: this.interactions
		};
		const installed = feature.install(context) ?? {};
		const record = {
			feature,
			api: installed.api ?? feature.api ?? null,
			destroy: typeof installed === 'function' ? installed : installed.destroy
		};
		this._features.set(feature.id, record);
		this.emit('featureChange', feature.id, true);
		return record.api;
	}

	removeFeature(id) {
		const record = this._features.get(id);
		if (!record) return false;
		record.destroy?.();
		this._features.delete(id);
		this.emit('featureChange', id, false);
		return true;
	}

	getFeature(id) {
		return this._features.get(id)?.api ?? null;
	}

	execute(id, event = null, data = undefined) {
		return this.actions.execute(id, event, data);
	}

	destroy() {
		this.interactions.resume(this._temporaryPanToken);
		this._shortcutTarget?.removeEventListener?.('keydown', this._onKeyDown, false);
		this._shortcutTarget?.removeEventListener?.('keyup', this._onKeyUp, false);
		if (typeof window !== 'undefined') window.removeEventListener('blur', this._onBlur, false);
		for (const id of [...this._features.keys()].reverse()) this.removeFeature(id);
		this.interactions.destroy();
		this.actions.destroy();
	}

	_handleShortcut(event) {
		if (!event.ctrlKey || !event.shiftKey) this.interactions.resume(this._temporaryPanToken);
		if (event.defaultPrevented) return;
		if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
		const action = this.actions.list()
			.find(candidate => candidate.enabled && candidate.shortcut === event.key);
		if (!action) return;
		event.preventDefault();
		this.execute(action.id, event);
	}
}

addSignals(ViewerTools, 'featureChange');

export { ViewerTools };
