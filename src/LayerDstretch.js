import {Layer} from './Layer.js';
import {ShaderDstretch} from './ShaderDstretch.js';
import { Raster } from './Raster.js';

class LayerDstretch extends Layer{
    constructor(options) {
		super(options);

		if(!this.url)
			throw "Url option is required";

		this.shaders['dstretch'] = new ShaderDstretch();
		this.setShader('dstretch');
		this.eulerRotation = [0,0,0];

		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.
		if(this.url)
			this.loadJson(this.url);

		this.addSliders();
	}

	addSliders() {
		let sliders = [document.createElement("input"), document.createElement("input"), document.createElement("input")];
		let labels = [document.createElement("label"), document.createElement("label"), document.createElement("label")];
		let axis = ["X", "Y", "Z"];
		
		for (let i=0; i<sliders.length; i++) {
			sliders[i].id = axis[i] + "-rot";
			sliders[i].setAttribute("type", "range");
			sliders[i].setAttribute("min", 0);
			sliders[i].setAttribute("max", 360);
			sliders[i].value = 0;
			sliders[i].oninput = this.updateSliders.bind(this);
			sliders[i].style = "width:400px;"

			labels[i].setAttribute("for", sliders[i].id);
			labels[i].innerHTML = axis[i] + " rotation";
			labels[i].id = sliders[i].id + "-label";
			
			document.body.appendChild(labels[i]);
			document.body.appendChild(sliders[i]);
		}		
	}

	updateSliders(event) {
		switch (event.target.id[0]) {
			case 'X':
				this.eulerRotation[0] = parseFloat(event.target.value) * (Math.PI / 180);
				break;
			case 'Y':
				this.eulerRotation[1] = parseFloat(event.target.value) * (Math.PI / 180);
				break;
			case 'Z':
				this.eulerRotation[2] = parseFloat(event.target.value) * (Math.PI / 180);
				break;
		}

		this.shader.updateRotationMatrix(this.eulerRotation);
		this.emit('update');
	}
	
	loadJson(url) {
		(async () => {
			var response = await fetch(this.url + "/dstretch_info.json");
			if(!response.ok) {
				this.status = "Failed loading " + this.url + "/dstretch_info.json: " + response.statusText;
				return;
			}
			let json = await response.json();
			this.shader.init(json);

			let urls = [url + "/" + json["image_name"]];
            let raster = new Raster({format : 'vec3'});

            this.rasters.push(raster);
			this.layout.setUrls(urls);

		})().catch(e => { console.log(e); this.status = e; });
	} 

	draw(transform, viewport) {
		this.shader.setMinMax();
		return super.draw(transform, viewport);
	}
}

Layer.prototype.types['dstretch'] = (options) => { return new LayerDstretch(options); }

export { LayerDstretch }