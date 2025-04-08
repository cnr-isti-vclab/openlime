import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderBRDF } from './ShaderBRDF.js'

/**
 * @typedef {Object} LayerBRDFOptions
 * @property {Object} channels - Required channels for BRDF rendering
 * @property {string} channels.kd - URL to diffuse color map (required)
 * @property {string} channels.ks - URL to specular color map (optional)
 * @property {string} channels.normals - URL to normal map (required)
 * @property {string} channels.gloss - URL to glossiness/roughness map (optional)
 * @property {Object} [colorspaces] - Color space definitions for material properties
 * @property {('linear'|'srgb')} [colorspaces.kd='linear'] - Color space for diffuse map
 * @property {('linear'|'srgb')} [colorspaces.ks='linear'] - Color space for specular map
 * @property {number} [brightness=1.0] - Overall brightness adjustment
 * @property {number} [gamma=2.2] - Gamma correction value
 * @property {number[]} [alphaLimits=[0.01, 0.5]] - Range for glossiness/roughness
 * @property {number[]} [monochromeMaterial=[0.80, 0.79, 0.75]] - RGB color for monochrome rendering
 * @property {number} [kAmbient=0.1] - Ambient light coefficient
 * @extends LayerOptions
 */

/**
 * LayerBRDF implements real-time BRDF (Bidirectional Reflectance Distribution Function) rendering.
 * 
 * The BRDF model describes how light reflects off a surface, taking into account:
 * - Diffuse reflection (rough, matte surfaces)
 * - Specular reflection (mirror-like reflections)
 * - Surface normals (microscopic surface orientation)
 * - Glossiness/roughness (surface micro-structure)
 * 
 * Features:
 * - Real-time light direction control
 * - Multiple material channels support
 * - Customizable material properties
 * - Interactive lighting model
 * - Gamma correction
 * - Ambient light component
 * 
 * Technical implementation:
 * - Uses normal mapping for surface detail
 * - Supports both linear and sRGB color spaces
 * - Implements spherical light projection
 * - Handles multi-channel textures
 * - GPU-accelerated rendering
 * 
 * @extends Layer
 * 
 * @example
 * ```javascript
 * // Create BRDF layer with all channels
 * const brdfLayer = new OpenLIME.LayerBRDF({
 *   channels: {
 *     kd: 'diffuse.jpg',
 *     ks: 'specular.jpg',
 *     normals: 'normals.jpg',
 *     gloss: 'gloss.jpg'
 *   },
 *   colorspaces: {
 *     kd: 'srgb',
 *     ks: 'linear'
 *   },
 *   brightness: 1.2,
 *   gamma: 2.2
 * });
 * 
 * // Update light direction
 * brdfLayer.setLight([0.5, 0.5], 500, 'ease-out');
 * ```
 */
class LayerBRDF extends Layer {
	/**
	 * Creates a new LayerBRDF instance
	 * @param {LayerBRDFOptions} options - Configuration options
	 * @throws {Error} If required channels (kd, normals) are not provided
	 * @throws {Error} If rasters option is not empty
	 */
	constructor(options) {
		options = Object.assign({
			brightness: 1.0,
			gamma: 2.2,
			alphaLimits: [0.01, 0.5],
			monochromeMaterial: [0.80, 0.79, 0.75],
			kAmbient: 0.1
		}, options);
		super(options);

		if (Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if (!this.channels)
			throw "channels option is required";

		if (!this.channels.kd || !this.channels.normals)
			throw "kd and normals channels are required";

		if (!this.colorspaces) {
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
			this.rasters.push(new Raster({ format: brdfSamplersMap[c].format, isLinear: true }));
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

	/**
	 * Projects a 2D point onto a sphere surface
	 * Used for converting 2D mouse/touch input to 3D light direction
	 * @param {number[]} p - 2D point [x, y] in range [-1, 1]
	 * @returns {number[]} 3D normalized vector [x, y, z] on sphere surface
	 * @static
	 */
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

	/**
	 * Projects a 2D point onto a flattened sphere using SGI trackball algorithm.
	 * This provides more intuitive light control by avoiding acceleration near edges.
	 * Based on SIGGRAPH 1988 paper on SGI trackball implementation.
	 * 
	 * @param {number[]} p - 2D point [x, y] in range [-1, 1]
	 * @returns {number[]} 3D normalized vector [x, y, z] on flattened sphere
	 * @static
	 */
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

	/**
	 * Sets the light direction with optional animation
	 * @param {number[]} light - 2D vector [x, y] representing light direction
	 * @param {number} [dt] - Animation duration in milliseconds
	 * @param {string} [easing='linear'] - Animation easing function
	 */
	setLight(light, dt, easing = 'linear') {
		this.setControl('light', light, dt, easing);
	}

	/**
	 * Updates light control interpolation and shader uniforms
	 * @returns {boolean} Whether all interpolations are complete
	 * @override
	 * @private
	 */
	interpolateControls() { // FIXME Wrong normalization
		let done = super.interpolateControls();
		//		let light = LayerBRDF.projectToSphere(this.controls['light'].current.value);
		let light = LayerBRDF.projectToFlattenedSphere(this.controls['light'].current.value);
		this.shader.setLight([light[0], light[1], light[2], 0]);
		return done;
	}
}


/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['brdf'] = (options) => { return new LayerBRDF(options); }

export { LayerBRDF }
