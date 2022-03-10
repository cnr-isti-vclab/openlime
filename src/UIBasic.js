import { Canvas } from './Canvas.js'
import { Skin } from './Skin.js'
import { Layer } from './Layer.js'
import { Controller } from './Controller.js'
import { Controller2D } from './Controller2D.js'
import { ControllerPanZoom } from './ControllerPanZoom.js'
import { PointerManager } from './PointerManager.js'
import { LayerAnnotation } from './LayerAnnotation.js'

/* Basic viewer for a single layer.
 *  we support actions through buttons: each button style is controlled by classes (trigger), active (if support status)
 *  and custom.
 * actions supported are:
 *  home: reset the camera
 *  zoomin, zoomout
 *  fullscreen
 *  rotate (45/90 deg rotation option.
 *  light: turn on light changing.
 *  switch layer(s)
 *  lens.
 * 
 * How the menu works:
 * Each entry eg: { title: 'Coin 16' }
 * title: large title
 * section: smaller title
 * html: whatever html
 * button: visually a button, attributes: group, layer, mode
 * slider: callback(percent)
 * list: an array of entries.
 * 
 * Additional attributes:
 * onclick: a function(event) {}
 * group: a group of entries where at most one is active
 * layer: a layer id: will be active if layer is visible
 * mode: a layer visualization mode, active if it's the current mode.
 * layer + mode: if both are specified, both must be current for an active.
 */

