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

		this.layout.setUrls([this.url]);
		let raster = new Raster({ type: 'vec3', attribute: 'kd', colorspace: 'sRGB' });

		this.rasters.push(raster);
		

		let shader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id:0, name:'kd', type:'vec3' }]
		});
		
		shader.fragShaderSrc = function(gl) {

			let gl2 = !(gl instanceof WebGLRenderingContext);
			let str = `${gl2? '#version 300 es' : ''}

precision highp float;
precision highp int;

uniform sampler2D kd;

${gl2? 'in' : 'varying'} vec2 v_texcoord;
${gl2? 'out' : ''} vec4 color;


void main() {
	color = texture${gl2?'':'2D'}(kd, v_texcoord);
	${gl2? '':'gl_FragColor = color;'}
}
`;
			return str;

		};

		this.shaders = {'standard': shader };
		this.setShader('standard');
	}
}

Layer.prototype.types['image'] = (options) => { return new ImageLayer(options); }

export { ImageLayer }
