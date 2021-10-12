import { Shader } from './Shader.js'

/**
 *  @param {object} options
 * *compose*: compose operation: add, subtract, multiply, etc.
 */

class ShaderCombiner extends Shader {
	constructor(options) {
		super(options);

		this.mode = 'mean', //Lighten Darken Contrast Inversion HSV components LCh components
		this.samplers = [
			{ id:0, name:'source1', type:'vec3' },
			{ id:1, name:'source2', type:'vec3' }
		];

		this.modes = {
			'first': 'color = c1;',
			'second': 'color = c2;',
			'mean': 'color = (c1 + c2)/2.0;',
			'diff': 'color = vec4(c2.rgb - c1.rgb, c1.a);'
		};

	}

	setMode(mode) {
		if(!(mode in this.modes))
			throw Error("Unknown mode: " + mode);
		this.mode = mode;
		this.needsUpdate = true;
	}

	fragShaderSrc(gl) {
		let gl2 = !(gl instanceof WebGLRenderingContext);
		let operation = this.modes[this.mode];
		return `${gl2? '#version 300 es' : ''}

precision highp float; 
precision highp int; 

${gl2? 'in' : 'varying'} vec2 v_texcoord;

uniform sampler2D source1;
uniform sampler2D source2;

${gl2? 'out' : ''} vec4 color;

void main() {
	vec4 c1 = texture(source1, v_texcoord);
	vec4 c2 = texture(source2, v_texcoord);
	${operation};
	${gl2?'':'gl_FragColor = color;'}
}
`;
	}

	vertShaderSrc(gl) {
		let gl2 = !(gl instanceof WebGLRenderingContext);
		return `${gl2? '#version 300 es':''}

precision highp float; 
precision highp int; 

${gl2? 'in' : 'attribute'} vec4 a_position;
${gl2? 'in' : 'attribute'} vec2 a_texcoord;

${gl2? 'out' : 'varying'} vec2 v_texcoord;

void main() {
	gl_Position = a_position;
	v_texcoord = a_texcoord;
}`;
	}
}


export { ShaderCombiner }