class UIBasic {
	constructor(lime, options) {
		//we need to know the size of the scene but the layers are not ready.
		let camera = lime.camera;
		Object.assign(this, {
			lime: lime,
			camera: lime.camera,
			skin: 'skin/skin.svg',
			autoFit: true,
			//skinCSS: 'skin.css', // TODO: probably not useful
			actions: {
				home: { title: 'Home', display: true, key: 'Home', task: (event) => { if (camera.boundingBox) camera.fitCameraBox(250); } },
				fullscreen: { title: 'Fullscreen', display: true, key: 'f', task: (event) => { this.toggleFullscreen(); } },
				layers: { title: 'Layers', display: true, key: 'Escape', task: (event) => { this.toggleLayers(event); } },
				zoomin: { title: 'Zoom in', display: false, key: '+', task: (event) => { camera.deltaZoom(250, 1.25, 0, 0); } },
				zoomout: { title: 'Zoom out', display: false, key: '-', task: (event) => { camera.deltaZoom(250, 1 / 1.25, 0, 0); } },
				rotate: { title: 'Rotate', display: false, key: 'r', task: (event) => { camera.rotate(250, -45); } },
				light: { title: 'Light', display: 'auto', key: 'l', task: (event) => { this.toggleLightController(); } },
				ruler: { title: 'Ruler', display: false, task: (event) => { this.startRuler(); } },
				help: { title: 'Help', display: false, key: '?', task: (event) => { this.toggleHelp(this.actions.help); }, html: '<p>Help here!</p>' },
				snapshot: { title: 'Snapshot', display: false, task: (event) => { this.snapshot() } },
			},
			viewport: [0, 0, 0, 0], //in scene coordinates
			scale: null,
			unit: null,
			attribution: null,     //image attribution
			lightcontroller: null,
		});

		Object.assign(this, options);
		if (this.autoFit)
			this.lime.canvas.addEvent('updateSize', () => this.lime.camera.fitCameraBox(0));

		this.panzoom = new ControllerPanZoom(this.lime.camera, { priority: -1000 });

		this.menu = [];

		/*let element = entry.element;
		let group = element.getAttribute('data-group');
		let layer = element.getAttribute('data-layer');
		let mode = element.getAttribute('data-mode');
		let active = (layer && this.lime.canvas.layers[layer].visible) &&
			(!mode || this.lime.canvas.layers[layer].getMode() == mode);
		entry.element.classList.toggle('active', active); */

		this.menu.push({ section: "Layers" });
		for (let [id, layer] of Object.entries(this.lime.canvas.layers)) {
			let modes = []
			for (let m of layer.getModes()) {
				let mode = {
					button: m,
					mode: m,
					layer: id,
					onclick: () => { layer.setMode(m); this.updateMenu(); },
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
				list: modes,
				layer: id
			};
			if (layer.annotations) {
				layerEntry.list.push(layer.annotationsEntry());
				//TODO: this could be a convenience, creating an editor which can be
				//customized later using layer.editor.
				//if(layer.editable) 
				//	layer.editor = this.editor;
			}
			this.menu.push(layerEntry);
		}

		let controller = new Controller2D((x, y) => {
			for (let layer of lightLayers)
				layer.setLight([x, y], 0);
			if(this.showLightDirections)
				this.updateLightDirections(x, y);

			}, { 
				active: false, 
    			activeModifiers: [2, 4], 
    			control: 'light', 
    			onPanStart: this.showLightDirections ? () => {
    				this.info.fade(true);
    				Object.values(this.lime.canvas.layers).filter(l => l.annotations != null).forEach(l => l.setVisible(false) );
    				this.enableLightDirections(true); } : null,
    			onPanEnd: this.showLightDirections ? () => { 
    				this.info.fade(false);
    				Object.values(this.lime.canvas.layers).filter(l => l.annotations != null).forEach(l => l.setVisible(true) );
    				this.enableLightDirections(false); } : null,
    			relative: true 
			});

		controller.priority = 0;
		this.lime.pointerManager.onEvent(controller);
		this.lightcontroller = controller;


		let lightLayers = [];
		for (let [id, layer] of Object.entries(this.lime.canvas.layers))
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

	createLightDirections() {
		this.lightDirections = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.lightDirections.setAttribute('viewBox', '-100, -100, 200 200');
		this.lightDirections.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		this.lightDirections.style.display = 'none';
		this.lightDirections.classList.add('openlime-lightdir');
		for(let x = -1; x <= 1; x++) {
			for(let y = -1; y <= 1; y++) {
				let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
				line.pos = [x*35, y*35];
				//line.setAttribute('data-start', `${x} ${y}`);
				this.lightDirections.appendChild(line);
			}
		}
		this.lime.containerElement.appendChild(this.lightDirections);
	}
	
	updateLightDirections(lx, ly) {
		let lines = [...this.lightDirections.children];
		for(let line of lines) {
			let x = line.pos[0];
			let y = line.pos[1];
			
			line.setAttribute('x1', 0.6*x -25*0*lx);
			line.setAttribute('y1', 0.6*y +25*0*ly);
			line.setAttribute('x2', x/0.6 + 60*lx);
			line.setAttribute('y2', y/0.6 - 60*ly);
		}
	}
	enableLightDirections(show) {
		this.lightDirections.style.display = show? 'block' : 'none';
	}
	

	init() {
		(async () => {

			document.addEventListener('keydown', (e) => this.keyDown(e), false);
			document.addEventListener('keyup', (e) => this.keyUp(e), false);

			let panzoom = this.panzoom = new ControllerPanZoom(this.lime.camera, {
				priority: -1000,
				activeModifiers: [0, 1]
			});
			this.lime.pointerManager.onEvent(panzoom); //register wheel, doubleclick, pan and pinch
			// this.lime.pointerManager.on("fingerSingleTap", { "fingerSingleTap": (e) => { this.showInfo(e); }, priority: 10000 });

			this.createMenu();
			this.updateMenu();

			if (this.actions.light && this.actions.light.display === 'auto')
				this.actions.light.display = true;


			if (this.skin)
				await this.loadSkin();
			/* TODO: this is probably not needed
			if(this.skinCSS)
				await this.loadSkinCSS();
			*/

			this.setupActions();
			this.setupScale();
			if(this.attribution) {
				var p = document.createElement('p');
				p.classList.add('openlime-attribution');
				p.innerHTML = this.attribution;
				this.lime.containerElement.appendChild(p);
			}

			

			for (let l of Object.values(this.lime.canvas.layers)) {
				this.setLayer(l);
				break;
			}

			if (this.actions.light.active == true)
				this.toggleLightController();

		})().catch(e => { console.log(e); throw Error("Something failed") });
	}

	keyDown(e) {
	}

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
	
	async loadSkin() {
		let toolbar = document.createElement('div');
		toolbar.classList.add('openlime-toolbar');
		this.lime.containerElement.appendChild(toolbar);


		//toolbar manually created with parameters (padding, etc) + css for toolbar positioning and size.
		if (1) {

			let padding = 10;
			let x = 0;
			let h = 0;
			for (let [name, action] of Object.entries(this.actions)) {

				if (action.display !== true)
					continue;

				await Skin.appendIcon(toolbar, '.openlime-' + name);
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

	setupActions() {
		for (let [name, action] of Object.entries(this.actions)) {
			let element = this.lime.containerElement.querySelector('.openlime-' + name);
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
				this.setLayer(this.lime.layers[id]);
			});
		}
	}
	//find best length for scale from min -> max
	//zoom 2 means a pixel in image is now 2 pixel on screen, scale is
	bestScaleLength(min, max, scale, zoom) {
		scale /= zoom;
		//closest power of 10:
		let label10 = Math.pow(10, Math.floor(Math.log(max * scale) / Math.log(10)));
		let length10 = label10 / scale;
		if (length10 > min) return { length: length10, label: label10 };

		let label20 = label10 * 2;
		let length20 = length10 * 2;
		if (length20 > min) return { length: length20, label: label20 };

		let label50 = label10 * 5;
		let length50 = length10 * 5;

		if (length50 > min) return { length: length50, label: label50 };
		return { length: 0, label: 0 }
	}

	updateScale(line, text) {
		//let zoom = this.lime.camera.getCurrentTransform(performance.now()).z;
		let zoom = this.lime.camera.target.z;
		if (zoom == this.lastScaleZoom)
			return;
		this.lastScaleZoom = zoom;
		let s = this.bestScaleLength(100, 200, this.scale, zoom);
		//let line = document.querySelector('.openlime-scale > line');
		let margin = 200 - 10 - s.length;
		line.setAttribute('x1', margin / 2);
		line.setAttribute('x2', 200 - margin / 2);
		//let text = document.querySelector('.openlime-scale > text');
		text.textContent = s.label + "mm";


	}

	//scale is length of a pixel in mm
	setupScale() {
		if (!this.scale) return;
		this.scales = { 'mm': 1, 'cm': 10, 'm': 1000, 'km': 1000000 };


		let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('viewBox', `0 0 200 40`);
		svg.classList.add('openlime-scale');
		let line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
		line.setAttribute('x1', 5);
		line.setAttribute('y1', 26.5);
		line.setAttribute('x2', 195);
		line.setAttribute('y2', 26.5);
		let text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
		text.setAttribute('x', '50%');
		text.setAttribute('y', '16px');
		text.setAttribute('dominant-baseline', 'middle');
		text.setAttribute('text-anchor', 'middle');
		text.textContent = "10mm";
		//var label = document.createTextNode("10mm");
		//text.appendChild(label);


		svg.appendChild(line);
		svg.appendChild(text);
		this.lime.containerElement.appendChild(svg);
		this.lime.camera.addEvent('update', () => { this.updateScale(line, text); });
	}

	//we need the concept of active layer! so we an turn on and off light.
	toggleLightController() {
		let div = this.lime.containerElement;
		let active = div.classList.toggle('openlime-light-active');
		this.lightActive = active;

		for (let layer of Object.values(this.lime.canvas.layers))
			for (let c of layer.controllers)
				if (c.control == 'light') {
					c.active = true;
					c.activeModifiers = active ? [0, 2, 4] : [2, 4];  //nothing, shift and alt
				}
	}

	toggleFullscreen() {
		let canvas = this.lime.canvasElement;
		let div = this.lime.containerElement;
		let active = div.classList.toggle('openlime-fullscreen-active');

		if (!active) {
			var request = document.exitFullscreen || document.webkitExitFullscreen ||
				document.mozCancelFullScreen || document.msExitFullscreen;
			request.call(document); document.querySelector('.openlime-scale > line');

			this.lime.resize(canvas.offsetWidth, canvas.offsetHeight);
		} else {
			var request = div.requestFullscreen || div.webkitRequestFullscreen ||
				div.mozRequestFullScreen || div.msRequestFullscreen;
			request.call(div);
		}
		this.lime.resize(canvas.offsetWidth, canvas.offsetHeight);
	}

	startRuler() {
	}

	endRuler() {
	}

	toggleHelp(help, on) {
		if(!help.dialog) {
			help.dialog = new UIDialog(this.lime.containerElement, { modal: true, class: 'openlime-help-dialog' });
			help.dialog.setContent(help.html);
		} else
			help.dialog.toggle(on);		
	}

	snapshot() {
		var e = document.createElement('a');
		e.setAttribute('href', this.lime.canvas.canvasElement.toDataURL());
		e.setAttribute('download', 'snapshot.png');
		e.style.display = 'none';
		document.body.appendChild(e);
		e.click();
		document.body.removeChild(e);
	}

	/* Layer management */

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
			html += `<input type="range" min="1" max="100" value="50" class="openlime-slider ${classes}" ${id}>`;
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

	updateEntry(entry) {
		let status = entry.status ? entry.status() : '';
		entry.element.classList.toggle('active', status == 'active');

		if ('list' in entry)
			for (let e of entry.list)
				this.updateEntry(e);
	}

	updateMenu() {
		for (let entry of this.menu)
			this.updateEntry(entry);
	}

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
		this.lime.containerElement.appendChild(this.layerMenu);

		for (let entry of this.menu) {
			this.addEntryCallbacks(entry);
		}


		/*		for(let li of document.querySelectorAll('[data-layer]'))
					li.addEventListener('click', (e) => {
						this.setLayer(this.lime.canvas.layers[li.getAttribute('data-layer')]);
					}); */
	}

	toggleLayers(event) {
		this.layerMenu.classList.toggle('open');
	}

	setLayer(layer_on) {
		if (typeof layer_on == 'string')
			layer_on = this.lime.canvas.layers[layer_on];

		if (layer_on.overlay) { //just toggle
			layer_on.setVisible(!layer_on.visible);

		} else {
			for (let layer of Object.values(this.lime.canvas.layers)) {
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
		this.lime.redraw();
	}

	closeLayersMenu() {
		this.layerMenu.style.display = 'none';
	}
}

class UIDialog {
	constructor(container, options) {
		Object.assign(this, {
			dialog: null,
			content: null,
			container: container,
			modal: false,
			signals: { 'closed': [] },
			class: null,
		}, options);
		this.create();
	}

	//TODO make QObject style events dependency
	addEvent(event, callback) {
		this.signals[event].push(callback);
	}
	
	emit(event, ...parameters) {
		for (let r of this.signals[event])
			r(...parameters);
	}

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

		if (this.modal) {
			background.addEventListener('click', (e) => { if (e.target == background) this.hide(); });
			background.appendChild(dialog);
			this.container.appendChild(background);
			this.element = background;

		} else {

			this.container.appendChild(dialog);
			this.element = dialog;
		}

		this.dialog = dialog;
		this.content = content;
	}
	
	setContent(html) {
		if (typeof (html) == 'string')
			this.content.innerHTML = html;
		else
			this.content.replaceChildren(html);
	}
	
	show() {
		this.element.classList.remove('hidden');
	}
	
	hide() {
		this.element.classList.add('hidden');
		this.emit('closed');
	}
	
	fade(on) {
		this.element.classList.toggle('fading');
	}

	toggle(on) {
		this.element.classList.toggle('hidden', on);
	}
}

export { UIBasic, UIDialog }
