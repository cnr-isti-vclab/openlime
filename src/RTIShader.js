import { Shader } from './Shader.js'

/**
 *  @param {object} options
 * *compose*: compose operation: add, subtract, multiply, etc.
 */

class RTIShader extends Shader {
	constructor(options) {
		super({});

		Object.assign(this, {
			modes: ['light', 'normals', 'diffuse', 'specular'],
			mode: 'normal',
			type:        ['ptm', 'hsh',  'sh', 'rbf', 'bln'],
			colorspaces: ['lrgb', 'rgb', 'mrgb', 'mycc'],

			nplanes: null,     //number of coefficient planes
			yccplanes: null,     //number of luminance planes for mycc color space
			njpegs: null,      //number of textures needed (ceil(nplanes/3))
			material: null,    //material parameters
			lights: null,      //light directions (needed for rbf interpolation)
			sigma: null,       //rbf interpolation parameter
			ndimensions: null, //PCA dimension space (for rbf and bln)

			scale: null,      //factor and bias are used to dequantize coefficient planes.
			bias: null,

			basis: null,       //PCA basis for rbf and bln
			lweights: null    //light direction dependent coefficients to be used with coefficient planes
		});
		Object.assign(this, options);

		if(this.relight)
			this.init(this.relight);

		this.setMode('light');
	}

	setMode(mode) {
		if(!(this.modes.includes(mode)))
			throw Error("Unknown mode: " + mode);
		this.mode = mode;

		if(this.normals && mode != 'light') {
			this.body = this.normalsTemplate();

		} else {
			if(mode != 'light') {
				this.lightWeights([ 0.612,  0.354, 0.707], 'base');
				this.lightWeights([-0.612,  0.354, 0.707], 'base1');
				this.lightWeights([     0, -0.707, 0.707], 'base2');
			}
			this.body = this.template();
		}
		this.needsUpdate = true;
	}

	setLight(light) {
		if(!this.uniforms.light) 
			throw "Shader not initialized, wait on layer ready event for setLight."

		let x = light[0];
		let y = light[1];

		//map the square to the circle.
		let r = Math.sqrt(x*x + y*y);
		if(r > 1) {
			x /= r;
			y /= r;
		}
		let z = Math.sqrt(Math.max(0, 1 - x*x - y*y));
		light = [x, y, z];

		if(this.mode == 'light')
			this.lightWeights(light, 'base');
		this.setUniform('light', light);
	}

	init(relight) {
		Object.assign(this, relight);
		if(this.colorspace == 'mycc')
			this.nplanes = this.yccplanes[0] + this.yccplanes[1] + this.yccplanes[2];
		else 
			this.yccplanes = [0, 0, 0];


		this.planes = [];
		this.njpegs = 0;
		while(this.njpegs*3 < this.nplanes)
			this.njpegs++;

		for(let i = 0; i < this.njpegs; i++)
			this.samplers.push({ id:i, name:'plane'+i, type:'vec3' });
		if(this.normals)
			this.samplers.push({id:this.njpegs, name:'normals', type:'vec3' });

		this.material = this.materials[0];

		if(this.lights)
			this.lights + new Float32Array(this.lights);

		if(this.type == "rbf")
			this.ndimensions = this.lights.length/3;


		if(this.type == "bilinear") {
			this.ndimensions = this.resolution*this.resolution;
			this.type = "bln";
		}

		this.scale = this.material.scale;
		this.bias = this.material.bias;


		if(['mrgb', 'mycc'].includes(this.colorspace))
			this.loadBasis(this.basis);


		this.uniforms = {
			light: { type: 'vec3', needsUpdate: true, size: 3,              value: [0.0, 0.0, 1] },
			bias:  { type: 'vec3', needsUpdate: true, size: this.nplanes/3, value: this.bias },
			scale: { type: 'vec3', needsUpdate: true, size: this.nplanes/3, value: this.scale },
			base:  { type: 'vec3', needsUpdate: true, size: this.nplanes },
			base1: { type: 'vec3', needsUpdate: false, size: this.nplanes },
			base2: { type: 'vec3', needsUpdate: false, size: this.nplanes }
		}

		this.lightWeights([0, 0, 1], 'base');

		this.body = this.template();
	}

