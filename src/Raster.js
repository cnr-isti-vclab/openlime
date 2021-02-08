/**
 * Raster is a providers of images and planes of coefficies.
 * It support all files format supported by browser and a set of tiled formats.
 *
 * Layout can be:
 * * image: a single image (.jpg, .png etc.)
 * * google: there is no config file, so layout, suffix is mandatory if not .jpg,  and url is the base folder of the tiles.
 * * deepzoom: requires only url, can be autodetected from the extension (.dzi)
 * * zoomify: requires url, can be autodetected, from the ImageProperties.xml, suffix is required if not .jpg
 * * iip: requires url, can be autodetected from the url
 * * iiif: layout is mandatory, url should point to base url {scheme}://{server}{/prefix}/{identifier}
 *
 * @param {string} id an unique id for each raster
 * @param {url} url of the content
 * @param {object} options 
 * * *type*: vec3 (default value) for standard images, vec4 when including alpha, vec2, float other purpouses.
 * * *attribute*: <coeff|kd|ks|gloss|normals|dem> meaning of the image.
 * * *colorSpace*: <linear|srgb> colorspace used for rendering.
 */

class Raster {

	constructor(options) {

		Object.assign(this, { 
			type: 'vec3', 
			colorSpace: 'linear',
			attribute: 'kd'
		 });

		Object.assign(this, options);
	}


	loadImage(url, gl, callback) {
		(async () => {
			var response = await fetch(url);
			if(!response.ok) {
				console.log();
				callback("Failed loading " + url + ": " + response.statusText);
				return;
			}

			let blob = await response.blob();

			if(typeof createImageBitmap != 'undefined') {
				var isFirefox = typeof InstallTrigger !== 'undefined';
				//firefox does not support options for this call, BUT the image is automatically flipped.
				if(isFirefox) {
					createImageBitmap(blob).then((img) => this.loadTexture(gl, img, callback));
				} else {
					createImageBitmap(blob, { imageOrientation1: 'flipY' }).then((img) => this.loadTexture(gl, img, callback));
				}

			} else { //fallback for IOS
				var urlCreator = window.URL || window.webkitURL;
				var img = document.createElement('img');
				img.onerror = function(e) { console.log("Texture loading error!"); };
				img.src = urlCreator.createObjectURL(blob);

				img.onload = function() {
					urlCreator.revokeObjectURL(img.src);


					this.loadTexture(gl, img, callback);
				}
			}
		})().catch(e => { callback(null); });
	}
/*
 * @param {function} callback as function(tex, sizeinBytes)
 */

	loadTexture(gl, img, callback) {
		this.width = img.width;  //this will be useful for layout image.
		this.height = img.height;

		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); //_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
		//TODO 3 is not accurate for type of image, when changing from rgb to grayscale, fix this value.
		callback(tex, img.width*img.height*3);
	}
}

export { Raster }
