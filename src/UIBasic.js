import { Canvas } from './Canvas.js'
import { Layer } from './Layer.js'
import { Controller2D } from './Controller2D.js'
import { ControllerPanZoom } from './ControllerPanZoom.js'

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
 */

class UIBasic {
	constructor(lime, options) {
		//we need to know the size of the scene but the layers are not ready.
		lime.canvas.addEvent('update', ()=> { this.updateLayers(); });
		let camera = lime.camera;
		Object.assign(this, {
			lime: lime,
			camera: this.camera,
			skin: 'skin.svg',
			//skinCSS: 'skin.css', // TODO: probably not useful
			actions: {
				home:       { title: 'Home',       task: (event) => { if(this.ready) camera.fit(this.viewport, 250); } },
				layers:     { title: 'Layers',     task: (event) => { this.selectLayers(event); } },
				zoomin:     { title: 'Zoom in',    task: (event) => { if(this.ready) camera.deltaZoom(250, 1.25, 0, 0); } },
				zoomout:    { title: 'Zoom out',   task: (event) => { if(this.ready) camera.deltaZoom(250, 1/1.25, 0, 0); } },
				rotate:     { title: 'Rotate',     task: (event) => { camera.rotate(250, -45); } },
				light:      { title: 'Light',      task: (event) => { this.toggleLightController(); } },
				fullscreen: { title: 'Fullscreen', task: (event) => { this.toggleFullscreen(); } },
			},
			viewport: [0, 0, 0, 0] //in scene coordinates
		});

		Object.assign(this, options);
		
		if(queueMicrotask) queueMicrotask(() => { this.init() }); //allows modification of actions and layers before init.
		else setTimeout(() => { this.init(); }, 0);
	}



	init() {		
		(async () => {

			let panzoom = new ControllerPanZoom(this.lime.camera, { priority: -1000 });
			this.lime.pointerManager.onEvent(panzoom); //register wheel, doubleclick, pan and pinch
	
			for(let layer of Object.values(this.lime.canvas.layers)) {
				if(layer.controls.light) {
					let controller = new Controller2D((x, y)=>layer.setLight( [x, y], 0), { active:false, control:'light' });
					controller.priority = 0;
					this.lime.pointerManager.onEvent(controller);
					layer.controllers.push(controller);
				}
			}
	

			if(this.skin)
				await this.loadSkin();
			/* TODO: this is probably not needed
			if(this.skinCSS)
				await this.loadSkinCSS();
			*/

			this.setupActions();

			for(let l of Object.values(this.lime.canvas.layers)) {
				this.setLayer(l);
				break;
			}

		})().catch(e => { console.log(e); throw Error("Something failed") });
	}

	updateLayers() {
		this.ready = true;
		let box = [1e20, 1e20, -1e20, -1e20];
		for(let layer of Object.values(this.lime.canvas.layers)) {
			if(layer.status != 'ready') {
				this.ready = false;
				continue;
			}

			let lbox = layer.transform.transformBox(layer.boundingBox());
			box[0] = Math.min(lbox[0], box[0]);
			box[1] = Math.min(lbox[1], box[1]);
			box[2] = Math.max(lbox[2], box[2]);
			box[3] = Math.max(lbox[3], box[3]);
		}
		
		if(box[2] > box[0])
			this.viewport = box;
	}

