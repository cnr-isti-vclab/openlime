import { BoundingBox } from "./BoundingBox";
import { Tile } from "./Tile";

// Tile level x y  index ----- tex missing() start/end (tarzoom) ----- time, priority size(byte)

/**
 * A tile represents a single element of a regular grid that subdivides an image.
 * A tile is identified by its position (`x`, `y`) within the grid and the zoom `level` of the image.
 * @typedef {Object} Tile
 * @property {number} level The zoom level of the tile.
 * @property {number} x x position of the tile in the grid.
 * @property {number} y y position of the tile in the grid.
 * @property {number} index Unique tile identifier.
 * @property {number} start The position of the first byte of the tile in the image dataset (used only for tarzoom and itarzoom image formats).
 * @property {number} end The position of the last byte of the tile in the image dataset (used only for tarzoom and itarzoom image formats).
 * @property {number} missing In the case of multi-channel formats (RTI, BRDF), the information content of a tile is distributed over several planes (channels). 
 * `missing` represents the number of pending channel data requests.
 * @property {Array} tex A array of WebGLTexture (one texture per channel).
 * @property {time} time Tile creation time (this value is used internally by the cache algorithms).
 * @property {number} priority The priority of the tile (this value is used internally by the cache algorithms).
 * @property {number} size The total size of the tile in bytes (this value is used internally by the cache algorithms).
 */

/**
* The type of the image. All web single-resolution image types (*jpg*, *png*, *gif*, etc...) are supported
* as well as the most common multi-resolution image formats (*deepzoom*, *zoomify*, *IIIF*, *google maps*).
* @typedef {('image'|'deepzoom'|'deepzoom1px'|'google'|'zoomify'|'iiif'|'tarzoom'|'itarzoom')} Layout#Type
*/

/**
 * The Layout class is responsible for specifying the data formats (images) managed by OpenLIME.
 * All web single-resolution image types (*jpg*, *png*, *gif*, etc...) are supported as well as the most common 
 * tiled image formats (*deepzoom*, *zoomify*, *IIIF*, *google maps*), which are suitable for large images.
 * #### Single-resolution images
 * The URL is the address of the file (for instance, 'https://my.example/image.jpg').
 * #### Tiled images
 * They can be specified in a variety of ways depending on the format chosen.
 * * **deepzoom** - The root tile of the image pyramid has a size > 1px (typical value is 254px). It is defined by the URL of the *.dzi* file 
 * (for instance, 'https://my.example/image.dzi'). See: {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN DeepZoom}
 * * **deepzoom1px** - The root tile of the image pyramid has a size = 1px. It is defined by the URL of the *.dzi* file 
 * (for instance, 'https://my.example/image.dzi'). See: {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN DeepZoom}
 * * **google** - The URL points directly to the directory containing the pyramid of images (for instance, 'https://my.example/image'). 
 * The standard does not require any configuration file, so it is mandatory to indicate in the `options` the 
 * width and height in pixels of the original image. See: {@link https://www.microimages.com/documentation/TechGuides/78googleMapsStruc.pdf Google Maps}
 * * **zoomify** - The URL indicates the location of Zoomify configuration file (for instance, 'https://my.example/image/ImageProperties.xml').
 * See: {@link http://www.zoomify.com/ZIFFileFormatSpecification.htm Zoomify}
 * * **iiif** - According to the standard, the URL is the address of a IIIF server (for instance, 'https://myiiifserver.example/').
 * See: {@link https://iipimage.sourceforge.io/ IIP Server}, {@link https://iiif.io/api/image/3.0/ IIIF }
 * * **tarzoom** and **itarzoom** - This is a custom format of the OpenLIME framework. It can be described as the TAR of a DeepZoom (all the DeepZoom image pyramid is stored in a single file).
 * It takes advantage of the fact that current web servers are able to handle partial-content HTTP requests. Tarzoom facilitates
 * the work of the server, which is not penalised by having to manage a file system with many small files. The URL is the address of the *.tzi* file 
 * (for instance, 'https://my.example/image.tzi'). Warning: tarzoom|itarzoom may not work on older web servers.
 */
