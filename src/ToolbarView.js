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

	_shouldShow(action) {
		if (!action.visible) return false;
		const allowed = this.options.actions;
		if (!allowed) return true;
		if (typeof allowed === 'function') return allowed(action);
		return allowed.includes(action.id);
	}

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
		this._buttons.clear();
	}
}

export { ToolbarView };
