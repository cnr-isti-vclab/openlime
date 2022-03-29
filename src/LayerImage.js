import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'

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
class LayerImage extends Layer {
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

		if(!this.url)
			throw "Url option is required";

		this.layout.setUrls([this.url]);
		const rasterFormat = this.format != null ? this.format : 'vec4';
		let raster = new Raster({ format: rasterFormat, attribute: 'kd', colorspace: 'sRGB' });

		this.rasters.push(raster);
		

		let shader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id:0, name:'kd', type: rasterFormat }]
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

Layer.prototype.types['image'] = (options) => { return new LayerImage(options); }

export { LayerImage }
