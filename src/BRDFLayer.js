import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderBRDF } from './ShaderBRDF.js'
import { Shader } from './Shader.js'
import { Layout } from './Layout.js'

/**
 * Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but channels(ks,kd,normals,gloss) are required.
 */

class BRDFLayer extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.channels)
			throw "channels option is required";
	
		if(!this.colorspaces) {
			console.log("LayerBRDF: missing colorspaces: force both to linear");
			this.colorspaces['kd'] = 'linear';
			this.colorspaces['ks'] = 'linear';
		}

		if(!this.layout)
			this.layout = 'image';

		this.rasters.push(new Raster({ url: this.channels['kd'],      type: 'vec3',  attribute: 'kd',      colorspace: this.colorspaces['kd'] }));
		this.rasters.push(new Raster({ url: this.channels['ks'],      type: 'vec3',  attribute: 'ks',      colorspace: this.colorspaces['ks'] }));
		this.rasters.push(new Raster({ url: this.channels['normals'], type: 'vec3',  attribute: 'normals', colorspace: 'linear' }));
		this.rasters.push(new Raster({ url: this.channels['gloss'],   type: 'float', attribute: 'gloss',   colorspace: 'linear' }));
		
		let size = {width:this.width, height:this.height};
		this.setLayout(new Layout(this.channels['kd'], this.layout, size));
		
		let shader = new ShaderBRDF({'label': 'Rgb', 
									 'samplers': [ { id:0, name: 'uTexKd'}, 
												   { id:1, name: 'uTexKs'},
												   { id:2, name: 'uTexNormals'},
												   { id:3, name: 'uTexGloss'}],
									 'colorspaces': this.colorspaces});

		this.shaders['brdf'] = shader;
		this.setShader('brdf');
	}
}


Layer.prototype.types['brdf'] = (options) => { return new LayerBRDF(options); }

export { BRDFLayer }
