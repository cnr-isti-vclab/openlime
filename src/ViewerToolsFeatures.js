import { Controller2D } from './Controller2D.js';
import { ControllerPanZoom } from './ControllerPanZoom.js';
import { Ruler } from './Ruler.js';
import { addSignals } from './Signals.js';

/** Public, GUI-independent API exposed by the light feature. */
class LightToolAPI {
	constructor(applyDirection, setActive) {
		this.direction = Object.freeze({ x: 0, y: 0 });
		this._applyDirection = applyDirection;
		this._setActive = setActive;
	}

	/**
	 * Sets the light direction and notifies every external view bound to it.
	 * @param {number} x Horizontal component in [-1, 1]
	 * @param {number} y Vertical component in [-1, 1]
	 * @param {number} [duration=0] Animation duration in milliseconds
	 * @param {string} [source='external'] Origin of the change
	 */
	setDirection(x, y, duration = 0, source = 'external') {
		x = Math.max(-1, Math.min(1, Number(x)));
		y = Math.max(-1, Math.min(1, Number(y)));
		if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
		this.direction = Object.freeze({ x, y });
		this._applyDirection(x, y, duration, source);
		this.emit('change', this.direction, { source, api: this });
		return true;
	}

	setActive(on) {
		return this._setActive(on);
	}
}

addSignals(LightToolAPI, 'change');

function navigationTools(options = {}) {
	return {
		id: 'navigation',
		install({ viewer, actions, interactions }) {
			const previousPanzoom = viewer.panzoom;
			const panzoom = options.controller ?? previousPanzoom ?? new ControllerPanZoom(viewer.camera, {
				priority: -1000,
				activeModifiers: [0, 1],
				controlZoom: options.controlZoom ?? false
			});
			const ownsController = !viewer.controllers.includes(panzoom);
			if (ownsController) viewer.addController(panzoom);
			viewer.panzoom = panzoom;

			const group = options.group ?? 'primary-pointer-tool';
			const unregisterTool = interactions.register({
				id: 'navigation',
				group,
				fallback: true,
				initiallyActive: interactions.activeInGroup(group) == null,
				activate: () => { panzoom.active = true; },
				deactivate: () => { panzoom.active = false; }
			});
			const unregisterActions = [
				actions.register({ id: 'home', title: 'Home', icon: '.openlime-home', shortcut: 'Home', order: 10,
					execute: () => { if (viewer.camera.boundingBox) viewer.camera.fitCameraBox(options.duration ?? 250); } }),
				actions.register({ id: 'zoomIn', title: 'Zoom in', icon: '.openlime-zoomin', shortcut: '+', order: 20,
					execute: () => viewer.camera.deltaZoom(options.duration ?? 250, options.zoomStep ?? 1.25, 0, 0) }),
				actions.register({ id: 'zoomOut', title: 'Zoom out', icon: '.openlime-zoomout', shortcut: '-', order: 30,
					execute: () => viewer.camera.deltaZoom(options.duration ?? 250, 1 / (options.zoomStep ?? 1.25), 0, 0) }),
				actions.register({ id: 'rotate', title: 'Rotate', icon: '.openlime-rotate', shortcut: 'r', order: 40,
					visible: options.showRotate ?? false,
					execute: () => viewer.camera.rotate(options.duration ?? 250, options.rotationStep ?? -45) })
			];

			return {
				api: { panzoom },
				destroy() {
					for (const unregister of unregisterActions) unregister();
					unregisterTool();
					if (ownsController) viewer.removeController(panzoom);
					if (viewer.panzoom === panzoom) viewer.panzoom = previousPanzoom ?? null;
				}
			};
		}
	};
}

function fullscreenTool(options = {}) {
	return {
		id: 'fullscreen',
		install({ viewer, actions }) {
			const element = options.element ?? viewer.containerElement;
			const sync = () => actions.update('fullscreen', {
				active: document.fullscreenElement === element
			});
			const unregister = actions.register({
				id: 'fullscreen', title: 'Fullscreen', icon: '.openlime-fullscreen', shortcut: 'f', order: 50,
				execute: async () => {
					if (document.fullscreenElement === element) await document.exitFullscreen();
					else await element.requestFullscreen();
				}
			});
			document.addEventListener('fullscreenchange', sync);
			return { destroy() { document.removeEventListener('fullscreenchange', sync); unregister(); } };
		}
	};
}

