import { Canvas } from './Canvas.js'
import { Layer } from './Layer.js'
import { Controller2D } from './Controller2D.js'
import { ControllerPanZoom } from './ControllerPanZoom.js'
import { PointerManager } from './PointerManager.js'
import { AnnotationLayer } from './AnnotationLayer.js'
import { AnnotationEditor } from './AnnotationEditor.js'

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
			skin: 'skin.svg',
			autoFit: true,
			//skinCSS: 'skin.css', // TODO: probably not useful
			actions: {
				home:       { title: 'Home',       display: true,  task: (event) => { if(camera.boundingBox) camera.fitCameraBox(250); } },
				fullscreen: { title: 'Fullscreen', display: true,  task: (event) => { this.toggleFullscreen(); } },
				layers:     { title: 'Layers',     display: true, task: (event) => { this.toggleLayers(event); } },
				zoomin:     { title: 'Zoom in',    display: false, task: (event) => { camera.deltaZoom(250, 1.25, 0, 0); } },
				zoomout:    { title: 'Zoom out',   display: false, task: (event) => { camera.deltaZoom(250, 1/1.25, 0, 0); } },
				rotate:     { title: 'Rotate',     display: false, task: (event) => { camera.rotate(250, -45); } },
				light:      { title: 'Light',      display: 'auto',  task: (event) => { this.toggleLightController(); } },
				ruler:      { title: 'Ruler',      display: false, task: (event) => { this.startRuler(); } },
			},
			viewport: [0, 0, 0, 0], //in scene coordinates
			scale: null,
			unit: null,
			info: new Info(lime.containerElement),
			editor: new AnnotationEditor(lime),
		});

		Object.assign(this, options);
		if (this.autoFit)
			this.lime.canvas.addEvent('updateSize', () => this.lime.camera.fitCameraBox(0));

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
				if (m == 'specular')
					mode.list = [{ slider: '', oninput: (e) => { layer.shader.setSpecularExp(e.target.value); } }];
				modes.push(mode);
			}
			let layerEntry = {
				button: layer.label || id, 
				onclick: ()=> { this.setLayer(layer); },
				status: () => layer.visible? 'active' : '',
				list: modes,
				layer: id
			};
			if(layer.editable) {
				layerEntry.list.push(this.editor.menuWidget(layer));
/*				for(const [mode, label] of Object.entries({ point: 'New point', line: 'New line', box: 'New box', circle: 'New circle' }))
					layerEntry.list.push({
						button: label,
						onclick: () => { this.editor.setMode(layer, mode); this.updateMenu(); },
						status: () => this.editor.mode == mode ? 'active': '',
					}); */

			}
			this.menu.push(layerEntry);
		}
		if (queueMicrotask) queueMicrotask(() => { this.init() }); //allows modification of actions and layers before init.
		else setTimeout(() => { this.init(); }, 0);
	}



	init() {
		(async () => {

			let panzoom = new ControllerPanZoom(this.lime.camera, { priority: -1000 });
			this.lime.pointerManager.onEvent(panzoom); //register wheel, doubleclick, pan and pinch
			this.lime.pointerManager.on("fingerSingleTap", {"fingerSingleTap": (e) => { this.showInfo(e);}, priority: 10000 });
			
			//this.lime.pointerManager.on("fingerHover", {"fingerHover": (e) => { this.showInfo(e);}, priority: 10000 });

			this.editor.addEvent('toolChanged', ()=> { this.updateMenu(); });
			this.createMenu();
			this.updateMenu();

			let lightLayers = [];
			for (let [id, layer] of Object.entries(this.lime.canvas.layers))
				if (layer.controls.light) lightLayers.push(layer);

			if (lightLayers.length) {
				if (this.actions.light && this.actions.light.display === 'auto')
					this.actions.light.display = true;

				let controller = new Controller2D((x, y) => {
					for (let layer of lightLayers)
						layer.setLight([x, y], 0);
				}, { active: false, control: 'light' });

				controller.priority = 0;
				this.lime.pointerManager.onEvent(controller);
				for (let layer of lightLayers) {
					layer.setLight([0.5, 0.5], 0);
					layer.controllers.push(controller);
				}

			}


			if (this.skin)
				await this.loadSkin();
			/* TODO: this is probably not needed
			if(this.skinCSS)
				await this.loadSkinCSS();
			*/

			this.setupActions();
			this.setupScale();

			for (let l of Object.values(this.lime.canvas.layers)) {
				//this.setLayer(l);
				break;
			}

			if (this.actions.light.active == true)
				this.toggleLightController();

		})().catch(e => { console.log(e); throw Error("Something failed") });
	}
	
	showInfo(e) {
		if(!e.originSrc) {
			throw "This should never happen!";
		}

		let layer = e.originSrc.getAttribute('data-layer');
		if(!layer)
			return this.info.hide();
			
		layer = this.lime.canvas.layers[layer];

		if(e.fingerType == 'fingerHover' && !layer.hoverable)
			return;

		let id = e.originSrc.getAttribute('id');
		this.info.show(e, layer, id);
	}

	
	async loadSkin() {
		var response = await fetch(this.skin);
		if (!response.ok) {
			throw Error("Failed loading " + url + ": " + response.statusText);
			return;
		}

		let text = await response.text();
		let parser = new DOMParser();
		let skin = parser.parseFromString(text, "image/svg+xml").documentElement;


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

				let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');

				toolbar.appendChild(svg);

				let element = skin.querySelector('.openlime-' + name).cloneNode(true);
				if (!element) continue;
				svg.appendChild(element);
				let box = element.getBBox();

				let tlist = element.transform.baseVal;
				if (tlist.numberOfItems == 0)
					tlist.appendItem(svg.createSVGTransform());
				tlist.getItem(0).setTranslate(-box.x, -box.y);

				svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
				svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
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
		let label10 = Math.pow(10, Math.floor(Math.log(max*scale)/Math.log(10)));
		let length10 = label10/scale;
		if(length10 > min) return { length: length10, label: label10 };

		let label20 = label10 * 2;
		let length20 = length10 * 2;
		if(length20 > min) return { length: length20, label: label20 };

		let label50 = label10 * 5;
		let length50 = length10 * 5;

		if(length50 > min) return { length: length50, label: label50 };
		return { length: 0, label: 0 }
	}
	
	updateScale(line, text) {
		//let zoom = this.lime.camera.getCurrentTransform(performance.now()).z;
		let zoom = this.lime.camera.target.z;
		if(zoom == this.lastScaleZoom)
			return;
		this.lastScaleZoom = zoom;
		let s = this.bestScaleLength(100, 200, this.scale, zoom);
		//let line = document.querySelector('.openlime-scale > line');
		let margin = 200 - 10 - s.length;
		line.setAttribute('x1', margin/2);
		line.setAttribute('x2', 200 - margin/2);
		//let text = document.querySelector('.openlime-scale > text');
		text.textContent = s.label + "mm";


	}

	//scale is length of a pixel in mm
	setupScale() {
		if(!this.scale) return;
		this.scales = { 'mm': 1, 'cm':10, 'm':1000, 'km':1000000 };

		
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
		this.lime.camera.addEvent('update', () => { this.updateScale(line, text); } );
	}

	//we need the concept of active layer! so we an turn on and off light.
	toggleLightController() {
		let div = this.lime.containerElement;
		let active = div.classList.toggle('openlime-light-active');
		this.lightActive = active;

		for (let layer of Object.values(this.lime.canvas.layers))
			for (let c of layer.controllers)
				if (c.control == 'light')
					c.active = active;
	}

	toggleFullscreen() {
		let canvas = this.lime.canvasElement;
		let div = this.lime.containerElement;
		let active = div.classList.toggle('openlime-fullscreen-active');

		if (!active) {
			var request = document.exitFullscreen || document.webkitExitFullscreen ||
				document.mozCancelFullScreen || document.msExitFullscreen;
			request.call(document);document.querySelector('.openlime-scale > line');

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

		if(layer_on instanceof AnnotationLayer) { //just toggle
			layer_on.setVisible(!layer_on.visible);

		} else {
			for (let layer of Object.values(this.lime.canvas.layers)) {
				if(layer instanceof AnnotationLayer)
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


class Info {
	constructor(container) {
		Object.assign(this, {
			element: null,
			svgElement: null,  //svg for annotation, TODO: should be inside annotation!
			annotation: null,
			container: container
		});			
	}
	
	hide() {
		if(!this.element) return;
		this.element.style.display = 'none';

		if(this.svgElement)
			this.svgElement.classList.remove('selected');
		
		this.annotation = null;
		this.svgElement = null;
	}

	show(e, layer, id) {
		if(!this.element) {
			let html = '<div class="openlime-info"></div>';
			let template = document.createElement('template');
			template.innerHTML = html.trim();
			this.element = template.content.firstChild;
			this.container.appendChild(this.element);
		}

		if(this.annotation && id == this.annotation.id)
			return;

		this.hide();
		
		e.originSrc.classList.add('selected');
		let annotation = layer.getAnnotationById(id);
		this.element.innerHTML = layer.infoTemplate ? layer.infoTemplate(annotation) : this.template(annotation);
		this.annotation = annotation;
		this.svgElement = e.originSrc;

		this.element.style.display = '';
		//todo position info appropriately.
		e.preventDefault();
	}
	template(annotation) {
		return `
		<p>${annotation.description}</p>
		<p>${annotation.class}</p>
		`;
	}
}

export { UIBasic }
