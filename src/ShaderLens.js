import {Shader} from './Shader.js'
import {Lens} from './Lens.js'

class ShaderLens extends Shader {
    constructor(options) {
        super(options);

        if (!this.lens) {
            console.log("ShaderLens: Lens option required");
            throw "ShaderLens: Lens option required";
        }
        if (!this.camera) {
            console.log("ShaderLens: camera option required");
            throw "ShaderLens: camera option required";
        }
        
        this.samplers = [
			{ id:0, name:'source0', type:'vec3' },
		];
        
        const wh = [this.camera.viewport.w,this.camera.viewport.h];

        this.uniforms = {
            u_lens: { type: 'vec4', needsUpdate: true, size: 4 },
            u_width_height: { type: 'vec2', needsUpdate: true, size: 2, value: wh}
        };
        this.body = this.template();
        this.label = "ShaderLens";
        this.needsUpdate = true;
    }

    updateUniforms(gl, program) {
        const now = performance.now();
        const t = this.camera.getCurrentTransform(now);
        const v = this.camera.viewport;        
        const vl = this.lens.toViewport(t, v);
        this.setUniform('u_lens', vl);

        const wh = [v.w, v.h];
        this.setUniform('u_width_height', wh);

        super.updateUniforms(gl, program);
	}

    template() {
        return `#version 300 es

        precision highp float; 
        precision highp int; 

        uniform sampler2D source0;
        uniform vec4 u_lens;
        uniform vec2 u_width_height;
        in vec2 v_texcoord;
        out vec4 color;

        void main() {
            float lensR2 = u_lens.z * u_lens.z;
            float innerBorderR2 = (u_lens.z - u_lens.w) * (u_lens.z - u_lens.w);
            float dx = v_texcoord.x * u_width_height.x - u_lens.x;
            float dy = v_texcoord.y * u_width_height.y - u_lens.y;
            float centerDist2 = dx*dx+dy*dy;

            color = texture(source0, v_texcoord);

            if (centerDist2 > lensR2){
                color.x = 0.5;
                discard;
            } else if (centerDist2 > innerBorderR2) {
                color.x = 1.0;
            } else {
                color.z = 1.0;
            }
    
        }
        `
    }

    vertShaderSrc() {
		return `#version 300 es

precision highp float; 
precision highp int; 

in vec4 a_position;
in vec2 a_texcoord;

out vec2 v_texcoord;

void main() {
	gl_Position = a_position;
    v_texcoord = a_texcoord;
}`;
	}
}

export {ShaderLens}
