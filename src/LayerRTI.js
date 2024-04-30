import { string } from '@tensorflow/tfjs';
import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderRTI } from './ShaderRTI.js'
import { Transform } from './Transform.js'

/**
 * Extends {@link Layer}, and can display a relightable images (RTI) using the 'relight' data format (see:
 * [relight on github]{@link https://github.com/cnr-isti-vclab/relight} for details).
 * This web-friendly format is composed of a info.json with RTI parametets and a set of images 
 * (plane_0.jpg, plane_1.jpg etc.) with encoded coefficients.
 * As with all other layers Deepzoom and other {@link Layout}s can be used.
 * 
 * The ligh direction can be changed programmatically using setLight.
 * 
 * @param {options} options Same as {@link Layer}, but url and layout are required.
 * **url**: points to a relight .json
 * **layout**: one of image, deepzoom, google, iiif, zoomify, tarzoom, itarzoom
 */

class LayerRTI extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.url)
			throw "Url option is required";

		// this.shaders['rti'] = new ShaderRTI({ normals: this.normals });
		this.shaders['rti'] = new ShaderRTI(this.shaderOptions);
		this.setShader('rti');

		this.addControl('light', [0, 0]);
		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.
		
		this.loadJson(this.url);
	}
/*
 *  Internal function to assemble the url needed to retrieve the image or the image tile.
 */
	imageUrl(url, plane) {
		let path = this.url.substring(0, this.url.lastIndexOf('/')+1);
		switch(this.layout.type) {
			case 'image':    return path + plane + '.jpg'; break;
			case 'google':   return path + plane;          break;
			case 'deepzoom': return path + plane + '.dzi'; break;
			case 'tarzoom':  return path + plane + '.tzi'; break;
			case 'itarzoom': return path + 'planes.tzi'; break;
			case 'zoomify':  return path + plane + '/ImageProperties.xml'; break;
			//case 'iip':      return this.plane.throw Error("Unimplemented");
			case 'iiif': throw Error("Unimplemented");
			default:     throw Error("Unknown layout: " + layout.type);
		}
	}

/*
 * Alias for setControl, changes light direction.
 * @param {Array} light light direction as an array [x, y]
 * @param {number} dt in ms, interpolation duration.
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
				let url = this.layout.imageUrl(this.url, 'plane_' + p);
				urls.push(url);
				let raster = new Raster({ format: 'vec3'});
				this.rasters.push(raster);
			}
			if(this.shader.normals) { // ITARZOOM must include normals and currently has a limitation: loads the entire tile 
				let url;
				if (typeof this.shader.normals === 'string')
					url = this.layout.imageUrl(this.url, this.shader.normals);
				else
					url = this.layout.imageUrl(this.url, 'normals');
				urls.push(url);
				let raster = new Raster({ format: 'vec3'});
				this.rasters.push(raster);				
			}	
			if(this.shader.albedo) { // ITARZOOM must include normals and currently has a limitation: loads the entire tile 
				let url;
				if (typeof this.shader.albedo === 'string')
					url = this.layout.imageUrl(this.url, this.shader.albedo);
				else
					url = this.layout.imageUrl(this.url, 'albedo');
				urls.push(url);
				let raster = new Raster({ format: 'vec3'});
				this.rasters.push(raster);				
			}	
			if(this.shader.mask) { // ITARZOOM must include normals and currently has a limitation: loads the entire tile 
				let url;
				if (typeof this.shader.mask === 'string')
					url = this.layout.imageUrl(this.url, this.shader.mask);
				else
					url = this.layout.imageUrl(this.url, 'mask');
				urls.push(url);
				let raster = new Raster({ format: 'vec3'});
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
