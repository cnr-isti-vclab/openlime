import { Skin } from './Skin'
import { Util } from './Util'
import { Controller2D } from './Controller2D'
import { ControllerPanZoom } from './ControllerPanZoom'
import { Ruler } from "./Ruler"
import { ScaleBar } from './ScaleBar'
import { addSignals } from './Signals'

/**
 * @typedef {Object} UIAction
 * Action configuration for toolbar buttons
 * @property {string} title - Display title for the action
 * @property {boolean} display - Whether to show in toolbar
 * @property {string} [key] - Keyboard shortcut key
 * @property {Function} task - Callback function for action
 * @property {string} [icon] - Custom SVG icon path or content
 * @property {string} [html] - HTML content for help dialog
 */

/**
 * @typedef {Object} MenuEntry
 * Menu configuration item
 * @property {string} [title] - Large title text
 * @property {string} [section] - Section header text
 * @property {string} [html] - Raw HTML content
 * @property {string} [button] - Button text
 * @property {string} [group] - Button group identifier
 * @property {string} [layer] - Associated layer ID
 * @property {string} [mode] - Layer visualization mode
 * @property {Function} [onclick] - Click handler
 * @property {Function} [oninput] - Input handler for sliders
 * @property {MenuEntry[]} [list] - Nested menu entries
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
	/**
	 * Creates a new UIBasic instance
	 * @param {Viewer} viewer - OpenLIME viewer instance
	 * @param {UIBasic~Options} [options] - Configuration options
	 * 
	 * @fires UIBasic#lightdirection
	 * 
	 * @example
	 * ```javascript
	 * const ui = new UIBasic(viewer, {
	 *     // Enable specific actions
	 *     actions: {
	 *         light: { display: true },
	 *         zoomin: { display: true },
	 *         layers: { display: true }
	 *     },
	 *     // Add measurement support
	 *     pixelSize: 0.1,
	 *     // Add attribution
	 *     attribution: "© Example Source"
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
				layers: { title: 'Layers', display: true, key: 'Escape', task: (event) => { this.toggleLayers(); } },
				zoomin: { title: 'Zoom in', display: false, key: '+', task: (event) => { camera.deltaZoom(250, 1.25, 0, 0); } },
				zoomout: { title: 'Zoom out', display: false, key: '-', task: (event) => { camera.deltaZoom(250, 1 / 1.25, 0, 0); } },
				rotate: { title: 'Rotate', display: false, key: 'r', task: (event) => { camera.rotate(250, -45); } },
				light: { title: 'Light', display: 'auto', key: 'l', task: (event) => { this.toggleLightController(); } },
				ruler: { title: 'Ruler', display: false, task: (event) => { this.toggleRuler(); } },
				help: { title: 'Help', display: false, key: '?', task: (event) => { this.toggleHelp(this.actions.help); }, html: '<p>Help here!</p>' }, //FIXME Why a boolean in toggleHelp?
				snapshot: { title: 'Snapshot', display: false, task: (event) => { this.snapshot() } }, //FIXME not work!
			},
			postInit: () => { },
			showScale: true,
			pixelSize: null,
			unit: null,
			attribution: null,     //image attribution
			lightcontroller: null,
			showLightDirections: false,
			enableTooltip: true,
			controlZoomMessage: null, //"Use Ctrl + Wheel to zoom instead of scrolling" ,
			menu: []
		});

		Object.assign(this, options);
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
			let modes = []
			for (let m of layer.getModes()) {
				let mode = {
					button: m,
					mode: m,
					layer: id,
					onclick: () => { layer.setMode(m); },
					status: () => layer.getMode() == m ? 'active' : '',
				};
				if (m == 'specular' && layer.shader.setSpecularExp)
					mode.list = [{ slider: '', oninput: (e) => { layer.shader.setSpecularExp(e.target.value); } }];
				modes.push(mode);
			}

			let layerEntry = {
				button: layer.label || id,
				onclick: () => { this.setLayer(layer); },
				status: () => layer.visible ? 'active' : '',
				layer: id
			};
			if (modes.length > 1) layerEntry.list = modes;

			if (layer.annotations) {
				layerEntry.list = [];
				//setTimeout(() => { 
				layerEntry.list.push(layer.annotationsEntry());
				//this.updateMenu();
				//}, 1000);
				//TODO: this could be a convenience, creating an editor which can be
				//customized later using layer.editor.
				//if(layer.editable) 
				//	layer.editor = this.editor;
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
				controller.setPosition(0.5, 0.5);
				//layer.setLight([0.5, 0.5], 0);
				layer.controllers.push(controller);
			}
		}

		if (queueMicrotask) queueMicrotask(() => { this.init() }); //allows modification of actions and layers before init.
		else setTimeout(() => { this.init(); }, 0);
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
	 * Initializes UI components
	 * Sets up toolbar, menu, and controllers
	 * @private
	 * @async
	 */
	init() {
		(async () => {

			document.addEventListener('keydown', (e) => this.keyDown(e), false);
			document.addEventListener('keyup', (e) => this.keyUp(e), false);

			this.createMenu();
			this.updateMenu();
			this.viewer.canvas.addEvent('update', () => this.updateMenu());

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
					this.scalebar = new ScaleBar(this.pixelSize, this.viewer);
				}
				else {
					let createScaleBar = () => {
						for(const [id, layer] of Object.entries(this.viewer.canvas.layers)) {
							this.pixelSize = layer.pixelSizePerMM();
							if (this.pixelSize) {
								this.scalebar = new ScaleBar(this.pixelSize, this.viewer);
								break;
							}
						}
					}
					if(this.viewer.canvas.ready) 
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

			for (let l of Object.values(this.viewer.canvas.layers)) {
				this.setLayer(l);
				break;
			}

			if (this.actions.light && this.actions.light.active)
				this.toggleLightController();
			if (this.actions.layers && this.actions.layers.active)
				this.toggleLayers();

			this.postInit();

		})().catch(e => { console.log(e); throw Error("Something failed") });
	}

	/**
	 * Handles keyboard down events
	 * @param {KeyboardEvent} e - Keyboard event
	 * @private
	 */
	keyDown(e) {
	}

	/**
	 * Processes keyboard shortcuts
	 * @param {KeyboardEvent} e - Keyboard event
	 * @private
	 */
	keyUp(e) {
		if (e.target != document.body && e.target.closest('input, textarea') != null)
			return;

		if (e.defaultPrevented) return;

		for (const a of Object.values(this.actions)) {
			if ('key' in a && a.key == e.key) {
				e.preventDefault();
				a.task(e);
				return;
			}
		}
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
	 * Enables/disables viewer controllers
	 * @param {boolean} [on] = Enable/disable all the viewer controllers
	 * @private
	 */
	setActiveControllers(on) {
		for (let c of this.viewer.controllers) {
			c.active = on;
		}
	}

	/**
	 * Toggles light direction control mode
	 * @param {boolean} [on] - Force specific state
	 * @private
	 */
	toggleLightController(on) {
		let div = this.viewer.containerElement;
		let active = div.classList.toggle('openlime-light-active', on);
		this.lightActive = active;
		this.setActiveControllers(!active);
		for (let layer of Object.values(this.viewer.canvas.layers))
			for (let c of layer.controllers)
				if (c.control == 'light') {
					c.active = true;
					c.activeModifiers = active ? [0, 2, 4] : [2, 4];  //nothing, shift and alt
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

			// Add icons for layers and modes
			if (layer && !mode) {
				// This is a layer button
				html += `<a href="#" ${id} ${group} ${layer} ${mode} ${tooltip} class="openlime-entry openlime-layer-entry ${classes}">
							<span class="openlime-layer-icon"></span>
							<span class="openlime-layer-name">${entry.button}</span>
							<span class="openlime-layer-status"></span>
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
						sliderValue.textContent = e.target.value;
						if (entry.oninput) entry.oninput(e);
					});
				}
			}
		} else if (entry.oninput) {
			entry.element.addEventListener('input', (e) => {
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
		let status = entry.status ? entry.status() : '';

		// Update classes
		entry.element.classList.toggle('active', status == 'active');

		// Update status indicator for layer entries
		if (entry.layer) {
			const statusIcon = entry.element.querySelector('.openlime-layer-status');
			if (statusIcon) {
				statusIcon.textContent = status == 'active' ? '✓' : '';
			}
		}

		if ('list' in entry)
			for (let e of entry.list)
				this.updateEntry(e);
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
		 * Updates all menu entries
		 * @private
		 */
	updateMenu() {
		for (let entry of this.menu)
			this.updateEntry(entry);
	}

	/**
	 * Sets active layer and updates UI
	 * @param {Layer|string} layer_on - Layer or layer ID to activate
	 */
	setLayer(layer_on) {
		if (typeof layer_on == 'string')
			layer_on = this.viewer.canvas.layers[layer_on];

		if (layer_on.overlay) { //just toggle
			layer_on.setVisible(!layer_on.visible);

		} else {
			for (let layer of Object.values(this.viewer.canvas.layers)) {
				if (layer.overlay)
					continue;

				layer.setVisible(layer == layer_on);
				for (let c of layer.controllers) {
					if (c.control == 'light')
						c.active = this.lightActive && layer == layer_on;
				}
			}
		}
		this.updateMenu();
		this.viewer.redraw();
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
	 * Hides layers menu
	 */
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

export { UIBasic, UIDialog }
