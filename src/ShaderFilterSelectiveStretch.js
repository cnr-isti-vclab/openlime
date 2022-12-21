import { ShaderFilter } from "./ShaderFilter.js";
import {Layer} from "./Layer.js"

class ShaderFilterSelectiveStretch extends ShaderFilter {
    constructor(input, options) {
		super(options);

        this.min = [0,0,0];
        this.max = [0,0,0];
        this.rotationArray = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
        this.controls = [0.0, 0.0, 1.0];

        this.samplers.push({ id:0, name:'image', type:'vec3' });

        // Set uniforms
        this.uniforms[this.uniformName('min_col')] = 
            { type: 'vec3', needsUpdate: true, size: 3, value: this.min };
        this.uniforms[this.uniformName('max_col')] = 
            { type: 'vec3', needsUpdate: true, size: 3, value: this.max };
        this.uniforms[this.uniformName('translation')] = 
            { type: 'float', needsUpdate: true, size: 1, value: this.controls[1] * 128 };
        this.uniforms[this.uniformName('hueAngle')] = 
            { type: 'float', needsUpdate: true, size: 1, value: this.controls[0] };

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
        // We either need the samples passed by the user or the ones stored previously
        if (samples == undefined && this.samples == undefined)
            return;
            
        if (samples == undefined)
            samples = this.samples;
        else
            this.samples = samples;
            
        let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let sample of samples) {
            let labSample = this.rgb2lab([sample[0], sample[1], sample[2]], this.controls[0]);
            for (let j=0; j<3; j++) {
                if (labSample[j] < min[j])
                    min[j] = labSample[j];
                if (labSample[j] > max[j])
                    max[j] = labSample[j];
            }
        }

        let mid = [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2 ]
        
        let rawMin = [min[0], -127, mid[2] + 127 * this.controls[1]];
        let rawMax = [max[0], 128, mid[2] - 128 * this.controls[1]];

        const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

        this.min[0] = rawMin[0];
        this.max[0] = rawMax[0];

        for (let i=1; i<3; i++) {
            this.min[i] = clamp(rawMin[i], -127, 128);
            this.max[i] = clamp(rawMax[i], -127, 128);
        }

        this.uniforms[this.uniformName('min_col')].value = this.min;
        this.uniforms[this.uniformName('min_col')].needsUpdate = true;

        this.uniforms[this.uniformName('max_col')].value = this.max;
        this.uniforms[this.uniformName('max_col')].needsUpdate = true;

        this.uniforms[this.uniformName('translation')].value = this.controls[1] * 128;
        this.uniforms[this.uniformName('translation')].needsUpdate = true;

        this.uniforms[this.uniformName('hueAngle')].value = this.controls[0];
        this.uniforms[this.uniformName('hueAngle')].needsUpdate = true;
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
            uniform float ${this.uniformName('hueAngle')};
            uniform float ${this.uniformName('translation')};
            uniform vec3 ${this.uniformName('min_col')};
            uniform vec3 ${this.uniformName('max_col')};
        `;
    }

    fragDataSrc(gl) {
        return `
            
        vec3 ${this.functionName()}rgb2xyz( vec3 c ) {
            vec3 tmp;
            tmp.x = ( c.r > 0.04045 ) ? pow( ( c.r + 0.055 ) / 1.055, 2.4 ) : c.r / 12.92;
            tmp.y = ( c.g > 0.04045 ) ? pow( ( c.g + 0.055 ) / 1.055, 2.4 ) : c.g / 12.92,
            tmp.z = ( c.b > 0.04045 ) ? pow( ( c.b + 0.055 ) / 1.055, 2.4 ) : c.b / 12.92;

            return 100.0 * tmp *
                mat3( 0.4124, 0.3576, 0.1805,
                    0.2126, 0.7152, 0.0722,
                    0.0193, 0.1192, 0.9505 );
        }