	lightWeights(light, basename, time) {
		let value;
		switch(this.type) {
			case 'ptm': value = PTM.lightWeights(light); break;
			case 'hsh': value = HSH.lightWeights(light); break;
			case 'sh' : value = SH.lightWeights(light); break;
			case 'rbf': value = RBF.lightWeights(light, this); break;
			case 'bln': value = BLN.lightWeights(light, this); break;
		}
		this.setUniform(basename, value, time);
	}

	baseLightOffset(p, l, k) {
		return (p*this.ndimensions + l)*3 + k;
	}

	basePixelOffset(p, x, y, k) {
		return (p*this.resolution*this.resolution + (x + y*this.resolution))*3 + k;
	}

	loadBasis(data) {
		let tmp = new Uint8Array(data);
		this.basis = new Float32Array(data.length);

		let basis = new Float32Array(tmp.length);
		for(let plane = 0; plane < this.nplanes+1; plane++) {
			for(let c = 0; c < this.ndimensions; c++) {
				for(let k = 0; k < 3; k++) {
					let o = this.baseLightOffset(plane, c, k);
					if(plane == 0)
						this.basis[o] = tmp[o]/255;
					else
						this.basis[o] = ((tmp[o] - 127)/this.material.range[plane-1]);
				}
			}
		}
	}


	normalsTemplate() {
		let str = `#version 300 es

precision highp float; 
precision highp int; 
in vec2 v_texcoord;
out vec4 color;
uniform vec3 light;
uniform sampler2D normals;

void main(void) {
	vec3 normal = texture(normals, v_texcoord).zyx; 
`;

		switch(this.mode) {
		case 'normals':  str += `
color = vec4(normal.x, normal.y, normal.z, 1);
`;
			break;
		case 'diffuse': str += `
normal = normal*2.0 - 1.0;
normal.z =  sqrt(1.0 - normal.x*normal.x - normal.y*normal.y);
color = vec4(vec3(dot(light, normal)), 1);
`;
			break;
		case 'specular': str += `
float exp = 15.0;
float ks = 0.7;
normal = normal*2.0 - 1.0;
float nDotH = dot(light, normal);
nDotH = pow(nDotH, exp);
nDotH *= ks;
color = vec4(nDotH, nDotH, nDotH, 1);
`;
		}
		str += `
}`;
		return str;
	}

	template() {

		let basetype = 'vec3'; //(this.colorspace == 'mrgb' || this.colorspace == 'mycc')?'vec3':'float';

		let str = `#version 300 es

precision highp float; 
precision highp int; 

#define np1 ${this.nplanes + 1}

in vec2 v_texcoord;
out vec4 color;

const mat3 T = mat3(8.1650e-01, 4.7140e-01, 4.7140e-01,
	-8.1650e-01, 4.7140e-01,  4.7140e-01,
	-1.6222e-08, -9.4281e-01, 4.7140e-01);

uniform vec3 light;
uniform vec3 bias[np1];
uniform vec3 scale[np1];

uniform ${basetype} base[np1];
uniform ${basetype} base1[np1];
uniform ${basetype} base2[np1];
`;

		for(let n = 0; n < this.njpegs; n++) 
			str += 
`uniform sampler2D plane${n};
`;

		if(this.colorspace == 'mycc')
			str +=
`

const int ny0 = ${this.yccplanes[0]};
const int ny1 = ${this.yccplanes[1]};
`


		switch(this.colorspace) {
			case 'rgb':  str +=  RGB.render(this.njpegs); break;
			case 'mrgb': str += MRGB.render(this.njpegs); break;
			case 'mycc': str += MYCC.render(this.njpegs, this.yccplanes[0]); break;
		}

		str += `

void main(void) {

`;
		if(this.mode == 'light') {
			str += `
	color = render(base);
`;
		} else {
			str += `
	vec3 normal;
	normal.x = dot(render(base).xyz, vec3(1));
	normal.y = dot(render(base1).xyz, vec3(1));
	normal.z = dot(render(base2).xyz, vec3(1));
`; 
			switch(this.mode) {
			case 'normals':  str += `
	normal = (normalize(T * normal) + 1.0)/2.0;
	color = vec4(normal, 1);
`;
			break;
			case 'diffuse': str += `
	normal = normalize(T * normal);
	color = vec4(vec3(dot(light, normal)), 1);
`;
			}
		}
		str += `
}`;
		return str;
	}
}


