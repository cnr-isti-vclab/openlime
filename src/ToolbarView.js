import { Skin } from './Skin.js';
import { Util } from './Util.js';

/**
 * Decides whether an action belongs in a toolbar.
 * @callback ToolbarActionFilter
 * @param {ActionState} action
 * @returns {boolean}
 */

/**
 * @typedef {Object} ToolbarViewOptions
 * @property {HTMLElement|string} container Element or selector receiving the toolbar.
 * @property {string[]|ToolbarActionFilter|null} [actions=null] Action allow-list or filter callback.
 * @property {string} [className=''] Additional class applied to the toolbar element.
 * @property {boolean} [tooltips=true] Add native `title` tooltips to buttons.
 * @property {boolean} [external=true] Use static external-toolbar positioning instead of the legacy viewer overlay.
 */

/**
 * Optional DOM adapter for {@link ActionRegistry}. The mount container may live
 * anywhere in the document, including outside the {@link Viewer} element.
 * State changes are reflected automatically; applications may omit this class and
 * bind their own HTML, React, Vue, or other framework components to the registry.
 *
 * @example
 * const toolbar = new ToolbarView(tools, {
 *     container: '#viewer-toolbar',
 *     actions: ['home', 'zoomIn', 'zoomOut', 'light']
 * });
 * await toolbar.ready;
 */
class ToolbarView {
	/**
	 * Creates and immediately mounts a toolbar.
	 * @param {ViewerTools} tools Headless viewer tools instance.
	 * @param {ToolbarViewOptions} [options={}] Rendering and mount options.
	 * @throws {Error} If `tools` or the mount container is missing.
	 */
	constructor(tools, options = {}) {
		if (!tools?.actions) throw new Error('ToolbarView: missing ViewerTools instance');
		const container = typeof options.container === 'string'
			? document.querySelector(options.container)
			: options.container;
		if (!container) throw new Error('ToolbarView: missing container');

		this.tools = tools;
		this.options = {
			actions: null,
			className: '',
			tooltips: true,
			external: true,
			...options
		};
		this.element = document.createElement('div');
		this.element.className = [
			'openlime-toolbar',
			this.options.external ? 'openlime-toolbar-external' : '',
			this.options.className
		].filter(Boolean).join(' ');
		this.element.setAttribute('role', 'toolbar');
		container.appendChild(this.element);
		this._renderVersion = 0;
		this._buttons = new Map();
		this._onActionChange = (action, change) => {
			if (change === 'update' && this._buttons.has(action.id) && this._shouldShow(action)) {
				this._syncButton(this._buttons.get(action.id), action);
				return;
			}
			this.ready = this.render();
		};
		this.tools.actions.addEvent('change', this._onActionChange);
		this.ready = this.render();
	}

	/**
	 * Rebuilds visible buttons from current registry state.
	 * A render superseded by a newer registry change exits without mutating the DOM.
	 * @returns {Promise<void>}
	 */
	async render() {
		const version = ++this._renderVersion;
		const actions = this.tools.actions.list({ visibleOnly: true })
			.filter(action => this._shouldShow(action));
		const fragment = document.createDocumentFragment();
		const buttons = new Map();

		for (const action of actions) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `openlime-toolbar-action openlime-action-${action.id}`;
			button.dataset.action = action.id;
			this._syncButton(button, action);

			try {
				const icon = await this._resolveIcon(action.icon);
				if (version !== this._renderVersion) return;
				const svg = await Skin.appendIcon(button, icon);
				const classId = action.metadata?.legacyName ?? action.id;
				svg.classList.add('openlime-button', `openlime-${classId}`);
				svg.classList.toggle(`openlime-${classId}-active`, !!action.active);
			} catch (_error) {
				const fallback = document.createElement('span');
				fallback.className = 'openlime-toolbar-label';
				fallback.textContent = action.title;
				button.appendChild(fallback);
			}

			button.addEventListener('click', event => this.tools.execute(action.id, event));
			fragment.appendChild(button);
			buttons.set(action.id, button);
		}

		if (version !== this._renderVersion) return;
		this.element.replaceChildren(fragment);
		this._buttons = buttons;
	}

	/**
	 * Tests registry visibility and the optional toolbar-specific filter.
	 * @param {ActionState} action
	 * @returns {boolean}
	 * @private
	 */
	_shouldShow(action) {
		if (!action.visible) return false;
		const allowed = this.options.actions;
		if (!allowed) return true;
		if (typeof allowed === 'function') return allowed(action);
		return allowed.includes(action.id);
	}

	/**
	 * Synchronizes an existing button without replacing its SVG element.
	 * @param {HTMLButtonElement} button
	 * @param {ActionState} action
	 * @private
	 */
	_syncButton(button, action) {
		button.disabled = !action.enabled;
		button.setAttribute('aria-label', action.title);
		button.setAttribute('aria-pressed', String(!!action.active));
		button.classList.toggle('active', !!action.active);
		if (this.options.tooltips) button.title = action.title;
		const svg = button.querySelector('svg');
		if (svg) {
			const classId = action.metadata?.legacyName ?? action.id;
			svg.classList.toggle(`openlime-${classId}-active`, !!action.active);
		}
	}

	/**
	 * Resolves the icon forms accepted by {@link ActionDefinition#icon}.
	 * @param {string|SVGElement} icon Skin selector, SVG markup, URL, or SVG node.
	 * @returns {Promise<string|SVGElement>}
	 * @private
	 */
	async _resolveIcon(icon) {
		if (typeof icon !== 'string') return icon.cloneNode(true);
		if (Util.isSVGString(icon)) return Util.SVGFromString(icon);
		if (icon.startsWith('.') || icon.startsWith('#')) return icon;
		return Util.loadSVG(icon);
	}

	/** Removes registry listeners and the toolbar DOM element. */
	destroy() {
		this._renderVersion++;
		this.tools.actions.removeEvent('change', this._onActionChange);
		this.element.remove();
		this._buttons.clear();
	}
}

export { ToolbarView };
