import { Shader } from './Shader.js'

/**
 * ShaderHDR provides enhanced HDR tone mapping capabilities.
 * It extends the base Shader class to include tone mapping operations
 * and additional uniforms for HDR rendering.
 * 
 * Features:
 * - Multiple tone mapping operators: Reinhard, ACES, and Exposure
 * - Configurable parameters for each operator
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
     * @param {string[]} [options.modes=['reinhard', 'aces', 'exposure']] - Available tone mapping modes
     * @param {string} [options.mode='reinhard'] - Default tone mapping mode
     * @param {Object[]} [options.samplers] - Texture samplers for the shader
     */
    constructor(options) {
        // Set default options
        options = Object.assign({
            isLinear: true,  // Important: we work in linear space!
            format: 'rgba16f',
        }, options);

        super(options);

        this.modes = ['reinhard', 'aces', 'exposure', 'balanced'];
        this.mode = options.mode || 'reinhard';
        this.uniforms = {
            'whitePoint': { type: 'float', needsUpdate: true, value: 1.0 },
            'shadowLift': { type: 'float', needsUpdate: true, value: 0.0 },
            'acesContrast': { type: 'float', needsUpdate: true, value: 1.6 },
            'exposure': { type: 'float', needsUpdate: true, value: 1.0 },
            'highlightCompression': { type: 'float', needsUpdate: true, value: 1.0 },
        }
        this.samplers.push({ id: 0, name: 'source', type: this.format });

        /**
         * Tone mapping operations available in the shader.
         * @type {Object.<string, string>}
         */
        this.toneMapOperations = {
            // Enhanced Reinhard operator with highlight preservation
            'reinhard': `
                // Enhanced Reinhard with both whitePoint and shadowLift parameters
                // Apply shadowLift pre-tone mapping to brighten shadows
                color.rgb = mix(color.rgb, pow(color.rgb, vec3(0.4)), shadowLift);

                // Reinhard tone mapping with more sensitive whitePoint
                float wp = max(0.1, whitePoint);
                color.rgb = (color.rgb * (1.0 + color.rgb/(wp))) / (1.0 + color.rgb);

                // Apply shadowLift post-tone mapping for more pronounced effect
                color.rgb = mix(color.rgb, pow(color.rgb, vec3(0.6)), shadowLift * 0.5);
                `,
            // ACES filmic tone mapping operator
            'aces': `
                // ACES filmic tone mapping approximation
                // Based on formula from Krzysztof Narkowicz
                // https://knarkowicz.wordpress.com/2016/01/06/aces-filmic-tone-mapping-curve/
                // Allows for contrast adjustment with acesContrast parameter
                
                // Apply contrast parameter
                color.rgb *= acesContrast;
                
                // ACES tone mapping formula
                const vec3 a = vec3(2.51);
                const vec3 b = vec3(0.03);
                const vec3 c = vec3(2.43);
                const vec3 d = vec3(0.59);
                const vec3 e = vec3(0.14);
                
                color.rgb = (color.rgb * (a * color.rgb + b)) / (color.rgb * (c * color.rgb + d) + e);
                
                // Clamp to prevent artifacts
                color.rgb = clamp(color.rgb, 0.0, 1.0);
            `,
            // Simple exposure-based tone mapping
            'exposure': `
                // Apply exposure adjustment
                // exposure = 1.0 means no change, > 1.0 brightens, < 1.0 darkens
                color.rgb = vec3(1.0) - exp(-color.rgb * exposure);
            `,
            // New balanced operator
            'balanced': `
                // Lift shadows slightly to enhance details in dark areas
                color.rgb = mix(color.rgb, pow(color.rgb, vec3(0.5)), 0.05);

                // Adaptive scaling for highlights based on highlightCompression
                float hc = max(0.1, highlightCompression); // Avoid division by zero
                color.rgb = color.rgb / (color.rgb + vec3(hc));

                // Apply logarithmic compression for highlights
                color.rgb = log(1.0 + color.rgb) / log(1.0 + hc);

                // Clamp to prevent overexposure
                color.rgb = clamp(color.rgb, 0.0, 1.0);
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
        const toneMapOperation = this.toneMapOperations[this.mode] || this.toneMapOperations['reinhard'];
        console.log(this.mode);
        console.log(toneMapOperation);

        return `
in vec2 v_texcoord;

// Uniforms for tone mapping and enhancements
uniform float whitePoint;
uniform float shadowLift;
uniform float acesContrast;
uniform float exposure;
uniform float highlightCompression;

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

    /**
     * Sets the shadow lift parameter for the shader.
     * 
     * @param {number} shadowLift - The new value for shadow lift
     */
    setShadowLift(shadowLift) {
        this.setUniform('shadowLift', shadowLift);
    }

    /**
     * Sets the ACES contrast parameter for the shader.
     * 
     * @param {number} acesContrast - The new value for ACES contrast
     */
    setAcesContrast(acesContrast) {
        this.setUniform('acesContrast', acesContrast);
    }

    /**
     * Sets the exposure parameter for the shader.
     * 
     * @param {number} exposure - The new value for the exposure
     */
    setExposure(exposure) {
        this.setUniform('exposure', exposure);
    }

    /**
     * Sets the highlight compression parameter for the shader.
     * 
     * @param {number} highlightCompression - The new value for highlight compression
     */
    setHighlightCompression(highlightCompression) {
        this.setUniform('highlightCompression', highlightCompression);
    }
}

export { ShaderHDR };