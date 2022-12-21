import { ShaderFilter } from "./ShaderFilter.js";
import {Layer} from "./Layer.js"

class ShaderFilterDstretch extends ShaderFilter {
    constructor(input, options) {
		super(options);

        this.min = [0,0,0];
        this.max = [0,0,0];
        this.rotationArray = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];

        this.samplers.push({ id:0, name:'image', type:'vec3' });
        this.rotationMatrix = [[1,0,0,0],[0,1,0,0],[0,0,1,0],[0,0,0,1]];

        // Set uniforms
        this.uniforms[this.uniformName('min_col')] = 
            { type: 'vec3', needsUpdate: true, size: 3, value: this.min };
        this.uniforms[this.uniformName('max_col')] = 
            { type: 'vec3', needsUpdate: true, size: 3, value: this.max };
        this.uniforms[this.uniformName('rotation')] = 
            { type: 'mat4', needsUpdate: true, size: 16, value: this.rotationArray };

        // Compute rotation matrix
        this.updateRotationMatrix([-1, -1, 0]);
        // Load samples
        if (typeof(input) === "string")
            this.initFromURL(input);
        else if (typeof(input) === "object")
            if (input instanceof Layer)
                this.initFromLayer(input);
            else
                this.initFromSamples(input);
	}

    initFromURL(url) {
        (async () => {
			let json;
			try {
				let dstretchUrl = url.substring(0, url.lastIndexOf(".")) + ".dstretch";
				let response = await fetch(dstretchUrl);
				console.log(response.ok);
				json = await response.json();

				// Store samples, compute min / max on the fly
                this.setMinMax(json["samples"]);
			}
			catch (error) {
				json = {
					transformation: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
					samples: []
				};
                this.setMinMax(this.getSamplesFromTexture(url));
			}
			
		})();
    }

    initFromLayer(layer) {
        function loadImage() {
            let imageUrl = layer.layout.getTileURL(0,{level:0, x: 0, y:0});
            this.initFromURL(imageUrl);
        }
        if (layer.layout.status !== 'ready')
            layer.layout.addEvent('ready', loadImage.bind(this));
        else
            loadImage.bind(this)();
    }

    initFromSamples(samples) {
        this.setMinMax(samples);
    }

    getSamplesFromTexture(image) {
        let img = image;
        if (!(img instanceof Image)) {
            img = new Image();
            img.src = image;
        }

        img.onload = function() {
            // Sample the texture
            // Temporarily print the texture on a canvas
            let canvas = document.createElement("canvas");
            let context = canvas.getContext("2d");

            canvas.setAttribute("width", img.width);
            canvas.setAttribute("height", img.height);
            context.drawImage(img, 0, 0, img.width, img.height);

            // Get the data and sample the texture
            let imageData = context.getImageData(0, 0, img.width, img.height).data;
            let samples = [];
            let rowSkip = Math.floor(img.height / 32);
            let colSkip = Math.floor(img.width / 32);

            console.log(rowSkip, colSkip);

            for (let i=0; i<imageData.length; i+=4) {
                let row = Math.floor((i / 4) / img.width);
                let col = Math.floor(i / 4) % img.width;

                if (row % rowSkip == 0 && col % colSkip == 0)
                    samples.push([imageData[i], imageData[i+1], imageData[i+2]]);
            }
            
            console.log(samples);
            this.setMinMax(samples);
        }.bind(this);
    }

    setMinMax(samples) {
        if (samples == undefined)
            return;
            
        let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let sample of samples) {
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

        this.uniforms[this.uniformName('min_col')].value = min;
        this.uniforms[this.uniformName('min_col')].needsUpdate = true;

        this.uniforms[this.uniformName('max_col')].value = max;
        this.uniforms[this.uniformName('max_col')].needsUpdate = true;

        this.uniforms[this.uniformName('rotation')].value = this.matToArray(this.rotationMatrix);
        this.uniforms[this.uniformName('rotation')].needsUpdate = true;
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

    fragUniformSrc(gl) {
        return `
            uniform mat4 ${this.uniformName('rotation')};
            uniform vec3 ${this.uniformName('min_col')};
            uniform vec3 ${this.uniformName('max_col')};
        `;
    }

    fragDataSrc(gl) {
        return `

        vec4 ${this.functionName()}(vec4 col) {
            vec3 ret = vec3(127.0, 127.0, 127.0) + (transpose(${this.uniformName('rotation')}) * 
                (${this.uniformName('rotation')} * 255.0 * (col - vec4(0.5, 0.5, 0.5, 0.0)))).xyz;
            
            ret =   (ret - ${this.uniformName('min_col')}) / 
                    (${this.uniformName('max_col')} - ${this.uniformName('min_col')});

            return vec4(ret, 1.0);
        }`;
	}

}

export {ShaderFilterDstretch}