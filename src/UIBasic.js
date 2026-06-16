import { Skin } from './Skin'
import { Util } from './Util'
import { Controller2D } from './Controller2D'
import { ControllerBearing } from './ControllerBearing'
import { ControllerPanZoom } from './ControllerPanZoom'
import { Ruler } from "./Ruler"
import { ScaleBar } from './ScaleBar'
import { addSignals } from './Signals'
import { Minimap } from './Minimap'
import { LayerSvgAnnotation } from './LayerSvgAnnotation'

/**
 * @typedef {Object} UIAction
 * @property {string} title - Display title for the action
 * @property {boolean} display - Whether to show in toolbar
 * @property {string} key - Keyboard shortcut key
 * @property {Function} task - Callback function for action
 * @property {string} icon - Custom SVG icon path or content
 * @property {string} html - HTML content for help dialog
 */

/**
 * @typedef {Object<string, UIAction>} UIActions
 * Collection of named actions used in the toolbar and UI.
 */

/**
 * @typedef {Object} UIBasicOptions
 * @property {UIActions} [actions] - Configurable UI actions collection
 * @property {Object} [menu] - Menu configuration object
 * @property {number} [pixelSize] - Pixel size for scale bar
 * @property {string} [attribution] - Attribution HTML string
 * @property {boolean} [autoFit] - Automatically fit camera on start
 * // Aggiungere qui altre proprietà note di configurazione
 */

/**
 * @class UIBasic
 * @param {Viewer} viewer - Parent viewer instance
 * @param {UIBasicOptions} [options] - UI configuration options
 */

/**
 * 
 * UIBasic implements a complete user interface for OpenLIME viewers.
 * Provides toolbar controls, layer management, and interactive features.
 * 
 * Core Features:
 * - Customizable toolbar
 * - Layer management
 * - Light direction control
 * - Camera controls
 * - Keyboard shortcuts
 * - Scale bar
 * - Measurement tools
 * - Minimap overlay
 * 
 * Built-in Actions:
 * - home: Reset camera view
 * - fullscreen: Toggle fullscreen mode
 * - layers: Show/hide layer menu
 * - zoomin/zoomout: Camera zoom controls
 * - rotate: Rotate view
 * - light: Light direction control
 * - ruler: Distance measurement
 * - help: Show help dialog
 * - snapshot: Save view as image
 * - settings: Emit UI settings event
 *
 * Implementation Details
 * 
 * Layer Management:
 * - Layers can be toggled individually
 * - Layer visibility affects associated controllers
 * - Overlay layers behave independently
 * - Layer state is reflected in menu UI
 * 
 * Mouse/Touch Interaction:
 * - Uses PointerManager for event handling
 * - Supports multi-touch gestures
 * - Handles drag operations for light control
 * - Manages tool state transitions
 * 
 * Menu System:
 * - Hierarchical structure
 * - Dynamic updates based on state
 * - Group-based selection
 * - Mode-specific entries
 * 
 * Controller Integration:
 * - Light direction controller
 * - Pan/zoom controller
 * - Measurement controller
 * - Priority-based event handling
 * 
 * Dialog System:
 * - Modal blocking of underlying UI
 * - Non-modal floating windows
 * - Content injection system
 * - Event-based communication
 * 
 * Skin System:
 * - SVG-based icons
 * - Dynamic loading
 * - CSS customization
 * - Responsive layout
 * 
 * Keyboard Support:
 * - Configurable shortcuts
 * - Action mapping
 * - Mode-specific keys
 * - Focus handling
 * 
 * See the complete example in: {@link https://github.com/cnr-isti-vclab/openlime/tree/main/dist/examples/ui-custom|GitHub ui-custom example}
 */
class UIBasic {
	/** @type {UIActions} */
	actions;

