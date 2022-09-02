import { Shader } from "./Shader";

class ShaderDstretch extends Shader {
    constructor(options) {
		super(options);
	}

	init(json) {
        this.rotationMatrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];
        this.minMaxMultipliers = [1.0, 1.0, 1.0];

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
        for (let i=0; i<this.samples.length; i++) {
            let labSample = this.rgb2lab([this.samples[i][0],this.samples[i][1],this.samples[i][2]]);

            for (let j=0; j<3; j++) {
                if (labSample[j] < min[j])
                    min[j] = labSample[j];
                if (labSample[j] > max[j])
                    max[j] = labSample[j];
            }
        }

        this.rawMin = [min[0], min[1] - 10 * this.minMaxMultipliers[1], min[2] - 10 * this.minMaxMultipliers[2]];
        this.rawMax = [max[0], max[1] + 10 * this.minMaxMultipliers[1], max[2] + 10 * this.minMaxMultipliers[2]];

        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

        this.min[0] = this.rawMin[0];
        this.max[0] = this.rawMax[0];

        for (let i=1; i<3; i++) {
            this.rawMin[i] = clamp(this.rawMin[i], -127, 128);
            this.rawMax[i] = clamp(this.rawMax[i], -127, 128);

            if (this.rawMin[i] < this.rawMax[i]) {
                if (this.rawMax[i] - this.rawMin[i] > 8) {
                    this.min[i] = this.rawMin[i];
                    this.max[i] = this.rawMax[i];
                }
            }
            else if (this.rawMax[i] < this.rawMin[i]) {
                if (this.rawMin[i] - this.rawMax[i] > 8) {
                    this.min[i] = this.rawMin[i];
                    this.max[i] = this.rawMax[i];
                }
            }
        }
            
        console.log("min");
        console.log(this.min);

        console.log("max");
        console.log(this.max);

        this.uniforms = {
            rotation: { type: 'mat4', needsUpdate: true, size: 16, value: this.matToArray(this.rotationMatrix)},
			min: {type: 'vec3', needsUpdate:true, size: 3, value: this.min},
            max: {type: 'vec3', needsUpdate:true, size: 3, value: this.max}
		}
    }

    transpose(mat) {
        let ret = [];

        for (let i=0; i<4; i++) {
            let arr = [];
            for (let j=0; j<4; j++)
                arr.push(mat[j][i]);
            ret.push(arr);
        }
        
        return ret;
    }

    updateRotationMatrix(eulerRotation) {
        if (!eulerRotation)
            return;

        this.minMaxMultipliers = [1.0, eulerRotation[1], eulerRotation[2]];
        console.log(this.minMaxMultipliers);
        this.setMinMax();
	}	

    multiplyMatrices(mat1, mat2) {
		var res = [];
		let i, j, k;
        for (i = 0; i < 4; i++) {
            res[i] = [];
            for (j = 0; j < 4; j++) {
                res[i][j] = 0;
                for (k = 0; k < 4; k++) {
                    res[i][j] += mat1[i][k] * mat2[k][j];
                }
            }
        }
		return res;
	}

    matToArray(mat) {
        let arr = [];
		for (let i=0; i<4; i++)
			arr = arr.concat(mat[i]);
        return arr;
    }

    transformSample(matrix, point) {
        let c0r0 = matrix[ 0], c1r0 = matrix[ 1], c2r0 = matrix[ 2], c3r0 = matrix[ 3];
        let c0r1 = matrix[ 4], c1r1 = matrix[ 5], c2r1 = matrix[ 6], c3r1 = matrix[ 7];
        let c0r2 = matrix[ 8], c1r2 = matrix[ 9], c2r2 = matrix[10], c3r2 = matrix[11];
        let c0r3 = matrix[12], c1r3 = matrix[13], c2r3 = matrix[14], c3r3 = matrix[15];
      
        let x = point[0], y = point[1], z = point[2], w = point[3];
      
        let resultX = (x * c0r0) + (y * c0r1) + (z * c0r2) + (w * c0r3);
        let resultY = (x * c1r0) + (y * c1r1) + (z * c1r2) + (w * c1r3);
        let resultZ = (x * c2r0) + (y * c2r1) + (z * c2r2) + (w * c2r3);
        let resultW = (x * c3r0) + (y * c3r1) + (z * c3r2) + (w * c3r3);
      
        return [resultX, resultY, resultZ, resultW];
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
      
      
      rgb2lab(rgb){
        var r = rgb[0] / 255,
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
      
        return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)]
      }

	fragShaderSrc(gl) {
        
		let gl2 = !(gl instanceof WebGLRenderingContext);
		let str = `${gl2? '#version 300 es' : ''}

precision highp float; 
precision highp int; 

${gl2? 'in' : 'varying'} vec2 v_texcoord;
${gl2? 'out' : ''} vec4 color;

uniform mat4 rotation;
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

vec3 rgb2lab(vec3 c) {
    vec3 lab = xyz2lab( rgb2xyz( c ) );
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

vec3 lab2rgb(vec3 c) {
    return xyz2rgb( lab2xyz( vec3(100.0 * c.x, 2.0 * 127.0 * (c.y - 0.5), 2.0 * 127.0 * (c.z - 0.5)) ) );
}

void main(void) {
    vec3 texColor = texture(image, v_texcoord).xyz;
    vec3 labColor = rgb2lab(texColor);

    // Normalize min & max

    vec3 normMin = min;
    vec3 normMax = max;
    

    // Per far vedere un colore: spostarsi nell'intervallo giusto e stringerlo
    // Espandere al massimo il colore che non viene ristretto
    // Mantenere la L in un intervallo accettabile

    labColor.x *= 100.0;
    labColor.yz = labColor.yz * 255.0 - 127.0;

    vec3 ret = ((labColor - normMin) / (normMax - normMin));

    ret = lab2rgb(ret);

    // Min: vec3(41.0, -8.0, 0.0)
    // Max: vec3(76.0, 12.0, 5.0)
    
    color = vec4(ret, 1.0);
}`;
		return str;
	}
}

export {ShaderDstretch}