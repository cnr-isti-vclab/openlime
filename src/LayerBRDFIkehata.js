import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'
import { ShaderBRDFIkehata } from './ShaderBRDFIkehata.js';
import { Transform } from './Transform.js';

/**
 * The class LayerImage is derived from Layer and it is responsible for the rendering of simple images.
 * 
 * @example
 * // Create an image layer and add it to the canvans
 * const layer = new OpenLIME.Layer({
 *     layout: 'image',
 *     type: 'image',
 *     url: '../../assets/lime/image/lime.jpg'
 * });
 * lime.addLayer('Base', layer);
 */
class LayerBRDFIkehata extends Layer {
	/**
 	* Displays a simple image.
 	* An object literal with Layer `options` can be specified.
	* The class LayerImage can also be instantiated via the Layer parent class and `options.type='image'`.
 	*
	  Extends {@link Layer}.
 	* @param {Object} options an object literal with Layer options {@link Layer}, but `options.url` and `options.layout` are required.
 	* @param {string} options.url The URL of the image
 	* @param {(string|Layout)} options.layout='image' The layout (the format of the input raster images).
 	*/
	constructor(options) {	
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

        this.ikehata_maps = ['normals', 'base', 'metallic', 'roughness'];
		this.worldRotation = 0;

		// use url for reference, use this.modes for actual urls
		let textureUrls = [];
		for (let map of this.ikehata_maps)
			textureUrls.push(this.layout.imageUrl(this.url, map));

		if(this.mask) { // ITARZOOM must include normals and currently has a limitation: loads the entire tile 
			let url;
			if (typeof this.mask === 'string')
				url = this.mask;
			else
				url = this.layout.imageUrl(this.url, 'mask');	
			textureUrls.push(url);		
		}

		this.layout.setUrls(textureUrls);

		const rasterFormat = this.format != null ? this.format : 'vec4';
		for (let url of textureUrls) {
			let raster = new Raster({ format: rasterFormat }); //FIXME select format for GEO stuff
			this.rasters.push(raster);
		}

		this.addControl('light', [0, 0]);

		let shader = new ShaderBRDFIkehata(this.shaderOptions);
		this.shaders = {'brdf_ikehata': shader };
		this.setShader('brdf_ikehata');
	}

	setLight(light, dt) {
		this.setControl('light', light, dt);
	}

	interpolateControls() {
		let done = super.interpolateControls();
		if (!done) {
			let light = this.controls['light'].current.value;
			light = this.rotateLight(light);
			this.shader.setLight(light);
		}
		return done;
	}

	draw(transform, viewport) {
		this.worldRotation = transform.a + this.transform.a;
		return super.draw(transform, viewport);
	}
}

Layer.prototype.types['brdf_ikehata'] = (options) => { return new LayerBRDFIkehata(options); }

export { LayerBRDFIkehata }
