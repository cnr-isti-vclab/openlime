import { Shader } from './Shader.js'

/**
 * ShaderHDR provides enhanced HDR tone mapping capabilities.
 * It extends the base Shader class to include tone mapping operations
 * and additional uniforms for HDR rendering.
 * 
 * Features:
 * - Reinhard tone mapping with highlight preservation
 * - Configurable white point for HDR compression
 * - Linear space processing
 * 
 * @extends Shader
 */
class ShaderHDR extends Shader {
    /**
     * Creates a new enhanced ShaderHDR instance.
     * 
     * @param {Object} options - Shader configuration options
     * @param {boolean} [options.isLinear=true] - Whether the shader operates in linear space
     * @param {string[]} [options.modes=['reinhard']] - Available tone mapping modes
     * @param {string} [options.mode='reinhard'] - Default tone mapping mode
     * @param {Object[]} [options.samplers] - Texture samplers for the shader
     */
    constructor(options) {
        // Set default options
        options = Object.assign({
            isLinear: true,  // Important: we work in linear space!
            modes: ['reinhard'],
            mode: 'reinhard',
            uniforms: {
                'whitePoint': { type: 'float', needsUpdate: true, value: 1.0 },
            }
        }, options);

        super(options);

        /**
         * Tone mapping operations available in the shader.
         * @type {Object.<string, string>}
         */
        this.toneMapOperations = {
            // Enhanced Reinhard operator with highlight preservation
            'reinhard': `
                color.rgb = (color.rgb * (1.0 + color.rgb / (whitePoint * whitePoint))) / (1.0 + color.rgb);
            `
        };

        // Set default samplers if not provided
        if (!this.samplers || this.samplers.length === 0) {
            this.samplers = [
                { id: 0, name: 'source', type: 'rgba16f' }
            ];
        }
    }

    /**
     * Generates the fragment shader source code with enhanced HDR tone mapping.
     * 
     * @returns {string} GLSL source code for the fragment shader
     * @override
     */
    fragShaderSrc() {
        // Get the selected tone mapping operation
        const toneMapOperation = this.toneMapOperations[this.mode];
        console.log(this.mode);
        console.log(toneMapOperation);

        return `
in vec2 v_texcoord;

// Uniforms for tone mapping and enhancements
uniform float whitePoint;

vec4 data() {
    // Sample the HDR texture (already in linear space)
    vec4 color = texture(source, v_texcoord);
    
    // Apply selected tone mapping operation to compress HDR values
    ${toneMapOperation}
    
    // Return the tone-mapped color in linear space
    // The final gamma correction will be applied by Canvas.js

    return vec4(color.rgb, color.a);
}
`;
    }

    /**
     * Sets the white point uniform for the shader.
     * 
     * @param {number} whitePoint - The new value for the white point
     */
    setWhitePoint(whitePoint) {
        this.setUniform('whitePoint', whitePoint);
    }
}

export { ShaderHDR };