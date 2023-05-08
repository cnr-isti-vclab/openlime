import { Shader } from './Shader.js'

/**
 * Extends {@link Shader}, initialized with a Neural .json (
**/
 
class ShaderNeural extends Shader {
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
			{ id:1, name:'u_texture_1', type:'vec3' },
			{ id:2, name:'u_texture_2', type:'vec3' },
			{ id:3, name:'u_texture_3', type:'vec3' }
		];

		this.uniforms = {
			lights: { type: 'vec2', needsUpdate: true, size: 2, value: [0.0, 0.0] },
			min:    { type: 'vec3', needsUpdate: true, size: 3, value: [0, 0, 0] },
			max:    { type: 'vec3', needsUpdate: true, size: 3, value: [1, 1, 1] },
			layer1_weights: { type: 'vec4', needsUpdate: true, size: 156},
			layer1_biases:  { type: 'vec4', needsUpdate: true, size: 13 },
			layer2_weights: { type: 'vec4', needsUpdate: true, size: 676},
			layer2_biases:  { type: 'vec4', needsUpdate: true, size: 13 },
			layer3_weights: { type: 'vec4', needsUpdate: true, size: 39},
			layer3_biases:  { type: 'vec3', needsUpdate: true, size: 1 },
		};
	}

	createProgram(gl) {
		super.createProgram(gl);
		this.position_location = gl.getAttribLocation(this.program, "a_position");
		this.texcoord_location = gl.getAttribLocation(this.program, "a_texcoord");		
	}

	setLight(light) {
		this.setUniform('lights', light);
	}

	init() {
		this.lightWeights([0, 0, 1], 'base');
	}


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
	fragShaderSrc(gl) {
		return `
vec4 inputs[3];    // 12/4
vec4 output1[13];  // 52/4
vec4 output2[13];  // 52/4
vec3 output3;

in vec2 v_texcoord;
uniform sampler2D u_texture_1;
uniform sampler2D u_texture_2;
uniform sampler2D u_texture_3;
uniform vec2 lights;
//out vec4 colors;

uniform vec4 layer1_weights[156]; // 12*52/4
uniform vec4 layer1_biases[13];  // 52/4
uniform vec4 layer2_weights[676]; // 52*52/4
uniform vec4 layer2_biases[13];  // 52/4
uniform vec4 layer3_weights[39];  // 52*3/4
uniform vec3 layer3_biases;

uniform vec3 min[3];
uniform vec3 max[3];

float elu(float a){
	if (a > 0.0){
		return a;
	} else {
		return exp(a) - 1.0;
	}
}

vec4 data(){
	vec3 color_1 = texture(u_texture_1, v_texcoord).bgr;
	vec3 color_2 = texture(u_texture_2, v_texcoord).bgr;
	vec3 color_3 = texture(u_texture_3, v_texcoord).bgr;

	// rescaling features
	for (int i=0; i < 3; i++){
		color_1[i] = color_1[i] * (max[0][i] - min[0][i]) + min[0][i];
		color_2[i] = color_2[i] * (max[1][i] - min[1][i]) + min[1][i];
		color_3[i] = color_3[i] * (max[2][i] - min[2][i]) + min[2][i];
	}

	// building input
	inputs[0] = vec4(color_1, color_2.x);
	inputs[1] = vec4(color_2.yz, color_3.xy);
	inputs[2] = vec4(color_3.z, lights, 0.0);

	float sum = 0.0;

	// layer 1 - 11 x 49
	for (int i=0; i < 52; i++){
		sum = 0.0;
		for (int j=0; j < 3; j++){
			sum += inputs[j][0] * layer1_weights[3*i+j][0];
			sum += inputs[j][1] * layer1_weights[3*i+j][1];
			sum += inputs[j][2] * layer1_weights[3*i+j][2];
			sum += inputs[j][3] * layer1_weights[3*i+j][3];
		}
		output1[i/4][i%4] = elu(sum + layer1_biases[i/4][i%4]);
	}

	// layer 2 - 49 x 49
	for (int i=0; i < 52; i++){
		sum = 0.0;
		for (int j=0; j < 13; j++){
			sum += output1[j][0] * layer2_weights[13*i+j][0];
			sum += output1[j][1] * layer2_weights[13*i+j][1];
			sum += output1[j][2] * layer2_weights[13*i+j][2];
			sum += output1[j][3] * layer2_weights[13*i+j][3];
		}
		output2[i/4][i%4] = elu(sum + layer2_biases[i/4][i%4]);
	}

	// layer 1 - 49 x 3
	for (int i=0; i < 3; i++){
		sum = 0.0;
		for (int j=0; j < 13; j++){
			sum += output2[j][0] * layer3_weights[13*i+j][0];
			sum += output2[j][1] * layer3_weights[13*i+j][1];
			sum += output2[j][2] * layer3_weights[13*i+j][2];
			sum += output2[j][3] * layer3_weights[13*i+j][3];
		}
		output3[i] = sum + layer3_biases[i];
	}
	return vec4(output3.bgr, 1.0);
}
		`;
	}

}


export { ShaderNeural }