class Layout {
	/**
	* Creates a Layout, a container for a raster image.
    * A layout is defined by a `url` of the image and a `type`.
    * Additionally, an object literal with Layout `options` can be specified.
    * Signals are triggered when the layout is ready to be drawn or its size is modified.
	* @param {string} url URL of the image.
 	* @param {Layout#Type} type The type of the image.
 	* @param {Object} [options] An object literal describing the layout content.
 	* @param {number} options.width The total width of the original, unsplit image. This parameter must only be specified for the 'google' layout type. 
 	* @param {number} options.height The total height of the original, unsplit image. This parameter must only be specified for the 'google' layout type.
 	* @param {string} options.suffix='jpg' The filename suffix of the tiles.
 	* @param {string} options.subdomains='abc' The ('a'|'b'|'c') *s* subdomain of a Google template URL (for instance: 'https:{s}.my.example//{z}/{x}/{y}.png').
	*/
	constructor(url, type, options) {

		
		if (type == 'image') {
			this.init(url, type, options);
			this.setDefaults(type);
		} else if(type in this.types)
			return this.types[type](url, type, options);
		else if(type == null)
			return;
		else
			throw "Layout type: " + type + " unknown, or module not loaded";
	}

	setDefaults(type) {
		Object.assign(this, {
			type: type,
			width: 0,
			height: 0,
			suffix: 'jpg',
			urls: [],
			signals: { ready: [], updateSize: [] },          //callbacks when the layout is ready.
			status: null,
			subdomains: 'abc'
		});
	}

	init(url, type, options) {
		if(options)
			Object.assign(this, options);

		if(typeof(url) == 'string')
			this.setUrls([url]);
	}

	/** @ignore */
	setUrls(urls) {
		/**
		* The event is fired when a layout is ready to be drawn(the single-resolution image is downloaded or the multi-resolution structure has been initialized).
		* @event Layout#ready
		*/
		this.urls = urls;
		this.getTileURL = (rasterid, tile) => { return this.urls[rasterid]; }
		this.status = 'ready';
		this.emit('ready');
	}

		/**
	 * Gets the URL of a specific tile. The function must be implemented for each layout type supported by OpenLIME.
	 * @param {number} id The channel id.
	 * @param {Tile} tile The tile.
	 */
	 getTileURL(id, tile) {
		throw Error("Layout not defined or ready.");
	}
	

	/** @ignore */
	addEvent(event, callback) {
		this.signals[event].push(callback);
	}

	/** @ignore */
	emit(event) {
		for(let r of this.signals[event])
			r(this);
	}

	/**
	 * Gets the layout bounding box.
	 * @returns {BoundingBox} The layout bounding box.
	 */
	boundingBox() {
		if(!this.width) throw "Layout not initialized still";
		return new BoundingBox({xLow:-this.width/2, yLow: -this.height/2, xHigh: this.width/2, yHigh: this.height/2});
	}

	/**
	* Returns the coordinates of the tile (in [0, 0, w h] image coordinate system) and the texture coords associated. 
 	* @returns the tile coordinates (image coords and texture coords) 
 	*/
	tileCoords(tile) {
		let w = this.width;
		let h = this.height;
		//careful: here y is inverted due to textures not being flipped on load (Firefox fault!).
		var tcoords = new Float32Array([0, 1,     0, 0,     1, 0,     1, 1]);

		return { 
			coords: new Float32Array([-w/2, -h/2, 0,  -w/2, h/2, 0,  w/2, h/2, 0,  w/2, -h/2, 0]),
			tcoords: tcoords 
		};
	}

	newTile(index) {
		let tile = new Tile();
		tile.index = index;
		return tile;
	}

	/** returns the list of tiles required for a rendering, sorted by priority, max */
	needed(viewport, transform, border, bias, tiles, maxtiles = 8) {
		//FIXME should check if image is withing the viewport (+ border)
		let tile = tiles.get(0) || this.newTile(0); //{ index, x, y, missing, tex: [], level };
		tile.time = performance.now();
		tile.priority = 10;

		if (tile.missing === null) // || tile.missing != 0 && !this.requested[index])
			return [tile];
		return [];
	}

	/** returns the list of tiles available for a rendering */
	available(viewport, transform, border, bias, tiles) {
		//FIXME should check if image is withing the viewport (+ border)
		let torender = {};

		if (tiles.has(0) && tiles.get(0).missing == 0) 
			torender[0] = tiles.get(0); //{ index: index, level: level, x: x >> d, y: y >> d, complete: true };
		return torender;
	}
}

Layout.prototype.types = {}

export { Layout }
