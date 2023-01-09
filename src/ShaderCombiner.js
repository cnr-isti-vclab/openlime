import { Shader } from './Shader.js'

/**
 * The **ShaderCombiner** class specifies a shader that computes an output texture as a combination of two input textures.
 * It defines four modes (shader behaviors): 
 * * 'first' assigns the first texture as output (draws the first texture). The color of each fragment is cout=c1
 * * 'second' assigns the second texture as output (draws the second texture). The color of each fragment is cout=c2
 * * 'mean' calculates the average color of the two textures. The color of each fragment is cout=(c1+c2)/2.0
 * * 'diff' calculates the difference between the color of the textures. Color of each fragment is cout=c2.rgb-c1.rgb
 * 
 * Extends {@link Shader}.
 */
class ShaderCombiner extends Shader {
	/**
	 * Instantiates a **ShaderCombiner** class.
	 * An object literal with ShaderCombiner `options` can be specified.
	 * @param {Object} [options] An object literal with options that inherits from {@link Shader}.
	 */
	constructor(options) {
		super(options);

		this.mode = 'mean', //Lighten Darken Contrast Inversion HSV components LCh components
		this.samplers = [
			{ id:0, name:'source1', type:'vec3' },
			{ id:1, name:'source2', type:'vec3' }
		];

		this.modes = ['first','second','mean','diff'];
		this.operations = {
			'first': 'color = c1;',
			'second': 'color = c2;',
			'mean': 'color = (c1 + c2)/2.0;',
			'diff': 'color = vec4(c2.rgb - c1.rgb, c1.a);'
		};
	}

	/** @ignore */
	fragShaderSrc(gl) {
		let gl2 = !(gl instanceof WebGLRenderingContext);
		let operation = this.operations[this.mode];
		return `

${gl2? 'in' : 'varying'} vec2 v_texcoord;

uniform sampler2D source1;
uniform sampler2D source2;

vec4 data() {
	vec4 c1 = texture(source1, v_texcoord);
	vec4 c2 = texture(source2, v_texcoord);
	vec4 color;
	${operation};
	return color;
}
`;
	}

	/** @ignore */
	vertShaderSrc(gl) {
		let gl2 = !(gl instanceof WebGLRenderingContext);
		return `${gl2? '#version 300 es':''}


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
