import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderRTI } from './ShaderRTI.js'
import { Transform } from './Transform.js'

/**
 * Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but url and layout are required.
 * **url**: points to a relight format .json
 * **plane**: url for the first coefficient (plane_0), needed for IIIF and IIP (without /info.json)
 */

class LayerRTI extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.url)
			throw "Url option is required";

		// if(!this.layout)
		// 	this.layout = 'image';

		// this.layout.setUrl(this.url);
		// this.setLayout(this.layout);

		this.shaders['rti'] = new ShaderRTI({ normals: this.normals });
		this.setShader('rti');

		this.addControl('light', [0, 0]);
		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.
		if(this.url)
			this.loadJson(this.url);
	}

	imageUrl(url, plane) {
		let path = this.url.substring(0, this.url.lastIndexOf('/')+1);
		switch(this.layout.type) {
			case 'image':    return path + plane + '.jpg'; break;
			case 'google':   return path + plane;          break;
			case 'deepzoom': return path + plane + '.dzi'; break;
			case 'tarzoom':  return path + plane + '.tzi'; break;
			case 'itarzoom':  return path + 'planes.tzi'; break;
			case 'zoomify':  return path + plane + '/ImageProperties.xml'; break;
			//case 'iip':      return this.plane.throw Error("Unimplemented");
			case 'iiif': throw Error("Unimplemented");
			default:     throw Error("Unknown layout: " + layout.type);
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
			let urls = [];
			for(let p = 0; p < this.shader.njpegs; p++) {
				let url = this.imageUrl(this.url, 'plane_' + p);
				urls.push(url);
				let raster = new Raster({ type: 'vec3', attribute: 'coeff', colorspace: 'linear' });
				this.rasters.push(raster);
			}
			if(this.normals) { // ITARZOOM must include normals and currently has a limitation: loads the entire tile 
				let url = this.imageUrl(this.url, 'normals');
				urls.push(url);
				let raster = new Raster({ type: 'vec3', attribute: 'coeff', colorspace: 'linear' });
				this.rasters.push(raster);				
			}			
			this.layout.setUrls(urls);

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
		return super.draw(transform, viewport);
	}
}

Layer.prototype.types['rti'] = (options) => { return new LayerRTI(options); }

export { LayerRTI }
