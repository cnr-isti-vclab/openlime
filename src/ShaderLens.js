import {Shader} from './Shader.js'

class ShaderLens extends Shader {
    constructor(options) {
        super(options);
        
        this.samplers = [
			{ id:0, name:'source0' }, { id:1, name:'source1' }
		];
        
        this.uniforms = {
            u_lens: { type: 'vec4', needsUpdate: true, size: 4, value: [0,0,100,10] },
            u_width_height: { type: 'vec2', needsUpdate: true, size: 2, value: [1,1]}
        };
        this.label = "ShaderLens";
        this.needsUpdate = true;
        this.secondLayerEnabled = false;
    }

    setSecondLayerEnabled(x) {
        this.secondLayerEnabled = x;
        this.needsUpdate = true;
    }

    setLensUniforms(lensViewportCoords, windowWH) {
        this.setUniform('u_lens', lensViewportCoords);
        this.setUniform('u_width_height', windowWH);
    }
    
	fragShaderSrc(gl) {
		let gl2 = !(gl instanceof WebGLRenderingContext);

        let samplerDeclaration = `uniform sampler2D ` + this.samplers[0].name + `;`;
        let secondSamplerCode = "";

        if (this.secondLayerEnabled) { //FIXME two cases with transparence or not.
            samplerDeclaration += `uniform sampler2D ` + this.samplers[1].name + `;`;

            secondSamplerCode =  
            `vec4 c1 = texture${gl2?'':'2D'}(source1, v_texcoord);
            if (centerDist2 > lensR2) {
                float k = 0.5;// (c1.r + c1.g + c1.b) / 3.0;
                c1 = vec4(k, k, k, c1.a);
            }
            color = color * (1.0 - c1.a) + c1 * c1.a;
            `
        }
		return `${gl2? '#version 300 es':''}

        precision highp float; 
        precision highp int; 

        ${samplerDeclaration}
        uniform vec4 u_lens;
        uniform vec2 u_width_height; // Keep wh to map to pixels. TexCoords cannot be integer unless using texture_rectangle
        ${gl2? 'in' : 'varying'} vec2 v_texcoord;
        ${gl2? 'out' : ''} vec4 color;

        void main() {
            float lensR2 = u_lens.z * u_lens.z;
            float innerBorderR2 = (u_lens.z - u_lens.w) * (u_lens.z - u_lens.w);
            float dx = v_texcoord.x * u_width_height.x - u_lens.x;
            float dy = v_texcoord.y * u_width_height.y - u_lens.y;
            float centerDist2 = dx*dx+dy*dy;

            color = vec4(0.0, 0.0, 0.0, 0.0);
            if (centerDist2 < innerBorderR2) {
                color = texture${gl2?'':'2D'}(source0, v_texcoord);
            } else if (centerDist2 < lensR2) {
                const float k = 0.8;
                color = vec4(k,0,0,1.0);
            }
            ${secondSamplerCode}
            ${gl2?'':'gl_FragColor = color;'}

        }
        `
    }

    vertShaderSrc(gl) {
		let gl2 = !(gl instanceof WebGLRenderingContext);
		return `${gl2? '#version 300 es':''}

precision highp float; 
precision highp int; 

${gl2? 'in' : 'attribute'} vec4 a_position;
${gl2? 'in' : 'attribute'} vec2 a_texcoord;

${gl2? 'out' : 'varying'} vec2 v_texcoord;
void main() {
	gl_Position = a_position;
    v_texcoord = a_texcoord;
}`;
	}
}

export {ShaderLens}
