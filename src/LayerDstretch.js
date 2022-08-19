import {Layer} from './Layer.js';
import {LayerImage} from './LayerImage.js'
import {ShaderDstretch} from './ShaderDstretch.js';
import { Raster } from './Raster.js';

class LayerDstretch extends LayerImage {
    constructor(options) {
		super(options);

		if(!this.url)
			throw "Url option is required";

		this.shaders['dstretch'] = new ShaderDstretch();
		this.setShader('dstretch');
		this.eulerRotation = [0,0,0];

		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.
		if(this.url)
			this.loadJson();
		this.addControl('light', [0, 0]);
	}

	setLight(value, dt) {
		this.setControl('light', value, dt);

		this.eulerRotation[1] = Math.PI * this.getControl('light').current.value[0];//this.controls['light'].current[0];
		this.eulerRotation[2] = Math.PI * this.getControl('light').current.value[1];//this.controls['light'].current[1];

		this.shader.updateRotationMatrix(this.eulerRotation);
		this.emit('update');
	}
	
	loadJson() {
		(async () => {
			let json
			try {
				let dstretchUrl = this.url.substring(0, this.url.lastIndexOf(".")) + ".dstretch";
				let response = await fetch(dstretchUrl);
				console.log(response.ok);
				json = await response.json();
			}
			catch (error) {
				json = {
					transformation: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
					samples: []
				};
				this.rasters[0].loadTexture = this.loadAndSampleTexture.bind(this);
			}

			this.layout.setUrls([this.url]);
			this.shader.init(json);
		})();
	} 

	draw(transform, viewport) {
		this.shader.setMinMax();
		return super.draw(transform, viewport);
	}

	loadAndSampleTexture(gl, img) {
		this.rasters[0].width = img.width;
		this.rasters[0].height = img.height;
		let tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);

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
		let rowSkip = Math.floor(img.height / 16);
		let colSkip = Math.floor(img.width / 16);

		console.log(rowSkip, colSkip);

		for (let i=0; i<imageData.length; i+=4) {
			let row = Math.floor((i / 4) / img.width);
			let col = Math.floor(i / 4) % img.width;

			if (row % rowSkip == 0 && col % colSkip == 0)
				samples.push([imageData[i], imageData[i+1], imageData[i+2]]);
				
		}

		this.shader.samples = samples;
		this.shader.setMinMax();
		return tex;
	}
}

Layer.prototype.types['dstretch'] = (options) => { return new LayerDstretch(options); }

export { LayerDstretch }