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
			skin: null, //'skin.min.svg',
			style: null, //'skin.css',
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

	setupActions() {
		for(let [name, action] of Object.entries(this.actions)) {
			let element = this.lime.containerElement.querySelector('.openlime-' + name);
			if(!element)
				continue;
			element.addEventListener('click', action.task);
		}
	}
	async loadSkin() {
		var response = await fetch(this.skin);
		if(!response.ok) {
			throw Error("Failed loading " + url + ": " + response.statusText);
			return;
		}

		let text = await response.text();
		this.containerElement.innerHTML += text;

/*			for(let i in t.actions) {
				let action = t.actions[i];
				html+= '		<div class="relight-' + i + '" title="' + action.title + '"></div>\n';
			} */
	}
/* home.getBBox() //x and y width and height. 
	home.transform.baseVal.getItem(0).matrix.e, f = (x, y) //scale and translate
*/
}

export { UIBasic }
