import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'
import { Layout } from './Layout.js'

/**
 * Display a simple image. Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but url and layout are required.
 */

class ImageLayer extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.url)
			throw "Url option is required";

		if(!this.layout)
			this.layout = 'image';

		

		let size = {width:this.width || 0, height:this.height || 0 };
		this.setLayout(new Layout(this.url, this.layout, size));
		let raster = new Raster({ url: this.url, type: 'vec3', attribute: 'kd', colorspace: 'sRGB' });
		raster.layout = this.layout;

		this.rasters.push(raster);
		

		let shader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id:0, name:'kd', type:'vec3' }],
			'body': `#version 300 es

precision highp float; 
precision highp int; 

uniform sampler2D kd;

in vec2 v_texcoord;
out vec4 color;


void main() {
	color = texture(kd, v_texcoord);
}
`
		});

		this.shaders = {'standard': shader };
		this.setShader('standard');
	}
}

Layer.prototype.types['image'] = (options) => { return new ImageLayer(options); }

export { ImageLayer }