        vec3 ${this.functionName()}xyz2lab( vec3 c ) {
            vec3 n = c / vec3( 95.047, 100, 108.883 );
            vec3 v;
            v.x = ( n.x > 0.008856 ) ? pow( n.x, 1.0 / 3.0 ) : ( 7.787 * n.x ) + ( 16.0 / 116.0 );
            v.y = ( n.y > 0.008856 ) ? pow( n.y, 1.0 / 3.0 ) : ( 7.787 * n.y ) + ( 16.0 / 116.0 );
            v.z = ( n.z > 0.008856 ) ? pow( n.z, 1.0 / 3.0 ) : ( 7.787 * n.z ) + ( 16.0 / 116.0 );
            return vec3(( 116.0 * v.y ) - 16.0, 500.0 * ( v.x - v.y ), 200.0 * ( v.y - v.z ));
        }

        vec3 ${this.functionName()}rgb2lab(vec3 c, float angle) {
            vec3 xyz = ${this.functionName()}rgb2xyz(c);
            vec3 lab = ${this.functionName()}xyz2lab( xyz);

            // Rotate color
            lab = vec3(lab.x, lab.y* cos(angle) + lab.z * sin(angle), lab.y * -sin(angle) + lab.z * cos(angle));

            return vec3( lab.x / 100.0, 0.5 + 0.5 * ( lab.y / 127.0 ), 0.5 + 0.5 * ( lab.z / 127.0 ));
        }

        vec3 ${this.functionName()}lab2xyz( vec3 c ) {
            float fy = ( c.x + 16.0 ) / 116.0;
            float fx = c.y / 500.0 + fy;
            float fz = fy - c.z / 200.0;
            return vec3(
                95.047 * (( fx > 0.206897 ) ? fx * fx * fx : ( fx - 16.0 / 116.0 ) / 7.787),
                100.000 * (( fy > 0.206897 ) ? fy * fy * fy : ( fy - 16.0 / 116.0 ) / 7.787),
                108.883 * (( fz > 0.206897 ) ? fz * fz * fz : ( fz - 16.0 / 116.0 ) / 7.787)
            );
        }

        vec3 ${this.functionName()}xyz2rgb( vec3 c ) {
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

        vec3 ${this.functionName()}lab2rgb(vec3 c, float angle) {
            vec3 lab = vec3(100.0 * c.x, 2.0 * 127.0 * (c.y - 0.5), 2.0 * 127.0 * (c.z - 0.5));
            lab = vec3(lab.x, lab.y * cos(angle) + lab.z * -sin(angle), lab.y * sin(angle) + lab.z * cos(angle));
            
            vec3 xyz = ${this.functionName()}lab2xyz(lab);
            return ${this.functionName()}xyz2rgb( xyz);
        }

        vec4 ${this.functionName()}(vec4 color) {
            vec3 texColor = color.xyz;
            vec3 labColor = ${this.functionName()}rgb2lab(texColor, ${this.uniformName('hueAngle')});

            // Normalize min & max
            vec3 normMin = ${this.uniformName('min_col')};
            vec3 normMax = ${this.uniformName('max_col')};

            normMin.x = 10.0;
            normMax.x = 90.0;

            // Denormalize color, scale L
            labColor.x = ((labColor.x * 100.0 - normMin.x) / (normMax.x - normMin.x));
            labColor.yz = labColor.yz * 255.0 - 127.0;

            // Translate color
            if (labColor.z > 0.0)
                labColor.z = labColor.z * ${this.uniformName('translation')} / 4.0;

            vec3 ret = vec3(labColor.x, labColor.y, labColor.z);
            // Normalize result
            ret.yz = (ret.yz + 127.0) / 255.0;

            ret = ${this.functionName()}lab2rgb(ret, ${this.uniformName('hueAngle')});
            
            return vec4(ret, 1.0);
        }
        `;
	}

}

export {ShaderFilterSelectiveStretch}