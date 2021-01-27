import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'
import { Layout } from './Layout.js'


class ImageLayer extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.url)
			throw "Url option is required";

		if(!this.layout)
			this.layout = 'image';

		this.setLayout(new Layout(this.url, this.layout));
		this.rasters.push(new Raster({ url: this.url, type: 'vec3', attribute: 'kd', colorspace: 'sRGB' }));


		let shader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id:0, attribute:'kd', type:'vec3' }],
			'body': `
#version 100

precision highp float; 
precision highp int; 

varying vec2 v_texcoord;
uniform sampler2D kd;

void main() {
	gl_FragColor = texture2D(kd, v_texcoord);
}
`
		});

		this.shaders = {'standard': shader };
		this.setShader('standard');
	}
}

Layer.prototype.types['image'] = (options) => { return new ImageLayer(options); }

export { ImageLayer }
