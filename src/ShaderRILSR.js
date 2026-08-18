import { Shader } from './Shader.js'
import { Util } from './Util.js'

/**
 * @typedef {Object} ShaderRILSR~Basis
 * Configuration data for RILSR dictionary atoms.
 */

/**
 * @typedef {Object} ShaderRILSR~Options
 * Configuration options for the RILSR shader.
 * @property {string} [mode='light'] - Initial rendering mode. Use `'edge'` for
 * the photometric edge map or `'dictionary-response-transfer'` for the
 * response-transfer relighting.
 * @property {number} [responseSharpness=0.9] - Dictionary response sharpness
 * in `[-1, 1]`.
 * @property {number} [responseDirectionalGain=1.5] - Directional response
 * contrast gain.
 * @property {number} [edgeDictionaryCutoff=0.2] - Semantic distance below
 * which dictionary-equivalent atom substitutions are suppressed.
 * @property {string} [type='rilsr'] - Representation type.
 */

/**
 * ShaderRILSR implements GPU rendering for Relightable Images via Learned Sparse
 * Representations (RILSR). It works with {@link LayerRILSR} to relight images
 * interactively in WebGL.
 * 
 * The representation stores sparse per-pixel codes and a globally learned
 * dictionary. Because reconstruction and directional interpolation are linear,
 * dictionary columns are pre-interpolated into a texture atlas. At render time
 * relighting is a sparse linear combination of bilinear texture samples.
 * The learned dictionary remains mathematically interpretable: its patches are
 * fundamental reflectance-response bases that can support downstream feature
 * enhancement and material clustering.
 * 
 * @extends Shader
 */
class ShaderRILSR extends Shader {
	/**
 	 * Creates a new RILSR shader.
 	 * @param {ShaderRILSR~Options} [options] - Configuration options
	 * 
	 * @example
	 * ```javascript
 	 * // Create a RILSR shader
 	 * const shader = new ShaderRILSR({
 	 *     type: 'rilsr',
	 *     colorspace: 'rgb',
	 *     mode: 'light'
	 * });
	 * ```
	 */
	constructor(options) {
		super(options);

		Object.assign(this, {
			modes: ['light', 'edge', 'dictionary-response-transfer', 'dictionary-response-transfer-intensity', 'debug', 'avg', 'idx00', 'idx01', 'coef00', 'coef01', 'dictionary'],
			mode: 'light',
			type: ['ksvd'],
		});
		Object.assign(this, options);
		this.setMode('light');

	}

	/**
	 * Sets the rendering mode
	 * @param {string} mode - One of: 'light', 'edge',
	 * 'dictionary-response-transfer', 'dictionary-response-transfer-intensity',
	 * 'avg', 'idx00', 'idx01', 'coef00', 'coef01', 'dictionary', or 'debug'.
	 * @throws {Error} If mode is not recognized
	 */
	setMode(mode) {
		if (!(this.modes.includes(mode)))
			throw Error("Unknown mode: " + mode);
		this.mode = mode;
		this.needsUpdate = true;
	}

	/**
	 * Sets the unified sharpness used by dictionary-response-transfer modes.
	 * @param {number} value Sharpness in the inclusive range `[-1, 1]`.
	 */
	setResponseSharpness(value) {
		const sharpness = Number(value);
		if (!Number.isFinite(sharpness) || sharpness < -1 || sharpness > 1)
			throw new Error('Response sharpness must be a finite value in [-1, 1].');
		this.setUniform('response_sharpness', sharpness);
	}

	/**
	 * Sets the directional contrast gain used by dictionary-response-transfer modes.
	 * @param {number} value Non-negative directional gain.
	 */
	setResponseDirectionalGain(value) {
		const gain = Number(value);
		if (!Number.isFinite(gain) || gain < 0)
			throw new Error('Response directional gain must be a non-negative finite value.');
		this.setUniform('response_directional_gain', gain);
	}

