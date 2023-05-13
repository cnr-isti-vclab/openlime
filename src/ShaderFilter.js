class ShaderFilter {
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

    // Callback in Shader.js
    prepare(gl) {
        if (this.needsUpdate)
            if (this.createTextures) this.createTextures(gl);
        this.needsUpdate = false;
    }

    // Callback to create textures for samplers
    // async createTextures(gl) {
    // }

    // Constant (modes) declarations in shader program 
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
	 * Sets the value of a uniform variable.
	 * @param {string} name The name of the uniform variable (it will be converted with the unique filter name).
	 * @param {*} value The value to assign.
	 */
    setUniform(name, value) {
        if(!this.shader) {
            throw Error(`Shader not registered`);
        }
        this.shader.setUniform(this.uniformName(name), value);
    }

    // Sampler declarations in shader program 
    fragSamplerSrc() {
        let src = '';
        for (let s of this.samplers) {
            src += `
            uniform sampler2D ${s.name};`;
        }
        return src;
    }

    // Uniform declarations in shader program 
    fragUniformSrc() {
        let src = '';
        for (const [key, value] of Object.entries(this.uniforms)) {
            src += `
            uniform ${this.uniforms[key].type} ${key};`;
        }
        return src;
    }

    fragDataSrc(gl) {
        return null;
    }

    functionName() {
        return this.name + "_data";
    }

    samplerName(name) {
        return `${this.name}_${name}`;
    }

    uniformName(name) {
        return `u_${this.name}_${name}`;
    }

    modeName(name) {
        return `m_${this.name}_${name}`;
    }

    getSampler(name) {
        const samplername = this.samplerName(name);
        return this.samplers.find(e => e.name == samplername);
    }
}

class ShaderFilterTest extends ShaderFilter {
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

class ShaderFilterOpacity extends ShaderFilter {
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

class ShaderGammaFilter extends ShaderFilter {
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