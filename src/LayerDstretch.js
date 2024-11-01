import { Layer } from './Layer.js';
import { LayerImage } from './LayerImage.js'
import { ShaderDstretch } from './ShaderDstretch.js';
import { Raster } from './Raster.js';

/**
 * @typedef {Object} LayerDStretchOptions
 * @property {string} url - URL to the image to be processed (required)
 * @property {number[]} [eulerRotation=[0,0,0]] - Initial Euler rotation angles
 * @property {number} [worldRotation=0] - Global rotation offset for canvas/layer
 * @extends LayerImageOptions
 */

/**
 * LayerDStretch implements the DStretch (Decorrelation Stretch) algorithm for image enhancement.
 * This technique is particularly useful in archaeology and rock art documentation for revealing
 * faint pictographs and petroglyphs.
 * 
 * DStretch works by:
 * 1. Converting RGB colors to a decorrelated color space
 * 2. Equalizing and stretching the color distributions
 * 3. Converting back to RGB for display
 * 
 * Features:
 * - Real-time image enhancement
 * - Interactive control of enhancement parameters
 * - Automatic color statistics computation
 * - Support for large images through tiling
 * - GPU-accelerated processing
 * - Light direction control
 * 
 * Technical Implementation:
 * - Uses Principal Component Analysis (PCA) for color decorrelation
 * - Supports custom transformation matrices
 * - Implements dynamic sampling for color statistics
 * - Handles WebGL texture management
 * - Supports progressive loading
 * 
 * @extends LayerImage
 * 
 * @example
 * ```javascript
 * // Create DStretch layer
 * const dstretchLayer = new OpenLIME.Layer({
 *   type: 'dstretch',
 *   url: 'image.jpg',
 *   visible: true
 * });
 * 
 * // Add to viewer
 * viewer.addLayer('enhanced', dstretchLayer);
 * 
 * // Adjust enhancement parameters
 * dstretchLayer.setLight([0.5, 0.3], 500); // Animate to new enhancement
 * ```
 */
class LayerDstretch extends LayerImage {
	/**
	 * Creates a new LayerDStretch instance
	 * @param {LayerDStretchOptions} options - Configuration options
	 * @throws {Error} If url option is not provided
	 */
	constructor(options) {
		super(options);

		if (!this.url)
			throw "Url option is required";

		this.shaders['dstretch'] = new ShaderDstretch();
		this.setShader('dstretch');
		this.eulerRotation = [0, 0, 0];

		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.
		if (this.url)
			this.loadJson();
		this.addControl('light', [0, 0]);
	}

	/**
 * Sets the enhancement parameters through a light-like interface
 * @param {number[]} value - Two values controlling the enhancement transformation
 * @param {number} [dt] - Animation duration in milliseconds
 * @fires Layer#update
 */
	setLight(value, dt) {
		this.setControl('light', value, dt);

		this.eulerRotation[0] = Math.PI * this.getControl('light').current.value[0];//this.controls['light'].current[0];
		this.eulerRotation[1] = Math.PI * this.getControl('light').current.value[1];//this.controls['light'].current[1];

		this.shader.updateRotationMatrix(this.eulerRotation);
		this.emit('update');
	}

	/**
	 * Loads DStretch configuration and image data
	 * Attempts to load a .dstretch companion file with pre-computed statistics
	 * Falls back to runtime sampling if companion file is not found
	 * @private
	 */
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

	/**
	 * Renders the enhanced image
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport parameters
	 * @returns {boolean} Whether the render completed successfully
	 * @override
	 * @private
	 */
	draw(transform, viewport) {
		this.shader.setMinMax();
		return super.draw(transform, viewport);
	}

	/**
	 * Loads texture and performs color sampling if needed
	 * Samples the image in a grid pattern to compute color statistics
	 * @param {WebGLRenderingContext} gl - WebGL context
	 * @param {HTMLImageElement} img - Source image
	 * @returns {WebGLTexture} Created texture
	 * @private
	 */
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
		let rowSkip = Math.floor(img.height / 32);
		let colSkip = Math.floor(img.width / 32);

		console.log(rowSkip, colSkip);

		for (let i = 0; i < imageData.length; i += 4) {
			let row = Math.floor((i / 4) / img.width);
			let col = Math.floor(i / 4) % img.width;

			if (row % rowSkip == 0 && col % colSkip == 0)
				samples.push([imageData[i], imageData[i + 1], imageData[i + 2]]);
		}

		this.shader.samples = samples;
		this.shader.setMinMax();
		return tex;
	}
}

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['dstretch'] = (options) => { return new LayerDstretch(options); }

export { LayerDstretch }