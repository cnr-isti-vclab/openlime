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

/**
 * 
 * @extends ShaderFilter
 * Filter that converts colors to grayscale with adjustable weights
 */
class ShaderFilterGrayscale extends ShaderFilter {
    /**
     * Creates a grayscale filter
     * @param {Object} [options] - Filter options
     * @param {number[]} [options.weights=[0.2126, 0.7152, 0.0722]] - RGB channel weights for luminance calculation
     */
    constructor(options) {
        super(options);

        // Default weights based on human perception of colors (ITU-R BT.709)
        this.uniforms[this.uniformName('weights')] = {
            type: 'vec3',
            needsUpdate: true,
            size: 3,
            value: [0.2126, 0.7152, 0.0722]
        };

        this.uniforms[this.uniformName('enable')] = {
            type: 'bool',
            needsUpdate: true,
            size: 1,
            value: true
        };

        // Add modes for different grayscale calculations
        this.modes['grayscale'] = [
            {
                id: 'luminance',
                enable: true,
                src: `
                // Luminance-based grayscale (perceptual)
                float grayscaleLuminance(vec3 color, vec3 weights) {
                    return dot(color, weights);
                }
                `
            },
            {
                id: 'average',
                enable: false,
                src: `
                // Simple average grayscale
                float grayscaleAverage(vec3 color) {
                    return (color.r + color.g + color.b) / 3.0;
                }
                `
            }
        ];
    }

    fragDataSrc(gl) {
        return `
            vec4 ${this.functionName()}(vec4 col) {
                if(!${this.uniformName('enable')}) return col;
                // Skip processing if fully transparent
                if (col.a <= 0.0) return col;
                float gray;
                
                // Use the active grayscale mode
                ${this.modes['grayscale'].find(m => m.id === 'luminance' && m.enable) ?
                `gray = grayscaleLuminance(col.rgb, ${this.uniformName('weights')});` :
                `gray = grayscaleAverage(col.rgb);`}
                
                // Apply grayscale conversion
                vec3 grayRGB = vec3(gray);
                
                return vec4(grayRGB, col.a);
            }`;
    }

    /**
     * Switches between grayscale calculation methods
     * @param {string} method - Either 'luminance' or 'average'
     */
    setGrayscaleMethod(method) {
        this.setMode('grayscale', method);
    }
}

/**
 * 
 * @extends ShaderFilter
 * Filter that adjusts the brightness of rendered content
 */
class ShaderFilterBrightness extends ShaderFilter {
    /**
     * Creates a brightness filter
     * @param {Object} [options] - Filter options
     * @param {number} [options.brightness=1.0] - Brightness value (0.0-2.0, where 1.0 is normal brightness)
     */
    constructor(options) {
        super(options);
        this.uniforms[this.uniformName('brightness')] = {
            type: 'float',
            needsUpdate: true,
            size: 1,
            value: options?.brightness || 1.0
        };

        this.uniforms[this.uniformName('enable')] = {
            type: 'bool',
            needsUpdate: true,
            size: 1,
            value: true
        };

        // Add modes for different brightness adjustments
        this.modes['brightness'] = [
            {
                id: 'linear',
                enable: true,
                src: `
                // Linear brightness adjustment
                vec3 adjustBrightnessLinear(vec3 color, float brightness) {
                    return color * brightness;
                }
                `
            },
            {
                id: 'preserve_saturation',
                enable: false,
                src: `
                // Brightness adjustment that preserves saturation by adjusting in HSL space
                vec3 adjustBrightnessPreserveSaturation(vec3 color, float brightness) {
                    // Convert RGB to HSL-like space
                    float maxChannel = max(max(color.r, color.g), color.b);
                    float minChannel = min(min(color.r, color.g), color.b);
                    float luminance = (maxChannel + minChannel) / 2.0;
                    
                    // Skip complex HSL conversion and just scale while preserving relative color relationships
                    if (maxChannel > 0.0) {
                        float scaleFactor = brightness;
                        // Adjust scale to prevent oversaturation
                        if (brightness > 1.0) {
                            float headroom = (1.0 - luminance) / luminance;
                            scaleFactor = min(brightness, 1.0 + headroom);
                        }
                        return color * scaleFactor;
                    }
                    
                    return color;
                }
                `
            }
        ];
    }

    fragDataSrc(gl) {
        return `
            vec4 ${this.functionName()}(vec4 col) {
                if(!${this.uniformName('enable')}) return col;
                // Skip processing if fully transparent
                if (col.a <= 0.0) return col;
                
                // Convert to linear space for proper brightness adjustment
                vec3 adjustedColor;
                
                // Use the active brightness mode
                ${this.modes['brightness'].find(m => m.id === 'linear' && m.enable) ?
                `adjustedColor = adjustBrightnessLinear(col.rgb, ${this.uniformName('brightness')});` :
                `adjustedColor = adjustBrightnessPreserveSaturation(col.rgb, ${this.uniformName('brightness')});`}
                
                // Clamp to prevent overflow
                adjustedColor = clamp(adjustedColor, 0.0, 1.0);
                
                // Convert back to sRGB space
                return vec4(adjustedColor, col.a);
            }`;
    }

    /**
     * Sets the brightness level
     * @param {number} value - Brightness value (0.0-2.0)
     */
    setBrightness(value) {
        // Clamp value to valid range
        const brightness = Math.max(0.0, Math.min(2.0, value));
        this.setUniform('brightness', brightness);
    }

    /**
     * Switches between brightness adjustment methods
     * @param {string} method - Either 'linear' or 'preserve_saturation'
     */
    setBrightnessMethod(method) {
        this.setMode('brightness', method);
    }
}

export { ShaderFilter, ShaderFilterTest, ShaderFilterOpacity, ShaderGammaFilter, ShaderFilterGrayscale, ShaderFilterBrightness }