	/**
	 * Creates a new UIBasic instance
	 * @param {Viewer} viewer - OpenLIME viewer instance
	 * @param {UIBasic~Options} [options] - Configuration options
	 * @param {ManagerSvgAnnotation} [options.annotationManager=null]
	 *   Optional {@link ManagerSvgAnnotation} instance. When set, the 'pencil' action
	 *   toggles annotation-creation mode by calling `annotationManager.toggle()`.
	 * @param {'exclusive'|'nonExclusive'|'radio'|'toggle'} [options.layerVisibilityMode='exclusive']
	 *   Layer visibility policy for non-overlay layers:
	 *   - `'exclusive'` (preferred, legacy alias: `'radio'`): selecting one base layer hides the others.
	 *   - `'nonExclusive'` (preferred, legacy alias: `'toggle'`): each layer button toggles its own visibility independently.
	 *
	 * @fires UIBasic#lightdirection
	 *
	 * @example
	 * ```javascript
	 * const manager = new ManagerSvgAnnotation(viewer, {
	 *     onCreate: (anno) => console.log('created', anno),
	 * });
	 * const ui = new UIBasic(viewer, {
	 *     // Enable specific actions
	 *     actions: {
	 *         light: { display: true },
	 *         zoomin: { display: true },
	 *         layers: { display: true },
	 *         pencil: { display: true }
	 *     },
	 *     // Add measurement support
	 *     pixelSize: 0.1,
	 *     scaleBarOptions: {
	 *         position: 'bottom-right',
	 *         offsetX: 16,
	 *         offsetY: 16
	 *     },
	 *     // Add attribution
	 *     attribution: "© Example Source",
	 *     // Annotation manager (shows pencil toggle button)
	 *     annotationManager: manager,
	 *     // Minimap configuration
	 *     minimapOptions: {
	 *         position: 'top-right',
	 *         width: 150,
	 *         height: 100,
	 *         layer: {
	 *             layout: 'deepzoom',
	 *             type: 'rti',
	 *             url: 'assets/rti/hsh/info.json'
	 *         }
	 *     }
	 * });
	 * ```
	 */
	constructor(viewer, options) {
		//we need to know the size of the scene but the layers are not ready.
		let camera = viewer.camera;
		Object.assign(this, {
			viewer: viewer,
			camera: viewer.camera,
			skin: Skin.url || 'skin/skin.svg',
			autoFit: true, //FIXME to be moved in the viewer?
			//skinCSS: 'skin.css', // TODO: probably not useful
			actions: {
				home: { title: 'Home', display: true, key: 'Home', task: (event) => { if (camera.boundingBox) camera.fitCameraBox(250); } },
				fullscreen: { title: 'Fullscreen', display: true, key: 'f', task: (event) => { this.toggleFullscreen(); } },
				layers: { title: 'Layers', display: true, task: (event) => { this.toggleLayers(); } },
				zoomin: { title: 'Zoom in', display: false, key: '+', task: (event) => { camera.deltaZoom(250, 1.25, 0, 0); } },
				zoomout: { title: 'Zoom out', display: false, key: '-', task: (event) => { camera.deltaZoom(250, 1 / 1.25, 0, 0); } },
				rotate: { title: 'Rotate', display: false, key: 'r', task: (event) => { camera.rotate(250, -45); } },
				bearing: { title: 'Bearing', display: false, key: 'b', task: (event) => { this.toggleBearingController(); } },
				light: { title: 'Light', display: 'auto', key: 'l', task: (event) => { this.toggleLightController(); } },
				ruler: { title: 'Ruler', display: false, task: (event) => { this.toggleRuler(); } },
				info: { title: 'Annotation info', display: false, key: 'i', task: (event) => { this.toggleAnnotationInfo(undefined, event); } },
				help: { title: 'Help', display: false, key: '?', task: (event) => { this.toggleHelp(this.actions.help); }, html: '<p>Help here!</p>' }, //FIXME Why a boolean in toggleHelp?
				snapshot: { title: 'Snapshot', display: false, task: (event) => { this.snapshot() } }, //FIXME not work!
				pencil: { title: 'Pencil', display: false, key: 'p', task: (event) => { this.toggleAnnotations(); } },
				settings: {
					title: 'Settings',
					display: false,
					key: 's',
					task: (event) => {
						this.emit('settings', {
							event,
							viewer: this.viewer,
							ui: this,
							openlime: this.viewer
						});
					}
				},
			},
			postInit: () => { },
			showScale: true,
			pixelSize: null,
			scaleBarOptions: null,
			unit: null,
			attribution: null,     //image attribution
			lightcontroller: null,
			showLightDirections: false,
			enableTooltip: true,
			controlZoomMessage: null, //"Use Ctrl + Wheel to zoom instead of scrolling" ,
			menu: [],
			minimap: null,
			minimapOptions: null,
			annotationManager: null,
			layerVisibilityMode: 'exclusive',
			lensLayer: null,
			_annotationInfoActive: false,
			_pencilControllersLocked: false,
			_savedControllerStates: null,
			_savedPanzoomActive: true,
			_restoreLightActiveAfterPencil: false,
			_temporaryPanOverrideActive: false,
			_savedPanzoomModifiers: null,
			_restoreLightActiveAfterTemporaryPan: false,
			_temporaryPanOverrideSavedPanzoomActive: null,
			_temporaryPanOverrideSavedPanzoomModifiers: null
		});

		Object.assign(this, options);
		if (this.layerVisibilityMode === 'toggle') this.layerVisibilityMode = 'nonExclusive';
		if (this.layerVisibilityMode === 'radio') this.layerVisibilityMode = 'exclusive';
		this.layerVisibilityMode = (this.layerVisibilityMode === 'nonExclusive') ? 'nonExclusive' : 'exclusive';
		this.viewer.ui = this;

		if (this.viewer.activeLightController && this.viewer.activeLightController !== this && this.actions.light) {
			this.actions.light.display = false;
			this.actions.light.active = false;
		}

		// Keep the pencil toolbar button in sync with ManagerSvgAnnotation mode changes.
		// This also fires the pencilEnabled / pencilDisabled signals so that listeners
		// in index.html (e.g. annotation color reset) are notified when the manager's
		// mode is changed programmatically (e.g. via an Edit button).
		if (this.annotationManager?.addEvent) {
			this.annotationManager.addEvent('modeChange', (mode) => {
				const pencilButton = this.viewer.containerElement
					.querySelector('.openlime-button.openlime-pencil');
				if (pencilButton)
					pencilButton.classList.toggle('openlime-pencil-active', mode !== 'idle');
				this._setControllersForPencil(mode !== 'idle');
				if (mode === 'idle') this.emit('pencilDisabled');
				else if (this.annotationManager?.active) this.emit('pencilEnabled');
			});
			this.annotationManager.addEvent('annotationSelectionChange', (payload) => {
				if (!this._annotationInfoActive) return;
				this.emit('annotationInfo', payload);
			});
		}

		if (this.autoFit) //FIXME Check if fitCamera is triggered only if the layer is loaded. Is updateSize the right event?
			this.viewer.canvas.addEvent('updateSize', () => this.viewer.camera.fitCameraBox(0));

		this.panzoom = new ControllerPanZoom(this.viewer.camera, {
			priority: -1000,
			activeModifiers: [0, 1],
			controlZoom: this.controlZoomMessage != null
		});
		if (this.controlZoomMessage)
			this.panzoom.addEvent('nowheel', () => { this.showOverlayMessage(this.controlZoomMessage); });
		this.viewer.addController(this.panzoom);
		//this.viewer.pointerManager.onEvent(this.panzoom); //register wheel, doubleclick, pan and pinch
		// this.viewer.pointerManager.on("fingerSingleTap", { "fingerSingleTap": (e) => { this.showInfo(e); }, priority: 10000 });

		/*let element = entry.element;
		let group = element.getAttribute('data-group');
		let layer = element.getAttribute('data-layer');
		let mode = element.getAttribute('data-mode');
		let active = (layer && this.viewer.canvas.layers[layer].visible) &&
			(!mode || this.viewer.canvas.layers[layer].getMode() == mode);
		entry.element.classList.toggle('active', active); */

		this.menu.push({ section: "Layers" });

		for (let [id, layer] of Object.entries(this.viewer.canvas.layers)) {
			// Skip the LensLayer instance: it is controlled via lens buttons, not shown as a regular entry
			if (this.lensLayer && layer === this.lensLayer) continue;

			let modes = []
			for (let m of layer.getModes()) {
				let mode = {
					button: m,
					mode: m,
					layer: id,
					onclick: () => {
						const l = this.viewer.canvas.layers[id];
						if (l) {
							l.setMode(m);
							this.updateMenu();
							this.viewer.redraw();
						}
					},
					status: () => { const l = this.viewer.canvas.layers[id]; return l && l.getMode() == m ? 'active' : ''; },
				};
				if (m == 'specular' && layer.shader.setSpecularExp)
					mode.list = [{ slider: '', oninput: (e) => { layer.shader.setSpecularExp(e.target.value); } }];
				modes.push(mode);
			}

			let layerEntry = {
				button: layer.label || id,
				onclick: () => { const l = this.viewer.canvas.layers[id]; if (l) this.setLayer(l); },
				status: () => { const l = this.viewer.canvas.layers[id]; return l && l.visible ? 'active' : ''; },
				layer: id,
				// Lens button: present when a lensLayer is configured
				lensButton: !!this.lensLayer && !(layer instanceof LayerSvgAnnotation),
				lensOnclick: () => { const l = this.viewer.canvas.layers[id]; if (l) this.setLensForLayer(l); },
				lensStatus: () => { const l = this.viewer.canvas.layers[id]; return (l && this.lensLayer && this.lensLayer.layers[0] === l && this.lensLayer.visible) ? 'active' : ''; },
			};

			// Add lens layer sublayers if this is a LayerLens
			if (layer.constructor.name === 'LayerLens' && layer.layers && layer.layers.length > 0) {
				this.menu.push({ html: '', classes: 'openlime-layer-separator' });
				layerEntry.classes = 'openlime-lens-parent-entry';
				let lensLayers = [];
				for (let i = 0; i < layer.layers.length; i++) {
					const lensSubLayer = layer.layers[i];
					const lensLayerLabel = lensSubLayer.label || `Layer ${i}`;
					lensLayers.push({
						button: lensLayerLabel,
						layer: id,
						classes: 'openlime-lens-choice-entry',
						roundcheck: true,
						// Mark which layer is active in the lens
						status: () => {
							const lensLayer = this.viewer.canvas.layers[id];
							return lensLayer && lensLayer.activeLayerIndex === i ? 'active' : '';
						},
						onclick: () => {
							const lensLayer = this.viewer.canvas.layers[id];
							if (lensLayer && lensLayer.setActiveLayer) {
								lensLayer.setActiveLayer(i);
								this.updateMenu();
								this.viewer.redraw();
							}
						}
					});
				}
				layerEntry.list = lensLayers;
			} else if (modes.length > 1) {
				layerEntry.list = modes;
			}

			if (layer.annotations && typeof layer.annotationsEntry === 'function') {
				if (!layerEntry.list) layerEntry.list = [];
				layerEntry.list.push(layer.annotationsEntry());
			}
			this.menu.push(layerEntry);
		}

		let controller = new Controller2D(
			(x, y) => {
				for (let layer of lightLayers)
					layer.setLight([x, y], 0);
				if (this.showLightDirections)
					this.updateLightDirections(x, y);
				this.emit('lightdirection', [x, y, Math.sqrt(1 - x * x + y * y)]);
			}, {
			// TODO: IS THIS OK? It was false before
			active: false,
			activeModifiers: [2, 4],
			control: 'light',
			onPanStart: this.showLightDirections ? () => {
				Object.values(this.viewer.canvas.layers).filter(l => l.annotations != null).forEach(l => l.setVisible(false));
				this.enableLightDirections(true);
			} : null,
			onPanEnd: this.showLightDirections ? () => {
				Object.values(this.viewer.canvas.layers).filter(l => l.annotations != null).forEach(l => l.setVisible(true));
				this.enableLightDirections(false);
			} : null,
			relative: true
		});

		controller.priority = 0;
		this.viewer.pointerManager.onEvent(controller);
		this.lightcontroller = controller;

		let lightLayers = [];
		for (let [id, layer] of Object.entries(this.viewer.canvas.layers))
			if (layer.controls.light) lightLayers.push(layer);

		if (lightLayers.length) {
			this.createLightDirections();
			for (let layer of lightLayers) {
				this.onLayerAdded(layer);
			}
		}

		if (queueMicrotask) queueMicrotask(() => { this.init() }); //allows modification of actions and layers before init.
		else setTimeout(() => { this.init(); }, 0);
	}

	/**
	 * Registers a callback for a UI event signal.
	 * Provided here for type visibility; the runtime implementation is attached by addSignals().
	 * @param {string} event
	 * @param {Function} callback
	 */
	addEvent(event, callback) {
		this.signals?.hasOwnProperty(event) || this.initSignals?.();
		this.signals?.[event]?.push(callback);
	}

	/**
	 * Emits a UI event signal.
	 * Provided here for type visibility; the runtime implementation is attached by addSignals().
	 * @param {string} event
	 * @param {...any} args
	 */
	emit(event, ...args) {
		for (const cb of this.signals?.[event] ?? []) cb(...args);
	}

