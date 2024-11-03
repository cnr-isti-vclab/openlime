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
 * @class
 * @extends Shader
 * ShaderCombiner module provides texture combination operations for OpenLIME.
 * Supports both WebGL 1.0 and 2.0/3.0 GLSL specifications with automatic version detection.
 * 
 * ShaderCombiner class manages the combination of two input textures using various operations.
 * Features:
 * - Multiple combination modes (first, second, mean, diff)
 * - Automatic texture sampling
 * - WebGL 1.0 and 2.0 compatibility
 * - Alpha channel preservation
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
		let gl2 = !(gl instanceof WebGLRenderingContext);
		let operation = this.operations[this.mode];
		return `

${gl2 ? 'in' : 'varying'} vec2 v_texcoord;

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

	/**
	 * Gets vertex shader source code.
	 * Provides basic vertex transformation and texture coordinate passing.
	 * @param {WebGLRenderingContext} gl - WebGL context
	 * @returns {string} Vertex shader source code
	 * @private
	 */
	vertShaderSrc(gl) {
		let gl2 = !(gl instanceof WebGLRenderingContext);
		return `${gl2 ? '#version 300 es' : ''}


${gl2 ? 'in' : 'attribute'} vec4 a_position;
${gl2 ? 'in' : 'attribute'} vec2 a_texcoord;

${gl2 ? 'out' : 'varying'} vec2 v_texcoord;

void main() {
	gl_Position = a_position;
	v_texcoord = a_texcoord;
}`;
	}
}

/**
 * Example usage:
 * ```javascript
 * // Create shader to average two textures
 * const combiner = new ShaderCombiner({
 *     mode: 'mean',
 *     samplers: [
 *         { id: 0, name: 'source1', type: 'vec3' },
 *         { id: 1, name: 'source2', type: 'vec3' }
 *     ]
 * });
 * 
 * // Change combination mode
 * combiner.setMode('diff');
 * 
 * // Use first texture only
 * combiner.setMode('first');
 * ```
 * 
 * Advanced usage with custom configuration:
 * ```javascript
 * const combiner = new ShaderCombiner({
 *     mode: 'mean',
 *     debug: true,
 *     label: 'Texture Combiner',
 *     samplers: [
 *         { 
 *             id: 0, 
 *             name: 'source1', 
 *             type: 'vec3',
 *             label: 'First Texture'
 *         },
 *         { 
 *             id: 1, 
 *             name: 'source2', 
 *             type: 'vec3',
 *             label: 'Second Texture'
 *         }
 *     ]
 * });
 * 
 * // Bind textures and render...
 * ```
 */

/**
 * Default class properties
 * 
 * @property {string} mode - Current combination mode (default: 'mean')
 * @property {Array<Object>} samplers - Texture sampler definitions
 * @property {Array<string>} modes - Available combination modes ['first', 'second', 'mean', 'diff']
 * @property {Object.<string,string>} operations - Shader operations for each mode
 */

/**
 * Fired when shader combination mode changes.
 * @event ShaderCombiner#update
 * @type {Object}
 * @property {string} mode - New combination mode
 * @property {string} previousMode - Previous combination mode
 */
export { ShaderCombiner }
