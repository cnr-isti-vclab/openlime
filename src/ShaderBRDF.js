import { Shader } from './Shader.js'

/**
 * A shader class implementing various BRDF (Bidirectional Reflectance Distribution Function) rendering modes.
 * Extends the base Shader class to provide specialized material rendering capabilities.
 * 
 * Shader Features:
 * - Implements the Ward BRDF model for physically-based rendering
 * - Supports both directional and spot lights
 * - Handles normal mapping for more detailed surface rendering
 * - Supports different color spaces (linear and sRGB) for input textures
 * - Multiple visualization modes for material analysis (diffuse, specular, normals, monochrome, etc.)
 * - Configurable surface roughness range for varying material appearance
 * - Ambient light contribution to simulate indirect light
 * 
 * Required Textures:
 * - uTexKd: Diffuse color texture (optional)
 * - uTexKs: Specular color texture (optional)
 * - uTexNormals: Normal map for surface detail
 * - uTexGloss: Glossiness map (optional)
 * 
 * @example
 * // Create a basic BRDF shader with default settings
 * const shader = new ShaderBRDF({});
 * 
 * @example
 * // Create a BRDF shader with custom settings
 * const shader = new ShaderBRDF({
 *   mode: 'color',
 *   colorspaces: { kd: 'sRGB', ks: 'linear' },
 *   brightness: 1.2,
 *   gamma: 2.2,
 *   alphaLimits: [0.05, 0.4],
 *   kAmbient: 0.03
 * });
 * 
 * @extends Shader
 */
class ShaderBRDF extends Shader {
	/**
	 * Creates a new ShaderBRDF instance.
	 * @param {Object} [options={}] - Configuration options for the shader.
	 * @param {string} [options.mode='color'] - Rendering mode to use:
	 *   - 'color': Full BRDF rendering using Ward model with ambient light
	 *   - 'diffuse': Shows only diffuse component (kd)
	 *   - 'specular': Shows only specular component (ks * spec * NdotL)
	 *   - 'normals': Visualizes surface normals
	 *   - 'monochrome': Renders using a single material color with diffuse lighting
	 * @param {Object} [options.colorspaces] - Color space configurations.
	 * @param {string} [options.colorspaces.kd='sRGB'] - Color space for diffuse texture ('linear' or 'sRGB').
	 * @param {string} [options.colorspaces.ks='linear'] - Color space for specular texture ('linear' or 'sRGB').
	 * @param {number} [options.brightness=1.0] - Overall brightness multiplier.
	 * @param {number} [options.gamma=2.2] - Gamma correction value.
	 * @param {number[]} [options.alphaLimits=[0.01, 0.5]] - Range for surface roughness [min, max].
	 * @param {number[]} [options.monochromeMaterial=[0.80, 0.79, 0.75]] - RGB color for monochrome mode.
	 * @param {number} [options.kAmbient=0.02] - Ambient light coefficient.
	 * 
	 */
	constructor(options) {
		super(options);
		this.modes = ['color', 'diffuse', 'specular', 'normals', 'monochrome'];
		this.mode = 'color';

		Object.assign(this, options);

		const kdCS = this.colorspaces['kd'] == 'linear' ? 0 : 1;
		const ksCS = this.colorspaces['ks'] == 'linear' ? 0 : 1;

		const brightness = options.brightness ? options.brightness : 1.0;
		const gamma = options.gamma ? options.gamma : 2.2;
		const alphaLimits = options.alphaLimits ? options.alphaLimits : [0.01, 0.5];
		const monochromeMaterial = options.monochromeMaterial ? options.monochromeMaterial : [0.80, 0.79, 0.75];
		const kAmbient = options.kAmbient ? options.kAmbient : 0.02;

		this.uniforms = {
			uLightInfo: { type: 'vec4', needsUpdate: true, size: 4, value: [0.1, 0.1, 0.9, 0] },
			uAlphaLimits: { type: 'vec2', needsUpdate: true, size: 2, value: alphaLimits },
			uBrightnessGamma: { type: 'vec2', needsUpdate: true, size: 2, value: [brightness, gamma] },
			uInputColorSpaceKd: { type: 'int', needsUpdate: true, size: 1, value: kdCS },
			uInputColorSpaceKs: { type: 'int', needsUpdate: true, size: 1, value: ksCS },
			uMonochromeMaterial: { type: 'vec3', needsUpdate: true, size: 3, value: monochromeMaterial },
			uKAmbient: { type: 'float', needsUpdate: true, size: 1, value: kAmbient },

		}

		this.innerCode = '';
		this.setMode(this.mode);
	}

