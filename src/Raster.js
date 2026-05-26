import { addSignals } from './Signals.js'

/*
* @fileoverview 
* Raster module provides functionality for loading and managing image data in various formats.
* Supports multiple color formats and handles both local and remote image loading with CORS support.
*/

/**
* @typedef {('uvec3'|'uvec4'|'vec3'|'vec4'|'float')} Raster#Format
* Defines the color format for image data storage in textures and renderbuffers.
* @property {'uvec3'} uvec3 - RGB format (3 components uint8 without alpha)
* @property {'uvec4'} uvec4 - RGBA format (4 components uint8 with alpha)
* @property {'vec3'} vec3 - RGB format (3 components float without alpha)
* @property {'vec4'} vec4 - RGBA format (4 components float with alpha)
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
		this.filterLinear = true;
		Object.assign(this, {
			format: 'vec3'
		});

		this._texture = null;

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
				console.error(`Failed to load ${tile.url}: ${response.status} ${response.statusText}`);
				return;
			}

			if (response.status != 206)
				throw new Error("The server doesn't support partial content requests (206).");

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
		const tex = this.loadTexture(gl, img);
		//TODO 3 is not accurate for type of image, when changing from rgb to grayscale, fix this value.
		let nchannels = 3; // Channel is important only for tarzoom data. Tarzoom data inside format is JPG = RGB = 3 channels
		const size = img.width * img.height * nchannels;
		this.emit('loaded');
		return [tex, size];
	}

	/**
	 * Converts a Blob to an Image or ImageBitmap.
	 * Handles browser-specific differences in image orientation.
	 * @async
	 * @param {Blob} blob - Image data as Blob
	 * @param {WebGLRenderingContext} gl - The WebGL rendering context
	 * @returns {Promise<HTMLImageElement|ImageBitmap>} Promise resolving to the image
	 */
	async blobToImage(blob, gl) {
		let img;
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
	 * Creates a WebGL texture from an image. Handles different color formats and automatically creates mipmaps for large textures.
	 * @param {WebGLRenderingContext} gl - The WebGL rendering context
	 * @param {HTMLImageElement|ImageBitmap} img - The source image
	 * @returns {WebGLTexture} The created texture
	 */
	loadTexture(gl, img) {
		this.width = img.width;
		this.height = img.height;

		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);

		let glFormat = gl.RGBA;
		let internalFormat = gl.RGBA;

		switch (this.format) {
			case 'vec3':
				internalFormat = gl.RGB;
				glFormat = gl.RGB;
				break;
			case 'vec4':
				internalFormat = gl.RGBA;
				glFormat = gl.RGBA;
				break;
			case 'uvec3':
				internalFormat = gl.RGB8UI;
				glFormat = gl.RGB_INTEGER;
				break;
			case 'uvec4':
				internalFormat = gl.RGBA8UI;
				glFormat = gl.RGBA_INTEGER;
				break;
			case 'float':
				internalFormat = gl.R8;
				glFormat = gl instanceof WebGL2RenderingContext ? gl.RED : gl.LUMINANCE;
				break;
			default:
				break;
		}

		gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, glFormat, gl.UNSIGNED_BYTE, img);

		const isIntegerTexture = this.format === 'uvec3' || this.format === 'uvec4';
		this._applyTextureParams(gl, isIntegerTexture, this.width, this.height);

		this.texture = tex;
		return tex;
	}

	/**
	 * Applies texture filter, mipmap and wrap parameters to the currently bound TEXTURE_2D.
	 * Shared by {@link loadTexture} and {@link Raster16Bit#_createTextureFromData} so the
	 * filtering/mipmap logic lives in exactly one place.
	 *
	 * Rules:
	 * - Integer-sampled formats (`uvec3/4`, `*16ui`, `*16i`) must use NEAREST and cannot
	 *   use mipmaps (WebGL spec).
	 * - All other formats respect `this.filterLinear` (default `true`) and generate
	 *   mipmaps when `this.buildMipmaps` is set and both dimensions are ≥ 1024.
	 *
	 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl
	 * @param {boolean} isIntegerTexture
	 * @param {number} width
	 * @param {number} height
	 */
	_applyTextureParams(gl, isIntegerTexture, width, height) {
		if (isIntegerTexture) {
			// Integer textures must use NEAREST; mipmaps are not supported.
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		} else {
			const filterLinear = this.filterLinear ?? true;
			const filter = filterLinear ? gl.LINEAR : gl.NEAREST;
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
			if (this.buildMipmaps && width >= 1024 && height >= 1024) {
				gl.generateMipmap(gl.TEXTURE_2D);
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
			} else {
				gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
			}
		}
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
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

addSignals(Raster, 'loaded');
export { Raster }