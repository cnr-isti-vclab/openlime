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
}

export { Raster }