class RGB {
	static render(njpegs) {
		let str = `
vec4 render(vec3 base[np1]) {
	vec4 rgb = vec4(0, 0, 0, 1);`;

		for(let j = 0; j < njpegs; j++) {
			str += `
	{
		vec4 c = texture(plane${j}, v_texcoord);
		rgb.x += base[${j}].x*(c.x - bias[${j}].x)*scale[${j}].x;
		rgb.y += base[${j}].y*(c.y - bias[${j}].y)*scale[${j}].y;
		rgb.z += base[${j}].z*(c.z - bias[${j}].z)*scale[${j}].z;
	}
`;
		}
		str += `
	return rgb;
}
`;
		return str;
	}
}

class MRGB {
	static render(njpegs) {

		let str = `
vec4 render(vec3 base[np1]) {
	vec3 rgb = base[0];
	vec4 c;
	vec3 r;
`;
		for(let j = 0; j < njpegs; j++) {
			str +=
`	c = texture(plane${j}, v_texcoord);
	r = (c.xyz - bias[${j}])* scale[${j}];

	rgb += base[${j}*3+1]*r.x;
	rgb += base[${j}*3+2]*r.y;
	rgb += base[${j}*3+3]*r.z;
`;
		}
		str += `
	return vec4(rgb, 1);
}
`;
		return str;
	}
}

class MYCC {

	static render(njpegs, ny1) {
		let str = `
vec3 toRgb(vec3 ycc) {
 	vec3 rgb;
	rgb.g = ycc.r + ycc.b/2.0;
	rgb.b = ycc.r - ycc.b/2.0 - ycc.g/2.0;
	rgb.r = rgb.b + ycc.g;
	return rgb;
}

vec4 render(vec3 base[np1]) {
	vec3 rgb = base[0];
	vec4 c;
	vec3 r;
`;
		for(let j = 0; j < njpegs; j++) {
			str += `

	c = texture(plane${j}, v_texcoord);

	r = (c.xyz - bias[${j}])* scale[${j}];
`;

			if(j < ny1) {
				str += `
	rgb.x += base[${j}*3+1].x*r.x;
	rgb.y += base[${j}*3+2].y*r.y;
	rgb.z += base[${j}*3+3].z*r.z;
`;
			} else {
				str += `
	rgb.x += base[${j}*3+1].x*r.x;
	rgb.x += base[${j}*3+2].x*r.y;
	rgb.x += base[${j}*3+3].x*r.z;
`;
			}
		}
		str += `	
	return vec4(toRgb(rgb), 1);
}
`;
		return str;
	}
}




/* PTM utility functions 
 */
class PTM {
	/* @param {Array} v expects light direction as [x, y, z]
	*/
	static lightWeights(v) {
		let b = [1.0, v[0], v[1], v[0]*v[0], v[0]*v[1], v[1]*v[1]];
		let base = new Float32Array(18);
		for(let i = 0; i < 18; i++)
			base[3*i] = base[3*i+1] = base[3*i+2] = b[i];
		return base;
	}
}


/* HSH utility functions 
 */
class HSH {
	/* @param {Array} v expects light direction as [x, y, z]
	*/
	static lightWeights(v) {
		let PI = 3.1415;
		let phi = Math.atan2(v[1], v[0]);
		if (phi < 0)
			phi = 2 * PI + phi;
		let theta = Math.min(Math.acos(v[2]), PI / 2 - 0.1);

		let cosP = Math.cos(phi);
		let cosT = Math.cos(theta);
		let cosT2 = cosT * cosT;

		let b = [
			1.0 / Math.sqrt(2 * PI),

			Math.sqrt(6 / PI) * (cosP * Math.sqrt(cosT-cosT2)),
			Math.sqrt(3 / (2 * PI)) * (-1 + 2*cosT),
			Math.sqrt(6 / PI) * (Math.sqrt(cosT - cosT2) * Math.sin(phi)),

			Math.sqrt(30 / PI) * (Math.cos(2 * phi) * (-cosT + cosT2)),
			Math.sqrt(30 / PI) * (cosP*(-1 + 2 * cosT) * Math.sqrt(cosT - cosT2)),
			Math.sqrt(5  / (2 * PI)) * (1 - 6 * cosT + 6 * cosT2),
			Math.sqrt(30 / PI) * ((-1 + 2 * cosT) * Math.sqrt(cosT - cosT2) * Math.sin(phi)),
			Math.sqrt(30 / PI) * ((-cosT + cosT2) * Math.sin(2*phi))
		];
		let base = new Float32Array(27);
		for(let i = 0; i < 27; i++)
			base[3*i] = base[3*i+1] = base[3*i+2] = b[i];
		return base;
	}
}