	/**
	 * Shows overlay message
	 * @param {string} msg - Message to display
	 * @param {number} [duration=2000] - Display duration in ms
	 */
	showOverlayMessage(msg, duration = 2000) {
		if (this.overlayMessage) {
			clearTimeout(this.overlayMessage.timeout);
			this.overlayMessage.timeout = setTimeout(() => this.destroyOverlayMessage(), duration);
			return;
		}


		let background = document.createElement('div');
		background.classList.add('openlime-overlaymsg');
		background.innerHTML = `<p>${msg}</p>`;
		this.viewer.containerElement.appendChild(background);

		this.overlayMessage = {
			background,
			timeout: setTimeout(() => this.destroyOverlayMessage(), duration)
		}
	}

	/**
	 * Removes the overlay message
	 * @private
	 */
	destroyOverlayMessage() {
		this.overlayMessage.background.remove();
		this.overlayMessage = null;
	}

	/**
	 * Retrieves menu entry for a specific layer
	 * @param {string} id - Layer identifier
	 * @returns {UIBasic~MenuEntry|undefined} Found menu entry or undefined
	 * @private
	 */
	getMenuLayerEntry(id) {
		const found = this.menu.find(e => e.layer == id);
		return found;
	}

	/**
	 * Creates SVG elements for light direction indicators
	 * @private
	 */
	createLightDirections() {
		this.lightDirections = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.lightDirections.setAttribute('viewBox', '-100, -100, 200 200');
		this.lightDirections.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		this.lightDirections.style.display = 'none';
		this.lightDirections.classList.add('openlime-lightdir');
		for (let x = -1; x <= 1; x++) {
			for (let y = -1; y <= 1; y++) {
				let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
				line.pos = [x * 35, y * 35];
				//line.setAttribute('data-start', `${x} ${y}`);
				this.lightDirections.appendChild(line);
			}
		}
		this.viewer.containerElement.appendChild(this.lightDirections);
	}

	/**
	 * Updates light direction indicator positions
	 * @param {number} lx - Light X coordinate
	 * @param {number} ly - Light Y coordinate
	 * @private
	 */
	updateLightDirections(lx, ly) {
		let lines = [...this.lightDirections.children];
		for (let line of lines) {
			let x = line.pos[0];
			let y = line.pos[1];

			line.setAttribute('x1', 0.6 * x - 25 * 0 * lx);
			line.setAttribute('y1', 0.6 * y + 25 * 0 * ly);
			line.setAttribute('x2', x / 0.6 + 60 * lx);
			line.setAttribute('y2', y / 0.6 - 60 * ly);
		}
	}

	/**
	 * Toggles visibility of light direction indicators
	 * @param {boolean} show - Whether to show indicators
	 * @private
	 */
	enableLightDirections(show) {
		this.lightDirections.style.display = show ? 'block' : 'none';
	}

	/**
	 * Creates the SVG bearing dial overlay.
	 * Two nested SVGs: one for crosshair lines (preserveAspectRatio:none so they span
	 * the full viewer) and one for the circular dial (preserveAspectRatio:meet so the
	 * ring stays circular). Drag anywhere inside the ring to rotate the camera.
	 * @private
	 */
	createBearingOverlay() {
		const container = document.createElement('div');
		container.innerHTML = `
			<svg class="openlime-bearing" width="100%" height="100%" style="display:none">
				<svg class="openlime-bearing-crosshair" viewBox="-100 -100 200 200" preserveAspectRatio="none" width="100%" height="100%">
					<line x1="-100" y1="0" x2="100" y2="0"/>
					<line x1="0" y1="-100" x2="0" y2="100"/>
				</svg>
				<svg viewBox="-100 -100 200 200" preserveAspectRatio="xMidYMid meet" width="100%" height="100%">
					<circle class="openlime-bearing-ring" cx="0" cy="0" r="70"/>
					<g id="openlime-bearing-rotor" class="openlime-bearing-rotor">
						<line class="openlime-bearing-indicator" x1="0" y1="0" x2="0" y2="-70"/>
						<circle class="openlime-bearing-handle" cx="0" cy="-70" r="7"/>
					</g>
					<text id="openlime-bearing-label" class="openlime-bearing-label" x="0" y="0" font-size="14">0°</text>
				</svg>
			</svg>`.trim();

		const svg = container.firstChild;
		this.viewer.containerElement.appendChild(svg);

		this.bearingOverlay = svg;
		this.bearingRotor = svg.querySelector('#openlime-bearing-rotor');
		this.bearingLabel = svg.querySelector('#openlime-bearing-label');

		this.bearingController = new ControllerBearing(this.camera, this.viewer.containerElement, {
			active: false,
			onRotate: () => this.updateBearingOverlay()
		});
		this.viewer.pointerManager.onEvent(this.bearingController);
	}

	/**
	 * Syncs the bearing dial with the current camera rotation angle.
	 * @private
	 */
	updateBearingOverlay() {
		if (!this.bearingOverlay || this.bearingOverlay.style.display === 'none') return;
		const a = -this.camera.getCurrentTransform(performance.now()).a;
		this.bearingRotor.setAttribute('transform', `rotate(${a})`);
		const deg = Math.round(((a % 360) + 360) % 360);
		this.bearingLabel.textContent = `${deg}°`;
	}

	/**
	 * Toggles the bearing dial overlay.
	 * @param {boolean} [on] - Force specific state
	 * @private
	 */
	toggleBearingController(on) {
		if (!this.bearingOverlay) this.createBearingOverlay();
		const active = this.viewer.containerElement.classList.toggle('openlime-bearing-active', on);
		this.bearingOverlay.style.display = active ? 'block' : 'none';
		this.bearingController.active = active;
		if (active) {
			this.updateBearingOverlay();
			this._bearingUpdateHandler = () => this.updateBearingOverlay();
			this.viewer.canvas.addEvent('update', this._bearingUpdateHandler);
		} else {
			if (this._bearingUpdateHandler) {
				this.viewer.canvas.removeEvent('update', this._bearingUpdateHandler);
				this._bearingUpdateHandler = null;
			}
		}
	}
	 /** Initializes UI components
	 * @private
	 * @async
	 */
	init() {
		(async () => {

			document.addEventListener('keydown', (e) => this.keyDown(e), false);
			document.addEventListener('keyup', (e) => this.keyUp(e), false);
			window.addEventListener('blur', () => this._endTemporaryPanOverride(), false);

			this.createMenu();
			this.updateMenu();
			// Do not tie updateMenu to canvas 'update': that event fires on every pan/zoom
			// frame, annotation edit, and shader tweak. Menu visuals only depend on layer
			// visibility, mode, and lens state — refresh via setLayer / setLensForLayer /
			// toggleLayers(open) / mode onclick / addUniformControlToLayer instead.

			if (this.actions.light && this.actions.light.display === 'auto')
				this.actions.light.display = true;


			if (this.skin)
				await this.loadSkin();
			/* TODO: this is probably not needed
			if(this.skinCSS)
				await this.loadSkinCSS();
			*/

			this.setupActions();
			/* Get pixel size from options if provided or from layer metadata
			 */
			if (this.showScale) {
				if (this.pixelSize) {
					this.scalebar = new ScaleBar(this.pixelSize, this.viewer, this.scaleBarOptions);
				}
				else {
					let createScaleBar = () => {
						for (const [id, layer] of Object.entries(this.viewer.canvas.layers)) {
							this.pixelSize = layer.pixelSizePerMM();
							if (this.pixelSize) {
								this.scalebar = new ScaleBar(this.pixelSize, this.viewer, this.scaleBarOptions);
								break;
							}
						}
					}
					if (this.viewer.canvas.ready)
						createScaleBar();
					else
						this.viewer.canvas.addEvent('ready', createScaleBar);
				}
			}

			if (this.attribution) {
				var p = document.createElement('p');
				p.classList.add('openlime-attribution');
				p.innerHTML = this.attribution;
				this.viewer.containerElement.appendChild(p);
			}

			// Layer visibility policy init:
			// - exclusive: keep exactly one non-overlay layer visible (the first).
			// - nonExclusive: keep current layer visibility as configured.
			if (this.layerVisibilityMode === 'exclusive') {
				const baseLayers = Object.values(this.viewer.canvas.layers)
					.filter(layer => !layer.overlay);
				if (baseLayers.length > 0) {
					const first = baseLayers[0];
					for (const layer of baseLayers)
						layer.setVisible(layer === first);
				}
			}
			this._syncLightControllers();
			this.updateMenu();

			if (this.actions.light && this.actions.light.active) {
				const activeLightController = this.viewer.activeLightController;
				if (!activeLightController || activeLightController === this)
					this.toggleLightController();
			}
			if (this.actions.layers && this.actions.layers.active)
				this.toggleLayers();

			if (this.minimapOptions) {
				this.createMinimap();
			}

			this.postInit();

		})().catch(e => { console.log(e); throw Error("Something failed") });
	}

