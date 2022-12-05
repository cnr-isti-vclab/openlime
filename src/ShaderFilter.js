class ShaderFilter {
    constructor(options) {
        options = Object.assign({
        }, options);
        Object.assign(this, options);
        this.name = this.constructor.name;
        this.uniforms = {};
        this.samplers = [];
        this.needsUpdate = true;
    }

    // Callback in Shader.js
    prepare(gl) {
        if(this.needsUpdate)
            this.createTextures(gl);
        this.needsUpdate = false;
    }

    // Callback to create textures for samplers
    createTextures(gl) {
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


export { ShaderFilter, ShaderFilterTest }