import { Shader } from './Shader.js'

/**
 * @typedef {Object} ShaderNeural~NetworkConfig
 * Configuration for neural network weights and parameters
 * @property {number} n - Number of neurons per layer (padded to multiple of 4)
 * @property {number} c - Number of input channels (padded to multiple of 4)
 * @property {string} colorspace - Color space for processing ('rgb'|'xyz'|etc)
 * @property {number} nplanes - Number of coefficient planes
 * @property {number} scale - Dequantization scale factor
 * @property {number} bias - Dequantization bias
 */

/**
 * ShaderNeural implements a WebGL-based neural network for real-time image relighting.
 * Used in conjunction with LayerNeuralRTI for Neural Reflectance Transformation Imaging.
 * 
 * Features:
 * - Three-layer neural network architecture
 * - Real-time image relighting
 * - Multiple texture plane support
 * - Configurable network parameters
 * - ELU activation function
 * - WebGL acceleration
 * - Automatic color space conversion
 * 
 * Technical Implementation:
 * - Forward pass computation in fragment shader
 * - Vectorized operations for performance
 * - Dynamic shader generation based on network size
 * - Multi-texture sampling
 * - Weight matrix management
 * - Dequantization support
 * 
/**
 * Neural Network Architecture Details
 * 
 * The network consists of three layers:
 * 1. Input Layer:
 *    - Accepts coefficient planes and light direction
 *    - Applies dequantization and normalization
 * 
 * 2. Hidden Layers:
 *    - Two fully connected layers
 *    - ELU activation function
 *    - Vectorized operations for efficiency
 * 
 * 3. Output Layer:
 *    - Produces final RGB/XYZ color
 *    - Linear activation
 * 
 * Implementation Notes:
 * - All matrices are packed into vec4 for efficient GPU processing
 * - Network dimensions are padded to multiples of 4
 * - Uses texture sampling for coefficient input
 * - Implements forward pass only
 *
 *
 * Example usage with LayerNeuralRTI:
 * ```javascript
 * // Create neural shader
 * const shader = new ShaderNeural({
 *     mode: 'light',
 *     nplanes: 9
 * });
 * 
 * // Configure network
 * shader.setShaderInfo(samples, 9, 52, 12, 'rgb');
 * 
 * // Update weights
 * shader.setUniform('layer1_weights', weights1);
 * shader.setUniform('layer1_biases', biases1);
 * // ... set other layers
 * 
 * // Set light direction
 * shader.setLight([0.5, 0.3]);
 * ```
 *
 * Fragment Shader Implementation
 * 
 * Key Components:
 * 1. Input Processing:
 *    - Texture sampling
 *    - Dequantization
 *    - Light direction incorporation
 * 
 * 2. Network Computation:
 *    - Vectorized matrix multiplication
 *    - ELU activation function
 *    - Layer-wise processing
 * 
 * 3. Output Processing:
 *    - Color space conversion
 *    - Final color computation
 * 
 * Uniforms:
 * - {sampler2D} u_texture_[1-3] - Coefficient plane textures
 * - {vec2} lights - Light direction vector
 * - {vec4[]} layer[1-3]_weights - Layer weight matrices
 * - {vec4[]} layer[1-3]_biases - Layer bias vectors
 * - {vec3} min - Minimum values for dequantization
 * - {vec3} max - Maximum values for dequantization
 * 
 * @extends Shader
 */