	/**
	 * Handles keyboard down events
	 * @param {KeyboardEvent} e - Keyboard event
	 * @private
	 */
	keyDown(e) {
		if (e.target != document.body && e.target.closest('input, textarea') != null)
			return;
		if (e.ctrlKey && e.shiftKey && !e.altKey)
			this._beginTemporaryPanOverride();
	}

	/**
	 * Processes keyboard shortcuts
	 * @param {KeyboardEvent} e - Keyboard event
	 * @private
	 */
	keyUp(e) {
		if (this._temporaryPanOverrideActive && (!e.ctrlKey || !e.shiftKey)) {
			this._endTemporaryPanOverride();
		}

		if (e.target != document.body && e.target.closest('input, textarea') != null)
			return;

		if (e.defaultPrevented) return;

		for (const [name, a] of Object.entries(this.actions)) {
			if ('key' in a && a.key == e.key) {
				if (this._isPencilToolLockActive() && name !== 'pencil') {
					e.preventDefault();
					return;
				}
				e.preventDefault();
				a.task(e);
				return;
			}
		}
	}

	/**
	 * Returns true when Ctrl+Shift temporary pan override can be useful.
	 * @returns {boolean}
	 * @private
	 */
	_canUseTemporaryPanOverride() {
		return !!(this.lightActive || this.annotationManager?.active);
	}

	/**
	 * Temporarily suspends annotation/light interaction so Ctrl+Shift can pan the scene.
	 * @private
	 */
	_beginTemporaryPanOverride() {
		if (this._temporaryPanOverrideActive) return;
		if (!this._canUseTemporaryPanOverride()) return;

		this._temporaryPanOverrideActive = true;
		this._temporaryPanOverrideSavedPanzoomActive = !!this.panzoom?.active;
		this._temporaryPanOverrideSavedPanzoomModifiers = [...(this.panzoom?.activeModifiers ?? [])];
		this._restoreLightActiveAfterTemporaryPan = !!this.lightActive;

		if (this.annotationManager?.setInteractionSuspended)
			this.annotationManager.setInteractionSuspended(true);

		if (this._restoreLightActiveAfterTemporaryPan)
			this.toggleLightController(false);

		if (this.panzoom) {
			this.panzoom.active = true;
			if (!this.panzoom.activeModifiers.includes(3))
				this.panzoom.activeModifiers = [...this.panzoom.activeModifiers, 3];
		}
	}

	/**
	 * Restores the interaction state that was active before Ctrl+Shift temporary pan.
	 * @private
	 */
	_endTemporaryPanOverride() {
		if (!this._temporaryPanOverrideActive) return;

		if (this.annotationManager?.setInteractionSuspended)
			this.annotationManager.setInteractionSuspended(false);

		if (this._restoreLightActiveAfterTemporaryPan)
			this.toggleLightController(true);

		if (this.panzoom) {
			this.panzoom.activeModifiers = this._temporaryPanOverrideSavedPanzoomModifiers ?? this.panzoom.activeModifiers;
			this.panzoom.active = this._temporaryPanOverrideSavedPanzoomActive;
		}

		this._temporaryPanOverrideSavedPanzoomActive = null;
		this._temporaryPanOverrideSavedPanzoomModifiers = null;
		this._restoreLightActiveAfterTemporaryPan = false;
		this._temporaryPanOverrideActive = false;
	}

	/**
	 * Loads and initializes skin SVG elements
	 * @returns {Promise<void>}
	 * @private
	 * @async
	 */
	async loadSkin() {
		let toolbar = document.createElement('div');
		toolbar.classList.add('openlime-toolbar');
		this.viewer.containerElement.appendChild(toolbar);

		//toolbar manually created with parameters (padding, etc) + css for toolbar positioning and size.
		if (1) {

			let padding = 10;
			let x = 0;
			let h = 0;
			for (let [name, action] of Object.entries(this.actions)) {

				if (action.display !== true)
					continue;

				if ('icon' in action) {
					if (typeof action.icon == 'string') {
						if (Util.isSVGString(action.icon)) {
							action.icon = Util.SVGFromString(action.icon);
						} else {
							action.icon = await Util.loadSVG(action.icon);
						}
						action.icon.classList.add('openlime-button');
					}
				} else {
					action.icon = '.openlime-' + name;
				}

				action.element = await Skin.appendIcon(toolbar, action.icon);

				if (this.enableTooltip) {
					let title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
					title.textContent = action.title;
					if (action.element)
						action.element.appendChild(title);
				}
			}

		}

		if (0) {  //single svg toolbar
			let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			toolbar.appendChild(svg); ui.toggleLightController();
			let x = padding;
			let h = 0;
			for (let [name, action] of Object.entries(this.actions)) {
				if (action.display !== true)
					continue;
				let element = skin.querySelector('.openlime-' + name).cloneNode(true);
				if (!element) continue;
				svg.appendChild(element);
				let box = element.getBBox();
				h = Math.max(h, box.height);
				let tlist = element.transform.baseVal;
				if (tlist.numberOfItems == 0)
					tlist.appendItem(svg.createSVGTransform());
				tlist.getItem(0).setTranslate(-box.x + x, -box.y);
				x += box.width + padding;
			}

			svg.setAttribute('viewBox', `0 0 ${x} ${h}`);
			svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		}



		//TODO: not needed, probably. Toolbar build from the skin directly
		if (0) {
			toolbar.appendChild(skin);

			let w = skin.getAttribute('width');
			let h = skin.getAttribute('height');
			let viewbox = skin.getAttribute('viewBox');
			if (!viewbox)
				skin.setAttribute('viewBox', `0 0 ${w} ${h}`);
		}
	}

	/**
	 * Initializes action buttons and their event handlers
	 * @private
	 */
	setupActions() {
		for (let [name, action] of Object.entries(this.actions)) {
			let element = action.element;
			if (!element)
				continue;
			// let pointerManager = new PointerManager(element);
			// pointerManager.onEvent({ fingerSingleTap: action.task, priority: -2000 });
			element.addEventListener('click', (e) => {
				if (this._isPencilToolLockActive() && name !== 'pencil') {
					e.preventDefault();
					e.stopPropagation();
					return;
				}
				action.task(e);
				e.preventDefault();
			});
		}
		let items = document.querySelectorAll('.openlime-layers-button');
		for (let item of items) {
			let id = item.getAttribute('data-layer');
			if (!id) continue;
			item.addEventListener('click', () => {
				this.setLayer(this.viewer.layers[id]);
			});
		}
	}

	/**
	 * Enables/disables viewer controllers (except panzoom
	 * @param {boolean} [on] = Enable/disable all the viewer controllers
	 * @private
	 */
	setActiveControllers(on) {
		for (let c of this.viewer.controllers) {
			if (c == this.panzoom)  //panzoom is always active
				continue;
			c.active = on;
		}
	}

	/**
	 * Temporarily disables all interaction controllers while annotation pencil
	 * mode is active, then restores their previous active states.
	 * @param {boolean} pencilOn
	 * @private
	 */
	_setControllersForPencil(pencilOn) {
		if (pencilOn) {
			if (this._pencilControllersLocked) return;

			this._savedControllerStates = new Map(
				(this.viewer.controllers || []).map(c => [c, !!c.active])
			);
			this._savedPanzoomActive = !!this.panzoom?.active;
			this._restoreLightActiveAfterPencil = !!this.lightActive;

			if (this._restoreLightActiveAfterPencil) {
				this.toggleLightController(false);
			}

			for (const c of this.viewer.controllers || []) {
				c.active = false;
			}
			if (this.panzoom) this.panzoom.active = false;
			this._pencilControllersLocked = true;
			this._syncToolbarLockForPencil();
			return;
		}

		if (!this._pencilControllersLocked) return;

		if (this._restoreLightActiveAfterPencil) {
			this.toggleLightController(true);
			if (this.panzoom) this.panzoom.active = this._savedPanzoomActive;
		} else if (this._savedControllerStates) {
			for (const c of this.viewer.controllers || []) {
				if (this._savedControllerStates.has(c)) {
					c.active = this._savedControllerStates.get(c);
				}
			}
			if (this.panzoom) this.panzoom.active = this._savedPanzoomActive;
		}

		this._savedControllerStates = null;
		this._restoreLightActiveAfterPencil = false;
		this._pencilControllersLocked = false;
		this._syncToolbarLockForPencil();
	}

