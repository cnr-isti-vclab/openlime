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
		super(options);

		Object.assign(this, {
			modes: ['light', 'avg', 'idx00', 'idx01', 'coef00', 'coef01', 'dictionary'],
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

		// if (this.mode == 'light')
		// 	this.lightWeights(light, 'base');
		this.setUniform('light', light);
	}

	/**
	 * Initializes shader with RTI configuration
	 * @param {Object} config - RSC configuration data
	 */
	init(config) {
		this.config = config;

		// SAMPLERS
		this.samplers = [];
		this.samplers.push({ id: 0, name: 'avg', samplerType: 'usampler2D' });
		this.samplers.push({ id: 1, name: 'idx00', samplerType: 'usampler2D' });
		this.samplers.push({ id: 2, name: 'idx01', samplerType: 'usampler2D' });
		this.samplers.push({ id: 3, name: 'coef00', samplerType: 'sampler2D' });
		this.samplers.push({ id: 4, name: 'coef01', samplerType: 'sampler2D' });

		// UNIFORMS
		console.log("CONFIG = ", this.config);
		const  avg_scale = this.config.output_params.average_range / 65535.0;    // integer png 16 bit
		const dict_scale = this.config.output_params.dictionary_range / 65535.0; // integer png 16 bit
		const coef_scale = this.config.output_params.coefficients_range; 				 // already float
		const atom_size = [this.config.input_params.dictionary_atom_image_w,  this.config.input_params.dictionary_atom_image_h];
		const atom_count_x = this.config.dictionary_atom_count_x ? this.config.dictionary_atom_count_x : 32;

		console.log("Atom Count", atom_count_x);
		this.registerUniforms({
			light: { type: 'vec3', needsUpdate: true, size: 3, value: [0.0, 0.0, 1] },

			average_min: { type: 'float', needsUpdate: false, size: 1, value: this.config.output_params.average_min },
			average_scale: { type: 'float', needsUpdate: false, size: 1, value: avg_scale },
			coefficients_min: { type: 'float', needsUpdate: false, size: 1, value: this.config.output_params.coefficients_min },
			coefficients_scale: { type: 'float', needsUpdate: false, size: 1, value: coef_scale },
			dictionary_min: { type: 'float', needsUpdate: false, size: 1, value: this.config.output_params.dictionary_min },
			dictionary_scale: { type: 'float', needsUpdate: false, size: 1, value: dict_scale },
			dictionary_atom_size: { type: 'vec2', needsUpdate: false, size: 2, value: atom_size},
			dictionary_atom_count_x: { type: 'int', needsUpdate: false, size: 1, value: atom_count_x},
		});
		console.log("Registered uniforms");

		console.log("SHADER CODE");
		console.log(this.sparse_coding_relight_str());
		

		this.needsUpdate = true;
	}

	// Sparse coding relighting shader part
	sparse_coding_relight_str() {
		let str = `// Relight Sparse Coding Shader Code
		// vec2 globalUV = getGlobalUV(v_texcoord);

		// Initialize result to avg
		uvec4 uval = texture(avg, v_texcoord);
		vec3 color = vec3(uval.r, uval.g, uval.b) * average_scale + average_min;	

		// Get Light Direction uv in [0..1]
		vec2 light_dir_uv = uv_from_light_direction(light);
		// Debug: color = vec3(light_dir_uv / float(dictionary_atom_size.x), 0.5);

		// Loop over multiplicity: current version handle only 1 or 2 
		
		// CAVEAT: This part up to TAEVAC is just the first sparsity block. 
		// It must be replicated for the second block fetching from idx01, coef01
		
		// Read coefficients
		vec4 coef_val = texture(coef00, v_texcoord);
		vec3 coef = vec3(coef_val.r, coef_val.g, coef_val.b)  * coefficients_scale + coefficients_min;
		
		// Read indices
		uvec4 idx_val = texture(idx00, v_texcoord);
		uint decoded_uint = (idx_val.r << 0) | (idx_val.g << 8) | (idx_val.b << 16) | (idx_val.a << 24);
		uint mask = uint(1023);
		uvec3 idx = uvec3((decoded_uint >> 20) & mask, (decoded_uint >> 10) & mask, decoded_uint & mask); 
	  // Debug: color = vec3(float(idx.x)/1023.0, float(idx.y)/1023.0, float(idx.z)/1023.0);
	
		// For each of the 3 indices
		uint v_tile_idx[3] = uint[](idx.r, idx.g, idx.b);
		float v_coef[3] = float[](coef.r, coef.g, coef.b);

		vec2 dict_uv = dictionary_uv_from_index_tile_xy(v_tile_idx[0], light_dir_uv.x, light_dir_uv.y);
		// Debug color = vec3(dict_uv, 0);

		for(int i = 0; i < 3; ++i) {
		  // Convert index,light_u,light_v to x,y global index coordinates
			vec2 dict_uv = dictionary_uv_from_index_tile_xy(v_tile_idx[i], light_dir_uv.x, light_dir_uv.y);
			
		  // Fetch rgb from dictionary
		  uvec4 dict_uval = texture(dict, dict_uv);
			vec3 dict_val = vec3(dict_uval.r, dict_uval.g, dict_uval.b) * dictionary_scale + dictionary_min;	
			
			// Sum linear combination of indices
			color += dict_val * v_coef[i];
	  }

		// Color contains the result
		`;
		return str;
	}

	// Return a shader string to fetch index idx and convert to 3 10 bits components stored in a var called param_name
	get_decoded_index(idx, param_name) {
		let str = `uvec4 val = texture(` + idx + `, v_texcoord);
uint decoded_uint = (val.r << 0) | (val.g << 8) | (val.b << 16) | (val.a << 24);
uint mask = uint(1023);
uvec3 ` + param_name + ` = uvec3((decoded_uint >> 20) & mask, (decoded_uint >> 10) & mask, decoded_uint & mask); 
`;

		return str;
	}

	// Return a shader string to fetch index idx and converted from 3 10 bits component to rgb float values
	get_index_color_str(idx, param_name="color") {
		let str = this.get_decoded_index(idx, "index");
		str += `float scale = 1.0 / float(mask);

bool sort = false; // Just for debugging sort indices to map triplet of indices to same colors
if (sort) {
	if (index.r > index.g) { uint tmp = index.r; index.r = index.g; index.g = tmp; } // swap(index.r, index,g);
	if (index.r > index.b) { uint tmp = index.r; index.r = index.b; index.b = tmp; } // swap(index.r, index,b);
	if (index.g > index.b) { uint tmp = index.g; index.g = index.b; index.b = tmp; } // swap(index.g, index.b);
}

vec3 ` + param_name + ` = vec3(index.r, index.g, index.b) * scale;
`;

		return str;
	}

	// Return shader string to fetch the average color dequantized and store into param_name
	get_average_color_str(param_name="color") {
    let str = `uvec4 val = texture(avg, v_texcoord);
vec3 ` + param_name + ` = vec3(val.r, val.g, val.b) * average_scale + average_min;	
`;
		return str;
	}

	// Return shader string to fetch the coefficient idx (idx00 or idx01) color dequantized and store into param_name
	get_coefficient_color_str(idx, param_name="color") {
		let str = `vec4 val = texture(` + idx + `, v_texcoord);
vec3 ` + param_name + ` = vec3(val.r, val.g, val.b) * coefficients_scale + coefficients_min;
`;
		return str;
	}


	get_dictionary_color_str(param_name="color") {
    let str = `uvec4 val = texture(dict, v_texcoord);
vec3 ` + param_name + ` = vec3(val.r, val.g, val.b) * dictionary_scale + dictionary_min;	
`;
		return str;
	}

	fragShaderSrc() {
		let str = `

// optional static dict texture, bound by the Layer (not by tiles)

in vec2 v_texcoord;
uniform vec3 light;
uniform usampler2D dict;
uniform vec2 dictionary_size;
uniform vec2  dictionary_atom_size;
uniform int   dictionary_atom_count_x;
uniform float dictionary_min;
uniform float dictionary_scale;
uniform float average_min;
uniform float average_scale;
uniform float coefficients_min;
uniform float coefficients_scale;

vec2 uv_from_light_direction(vec3 n) {
	// Convert direction to uv in [0..atom_size]
	// Must reflect dir encoding used in preprocessing lumilab directions_mapping::uv_from_direction

	vec2 uv = vec2(((n[0] / (1.0f + n[2])) * 0.5f + 0.5f) * dictionary_atom_size.x,
  							 ((n[1] / (1.0f + n[2])) * 0.5f + 0.5f) * dictionary_atom_size.y);

	return uv;
}

vec2 dictionary_uv_from_index_tile_xy(uint tile_index, float x, float y) {
	// Go from tile_index to tile pos in dictionary	
  int tile_y = int(tile_index) / dictionary_atom_count_x;
	int tile_x = int(tile_index) - tile_y * dictionary_atom_count_x;
	
	// Get coordinates in [0..dictionary_size]
	vec2 res = vec2(dictionary_atom_size.x * float(tile_x) + x, 
	                dictionary_atom_size.y * float(tile_y) + y);

	// Convert to [0..1]
	res.x /= float(dictionary_size.x);
	res.y /= float(dictionary_size.y);
	return res;
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
				str += this.get_coefficient_color_str("coef00");
				break;
			case 'coef01' : 
				str += this.get_coefficient_color_str("coef01");
				break;
			case 'dictionary' :
				str += this.get_dictionary_color_str();
			break;
		}

		str += 	`
			return vec4(color,1);
		}
		`;

		return str;
	}
}

export { ShaderRSC }


// FIXME REMOVE ALL NEXT LINES
// vec4 data() {
//     // Test: visualizza le coordinate globali come colori
//     vec2 globalUV = getGlobalUV(v_texcoord);
    
//     // Rosso = globalUV.x (da sinistra=nero a destra=rosso)
//     // Verde = globalUV.y (da sopra=nero a sotto=verde)  
//     // Risultato atteso: nero in alto-sinistra, giallo in basso-destra
//     return vec4(globalUV.x, globalUV.y, 0.0, 1.0);
// }

// vec4 data() {
//     // Test: visualizza direttamente i valori degli uniform
    
//     // Normalizza gli offset per vedere se cambiano tra tile
//     vec2 normalizedOffset = u_tileOffset / u_imageSize;
    
//     // Se gli uniform funzionano, ogni tile dovrebbe avere un colore diverso:
//     // Tile 0: nero [0,0]
//     // Tile 1: rosso [0.5,0]  
//     // Tile 2: verde [0,0.6]
//     // Tile 3: giallo [0.5,0.6]
//     return vec4(normalizedOffset.x, normalizedOffset.y, 0.0, 1.0);
// }

// vec4 data() {
//     // Use texture() for usampler2D (returns uvec4 with uint values 0-65535)
//     uvec4 raw = texture(avg, v_texcoord);
//     // Convert from uint [0-65535] to float [0-1]
//     vec3 color = vec3(raw.r, raw.g, raw.b) / 65535.0;
//     return vec4(color, 1.0);
// }

// vec4 data() {
//     // Use texture() for usampler2D (returns uvec4 with uint values 0-255)
//     uvec4 val = texture(idx01, v_texcoord);
//     vec3 color = vec3(val.r, val.g, val.b) / 255.0f;
//     return vec4(color, 1.0);
// }


// vec4 data() {
//     // Static 8-bit texture
//     vec2 globalUV = getGlobalUV(v_texcoord);
//     vec3 staticColor = texture(texture8bit, globalUV).rgb;
//     return vec4(staticColor, 1.0);
// }