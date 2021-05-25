import {Shader} from './Shader.js'
import {Lens} from './Lens.js'

class ShaderLens extends Shader {
    constructor(options) {
        super(options);

        // if (!this.lens) {
        //     console.log("ShaderLens: Lens option required");
        //     throw "ShaderLens: Lens option required";
        // }
        // if (!this.camera) {
        //     console.log("ShaderLens: camera option required");
        //     throw "ShaderLens: camera option required";
        // }
        
        this.samplers = [
			{ id:0, name:'source0', type:'vec4' },
		];
        
        this.uniforms = {
            u_lens: { type: 'vec4', needsUpdate: true, size: 4, value: [0,0,100,10] },
            u_width_height: { type: 'vec2', needsUpdate: true, size: 2, value: [1,1]}
        };
        this.label = "ShaderLens";
        this.needsUpdate = true;
    }

    setLensUniforms(lensViewportCoords, windowWH) {
        this.setUniform('u_lens', lensViewportCoords);
        this.setUniform('u_width_height', windowWH);
    }
    
	fragShaderSrc(gl) {
        let gl2 = gl instanceof WebGL2RenderingContext;

		return `${gl2? '#version 300 es':''}

        precision highp float; 
        precision highp int; 

        uniform sampler2D source0;
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

            const float k = 0.8;
            color = vec4(k,k,k,1.0);
            if (centerDist2 > lensR2){
                discard;
            } else if (centerDist2 < innerBorderR2) {
                color = texture(source0, v_texcoord);
            }
            ${gl2?'':'gl_FragColor = color;'}

        }
        `
    }

    vertShaderSrc(gl) {
        let gl2 = gl instanceof WebGL2RenderingContext;
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
