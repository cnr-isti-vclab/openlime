import { BoundingBox } from "./BoundingBox";

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
		Object.assign(this, {
			type: type,
			width: 0,
			height: 0,
			tilesize: 256,
			overlap: 0, 
			nlevels: 1,        //level 0 is the top, single tile level.
			suffix: 'jpg',
			qbox: [],          //array of bounding box in tiles, one for mipmap 
			bbox: [],          //array of bounding box in pixels (w, h)
			urls: [],
			signals: { ready: [], updateSize: [] },          //callbacks when the layout is ready.
			status: null,
			subdomains: 'abc'
		});
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
		(async () => {
			switch(this.type) {
				case 'image':    await this.initImage(); break; // No Url needed
				case 'google':   await this.initGoogle(); break; // No Url needed

				case 'deepzoom1px': await this.initDeepzoom(true); break; // urls[0] only needed
				case 'deepzoom': await this.initDeepzoom(false); break; // urls[0] only needed
				case 'zoomify':  await this.initZoomify(); break; // urls[0] only needed
				case 'iiif':     await this.initIIIF(); break; // urls[0] only needed

				case 'tarzoom':  await this.initTarzoom(); break; // all urls needed

				case 'itarzoom':  await this.initITarzoom(); break; // actually it has just one url
			}
			this.initBoxes();
			this.status = 'ready';
			this.emit('ready');
		})().catch(e => { console.log(e); this.status = e; });
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
 	*  Each tile is assigned an unique number.
 	*/
	/** @ignore */
	index(level, x, y) {
		let startindex = 0;
		for(let i = 0; i < level; i++)
			startindex += this.qbox[i].xHigh*this.qbox[i].yHigh;
		return startindex + y*this.qbox[level].xHigh + x;
	}

	/*
 	* Compute all the bounding boxes (this.bbox and this.qbox).
 	* @return number of tiles in the dataset
	*/
	/** @ignore */
	initBoxes() {
		/**
		* The event is fired when a layout size is modified (and the scene extension must be recomputed at canvas level).
		* @event Layout#updateSize
		*/

		this.qbox = []; //by level (0 is the bottom)
		this.bbox = [];
		var w = this.width;
		var h = this.height;

		if(this.type == 'image') {
			this.qbox[0] = new BoundingBox({xLow:0, yLow: 0, xHigh: 1, yHigh: 1});
			this.bbox[0] = new BoundingBox({xLow:0, yLow: 0, xHigh: w, yHigh: h}); 
			// Acknowledge bbox change (useful for knowing scene extension (at canvas level))
			this.emit('updateSize');
			return 1;
		}

		for(let level = this.nlevels - 1; level >= 0; level--) {
			this.qbox[level] = new BoundingBox({xLow:0, yLow: 0, xHigh: 0, yHigh: 0});
			this.bbox[level] = new BoundingBox({xLow:0, yLow: 0, xHigh: w, yHigh: h}); 

			this.qbox[level].yHigh = Math.ceil(h/this.tilesize);
			this.qbox[level].xHigh = Math.ceil(w/this.tilesize);

			// for(let y = 0; y*this.tilesize < h; y++) { // TODO replace with division
			// 	this.qbox[level].yHigh = y+1;
			// }
			// for (let x = 0; x * this.tilesize < w; x++) {
			// 	this.qbox[level].xHigh = x + 1;
			// 	//					tiles.push({level:level, x:x, y:y});
			// }

			w >>>= 1;
			h >>>= 1;
		}
		// Acknowledge bbox (useful for knowing scene extension (at canvas level))
		this.emit('updateSize');
	}

	/**
	* Returns the coordinates of the tile (in [0, 0, w h] image coordinate system) and the texture coords associated. 
 	* @returns the tile coordinates (image coords and texture coords) 
 	*/
	tileCoords(level, x, y) {
		let w = this.width;
		let h = this.height;
		//careful: here y is inverted due to textures not being flipped on load (Firefox fault!).
		var tcoords = new Float32Array([0, 1,     0, 0,     1, 0,     1, 1]);

		if(this.type == "image") {
			return { 
				coords: new Float32Array([-w/2, -h/2, 0,  -w/2, h/2, 0,  w/2, h/2, 0,  w/2, -h/2, 0]),
				tcoords: tcoords 
			};
		}

		let coords = new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]);

		let ilevel = this.nlevels - 1 - level;
		let side =  this.tilesize*(1<<(ilevel)); //tile size in imagespace
		let tx = side;
		let ty = side;

		if(side*(x+1) > this.width) {
			tx = (this.width  - side*x);
			if(this.type == 'google')
				tcoords[4] = tcoords[6] = tx/side;
		}

		if(side*(y+1) > this.height) {
			ty = (this.height - side*y);
			if(this.type == 'google')
				tcoords[1] = tcoords[7] = ty/side;
		}

		var lx  = this.qbox[level].xHigh-1; //last tile x pos, if so no overlap.
		var ly  = this.qbox[level].yHigh-1;

		var over = this.overlap;
		if(over) {
			let dtx = over / (tx/(1<<ilevel) + (x==0?0:over) + (x==lx?0:over));
			let dty = over / (ty/(1<<ilevel) + (y==0?0:over) + (y==ly?0:over));

			tcoords[0] = tcoords[2] = (x==0? 0: dtx);
			tcoords[3] = tcoords[5] = (y==0? 0: dty);
			tcoords[4] = tcoords[6] = (x==lx? 1: 1 - dtx);
			tcoords[1] = tcoords[7] = (y==ly? 1: 1 - dty);
		} 
		//flip Y coordinates 
		//TODO cleanup this mess!
		let tmp = tcoords[1];
		tcoords[1] = tcoords[7] = tcoords[3];
		tcoords[3] = tcoords[5] = tmp;

		for(let i = 0; i < coords.length; i+= 3) {
			coords[i]   =  coords[i]  *tx + side*x - this.width/2;
			coords[i+1] = -coords[i+1]*ty - side*y + this.height/2;
		}

		return { coords: coords, tcoords: tcoords }
	}


	/**
 	* Computes the tiles needed for each level, given a viewport and a transform.
 	* @param {Viewport} viewport The viewport.
	* @param {Transform} transform The current transform.
 	* @param {number} border The threshold (in tile units) around the current camera position for which to prefetch tiles.
	* @param {number} bias The mipmap bias of the texture.
 	* @returns {Object} level: the optimal level in the pyramid, pyramid: array of bounding boxes in tile units.
 	*/
	neededBox(viewport, transform, border, bias) {
		if(this.type == "image")
			return { level:0, pyramid: [new BoundingBox({ xLow:0, yLow:0, xHigh:1, yHigh:1 })] };

		//here we are computing with inverse levels; level 0 is the bottom!
		let iminlevel = Math.max(0, Math.min(Math.floor(-Math.log2(transform.z) + bias), this.nlevels-1));
		let minlevel = this.nlevels-1-iminlevel;
		//
		let bbox = transform.getInverseBox(viewport);
		//find box in image coordinates where (0, 0) is in the upper left corner.
		bbox.shift(this.width/2, this.height/2);

		let pyramid = [];
		for(let level = 0; level <= minlevel; level++) {
			let ilevel = this.nlevels -1 -level;
			let side = this.tilesize*Math.pow(2, ilevel);

			let qbox = new BoundingBox(bbox);
			qbox.quantize(side);

			//clamp!
			qbox.xLow  = Math.max(qbox.xLow  - border, this.qbox[level].xLow);
			qbox.yLow  = Math.max(qbox.yLow  - border, this.qbox[level].yLow);
			qbox.xHigh = Math.min(qbox.xHigh + border, this.qbox[level].xHigh);
			qbox.yHigh = Math.min(qbox.yHigh + border, this.qbox[level].yHigh);
			pyramid[level] = qbox;
		}
		return { level: minlevel, pyramid: pyramid };
	}

	/**
	 * Gets the URL of a specific tile. The function must be implemented for each layout type supported by OpenLIME.
	 * @param {number} id The channel id.
	 * @param {Tile} tile The tile.
	 */
	getTileURL(id, tile) {
		throw Error("Layout not defined or ready.");
	}

	/*
 	* Witdh and height can be recovered once the image is downloaded.
	*/
	/** @ignore */
	async initImage() {
		this.getTileURL = (rasterid, tile) => { return this.urls[rasterid]; }
		this.nlevels = 1;
		this.tilesize = 0;
	}

	/*
 	*  url points to the folder (without /)
	*  width and height must be defined
 	*/
	/** @ignore */
	async initGoogle() {
		if(!this.width || !this.height)
			throw "Google rasters require to specify width and height";

		this.tilesize = 256;
		this.overlap = 0;

		let max = Math.max(this.width, this.height)/this.tilesize;
		this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

		if( this.urls[0].includes('{')) {
			this.getTileURL = (rasterid, tile) => {
				let  s = this.subdomains ? this.subdomains[Math.abs(tile.x + tile.y) % this.subdomains.length] : '';
				let vars = {s, ...tile, z: tile.level};
				return this.urls[rasterid].replace(/{(.+?)}/g,(match,p)=> vars[p]);
			}
		} else
			this.getTileURL = (rasterid, tile) => {
				return this.urls[rasterid] + "/" + tile.level + "/" + tile.y + "/" + tile.x + '.' + this.suffix;
			};
	}

	/*
 	* Expects the url to point to .dzi config file
 	*/
	/** @ignore */
	async initDeepzoom(onepixel) {
		let url = this.urls[0];
		var response = await fetch(url);
		if(!response.ok) {
			this.status = "Failed loading " + url + ": " + response.statusText;
			throw new Error(this.status);
		}
		let text = await response.text();
		let xml = (new window.DOMParser()).parseFromString(text, "text/xml");

		let doc = xml.documentElement;
		this.suffix = doc.getAttribute('Format');
		this.tilesize = parseInt(doc.getAttribute('TileSize'));
		this.overlap = parseInt(doc.getAttribute('Overlap'));

		let size = doc.querySelector('Size');
		this.width = parseInt(size.getAttribute('Width'));
		this.height = parseInt(size.getAttribute('Height'));

		let max = Math.max(this.width, this.height)/this.tilesize;
		this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

		this.urls = this.urls.map(url => url.substr(0, url.lastIndexOf(".")) + '_files/');
		this.skiplevels = 0;
		if(onepixel)
			this.skiplevels = Math.ceil(Math.log(this.tilesize) / Math.LN2);

		this.getTileURL = (rasterid, tile) => {
			let url = this.urls[rasterid];
			let level = tile.level + this.skiplevels;
			return url + level + '/' + tile.x + '_' + tile.y + '.' + this.suffix;
		}; 
	}

	/** @ignore */
	async initTarzoom() {
		this.tarzoom =[];	
		for (let url of this.urls) {
			var response = await fetch(url);
			if (!response.ok) {
				this.status = "Failed loading " + url + ": " + response.statusText;
				throw new Error(this.status);
			}
			let json = await response.json();
			json.url = url.substr(0, url.lastIndexOf(".")) + '.tzb';
			Object.assign(this, json);
			this.tarzoom.push(json);
		}

		this.getTileURL = (rasterid, tile) => {
			const tar = this.tarzoom[rasterid];
			tile.start = tar.offsets[tile.index];
			tile.end = tar.offsets[tile.index+1];
			return tar.url;
		}; 
	}

	/** @ignore */
	async initITarzoom() {
		const url = this.urls[0];		
		var response = await fetch(url);
		if(!response.ok) {
			this.status = "Failed loading " + url + ": " + response.statusText;
			throw new Error(this.status);
		}
		let json = await response.json();
		Object.assign(this, json); //suffix, tilesize, overlap, width, height, levels
		this.url = url.substr(0, url.lastIndexOf(".")) + '.tzb';

		this.getTileURL = (rasterid, tile) => {
			let index = tile.index*this.stride;
			tile.start = this.offsets[index];
			tile.end = this.offsets[index+this.stride];
			tile.offsets = []
			for(let i = 0; i < this.stride+1; i++)
				tile.offsets.push(this.offsets[index + i] - tile.start);
			return this.url;
		}; 
	}

	/*
 	* Expects the url to point to ImageProperties.xml file.
 	*/
	/** @ignore */
	async initZoomify() {
		const url = this.urls[0];
		this.overlap = 0;
		var response = await fetch(url);
		if(!response.ok) {
			this.status = "Failed loading " + url + ": " + response.statusText;
			throw new Error(this.status);
		}
		let text = await response.text();
		let xml = (new window.DOMParser()).parseFromString(text, "text/xml");
		let doc = xml.documentElement;
		this.tilesize = parseInt(doc.getAttribute('TILESIZE'));
		this.width = parseInt(doc.getAttribute('WIDTH'));
		this.height = parseInt(doc.getAttribute('HEIGHT'));
		if(!this.tilesize || !this.height || !this.width)
			throw "Missing parameter files for zoomify!";

		let max = Math.max(this.width, this.height)/this.tilesize;
		this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

		this.getTileURL = (rasterid, tile) => {
			const tileUrl = this.urls[rasterid].substr(0, url.lastIndexOf("/"));
			let group = tile.index >> 8;
			return tileUrl + "/TileGroup" + group + "/" + tile.level + "-" + tile.x + "-" + tile.y + "." + this.suffix;
		};
	}

	/** @ignore */
	async initIIIF() {
		const url = this.urls[0];
		this.overlap = 0;

		var response = await fetch(url);
		if(!response.ok) {
			this.status = "Failed loading " + url + ": " + response.statusText;
			throw new Error(this.status);
		}
		let info = await response.json();
		this.width = info.width;
		this.height = info.height;
		this.nlevels = info.tiles[0].scaleFactors.length;
		this.tilesize = info.tiles[0].width;

		this.getTileURL = (rasterid, tile) => {
			const tileUrl = this.urls[rasterid].substr(0, url.lastIndexOf("/"));
			let tw = this.tilesize;
			let ilevel = parseInt(this.nlevels - 1 - tile.level);
			let s = Math.pow(2, tile.level);

			//region parameters
			let xr = tile.x * tw * s;
			let yr = tile.y * tw * s;
			let wr = Math.min(tw * s, this.width - xr)
			let hr = Math.min(tw * s, this.height - yr);

			// pixel size parameters /ws,hs/
			let ws = tw
			if (xr + tw*s > this.width)
				ws = (this.width - xr + s - 1) / s  
			let hs = tw
			if (yr + tw*s > this.height)
				hs = (this.height - yr + s - 1) / s

			return `${tileUrl}/${xr},${yr},${wr},${hr}/${ws},${hs}/0/default.jpg`;
		};
	}
}

export { Layout }
