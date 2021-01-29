import { Shader } from './Shader.js'

/**
 *  @param {object} options
 * *compose*: compose operation: add, subtract, multiply, etc.
 */

class ShaderCombiner extends Shader {
	constructor(options) {
		super(options);

		this.mode = 'second', //Lighten Darken Contrast Inversion HSV components LCh components
		this.samplers = [
			{ id:0, attribute:'source1', type:'vec3' },
			{ id:1, attribute:'source2', type:'vec3' }
		];

		this.modes = {
			'first': 'color = c1;',
			'second': 'color = c2;',
			'mean': 'color = (c1 + c2)/2.0;',
			'diff': 'color vec4(c2.rgb - c1.rgb, 1);'
		}

		this.body = this.template(this.modes[this.mode]);

	}

	setMode(mode) {

		if(!(mode in this.modes))
			throw Error("Unknown mode: " + mode);
		this.body = this.template(this.modes[mode]);
		this.needsUpdate = true;
	}

	template(operation) {
			return  `#version 300 es

precision highp float; 
precision highp int; 

in vec2 v_texcoord;
uniform sampler2D source1;
uniform sampler2D source2;

out vec4 color;

void main() {
	vec4 c1 = texture(source1, v_texcoord);
	vec4 c2 = texture(source2, v_texcoord);
	${operation};
}
`;
	}

	vertShaderSrc() {
		return `#version 300 es

precision highp float; 
precision highp int; 

in vec4 a_position;
in vec2 a_texcoord;

out vec2 v_texcoord;

void main() {
	gl_Position = a_position;
	v_texcoord = a_texcoord;
}`;
	}
}


export { ShaderCombiner }