class SH {
	/* @param {Array} v expects light direction as [x, y, z]
	*/
	static lightWeights(v) {
		let PI = 3.1415;
		let A = 0.5*Math.sqrt(3.0/PI);
		let B = 0.5*Math.sqrt(15/PI);
		let b = [
			0.5/Math.sqrt(PI),
			A*v[0],
			A*v[2],
			A*v[1],
			B*v[0]*v[1],
			B*v[0]*v[2],
			0.5*Math.sqrt(5/PI)*(3*v[2]*v[2] - 1),
			B*v[1]*v[2],
			0.5*B*(v[1]*v[1] - v[0]*v[0])
		];

		let base = new Float32Array(27);
		for(let i = 0; i < 27; i++)
			base[3*i] = base[3*i+1] = base[3*i+2] = b[i];
		return base;
	}
}


class RBF {
	/* @param {Array} v expects light direction as [x, y, z]
	*/
	static lightWeights(lpos, shader) {

		let weights = RBF.rbf(lpos, shader);

		let np = shader.nplanes;
		let lweights = new Float32Array((np + 1) * 3);

		for(let p = 0; p < np+1; p++) {
			for(let k = 0; k < 3; k++) {
				for(let l = 0; l < weights.length; l++) {
					let o = shader.baseLightOffset(p, weights[l][0], k);
					lweights[3*p + k] += weights[l][1]*shader.basis[o];
				}
			}
		}
		return lweights;
	}

	static rbf(lpos, shader) {
		let radius = 1/(shader.sigma*shader.sigma);
		let weights = new Array(shader.ndimensions);

		//compute rbf weights
		let totw = 0.0;
		for(let i = 0; i < weights.length; i++) {
			let dx = shader.lights[i*3+0] - lpos[0];
			let dy = shader.lights[i*3+1] - lpos[1];
			let dz = shader.lights[i*3+2] - lpos[2];

			let d2 = dx*dx + dy*dy + dz*dz;
			let w = Math.exp(-radius * d2);

			weights[i] = [i, w];
			totw += w;
		}
		for(let i = 0; i < weights.length; i++)
			weights[i][1] /= totw;


		//pick only most significant and renormalize
		let count = 0;
		totw = 0.0;
		for(let i = 0; i < weights.length; i++) {
			if(weights[i][1] > 0.001) {
				weights[count++] =  weights[i];
				totw += weights[i][1];
			}
		}

		weights = weights.slice(0, count); 
		for(let i = 0; i < weights.length; i++)
			weights[i][1] /= totw;

		return weights;
	}
}

class BLN {
	static lightWeights(lpos, shader) {
		let np = shader.nplanes;
		let s = Math.abs(lpos[0]) + Math.abs(lpos[1]) + Math.abs(lpos[2]);

		//rotate 45 deg.
		let x = (lpos[0] + lpos[1])/s;
		let y = (lpos[1] - lpos[0])/s;
		x = (x + 1.0)/2.0;
		y = (y + 1.0)/2.0;
		x = x*(shader.resolution - 1.0);
		y = y*(shader.resolution - 1.0);

		let sx = Math.min(shader.resolution-2, Math.max(0, Math.floor(x)));
		let sy = Math.min(shader.resolution-2, Math.max(0, Math.floor(y)));
		let dx = x - sx;
		let dy = y - sy;

		//bilinear interpolation coefficients.
		let s00 = (1 - dx)*(1 - dy);
		let s10 =      dx *(1 - dy);
		let s01 = (1 - dx)* dy;
		let s11 =      dx * dy;

		let lweights = new Float32Array((np + 1) * 3);

		//TODO optimize away basePixel

		for(let p = 0; p < np+1; p++) {
			for(let k = 0; k < 3; k++) {
				let o00 = shader.basePixelOffset(p, sx, sy, k);
				let o10 = shader.basePixelOffset(p, sx+1, sy, k);
				let o01 = shader.basePixelOffset(p, sx, sy+1, k);
				let o11 = shader.basePixelOffset(p, sx+1, sy+1, k);

				lweights[3*p + k] = 
					s00*shader.basis[o00] + 
					s10*shader.basis[o10] +
					s01*shader.basis[o01] +
					s11*shader.basis[o11];

			}
		}
		return lweights;
	}
}


export { RTIShader }

