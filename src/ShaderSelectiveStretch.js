import { Shader } from "./Shader";

class ShaderSelectiveStretch extends Shader {
    constructor(options) {
		super(options);
	}

	init(json) {
        this.rotationMatrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
        this.controls = [0.0, 0.0, 1.0];

        // Store samples, compute min / max on the fly
        this.samples = json["samples"];
        this.samplers.push({ id:0, name:'image', type:'vec3' });

        this.min = [0,0,0];
        this.max = [0,0,0];

        this.setMinMax();
	}

    setMinMax() {
        if (this.samples == undefined)
            return;
            
        let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let sample of this.samples) {
            let labSample = this.rgb2lab([sample[0], sample[1], sample[2]], this.controls[0]);
            for (let j=0; j<3; j++) {
                if (labSample[j] < min[j])
                    min[j] = labSample[j];
                if (labSample[j] > max[j])
                    max[j] = labSample[j];
            }
        }

        let mid = [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2 ]
        
        this.rawMin = [min[0], -127, mid[2] + 127 * this.controls[1]];
        this.rawMax = [max[0], 128, mid[2] - 128 * this.controls[1]];

        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

        this.min[0] = this.rawMin[0];
        this.max[0] = this.rawMax[0];

        for (let i=1; i<3; i++) {
            this.min[i] = clamp(this.rawMin[i], -127, 128);
            this.max[i] = clamp(this.rawMax[i], -127, 128);
        }

