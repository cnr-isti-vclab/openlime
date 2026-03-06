import { Shader } from './Shader.js'
import { Util } from './Util.js'

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
	 * Creates a new RSC shader
	 * @param {ShaderRSC~Options} [options] - Configuration options
	 * 
	 * @example
	 * ```javascript
	 * // Create RSC shader
	 * const shader = new ShaderRSC({
	 *     type: 'rsc',
	 *     colorspace: 'rgb',
	 *     mode: 'light'
	 * });
	 * ```
	 */
	constructor(options) {
		super(options);

		Object.assign(this, {
			modes: ['light', 'debug', 'avg', 'idx00', 'idx01', 'coef00', 'coef01', 'dictionary'], 
			mode: 'light',
			type: ['ksvd'],
		});
		Object.assign(this, options);
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
		// DO SOMETHING IF NECESSARY
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
		if (!this.uniforms.light)
			throw "Shader not initialized, wait on layer ready event for setLight."

		let x = light[0];
		let y = light[1];

		//map the square to the circle.
		let r = Math.sqrt(x * x + y * y);
		if (r > 1) {
			x /= r;
			y /= r;
		}
		let z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
		light = [x, y, z];

		this.setUniform('light', light);
	}	

	/**
	 * Initializes shader with RTI configuration
	 * @param {Object} config - RSC configuration data
	 */
	init(config) {
		this.config = config;

		// SAMPLERS
		let sampler_counter = 0;
		this.samplers = [];
		this.samplers.push({ id: sampler_counter++, name: 'avg', samplerType: 'sampler2D' });
		for(let i = 0; i < config.input_params.sparsity_multiplier; ++i) {
			const sampler_name = 'idx' + Util.padZeros(i, 2);
			this.samplers.push({ id: sampler_counter++, name: sampler_name, samplerType: 'usampler2D' });
		}
		for(let i = 0; i < config.input_params.sparsity_multiplier; ++i) {
			const sampler_name = 'coef' + Util.padZeros(i, 2);
			this.samplers.push({ id: sampler_counter++, name: sampler_name, samplerType: 'sampler2D' });
		}
		
		// UNIFORMS
		// Average stored in 8 bit png
		// Dictionary stored in 16 bit png
		// Coefficients stored in 8 jpg, converted to float directly by loader
		// Indices stored in 10 bits packed in 32 bit uvec4
		const avg_min = [this.config.output_params.average_quantizer_min_max[0][0],
						 this.config.output_params.average_quantizer_min_max[1][0],
						 this.config.output_params.average_quantizer_min_max[2][0]];
		const  avg_scale = [this.config.output_params.average_quantizer_min_max[0][1] - this.config.output_params.average_quantizer_min_max[0][0],
								this.config.output_params.average_quantizer_min_max[1][1] - this.config.output_params.average_quantizer_min_max[1][0],
								this.config.output_params.average_quantizer_min_max[2][1] - this.config.output_params.average_quantizer_min_max[2][0]];   
		const dictionary_min = [this.config.output_params.dictionary_quantizer_min_max[0][0],
									this.config.output_params.dictionary_quantizer_min_max[1][0],
									this.config.output_params.dictionary_quantizer_min_max[2][0]];
		const dictionary_scale = [this.config.output_params.dictionary_quantizer_min_max[0][1] - this.config.output_params.dictionary_quantizer_min_max[0][0],
									this.config.output_params.dictionary_quantizer_min_max[1][1] - this.config.output_params.dictionary_quantizer_min_max[1][0],
									this.config.output_params.dictionary_quantizer_min_max[2][1] - this.config.output_params.dictionary_quantizer_min_max[2][0]];

		const sparsity_multiplier = this.config.input_params.sparsity_multiplier;
		const sparsity = this.config.output_params.sparsity;
		const coef_min = new Float32Array(sparsity);
		const coef_scale = new Float32Array(sparsity);

		for(let i = 0; i < sparsity; ++i) {
			const cqmmi = this.config.output_params.coefficient_quantizer_min_max[i];
			coef_min[i] = cqmmi[0];
			coef_scale[i] = cqmmi[1] - cqmmi[0];
		}
		
		const atom_size = [this.config.input_params.dictionary_atlas_atom_tile_w,  this.config.input_params.dictionary_atlas_atom_tile_h];
		const atom_count_x = this.config.input_params.dictionary_atlas_atom_tile_nx ? this.config.input_params.dictionary_atlas_atom_tile_nx : 32;

		this.registerUniforms({
			light: { type: 'vec3', needsUpdate: true, size: 3, value: [0.0, 0.0, 1] },

			average_min: { type: 'vec3', needsUpdate: false, size: 1, value: avg_min },
			average_scale: { type: 'vec3', needsUpdate: false, size: 1, value: avg_scale },
			coefficients_min: { type: 'vec3', needsUpdate: false, size: sparsity, value: coef_min },
			coefficients_scale: { type: 'vec3', needsUpdate: false, size: sparsity, value: coef_scale },
			dictionary_min: { type: 'vec3', needsUpdate: false, size: 1, value: dictionary_min },
			dictionary_scale: { type: 'vec3', needsUpdate: false, size: 1, value: dictionary_scale },
			dictionary_atlas_atom_tile_size: { type: 'vec2', needsUpdate: false, size: 1, value: atom_size},
			dictionary_atom_count_x: { type: 'int', needsUpdate: false, size: 1, value: atom_count_x},
			sparsity_multiplier: { type: 'int', needsUpdate: false, size: 1, value: sparsity_multiplier}, 
		});

		// Print all registered uniforms to console
		Object.entries(this.uniforms).forEach(([key, uniform]) => {
			console.log(`${key}:`, uniform.value);
		});

		// console.log("SHADER CODE");
		// console.log(this.fragShaderSrc());
		
		this.needsUpdate = true;
	}

	// Return a shader string to fetch index idx and convert to 3 10 bits components stored in a var called param_name
	get_decoded_index(idx, param_name) {
		let str = `uvec4 val = texture(` + idx + `, v_texcoord);
uint decoded_uint = (val.r << 0) | (val.g << 8) | (val.b << 16) | (val.a << 24);
uint mask = uint(1023);
uvec3 ` + param_name + ` = uvec3((decoded_uint >> 0) & mask, (decoded_uint >> 10) & mask, (decoded_uint>>20) & mask); 
`;

		return str;
	}

	// Return a shader string to fetch index idx and converted from 3 10 bits component to rgb float values
	get_index_color_str(idx, param_name="color") {
		let str = this.get_decoded_index(idx, "index");
		str += `float scale = 1.0 / float(mask);
vec3 ` + param_name + ` = vec3(index.r, index.g, index.b) * scale;
`;

		return str;
	}

	// Return shader string to fetch the average color dequantized and store into param_name
	get_average_color_str(param_name="color") {
		// Return color visible from the image (without scaling and min)
    let str = `vec3 ${param_name} = texture(avg, v_texcoord).rgb;
`;
		return str;
	}

	// Return shader string to fetch the coefficient idx (idx00 or idx01) color dequantized and store into param_name
	get_coefficient_color_str(idxstr, idx, param_name="color") {
		// Return color visible from the image (without scaling and min)
		let str = `vec3 ${param_name} = texture( ${idxstr}, v_texcoord).rgb * coefficients_scale[${idx}] + coefficients_min[${idx}];
`;
		return str;
	}


	get_dictionary_color_str(param_name="color") {
	// Return shader string to fetch the coefficient idx (idx00 or idx01) color dequantized and store into param_name
    let str = `vec3 ${param_name} = texture(dict, v_texcoord).rgb * average_scale + average_min;	
`;
		return str;
	}


	// Sparse coding relighting shader part
	sparse_coding_relight_str() {
		let str = `
	// Relight Sparse Coding Shader Code

	// Get Light Direction uv in [0..1]
	vec2 light_dir_uv = uv_from_light_direction(light);

	// Initialize result to avg
	vec4 uval = texture(avg, v_texcoord);
	vec3 color = vec3(uval.r, uval.g, uval.b) * average_scale + average_min;
`;
		
		const sparsity_multiplier = this.config.input_params.sparsity_multiplier;
		for(let i = 0; i < sparsity_multiplier; ++i) {
			const coef_name = 'coef' + Util.padZeros(i, 2);
			const idx_name = 'idx' + Util.padZeros(i, 2);
			str += `	color += contribution(${i}, ${coef_name}, ${idx_name}, light_dir_uv);
`;
		}	
		return str;
	}

	fragShaderSrc() {
		const sparsity_multiplier = this.config.input_params.sparsity_multiplier;
		let str = `

in vec2 v_texcoord;
uniform vec3 light;
uniform sampler2D dict;
uniform vec2 dictionary_size;
uniform vec2  dictionary_atlas_atom_tile_size;
uniform int   dictionary_atom_count_x;
uniform int   sparsity_multiplier;
uniform vec3 dictionary_min;
uniform vec3 dictionary_scale;
uniform vec3 average_min;
uniform vec3 average_scale;
uniform vec3 coefficients_min[${sparsity_multiplier}];
uniform vec3 coefficients_scale[${sparsity_multiplier}];


vec2 uv_from_light_direction(vec3 n) {
	// Convert direction to uv in [0..atom_size]
	// Must reflect dir encoding used in preprocessing lumilab directions_mapping::uv_from_direction

	vec2 uv = vec2(((n[0] / (1.0f + n[2])) * 0.5f + 0.5f) * dictionary_atlas_atom_tile_size.x,
				((n[1] / (1.0f + n[2])) * 0.5f + 0.5f) * dictionary_atlas_atom_tile_size.y);

	uv.x = max(0.5, min(uv.x, dictionary_atlas_atom_tile_size.x - 1.0 - 0.5));
	uv.y = max(0.5, min(uv.y, dictionary_atlas_atom_tile_size.y - 1.0 - 0.5));

	return uv;
}

vec2 dictionary_uv_from_index_tile_xy(uint tile_index, float x, float y) {
	// Go from tile_index to tile pos in dictionary	
	int tile_y = int(tile_index) / dictionary_atom_count_x;
	int tile_x = int(tile_index) - tile_y * dictionary_atom_count_x;
	
	// Get coordinates in [0..dictionary_size]
	vec2 res = vec2(dictionary_atlas_atom_tile_size.x * float(tile_x) + x, 
	                dictionary_atlas_atom_tile_size.y * float(tile_y) + y);


	// Convert to [0..1]
	res.x /= float(dictionary_size.x);
	res.y /= float(dictionary_size.y);
	return res;
}

vec3 contribution(int index, sampler2D coef_sampler, usampler2D idx_sampler, vec2 light_dir_uv) {
	vec3 result = vec3(0,0,0);

	// Read coefficients
	vec4 coef_val = texture(coef_sampler, v_texcoord);
	vec3 coef = vec3(coef_val.r, coef_val.g, coef_val.b)  * coefficients_scale[index] + coefficients_min[index];
	
	// Read / decode indices
	uvec4 idx_val = texture(idx_sampler, v_texcoord);
	uint decoded_uint = (idx_val.r << 0) | (idx_val.g << 8) | (idx_val.b << 16) | (idx_val.a << 24);
	uint mask = uint(1023);
	uvec3 idx = uvec3((decoded_uint >> 0) & mask, (decoded_uint >> 10) & mask, (decoded_uint >> 20) & mask);

	// For each of the 3 indices
	uint v_tile_idx[3] = uint[](idx.r, idx.g, idx.b);
	float v_coef[3] = float[](coef.r, coef.g, coef.b);
	
	for(int i = 0; i < 3; ++i) {
		// Convert index,light_u,light_v to x,y global index coordinates
		vec2 dict_uv = dictionary_uv_from_index_tile_xy(v_tile_idx[i], light_dir_uv.x, light_dir_uv.y);
		
		// Fetch rgb from dictionary
		vec3 dict_val = texture(dict, dict_uv).rgb * dictionary_scale + dictionary_min;	
		
		// Sum linear combination of indices
		result += dict_val * v_coef[i];
	}

	return result;
}

vec4 data() {
		`;

		switch(this.mode) {
			case 'light' :
				str += this.sparse_coding_relight_str();
				break;
			case 'avg' : 
				str += this.get_average_color_str();
				break;
			case 'idx00' : 
				str += this.get_index_color_str("idx00");
				break;
			case 'idx01' : 
				str += this.get_index_color_str("idx01");
				break;
			case 'coef00' : 
				str += this.get_coefficient_color_str("coef00", 0);
				break;
			case 'coef01' : 
				str += this.get_coefficient_color_str("coef01", 1);
				break;
			case 'dictionary' :
				str += this.get_dictionary_color_str();
				break;
			case 'debug' :
				str += this.get_debug_str();
				break;			
			default:
				throw Error("Unknown RSC mode: " + this.mode);
		} 
		
		str += 	`
	color = srgb2linear(color);
	return vec4(color,1);
}
`;

		return str;
	}


	get_debug_str() {
		let str = `
	    // Debug mode: show various intermediate values
		
		// in your debug fragment code:
		vec2 light_dir_uv = uv_from_light_direction(light);
		uvec4 idx_val = texture(idx00, v_texcoord);
		uint decoded_uint = (idx_val.r << 0) | (idx_val.g << 8) | (idx_val.b << 16) | (idx_val.a << 24);
		uint mask = uint(1023);
		uvec3 idx = uvec3((decoded_uint >> 0) & mask, (decoded_uint >> 10) & mask, (decoded_uint >> 20) & mask);
		vec2 dict_uv = dictionary_uv_from_index_tile_xy(idx.r, light_dir_uv.x, light_dir_uv.y); // dictionary_atlas_atom_tile_size.x/2.0, dictionary_atlas_atom_tile_size.x/2.0);//

		// raw sample (no scale/min)
		vec3 dict_raw = texture(dict, dict_uv).rgb;

		// debug output: try each one to inspect
		vec3 color = dict_raw;  //vec3(dict_uv,0); //vec3(idx)/1023.0; 
	`;
		return str;
	}

		
}

export { ShaderRSC }