	/**
	 * Returns true when annotation pencil mode is actively locking other tools.
	 * @returns {boolean}
	 * @private
	 */
	_isPencilToolLockActive() {
		if (!this.annotationManager) return false;
		const mode = this.annotationManager.mode;
		return this.annotationManager.active && mode !== 'idle';
	}

	/**
	 * Applies a disabled visual state to all toolbar actions except pencil while
	 * annotation mode is active.
	 * @private
	 */
	_syncToolbarLockForPencil() {
		const locked = this._isPencilToolLockActive();
		for (const [name, action] of Object.entries(this.actions || {})) {
			if (name === 'pencil') continue;
			const el = action?.element;
			if (!el) continue;
			el.style.pointerEvents = locked ? 'none' : '';
			el.style.opacity = locked ? '0.35' : '';
			el.style.filter = locked ? 'grayscale(1)' : '';
		}
	}

	/**
	 * Toggles light direction control mode
	 * @param {boolean} [on] - Force specific state
	 */
	toggleLightController(on) {
		let div = this.viewer.containerElement;
		let active = div.classList.toggle('openlime-light-active', on);
		this.lightActive = active;
		this.setActiveControllers(!active);
		for (let layer of Object.values(this.viewer.canvas.layers))
			for (let c of layer.controllers)
				if (c.control == 'light')
					c.activeModifiers = active ? [0, 2, 4] : [2, 4];  //nothing, shift and alt
		this._syncLightControllers();

		if (active)
			this.viewer.setActiveLightController(this);
		else
			this.viewer.clearActiveLightController(this);
	}

	/**
	 * Viewer-level hook to enforce a single active light controller.
	 * Called by Viewer.setActiveLightController when this controller
	 * is activated/deactivated by another light controller.
	 * @param {boolean} on - Whether this controller should be active
	 */
	setActive(on) {
		if (on) {
			this.toggleLightController(true);
			return;
		}

		let div = this.viewer.containerElement;
		div.classList.toggle('openlime-light-active', false);
		this.lightActive = false;
		this.setActiveControllers(true);
		for (let layer of Object.values(this.viewer.canvas.layers))
			for (let c of layer.controllers)
				if (c.control == 'light')
					c.active = false;
	}

	/**
	 * Viewer-level hook called when a new layer is added.
	 * Attaches the shared default light controller to light-capable layers.
	 * @param {Layer} layer - Newly added layer
	 */
	onLayerAdded(layer) {
		if (!layer || !layer.controls || !layer.controls.light || !this.lightcontroller)
			return;

		if (!layer.controllers.includes(this.lightcontroller)) {
			this.lightcontroller.setPosition(0.5, 0.5);
			layer.controllers.push(this.lightcontroller);
		}
	}

	/**
	 * Toggles fullscreen mode
	 * Handles browser-specific fullscreen APIs
	 * @private
	 */
	toggleFullscreen() {
		let canvas = this.viewer.canvasElement;
		let div = this.viewer.containerElement;
		let active = div.classList.toggle('openlime-fullscreen-active');

		if (!active) {
			var request = document.exitFullscreen || document.webkitExitFullscreen ||
				document.mozCancelFullScreen || document.msExitFullscreen;
			request.call(document); document.querySelector('.openlime-scale > line');

			this.viewer.resize(canvas.offsetWidth, canvas.offsetHeight);
		} else {
			var request = div.requestFullscreen || div.webkitRequestFullscreen ||
				div.mozRequestFullScreen || div.msRequestFullscreen;
			request.call(div);
		}
		this.viewer.resize(canvas.offsetWidth, canvas.offsetHeight);
	}

	/**
	 * Toggles measurement ruler tool
	 * @private
	 */
	toggleRuler() {
		const div = this.viewer.containerElement;
		const rl = div.querySelector('.openlime-button.openlime-ruler');
		const active = rl.classList.toggle('openlime-ruler-active');
		this.setActiveControllers(!active);
		if (!this.ruler) {
			this.ruler = new Ruler(this.viewer, this.pixelSize);
			this.viewer.pointerManager.onEvent(this.ruler);
		}

		if (!this.ruler.enabled)
			this.ruler.start();
		else
			this.ruler.end();
	}

	/**
	 * Toggles help dialog
	 * @param {UIBasic~Action} help - Help action configuration
	 * @param {boolean} [on] - Force specific state
	 * @private
	 */
	toggleHelp(help, on) {
		if (!help.dialog) {
			help.dialog = new UIDialog(this.viewer.containerElement, { modal: true, class: 'openlime-help-dialog' });
			help.dialog.setContent(help.html);
		} else
			help.dialog.toggle(on);
	}

	/**
	 * Creates and downloads canvas snapshot
	 * @private
	 */
	snapshot() {
		var e = document.createElement('a');
		e.setAttribute('href', this.viewer.canvas.canvasElement.toDataURL());
		e.setAttribute('download', 'snapshot.png');
		e.style.display = 'none';
		document.body.appendChild(e);
		e.click();
		document.body.removeChild(e);
	}

	/* Layer management */

	/**
	 * Creates HTML for menu entry
	 * @param {UIBasic~MenuEntry} entry - Menu entry to create
	 * @returns {string} Generated HTML
	 * @private
	 */
	createEntry(entry) {
		if (!('id' in entry))
			entry.id = 'entry_' + (this.entry_count++);

		let id = `id="${entry.id}"`;
		let tooltip = 'tooltip' in entry ? `title="${entry.tooltip}"` : '';
		let classes = 'classes' in entry ? entry.classes : '';
		let html = '';
		if ('title' in entry) {
			html += `<h2 ${id} class="openlime-title ${classes}" ${tooltip}>${entry.title}</h2>`;

		} else if ('section' in entry) {
			html += `<h3 ${id} class="openlime-section ${classes}" ${tooltip}>${entry.section}</h3>`;

		} else if ('html' in entry) {
			html += `<div ${id} class="${classes}">${entry.html}</div>`;

		} else if ('button' in entry) {
			let group = 'group' in entry ? `data-group="${entry.group}"` : '';
			let layer = 'layer' in entry ? `data-layer="${entry.layer}"` : '';
			let mode = 'mode' in entry ? `data-mode="${entry.mode}"` : '';
			let roundcheck = 'roundcheck' in entry ? entry.roundcheck : false;

			// Add icons for layers and modes
			if (roundcheck) {
				html += `<a href="#" ${id} ${group} ${layer} ${mode} ${tooltip} class="openlime-entry ${classes}">
							<span class="openlime-lens-choice-check"></span>
							<span class="openlime-lens-choice-name">${entry.button}</span>
				</a>`;
			} else if (layer && !mode) {
				// This is a layer button
				let lensBtn = '';
				if (entry.lensButton) {
					lensBtn = `<button class="openlime-lens-btn" title="Show in lens" data-lens-layer="${entry.layer}">&#x1F50D;</button>`;
				}
				html += `<a href="#" ${id} ${group} ${layer} ${mode} ${tooltip} class="openlime-entry openlime-layer-entry ${classes}">
							<span class="openlime-layer-icon"></span>
							<span class="openlime-layer-name">${entry.button}</span>
							<span class="openlime-layer-status"></span>
							${lensBtn}
					</a>`;

			} else if (mode) {
				// This is a mode button
				html += `<a href="#" ${id} ${group} ${layer} ${mode} ${tooltip} class="openlime-entry openlime-mode-entry ${classes}">
							<span class="openlime-mode-icon"></span>
							<span class="openlime-mode-name">${entry.button}</span>
					</a>`;
			} else {
				// Regular button
				html += `<a href="#" ${id} ${group} ${layer} ${mode} ${tooltip} class="openlime-entry ${classes}">${entry.button}</a>`;
			}
		} else if ('slider' in entry) {
			let value = ('value' in entry) ? entry['value'] : 50;
			html += `
			<div class="openlime-slider-container" data-slider-id="${entry.id}">
					<input type="range" min="1" max="100" value="${value}" class="openlime-slider ${classes}" ${id}>
					<span class="openlime-slider-value">${value}</span>
			</div>`;
		}

		if ('list' in entry) {
			let ul = `<div class="openlime-list ${classes}">`;
			for (let li of entry.list)
				ul += this.createEntry(li);
			ul += '</div>';
			html += ul;
		}
		return html;
	}