	/**
	 * Sets the light properties for the shader.
	 * 
	 * @param {number[]} light - 4D vector containing light information
	 * @param {number} light[0] - X coordinate of light position/direction
	 * @param {number} light[1] - Y coordinate of light position/direction
	 * @param {number} light[2] - Z coordinate of light position/direction
	 * @param {number} light[3] - Light type flag (0 for directional, 1 for spot)
	 */
	setLight(light) {
		// Light with 4 components (Spot: 4th==1, Dir: 4th==0)
		this.setUniform('uLightInfo', light);
	}


	/**
	 * Sets the rendering mode for the shader.
	 * 
	 * @param {string} mode - The rendering mode to use
	 * @throws {Error} If an invalid mode is specified
	 */
	setMode(mode) {
		this.mode = mode;
		switch (mode) {
			case 'color':
				this.innerCode =
					`vec3 linearColor = (kd + ks * spec) * NdotL;
				linearColor += kd * uKAmbient; // HACK! adding just a bit of ambient`
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
			case 'monochrome':
				this.innerCode = 'vec3 linearColor = kd * NdotL + kd * uKAmbient;'
				break;
			default:
				console.log("ShaderBRDF: Unknown mode: " + mode);
				throw Error("ShaderBRDF: Unknown mode: " + mode);
				break;
		}
		this.needsUpdate = true;
	}

	/**
	 * Generates the fragment shader source code based on current configuration.
	 * 
	 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - The WebGL context
	 * @returns {string} The complete fragment shader source code
	 * @private
	 */
	fragShaderSrc(gl) {
		let hasKd = this.samplers.findIndex(s => s.name == 'uTexKd') != -1 && this.mode != 'monochrome';
		let hasGloss = this.samplers.findIndex(s => s.name == 'uTexGloss') != -1 && this.mode != 'monochrome';
		let hasKs = this.samplers.findIndex(s => s.name == 'uTexKs') != -1;
		let str = `

#define NULL_NORMAL vec3(0,0,0)
#define SQR(x) ((x)*(x))
#define PI (3.14159265359)
#define ISO_WARD_EXPONENT (4.0)

in vec2 v_texcoord;

uniform vec4 uLightInfo; // [x,y,z,w] (if .w==0 => Directional, if w==1 => Spot)
uniform vec2 uAlphaLimits;
uniform vec2 uBrightnessGamma;
uniform vec3 uMonochromeMaterial;
uniform float uKAmbient;

uniform int uInputColorSpaceKd; // 0: Linear; 1: sRGB
uniform int uInputColorSpaceKs; // 0: Linear; 1: sRGB

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


vec4 data() {
	vec3 N = getNormal(v_texcoord);
	if(N == NULL_NORMAL) {
		return vec4(0.0);
	}

	vec3 L = (uLightInfo.w == 0.0) ? normalize(uLightInfo.xyz) : normalize(uLightInfo.xyz - gl_FragCoord.xyz);
	vec3 V = vec3(0.0,0.0,1.0);
    vec3 H = normalize(L + V);
	float NdotL = max(dot(N,L),0.0);

	vec3 kd = ${hasKd ? 'texture(uTexKd, v_texcoord).xyz' : 'uMonochromeMaterial'};
	vec3 ks = ${hasKs ? 'texture(uTexKs, v_texcoord).xyz' : 'vec3(0.0, 0.0, 0.0)'};
	if(uInputColorSpaceKd == 1) {
		kd = sRGB2Linear(kd);
	}
	if(uInputColorSpaceKs == 1) {
		ks = sRGB2Linear(ks);
	}
	kd /= PI;

	float gloss = ${hasGloss ? 'texture(uTexGloss, v_texcoord).x' : '0.0'};
	float minGloss = 1.0 - pow(uAlphaLimits[1], 1.0 / ISO_WARD_EXPONENT);
	float maxGloss = 1.0 - pow(uAlphaLimits[0], 1.0 / ISO_WARD_EXPONENT);

	float alpha = pow(1.0 - gloss * (maxGloss - minGloss) - minGloss, ISO_WARD_EXPONENT);
	
	
	vec3 e = vec3(0.0,0.0,1.0);
	vec3 T = normalize(cross(N,e));
	vec3 B = normalize(cross(N,T));
	float spec = ward(V, L, N, T, B, alpha);
	
	bool applyGamma = false;

	${this.innerCode}

	vec3 finalColor = applyGamma ? pow(linearColor * uBrightnessGamma[0], vec3(1.0/uBrightnessGamma[1])) : linearColor;

	return vec4(finalColor, 1.0);
}
`;
		return str;
	}

}

export { ShaderBRDF }