function snapshotTool(options = {}) {
	return {
		id: 'snapshot',
		install({ viewer, actions }) {
			const unregister = actions.register({
				id: 'snapshot', title: 'Snapshot', icon: '.openlime-snapshot', order: 90,
				execute: () => {
					const link = document.createElement('a');
					link.href = viewer.canvasElement.toDataURL(options.mimeType ?? 'image/png');
					link.download = options.filename ?? 'snapshot.png';
					link.click();
				}
			});
			return { destroy: unregister };
		}
	};
}

function layerTools(options = {}) {
	return {
		id: 'layers',
		install({ viewer, actions }) {
			const actionPrefix = options.actionPrefix ?? 'layer:';
			const entries = new Map();

			const setLayer = layerOrId => {
				const layer = typeof layerOrId === 'string' ? viewer.canvas.layers[layerOrId] : layerOrId;
				if (!layer) return false;
				if ((options.visibilityMode ?? 'exclusive') === 'nonExclusive' || layer.overlay) {
					layer.setVisible(!layer.visible);
				} else {
					for (const candidate of Object.values(viewer.canvas.layers))
						if (!candidate.overlay) candidate.setVisible(candidate === layer);
				}
				syncAll();
				viewer.redraw();
				return true;
			};

			const addLayer = (id, layer) => {
				removeLayer(id);
				const actionId = `${actionPrefix}${id}`;
				const sync = () => {
					const current = actions.get(actionId);
					if (current && current.active !== !!layer.visible)
						actions.update(actionId, { active: !!layer.visible });
				};
				const unregister = actions.register({
					id: actionId,
					title: layer.label || id,
					icon: options.icon ?? '.openlime-layers',
					active: !!layer.visible,
					visible: options.actionsVisible ?? false,
					order: 200,
					metadata: { layerId: id },
					execute: () => setLayer(layer)
				});
				layer.addEvent?.('update', sync);
				entries.set(id, { layer, sync, unregister });
			};
			const removeLayer = id => {
				const entry = entries.get(id);
				if (!entry) return;
				entry.layer.removeEvent?.('update', entry.sync);
				entry.unregister();
				entries.delete(id);
			};
			const syncAll = () => { for (const entry of entries.values()) entry.sync(); };
			const onAdded = (id, layer) => addLayer(id, layer);
			const onRemoved = id => removeLayer(id);
			viewer.addEvent('layerAdded', onAdded);
			viewer.addEvent('layerRemoved', onRemoved);
			for (const [id, layer] of Object.entries(viewer.canvas.layers)) addLayer(id, layer);

			return {
				api: {
					setLayer,
					list: () => Object.entries(viewer.canvas.layers).map(([id, layer]) => ({ id, layer, visible: !!layer.visible }))
				},
				destroy() {
					viewer.removeEvent('layerAdded', onAdded);
					viewer.removeEvent('layerRemoved', onRemoved);
					for (const id of [...entries.keys()]) removeLayer(id);
				}
			};
		}
	};
}

function lightTool(options = {}) {
	return {
		id: 'light',
		install({ viewer, actions, interactions }) {
			const lightLayers = () => Object.values(viewer.canvas.layers).filter(layer => layer.controls?.light);
			let controller = null;
			const api = new LightToolAPI(
				(x, y, duration, source) => {
					if (controller && source !== 'viewer') {
						controller.current_x = x;
						controller.current_y = y;
					}
					for (const layer of lightLayers()) layer.setLight([x, y], duration);
				},
				on => interactions.toggle('light', on)
			);
			controller = new Controller2D(
				(x, y) => api.setDirection(x, y, 0, 'viewer'), {
				active: false,
				activeModifiers: [0, 2, 4],
				control: 'light',
				relative: true
			});
			controller.priority = options.priority ?? 0;
			viewer.addController(controller);

			const attach = layer => {
				if (layer.controls?.light && !layer.controllers.includes(controller))
					layer.controllers.push(controller);
			};
			const detach = layer => {
				const index = layer?.controllers?.indexOf(controller) ?? -1;
				if (index >= 0) layer.controllers.splice(index, 1);
			};
			for (const layer of Object.values(viewer.canvas.layers)) attach(layer);

			const handle = {
				setActive: on => interactions.toggle('light', on),
				onLayerAdded: attach
			};
			const syncEnabled = () => actions.update('light', { enabled: lightLayers().length > 0 });
			const onAdded = (_id, layer) => { attach(layer); syncEnabled(); };
			const onRemoved = (_id, layer) => { detach(layer); syncEnabled(); };
			viewer.addEvent('layerAdded', onAdded);
			viewer.addEvent('layerRemoved', onRemoved);

			const unregisterTool = interactions.register({
				id: 'light', group: options.group ?? 'primary-pointer-tool',
				activate() {
					controller.active = true;
					viewer.containerElement.classList.add('openlime-light-active');
					actions.update('light', { active: true });
					viewer.setActiveLightController(handle);
				},
				deactivate() {
					controller.active = false;
					viewer.containerElement.classList.remove('openlime-light-active');
					actions.update('light', { active: false });
					viewer.clearActiveLightController(handle);
				},
				suspend: () => { controller.active = false; },
				resume: () => { controller.active = true; }
			});
			const unregisterAction = actions.register({
				id: 'light', title: 'Light', icon: '.openlime-light', shortcut: 'l', order: 60,
				enabled: lightLayers().length > 0,
				execute: () => interactions.toggle('light')
			});

			return {
				api: Object.assign(api, { controller }),
				destroy() {
					viewer.removeEvent('layerAdded', onAdded);
					viewer.removeEvent('layerRemoved', onRemoved);
					unregisterAction();
					unregisterTool();
					for (const layer of Object.values(viewer.canvas.layers)) detach(layer);
					viewer.removeController(controller);
				}
			};
		}
	};
}

