import { Controller2D } from './Controller2D.js';
import { ControllerPanZoom } from './ControllerPanZoom.js';
import { Ruler } from './Ruler.js';
import { addSignals } from './Signals.js';

/**
 * Toggles or forces an interactive tool state.
 * @callback ToggleToolState
 * @param {boolean} [force] Desired state; omit to toggle.
 * @returns {boolean}
 */

/**
 * @typedef {Object} LightDirection
 * @property {number} x Horizontal component in `[-1, 1]`.
 * @property {number} y Vertical component in `[-1, 1]`.
 */

/**
 * @typedef {Object} NavigationToolsOptions
 * @property {ControllerPanZoom} [controller] Existing controller to reuse.
 * @property {string} [group='primary-pointer-tool'] Interaction group.
 * @property {boolean} [controlZoom=false] Require the configured modifier for wheel zoom.
 * @property {number} [duration=250] Camera animation duration in milliseconds.
 * @property {number} [zoomStep=1.25] Zoom multiplier.
 * @property {number} [rotationStep=-45] Rotation increment in degrees.
 * @property {boolean} [showRotate=false] Initial visibility of the rotate action.
 */

/**
 * @typedef {Object} FullscreenToolOptions
 * @property {HTMLElement} [element] Element entering fullscreen; defaults to the viewer container.
 */

/**
 * @typedef {Object} SnapshotToolOptions
 * @property {string} [mimeType='image/png'] Canvas export MIME type.
 * @property {string} [filename='snapshot.png'] Suggested download filename.
 */

/**
 * @typedef {Object} LayerToolsOptions
 * @property {'exclusive'|'nonExclusive'} [visibilityMode='exclusive'] Base-layer visibility policy.
 * @property {string} [actionPrefix='layer:'] Prefix for generated layer action identifiers.
 * @property {string|SVGElement} [icon='.openlime-layers'] Icon used by generated actions.
 * @property {boolean} [actionsVisible=false] Expose generated layer actions to visual adapters.
 */

/**
 * @typedef {Object} LightToolOptions
 * @property {string} [group='primary-pointer-tool'] Interaction group.
 * @property {number} [priority=0] Pointer controller priority.
 */

/**
 * @typedef {Object} RulerToolOptions
 * @property {number|null} [pixelSize] Physical scale used by the ruler.
 * @property {string} [group='primary-pointer-tool'] Interaction group.
 * @property {Object} [rulerOptions] Options forwarded to {@link Ruler}.
 */

/**
 * @typedef {Object} AnnotationToolsOptions
 * @property {string} [group='primary-pointer-tool'] Interaction group.
 */

/**
 * @typedef {Object} BasicViewerFeaturesOptions
 * @property {NavigationToolsOptions} [navigation]
 * @property {FullscreenToolOptions} [fullscreen]
 * @property {LayerToolsOptions} [layers]
 * @property {LightToolOptions} [light]
 * @property {number|null} [pixelSize] Install the ruler feature when provided.
 * @property {RulerToolOptions} [ruler]
 * @property {ManagerSvgAnnotation} [annotationManager] Install annotation integration for this manager.
 * @property {AnnotationToolsOptions} [annotations]
 * @property {boolean|SnapshotToolOptions} [snapshot=false] Install snapshot support.
 */

/**
 * @typedef {Object} NavigationToolsAPI
 * @property {ControllerPanZoom} panzoom Installed or reused navigation controller.
 */

/**
 * @typedef {Object} FullscreenToolAPI
 * @property {function(): Promise<void>} toggle Toggles fullscreen for the configured element.
 */

/**
 * @typedef {Object} SnapshotToolAPI
 * @property {function(): void} capture Captures and downloads the current canvas.
 */

/**
 * @typedef {Object} LayerToolState
 * @property {string} id Viewer layer identifier.
 * @property {Layer} layer Layer instance.
 * @property {boolean} visible Current visibility.
 */

/**
 * Applies the configured layer visibility policy.
 * @callback SetLayerVisibility
 * @param {string|Layer} layerOrId Layer instance or viewer layer identifier.
 * @returns {boolean}
 */

/**
 * @typedef {Object} LayerToolsAPI
 * @property {SetLayerVisibility} setLayer Applies the configured visibility policy.
 * @property {function(): LayerToolState[]} list Lists current viewer layers.
 */

/**
 * @typedef {Object} LightToolsAPI
 * @property {Controller2D} controller Directional-light pointer controller.
 * @property {LightDirection} direction Current light direction.
 * @property {function(number, number, number=, string=): boolean} setDirection Applies a light direction.
 * @property {ToggleToolState} setActive Toggles or forces light interaction.
 */

/**
 * @typedef {Object} RulerToolsAPI
 * @property {Ruler} ruler Measurement controller.
 * @property {ToggleToolState} setActive Toggles or forces ruler interaction.
 */

/**
 * @typedef {Object} AnnotationToolsAPI
 * @property {ManagerSvgAnnotation} manager Adapted annotation manager.
 * @property {ToggleToolState} setActive Toggles or forces annotation interaction.
 */

/**
 * Public, GUI-independent API exposed by {@link lightTool}.
 * The observable direction is shared by viewer interaction and external controls.
 */
class LightToolAPI {
	/**
	 * @param {function(number, number, number, string): void} applyDirection Applies direction to viewer layers.
	 * @param {function(boolean=): boolean} setActive Changes the coordinated tool state.
	 */
	constructor(applyDirection, setActive) {
		/** @type {LightDirection} */
		this.direction = Object.freeze({ x: 0, y: 0 });
		this._applyDirection = applyDirection;
		this._setActive = setActive;
	}

