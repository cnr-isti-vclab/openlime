/**
 * An Raster Format describes the way that the images in textures and renderbuffers store their data.
 * * 'vec3' format must be specified if the image is RGB (without alpha).
 * * 'vec4' is related to RGBA images.
 * * 'float' is for file containg coefficients.
 * @typedef {('vec3'|'vec4'|'float')} Raster#Format
 */

/**
 * Raster is a provider of image and/or plane of coefficients.
 * It support all file formats supported by {@link Layout}.
 * 
 * An object literal with Raster `options` can be specified.
 *  * @param {Object} [options] An object literal describing the raster content.
 * @param {Raster#Format} options.format='vec3' The color format of the image.
 */

class Raster {

	constructor(options) {

		Object.assign(this, { 
			format: 'vec3', 
		 });

		Object.assign(this, options);
	}

	/**
	 * Gets a tile.
	 * @param {Tile} tile A tile.
	 * @param {WebGLRenderingContext} gl The WebGL rendering context .
	 * @returns {'[tex, size]'} A pair (tex,size).
	 */
	async loadImage(tile, gl) {
		let img;
		let cors = (new URL(tile.url, window.location.href)).origin !== window.location.origin;
		if (tile.end || typeof createImageBitmap == 'undefined') {
			let options = {};
			options.headers = { range: `bytes=${tile.start}-${tile.end}`, 'Accept-Encoding': 'indentity', mode: cors? 'cors' : 'same-origin' };
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
			if (cors) img.crossOrigin="";
			img.onerror = function (e) { console.log("Texture loading error!"); };
			img.src = tile.url;
			await new Promise((resolve, reject) => { 
				img.onload = () => { console.log("Loaded!"); resolve(); } });
		}
		let tex = this.loadTexture(gl, img);
		//TODO 3 is not accurate for type of image, when changing from rgb to grayscale, fix this value.
		let size = img.width * img.height * 3;
		return [tex, size];	
	}

	/** @ignore */
	async blobToImage(blob, gl) {
		let tex, img;
		if(typeof createImageBitmap != 'undefined') {
			var isFirefox = typeof InstallTrigger !== 'undefined';
			//firefox does not support options for this call, BUT the image is automatically flipped.
			if(isFirefox)
				img = await createImageBitmap(blob); 
			else
				img = await createImageBitmap(blob, { imageOrientation1: 'flipY' });

		} else { //fallback for IOS
			let urlCreator = window.URL || window.webkitURL;
			img = document.createElement('img');
			img.onerror = function(e) { console.log("Texture loading error!"); };
			img.src = urlCreator.createObjectURL(blob);

			await new Promise((resolve, reject) => { img.onload = () => resolve() });
			urlCreator.revokeObjectURL(img.src);
			
		}
		return img;		
	}

	/** @ignore */
	loadTexture(gl, img) {
		this.width = img.width;  //this will be useful for layout image.
		this.height = img.height;

		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		let glFormat = gl.RGBA;
		switch(this.format) {
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
		return tex;
	}
}

export { Raster }
