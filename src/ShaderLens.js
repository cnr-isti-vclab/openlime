import { Shader } from './Shader.js'

/**
 * @typedef {Object} ShaderLens~Uniforms
 * Uniform definitions for lens shader
 * @property {number[]} u_lens - Lens parameters [centerX, centerY, radius, borderWidth]
 * @property {number[]} u_width_height - Viewport dimensions [width, height]
 * @property {number[]} u_border_color - RGBA border color [r, g, b, a]
 * @property {boolean} u_border_enable - Whether to show lens border
 * @property {number} u_smoothing - Gaussian smoothing strength in [0, 1]
 */

/**
 * @typedef {Object} ShaderLens~Options
 * Configuration options for lens shader
 * @property {string} [label='ShaderLens'] - Display label
 * @property {number} [smoothing=0] - Gaussian smoothing strength in [0, 1]
 * @property {boolean} [overlayLayerEnabled=false] - Enable overlay layer
 * @property {Object} [uniforms] - Custom uniform values
 * @extends Shader~Options
 */

/**
 * ShaderLens implements a circular magnification lens effect with single layer rendering.
 * 
 * Features:
 * - Circular lens with smooth borders
 * - Configurable lens size and position
 * - Optional border with customizable color
 * - Smooth transition between lens and background
 * - Single layer rendering (no overlay composition)
 * - Real-time lens movement
 * 
 * Technical Implementation:
 * - Pixel-based distance calculations
 * - Smooth border transitions
 * - Alpha blending for transparency
 * - WebGL 2.0+
 * - Viewport coordinate mapping
 * 
 * Example usage:
 * ```javascript
 * // Create lens shader
 * const lens = new ShaderLens();
 * 
 * // Configure lens
 * lens.setLensUniforms(
 *     [400, 300, 100, 10],  // center at (400,300), radius 100, border 10
 *     [800, 600],           // viewport size
 *     [0.8, 0.8, 0.8, 1],   // gray border
 *     true                  // show border
 * );
 * ```
 * 
 * GLSL Implementation Details
 * 
 * Key Components:
 * 1. Lens Function:
 *    - Distance-based circle calculation
 *    - Smooth border transitions
 *    - Color mixing and blending
 * 
 * Functions:
 * - lensColor(): Handles color transitions between lens regions
 * - data(): Main processing function
 * 
 * Uniforms:
 * - {vec4} u_lens - Lens parameters [cx, cy, radius, border]
 * - {vec2} u_width_height - Viewport dimensions
 * - {vec4} u_border_color - Border color and alpha
 * - {bool} u_border_enable - Border visibility flag
 * - {sampler2D} source0 - Main texture
 *
 * @extends Shader
 */
class ShaderLens extends Shader {
    /**
     * Creates a new lens shader
     * @param {Object} [options] - Configuration options
     * 
     * @example
     * ```javascript
     * // Create basic lens shader
     * const lens = new ShaderLens({
     *     label: 'MyLens'
     * });
     * ```
     */
    constructor(options = {}) {
        super(options);

        // Only one sampler needed for single layer rendering
        this.samplers = [
            { id: 0, name: 'source0' }
        ];

        this.registerUniforms({
            u_lens: { type: 'vec4', needsUpdate: true, size: 4, value: [0, 0, 100, 10] },
            u_width_height: { type: 'vec2', needsUpdate: true, size: 2, value: [1, 1] },
            u_border_color: { type: 'vec4', needsUpdate: true, size: 4, value: [0.8, 0.8, 0.8, 1] },
            u_border_enable: { type: 'bool', needsUpdate: true, size: 1, value: false },
            u_smoothing: { type: 'float', needsUpdate: true, size: 1, value: 0 }
        });
        this.setSmoothing(options.smoothing ?? 0);
        this.label = "ShaderLens";
        this.needsUpdate = true;
    }