	/**
	 * Subscribes to light direction changes. Runtime behavior is supplied by {@link addSignals}.
	 * @param {'change'} event Signal name.
	 * @param {function(LightDirection, Object): void} callback Listener callback.
	 * @returns {void}
	 */
	addEvent(event, callback) {
		this.signals?.hasOwnProperty(event) || this.initSignals?.();
		this.signals?.[event]?.push(callback);
	}

	/**
	 * Removes one listener, or every change listener when callback is omitted.
	 * @param {'change'} event Signal name.
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
	 * Sets the light direction and notifies every external view bound to it.
	 * @param {number} x Horizontal component in [-1, 1]
	 * @param {number} y Vertical component in [-1, 1]
	 * @param {number} [duration=0] Animation duration in milliseconds
	 * @param {string} [source='external'] Origin of the change
	 * @returns {boolean} `false` when either component is not finite.
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

	/**
	 * Toggles or forces interactive light control on the viewer.
	 * @param {boolean} [on] Desired state; omit to toggle.
	 * @returns {boolean}
	 */
	setActive(on) {
		return this._setActive(on);
	}
}

/**
 * Fired whenever light direction changes from either the viewer or an external control.
 * @event LightToolAPI#change
 * @type {Object}
 * @property {LightDirection} direction New direction.
 * @property {Object} details Change metadata.
 * @property {string} details.source Change origin.
 * @property {LightToolAPI} details.api Emitting API instance.
 */

addSignals(LightToolAPI, 'change');

/**
 * Creates navigation commands and a coordinated pan/zoom fallback tool.
 * @param {NavigationToolsOptions} [options={}]
 * @returns {ViewerToolFeature<NavigationToolsAPI>}
 */
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

/**
 * Creates a fullscreen action synchronized with browser fullscreen state.
 * @param {FullscreenToolOptions} [options={}]
 * @returns {ViewerToolFeature<FullscreenToolAPI>}
 */
function fullscreenTool(options = {}) {
	return {
		id: 'fullscreen',
		install({ viewer, actions }) {
			const element = options.element ?? viewer.containerElement;
			const sync = () => {
				const active = document.fullscreenElement === element;
				element.classList.toggle('openlime-fullscreen-active', active);
				actions.update('fullscreen', { active });
			};
			const toggle = async () => {
				if (document.fullscreenElement === element) await document.exitFullscreen();
				else await element.requestFullscreen();
			};
			const unregister = actions.register({
				id: 'fullscreen', title: 'Fullscreen', icon: '.openlime-fullscreen', shortcut: 'f', order: 50,
				execute: toggle
			});
			document.addEventListener('fullscreenchange', sync);
			return {
				api: { toggle },
				destroy() { document.removeEventListener('fullscreenchange', sync); unregister(); }
			};
		}
	};
}

/**
 * Creates a canvas snapshot action and capture API.
 * The viewer canvas must be readable (for WebGL this commonly requires
 * `preserveDrawingBuffer: true` and non-tainted image sources).
 * @param {SnapshotToolOptions} [options={}]
 * @returns {ViewerToolFeature<SnapshotToolAPI>}
 */
function snapshotTool(options = {}) {
	return {
		id: 'snapshot',
		install({ viewer, actions }) {
			const capture = () => {
				const link = document.createElement('a');
				link.href = viewer.canvasElement.toDataURL(options.mimeType ?? 'image/png');
				link.download = options.filename ?? 'snapshot.png';
				link.click();
			};
			const unregister = actions.register({
				id: 'snapshot', title: 'Snapshot', icon: '.openlime-snapshot', order: 90,
				execute: capture
			});
			return { api: { capture }, destroy: unregister };
		}
	};
}

/**
 * Creates dynamic actions and a public API for viewer layer visibility.
 * Layers added or removed after installation are tracked automatically.
 * @param {LayerToolsOptions} [options={}]
 * @returns {ViewerToolFeature<LayerToolsAPI>}
 */
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

/**
 * Creates directional-light interaction for every light-capable viewer layer.
 * @param {LightToolOptions} [options={}]
 * @returns {ViewerToolFeature<LightToolsAPI>}
 */
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

/**
 * Creates the measurement ruler and registers it as an exclusive pointer tool.
 * @param {RulerToolOptions} [options={}]
 * @returns {ViewerToolFeature<RulerToolsAPI>}
 */
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

/**
 * Adapts a {@link ManagerSvgAnnotation} to the common action and interaction APIs.
 * @param {ManagerSvgAnnotation} manager Annotation manager owned by the application.
 * @param {AnnotationToolsOptions} [options={}]
 * @returns {ViewerToolFeature<AnnotationToolsAPI>}
 */
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

/**
 * Builds the standard feature set used by simple viewers and external GUIs.
 * Navigation, fullscreen, layers, and light are always included. Ruler,
 * annotations, and snapshots are opt-in.
 * @param {BasicViewerFeaturesOptions} [options={}]
 * @returns {Array.<ViewerToolFeature.<*>>}
 *
 * @example
 * const tools = new ViewerTools(viewer, {
 *     features: basicViewerFeatures({
 *         layers: { visibilityMode: 'exclusive' },
 *         annotationManager,
 *         snapshot: true
 *     })
 * });
 */
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
