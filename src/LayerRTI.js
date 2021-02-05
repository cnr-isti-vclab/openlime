import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderRTI } from './ShaderRTI.js'
import { Layout } from './Layout.js'
import { Controller2D } from './Controller2D.js'

/**
 * Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but url and layout are required.
 */

class LayerRTI extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.url)
			throw "Url option is required";

		if(!this.layout)
			this.layout = 'image';

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
	
	init(url) {
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let json = await response.json();

			let shader = new ShaderRTI({'relight': json});
			this.shaders['rti'] = shader;
			this.setShader('rti');

			let controller = new Controller2D((x, y)=>shader.setLight([x, y]), { hover: true });
			this.controllers.push(controller);

			for(let p = 0; p < shader.njpegs; p++)
				this.rasters.push(new Raster({ url: this.planeUrl(this.url, p), type: 'vec3', attribute: 'coeff', colorspace: 'linear' }));

			let size = {width:this.width, height:this.height};
			this.setLayout(new Layout(this.planeUrl(this.url, 0), this.layout, size));


		})().catch(e => { console.log(e); this.status = e; });
	}
}

Layer.prototype.types['rti'] = (options) => { return new LayerRTI(options); }

export { LayerRTI }
