import { Skin } from './Skin.js';
import { Util } from './Util.js';

/**
 * Optional DOM adapter for ActionRegistry. The mount container may live
 * anywhere in the document, including outside the Viewer element.
 */
class ToolbarView {
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
			...options
		};
		this.element = document.createElement('div');
		this.element.className = `openlime-toolbar openlime-toolbar-external ${this.options.className}`.trim();
		this.element.setAttribute('role', 'toolbar');
		container.appendChild(this.element);
		this._renderVersion = 0;
		this._onActionChange = () => { this.ready = this.render(); };
		this.tools.actions.addEvent('change', this._onActionChange);
		this.ready = this.render();
	}

	async render() {
		const version = ++this._renderVersion;
		const allowed = this.options.actions;
		const actions = this.tools.actions.list({ visibleOnly: true }).filter(action => {
			if (!allowed) return true;
			if (typeof allowed === 'function') return allowed(action);
			return allowed.includes(action.id);
		});
		const fragment = document.createDocumentFragment();

		for (const action of actions) {
			const button = document.createElement('button');
			button.type = 'button';
			button.className = `openlime-toolbar-action openlime-action-${action.id}`;
			button.dataset.action = action.id;
			button.disabled = !action.enabled;
			button.setAttribute('aria-label', action.title);
			button.setAttribute('aria-pressed', String(!!action.active));
			button.classList.toggle('active', !!action.active);
			if (this.options.tooltips) button.title = action.title;

			try {
				const icon = await this._resolveIcon(action.icon);
				if (version !== this._renderVersion) return;
				const svg = await Skin.appendIcon(button, icon);
				svg.classList.add('openlime-button', `openlime-${action.id}`);
				svg.classList.toggle(`openlime-${action.id}-active`, !!action.active);
			} catch (_error) {
				const fallback = document.createElement('span');
				fallback.className = 'openlime-toolbar-label';
				fallback.textContent = action.title;
				button.appendChild(fallback);
			}

			button.addEventListener('click', event => this.tools.execute(action.id, event));
			fragment.appendChild(button);
		}

		if (version !== this._renderVersion) return;
		this.element.replaceChildren(fragment);
	}

	async _resolveIcon(icon) {
		if (typeof icon !== 'string') return icon.cloneNode(true);
		if (Util.isSVGString(icon)) return Util.SVGFromString(icon);
		if (icon.startsWith('.') || icon.startsWith('#')) return icon;
		return Util.loadSVG(icon);
	}

	destroy() {
		this._renderVersion++;
		this.tools.actions.removeEvent('change', this._onActionChange);
		this.element.remove();
	}
}

export { ToolbarView };