	/**
	* Attaches event handlers to menu entry elements
	* @param {UIBasic~MenuEntry} entry - Menu entry to process
	* @private
	*/
	addEntryCallbacks(entry) {
		entry.element = this.layerMenu.querySelector('#' + entry.id);
		if (entry.onclick)
			entry.element.addEventListener('click', (e) => {
				if (this._isPencilToolLockActive()) {
					e.preventDefault();
					e.stopPropagation();
					return;
				}
				// Ignore clicks that originated from the lens button
				if (e.target.closest('.openlime-lens-btn')) return;
				entry.onclick();
				// Update the slider value if it exists
				const sliderValue = entry.element.querySelector('.openlime-slider-value');
				if (sliderValue) {
					const slider = entry.element.querySelector('.openlime-slider');
					if (slider) {
						sliderValue.textContent = slider.value;
					}
				}
			});

		if (entry.layer) {
			entry.statusIcon = entry.element.querySelector('.openlime-layer-status');
		}

		// Wire the lens button if present
		entry.lensBtnElement = entry.element.querySelector('.openlime-lens-btn');
		if (entry.lensBtnElement && entry.lensOnclick) {
			entry.lensBtnElement.addEventListener('click', (e) => {
				if (this._isPencilToolLockActive()) {
					e.preventDefault();
					e.stopPropagation();
					return;
				}
				e.preventDefault();
				e.stopPropagation();
				entry.lensOnclick();
			});
		}

		// For sliders, we need special handling
		if (entry.element.classList.contains('openlime-slider')) {
			const sliderContainer = entry.element.closest('.openlime-slider-container');
			if (sliderContainer) {
				const sliderValue = sliderContainer.querySelector('.openlime-slider-value');
				if (sliderValue) {
					// Set initial value
					sliderValue.textContent = entry.element.value;

					// Update value on input
					entry.element.addEventListener('input', (e) => {
						if (this._isPencilToolLockActive()) return;
						sliderValue.textContent = e.target.value;
						if (entry.oninput) entry.oninput(e);
					});
				}
			}
		} else if (entry.oninput) {
			entry.element.addEventListener('input', (e) => {
				if (this._isPencilToolLockActive()) return;
				entry.oninput(e);
			});
		}

		if (entry.oncreate)
			entry.oncreate();

		if ('list' in entry)
			for (let e of entry.list)
				this.addEntryCallbacks(e);
	}

	/**
	* Updates menu entry state
	* @param {UIBasic~MenuEntry} entry - Menu entry to update
	* @private
	*/
	updateEntry(entry) {
		if ('list' in entry) {
			for (let e of entry.list) {
				this.updateEntry(e);
			}
		}

		if (!entry.element || (!entry.status && !entry.lensStatus)) {
			return;
		}

		const status = entry.status ? entry.status() : '';
		const lensStatus = entry.lensStatus ? entry.lensStatus() : '';
		const cacheKey = `${status}\0${lensStatus}`;
		if (entry._menuVisualCache === cacheKey) {
			return;
		}
		entry._menuVisualCache = cacheKey;

		if (entry.status) {
			entry.element.classList.toggle('active', status == 'active');
			if (entry.layer && entry.statusIcon) {
				entry.statusIcon.textContent = status == 'active' ? '✓' : '';
			}
		}

		if (entry.lensBtnElement && entry.lensStatus) {
			const lensActive = lensStatus === 'active';
			entry.lensBtnElement.classList.toggle('active', lensActive);
			entry.lensBtnElement.title = lensActive ? 'Remove from lens' : 'Show in lens';
		}
	}

	/**
	* Creates main menu structure
	* @private
	*/
	createMenu() {
		this.entry_count = 0;
		let html = `<div class="openlime-layers-menu">
									<div class="openlime-layers-header">
											<h2>Layer Controls</h2>
											<button class="openlime-layers-close-btn">×</button>
									</div>
									<div class="openlime-layers-content">`;
		for (let entry of this.menu) {
			html += this.createEntry(entry);
		}
		html += `</div></div>`;

		let template = document.createElement('template');
		template.innerHTML = html.trim();
		this.layerMenu = template.content.firstChild;
		this.viewer.containerElement.appendChild(this.layerMenu);

		// Add close button functionality
		const closeBtn = this.layerMenu.querySelector('.openlime-layers-close-btn');
		if (closeBtn) {
			closeBtn.addEventListener('click', () => this.toggleLayers());
		}

		for (let entry of this.menu) {
			this.addEntryCallbacks(entry);
		}
	}

	/**
	* Toggles layer menu visibility with animation
	* @private
	*/
	toggleLayers() {
		// Add more sophisticated toggle with animation
		if (this.layerMenu.classList.contains('open')) {
			// Closing the menu
			this.layerMenu.classList.add('closing');
			setTimeout(() => {
				this.layerMenu.classList.remove('open');
				this.layerMenu.classList.remove('closing');
			}, 300); // Match transition duration
		} else {
			// Opening the menu
			this.layerMenu.classList.add('open');
			this.updateMenu(); // Ensure menu is up to date when opening
		}
	}

	/**
	 * Updates the visual state of all layer-menu entries (active checkmarks, lens buttons).
	 * Safe before init (no-op without {@link UIBasic#layerMenu}).
	 *
	 * Not driven by canvas redraw/update — call after visibility/mode/lens changes, on init,
	 * when opening the layers panel ({@link UIBasic#toggleLayers}), or when adding uniform UI.
	 */
	updateMenu() {
		if (!this.layerMenu) {
			return;
		}

		for (const entry of this.menu) {
			// If the entry DOM element is not attached yet, skip it
			if (!entry.element) {
				continue;
			}
			this.updateEntry(entry);
		}
	}

	createMinimap() {
		// Auto-configure viewport from first layer if not specified
		if (!this.minimapOptions.viewport) {
			const firstLayer = Object.values(this.viewer.canvas.layers)[0];
			if (firstLayer && firstLayer.boundingBox) {
				this.minimapOptions.viewport = firstLayer.boundingBox;
			}
		}

		this.minimap = new Minimap(this.viewer, this.minimapOptions);
	}

	toggleMinimap(on) {
		if (!this.minimap) return;
		if (on === undefined) on = this.minimap.element.style.display === 'none';
		this.minimap[on ? 'show' : 'hide']();
	}

	/**
	 * Sets active layer and updates UI
	 * @param {Layer|string} layer_on - Layer or layer ID to activate
	 */
	setLayer(layer_on) {
		if (typeof layer_on == 'string')
			layer_on = this.viewer.canvas.layers[layer_on];

		if (!layer_on) return;

		if (this.layerVisibilityMode === 'nonExclusive' || layer_on.overlay) {
			// Toggle this layer's visibility independently.
			layer_on.setVisible(!layer_on.visible);
		} else {
			// Exclusive behaviour for base layers: selecting one hides the others.
			const defaultLightControllerOwns = !this.viewer.activeLightController || this.viewer.activeLightController === this;
			for (let layer of Object.values(this.viewer.canvas.layers)) {
				if (layer.overlay) continue;
				layer.setVisible(layer === layer_on);
				for (let c of layer.controllers) {
					if (c.control == 'light' && defaultLightControllerOwns) {
						c.active = true;
						c.activeModifiers = this.lightActive ? [0, 2, 4] : [2, 4];
					}
				}
			}
		}

		// Keep light controllers in sync with global multi-layer visibility.
		this._syncLightControllers();

		this.updateMenu();
		this.viewer.redraw();
	}

	/**
	 * Recomputes light-controller activation from the current layer visibility.
	 * In multi-layer mode, light controls remain active while at least one
	 * visible layer supports light interaction.
	 * @private
	 */
	_syncLightControllers() {
		let hasVisibleLightLayer = false;
		for (let layer of Object.values(this.viewer.canvas.layers)) {
			if (!layer.visible) continue;
			for (let c of layer.controllers) {
				if (c.control == 'light') {
					hasVisibleLightLayer = true;
					break;
				}
			}
			if (hasVisibleLightLayer) break;
		}

		for (let layer of Object.values(this.viewer.canvas.layers)) {
			for (let c of layer.controllers) {
				if (c.control == 'light')
					c.active = this.lightActive && hasVisibleLightLayer;
			}
		}
	}

