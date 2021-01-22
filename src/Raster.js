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
 * * *layout*: <image|google|deepzoom|zoomify|iip|iiif> default is image.
 * * *type*: rgb (default value) for standard images, rgba when including alpha, grayscale8,  grayscale16 for other purpouses.
 * * *attribute*: <color|kd|ks|gloss|normals|dem> meaning of the image.
 * * *colorSpace*: <linear|srgb> colorspace used for rendering.
 */

class Raster {
	constructor(id, url, options) {
		if(!this.id)
			throw "Missing id argument";
		this.id = id;
		if(!this.url)
			this.url = url;

		let initial = { width: 0, height: 0, layout: 'image', type: 'rgb', colorSpace: 'srgb' }
		object.assign(this, initial);
		object.assign(this, options);
		init()
	}

	init() {
		
	}
}
