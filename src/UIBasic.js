import { Canvas } from './Canvas.js'
import { Layer } from './Layer.js'
import { Controller2D } from './Controller2D.js'

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
			style: 'skin.css',
			actions: {
				home:       { title: 'Home',       task: (event) => { if(this.ready) camera.fit(this.viewport, 250); } },
				zoomin:     { title: 'Zoom in',    task: (event) => { if(this.ready) camera.deltaZoom(250, 1.25, 0, 0); } },
				zoomout:    { title: 'Zoom out',   task: (event) => { if(this.ready) camera.deltaZoom(250, 1/1.25, 0, 0); } },
				light:      { title: 'Light',      task: (event) => { this.toggleLightController(); } },
				fullscreen: { title: 'Fullscreen', task: (event) => { this.toggleFullscreen(); } }
			},
			viewport: [0, 0, 0, 0] //in scene coordinates
		});

		if(options)
			Object.assign(this, options);

		for(let layer of Object.values(lime.canvas.layers)) {
			if(layer.controls.light) {
				let controller = new Controller2D((x, y)=>layer.setControl('light', [x, y], 100), { active:false });
				layer.controllers.push(controller);
			}
		}
		this.init();
	}



	init() {
		(async () => {

			if(this.skin)
				await this.loadSkin();

			this.setupActions();

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
		if(0) {
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
				element.transform.baseVal.getItem(0).setTranslate(-box.x + x,-box.y);
				x += box.width + padding;
			}
			Object.assign(svg.viewBox.baseVal, {x: 0, y: 0, width: x, height: h });
		}

		//toolbar build from the skin directly
		if(1) {
			toolbar.appendChild(skin);

			let w = skin.getAttribute('width');
			let h = skin.getAttribute('height');
			let viewbox = skin.getAttribute('viewBox');
			if(!viewbox)
				skin.setAttribute('viewBox', `0 0 ${w} ${h}`);
		}
	}



	setupActions() {
		for(let [name, action] of Object.entries(this.actions)) {
			let element = this.lime.containerElement.querySelector('.openlime-' + name);
			if(!element)
				continue;
			element.addEventListener('click', action.task);
		}
	}

	//we need the concept of active layer! so we an turn on and off light.
	toggleLightController() {
		let div = this.lime.containerElement;
		let active = div.classList.toggle('openlime-light-active');

		for(let layer of Object.values(this.lime.canvas.layers)) {
			if(layer.controls.light) {
				layer.controllers[0].active = active;
			}
		}
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

}

export { UIBasic }
