import { ShaderFilter } from './ShaderFilter.js'

// vector field https://www.shadertoy.com/view/4s23DG
// isolines https://www.shadertoy.com/view/Ms2XWc

/**
 * @typedef {Object} ShaderFilterColormap~Options
 * Configuration options for colormap filter
 * @property {number[]} [inDomain=[]] - Input value range [min, max] for mapping
 * @property {number[]} [channelWeights=[1/3, 1/3, 1/3]] - RGB channel weights for grayscale conversion
 * @property {number} [maxSteps=256] - Number of discrete steps in the colormap texture
 */

/**
 * 
 * @extends ShaderFilter
 * ShaderFilterColormap implements color mapping and visualization techniques.
 * Maps input RGB values to a specified colormap using customizable transfer functions.
 * 
 * Features:
 * - Custom colormap support
 * - Configurable input domain mapping
 * - Channel-weighted grayscale conversion
 * - Interpolated or discrete color mapping
 * - Out-of-range color handling
 * - GPU-accelerated processing
 * 
 * Technical Implementation:
 * - Uses 1D texture for colormap lookup
 * - Supports linear and nearest-neighbor interpolation
 * - Handles domain scaling and bias
 * - Configurable channel weight mixing
 * - WebGL 1.0 and 2.0 compatibility
 */
class ShaderFilterColormap extends ShaderFilter {
    /**
     * Creates a new colormap filter
     * @param {ColorScale} colorscale - Colorscale object defining the mapping
     * @param {ShaderFilterColormap~Options} [options] - Configuration options
     * @param {number[]} [options.inDomain=[]] - Input domain range [min, max]
     * @param {number[]} [options.channelWeights=[1/3, 1/3, 1/3]] - RGB channel weights
     * @param {number} [options.maxSteps=256] - Colormap resolution
     * @throws {Error} If inDomain is invalid (length !== 2 or min >= max)
     * 
     * @example
     * ```javascript
     * // Create with custom domain and weights
     * const filter = new ShaderFilterColormap(colorscale, {
     *     inDomain: [0, 100],
     *     channelWeights: [0.2126, 0.7152, 0.0722], // Perceptual weights
     *     maxSteps: 512
     * });
     * ```
     */
    constructor(colorscale, options) {
        super(options);
        options = Object.assign({
            inDomain: [],
            channelWeights: [1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0],
            maxSteps: 256,
        }, options);
        Object.assign(this, options);

        if (this.inDomain.length != 2 && this.inDomain[1] <= this.inDomain[0]) {
            throw Error("inDomain bad format");
        }

        this.colorscale = colorscale;
        if (this.inDomain.length == 0) this.inDomain = this.colorscale.rangeDomain();

        const cscaleDomain = this.colorscale.rangeDomain();
        const scale = (this.inDomain[1] - this.inDomain[0]) / (cscaleDomain[1] - cscaleDomain[0]);
        const bias = (this.inDomain[0] - cscaleDomain[0]) / (cscaleDomain[1] - cscaleDomain[0]);

        this.samplers = [{ name: `${this.samplerName('colormap')}` }];

        this.uniforms[this.uniformName('channel_weigths')] = { type: 'vec3', needsUpdate: true, size: 3, value: this.channelWeights };
        this.uniforms[this.uniformName('low_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.lowColor.value() };
        this.uniforms[this.uniformName('high_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.highColor.value() };
        this.uniforms[this.uniformName('scale')] = { type: 'float', needsUpdate: true, size: 1, value: scale };
        this.uniforms[this.uniformName('bias')] = { type: 'float', needsUpdate: true, size: 1, value: bias };

    }

    /**
     * Creates the colormap texture in WebGL.
     * Samples colorscale at specified resolution,
     * creates 1D RGBA texture, configures texture filtering,
     * and associates texture with sampler.
     * 
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {Promise<void>}
     * @private
     */
    async createTextures(gl) {
        const colormap = this.colorscale.sample(this.maxSteps);
        let textureFilter = gl.LINEAR;
        if (this.colorscale.type == 'bar') {
            textureFilter = gl.NEAREST;
        }
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureFilter);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.maxSteps, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, colormap.buffer);
        this.getSampler('colormap').tex = tex; // Link tex to sampler
    }

    /**
     * Generates the GLSL function for colormap lookup.
     * 
     * Processing steps:
     * 1. Channel-weighted grayscale conversion
     * 2. Domain scaling and bias
     * 3. Out-of-range handling
     * 4. Colormap texture lookup
     * 
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} GLSL function definition
     * @private
     */
    fragDataSrc(gl) {
        return `
            vec4 ${this.functionName()}(vec4 col){
                if(col.a == 0.0) return col;
                float v = dot(col.rgb, ${this.uniformName('channel_weigths')});
                float cv = v*${this.uniformName('scale')} + ${this.uniformName('bias')};

                if(cv >= 1.0) return ${this.uniformName('high_color')};
                if(cv <= 0.0) return ${this.uniformName('low_color')};

                return texture(${this.samplerName('colormap')}, vec2(cv, 0.5));
            }`;
    }


}

export { ShaderFilterColormap }