import { Shader } from './Shader.js'

/**
 * @typedef {Object} ShaderRSC~Basis
 * Configuration data for basis functions
 * @property {Float32Array} [basis] - PCA basis for rbf and bln modes
 * @property {number[][]} [lights] - Light directions for rbf interpolation
 * @property {number} [sigma] - RBF interpolation parameter
 * @property {number} [ndimensions] - PCA dimension space
 */

/**
 * @typedef {Object} ShaderRSC~Options
 * Configuration options for RTI shader
 * @property {string} [mode='normal'] - Initial rendering mode
 * @property {string} [type] - Basis type: 'ptm'|'hsh'|'sh'|'rbf'|'bln'
 * @property {string} [colorspace] - Color space: 'lrgb'|'rgb'|'mrgb'|'mycc'
 * @property {number} [nplanes] - Number of coefficient planes
 * @property {number[]} [yccplanes] - Number of planes for YCC components
 * @property {Object} [material] - Material parameters for dequantization
 */

/**
 * ShaderRSC implements various Reflectance Transformation Imaging techniques.
 * Works in conjunction with LayerRTI for interactive relighting of cultural heritage objects.
 * 
 * Supported Basis Types:
 * - PTM (Polynomial Texture Maps)
 * - HSH (Hemispherical Harmonics)
 * - SH (Spherical Harmonics)
 * - RBF (Radial Basis Functions)
 * - BLN (Bilinear Interpolation)
 * 
 * Features:
 * - Multiple rendering modes (light, normals, diffuse, specular)
 * - Various color space support
 * - Automatic basis selection
 * - Real-time coefficient interpolation
 * - Normal map visualization
 * - Material property control
 * 
 * Technical Implementation:
 * - Efficient GPU-based relighting
 * - Dynamic shader generation
 * - Coefficient plane management
 * - Light vector transformation
 * - Color space conversion
 * 
 * @extends Shader
 */
class ShaderRSC extends Shader {
	/**
	 * Creates a new RTI shader
	 * @param {ShaderRSC~Options} [options] - Configuration options
	 * 
	 * @example
	 * ```javascript
	 * // Create PTM shader
	 * const shader = new ShaderRSC({
	 *     type: 'ptm',
	 *     colorspace: 'rgb',
	 *     mode: 'light'
	 * });
	 * ```
	 */
	constructor(options) {
		super({});

		Object.assign(this, {
			modes: ['light', 'normals', 'diffuse', 'gray_diffuse', 'specular'],
			mode: 'normal',
			type: ['ksvd'],

			nplanes: null,     //number of coefficient planes
			yccplanes: null,     //number of luminance planes for mycc color space
			njpegs: null,      //number of textures needed (ceil(nplanes/3))
			material: null,    //material parameters
			lights: null,      //light directions (needed for rbf interpolation)
			sigma: null,       //rbf interpolation parameter
			ndimensions: null, //PCA dimension space (for rbf and bln)

			scale: null,      //factor and bias are used to dequantize coefficient planes.
			bias: null,

			basis: null,       //PCA basis for rbf and bln
			lweights: null    //light direction dependent coefficients to be used with coefficient planes
		});
		Object.assign(this, options);

		if (this.relight)
			this.init(this.relight);

		this.setMode('light');
	}

	/**
	 * Sets the rendering mode
	 * @param {string} mode - One of: 'light', 'normals', 'diffuse', 'gray_diffuse', 'specular'
	 * @throws {Error} If mode is not recognized
	 */
	setMode(mode) {
		if (!(this.modes.includes(mode)))
			throw Error("Unknown mode: " + mode);
		this.mode = mode;
		this.needsUpdate = true;
	}

	updateUniforms(gl) {
		// if (this.mode != 'light' && !this.uniforms.base1.value) {
		// 	this.lightWeights([0.612, 0.354, 0.707], 'base');
		// 	this.lightWeights([-0.612, 0.354, 0.707], 'base1');
		// 	this.lightWeights([0, -0.707, 0.707], 'base2');
		// }
		super.updateUniforms(gl);
	}

	/**
	 * Updates light direction for relighting
	 * @param {number[]} light - Light vector [x, y], automatically normalized
	 * @throws {Error} If shader is not initialized
	 */
	setLight(light) {
		// if (!this.uniforms.light)
		// 	throw "Shader not initialized, wait on layer ready event for setLight."

		// let x = light[0];
		// let y = light[1];

		// //map the square to the circle.
		// let r = Math.sqrt(x * x + y * y);
		// if (r > 1) {
		// 	x /= r;
		// 	y /= r;
		// }
		// let z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
		// light = [x, y, z];

		// if (this.mode == 'light')
		// 	this.lightWeights(light, 'base');
		// this.setUniform('light', light);
	}

	/**
	 * Sets specular exponent for specular enhancement mode
	 * @param {number} value - Specular exponent
	 */
	setSpecularExp(value) {
		this.setUniform('specular_exp', value);
	}

	/**
	 * Initializes shader with RTI configuration
	 * @param {Object} relight - RTI configuration data
	 * @param {string} relight.type - Basis type
	 * @param {string} relight.colorspace - Color space
	 * @param {Object} relight.material - Material parameters
	 * @param {number[]} relight.basis - Optional PCA basis
	 */
	init(config) {
		this.config = {};
		Object.assign(this.config, config);

		console.log("SHADER CONFIG: ", this.config);

		this.samplers = [];


		this.samplers.push({ id: 0, name: 'avg', samplerType: 'usampler2D' });

		this.uniforms = {
			light: { type: 'vec3', needsUpdate: true, size: 3, value: [0.0, 0.0, 1] },
			// specular_exp: { type: 'float', needsUpdate: false, size: 1, value: 10 },
			// bias: { type: 'vec3', needsUpdate: true, size: this.nplanes / 3, value: this.bias },
			// scale: { type: 'vec3', needsUpdate: true, size: this.nplanes / 3, value: this.scale },
			// base: { type: 'vec3', needsUpdate: true, size: this.nplanes },
			// base1: { type: 'vec3', needsUpdate: false, size: this.nplanes },
			// base2: { type: 'vec3', needsUpdate: false, size: this.nplanes }
		}

	}

	fragShaderSrc() {
		let str = `
in vec2 v_texcoord;

vec4 data() {
    // Use texture() for usampler2D (returns uvec4 with uint values 0-65535)
    uvec4 raw = texture(avg, v_texcoord);

    // Convert from uint [0-65535] to float [0-1]
    vec3 color = vec3(raw.r, raw.g, raw.b) / 65535.0;
		//if (raw.r == 0u && raw.g == 0u && raw.b == 0u) color = vec3(1.0, 0.0, 0.0);


    // Simple processing: mix with luminance to see the effect
    //float luma = dot(color, vec3(0.299, 0.587, 0.114));
    //color = mix(color, vec3(luma), 0.2);
    return vec4(color, 1.0);
}
`;
		return str;
	}
}

export { ShaderRSC }

