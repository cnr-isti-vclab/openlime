import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderBRDF } from './ShaderBRDF.js'

/**
 * Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but channels(ks,kd,normals,gloss) are required.
 */

class LayerBRDF extends Layer {
	constructor(options) {
		options = Object.assign({
			brightness: 1.0,
			gamma: 2.2,
			alphaLimits: [0.01, 0.5],
			monochromeMaterial: [0.80, 0.79, 0.75],
			kAmbient: 0.1
		}, options);
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.channels)
			throw "channels option is required";

		if(!this.channels.kd || !this.channels.normals)
			throw "kd and normals channels are required";
	
		if(!this.colorspaces) {
			console.log("LayerBRDF: missing colorspaces: force both to linear");
			this.colorspaces['kd'] = 'linear';
			this.colorspaces['ks'] = 'linear';
		}

		let id = 0;
		let urls = [];
		let samplers = [];
		let brdfSamplersMap = {
			kd: { format: 'vec3', name: 'uTexKd' },
			ks: { format: 'vec3', name: 'uTexKs' },
			normals: { format: 'vec3', name: 'uTexNormals' },
			gloss: { format: 'float', name: 'uTexGloss' }
		};
		for (let c in this.channels) {
			this.rasters.push(new Raster({ format: brdfSamplersMap[c].format }));
			samplers.push({ 'id': id, 'name': brdfSamplersMap[c].name });
			urls[id] = this.channels[c];
			id++;
		}

		this.layout.setUrls(urls);
		this.addControl('light', [0, 0]);
		
		let shader = new ShaderBRDF({
			'label': 'Rgb',
			'samplers': samplers,
			'colorspaces': this.colorspaces,
			'brightness': this.brightness,
			'gamma': this.gamma,
			'alphaLimits': this.alphaLimits,
			'monochromeMaterial': this.monochromeMaterial,
			'kAmbient': this.kAmbient
		});

		this.shaders['brdf'] = shader;
		this.setShader('brdf');
	}

	setLight(light, dt) {
		let r2 =  light[0]*light[0] + light[1]*light[1];
		if (r2 > 1.0) {
			let r = Math.sqrt(r2);
			light[0] /= r;
			light[1] /= r;
			r2 = 1.0;
		}
		light[2] = Math.sqrt(1-r2);
		this.setControl('light', light, dt);
	}

	interpolateControls() { // FIXME Wrong normalization
		let done = super.interpolateControls();
		if(!done) {
			let light = this.controls['light'].current.value;
			let r2 =  light[0]*light[0] + light[1]*light[1];
			if (r2 > 1.0) {
				let r = Math.sqrt(r2);
				light[0] /= r;
				light[1] /= r;
				r2 = 1.0;
			}
			light[2] = Math.sqrt(1-r2);
	
			//let z = Math.sqrt(1 - light[0]*light[0] - light[1]*light[1]);
			this.shader.setLight([light[0], light[1], light[2], 0]);
		}
		return done;
	}
}


Layer.prototype.types['brdf'] = (options) => { return new LayerBRDF(options); }

export { LayerBRDF }