        this.uniforms = {
            translation: {type: 'float', needsUpdate: true, size: 4, value: this.controls[1] * 128},
            rotation: { type: 'mat4', needsUpdate: true, size: 16, value: this.matToArray(this.rotationMatrix)},
			min: {type: 'vec3', needsUpdate:true, size: 3, value: this.min},
            max: {type: 'vec3', needsUpdate:true, size: 3, value: this.max},
            hueAngle: {type: 'float', needsUpdate:true, size: 1, value: this.controls[0]}
		}
    }

    updateRotationMatrix(controls) {
        if (!controls)
            return;

        this.controls = [controls[0], controls[1], 1.0];
        this.setMinMax();
	}

    matToArray(mat) {
        let arr = [];
		for (let i=0; i<4; i++)
			arr = arr.concat(mat[i]);
        return arr;
    }
      
    lab2rgb(lab){
        var y = (lab[0] + 16) / 116,
            x = lab[1] / 500 + y,
            z = y - lab[2] / 200,
            r, g, b;
      
        x = 0.95047 * ((x * x * x > 0.008856) ? x * x * x : (x - 16/116) / 7.787);
        y = 1.00000 * ((y * y * y > 0.008856) ? y * y * y : (y - 16/116) / 7.787);
        z = 1.08883 * ((z * z * z > 0.008856) ? z * z * z : (z - 16/116) / 7.787);
      
        r = x *  3.2406 + y * -1.5372 + z * -0.4986;
        g = x * -0.9689 + y *  1.8758 + z *  0.0415;
        b = x *  0.0557 + y * -0.2040 + z *  1.0570;
      
        r = (r > 0.0031308) ? (1.055 * Math.pow(r, 1/2.4) - 0.055) : 12.92 * r;
        g = (g > 0.0031308) ? (1.055 * Math.pow(g, 1/2.4) - 0.055) : 12.92 * g;
        b = (b > 0.0031308) ? (1.055 * Math.pow(b, 1/2.4) - 0.055) : 12.92 * b;
      
        return [Math.max(0, Math.min(1, r)) * 255, 
                Math.max(0, Math.min(1, g)) * 255, 
                Math.max(0, Math.min(1, b)) * 255]
    }
      
      
    rgb2lab(rgb, angle){
        let r = rgb[0] / 255,
            g = rgb[1] / 255,
            b = rgb[2] / 255,
            x, y, z;
        
        r = (r > 0.04045) ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
        g = (g > 0.04045) ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
        b = (b > 0.04045) ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;
        
        x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047;
        y = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 1.00000;
        z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
        
        x = (x > 0.008856) ? Math.pow(x, 1/3) : (7.787 * x) + 16/116;
        y = (y > 0.008856) ? Math.pow(y, 1/3) : (7.787 * y) + 16/116;
        z = (z > 0.008856) ? Math.pow(z, 1/3) : (7.787 * z) + 16/116;

        let L = (116 * y) - 16;
        let A = 500 * (x - y);
        let B = 200 * (y - z);

        // Rotate color
        return [L, A * Math.cos(angle) + B * Math.sin(angle), A * -Math.sin(angle) + B * Math.cos(angle)];
    }

	fragShaderSrc(gl) {
        
		let gl2 = !(gl instanceof WebGLRenderingContext);
		let str = `${gl2? '#version 300 es' : ''}

precision highp float; 
precision highp int; 

${gl2? 'in' : 'varying'} vec2 v_texcoord;
${gl2? 'out' : ''} vec4 color;

uniform mat4 rotation;
uniform float hueAngle;
uniform float translation;
uniform vec3 min;
uniform vec3 max;
uniform sampler2D image;


vec3 rgb2xyz( vec3 c ) {
    vec3 tmp;
    tmp.x = ( c.r > 0.04045 ) ? pow( ( c.r + 0.055 ) / 1.055, 2.4 ) : c.r / 12.92;
    tmp.y = ( c.g > 0.04045 ) ? pow( ( c.g + 0.055 ) / 1.055, 2.4 ) : c.g / 12.92,
    tmp.z = ( c.b > 0.04045 ) ? pow( ( c.b + 0.055 ) / 1.055, 2.4 ) : c.b / 12.92;

    return 100.0 * tmp *
        mat3( 0.4124, 0.3576, 0.1805,
              0.2126, 0.7152, 0.0722,
              0.0193, 0.1192, 0.9505 );
}

vec3 xyz2lab( vec3 c ) {
    vec3 n = c / vec3( 95.047, 100, 108.883 );
    vec3 v;
    v.x = ( n.x > 0.008856 ) ? pow( n.x, 1.0 / 3.0 ) : ( 7.787 * n.x ) + ( 16.0 / 116.0 );
    v.y = ( n.y > 0.008856 ) ? pow( n.y, 1.0 / 3.0 ) : ( 7.787 * n.y ) + ( 16.0 / 116.0 );
    v.z = ( n.z > 0.008856 ) ? pow( n.z, 1.0 / 3.0 ) : ( 7.787 * n.z ) + ( 16.0 / 116.0 );
    return vec3(( 116.0 * v.y ) - 16.0, 500.0 * ( v.x - v.y ), 200.0 * ( v.y - v.z ));
}

vec3 rgb2lab(vec3 c, float angle) {
    vec3 xyz = rgb2xyz(c);
    vec3 lab = xyz2lab( xyz);

    // Rotate color
    lab = vec3(lab.x, lab.y* cos(angle) + lab.z * sin(angle), lab.y * -sin(angle) + lab.z * cos(angle));

    return vec3( lab.x / 100.0, 0.5 + 0.5 * ( lab.y / 127.0 ), 0.5 + 0.5 * ( lab.z / 127.0 ));
}

vec3 lab2xyz( vec3 c ) {
    float fy = ( c.x + 16.0 ) / 116.0;
    float fx = c.y / 500.0 + fy;
    float fz = fy - c.z / 200.0;
    return vec3(
         95.047 * (( fx > 0.206897 ) ? fx * fx * fx : ( fx - 16.0 / 116.0 ) / 7.787),
        100.000 * (( fy > 0.206897 ) ? fy * fy * fy : ( fy - 16.0 / 116.0 ) / 7.787),
        108.883 * (( fz > 0.206897 ) ? fz * fz * fz : ( fz - 16.0 / 116.0 ) / 7.787)
    );
}

vec3 xyz2rgb( vec3 c ) {
    vec3 v =  c / 100.0 * mat3( 
        3.2406, -1.5372, -0.4986,
        -0.9689, 1.8758, 0.0415,
        0.0557, -0.2040, 1.0570
    );
    vec3 r;
    r.x = ( v.r > 0.0031308 ) ? (( 1.055 * pow( v.r, ( 1.0 / 2.4 ))) - 0.055 ) : 12.92 * v.r;
    r.y = ( v.g > 0.0031308 ) ? (( 1.055 * pow( v.g, ( 1.0 / 2.4 ))) - 0.055 ) : 12.92 * v.g;
    r.z = ( v.b > 0.0031308 ) ? (( 1.055 * pow( v.b, ( 1.0 / 2.4 ))) - 0.055 ) : 12.92 * v.b;
    return r;
}

vec3 lab2rgb(vec3 c, float angle) {
    vec3 lab = vec3(100.0 * c.x, 2.0 * 127.0 * (c.y - 0.5), 2.0 * 127.0 * (c.z - 0.5));
    lab = vec3(lab.x, lab.y * cos(angle) + lab.z * -sin(angle), lab.y * sin(angle) + lab.z * cos(angle));
    
    vec3 xyz = lab2xyz(lab);
    return xyz2rgb( xyz);
}

void main(void) {
    vec3 texColor = texture(image, v_texcoord).xyz;
    vec3 labColor = rgb2lab(texColor, hueAngle);

    // Normalize min & max
    vec3 normMin = min;
    vec3 normMax = max;

    normMin.x = 10.0;
    normMax.x = 90.0;

    // Denormalize color, scale L
    labColor.x = ((labColor.x * 100.0 - normMin.x) / (normMax.x - normMin.x));
    labColor.yz = labColor.yz * 255.0 - 127.0;

    // Translate color
    if (labColor.z > 0.0)
        labColor.z = labColor.z * translation / 4.0;

    vec3 ret = vec3(labColor.x, labColor.y, labColor.z);
    // Normalize result
    ret.yz = (ret.yz + 127.0) / 255.0;

    ret = lab2rgb(ret, hueAngle);
    
    color = vec4(ret, 1.0);
}`;
		return str;
	}
}

export {ShaderSelectiveStretch}