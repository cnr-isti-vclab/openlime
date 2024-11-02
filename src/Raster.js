/*
* @fileoverview 
* Raster module provides functionality for loading and managing image data in various formats.
* Supports multiple color formats and handles both local and remote image loading with CORS support.
*/

/**
* @typedef {('vec3'|'vec4'|'float')} Raster#Format
* Defines the color format for image data storage in textures and renderbuffers.
* @property {'vec3'} vec3 - RGB format (3 components without alpha)
* @property {'vec4'} vec4 - RGBA format (4 components with alpha)
* @property {'float'} float - Single-channel format for coefficient data
*/

/**
* Raster class handles image loading and texture creation for OpenLIME.
* Provides functionality for:
* - Loading images from URLs or blobs
* - Converting images to WebGL textures
* - Handling different color formats
* - Supporting partial content requests
* - Managing CORS requests
* - Creating mipmaps for large textures
*/
class Raster {
	/**
	 * Creates a new Raster instance.
	 * @param {Object} [options] - Configuration options
	 * @param {Raster#Format} [options.format='vec3'] - Color format for image data:
	 *   - 'vec3' for RGB images
	 *   - 'vec4' for RGBA images
	 *   - 'float' for coefficient data
	 */
	constructor(options) {

		Object.assign(this, {
			format: 'vec3',
		});

		Object.assign(this, options);
	}

	/**
	 * Loads an image tile and converts it to a WebGL texture.
	 * Supports both full and partial content requests.
	 * @async
	 * @param {Object} tile - The tile to load
	 * @param {string} tile.url - URL of the image
	 * @param {number} [tile.start] - Start byte for partial requests
	 * @param {number} [tile.end] - End byte for partial requests
	 * @param {WebGLRenderingContext} gl - The WebGL rendering context
	 * @returns {Promise<Array>} Promise resolving to [texture, size]:
	 *   - texture: WebGLTexture object
	 *   - size: Size of the image in bytes (width * height * components)
	 * @throws {Error} If server doesn't support partial content requests when required
	 */
	async loadImage(tile, gl) {
		let img;
		let cors = (new URL(tile.url, window.location.href)).origin !== window.location.origin;
		if (tile.end || typeof createImageBitmap == 'undefined') {
			let options = {};
			options.headers = { range: `bytes=${tile.start}-${tile.end}`, 'Accept-Encoding': 'indentity', mode: cors ? 'cors' : 'same-origin' };
			let response = await fetch(tile.url, options);
			if (!response.ok) {
				callback("Failed loading " + tile.url + ": " + response.statusText);
				return;
			}

			if (response.status != 206)
				throw "The server doesn't support partial content requests (206).";

			let blob = await response.blob();
			img = await this.blobToImage(blob, gl);
		} else {
			img = document.createElement('img');
			if (cors) img.crossOrigin = "";
			img.onerror = function (e) { console.log("Texture loading error!"); };
			img.src = tile.url;
			await new Promise((resolve, reject) => {
				img.onload = () => { resolve(); }
			});
		}
		let tex = this.loadTexture(gl, img);
		//TODO 3 is not accurate for type of image, when changing from rgb to grayscale, fix this value.
		let size = img.width * img.height * 3;
		return [tex, size];
	}

	/**
	 * Converts a Blob to an Image or ImageBitmap.
	 * Handles browser-specific differences in image orientation.
	 * @private
	 * @async
	 * @param {Blob} blob - Image data as Blob
	 * @param {WebGLRenderingContext} gl - The WebGL rendering context
	 * @returns {Promise<HTMLImageElement|ImageBitmap>} Promise resolving to the image
	 */
	async blobToImage(blob, gl) {
		let tex, img;
		if (typeof createImageBitmap != 'undefined') {
			var isFirefox = typeof InstallTrigger !== 'undefined';
			//firefox does not support options for this call, BUT the image is automatically flipped.
			if (isFirefox)
				img = await createImageBitmap(blob);
			else
				img = await createImageBitmap(blob, { imageOrientation1: 'flipY' });

		} else { //fallback for IOS
			let urlCreator = window.URL || window.webkitURL;
			img = document.createElement('img');
			img.onerror = function (e) { console.log("Texture loading error!"); };
			img.src = urlCreator.createObjectURL(blob);

			await new Promise((resolve, reject) => { img.onload = () => resolve() });
			urlCreator.revokeObjectURL(img.src);

		}
		return img;
	}

	/**
	 * Creates a WebGL texture from an image.
	 * Handles different color formats and automatically creates mipmaps for large textures.
	 * @private
	 * @param {WebGLRenderingContext} gl - The WebGL rendering context
	 * @param {HTMLImageElement|ImageBitmap} img - The source image
	 * @returns {WebGLTexture} The created texture
	 * 
	 * @property {number} width - Width of the loaded image (set after loading)
	 * @property {number} height - Height of the loaded image (set after loading)
	 */
	loadTexture(gl, img) {
		this.width = img.width;  //this will be useful for layout image.
		this.height = img.height;

		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);

		let glFormat = gl.RGBA;
		switch (this.format) {
			case 'vec3':
				glFormat = gl.RGB;
				break;
			case 'vec4':
				glFormat = gl.RGBA;
				break;
			case 'float':
				glFormat = gl.LUMINANCE;
				break;
			default:
				break;
		}

		gl.texImage2D(gl.TEXTURE_2D, 0, glFormat, glFormat, gl.UNSIGNED_BYTE, img);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

		//build mipmap for large images.
		if (this.width > 1024 || this.height > 1024) {
			gl.generateMipmap(gl.TEXTURE_2D);
			gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
		} else {
			gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		}

		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		return tex;
	}
}
/**
 * Example usage of Raster:
 * ```javascript
 * // Create a Raster for RGBA images
 * const raster = new Raster({ format: 'vec4' });
 * 
 * // Load an image tile
 * const tile = {
 *     url: 'https://example.com/image.jpg',
 *     start: 0,
 *     end: 1024  // Optional: for partial loading
 * };
 * 
 * // Get WebGL context and load the image
 * const gl = canvas.getContext('webgl');
 * const [texture, size] = await raster.loadImage(tile, gl);
 * 
 * // Texture is now ready for use in WebGL
 * gl.bindTexture(gl.TEXTURE_2D, texture);
 * ```
 */
export { Raster }