	/** @private */
	setDictionaryDistanceEnabled(enabled) {
		this.setUniform('edge_dictionary_distance_enabled', Boolean(enabled));
	}

	/**
	 * Sets the semantic cutoff used to suppress equivalent atom substitutions.
	 * @param {number} value Cosine-distance cutoff in the inclusive range `[0, 1]`.
	 */
	setEdgeDictionaryCutoff(value) {
		const cutoff = Number(value);
		if (!Number.isFinite(cutoff) || cutoff < 0 || cutoff > 1)
			throw new Error('Edge dictionary cutoff must be a finite value in [0, 1].');
		this.setUniform('edge_dictionary_cutoff', cutoff);
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
	 * Initializes shader with RILSR configuration.
	 * @param {Object} config - RILSR configuration data
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
			response_sharpness: { type: 'float', needsUpdate: true, size: 1, value: 0.9 },
			response_directional_gain: { type: 'float', needsUpdate: true, size: 1, value: 1.5 },
			edge_dictionary_distance_enabled: { type: 'bool', needsUpdate: true, size: 1, value: false },
			edge_dictionary_cutoff: { type: 'float', needsUpdate: true, size: 1, value: 0.2 },
		});
		if (this.responseSharpness !== undefined) this.setResponseSharpness(this.responseSharpness);
		if (this.responseDirectionalGain !== undefined) this.setResponseDirectionalGain(this.responseDirectionalGain);
		if (this.edgeDictionaryCutoff !== undefined)
			this.setEdgeDictionaryCutoff(this.edgeDictionaryCutoff);
		this.setDictionaryDistanceEnabled(config._dictionaryCosineDistanceAvailable === true);

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

	/**
	 * Returns GLSL implementing the photometric edge detector used by LumiLab.
	 *
	 * Each pixel is represented by its sparse atom support and absolute
	 * coefficients. When the optional dictionary
	 * cosine-distance matrix is available, a symmetric three-dominant-atom
	 * distance replaces the categorical Jaccard comparison. The response is the
	 * squared median over the valid 8-neighbourhood. Repeated atom indices are
	 * merged before the distance is calculated.
	 *
	 * @returns {string} GLSL helper functions for the current sparse layout.
	 * @private
	 */
	photometric_edge_helpers_str() {
		const groupCount = this.config.input_params.sparsity_multiplier;
		const sparsityBase = this.config.input_params.sparsity_base;
		const channels = ['r', 'g', 'b'].slice(0, sparsityBase);
		if (channels.length !== sparsityBase)
			throw new Error(`Unsupported RILSR sparsity_base: ${sparsityBase}. Expected at most 3.`);

		const supportEntries = [];
		for (let group = 0; group < groupCount; ++group) {
			const suffix = Util.padZeros(group, 2);
			for (const channel of channels)
				supportEntries.push({ group, suffix, channel });
		}

		let sampleSupport = '';
		let entryIndex = 0;
		for (let group = 0; group < groupCount; ++group) {
			const suffix = Util.padZeros(group, 2);
			sampleSupport += `\tuvec3 indices${suffix} = decode_sparse_indices(idx${suffix}, uv);\n`;
			sampleSupport += `\tvec3 weights${suffix} = abs(decode_sparse_coefficients(${group}, coef${suffix}, uv));\n`;
			for (const channel of channels) {
				sampleSupport += `\tsupport.indices[${entryIndex}] = indices${suffix}.${channel};\n`;
				sampleSupport += `\tsupport.weights[${entryIndex}] = weights${suffix}.${channel};\n`;
				++entryIndex;
			}
		}

		const supportSize = supportEntries.length;
		return `
const int EDGE_SUPPORT_SIZE = ${supportSize};
const int EDGE_DOMINANT_SIZE = ${Math.min(3, supportSize)};

struct SparseSupport {
	uint indices[EDGE_SUPPORT_SIZE];
	float weights[EDGE_SUPPORT_SIZE];
};

uvec3 decode_sparse_indices(usampler2D index_sampler, vec2 uv) {
	uvec4 packed = texture(index_sampler, uv);
	uint decoded = (packed.r << 0) | (packed.g << 8) | (packed.b << 16) | (packed.a << 24);
	const uint mask = uint(1023);
	return uvec3((decoded >> 0) & mask, (decoded >> 10) & mask, (decoded >> 20) & mask);
}

vec3 decode_sparse_coefficients(int group, sampler2D coefficient_sampler, vec2 uv) {
	return texture(coefficient_sampler, uv).rgb * coefficients_scale[group] + coefficients_min[group];
}

void sample_sparse_support(vec2 uv, out SparseSupport support) {
${sampleSupport}
	// Merge repeated indices once here so all distance measures consume the
	// same compact support and the center support can be reused by 8 neighbours.
	for (int i = 0; i < EDGE_SUPPORT_SIZE; ++i) {
		for (int j = 0; j < i; ++j) {
			if (support.indices[i] == support.indices[j]) {
				support.weights[j] += support.weights[i];
				support.weights[i] = 0.0;
				break;
			}
		}
	}
}

float weighted_jaccard_distance(SparseSupport center, SparseSupport neighbor) {
	float center_total = 0.0;
	float neighbor_total = 0.0;
	float intersection = 0.0;
	for (int i = 0; i < EDGE_SUPPORT_SIZE; ++i) {
		center_total += center.weights[i];
		neighbor_total += neighbor.weights[i];
		if (center.weights[i] <= 0.0) continue;
		for (int j = 0; j < EDGE_SUPPORT_SIZE; ++j) {
			if (neighbor.weights[j] > 0.0 && center.indices[i] == neighbor.indices[j]) {
				intersection += min(center.weights[i], neighbor.weights[j]);
				break;
			}
		}
	}
	float union_weight = center_total + neighbor_total - intersection;
	return union_weight <= 0.0 ? 0.0 : 1.0 - intersection / union_weight;
}

void dominant_support(SparseSupport support, out uvec3 indices, out vec3 weights) {
	uint sorted_indices[EDGE_SUPPORT_SIZE];
	float sorted_weights[EDGE_SUPPORT_SIZE];
	for (int i = 0; i < EDGE_SUPPORT_SIZE; ++i) {
		sorted_indices[i] = support.indices[i];
		sorted_weights[i] = support.weights[i];
	}
	for (int rank = 0; rank < EDGE_DOMINANT_SIZE; ++rank) {
		int best = rank;
		for (int i = rank + 1; i < EDGE_SUPPORT_SIZE; ++i)
			if (sorted_weights[i] > sorted_weights[best]) best = i;
		uint index_swap = sorted_indices[rank];
		float weight_swap = sorted_weights[rank];
		sorted_indices[rank] = sorted_indices[best];
		sorted_weights[rank] = sorted_weights[best];
		sorted_indices[best] = index_swap;
		sorted_weights[best] = weight_swap;
	}
	indices = uvec3(sorted_indices[0], sorted_indices[1], sorted_indices[2]);
	weights = vec3(sorted_weights[0], sorted_weights[1], sorted_weights[2]);
}

float dictionary_pair_cost(uint a, uint b) {
	return texelFetch(dictionary_cosine_distance, ivec2(int(b), int(a)), 0).r;
}

float dictionary_support_distance(SparseSupport center, SparseSupport neighbor) {
	uvec3 center_indices;
	uvec3 neighbor_indices;
	vec3 center_weights;
	vec3 neighbor_weights;
	dominant_support(center, center_indices, center_weights);
	dominant_support(neighbor, neighbor_indices, neighbor_weights);
	float center_total = center_weights.x + center_weights.y + center_weights.z;
	float neighbor_total = neighbor_weights.x + neighbor_weights.y + neighbor_weights.z;
	if (center_total <= 1e-8 || neighbor_total <= 1e-8)
		return weighted_jaccard_distance(center, neighbor);
	center_weights /= center_total;
	neighbor_weights /= neighbor_total;

	float pair_costs[9];
	for (int i = 0; i < 3; ++i)
		for (int j = 0; j < 3; ++j)
			pair_costs[i * 3 + j] = dictionary_pair_cost(center_indices[i], neighbor_indices[j]);

	float forward = 0.0;
	float backward = 0.0;
	for (int i = 0; i < 3; ++i) {
		float best_forward = 1.0;
		float best_backward = 1.0;
		for (int j = 0; j < 3; ++j) {
			best_forward = min(best_forward, pair_costs[i * 3 + j]);
			best_backward = min(best_backward, pair_costs[j * 3 + i]);
		}
		forward += center_weights[i] * best_forward;
		backward += neighbor_weights[i] * best_backward;
	}
	return clamp(0.5 * (forward + backward), 0.0, 1.0);
}

float sparse_support_distance(SparseSupport center, SparseSupport neighbor) {
	float jaccard = weighted_jaccard_distance(center, neighbor);
	if (!edge_dictionary_distance_enabled) return jaccard;
	if (edge_dictionary_cutoff <= 0.0) return jaccard;
	float dictionary_distance = dictionary_support_distance(center, neighbor);
	const float DICTIONARY_GATE_SOFTNESS = 0.08;
	float cutoff = clamp(edge_dictionary_cutoff, 0.0, 1.0);
	float gate = smoothstep(cutoff, min(1.0, cutoff + DICTIONARY_GATE_SOFTNESS), dictionary_distance);
	return jaccard * gate;
}

float median_distance(float distances[8], int count) {
	for (int i = 0; i < 8; ++i) {
		for (int j = i + 1; j < 8; ++j) {
			if (j < count && distances[j] < distances[i]) {
				float value = distances[i];
				distances[i] = distances[j];
				distances[j] = value;
			}
		}
	}
	if (count == 0) return 0.0;
	if ((count % 2) != 0) return distances[count / 2];
	return 0.5 * (distances[count / 2 - 1] + distances[count / 2]);
}

vec3 photometric_edge() {
	vec2 texel_size = vec2(1.0) / tileSize;
	SparseSupport center;
	sample_sparse_support(v_texcoord, center);
	float distances[8];
	int count = 0;
	for (int dy = -1; dy <= 1; ++dy) {
		for (int dx = -1; dx <= 1; ++dx) {
			if (dx == 0 && dy == 0) continue;
			vec2 neighbor_uv = v_texcoord + texel_size * vec2(float(dx), float(dy));
			if (neighbor_uv.x < 0.0 || neighbor_uv.y < 0.0 || neighbor_uv.x >= 1.0 || neighbor_uv.y >= 1.0) continue;
			SparseSupport neighbor;
			sample_sparse_support(neighbor_uv, neighbor);
			distances[count++] = sparse_support_distance(center, neighbor);
		}
	}
	float edge_strength = median_distance(distances, count);
	edge_strength *= edge_strength;
	return vec3(edge_strength);
}
`;
	}

	/**
	 * Returns GLSL that evaluates the photometric edge response.
	 * @returns {string}
	 * @private
	 */
	get_photometric_edge_str() {
		return 'vec3 color = photometric_edge();\n';
	}

	/**
	 * Returns GLSL for the defaults used by the offline
	 * `dictionary-response-transfer --sharpness --directional-gain --intensity`
	 * command: unified peak enhancement, max-absolute normalization, retained
	 * atom mean, recentering, and residual-energy preservation.
	 *
	 * The transformed atlas is generated and cached by {@link LayerRILSR} when
	 * sharpness changes. This shader only performs the final bilinear lookup and
	 * applies directional gain to the cached residual.
	 *
	 * @returns {string} GLSL helper functions.
	 * @private
	 */
	dictionary_response_transfer_helpers_str() {
		return `
vec3 dictionary_response_transfer_value(uint atom_index, vec2 light_dir_uv) {
	vec2 atom_uv = dictionary_uv_from_index_tile_xy(atom_index, light_dir_uv.x, light_dir_uv.y);
	vec3 transferred = texture(response_dict, atom_uv).rgb;
	vec3 mean = texelFetch(response_mean, ivec2(int(atom_index), 0), 0).rgb;
	vec3 gain_mask = texelFetch(response_gain, ivec2(int(atom_index), 0), 0).rgb;
	vec3 gained = mean + max(response_directional_gain, 0.0) * (transferred - mean);
	return mix(transferred, gained, gain_mask);
}
`;
	}

	/**
	 * Returns GLSL that reconstructs with transformed dictionary responses.
	 * @param {boolean} [intensityOnly=false] Return the auxiliary `--intensity`
	 * response instead of the normal mean-plus-directional reconstruction.
	 * @returns {string}
	 * @private
	 */
	sparse_coding_response_transfer_str(intensityOnly = false) {
		let str = `
	vec2 light_dir_uv = uv_from_light_direction(light);
	vec3 directional = vec3(0.0);
`;
		const sparsityMultiplier = this.config.input_params.sparsity_multiplier;
		for (let i = 0; i < sparsityMultiplier; ++i) {
			const coefficientName = 'coef' + Util.padZeros(i, 2);
			const indexName = 'idx' + Util.padZeros(i, 2);
			str += `\tdirectional += response_transfer_contribution(${i}, ${coefficientName}, ${indexName}, light_dir_uv);\n`;
		}
		str += intensityOnly
			? '\tvec3 color = vec3(0.5 + dot(directional, vec3(1.0 / 3.0)));\n'
			: '\tvec3 color = texture(avg, v_texcoord).rgb * average_scale + average_min + directional;\n';
		return str;
	}


	// RILSR relighting shader part
	sparse_coding_relight_str() {
		let str = `
	// Relightable Images via Learned Sparse Representations shader code

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
		const isResponseTransferMode = this.mode === 'dictionary-response-transfer' ||
			this.mode === 'dictionary-response-transfer-intensity';
		let str = `

in vec2 v_texcoord;
uniform vec3 light;
uniform sampler2D dict;
uniform sampler2D response_dict;
uniform sampler2D response_mean;
uniform sampler2D response_gain;
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
uniform float response_sharpness;
uniform float response_directional_gain;
uniform bool edge_dictionary_distance_enabled;
uniform float edge_dictionary_cutoff;
uniform sampler2D dictionary_cosine_distance;

${this.photometric_edge_helpers_str()}

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

${isResponseTransferMode ? this.dictionary_response_transfer_helpers_str() : ''}

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

${isResponseTransferMode ? `vec3 response_transfer_contribution(int index, sampler2D coef_sampler, usampler2D idx_sampler, vec2 light_dir_uv) {
	vec3 result = vec3(0.0);
	vec3 coef = texture(coef_sampler, v_texcoord).rgb * coefficients_scale[index] + coefficients_min[index];
	uvec3 atom_indices = decode_sparse_indices(idx_sampler, v_texcoord);
	uint entries[3] = uint[](atom_indices.r, atom_indices.g, atom_indices.b);
	float weights[3] = float[](coef.r, coef.g, coef.b);
	for (int entry = 0; entry < 3; ++entry)
		result += dictionary_response_transfer_value(entries[entry], light_dir_uv) * weights[entry];
	return result;
}
` : ''}

vec4 data() {
		`;

		switch(this.mode) {
			case 'light' :
				str += this.sparse_coding_relight_str();
				break;
			case 'edge' :
				str += this.get_photometric_edge_str();
				break;
			case 'dictionary-response-transfer' :
				str += this.sparse_coding_response_transfer_str();
				break;
			case 'dictionary-response-transfer-intensity' :
				str += this.sparse_coding_response_transfer_str(true);
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
				throw Error("Unknown RILSR mode: " + this.mode);
		} 
		
		str += 	`
	${this.decodeColorSnippet('color')}
	${this.encodeColorSnippet('color')}
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

export { ShaderRILSR }