class ShaderNeural extends Shader {
	/**
	 * Creates a new neural network shader
	 * @param {Object} [options] - Configuration options
	 * @param {string[]} [options.modes=['light']] - Available modes
	 * @param {string} [options.mode='light'] - Initial mode
	 * @param {number} [options.nplanes=null] - Number of coefficient planes
	 * @param {number} [options.scale=null] - Dequantization scale factor
	 * @param {number} [options.bias=null] - Dequantization bias
	 */
	constructor(options) {
		super({});

		Object.assign(this, {
			modes: ['light'],
			mode: 'light',

			nplanes: null,	 //number of coefficient planes

			scale: null,	  //factor and bias are used to dequantize coefficient planes.
			bias: null,

		});
		Object.assign(this, options);

		this.samplers = [
			{ id: 1, name: 'u_texture_1', type: 'vec3' },
			{ id: 2, name: 'u_texture_2', type: 'vec3' },
			{ id: 3, name: 'u_texture_3', type: 'vec3' }
		];

		this.uniforms = {
			lights: { type: 'vec2', needsUpdate: true, size: 2, value: [0.0, 0.0] },
			min: { type: 'vec3', needsUpdate: true, size: 3, value: [0, 0, 0] },
			max: { type: 'vec3', needsUpdate: true, size: 3, value: [1, 1, 1] },
			layer1_weights: { type: 'vec4', needsUpdate: true, size: this.c * this.n / 4 },
			layer1_biases: { type: 'vec4', needsUpdate: true, size: this.n / 4 },
			layer2_weights: { type: 'vec4', needsUpdate: true, size: this.n * this.n / 4 },
			layer2_biases: { type: 'vec4', needsUpdate: true, size: this.n / 4 },
			layer3_weights: { type: 'vec4', needsUpdate: true, size: this.n * 3 / 4 },
			layer3_biases: { type: 'vec3', needsUpdate: true, size: 1 },
		};
	}

	/**
	 * Creates WebGL program and retrieves attribute locations
	 * @param {WebGLRenderingContext} gl - WebGL context
	 * @override
	 * @private
	 */
	createProgram(gl) {
		super.createProgram(gl);
		this.position_location = gl.getAttribLocation(this.program, "a_position");
		this.texcoord_location = gl.getAttribLocation(this.program, "a_texcoord");
	}

	/**
	 * Sets the light direction for relighting
	 * @param {number[]} light - Light direction vector [x, y]
	 */
	setLight(light) {
		this.setUniform('lights', light);
	}

	/**
	 * Initializes default weights
	 */
	init() {
		this.lightWeights([0, 0, 1], 'base');
	}

	/**
	 * Configures shader for specific network architecture
	 * @param {number[]} samples - Input samples
	 * @param {number} planes - Number of coefficient planes
	 * @param {number} n - Neurons per layer
	 * @param {number} c - Input channels
	 * @param {string} colorspace - Color space for processing
	 */
	setShaderInfo(samples, planes, n, c, colorspace) {
		this.samples = samples;
		this.planes = planes;
		this.n = n;
		this.c = c;
		this.colorspace = colorspace;
	}

	/**
	 * Generates vertex shader source code
	 * @param {WebGLRenderingContext} gl - WebGL context
	 * @returns {string} Vertex shader source
	 * @private
	 */
	vertShaderSrc(gl) {
		return `#version 300 es
in vec2 a_position;
in vec2 a_texcoord;
out vec2 v_texcoord;
void main() {
	gl_Position = vec4(a_position, 0.0, 1.0);
	v_texcoord = a_texcoord;
}`;
	}

