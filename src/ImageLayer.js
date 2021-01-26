import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'


class ImageLayer extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.url)
			throw "Url option is required";

		if(!this.layout) this.layout = 'image';
		this.rasters[0] = new Raster({url: this.url, layout: this.layout, type: 'vec3', attribute: 'kd', colorspace: 'sRGB'});

		let shader = new Shader({
			'label': 'Rgb',
			'samplers': { 'color': 'rgb' },
			'body': `
	return texture2D(color, vTexCoord);
`
		});
	}
}

Layer.prototype.types['image'] = (options) => { return new ImageLayer(options); }

export { ImageLayer }
