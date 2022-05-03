import {Layer} from './Layer.js'
import { Raster } from './Raster.js';

class LayerDstretch extends Layer{
    constructor(options) {
		super(options);

		if(!this.url)
			throw "Url option is required";

		//this.shaders['dstretch'] = new ShaderDstretch();
		//this.setShader('rti');

		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.
		if(this.url)
			this.loadJson(this.url);
	}
	
	loadJson(url) {
		(async () => {
			var response = await fetch(this.url + "/dstretch_info.json");
			if(!response.ok) {
				this.status = "Failed loading " + this.url + "/dstretch_info.json: " + response.statusText;
				return;
			}
			let json = await response.json();
			// TODO: Init shader
			//this.shader.init(json);

			let urls = [url + "/" + json["image_name"]];
            let raster = new Raster({format : 'vec3'});

            this.rasters.push(raster);
			this.layout.setUrls(urls);

		})().catch(e => { console.log(e); this.status = e; });
	} 

	draw(transform, viewport) {
		this.worldRotation = transform.a + this.transform.a;
		return super.draw(transform, viewport);
	}
}

Layer.prototype.types['dstretch'] = (options) => { return new LayerDstretch(options); }

export { LayerDstretch }