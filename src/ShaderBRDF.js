import { Shader } from './Shader.js'

/**
 *  @param {object} options
 *   mode: default is ward, can be [ward, diffuse, specular, normals]
 */

class ShaderBRDF extends Shader {
	constructor(options) {
		super({});

		this.modes = ['ward', 'diffuse', 'specular', 'normals'];
		this.mode = 'ward';
		this.alphaLimits = [0.01, 0.5];
		Object.assign(this, options);
		
		this.uniforms = {
			uLightInfo:          { type: 'vec4', needsUpdate: true, size: 4, value: [0.1, 0.1, 0.9, 0] },
			uAlphaLimits:        { type: 'vec2', needsUpdate: true, size: 2, value: this.alphaLimits },
			uInputColorSpaceKd:  { type: 'int', needsUpdate: true, size: 1, value: this.colorspaces['kd'] },
			uInputColorSpaceKs:  { type: 'int', needsUpdate: true, size: 1, value: this.colorspaces['ks'] },
		}

		this.innerCode = '';
		this.setMode(this.mode);
	}

	setLight(light) {
		// Light with 4 components (Spot: 4th==1, Dir: 4th==0)
		this.setUniform('uLightInfo', light);
	}

	setMode(mode) {
		this.mode = mode;
		switch(mode) {
			case 'ward':
				this.innerCode = 
				`vec3 linearColor = (kd + ks * spec) * NdotL;
				linearColor += kd * 0.02; // HACK! adding just a bit of ambient`
			break;
			case 'diffuse':
				this.innerCode = 
				`vec3 linearColor = kd;`
			break;
			case 'specular':
				this.innerCode = 
				`vec3 linearColor = clamp((ks * spec) * NdotL, 0.0, 1.0);`
			break;
			case 'normals':
				this.innerCode = 
				`vec3 linearColor = (N+vec3(1.))/2.;
				applyGamma = false;`
			break;
			default:
				console.log("ShaderBRDF: Unknown mode: " + mode);
				throw Error("ShaderBRDF: Unknown mode: " + mode);
			break;
		}
		this.needsUpdate = true;
	}

	fragShaderSrc(gl) {
		let gl2 = !(gl instanceof WebGLRenderingContext);
		let str = `${gl2? '#version 300 es' : ''}

precision highp float; 
precision highp int; 

#define NULL_NORMAL vec3(0,0,0)
#define SQR(x) ((x)*(x))
#define PI (3.14159265359)
#define ISO_WARD_EXPONENT (4.0)

${gl2? 'in' : 'varying'} vec2 v_texcoord;
uniform sampler2D uTexKd;
uniform sampler2D uTexKs;
uniform sampler2D uTexNormals;
uniform sampler2D uTexGloss;

uniform vec4 uLightInfo; // [x,y,z,w] (if .w==0 => Directional, if w==1 => Spot)
uniform vec2 uAlphaLimits;
uniform int uInputColorSpaceKd; // 0: Linear; 1: sRGB
uniform int uInputColorSpaceKs; // 0: Linear; 1: sRGB

${gl2? 'out' : ''}  vec4 color;

vec3 getNormal(const in vec2 texCoord) {
	vec3 n = texture(uTexNormals, texCoord).xyz;
	n = 2. * n - vec3(1.);
	float norm = length(n);
	if(norm < 0.5) return NULL_NORMAL;
	else return n/norm;
}

vec3 linear2sRGB(vec3 linearRGB) {
    bvec3 cutoff = lessThan(linearRGB, vec3(0.0031308));
    vec3 higher = vec3(1.055)*pow(linearRGB, vec3(1.0/2.4)) - vec3(0.055);
    vec3 lower = linearRGB * vec3(12.92);
    return mix(higher, lower, cutoff);
}

vec3 sRGB2Linear(vec3 sRGB) {
    bvec3 cutoff = lessThan(sRGB, vec3(0.04045));
    vec3 higher = pow((sRGB + vec3(0.055))/vec3(1.055), vec3(2.4));
    vec3 lower = sRGB/vec3(12.92);
    return mix(higher, lower, cutoff);
}

float ward(in vec3 V, in vec3 L, in vec3 N, in vec3 X, in vec3 Y, in float alpha) {

	vec3 H = normalize(V + L);

	float H_dot_N = dot(H, N);
	float sqr_alpha_H_dot_N = SQR(alpha * H_dot_N);

	if(sqr_alpha_H_dot_N < 0.00001) return 0.0;

	float L_dot_N_mult_N_dot_V = dot(L,N) * dot(N,V);
	if(L_dot_N_mult_N_dot_V <= 0.0) return 0.0;

	float spec = 1.0 / (4.0 * PI * alpha * alpha * sqrt(L_dot_N_mult_N_dot_V));
	
	//float exponent = -(SQR(dot(H,X)) + SQR(dot(H,Y))) / sqr_alpha_H_dot_N; // Anisotropic
	float exponent = -SQR(tan(acos(H_dot_N))) / SQR(alpha); // Isotropic
	
	spec *= exp( exponent );

	return spec;
}


void main() {
	vec3 N = getNormal(v_texcoord);
	if(N == NULL_NORMAL) {
		color = vec4(0.0);
		return;
	}

	vec3 L = (uLightInfo.w == 0.0) ? normalize(uLightInfo.xyz) : normalize(uLightInfo.xyz - gl_FragCoord.xyz);
	vec3 V = vec3(0.0,0.0,1.0);
    vec3 H = normalize(L + V);
	float NdotL = max(dot(N,L),0.0);

	vec3 kd = texture(uTexKd, v_texcoord).xyz;
	vec3 ks = texture(uTexKs, v_texcoord).xyz;
	if(uInputColorSpaceKd == 1) {
		kd = sRGB2Linear(kd);
	}
	if(uInputColorSpaceKs == 1) {
		ks = sRGB2Linear(ks);
	}
	kd /= PI;

	float gloss = texture(uTexGloss, v_texcoord).x;
	float minGloss = 1.0 - pow(uAlphaLimits[1], 1.0 / ISO_WARD_EXPONENT);
	float maxGloss = 1.0 - pow(uAlphaLimits[0], 1.0 / ISO_WARD_EXPONENT);

	float alpha = pow(1.0 - gloss * (maxGloss - minGloss) - minGloss, ISO_WARD_EXPONENT);
	
	
	vec3 e = vec3(0.0,0.0,1.0);
	vec3 T = normalize(cross(N,e));
	vec3 B = normalize(cross(N,T));
	float spec = ward(V, L, N, T, B, alpha);
	
	bool applyGamma = true;

	${this.innerCode}
	
	vec3 finalColor = applyGamma ? pow(linearColor * 1.0, vec3(1.0/2.2)) : linearColor;
	color = vec4(finalColor, 1.0);
	${gl2?'':'gl_FragColor = color;'}
}
`;
	return str;
	}

}


export { ShaderBRDF }
