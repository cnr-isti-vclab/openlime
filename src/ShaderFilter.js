/**
 * @typedef {Object} ShaderFilter~Mode
 * A shader filter mode configuration
 * @property {string} id - Unique identifier for the mode
 * @property {boolean} enable - Whether the mode is active
 * @property {string} src - GLSL source code for the mode
 */

/**
 * @typedef {Object} ShaderFilter~Sampler
 * A texture sampler used by the filter
 * @property {string} name - Unique name for the sampler
 * @property {WebGLTexture} [texture] - Associated WebGL texture
 * @property {WebGLUniformLocation} [location] - GPU location for the sampler
 */

/**
 * 
 * Base class for WebGL shader filters in OpenLIME.
 * Provides infrastructure for creating modular shader effects that can be chained together.
 * 
 * Features:
 * - Modular filter architecture
 * - Automatic uniform management
 * - Dynamic mode switching
 * - Texture sampling support
 * - GLSL code generation
 * - Unique naming conventions
 * 
 * Technical Implementation:
 * - Generates unique names for uniforms and samplers
 * - Manages WebGL resource lifecycle
 * - Supports multiple filter modes
 * - Handles shader program integration
 */
class ShaderFilter {
    /**
     * Creates a new shader filter
     * @param {Object} [options] - Filter configuration
     * @param {ShaderFilter~Mode} [options.modes={}] - Available filter modes
     * @param {Object} [options.uniforms={}] - Filter uniform variables
     * @param {Array<ShaderFilter~Sampler>} [options.samplers=[]] - Texture samplers
     */
    constructor(options) {
        options = Object.assign({
        }, options);
        Object.assign(this, options);
        this.name = this.constructor.name;
        this.uniforms = {};
        this.samplers = [];
        this.needsUpdate = true;
        this.shader = null;

        this.modes = {};
    }

    /**
     * Sets the active mode for the filter
     * @param {string} mode - Mode category to modify
     * @param {string} id - Specific mode ID to enable
     * @throws {Error} If shader not registered or mode doesn't exist
     */
    setMode(mode, id) {
        if (!this.shader)
            throw Error("Shader not registered");

        if (Object.keys(this.modes).length > 0) {
            const list = this.modes[mode];
            if (list) {
                list.map(a => {
                    a.enable = a.id == id;
                });
                this.shader.needsUpdate = true;
            } else {
                throw Error(`Mode "${mode}" not exist!`);
            }
        }
    }

    /**
     * Prepares filter resources for rendering
     * @param {WebGLRenderingContext} gl - WebGL context
     * @private
     */
    prepare(gl) {
        if (this.needsUpdate)
            if (this.createTextures) this.createTextures(gl);
        this.needsUpdate = false;
    }


    /**
     * Generates mode-specific GLSL code
     * @returns {string} GLSL declarations for enabled modes
     * @private
     */
    fragModeSrc() {
        let src = '';
        for (const key of Object.keys(this.modes)) {
            for (const e of this.modes[key]) {
                if (e.enable) {
                    src += e.src + '\n';
                }
            }
        }
        return src;
    }

    /**
     * Sets a uniform variable value
     * @param {string} name - Base name of uniform variable
     * @param {number|boolean|Array} value - Value to set
     * @throws {Error} If shader not registered
     */
    setUniform(name, value) {
        if (!this.shader) {
            throw Error(`Shader not registered`);
        }
        this.shader.setUniform(this.uniformName(name), value);
    }

    /**
     * Generates sampler declarations
     * @returns {string} GLSL sampler declarations
     * @private
     */
    fragSamplerSrc() {
        let src = '';
        for (let s of this.samplers) {
            src += `
            uniform sampler2D ${s.name};`;
        }
        return src;
    }

    /**
     * Generates uniform variable declarations
     * @returns {string} GLSL uniform declarations
     * @private
     */
    fragUniformSrc() {
        let src = '';
        for (const [key, value] of Object.entries(this.uniforms)) {
            src += `
            uniform ${this.uniforms[key].type} ${key};`;
        }
        return src;
    }

    /**
     * Generates filter-specific GLSL function
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string|null} GLSL function definition
     * @virtual
     */
    fragDataSrc(gl) {
        return null;
    }

    // Utility methods documentation
    /**
     * @returns {string} Generated function name for the filter
     * @private
     */
    functionName() {
        return this.name + "_data";
    }

    /**
     * @param {string} name - Base sampler name
     * @returns {string} Unique sampler identifier
     * @private
     */
    samplerName(name) {
        return `${this.name}_${name}`;
    }

    /**
     * @param {string} name - Base uniform name
     * @returns {string} Unique uniform identifier
     * @private
     */
    uniformName(name) {
        return `u_${this.name}_${name}`;
    }

    /**
     * @param {string} name - Base mode name
     * @returns {string} Unique mode identifier
     * @private
     */
    modeName(name) {
        return `m_${this.name}_${name}`;
    }

    /**
     * Finds a sampler by name
     * @param {string} name - Base sampler name
     * @returns {ShaderFilter~Sampler|undefined} Found sampler or undefined
     */
    getSampler(name) {
        const samplername = this.samplerName(name);
        return this.samplers.find(e => e.name == samplername);
    }
}

/**
 * 
 * @extends ShaderFilter
 * Test filter that replaces transparent pixels with a specified color
 */
class ShaderFilterTest extends ShaderFilter {
    /**
     * Creates a test filter
     * @param {Object} [options] - Filter options
     * @param {number[]} [options.nodata_col=[1,1,0,1]] - Color for transparent pixels
     */
    constructor(options) {
        super(options);
        this.uniforms[this.uniformName('nodata_col')] = { type: 'vec4', needsUpdate: true, size: 4, value: [1, 1, 0, 1] };
    }

    fragDataSrc(gl) {
        return `
            vec4 ${this.functionName()}(vec4 col){
                return col.a > 0.0 ? col : ${this.uniformName('nodata_col')};
            }`;
    }
}

/**
 * 
 * @extends ShaderFilter
 * Filter that modifies the opacity of rendered content
 */
class ShaderFilterOpacity extends ShaderFilter {
    /**
     * Creates an opacity filter
     * @param {number} opacity - Initial opacity value [0-1]
     * @param {Object} [options] - Additional filter options
     */    
    constructor(opacity, options) {
        super(options);
        this.uniforms[this.uniformName('opacity')] = { type: 'float', needsUpdate: true, size: 1, value: opacity };
    }

    fragDataSrc(gl) {
        return `
            vec4 ${this.functionName()}(vec4 col){
                return vec4(col.rgb, col.a * ${this.uniformName('opacity')});
            }`;
    }
}

/**
 * 
 * @extends ShaderFilter
 * Filter that applies gamma correction to colors
 */
class ShaderGammaFilter extends ShaderFilter {
    /**
     * Creates a gamma correction filter
     * @param {Object} [options] - Filter options
     * @param {number} [options.gamma=2.2] - Gamma correction value
     */    
    constructor(options) {
        super(options);
        this.uniforms[this.uniformName('gamma')] = { type: 'float', needsUpdate: true, size: 1, value: 2.2 };
    }

    fragDataSrc(gl) {
        return `
            vec4 ${this.functionName()}(vec4 col){
                float igamma = 1.0/${this.uniformName('gamma')};
                return vec4(pow(col.r, igamma), pow(col.g, igamma), pow(col.b, igamma), col.a);
            }`;
    }
}

export { ShaderFilter, ShaderFilterTest, ShaderFilterOpacity, ShaderGammaFilter }