import { Shader } from './Shader.js'

/**
 *  @param {object} options
 * *compose*: compose operation: add, subtract, multiply, etc.
 */

class ShaderRTI extends Shader {
	constructor(options) {
		super(options);

		Object.assign(this, {
			modes: ['light', 'normals', 'diffuse', 'specular'],
			type:        ['ptm', 'hsh',  'rbf', 'bln'],
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
		if(this.relight)
			this.init(this.relight);
//		this.body = this.template(this.mode, this.basis, this.colorspace);
	}

	setMode(mode) {
		if(!(mode in this.modes))
			throw Error("Unknown mode: " + mode);
		this.body = this.template(this.modes[mode]);
		this.needsUpdate = true;
	}

	setLight(light) {
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
		this.lightWeights(light);
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

		this.material = this.materials[0];

		if(this.lights)
			this.lights + new Float32Array(this.lights);

		if(this.type == "rbf")
			this.ndimensions = this.lights.length/3;

		if(this.type == "bilinear") 
			this.ndimensions = this.resolution*this.resolution;

		this.scale = this.material.scale;
		this.bias = this.material.bias;


		if(['mrgb', 'mycc'].includes(this.colorspace))
			this.loadBasis(this.basis);

		this.uniforms = {
			light: { type: 'vec3', needsUpdate: true, size: 3,              value: [0.0, 0.0, 1] },
			bias:  { type: 'vec3', needsUpdate: true, size: this.nplanes/3, value: this.bias },
			scale: { type: 'vec3', needsUpdate: true, size: this.nplanes/3, value: this.scale },
			base:  { type: 'float', needsUpdate: true, size: this.nplanes }
		}

		this.lightWeights([0, 0, 1]);

		this.body = this.template();
	}

	lightWeights(light) {
		switch(this.type) {
			case 'ptm': this.uniforms.base.value = PTM.lightWeights(light); break;
			case 'hsh': this.uniforms.base.value = HSH.lightWeights(light); break;
		}
		this.uniforms.base.needsUpdate = true;
	}

	baseLightOffset(p, l, k) {
		return (p*this.ndimensions + l)*3 + k;
	}

	loadBasis(data) {
		let tmp = new Uint8Array(data);
		this.basis = new Float32Array(data.length);

		let basis = new Float32Array(tmp.length);
		for(var plane = 0; plane < this.nplanes+1; plane++) {
			for(var c = 0; c < this.ndimensions; c++) {
				for(var k = 0; k < 3; k++) {
					var o = this.baseLightOffset(plane, c, k);
					if(p == 0)
						this.basis[o] = tmp[o]/255;
					else
						this.basis[o] = ((tmp[o] - 127)/this.material.range[p-1]);
				}
			}
		}
	}

	template(operation) {

		let basetype = (this.colorspace == 'mrgb' || this.colorspace == 'mycc')?'vec3':'float';

		let str = `#version 300 es

precision highp float; 
precision highp int; 

in vec2 v_texcoord;
out vec4 color;

uniform vec3 light;
//const int np1 = ${this.nplanes + 1};
//const int nj = ${this.njpegs};

#define np1 ${this.nplanes + 1}
#define nj ${this.njpegs}
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

		str +=
`
uniform ${basetype} base[np1];
uniform vec3 bias[np1];
uniform vec3 scale[np1];
uniform float opacity;
`;

	//hsh or ptm
		str += `
void main(void) {
	color = vec4(0, 0, 0, 1);`;

		for(let j = 0; j < this.njpegs; j++) {
			str += `
	{
		vec4 c = texture(plane${j}, v_texcoord);
		color.x += base[${j}]*(c.x - bias[${j}].x)*scale[${j}].x;
		color.y += base[${j}]*(c.y - bias[${j}].y)*scale[${j}].y;
		color.z += base[${j}]*(c.z - bias[${j}].z)*scale[${j}].z;
	}
`;
		}
		str += `
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
		return new Float32Array([1.0, v[0], v[1], v[0]*v[0], v[0]*v[1], v[1]*v[1]]);
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
		let theta = Math.min(Math.acos(v[2]), PI / 2 - 0.5);

		let cosP = Math.cos(phi);
		let cosT = Math.cos(theta);
		let cosT2 = cosT * cosT;

		return new Float32Array([
			1.0 / Math.sqrt(2 * PI),

			Math.sqrt(6 / PI) * (cosP * Math.sqrt(cosT-cosT2)),
			Math.sqrt(3 / (2 * PI)) * (-1 + 2*cosT),
			Math.sqrt(6 / PI) * (Math.sqrt(cosT - cosT2) * Math.sin(phi)),

			Math.sqrt(30 / PI) * (Math.cos(2 * phi) * (-cosT + cosT2)),
			Math.sqrt(30 / PI) * (cosP*(-1 + 2 * cosT) * Math.sqrt(cosT - cosT2)),
			Math.sqrt(5  / (2 * PI)) * (1 - 6 * cosT + 6 * cosT2),
			Math.sqrt(30 / PI) * ((-1 + 2 * cosT) * Math.sqrt(cosT - cosT2) * Math.sin(phi)),
			Math.sqrt(30 / PI) * ((-cosT + cosT2) * Math.sin(2*phi))
		]);
	}
}


export { ShaderRTI }