function rulerTool(options = {}) {
	return {
		id: 'ruler',
		install({ viewer, actions, interactions }) {
			const ruler = new Ruler(viewer, options.pixelSize, options.rulerOptions);
			viewer.addController(ruler);
			const unregisterTool = interactions.register({
				id: 'ruler', group: options.group ?? 'primary-pointer-tool',
				activate: () => { ruler.start(); actions.update('ruler', { active: true }); },
				deactivate: () => { ruler.end(); actions.update('ruler', { active: false }); },
				suspend: () => {
					ruler.enabled = false;
					ruler.overlay.style.cursor = ruler.previousCursor;
				},
				resume: () => {
					ruler.enabled = true;
					ruler.previousCursor = ruler.overlay.style.cursor;
					ruler.overlay.style.cursor = ruler.cursor;
				}
			});
			const unregisterAction = actions.register({
				id: 'ruler', title: 'Ruler', icon: '.openlime-ruler', order: 70,
				enabled: options.pixelSize != null,
				execute: () => interactions.toggle('ruler')
			});
			return {
				api: { ruler, setActive: on => interactions.toggle('ruler', on) },
				destroy() {
					unregisterAction(); unregisterTool();
					viewer.removeController(ruler); ruler.destroy?.();
				}
			};
		}
	};
}

function annotationTools(manager, options = {}) {
	return {
		id: 'annotations',
		install({ actions, interactions }) {
			if (!manager) throw new Error('annotationTools: missing ManagerSvgAnnotation instance');
			const unregisterTool = interactions.register({
				id: 'annotations', group: options.group ?? 'primary-pointer-tool',
				activate: () => { if (!manager.active) manager.toggle(true); actions.update('annotations', { active: true }); },
				deactivate: () => { if (manager.active) manager.toggle(false); actions.update('annotations', { active: false }); },
				suspend: () => manager.setInteractionSuspended?.(true),
				resume: () => manager.setInteractionSuspended?.(false)
			});
			const onModeChange = mode => {
				if (mode === 'idle') interactions.deactivate('annotations');
				else interactions.activate('annotations');
				actions.update('annotations', { active: mode !== 'idle' });
			};
			manager.addEvent('modeChange', onModeChange);
			const unregisterAction = actions.register({
				id: 'annotations', title: 'Annotations', icon: '.openlime-pencil', shortcut: 'p', order: 80,
				execute: () => interactions.toggle('annotations')
			});
			if (manager.mode !== 'idle') interactions.activate('annotations');

			return {
				api: { manager, setActive: on => interactions.toggle('annotations', on) },
				destroy() {
					manager.removeEvent('modeChange', onModeChange);
					unregisterAction(); unregisterTool();
				}
			};
		}
	};
}

function basicViewerFeatures(options = {}) {
	const features = [
		navigationTools(options.navigation),
		fullscreenTool(options.fullscreen),
		layerTools(options.layers),
		lightTool(options.light)
	];
	if (options.pixelSize != null) features.push(rulerTool({ ...options.ruler, pixelSize: options.pixelSize }));
	if (options.annotationManager) features.push(annotationTools(options.annotationManager, options.annotations));
	if (options.snapshot) features.push(snapshotTool(options.snapshot === true ? {} : options.snapshot));
	return features;
}

export {
	navigationTools,
	fullscreenTool,
	snapshotTool,
	layerTools,
	lightTool,
	rulerTool,
	annotationTools,
	basicViewerFeatures,
	LightToolAPI
};
