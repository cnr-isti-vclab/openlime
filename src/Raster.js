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
		if(!id)
			throw "Missing id argument";
		if(!url)
			throw "Missing url argument";

		this.id = id;
		this.url = url;

		Object.assign(this, { 
			width: 0, height: 0, layout: 'image', suffix: 'jpg', 
			tilesize: 0, overlap: 0, nlevels: 0,
			type: 'rgb', colorSpace: 'srgb',
			status: 'loading',
			onReady: []
		 });

		if(options) {
			if(typeof(options.ready) == 'function')
				options.ready = [options.ready];

			Object.assign(this, options);
		}

		switch(this.layout) {
			case 'image':    this.status = 'ready'; this.emit('ready'); break;
			case 'google':   this.initGoogle(); break;
			case 'deepzoom': this.initDeepzoom(); break;
		}
	}

	emit(event) {
		for(let callback of this[event])
			callback(this);
	}


/**
 *  url points to the folder (without /)
 *  width and height must be defined
 */
	initGoogle() {
		if(!this.width || !this.height)
			throw "Google rasters require to specify width and height";

		this.tilesize = 256;
		this.overlap = 0;

		let max = Math.max(this.width, this.height)/this.tilesize;
		this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

		this.getTileURL = (x, y, level) => {
			var ilevel = parseInt(this.nlevels - 1 - level);
			return this.url + "/" + ilevel + "/" + y + "/" + x + '.' + this.suffix;
		};
		this.status = 'ready';
		this.emit('ready');
	}


/**
 * Expects the url to point to .dzi config file
 */
	initDeepzoom() {
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let text = await response.text();
			let xml = (new window.DOMParser()).parseFromString(text, "text/xml");

			let doc = xml.documentElement;
			this.suffix = doc.getAttribute('Format');
			this.tilesize = doc.getAttribute('TileSize');
			this.overlap = doc.getAttribute('Overlap');

			let size = doc.querySelector('Size');
			this.width = size.getAttribute('Width');
			this.height = size.getAttribute('Height');

			let max = Math.max(this.width, this.height)/this.tilesize;
			this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

			this.url = this.url.substr(0, this.url.lastIndexOf(".")) + '_files/';

			this.getTileURL = (x, y, level) => {
				let ilevel = parseInt(this.nlevels - 1 - level);
				return this.url + ilevel + '/' + x + '_' + y + '.' + this.suffix;
			}; 

			this.status = 'ready';
			this.emit('ready');

		})().catch(e => { console.log(e); this.status = e; });
	}


/**
 * Expects the url to point to ImageProperties.xml file.
 */
	initZoomify() {
		t.overlap = 0;
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let text = await response.text();

			let tmp = response.split('"');
			this.tilesize = parseInt(tmp[11]);

			let max = Math.max(t.width, t.height)/t.tilesize;
			this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

			this.url = this.url.substr(0, this.url.lastIndexOf("/"));

			t.getTileURL = (x, y, level) => {
				let ilevel = parseInt(this.nlevels - 1 - level);
				let index = this.index(level, x, y)>>>0;
				let group = index >> 8;
				return this.url + "/TileGroup" + group + "/" + ilevel + "-" + x + "-" + y + "." + this.suffix;
			};

			this.status = 'ready';
			this.emit('ready');

		})().catch(e => { console.log(e); this.status = e; });
	}
}

export { Raster }
