import { Shader } from './Shader.js'

/**
 * @typedef {Object} ShaderLens~Uniforms
 * Uniform definitions for lens shader
 * @property {number[]} u_lens - Lens parameters [centerX, centerY, radius, borderWidth]
 * @property {number[]} u_width_height - Viewport dimensions [width, height]
 * @property {number[]} u_border_color - RGBA border color [r, g, b, a]
 * @property {boolean} u_border_enable - Whether to show lens border
 */

/**
 * @typedef {Object} ShaderLens~Options
 * Configuration options for lens shader
 * @property {string} [label='ShaderLens'] - Display label
 * @property {boolean} [overlayLayerEnabled=false] - Enable overlay layer
 * @property {Object} [uniforms] - Custom uniform values
 * @extends Shader~Options
 */

/**
 * ShaderLens implements a circular magnification lens effect with optional overlay.
 * 
 * Features:
 * - Circular lens with smooth borders
 * - Configurable lens size and position
 * - Optional border with customizable color
 * - Optional overlay layer with grayscale outside lens
 * - Smooth transition between lens and background
 * - Real-time lens movement
 * 
 * Technical Implementation:
 * - Pixel-based distance calculations
 * - Smooth border transitions
 * - Alpha blending for overlays
 * - WebGL 1.0 and 2.0 compatibility
 * - Viewport coordinate mapping
 * 
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
 * 
 * // Enable overlay
 * lens.setOverlayLayerEnabled(true);
 * ```
 * 
 * Advanced usage with custom configuration:
 * ```javascript
 * const lens = new ShaderLens({
 *     uniforms: {
 *         u_lens: { value: [0, 0, 150, 15] },
 *         u_border_color: { value: [1, 0, 0, 1] }  // red border
 *     },
 *     overlayLayerEnabled: true
 * });
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
 * 2. Overlay Processing:
 *    - Grayscale conversion
 *    - Alpha blending
 *    - Border preservation
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
 * - {sampler2D} source1 - Optional overlay texture
 *
 * @extends Shader
 */
class ShaderLens extends Shader {
    /**
     * Creates a new lens shader
     * @param {ShaderLens~Options} [options] - Configuration options
     * 
     * @example
     * ```javascript
     * // Create basic lens shader
     * const lens = new ShaderLens({
     *     label: 'MyLens',
     *     overlayLayerEnabled: false
     * });
     * ```
     */
    constructor(options) {
        super(options);

        this.samplers = [
            { id: 0, name: 'source0' }, { id: 1, name: 'source1' }
        ];

        this.uniforms = {
            u_lens: { type: 'vec4', needsUpdate: true, size: 4, value: [0, 0, 100, 10] },
            u_width_height: { type: 'vec2', needsUpdate: true, size: 2, value: [1, 1] },
            u_border_color: { type: 'vec4', needsUpdate: true, size: 4, value: [0.8, 0.8, 0.8, 1] },
            u_border_enable: { type: 'bool', needsUpdate: true, size: 1, value: false }
        };
        this.label = "ShaderLens";
        this.needsUpdate = true;
        this.overlayLayerEnabled = false;
    }

    /**
     * Enables or disables the overlay layer
     * When enabled, adds a second texture layer with grayscale outside lens
     * @param {boolean} enabled - Whether to enable overlay
     */
    setOverlayLayerEnabled(x) {
        this.overlayLayerEnabled = x;
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
     * Generates fragment shader source code.
     * 
     * Shader Features:
     * - Circular lens implementation
     * - Smooth border transitions
     * - Optional overlay support
     * - Grayscale conversion outside lens
     * 
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} Fragment shader source code
     * @private
     */
    fragShaderSrc(gl) {
        let gl2 = !(gl instanceof WebGLRenderingContext);

        let samplerDeclaration = `uniform sampler2D ` + this.samplers[0].name + `;`;
        let overlaySamplerCode = "";

        if (this.overlayLayerEnabled) { //FIXME two cases with transparence or not.
            samplerDeclaration += `uniform sampler2D ` + this.samplers[1].name + `;`;

            overlaySamplerCode =
                `vec4 c1 = texture${gl2 ? '' : '2D'}(source1, v_texcoord);
            if (r > u_lens.z) {
                float k = (c1.r + c1.g + c1.b) / 3.0;
                c1 = vec4(k, k, k, c1.a);
            } else if (u_border_enable && r > innerBorderRadius) {
                // Preserve border keeping c1 alpha at zero
                c1.a = 0.0; 
            }
            color = color * (1.0 - c1.a) + c1 * c1.a;
            `
        }
        return `

        ${samplerDeclaration}
        uniform vec4 u_lens; // [cx, cy, radius, border]
        uniform vec2 u_width_height; // Keep wh to map to pixels. TexCoords cannot be integer unless using texture_rectangle
        uniform vec4 u_border_color;
        uniform bool u_border_enable;
        ${gl2 ? 'in' : 'varying'} vec2 v_texcoord;

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
            float innerBorderRadius = (u_lens.z - u_lens.w);
            float dx = v_texcoord.x * u_width_height.x - u_lens.x;
            float dy = v_texcoord.y * u_width_height.y - u_lens.y;
            float r = sqrt(dx*dx + dy*dy);

            vec4 c_in = texture${gl2 ? '' : '2D'}(source0, v_texcoord);
            vec4 c_out = u_border_color; c_out.a=0.0;
            
            color = lensColor(c_in, u_border_color, c_out, r, u_lens.z, u_lens.w);

            ${overlaySamplerCode}
            return color;
        }
        `
    }

    /**
     * Generates vertex shader source code.
     * 
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

export { ShaderLens }