	async loadSkin() {
		var response = await fetch(this.skin);
		if(!response.ok) {
			throw Error("Failed loading " + url + ": " + response.statusText);
			return;
		}

		let text = await response.text();
		let parser = new DOMParser();
		let skin= parser.parseFromString(text, "image/svg+xml").documentElement;


		let toolbar = document.createElement('div');
		toolbar.classList.add('openlime-toolbar');
		this.lime.containerElement.appendChild(toolbar);


		//toolbar manually created with parameters (padding, etc) + css for toolbar positioning and size.
		if(1) {
			let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			toolbar.appendChild(svg);

			let padding = 10;
			let x = padding;
			let h = 0;
			for(let [name, action] of Object.entries(this.actions)) {
				let element = skin.querySelector('.openlime-' + name).cloneNode(true);
				if(!element) continue;
				svg.appendChild(element);
				let box = element.getBBox();
				h = Math.max(h, box.height);
				let tlist = element.transform.baseVal;
				if(tlist.numberOfItems == 0)
					tlist.appendItem(svg.createSVGTransform());
				tlist.getItem(0).setTranslate(-box.x + x,-box.y);
				x += box.width + padding;
			}

			svg.setAttribute('viewBox', `0 0 ${x} ${h}`);
			svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		}

		//toolbar build from the skin directly
		if(0) {
			toolbar.appendChild(skin);

			let w = skin.getAttribute('width');
			let h = skin.getAttribute('height');
			let viewbox = skin.getAttribute('viewBox');
			if(!viewbox)
				skin.setAttribute('viewBox', `0 0 ${w} ${h}`);
		}
	}
	/* This is probably not needed at all 
	loadSkinCSS() {
		let link = document.createElement('link');
		link.rel = 'stylesheet';  
		link.type = 'text/css'; 
		link.href = this.skinCSS;  
		document.getElementsByTagName('HEAD')[0].appendChild(link);  
	} */



	setupActions() {
		for(let [name, action] of Object.entries(this.actions)) {
			let element = this.lime.containerElement.querySelector('.openlime-' + name);
			if(!element)
				continue;
			element.addEventListener('click', action.task);
		}
		let items = document.querySelectorAll('.openlime-layers-button');
		for(let item of items) {
			let id = item.getAttribute('data-layer');
			if(!id) continue;
			item.addEventListener('click', ()=> {
				this.setLayer(this.lime.layers[id]);
			});
		}
	}

	//we need the concept of active layer! so we an turn on and off light.
	toggleLightController() {
		let div = this.lime.containerElement;
		let active = div.classList.toggle('openlime-light-active');
		this.lightActive = active;

		for(let c of this.activeLayer.controllers)
			if(c.control == 'light')
				c.active = active;
	}

	toggleFullscreen() {
		let canvas = this.lime.canvasElement;
		let div = this.lime.containerElement;
		let active = div.classList.toggle('openlime-fullscreen-active');

		if(!active) {
			var request = document.exitFullscreen || document.webkitExitFullscreen ||
				document.mozCancelFullScreen || document.msExitFullscreen;
			request.call(document);

			this.lime.resize(canvas.offsetWidth, canvas.offsetHeight);
		} else {
			var request = div.requestFullscreen || div.webkitRequestFullscreen ||
				div.mozRequestFullScreen || div.msRequestFullscreen;
			request.call(div);
		}
		this.lime.resize(canvas.offsetWidth, canvas.offsetHeight);
	}

/* Layer management */

	selectLayers(event) {
		if(!this.layerMenu) {
			let ul = document.createElement('ul');
			ul.classList.add('openlime-layers-menu');
			for(let [name, layer] of Object.entries(this.lime.canvas.layers)) {
				let li = document.createElement('li');
				li.innerHTML = layer.label || name;
				li.addEventListener('click', ()=> {
					this.setLayer(layer);
					this.closeLayersMenu();
				});
				ul.appendChild(li);
			}
			this.lime.containerElement.appendChild(ul);
			this.layerMenu = ul;
		}
		this.layerMenu.style.left = event.offsetX + 'px';
		this.layerMenu.style.top = event.offsetY + 'px';
		this.layerMenu.style.display = 'block';
	}

	setLayer(layer_on) {
		this.activeLayer = layer_on;

		for(let layer of Object.values(this.lime.canvas.layers)) {
			layer.setVisible(layer == layer_on);
			for(let c of layer.controllers) {
				if(c.control == 'light')
					c.active = this.lightActive && layer == layer_on;
			}
		}
		this.lime.redraw();
	}

	closeLayersMenu() {
		this.layerMenu.style.display = 'none';
	}
}

export { UIBasic }