	/**
	 * Adds a UI control for a shader uniform
	 * @param {Layer} layer - Layer containing the shader
	 * @param {string} originalUniformName - Original name of the uniform in shader or filter
	 * @param {string} uiName - Display name for the UI
	 * @param {string} uiType - Control type ('checkbox'|'line-edit'|'slider')
	 * @param {number} uiMinDisplayed - Minimum displayed value (for slider/line-edit)
	 * @param {number} uiMaxDisplayed - Maximum displayed value (for slider/line-edit)
	 * @param {number} uiMin - Minimum actual uniform value
	 * @param {number} uiMax - Maximum actual uniform value
	 * @param {number} uiNStepDisplayed - Number of steps for slider (granularity control)
	 * @returns {boolean} Whether the uniform was found and UI created
	 */
	addUniformUI(layer, originalUniformName, uiName, uiType, uiMinDisplayed = 0, uiMaxDisplayed = 100, uiMin = 0.0, uiMax = 1.0, uiNStepDisplayed = 100) {
		// Find the uniform in shader or filter
		let uniform = null;
		let filter = null;
		let isInFilter = false;

		// Check main shader uniforms
		if (layer.shader && layer.shader.uniforms && layer.shader.uniforms[originalUniformName]) {
			uniform = layer.shader.uniforms[originalUniformName];
		}
		// Check filter uniforms
		else if (layer.shader && layer.shader.filters) {
			for (const f of layer.shader.filters) {
				for (const [name, u] of Object.entries(f.uniforms)) {
					if (name === originalUniformName || name === f.uniformName(originalUniformName)) {
						uniform = u;
						filter = f;
						isInFilter = true;
						break;
					}
				}
				if (uniform) break;
			}
		}

		// If uniform not found, return false
		if (!uniform) {
			console.warn(`Uniform '${originalUniformName}' not found in layer ${layer.id || 'unknown'}`);
			return false;
		}

		// Create menu entry
		const layerEntry = this.getMenuLayerEntry(layer.id);
		if (!layerEntry) {
			console.warn(`Layer menu entry for '${layer.id || 'unknown'}' not found`);
			return false;
		}

		// Ensure layer entry has a list
		if (!layerEntry.list) {
			layerEntry.list = [];
		}

		// Check if we need to add a uniforms section
		if (!layerEntry.uniformsSection) {
			// First add a separator if needed (if there are mode entries)
			const hasModes = layerEntry.list.some(entry => entry.mode);
			if (hasModes || layerEntry.list.length > 0) {
				layerEntry.list.push({
					html: '<div class="openlime-uniform-separator"></div>'
				});
			}

			// Add uniforms section header
			layerEntry.list.push({
				html: '<div class="openlime-uniform-section">Parameters</div>'
			});

			layerEntry.uniformsSection = true;
		}

		// Generate a unique ID for this control
		const controlId = `uniform_${layer.id}_${originalUniformName.replace(/[^a-zA-Z0-9]/g, '_')}_${uiType}`;

		// Create entry based on uiType
		const uniformEntry = {
			id: controlId,
			uniformName: originalUniformName,
			uniformFilter: filter,
			html: `<div class="openlime-uniform-container">
							<div class="openlime-uniform-name">${uiName}</div>
							<div class="openlime-uniform-control-wrapper" data-uniform="${originalUniformName}" data-control-type="${uiType}"></div>
						 </div>`
		};

		// Add this entry to the layer's list of uniform controls if it doesn't exist yet
		if (!layerEntry.uniformControls) {
			layerEntry.uniformControls = {};
		}

		// Get current value from uniform
		const currentValue = uniform.value;

		// Map function to convert between UI and actual values
		const mapToUniform = (displayedValue) => {
			if (uiType === 'checkbox') {
				return displayedValue;
			} else {
				// Convert from displayed range to actual range
				return uiMin + (displayedValue - uiMinDisplayed) * (uiMax - uiMin) / (uiMaxDisplayed - uiMinDisplayed);
			}
		};

		const mapToDisplay = (uniformValue) => {
			if (uiType === 'checkbox') {
				return uniformValue;
			} else {
				// Convert from actual range to displayed range
				return uiMinDisplayed + (uniformValue - uiMin) * (uiMaxDisplayed - uiMinDisplayed) / (uiMax - uiMin);
			}
		};

		// Store the mapping functions and parameters for later use
		uniformEntry.mapToUniform = mapToUniform;
		uniformEntry.mapToDisplay = mapToDisplay;
		uniformEntry.uiMin = uiMin;
		uniformEntry.uiMax = uiMax;
		uniformEntry.uiMinDisplayed = uiMinDisplayed;
		uniformEntry.uiMaxDisplayed = uiMaxDisplayed;
		uniformEntry.uiType = uiType;

		// Add displayed value to start
		const displayValue = mapToDisplay(currentValue);

		// Add type-specific control creation and event handling
		uniformEntry.oncreate = () => {
			const container = uniformEntry.element;
			const controlWrapper = container.querySelector('.openlime-uniform-control-wrapper');

			// Store reference to this control for updating from other controls
			if (!layerEntry.uniformControls[originalUniformName]) {
				layerEntry.uniformControls[originalUniformName] = [];
			}
			layerEntry.uniformControls[originalUniformName].push({
				id: controlId,
				element: controlWrapper,
				entry: uniformEntry
			});

			if (uiType === 'checkbox') {
				// Create checkbox
				controlWrapper.innerHTML = `
							<label class="openlime-uniform-checkbox-wrapper">
									<input type="checkbox" class="openlime-uniform-checkbox" ${currentValue ? 'checked' : ''}>
									<span class="openlime-uniform-checkbox-custom"></span>
							</label>
					`;

				// Add event listener
				const checkbox = controlWrapper.querySelector('.openlime-uniform-checkbox');
				checkbox.addEventListener('change', (e) => {
					const value = e.target.checked;
					this.updateUniformValue(layer, originalUniformName, value, filter);

					// Update other controls for the same uniform
					this.updateRelatedControls(layerEntry, originalUniformName, value, controlId);
				});
			}
			else if (uiType === 'line-edit') {
				// Create text input
				controlWrapper.innerHTML = `
							<input type="text" class="openlime-uniform-line-edit" value="${displayValue.toFixed(2)}">
					`;

				// Add event listener
				const input = controlWrapper.querySelector('.openlime-uniform-line-edit');
				input.addEventListener('change', (e) => {
					// Parse the input value as a number
					const displayedValue = parseFloat(e.target.value);

					// Validate if it's a number
					if (isNaN(displayedValue)) {
						// Reset to current value if not a number
						e.target.value = displayValue.toFixed(2);
						return;
					}

					// Ensure value is in displayed range
					const clampedDisplay = Math.max(uiMinDisplayed, Math.min(uiMaxDisplayed, displayedValue));

					// Map to uniform range
					const uniformValue = mapToUniform(clampedDisplay);

					// Update UI if value was clamped
					if (clampedDisplay !== displayedValue) {
						e.target.value = clampedDisplay.toFixed(2);
					}

					this.updateUniformValue(layer, originalUniformName, uniformValue, filter);

					// Update other controls for the same uniform
					this.updateRelatedControls(layerEntry, originalUniformName, uniformValue, controlId);
				});
			}
			else if (uiType === 'slider') {
				// Calculate step size based on uiNStepDisplayed
				const stepSize = uiNStepDisplayed > 0 ?
					((uiMaxDisplayed - uiMinDisplayed) / uiNStepDisplayed).toFixed(6) :
					'any';

				// Create slider with value display
				controlWrapper.innerHTML = `
							<div class="openlime-uniform-slider-container">
									<input type="range" class="openlime-uniform-slider" 
												 min="${uiMinDisplayed}" max="${uiMaxDisplayed}" 
												 step="${stepSize}" value="${displayValue}">
									<span class="openlime-uniform-slider-value">${displayValue.toFixed(2)}</span>
							</div>
					`;

				// Add event listener
				const slider = controlWrapper.querySelector('.openlime-uniform-slider');
				const valueDisplay = controlWrapper.querySelector('.openlime-uniform-slider-value');

				slider.addEventListener('input', (e) => {
					const displayedValue = parseFloat(e.target.value);

					// Update value display
					valueDisplay.textContent = displayedValue.toFixed(2);

					// Map to uniform range
					const uniformValue = mapToUniform(displayedValue);

					this.updateUniformValue(layer, originalUniformName, uniformValue, filter);

					// Update other controls for the same uniform
					this.updateRelatedControls(layerEntry, originalUniformName, uniformValue, controlId);
				});
			}
		};

		// Add entry to the layer's list
		layerEntry.list.push(uniformEntry);

		// If the menu was already created, update it
		if (this.layerMenu) {
			this.updateMenu();
		}

		return true;
	}

