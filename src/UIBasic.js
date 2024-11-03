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
			skin: 'skin/skin.svg',
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
			pixelSize: null,
			unit: null, //FIXME to be used with ruler
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
		this.viewer.pointerManager.onEvent(this.panzoom); //register wheel, doubleclick, pan and pinch
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
			if (this.pixelSize) {
				this.scalebar = new ScaleBar(this.pixelSize, this.viewer);
			}
			else if (this.viewer.canvas.layers[Object.keys(this.viewer.canvas.layers)[0]].pixelSize) {
				let pixelSize = this.viewer.canvas.layers[Object.keys(this.viewer.canvas.layers)[0]].pixelSizePerMM();
				this.scalebar = new ScaleBar(pixelSize, this.viewer);
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
	 * Toggles light direction control mode
	 * @param {boolean} [on] - Force specific state
	 * @private
	 */
	toggleLightController(on) {
		let div = this.viewer.containerElement;
		let active = div.classList.toggle('openlime-light-active', on);
		this.lightActive = active;

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
			html += `<a href="#" ${id} ${group} ${layer} ${mode} ${tooltip} class="openlime-entry ${classes}">${entry.button}</a>`;
		} else if ('slider' in entry) {
			let value = ('value' in entry) ? entry['value'] : 50;
			html += `<input type="range" min="1" max="100" value="${value}" class="openlime-slider ${classes}" ${id}>`;
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
				//this.updateMenu();
			});
		if (entry.oninput)
			entry.element.addEventListener('input', entry.oninput);
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
		entry.element.classList.toggle('active', status == 'active');

		if ('list' in entry)
			for (let e of entry.list)
				this.updateEntry(e);
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
	 * Creates main menu structure
	 * @private
	 */
	createMenu() {
		this.entry_count = 0;
		let html = `<div class="openlime-layers-menu">`;
		for (let entry of this.menu) {
			html += this.createEntry(entry);
		}
		html += '</div>';


		let template = document.createElement('template');
		template.innerHTML = html.trim();
		this.layerMenu = template.content.firstChild;
		this.viewer.containerElement.appendChild(this.layerMenu);

		for (let entry of this.menu) {
			this.addEntryCallbacks(entry);
		}


		/*		for(let li of document.querySelectorAll('[data-layer]'))
					li.addEventListener('click', (e) => {
						this.setLayer(this.viewer.canvas.layers[li.getAttribute('data-layer')]);
					}); */
	}

	/**
	 * Toggles layer menu visibility
	 * @private
	 */
	toggleLayers() {
		this.layerMenu.classList.toggle('open');
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
	 * @param {boolean} [force] - Force specific state
	 */
	toggle(force) { //FIXME Why not remove force?
		this.element.classList.toggle('hidden', force);
		this.visible = !this.visible; //FIXME not in sync with 'force'
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
 * Emitted when dialog is closed through any means
 */

addSignals(UIDialog, 'closed');
addSignals(UIBasic, 'lightdirection');

export { UIBasic, UIDialog }
