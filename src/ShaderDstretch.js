import { Shader } from "./Shader";

class ShaderDstretch extends Shader {
    constructor(options) {
		super(options);
        this.samplers.push({ id:0, name:'image', type:'vec3' });

	}

	init(json) {
        this.rotationMatrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

        // Store samples, compute min / max on the fly
        this.samples = json["samples"];

        this.setMinMax();
	}

    setMinMax() {
        if (this.samples == undefined)
            return;
            
        let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let sample of this.samples) {
            let transformedSample = this.transformVector(this.matToArray(this.transpose(this.rotationMatrix)),
             this.transformVector(
                this.matToArray(this.rotationMatrix), 
                    sample.concat(1)));

            for (let j=0; j<3; j++) {
                if (transformedSample[j] < min[j])
                    min[j] = transformedSample[j];
                if (transformedSample[j] > max[j])
                    max[j] = transformedSample[j];
            }
        }

        this.min = min;
        this.max = max;

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
		let x = [[1,0,0,0],
			[0,	Math.cos(eulerRotation[0]),	-Math.sin(eulerRotation[0]),0],
			[0, Math.sin(eulerRotation[0]), Math.cos(eulerRotation[0]),	0],
			[0,0,0,1]];
		let y = [
			[Math.cos(eulerRotation[1]), 0, Math.sin(eulerRotation[1]),0],
			[0,1,0,0],
			[Math.sin(eulerRotation[1]), 0, Math.cos(eulerRotation[1]), 0],
			[0,0,0,1]];
		let z = [
			[Math.cos(eulerRotation[2]), -Math.sin(eulerRotation[2]), 0, 0],
			[Math.sin(eulerRotation[2]), Math.cos(eulerRotation[2]), 0, 0],
			[0,0,1,0],
			[0,0,0,1]
		];

		let mat = this.multiplyMatrices(y, x);
		mat = this.multiplyMatrices(z, mat);

		this.rotationMatrix = mat;
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

    transformVector(matrix, point) {
        let c0r0 = matrix[ 0], c1r0 = matrix[ 1], c2r0 = matrix[ 2], c3r0 = matrix[ 3];
        let c0r1 = matrix[ 4], c1r1 = matrix[ 5], c2r1 = matrix[ 6], c3r1 = matrix[ 7];
        let c0r2 = matrix[ 8], c1r2 = matrix[ 9], c2r2 = matrix[10], c3r2 = matrix[11];
        let c0r3 = matrix[12], c1r3 = matrix[13], c2r3 = matrix[14], c3r3 = matrix[15];
      
        let x = point[0] -  127, y = point[1] - 127, z = point[2] - 127, w = point[3];
      
        let resultX = (x * c0r0) + (y * c0r1) + (z * c0r2) + (w * c0r3);
        let resultY = (x * c1r0) + (y * c1r1) + (z * c1r2) + (w * c1r3);
        let resultZ = (x * c2r0) + (y * c2r1) + (z * c2r2) + (w * c2r3);
        let resultW = (x * c3r0) + (y * c3r1) + (z * c3r2) + (w * c3r3);
      
        return [resultX + 127, resultY + 127, resultZ + 127, resultW];
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

void main(void) {
    vec3 ret = vec3(127.0, 127.0, 127.0) + (transpose(rotation) * (rotation * 255.0 * (texture(image, v_texcoord) - vec4(0.5, 0.5, 0.5, 0.0)))).xyz;
    ret = (ret - min) / (max - min);

    color = vec4(ret, 1.0);
}`;
		return str;
	}
}

export {ShaderDstretch}