    /**
     * Updates lens parameters and appearance
     * @param {number[]} lensViewportCoords - Lens parameters [centerX, centerY, radius, borderWidth]
     * @param {number[]} windowWH - Viewport dimensions [width, height]
     * @param {number[]} borderColor - RGBA border color
     * @param {boolean} borderEnable - Whether to show border
     */
    setLensUniforms(lensViewportCoords, windowWH, borderColor, borderEnable) {
        this.setUniform('u_lens', lensViewportCoords);
        this.setUniform('u_width_height', windowWH);
        this.setUniform('u_border_color', borderColor);
        this.setUniform('u_border_enable', borderEnable);
    }

    /**
     * Sets the strength of the optional 3x3 Gaussian low-pass filter.
     * A value of zero bypasses the additional texture samples.
     * @param {number} value Smoothing strength in the inclusive range [0, 1].
     */
    setSmoothing(value) {
        const strength = Number(value);
        if (!Number.isFinite(strength) || strength < 0 || strength > 1)
            throw new Error('Lens smoothing must be a finite value in [0, 1].');
        this.setUniform('u_smoothing', strength);
    }

    /**
     * Generates fragment shader source code.
     * 
     * Shader Features:
     * - Circular lens implementation
     * - Smooth border transitions
     * - Single layer rendering
     * 
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} Fragment shader source code
     * @private
     */
    fragShaderSrc(gl) {
        return `
        uniform vec4 u_lens; // [cx, cy, radius, border]
        uniform vec2 u_width_height; // Keep wh to map to pixels. TexCoords cannot be integer unless using texture_rectangle
        uniform vec4 u_border_color;
        uniform bool u_border_enable;
        uniform float u_smoothing;
        in vec2 v_texcoord;

        vec4 sourceColor() {
            vec4 center = texture(source0, v_texcoord);
            float strength = clamp(u_smoothing, 0.0, 1.0);
            if (strength <= 0.0) return center;

            // Normalized binomial kernel (1 2 1)^T (1 2 1). It strongly
            // attenuates pixel-scale noise while retaining broader edges.
            vec2 d = vec2(1.0) / u_width_height;
            vec4 filtered = center * 4.0;
            filtered += texture(source0, v_texcoord + vec2(-d.x, 0.0)) * 2.0;
            filtered += texture(source0, v_texcoord + vec2( d.x, 0.0)) * 2.0;
            filtered += texture(source0, v_texcoord + vec2(0.0, -d.y)) * 2.0;
            filtered += texture(source0, v_texcoord + vec2(0.0,  d.y)) * 2.0;
            filtered += texture(source0, v_texcoord + vec2(-d.x, -d.y));
            filtered += texture(source0, v_texcoord + vec2( d.x, -d.y));
            filtered += texture(source0, v_texcoord + vec2(-d.x,  d.y));
            filtered += texture(source0, v_texcoord + vec2( d.x,  d.y));
            filtered *= 1.0 / 16.0;
            return mix(center, filtered, strength);
        }

        vec4 lensColor(in vec4 c_in, in vec4 c_border, in vec4 c_out,
            float r, float R, float B) {
            vec4 result;
            if (u_border_enable) {
                float B_SMOOTH = B < 8.0 ? B/8.0 : 1.0;
                if (r<R-B+B_SMOOTH) {
                    float t=smoothstep(R-B, R-B+B_SMOOTH, r);
                    result = mix(c_in, c_border, t);
                } else if (r<R-B_SMOOTH) {
                    result = c_border;  
                } else {
                    float t=smoothstep(R-B_SMOOTH, R, r);
                    result = mix(c_border, c_out, t);
                }
            } else {
                result = (r<R) ? c_in : c_out;
            }
            return result;
        }

        vec4 data() {
            vec4 color;
            float dx = v_texcoord.x * u_width_height.x - u_lens.x;
            float dy = v_texcoord.y * u_width_height.y - u_lens.y;
            float r = sqrt(dx*dx + dy*dy);

            vec4 c_in = sourceColor();
            vec4 c_out = u_border_color; c_out.a=0.0;
            
            color = lensColor(c_in, u_border_color, c_out, r, u_lens.z, u_lens.w);
            return color;
        }
        `;
    }

    /**
     * Generates vertex shader source code.
     * 
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

export { ShaderLens }