	/**
	 * Generates fragment shader source code implementing neural network
	 * @param {WebGLRenderingContext} gl - WebGL context
	 * @returns {string} Fragment shader source
	 * @private
	 */
	fragShaderSrc(gl) {
		return `
vec4 inputs[${this.c / 4}];    // 12/4
vec4 output1[${this.n / 4}];  // 52/4
vec4 output2[${this.n / 4}];  // 52/4
vec3 output3;

in vec2 v_texcoord;
uniform sampler2D u_texture_1;
uniform sampler2D u_texture_2;
uniform sampler2D u_texture_3;
uniform vec2 lights;

uniform vec4 layer1_weights[${this.c * this.n / 4}]; // 12*52/4
uniform vec4 layer1_biases[${this.n / 4}];  // 52/4
uniform vec4 layer2_weights[${this.n * this.n / 4}]; // 52*52/4
uniform vec4 layer2_biases[${this.n / 4}];  // 52/4
uniform vec4 layer3_weights[${this.n * 3 / 4}];  // 52*3/4
uniform vec3 layer3_biases;

uniform vec3 min[${this.planes / 3}];
uniform vec3 max[${this.planes / 3}];

float elu(float a){
	return (a > 0.0) ? a : (exp(a) - 1.0);
}


vec4 relightCoeff(vec3 color_1, vec3 color_2, vec3 color_3) {
	// Rescaling features
    color_1 = color_1 * (max[0] - min[0]) + min[0];
    color_2 = color_2 * (max[1] - min[1]) + min[1];
    color_3 = color_3 * (max[2] - min[2]) + min[2];

	// building input
	inputs[0] = vec4(color_1, color_2.x);
	inputs[1] = vec4(color_2.yz, color_3.xy);
	inputs[2] = vec4(color_3.z, lights, 0.0);

	float sum = 0.0;

	// layer 1 - 11 x 49
	for (int i=0; i < ${this.n}; i++){
		sum = 0.0;
		for (int j=0; j < ${this.c / 4}; j++){
			sum += dot(inputs[j], layer1_weights[${this.c / 4}*i+j]);
		}
		output1[i/4][i%4] = elu(sum + layer1_biases[i/4][i%4]);
	}
	
	// layer 2 - 49 x 49
	for (int i=0; i < ${this.n}; i++){
		sum = 0.0;
		for (int j=0; j < ${this.n / 4}; j++){
			sum += dot(output1[j], layer2_weights[${this.n / 4}*i+j]);
		}
		output2[i/4][i%4] = elu(sum + layer2_biases[i/4][i%4]);
	}

	// layer 3 - 49 x 3
	for (int i=0; i < 3; i++){
		sum = 0.0;
		for (int j=0; j < ${this.n / 4}; j++){
			sum += dot(output2[j], layer3_weights[${this.n / 4}*i+j]);
		}
		output3[i] = sum + layer3_biases[i];
	}
	return vec4(output3.${this.colorspace}, 1.0);
}

vec4 relight(vec2 v) {
	vec3 color_1 = texture(u_texture_1, v).${this.colorspace};
	vec3 color_2 = texture(u_texture_2, v).${this.colorspace};
	vec3 color_3 = texture(u_texture_3, v).${this.colorspace};
	return relightCoeff(color_1, color_2, color_3);
}


vec4 data() {
	return relight(v_texcoord);
}
vec4 data1() {
	vec2 uv = v_texcoord;
	bool showDiff = false;
	bool showA = false;
	if(v_texcoord.x > 0.5) {
		showDiff = true;
		uv.x -= 0.5;
	}
	if(v_texcoord.y > 0.5) {
		showA = true;
		uv.y -= 0.5;
	}
	vec2 o = floor(uv*128.0)/128.0;
	float step = 1.0/256.0;

	vec4 a = vec4(0, 0, 0, 0);
	vec3 color_1 = vec3(0, 0, 0);
	vec3 color_2 = vec3(0, 0, 0);
	vec3 color_3 = vec3(0, 0, 0);

	for(float y = 0.0; y <= step; y = y + step) {
		for(float x = 0.0; x <= step; x = x + step) {
			vec2 d = o + vec2(x, y);
			a += 0.25*relight(d);

			color_1 += texture(u_texture_1, d).${this.colorspace};
			color_2 += texture(u_texture_2, d).${this.colorspace};
			color_3 += texture(u_texture_3, d).${this.colorspace};
		}
	}
	vec4 b = relightCoeff(0.25*color_1, 0.25*color_2, 0.25*color_3);
	float diff = 255.0*length((a - b).xyz);
	if(showDiff) {
		if(diff < 10.0) {
			return vec4(0.0, 0.0, 0.0, 1.0);
		} else if (diff < 20.0) {
			return vec4(0.0, 0.0, 1.0, 1.0);
		} else if(diff < 40.0) {
			return vec4(0.0, 1.0, 0.0, 1.0);
		} else
			return vec4(1.0, 0.0, 0.0, 1.0);
	} 
	if(showA)
		return a;
	return b;
}

		`;
	}
}

export { ShaderNeural }

