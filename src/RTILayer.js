import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { RTIShader } from './RTIShader.js'
import { Layout } from './Layout.js'
import { Transform } from './Transform.js'

/**
 * Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but url and layout are required.
 * **url**: points to a relight format .json
 * **plane**: url for the first coefficient (plane_0), needed for IIIF and IIP (without /info.json)
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

		this.shaders['rti'] = new RTIShader();
		this.setShader('rti');

		let now = performance.now();
		this.controls['light'] = { source:{ value: [0, 0], t: now }, target:{ value:[0, 0], t:now }, current:{ value:[0, 0], t:now } };
		this.worldRotation = 0; //if the canvas or the layer rotate, light direction neeeds to be rotated too.
		if(this.url)
			this.loadJson(this.url);
	}

	planeUrl(url, plane) {
		let path = this.url.split('/').slice(0, -1).join('/') + '/';
		switch(this.layout) {
			case 'image':    return path + 'plane_' + plane + '.jpg'; break;
			case 'google':   return path + 'plane_' + plane;          break;
			case 'deepzoom': return path + 'plane_' + plane + '.dzi'; break;
			case 'tarzoom':  return path + 'plane_' + plane + '.tzi'; break;
			case 'zoomify':  return path + 'plane_' + plane + '/ImageProperties.xml'; break;
			//case 'iip':      return this.plane.throw Error("Unimplemented");
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

	loadJson(url) {
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let json = await response.json();
			this.shader.init(json);

			let size = {width:this.width, height:this.height};
			for(let p = 0; p < this.shader.njpegs; p++) {
				let url = this.planeUrl(this.url, p);
				let raster = new Raster({ url: url, type: 'vec3', attribute: 'coeff', colorspace: 'linear' });
				if(p == 0 || this.layout == 'tarzoom')
					raster.layout = new Layout(url, this.layout, size);
				else
					raster.layout = this.rasters[0].layout;
				this.rasters.push(raster);
			}

			
			this.setLayout(this.rasters[0].layout);

		})().catch(e => { console.log(e); this.status = e; });
	}

/*
 *  Internal function: light control maps to light direction in the shader.
 */
	interpolateControls() {
		let done = super.interpolateControls();
		if(!done) {
			let light = this.controls['light'].current.value;
			//this.shader.setLight(light);
			let rotated = Transform.rotate(light[0], light[1], this.worldRotation*Math.PI);
			this.shader.setLight([rotated.x, rotated.y]);
		}
		return done;
	}
	draw(transform, viewport) {
		this.worldRotation = transform.a + this.transform.a;
		super.draw(transform, viewport);
	}
}

Layer.prototype.types['rti'] = (options) => { return new RTILayer(options); }

export { RTILayer }