	/**
	* Updates all related controls for a uniform when one is changed
	* @param {Object} layerEntry - Layer menu entry
	* @param {string} uniformName - Name of the uniform
	* @param {*} value - New uniform value
	* @param {string} sourceControlId - ID of the control that triggered the update
	* @private
	*/
	updateRelatedControls(layerEntry, uniformName, value, sourceControlId) {
		if (!layerEntry.uniformControls || !layerEntry.uniformControls[uniformName]) {
			return;
		}

		// Update all controls for this uniform except the source
		for (const control of layerEntry.uniformControls[uniformName]) {
			if (control.id === sourceControlId) {
				continue; // Skip the source control
			}

			const entry = control.entry;
			const element = control.element;

			// Convert the actual uniform value to the displayed value for this control
			const displayValue = entry.mapToDisplay(value);

			// Update control based on its type
			if (entry.uiType === 'checkbox') {
				const checkbox = element.querySelector('.openlime-uniform-checkbox');
				if (checkbox) {
					checkbox.checked = value;
				}
			}
			else if (entry.uiType === 'line-edit') {
				const input = element.querySelector('.openlime-uniform-line-edit');
				if (input) {
					input.value = displayValue.toFixed(2);
				}
			}
			else if (entry.uiType === 'slider') {
				const slider = element.querySelector('.openlime-uniform-slider');
				const valueDisplay = element.querySelector('.openlime-uniform-slider-value');
				if (slider) {
					slider.value = displayValue;
				}
				if (valueDisplay) {
					valueDisplay.textContent = displayValue.toFixed(2);
				}
			}
		}
	}

	/**
	* Updates a uniform value in shader or filter
	* @param {Layer} layer - The layer containing the shader
	* @param {string} name - Uniform name
	* @param {*} value - New value
	* @param {ShaderFilter} [filter] - Optional filter if uniform belongs to a filter
	* @private
	*/
	updateUniformValue(layer, name, value, filter = null) {
		if (filter) {
			// Check if the name already includes the filter prefix
			if (name.startsWith(`u_${filter.name}_`)) {
				layer.shader.setUniform(name, value);
			} else {
				filter.setUniform(name, value);
			}
		} else {
			layer.shader.setUniform(name, value);
		}
		layer.emit('update');
	}

	/**
	 * Toggles annotation pencil mode on/off.
	 * Delegates to {@link ManagerSvgAnnotation#toggle} when an `annotationManager` is set.
	 * Updates the pencil button active state in the toolbar.
	 *
	 * @param {boolean} [force] - Force a specific state; toggles if omitted.
	 */
	toggleAnnotations(force) {
		if (this.annotationManager) {
			this.annotationManager.toggle(force);
			// Button state and pencilEnabled/pencilDisabled signals are handled
			// by the 'modeChange' listener wired in the constructor.
		}
	}

	/**
	 * Toggles viewer-only annotation inspection.
	 * When active, annotations can be selected and observed without enabling edit mode.
	 *
	 * @param {boolean} [force] - Force a specific state; toggles if omitted.
	 * @returns {boolean} Whether annotation inspection is active.
	 */
	toggleAnnotationInfo(force, originalEvent = null) {
		if (!this.annotationManager) return false;
		const active = force === undefined ? !this._annotationInfoActive : !!force;
		this._annotationInfoActive = active;
		this.annotationManager.setInspectEnabled(active);

		const infoButton = this.viewer.containerElement
			.querySelector('.openlime-button.openlime-info');
		if (infoButton)
			infoButton.classList.toggle('openlime-info-active', active);

		this.emit('annotationInfoToggle', {
			active,
			originalEvent,
			manager: this.annotationManager,
			layer: this.annotationManager.layer
		});
		return active;
	}

	/**
	 * Sets or clears the base layer inside the LensLayer.
	 * If the requested layer is already in the lens, it is removed (toggle off).
	 * Otherwise the layer is set as the lens base and all other layers are
	 * updated to no longer be inside the lens.
	 * @param {Layer} layer - Layer to set as lens base (or to remove from lens)
	 */
	setLensForLayer(layer) {
		if (!this.lensLayer) return;

		if (this.lensLayer.layers[0] === layer && this.lensLayer.visible) {
			// Toggle off: hide the lens layer
			this.lensLayer.setVisible(false);
		} else {
			// Set this layer as the inner content of the lens and show it
			this.lensLayer.setBaseLayer(layer);
			this.lensLayer.setVisible(true);
		}

		this.updateMenu();
		this.viewer.redraw();
	}

	// closeLayersMenu() {
	// 	this.layerMenu.style.display = 'none';
	// }
}

/**
 * A **UIDialog** is a top-level window used for communications with the user. It may be modal or modeless.
 * The content of the dialog can be either an HTML text or a pre-built DOM element.
 * When hidden, a dialog emits a 'closed' event.
 */
class UIDialog { //FIXME standalone class
	/**
	 * Instatiates a UIDialog object.
	 * @param {HTMLElement} container The HTMLElement on which the dialog is focused
	 * @param {Object} [options] An object literal with UIDialog parameters.
	 * @param {bool} options.modal Whether the dialog is modal. 
	 */
	constructor(container, options) {
		Object.assign(this, {
			dialog: null,
			content: null,
			container: container,
			modal: false,
			class: null,
			visible: false,
			backdropEvents: true
		}, options);
		this.create();
	}

	/**
	 * Creates dialog DOM structure
	 * @private
	 */
	create() {
		let background = document.createElement('div');
		background.classList.add('openlime-dialog-background');

		let dialog = document.createElement('div');
		dialog.classList.add('openlime-dialog');
		if (this.class)
			dialog.classList.add(this.class);

		(async () => {
			let close = await Skin.appendIcon(dialog, '.openlime-close');
			close.classList.add('openlime-close');
			close.addEventListener('click', () => this.hide());
			//content.appendChild(close);
		})();


		// let close = Skin.appendIcon(dialog, '.openlime-close');
		// close.classList.add('openlime-close');
		// close.addEventListener('click', () => this.hide());

		let content = document.createElement('div');
		content.classList.add('openlime-dialog-content');
		dialog.append(content);

		if (this.modal) { //FIXME backdrown => backdrop
			if (this.backdropEvents) background.addEventListener('click', (e) => { if (e.target == background) this.hide(); });
			background.appendChild(dialog);
			this.container.appendChild(background);
			this.element = background;
		} else {
			this.container.appendChild(dialog);
			this.element = dialog;
		}

		this.dialog = dialog;
		this.content = content;
		this.hide();
	}

	/**
	 * Sets dialog content
	 * @param {string|HTMLElement} html - Content to display
	 */
	setContent(html) {
		if (typeof (html) == 'string')
			this.content.innerHTML = html;
		else
			this.content.replaceChildren(html);
	}

	/**
	 * Shows the dialog.
	 */
	show() {
		this.element.classList.remove('hidden');
		this.visible = true;
	}

	/**
	 * Hides the dialog and emits closed event
	 * @fires UIDialog#closed
	 */
	hide() {
		/**
		 * The event is fired when the dialog is closed.
		 * @event UIDialog#closed
		 */
		this.element.classList.add('hidden');
		this.visible = false;
		this.emit('closed');
	}

	/**
	 * Toggles fade effect
	 * @param {boolean} on - Whether to enable fade effect
	 */
	fade(on) { //FIXME Does it work?
		this.element.classList.toggle('fading');
	}

	/**
	 * Toggles dialog visibility
	 * @param {boolean} [force] - Force specific state (true = show, false = hide)
	 */
	toggle(force) {
		const newVisibility = force === undefined ? !this.visible : force;
		this.element.classList.toggle('hidden', !newVisibility);
		this.visible = newVisibility;
	}
}

/**
 * Event Definitions
 * 
 * Light Direction Change Event:
 * @event UIBasic#lightdirection
 * @type {Object}
 * @property {number[]} direction - [x, y, z] normalized light vector
 * 
 * Dialog Close Event:
 * @event UIDialog#closed
 * @description Emitted when dialog is closed through any means
 */

addSignals(UIDialog, 'closed');
addSignals(UIBasic, 'lightdirection');
addSignals(UIBasic, 'pencilEnabled');
addSignals(UIBasic, 'pencilDisabled');
addSignals(UIBasic, 'settings');
addSignals(UIBasic, 'annotationInfo');
addSignals(UIBasic, 'annotationInfoToggle');

export { UIBasic, UIDialog }
