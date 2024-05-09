import { Shader } from './Shader.js'

/**
 * Extends {@link Shader}, initialized with a Neural .json (
**/
 
class ShaderPS extends Shader {
	constructor(options) {
		super({});

		Object.assign(this, {
			modes: ['albedo', 'cavity', 'curvature', 'him', 'normals', 'outlim', 'residual', 'shim'],
			mode: 'albedo',

			nplanes: null,	 //number of coefficient planes

			scale: null,	  //factor and bias are used to dequantize coefficient planes.
			bias: null,

		});
		Object.assign(this, options);

		this.samplers = [];
        for (let i = 0; i < this.modes.length; i++)
            this.samplers.push({ id:i, name:this.modes[i], type:'vec3' });

        if (this.mask)
            this.samplers.push({ id:this.samplers.length, name:'mask', type:'vec3' });

	}

	createProgram(gl) {
		super.createProgram(gl);
		this.position_location = gl.getAttribLocation(this.program, "a_position");
		this.texcoord_location = gl.getAttribLocation(this.program, "a_texcoord");		
	}

	fragShaderSrc(gl) {
        let gl2 = !(gl instanceof WebGLRenderingContext);

        let str;

        str = `

uniform sampler2D ${this.mode};
${gl2? 'in' : 'varying'} vec2 v_texcoord;`;

        if (this.mask)
            str += `
uniform sampler2D mask;`;

        str +=`

vec4 data(vec2 v_texcoord) {`;

        if (this.mask)
            str +=`
	float mask_pixel = texture${gl2?'':'2D'}(mask, v_texcoord)[0];
	if (mask_pixel == 0.0)
		return vec4(0);
	return mask_pixel * texture${gl2?'':'2D'}(${this.mode}, v_texcoord);
}
`;
        else
            str +=`
        return texture${gl2?'':'2D'}(${this.mode}, v_texcoord);
}
`;

		return str;
	}

}


export { ShaderPS }

