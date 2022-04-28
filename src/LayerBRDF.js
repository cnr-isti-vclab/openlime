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
		this.addControl('light', [0, 0]); // This is a projection to the z=0 plane.
		
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

	static projectToSphere(p) {
		let px = p[0];
		let py = p[1];

		let r2 = px * px + py * py;
		if (r2 > 1.0) {
			let r = Math.sqrt(r2);
			px /= r;
			py /= r;
			r2 = 1.0;
		}
		let z = Math.sqrt(1 - r2);
		return [px, py, z];
	}

	// Idea from SGI trackball, siggraph 1988 (e.g., http://gxsm.sourceforge.net/gxsmsrcdoxy/html/d2/db2/gxsm_2trackball_8C-source.html)
	// The point is projected to a sphere in the center, and deformed to a
	// hyperbolic sheet of rotation away from it in order to avoid
	// the acceleration due to projection on an increasingly vertical 
	// surface
	static projectToFlattenedSphere(p) {
		const R = 0.8; const R2 = R * R;
		const RR = R * Math.SQRT1_2; const RR2 = RR * RR;

		let px = Math.min(Math.max(p[0], -1.0), 1.0);
		let py = Math.min(Math.max(p[1], -1.0), 1.0);
		let z = 0.0;
		let d2 = px * px + py * py;
		if (d2 < RR2) {
			// Inside sphere
			z = Math.sqrt(R2 - d2);
		} else {
			// On hyperbola
			z = RR2 / Math.sqrt(d2);
		}
		let r = Math.sqrt(d2 + z * z);
		return [px / r, py / r, z / r];
	}

	setLight(light, dt, easing='linear') {
		this.setControl('light', light, dt, easing);
	}

	interpolateControls() { // FIXME Wrong normalization
		let done = super.interpolateControls();
//		let light = LayerBRDF.projectToSphere(this.controls['light'].current.value);
		let light = LayerBRDF.projectToFlattenedSphere(this.controls['light'].current.value);
		this.shader.setLight([light[0], light[1], light[2], 0]);
		return done;
	}
}


Layer.prototype.types['brdf'] = (options) => { return new LayerBRDF(options); }

export { LayerBRDF }
