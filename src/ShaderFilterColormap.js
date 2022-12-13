import { ShaderFilter } from './ShaderFilter.js'

// vector field https://www.shadertoy.com/view/4s23DG
// isolines https://www.shadertoy.com/view/Ms2XWc

class ShaderFilterColormap extends ShaderFilter {
    constructor(colorscale, options) {
        super(options);
        options = Object.assign({
            inDomain: [],
            channelWeights: [1.0 / 3.0, 1.0 / 3.0, 1.0 / 3.0],
            maxSteps: 256,
            type: 'Linear'
        }, options);
        Object.assign(this, options);

        if(this.inDomain.length != 2 && this.inDomain[1] <= this.inDomain[0]) {
            throw Error("inDomain bad format");
        }

        this.colorscale = colorscale;
        if (this.inDomain.length == 0) this.domain = this.colorscale.domain;

        const cscaleDomain = this.colorscale.rangeDomain();
        const scale = (this.inDomain[1]-this.inDomain[0])/(cscaleDomain[1]-cscaleDomain[0]);
        const bias = (this.inDomain[0]-cscaleDomain[0])/(cscaleDomain[1]-cscaleDomain[0]);
        
        this.samplers = [{ name:`${this.samplerName('colormap')}` }];

        this.uniforms[this.uniformName('channel_weigths')] = { type: 'vec3', needsUpdate: true, size: 3, value: this.channelWeights };
        this.uniforms[this.uniformName('low_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.lowColor.value() };
        this.uniforms[this.uniformName('high_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.highColor.value() };
        this.uniforms[this.uniformName('scale')] = { type: 'float', needsUpdate: true, size: 1, value: scale };
        this.uniforms[this.uniformName('bias')] = { type: 'float', needsUpdate: true, size: 1, value: bias };

    }

    createTextures(gl) {       
        const colormap = this.colorscale.sample(this.maxSteps, this.type);
        let textureFilter=gl.LINEAR;
        if(this.type == 'bar') textureFilter=gl.NEAREST;
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureFilter);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.maxSteps, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, colormap.buffer);
        this.getSampler('colormap').tex = tex; // Link tex to sampler
    }

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