import { addSignals } from './Signals.js';
import { ActionRegistry } from './ActionRegistry.js';
import { ToolCoordinator } from './ToolCoordinator.js';

/**
 * @typedef {Object} ViewerToolContext
 * @property {Viewer} viewer Viewer extended by the feature.
 * @property {ViewerTools} tools Owning headless facade.
 * @property {ActionRegistry} actions Shared action registry.
 * @property {ToolCoordinator} interactions Shared interaction coordinator.
 */

/**
 * @template T
 * @typedef {Object} ViewerToolInstallation
 * @property {T} [api] Public API returned by {@link ViewerTools#getFeature}.
 * @property {function(): void} [destroy] Feature cleanup callback.
 */

/**
 * Releases resources owned by an installed viewer feature.
 * @callback ViewerToolCleanup
 * @returns {void}
 */

/**
 * @template T
 * @typedef {Object} ViewerToolFeature
 * @property {string} id Stable, unique feature identifier.
 * @property {function(ViewerToolContext): (ViewerToolInstallation<T>|ViewerToolCleanup|undefined)} install Installs the feature.
 * @property {T} [api] Optional public API used when `install()` does not return one.
 */

/**
 * @typedef {Object} ViewerToolsOptions
 * @property {Array<ViewerToolFeature<*>|function(): ViewerToolFeature<*>>} [features=[]] Features installed in declaration order.
 * @property {EventTarget|null} [shortcutTarget=document] Keyboard event target; use `null` to disable shortcuts.
 */

/**
 * Headless, extensible facade over {@link Viewer} capabilities.
 * Features register commands and interaction lifecycles; any DOM or framework UI can
 * observe {@link ViewerTools#actions} and execute the same commands.
 *
 * @example
 * const tools = new ViewerTools(viewer, {
 *     features: basicViewerFeatures({ snapshot: true })
 * });
 * tools.execute('zoomIn');
 * const light = tools.getFeature('light');
 * light.setDirection(0.4, -0.2);
 */
class ViewerTools {
	/**
	 * Creates the feature facade and installs the requested features.
	 * @param {Viewer} viewer Viewer to extend.
	 * @param {ViewerToolsOptions} [options={}] Feature and keyboard configuration.
	 * @throws {Error} If no viewer is supplied or a feature cannot be installed.
	 */
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

	/**
	 * Subscribes to a feature lifecycle signal. Runtime behavior is supplied by {@link addSignals}.
	 * @param {'featureChange'} event Signal name.
	 * @param {Function} callback Listener callback.
	 * @returns {void}
	 */
	addEvent(event, callback) {
		this.signals?.hasOwnProperty(event) || this.initSignals?.();
		this.signals?.[event]?.push(callback);
	}

	/**
	 * Removes one listener, or every feature listener when callback is omitted.
	 * @param {'featureChange'} event Signal name.
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
	 * Installs a feature and exposes its optional API.
	 * @param {ViewerToolFeature<*>|function(): ViewerToolFeature<*>} feature Feature object or factory.
	 * @returns {*} Feature API, or `null` when none is exposed.
	 * @throws {Error} If the definition is invalid or its identifier is already installed.
	 */
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

	/**
	 * Removes a feature and invokes its cleanup callback.
	 * @param {string} id Feature identifier.
	 * @returns {boolean} `true` when a feature was removed.
	 */
	removeFeature(id) {
		const record = this._features.get(id);
		if (!record) return false;
		record.destroy?.();
		this._features.delete(id);
		this.emit('featureChange', id, false);
		return true;
	}

	/**
	 * Retrieves the public API exposed by an installed feature.
	 * @param {string} id Feature identifier.
	 * @returns {*|null}
	 */
	getFeature(id) {
		return this._features.get(id)?.api ?? null;
	}

	/**
	 * Executes a registered action.
	 * @param {string} id Action identifier.
	 * @param {Event|null} [event=null] Originating DOM event.
	 * @param {*} [data] Optional application payload.
	 * @returns {*} Action result; see {@link ActionRegistry#execute}.
	 */
	execute(id, event = null, data = undefined) {
		return this.actions.execute(id, event, data);
	}

	/**
	 * Removes keyboard listeners and installed features in reverse installation order.
	 * The viewer and application-owned layers are not destroyed.
	 */
	destroy() {
		this.interactions.resume(this._temporaryPanToken);
		this._shortcutTarget?.removeEventListener?.('keydown', this._onKeyDown, false);
		this._shortcutTarget?.removeEventListener?.('keyup', this._onKeyUp, false);
		if (typeof window !== 'undefined') window.removeEventListener('blur', this._onBlur, false);
		for (const id of [...this._features.keys()].reverse()) this.removeFeature(id);
		this.interactions.destroy();
		this.actions.destroy();
	}

	/**
	 * Handles shortcut dispatch and temporary Ctrl+Shift pan restoration.
	 * @param {KeyboardEvent} event
	 * @private
	 */
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

/**
 * Fired after a feature is installed or removed.
 * @event ViewerTools#featureChange
 * @type {Object}
 * @property {string} id Feature identifier.
 * @property {boolean} installed New installation state.
 */

addSignals(ViewerTools, 'featureChange');

export { ViewerTools };
