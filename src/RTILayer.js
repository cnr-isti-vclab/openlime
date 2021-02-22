import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderRTI } from './ShaderRTI.js'
import { Layout } from './Layout.js'
import { Controller2D } from './Controller2D.js'

/**
 * Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but url and layout are required.
 */

class RTILayer extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.url)
			throw "Url option is required";

		if(!this.layout)
			this.layout = 'image';

		this.shaders['rti'] = new ShaderRTI();
		this.setShader('rti');

		let now = performance.now();
		this.controls['light'] = { source:{ value: [0, 0], t: now }, target:{ value:[0, 0], t:now }, current:{ value:[0, 0], t:now } };

		if(this.url)
			this.init(this.url);
	}

	planeUrl(url, plane) {
		let path = this.url.split('/').slice(0, -1).join('/') + '/';
		switch(this.layout) {
			case 'image':    return path + 'plane_' + plane + '.jpg'; break;
			case 'google':   return path + 'plane_' + plane;          break;
			case 'deepzoom': return path + 'plane_' + plane + '.dzi'; break;
			case 'zoomify':  return path + 'plane_' + plane + '/ImageProperties.xml'; break;
			case 'iip':  throw Error("Unimplemented");
			case 'iiif': throw Error("Unimplemented");
			default:     throw Error("Unknown layout: " + layout);
		}
	}

/*
 * Alias for setControl
 * @param {Array} light light direction as an array [x, y]
 * @param {number} dt delay
 */
	setLight(light, dt) {
		this.setControl('light', light, dt);
	}

	init(url) {
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let json = await response.json();
			this.shader.init(json);

			for(let p = 0; p < this.shader.njpegs; p++)
				this.rasters.push(new Raster({ url: this.planeUrl(this.url, p), type: 'vec3', attribute: 'coeff', colorspace: 'linear' }));

			let size = {width:this.width, height:this.height};
			this.setLayout(new Layout(this.planeUrl(this.url, 0), this.layout, size));

			let controller = new Controller2D((x, y)=>this.setControl('light', [x, y], 100), { active:false, control:'light' });
			this.controllers.push(controller);

		})().catch(e => { console.log(e); this.status = e; });
	}

/*
 *  Internal function: light control maps to light direction in the shader.
 */
	interpolateControls() {
		let done = super.interpolateControls();
		if(!done) {
			let light = this.controls['light'].current.value;
			this.shader.setLight(light);
		}
		return done;
	}
}

Layer.prototype.types['rti'] = (options) => { return new LayerRTI(options); }

export { RTILayer }
