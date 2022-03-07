import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderBRDF } from './ShaderBRDF.js'
import { Shader } from './Shader.js'
import { Layout } from './Layout.js'

/**
 * Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but channels(ks,kd,normals,gloss) are required.
 */

class LayerBRDF extends Layer {
	constructor(options) {
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
		for (let c in this.channels) {
			let url = this.channels[c];
			switch (c) {
				case 'kd':
					this.rasters.push(new Raster({ type: 'vec3', attribute: 'kd', colorspace: this.colorspaces['kd'] }));
					samplers.push({ 'id': id, 'name': 'uTexKd' });
					break;
				case 'ks':
					this.rasters.push(new Raster({ type: 'vec3',  attribute: 'ks',      colorspace: this.colorspaces['ks'] }));
					samplers.push({ 'id': id, 'name': 'uTexKs' });
					break;
				case 'normals':
					this.rasters.push(new Raster({ type: 'vec3',  attribute: 'normals', colorspace: 'linear' }));
					samplers.push({ 'id': id, 'name': 'uTexNormals' });
					break;
				case 'gloss':
					this.rasters.push(new Raster({ type: 'float', attribute: 'gloss',   colorspace: 'linear' }));
					samplers.push({ 'id': id, 'name': 'uTexGloss' });
					break;

				default:
					break;
			}
			urls[id] = url;
			id++;
		}
		this.layout.setUrls(urls);
		
		let now = performance.now();
		this.controls['light'] = { source:{ value: [0, 0], t: now }, target:{ value:[0, 0], t:now }, current:{ value:[0, 0], t:now } };
		const brightness = options.brightness ? options.brightness : 1.0;
		const gamma = options.gamma ? options.gamma : 2.2;
		const alphaLimits = options.alphaLimits ? options.alphaLimits : [0.01, 0.5];

		let shader = new ShaderBRDF({
			'label': 'Rgb',
			'samplers': samplers,
			'colorspaces': this.colorspaces,
			'brightness': brightness,
			'gamma': gamma,
			'alphaLimits': alphaLimits
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

	interpolateControls() {
		let done = super.interpolateControls();
		if(!done) {
			let light = this.controls['light'].current.value;
			let r2 =  light[0]*light[0] + light[1]*light[1];
			if (r2 > 1.0) {
				light[0] /= r2;
				light[1] /= r2;
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
