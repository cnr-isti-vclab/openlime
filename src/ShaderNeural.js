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
		if(this.normals)
			this.samplers.push({ id:this.samplers.length+1, name:'normals', type:'vec3' });
		if(this.albedo)
			this.samplers.push({ id:this.samplers.length+1, name:'albedo', type:'vec3' });
		if(this.mask)
			this.samplers.push({ id:this.samplers.length+1, name:'mask', type:'vec3' });

		this.uniforms = {
			lights: { type: 'vec2', needsUpdate: true, size: 2, value: [0.0, 0.0] },
			min:    { type: 'vec3', needsUpdate: true, size: 3, value: [0, 0, 0] },
			max:    { type: 'vec3', needsUpdate: true, size: 3, value: [1, 1, 1] },
			layer1_weights: { type: 'vec4', needsUpdate: true, size: this.c*this.n/4},
			layer1_biases:  { type: 'vec4', needsUpdate: true, size: this.n/4},
			layer2_weights: { type: 'vec4', needsUpdate: true, size: this.n*this.n/4},
			layer2_biases:  { type: 'vec4', needsUpdate: true, size: this.n/4},
			layer3_weights: { type: 'vec4', needsUpdate: true, size: this.n*3/4},
			layer3_biases:  { type: 'vec3', needsUpdate: true, size: 1},
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

	setShaderInfo(samples, planes, n, c, colorspace) {
		this.samples = samples;
		this.planes = planes;
		this.n = n;
		this.c = c;
		this.colorspace = colorspace;
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
		let str =  `
vec4 inputs[${this.c/4}];    // 12/4
vec4 output1[${this.n/4}];  // 52/4
vec4 output2[${this.n/4}];  // 52/4
vec3 output3;

in vec2 v_texcoord;
uniform sampler2D u_texture_1;
uniform sampler2D u_texture_2;
uniform sampler2D u_texture_3;
uniform vec2 lights;

uniform vec4 layer1_weights[${this.c*this.n/4}]; // 12*52/4
uniform vec4 layer1_biases[${this.n/4}];  // 52/4
uniform vec4 layer2_weights[${this.n*this.n/4}]; // 52*52/4
uniform vec4 layer2_biases[${this.n/4}];  // 52/4
uniform vec4 layer3_weights[${this.n*3/4}];  // 52*3/4
uniform vec3 layer3_biases;

uniform vec3 min[${this.planes/3}];
uniform vec3 max[${this.planes/3}];

float elu(float a){
	return (a > 0.0) ? a : (exp(a) - 1.0);
}
`;

		if (this.mask)
			str += `
uniform sampler2D mask;
`;

		str += `
vec4 relightCoeff(vec3 color_1, vec3 color_2, vec3 color_3, vec2 lights) {
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
		for (int j=0; j < ${this.c/4}; j++){
			sum += dot(inputs[j], layer1_weights[${this.c/4}*i+j]);
		}
		output1[i/4][i%4] = elu(sum + layer1_biases[i/4][i%4]);
	}
	
	// layer 2 - 49 x 49
	for (int i=0; i < ${this.n}; i++){
		sum = 0.0;
		for (int j=0; j < ${this.n/4}; j++){
			sum += dot(output1[j], layer2_weights[${this.n/4}*i+j]);
		}
		output2[i/4][i%4] = elu(sum + layer2_biases[i/4][i%4]);
	}

	// layer 3 - 49 x 3
	for (int i=0; i < 3; i++){
		sum = 0.0;
		for (int j=0; j < ${this.n/4}; j++){
			sum += dot(output2[j], layer3_weights[${this.n/4}*i+j]);
		}
		output3[i] = sum + layer3_biases[i];
	}
	return vec4(output3.${this.colorspace}, 1.0);
}
`;

		str += `
vec4 render(vec2 lights, vec2 v_texcoord) {
	vec3 color_1 = texture(u_texture_1, v_texcoord).${this.colorspace};
	vec3 color_2 = texture(u_texture_2, v_texcoord).${this.colorspace};
	vec3 color_3 = texture(u_texture_3, v_texcoord).${this.colorspace};
	return relightCoeff(color_1, color_2, color_3, lights);
}
`;

		str += `
vec4 data() {
	vec4 color;
`;

		if (this.mask)
			str += `
	float mask_pixel = texture(mask, v_texcoord)[0];
	if (mask_pixel == 0.0)
		return vec4(0);
`;

		if (this.secondLight)
			str += `
	// color = render(lights, v_texcoord) * 0.5 + render(-lights, v_texcoord) * 0.5;
	color = vec4(render(lights, v_texcoord).rgb + render(-lights, v_texcoord).rgb, 1.0);
`;
		else
			str += `
	color = render(lights, v_texcoord);
`;

		if (this.mask)
			str += `
	color *= mask_pixel;
`;

		str += `
	return color;
}
`;

		str += `
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
			a += 0.25*render(lights, d);

			color_1 += texture(u_texture_1, d).${this.colorspace};
			color_2 += texture(u_texture_2, d).${this.colorspace};
			color_3 += texture(u_texture_3, d).${this.colorspace};
		}
	}
	vec4 b = relightCoeff(0.25*color_1, 0.25*color_2, 0.25*color_3, lights);
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

		return str;
	}

}


export { ShaderNeural }

