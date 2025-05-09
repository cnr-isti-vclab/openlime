import { Shader } from './Shader.js'

/**
 * @typedef {Object} ShaderCombiner~Operation
 * A shader operation that combines two textures.
 * @property {string} first - Assigns first texture as output (cout = c1)
 * @property {string} second - Assigns second texture as output (cout = c2)
 * @property {string} mean - Calculates average of textures (cout = (c1 + c2)/2.0)
 * @property {string} diff - Calculates difference between textures (cout = c2.rgb - c1.rgb)
 */

/**
 * Fired when shader combination mode changes.
 * @event ShaderCombiner#update
 * @type {Object}
 * @property {string} mode - New combination mode
 * @property {string} previousMode - Previous combination mode
 */

/**
 * ShaderCombiner module provides texture combination operations for OpenLIME.
 * Supports WebGL 2.0+ GLSL specifications with automatic version detection.
 * 
 * ShaderCombiner class manages the combination of two input textures using various operations.
 * Features:
 * - Multiple combination modes (first, second, mean, diff)
 * - Automatic texture sampling
 * - WebGL 2.0+
 * - Alpha channel preservation
 * 
 * @extends Shader
 */
class ShaderCombiner extends Shader {
	/**
	 * Creates a new ShaderCombiner instance.
	 * @param {Object} [options] - Configuration options
	 * @param {string} [options.mode='mean'] - Combination mode to use
	 * @param {Array<Object>} [options.samplers] - Texture sampler definitions (inherited from Shader)
	 * @param {Object} [options.uniforms] - Shader uniform variables (inherited from Shader)
	 * @param {string} [options.label] - Display label for the shader (inherited from Shader)
	 * @param {boolean} [options.debug] - Enable debug output (inherited from Shader)
	 * @fires Shader#update
	 */
	constructor(options) {
		super(options);

		this.mode = 'mean', //Lighten Darken Contrast Inversion HSV components LCh components
			this.samplers = [
				{ id: 0, name: 'source1', type: 'vec3' },
				{ id: 1, name: 'source2', type: 'vec3' }
			];

		this.modes = ['first', 'second', 'mean', 'diff'];
		this.operations = {
			'first': 'color = c1;',
			'second': 'color = c2;',
			'mean': 'color = (c1 + c2)/2.0;',
			'diff': 'color = vec4(c2.rgb - c1.rgb, c1.a);'
		};
	}

	/**
	 * Gets fragment shader source code.
	 * Implements texture combination operations.
	 * @param {WebGLRenderingContext} gl - WebGL context
	 * @returns {string} Fragment shader source code
	 * @private
	 */
	fragShaderSrc(gl) {
		let operation = this.operations[this.mode];
		return `

in vec2 v_texcoord;

vec4 data() {
	vec4 c1 = texture(source1, v_texcoord);
	vec4 c2 = texture(source2, v_texcoord);
	vec4 color;
	${operation};
	return color;
}
`;
	}

	/**
	 * Gets vertex shader source code.
	 * Provides basic vertex transformation and texture coordinate passing.
	 * @param {WebGLRenderingContext} gl - WebGL context
	 * @returns {string} Vertex shader source code
	 * @private
	 */
	vertShaderSrc(gl) {
		return `#version 300 es


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
