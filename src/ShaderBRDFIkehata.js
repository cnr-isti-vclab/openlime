import { Shader } from './Shader.js'

/**
 * Extends {@link Shader}, initialized with a Neural .json (
**/
 
class ShaderBRDFIkehata extends Shader {
	constructor(options) {
		super({});

		Object.assign(this, {
			modes: ['color', 'diffuse', 'specular', 'normals', 'monochrome'],
			mode: 'color',

			nplanes: null,	 //number of coefficient planes

			scale: null,	  //factor and bias are used to dequantize coefficient planes.
			bias: null,
			
			numLights: 1,
		});
		Object.assign(this, options);

        this.ikehata_maps = ['normals', 'base', 'metallic', 'roughness'];

		this.samplers = [];
        for (let i = 0; i < this.ikehata_maps.length; i++)
            this.samplers.push({ id:i, name:this.ikehata_maps[i], type:'vec3' });

        if (this.mask)
            this.samplers.push({ id:this.samplers.length, name:'mask', type:'vec3' });


		this.uniforms = {
			light: { type: 'vec3', needsUpdate: true, size: 3, value: [0, 0, 1] },
		};

		this.setMode(this.mode);

	}

	setLight(light) {
		let x = light[0];
		let y = light[1];
		let z = Math.sqrt(Math.max(0, 1 - x*x - y*y));
		light = [x, y, z];
		this.setUniform('light', light);
	}

	fragShaderSrc(gl) {
        let gl2 = !(gl instanceof WebGLRenderingContext);

		let brdfReturnedValue;
		switch(this.mode) {
			case 'color': brdfReturnedValue = 'nl * EMIT * (fd + fr)'; break;
			case 'diffuse': brdfReturnedValue = 'EMIT * fd'; break;
			case 'specular': brdfReturnedValue = 'EMIT * fr'; break;
			case 'normals': brdfReturnedValue = 'normals'; break;
			case 'monochrome': brdfReturnedValue = 'vec3(nl)'; break;
			default: brdfReturnedValue = 'nl * EMIT * (fd + fr)'; break;
		}

        let str;

        str = `

uniform sampler2D normals;
uniform sampler2D base;
uniform sampler2D metallic;
uniform sampler2D roughness;
uniform vec3 light;
${gl2? 'in' : 'varying'} vec2 v_texcoord;

float sum(vec3 vector) {
	return vector.x + vector.y + vector.z;
}

vec3 brdf_ikehata(vec3 normals, vec3 base, vec3 metallic, vec3 roughness, vec3 light) {
	float EMIT = 4.0;
    float SPECULAR = 1.0;
	float PI = 3.1415926535;
	vec3 V = vec3(0, 0, 1);
	vec3 L = light;

	vec3 N = normals * 2.0 - 1.0;
	N = normalize(N);
	vec3 B = base;
	float M = metallic[0];
	float R = roughness[0];

	// Experimental the angle between l and v should always be fixed
	vec3 hf = 0.5 * (L + V);
	hf = normalize(hf);
	float nl = sum(N * L);
	float nv = sum(N * V);
	float nh = sum(N * hf);
	float lh = sum(L * hf);

	// Diffuse
	float FD90 = 0.5 + 2.0 * (lh * R);
	float FD = ( 1.0 + (FD90 - 1.0) * (1.0 - nl) * (1.0 - nl) * (1.0 - nl) * (1.0 - nl) * (1.0 - nl) ) * ( 1.0 + (FD90 - 1.0) * (1.0 - nv) * (1.0 - nv) * (1.0 - nv) * (1.0 - nv) * (1.0 - nv) );

	// GGX Specular
	vec3 Cspec0 = 0.08 * SPECULAR * (1.0 - M) + B * M;
	// Specular Fs
    vec3 Fs = Cspec0 + (1.0 - Cspec0) * (1.0 - lh) * (1.0 - lh) * (1.0 - lh) * (1.0 - lh) * (1.0 - lh);

	// Specular Gs
    float a = min(max(1.0e-6, R * R), 1.0);
    float Gs_L = 1.0 / ( nl + sqrt(a * a + (1.0 - a * a) * nl * nl) + 1.0e-12);
    float Gs_V = 1.0 / ( nv + sqrt(a * a + (1.0 - a * a) * nv * nv) + 1.0e-12);
    float Gs = Gs_L * Gs_V;

	// Specular Ds
    float Ds = a * a / (PI * (1.0 + (a * a - 1.0) * nh * nh) * (1.0 + (a * a - 1.0) * nh * nh) + 1.0e-12);

    vec3 fd = FD * B * (1.0 - M) / PI;
    vec3 fr = Gs * Fs * Ds;

	return ${brdfReturnedValue};
}

vec4 data(vec2 v_texcoord) {
	vec3 color;
	vec3 n = texture${gl2?'':'2D'}(normals, v_texcoord).rgb;
	vec3 b = texture${gl2?'':'2D'}(base, v_texcoord).rgb;
	vec3 m = texture${gl2?'':'2D'}(metallic, v_texcoord).rgb;
	vec3 r = texture${gl2?'':'2D'}(roughness, v_texcoord).rgb;
	color = brdf_ikehata(n, b, m, r, light);
	return vec4(color, 1.0);
}
`;

		return str;
	}

}


export { ShaderBRDFIkehata }

