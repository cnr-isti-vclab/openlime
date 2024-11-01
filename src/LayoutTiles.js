import { BoundingBox } from "./BoundingBox";
import { Layout } from "./Layout";
import { Transform } from "./Transform";

// Tile level x y  index ----- tex missing() start/end (tarzoom) ----- time, priority size(byte)

/**
 * @typedef {Object} Tile
 * Represents a single element of a regular grid that subdivides an image.
 * Tiles are identified by their position (x, y) within the grid and the zoom level.
 * 
 * @property {number} level - The zoom level of the tile (0 is top/most zoomed out)
 * @property {number} x - Horizontal position of the tile in the grid at the given level
 * @property {number} y - Vertical position of the tile in the grid at the given level
 * @property {number} index - Unique identifier for the tile across all levels
 * @property {number} [start] - Starting byte position in the dataset (used for tarzoom/itarzoom formats)
 * @property {number} [end] - Ending byte position in the dataset (used for tarzoom/itarzoom formats)
 * @property {number} missing - For multi-channel formats (RTI, BRDF), tracks pending channel data requests
 * @property {WebGLTexture[]} tex - Array of WebGL textures (one per channel)
 * @property {number} time - Timestamp of tile creation (used by cache algorithms)
 * @property {number} priority - Tile priority for cache management (lower = higher priority)
 * @property {number} size - Total size of the tile in bytes (used by cache algorithms)
 */


/**
 * @typedef {'image'|'deepzoom'|'deepzoom1px'|'google'|'zoomify'|'iiif'|'iip'|'tarzoom'|'itarzoom'} Layout#Type
 * Supported image layout types including both single-resolution and multi-resolution formats.
 * - image: Standard web image formats (jpg, png, gif, etc.)
 * - deepzoom: Microsoft Deep Zoom format with root tile > 1px
 * - deepzoom1px: Microsoft Deep Zoom format with 1px root tile
 * - google: Google Maps tiling scheme
 * - zoomify: Zoomify tiling format
 * - iiif: International Image Interoperability Framework
 * - iip: Internet Imaging Protocol
 * - tarzoom: OpenLIME custom format (single TAR of DeepZoom pyramid)
 * - itarzoom: OpenLIME custom interleaved TAR format
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
 * * **iip** - The server parameter (optional) indicates the URL of the IIPImage endpoint (for example '/fcgi-bin/iipsrv.fcgi').
 * The URL parameter indicates either just the name of the path and image file (for instance 'image.tif') if the server parameter has been set or the full IIP URL if not
 * (for instance '/fcgi-bin/iipsrv.fcgi?FIF=image.tif' or 'https://you.server//fcgi-bin/iipsrv.fcgi?FIF=image.tif' if image is hosted elsewhere)
 * See: {@link https://iipimage.sourceforge.io/ IIPImage Server}
 * * **iiif** - According to the standard, the URL is the address of a IIIF server (for instance, 'https://myiiifserver.example/').
 * See: {@link https://iiif.io/api/image/3.0/ IIIF }
 * * **tarzoom** and **itarzoom** - This is a custom format of the OpenLIME framework. It can be described as the TAR of a DeepZoom (all the DeepZoom image pyramid is stored in a single file).
 * It takes advantage of the fact that current web servers are able to handle partial-content HTTP requests. Tarzoom facilitates
 * the work of the server, which is not penalised by having to manage a file system with many small files. The URL is the address of the *.tzi* file 
 * (for instance, 'https://my.example/image.tzi'). Warning: tarzoom|itarzoom may not work on older web servers.
 * 
 * @extends Layout
 * 
 * @example
 * ```javascript
 * // DeepZoom layout
 * const dzLayout = new LayoutTiles('image.dzi', 'deepzoom', {
 *   cachelevels: 8
 * });
 * 
 * // Google Maps layout
 * const googleLayout = new LayoutTiles('tiles/', 'google', {
 *   width: 4096,
 *   height: 3072,
 *   suffix: 'png'
 * });
 * 
 * // IIIF layout
 * const iiifLayout = new LayoutTiles('https://server/image', 'iiif');
 * ```
 * 
 * @fires Layout#ready - When layout initialization is complete
 * @fires Layout#updateSize - When layout dimensions change 
*/
class LayoutTiles extends Layout {
	/**
	 * Creates a new LayoutTiles instance.
	 * @param {string} url - URL to the image or tile configuration
	 * @param {Layout#Type} type - The type of image layout
	 * @param {Object} [options] - Configuration options
	 * @param {number} [options.width] - Width of original image (required for 'google' type)
	 * @param {number} [options.height] - Height of original image (required for 'google' type)
	 * @param {string} [options.suffix='jpg'] - Tile file extension
	 * @param {string} [options.subdomains='abc'] - Available subdomains for Google URL template
	 * @param {number} [options.cachelevels=10] - Number of levels above current to cache
	 * @param {string} [options.server] - IIP server URL (for IIP type only)
	 * @fires Layout#ready
	 * @fires Layout#updateSize
	 */
	constructor(url, type, options) {
		super(url, null, options);
		this.setDefaults(type);
		this.init(url, type, options);
	}

	/**
	 * Sets default values for the layout.
	 * @private
	 * @param {Layout#Type} type - The layout type
	 */
	setDefaults(type) {
		super.setDefaults(type);
		Object.assign(this, {
			tilesize: 256,
			overlap: 0,
			nlevels: 1,        //level 0 is the top, single tile level.
			qbox: [],          //array of bounding box in tiles, one for mipmap 
			bbox: [],          //array of bounding box in pixels (w, h)
			urls: [],
			cachelevels: 10,
		});
	}

	/**
	 * Configures URLs and initializes the layout based on type.
	 * @private
	 * @param {string[]} urls - Array of URLs to configure
	 * @fires Layout#ready
	 * @fires Layout#updateSize
	 */
	setUrls(urls) {
		/**
		* The event is fired when a layout is ready to be drawn(the single-resolution image is downloaded or the multi-resolution structure has been initialized).
		* @event Layout#ready
		*/
		this.urls = urls;
		(async () => {
			switch (this.type) {
				case 'google': await this.initGoogle(); break;        // No Url needed
				case 'deepzoom1px': await this.initDeepzoom(true); break;  // urls[0] only needed
				case 'deepzoom': await this.initDeepzoom(false); break; // urls[0] only needed
				case 'zoomify': await this.initZoomify(); break;       // urls[0] only needed
				case 'iiif': await this.initIIIF(); break;          // urls[0] only needed
				case 'iip': await this.initIIP(); break;           // urls[0] only needed
				case 'tarzoom': await this.initTarzoom(); break;       // all urls needed
				case 'itarzoom': await this.initITarzoom(); break;      // actually it has just one url
			}
			this.initBoxes();
			this.status = 'ready';
			this.emit('ready');
		})().catch(e => { console.log(e); this.status = e; });
	}

	/**
	 * Constructs image URL for a specific plane/channel.
	 * @private
	 * @param {string} url - Base URL
	 * @param {string} plane - Plane/channel identifier
	 * @returns {string} Constructed URL
	 * @throws {Error} For unknown layout types
	 */
	imageUrl(url, plane) {
		let path = url.substring(0, url.lastIndexOf('/') + 1);
		switch (this.type) {
			case 'image': return path + plane + '.jpg'; break;
			case 'google': return path + plane; break;
			case 'deepzoom': return path + plane + '.dzi'; break;
			case 'tarzoom': return path + plane + '.tzi'; break;
			case 'itarzoom': return path + 'planes.tzi'; break;
			case 'zoomify': return path + plane + '/ImageProperties.xml'; break;
			case 'iip': return url + "&SDS=" + plane.substring(plane.lastIndexOf('_') + 1, plane.length); break;
			case 'iiif': throw Error("Unimplemented");
			default: throw Error("Unknown layout: " + this.type);
		}
	}

	/**
	 * Gets the tile size for the layout.
	 * @returns {number[]} Array containing [width, height] of tiles
	 */
	getTileSize() {
		return [this.tilesize, this.tilesize];
	}

	/**
	 * Generates unique index for a tile based on its position and level.
	 * @param {number} level - Zoom level
	 * @param {number} x - X coordinate
	 * @param {number} y - Y coordinate
	 * @returns {number} Unique tile index
	 */
	index(level, x, y) {
		let startindex = 0;
		for (let i = 0; i < level; i++)
			startindex += this.qbox[i].xHigh * this.qbox[i].yHigh;
		return startindex + y * this.qbox[level].xHigh + x;
	}

	/**
	 * Converts tile index back to level, x, y coordinates.
	 * @param {number} index - Tile index
	 * @returns {Object} Position object containing level, x, y
	 */
	reverseIndex(index) {
		let originalindex = index;
		let level = 0;
		for (let i = 0; i < this.qbox.length; i++) {
			let size = this.qbox[i].xHigh * this.qbox[i].yHigh;
			if (index - size < 0)
				break;
			index -= size;
			level++;
		}
		let width = this.qbox[level].xHigh;
		let y = Math.floor(index / width)
		let x = index % width;
		console.assert(this.index(level, x, y) == originalindex);
		return { level, x, y };
	}

	/**
	 * Initializes bounding boxes for all pyramid levels.
	 * @private
	 * @fires Layout#updateSize
	 * @returns {number} Total number of tiles
	 */
	initBoxes() {
		/**
		* The event is fired when a layout size is modified (and the scene extension must be recomputed at canvas level).
		* @event Layout#updateSize
		*/

		this.qbox = []; //by level (0 is the bottom)
		this.bbox = [];
		var w = this.width;
		var h = this.height;

		if (this.type == 'image') {
			this.qbox[0] = new BoundingBox({ xLow: 0, yLow: 0, xHigh: 1, yHigh: 1 });
			this.bbox[0] = new BoundingBox({ xLow: 0, yLow: 0, xHigh: w, yHigh: h });
			// Acknowledge bbox change (useful for knowing scene extension (at canvas level))
			this.emit('updateSize');
			return 1;
		}

		for (let level = this.nlevels - 1; level >= 0; level--) {
			this.qbox[level] = new BoundingBox({ xLow: 0, yLow: 0, xHigh: 0, yHigh: 0 });
			this.bbox[level] = new BoundingBox({ xLow: 0, yLow: 0, xHigh: w, yHigh: h });

			this.qbox[level].yHigh = Math.ceil(h / this.tilesize);
			this.qbox[level].xHigh = Math.ceil(w / this.tilesize);

			w >>>= 1;
			h >>>= 1;
		}
		// Acknowledge bbox (useful for knowing scene extension (at canvas level))
		this.emit('updateSize');
	}

	/**
	 * Gets coordinates for a tile in both image space and texture space.
	 * @param {Tile} tile - The tile to get coordinates for
	 * @returns {Object} Coordinate data
	 * @returns {Float32Array} .coords - Image space coordinates [x,y,z, x,y,z, x,y,z, x,y,z]
	 * @returns {Float32Array} .tcoords - Texture coordinates [u,v, u,v, u,v, u,v]
	 */
	tileCoords(tile) {
		let { level, x, y } = tile;
		let w = this.width;
		let h = this.height;
		//careful: here y is inverted due to textures not being flipped on load (Firefox fault!).
		var tcoords = new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]);
		let coords = new Float32Array([0, 0, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0]); // FIXME 32 bit and errors

		let ilevel = this.nlevels - 1 - level;
		let side = this.tilesize * (1 << (ilevel)); //tile size in imagespace
		let tx = side;
		let ty = side;

		if (side * (x + 1) > this.width) {
			tx = (this.width - side * x);
			if (this.type == 'google')
				tcoords[4] = tcoords[6] = tx / side;
		}

		if (side * (y + 1) > this.height) {
			ty = (this.height - side * y);
			if (this.type == 'google')
				tcoords[1] = tcoords[7] = ty / side;
		}

		var lx = this.qbox[level].xHigh - 1; //last tile x pos, if so no overlap.
		var ly = this.qbox[level].yHigh - 1;

		var over = this.overlap;
		if (over) {
			let dtx = over / (tx / (1 << ilevel) + (x == 0 ? 0 : over) + (x == lx ? 0 : over));
			let dty = over / (ty / (1 << ilevel) + (y == 0 ? 0 : over) + (y == ly ? 0 : over));

			tcoords[0] = tcoords[2] = (x == 0 ? 0 : dtx);
			tcoords[3] = tcoords[5] = (y == 0 ? 0 : dty);
			tcoords[4] = tcoords[6] = (x == lx ? 1 : 1 - dtx);
			tcoords[1] = tcoords[7] = (y == ly ? 1 : 1 - dty);
		}
		//flip Y coordinates 
		//TODO cleanup this mess!
		let tmp = tcoords[1];
		tcoords[1] = tcoords[7] = tcoords[3];
		tcoords[3] = tcoords[5] = tmp;

		for (let i = 0; i < coords.length; i += 3) {
			coords[i] = coords[i] * tx + side * x - this.width / 2;
			coords[i + 1] = -coords[i + 1] * ty - side * y + this.height / 2;
		}

		return { coords: coords, tcoords: tcoords }
	}

	/**
	 * Creates a new tile instance with computed properties.
	 * @param {number} index - Unique tile identifier
	 * @returns {Tile} New tile instance
	 */
	newTile(index) {
		let tile = super.newTile(index)
		tile.index = index;
		Object.assign(tile, this.reverseIndex(index));
		return tile;
	}

	/**
	 * Determines which tiles are needed for the current view.
	 * @param {Viewport} viewport - Current viewport
	 * @param {Transform} transform - Current transform
	 * @param {Transform} layerTransform - Layer-specific transform
	 * @param {number} border - Border size in tile units for prefetching
	 * @param {number} bias - Resolution bias (0-1, affects mipmap level selection)
	 * @param {Map<number,Tile>} tiles - Currently available tiles
	 * @param {number} [maxtiles=8] - Maximum number of tiles to return
	 * @returns {Tile[]} Array of needed tiles sorted by priority
	 */
	needed(viewport, transform, layerTransform, border, bias, tiles, maxtiles = 8) {
		let neededBox = this.neededBox(viewport, transform, layerTransform, 0, bias);

		//if (this.previouslyNeeded && this.sameNeeded(this.previouslyNeeded, neededBox))
		//		return;
		//this.previouslyNeeded = neededBox;

		let needed = [];
		let now = performance.now();
		//look for needed nodes and prefetched nodes (on the pos destination
		//let missing = this.shader.samplers.length;

		for (let level = 0; level <= neededBox.level; level++) {
			let box = neededBox.pyramid[level];
			let tmp = [];
			for (let y = box.yLow; y < box.yHigh; y++) {
				for (let x = box.xLow; x < box.xHigh; x++) {
					let index = this.index(level, x, y);
					let tile = tiles.get(index) || this.newTile(index); //{ index, x, y, missing, tex: [], level };
					tile.time = now;
					tile.priority = neededBox.level - level;
					if (tile.priority > this.cachelevels) continue;
					if (tile.missing === null) // || tile.missing != 0 && !this.requested[index])
						tmp.push(tile);
				}
			}
			let c = box.center();
			//sort tiles by distance to the center TODO: check it's correct!
			tmp.sort(function (a, b) { return Math.abs(a.x - c.x) + Math.abs(a.y - c.y) - Math.abs(b.x - c.x) - Math.abs(b.y - c.y); });
			needed = needed.concat(tmp);
		}
		return needed;
	}

	/**
	 * Gets tiles currently available for rendering.
	 * @param {Viewport} viewport - Current viewport
	 * @param {Transform} transform - Current transform
	 * @param {Transform} layerTransform - Layer-specific transform
	 * @param {number} border - Border size in tile units
	 * @param {number} bias - Resolution bias
	 * @param {Map<number,Tile>} tiles - Available tiles
	 * @returns {Object.<number,Tile>} Map of tile index to tile object with additional 'complete' property
	 */
	available(viewport, transform, layerTransform, border, bias, tiles) {
		let needed = this.neededBox(viewport, transform, layerTransform, 0, bias);
		let torender = {}; //array of minlevel, actual level, x, y (referred to minlevel)
		let brothers = {};

		let minlevel = needed.level;
		let box = needed.pyramid[minlevel];

		for (let y = box.yLow; y < box.yHigh; y++) {
			for (let x = box.xLow; x < box.xHigh; x++) {
				let level = minlevel;
				while (level >= 0) {
					let d = minlevel - level;
					let index = this.index(level, x >> d, y >> d);
					if (tiles.has(index) && tiles.get(index).missing == 0) {
						torender[index] = tiles.get(index); //{ index: index, level: level, x: x >> d, y: y >> d, complete: true };
						break;
					} else {
						let sx = (x >> (d + 1)) << 1;
						let sy = (y >> (d + 1)) << 1;
						brothers[this.index(level, sx, sy)] = 1;
						brothers[this.index(level, sx + 1, sy)] = 1;
						brothers[this.index(level, sx + 1, sy + 1)] = 1;
						brothers[this.index(level, sx, sy + 1)] = 1;
					}
					level--;
				}
			}
		}
		for (let index in brothers) {
			if (index in torender)
				torender[index].complete = false;
		}
		return torender;
	}

	/**
	 * Computes required tiles at each pyramid level for the current view.
	 * @param {Viewport} viewport - Current viewport
	 * @param {Transform} transform - Current transform
	 * @param {Transform} layerTransform - Layer-specific transform
	 * @param {number} border - Border size in tile units for prefetching
	 * @param {number} bias - Resolution bias (0-1)
	 * @returns {Object} Tile requirements
	 * @returns {number} .level - Optimal pyramid level
	 * @returns {BoundingBox[]} .pyramid - Array of tile bounding boxes per level
	 */
	neededBox(viewport, transform, layerTransform, border, bias) {
		if (this.type == "image")
			return { level: 0, pyramid: [new BoundingBox({ xLow: 0, yLow: 0, xHigh: 1, yHigh: 1 })] };

		//here we are computing with inverse levels; level 0 is the bottom!
		let iminlevel = Math.max(0, Math.min(Math.floor(-Math.log2(transform.z) + bias), this.nlevels - 1));
		let minlevel = this.nlevels - 1 - iminlevel;

		const bbox = this.getViewportBox(viewport, transform, layerTransform);

		let pyramid = [];
		for (let level = 0; level <= minlevel; level++) {
			let ilevel = this.nlevels - 1 - level;
			let side = this.tilesize * Math.pow(2, ilevel);

			let qbox = new BoundingBox(bbox);
			qbox.quantize(side);

			//clamp!
			qbox.xLow = Math.max(qbox.xLow - border, this.qbox[level].xLow);
			qbox.yLow = Math.max(qbox.yLow - border, this.qbox[level].yLow);
			qbox.xHigh = Math.min(qbox.xHigh + border, this.qbox[level].xHigh);
			qbox.yHigh = Math.min(qbox.yHigh + border, this.qbox[level].yHigh);
			pyramid[level] = qbox;
		}
		return { level: minlevel, pyramid: pyramid };
	}

	/**
	 * Gets URL for a specific tile.
	 * @param {number} id - Channel/raster ID
	 * @param {Tile} tile - Tile to get URL for
	 * @returns {string} URL to fetch tile data
	 * @throws {Error} If layout not defined or ready
	 */
	getTileURL(id, tile) {
		throw Error("Layout not defined or ready.");
	}

	/**
	 * Initializes single-image layout.
	 * @private
	 * @async
	 */
	async initImage() {
		this.getTileURL = (rasterid, tile) => { return this.urls[rasterid]; }
		this.nlevels = 1;
		this.tilesize = 0;
	}

	/**
	 * Initializes Google Maps layout.
	 * @private
	 * @async
	 * @throws {Error} If width or height not specified
	 */
	async initGoogle() {
		if (!this.width || !this.height)
			throw "Google rasters require to specify width and height";

		this.tilesize = 256;
		this.overlap = 0;

		let max = Math.max(this.width, this.height) / this.tilesize;
		this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

		if (this.urls[0].includes('{')) {
			this.getTileURL = (rasterid, tile) => {
				let s = this.subdomains ? this.subdomains[Math.abs(tile.x + tile.y) % this.subdomains.length] : '';
				let vars = { s, ...tile, z: tile.level };
				return this.urls[rasterid].replace(/{(.+?)}/g, (match, p) => vars[p]);
			}
		} else
			this.getTileURL = (rasterid, tile) => {
				return this.urls[rasterid] + "/" + tile.level + "/" + tile.y + "/" + tile.x + '.' + this.suffix;
			};
	}

	/**
	 * Initializes DeepZoom layout.
	 * @private
	 * @async
	 * @param {boolean} onepixel - Whether using 1px root tile variant
	 * @throws {Error} If unable to fetch or parse DZI file
	 */
	async initDeepzoom(onepixel) {
		let url = this.urls.filter(u => u)[0];
		var response = await fetch(url);
		if (!response.ok) {
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

		let max = Math.max(this.width, this.height) / this.tilesize;
		this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

		this.urls = this.urls.map(url => url ? url.substr(0, url.lastIndexOf(".")) + '_files/' : null);
		this.skiplevels = 0;
		if (onepixel)
			this.skiplevels = Math.ceil(Math.log(this.tilesize) / Math.LN2);

		this.getTileURL = (rasterid, tile) => {
			let url = this.urls[rasterid];
			let level = tile.level + this.skiplevels;
			return url + level + '/' + tile.x + '_' + tile.y + '.' + this.suffix;
		};
	}

	/**
	 * Initializes Tarzoom layout.
	 * @private
	 * @async
	 * @throws {Error} If unable to fetch or parse TZI file
	 */
	async initTarzoom() {
		this.tarzoom = [];
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
			tile.end = tar.offsets[tile.index + 1];
			return tar.url;
		};
	}

	/**
	 * Initializes Tarzoom layout.
	 * @private
	 * @async
	 * @throws {Error} If unable to fetch or parse TZI file
	 */
	async initITarzoom() {
		const url = this.urls[0];
		var response = await fetch(url);
		if (!response.ok) {
			this.status = "Failed loading " + url + ": " + response.statusText;
			throw new Error(this.status);
		}
		let json = await response.json();
		Object.assign(this, json); //suffix, tilesize, overlap, width, height, levels
		this.url = url.substr(0, url.lastIndexOf(".")) + '.tzb';

		this.getTileURL = (rasterid, tile) => {
			let index = tile.index * this.stride;
			tile.start = this.offsets[index];
			tile.end = this.offsets[index + this.stride];
			tile.offsets = []
			for (let i = 0; i < this.stride + 1; i++)
				tile.offsets.push(this.offsets[index + i] - tile.start);
			return this.url;
		};
	}

	/**
	 * Initializes Zoomify layout.
	 * @private
	 * @async
	 * @throws {Error} If unable to fetch or parse ImageProperties.xml
	 */
	async initZoomify() {
		const url = this.urls[0];
		this.overlap = 0;
		var response = await fetch(url);
		if (!response.ok) {
			this.status = "Failed loading " + url + ": " + response.statusText;
			throw new Error(this.status);
		}
		let text = await response.text();
		let xml = (new window.DOMParser()).parseFromString(text, "text/xml");
		let doc = xml.documentElement;
		this.tilesize = parseInt(doc.getAttribute('TILESIZE'));
		this.width = parseInt(doc.getAttribute('WIDTH'));
		this.height = parseInt(doc.getAttribute('HEIGHT'));
		if (!this.tilesize || !this.height || !this.width)
			throw "Missing parameter files for zoomify!";

		let max = Math.max(this.width, this.height) / this.tilesize;
		this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

		this.getTileURL = (rasterid, tile) => {
			const tileUrl = this.urls[rasterid].substr(0, url.lastIndexOf("/"));
			let group = tile.index >> 8;
			return tileUrl + "/TileGroup" + group + "/" + tile.level + "-" + tile.x + "-" + tile.y + "." + this.suffix;
		};
	}

	/**
	 * Initializes IIIF layout.
	 * @private
	 * @async
	 * @throws {Error} If unable to fetch or parse info.json
	 */
	async initIIIF() {
		const url = this.urls[0];
		this.overlap = 0;

		var response = await fetch(url);
		if (!response.ok) {
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
			if (xr + tw * s > this.width)
				ws = (this.width - xr + s - 1) / s
			let hs = tw
			if (yr + tw * s > this.height)
				hs = (this.height - yr + s - 1) / s

			return `${tileUrl}/${xr},${yr},${wr},${hr}/${ws},${hs}/0/default.jpg`;
		};
	}

	/**
	 * Initializes IIP layout.
	 * @private
	 * @async
	 * @throws {Error} If unable to fetch or parse server response
	 */
	async initIIP() {

		const server = this.server ? (this.server + '?FIF=') : '';
		const url = server + this.urls[0] + "&obj=Max-size&obj=Tile-size&obj=Resolution-number";

		let response = await fetch(url);
		if (!response.ok) {
			this.status = "Failed loading " + url + ": " + response.statusText;
			throw new Error(this.status);
		}
		let info = await response.text();

		let tmp = info.split("Tile-size:");
		if (!tmp[1]) return null;
		this.tilesize = parseInt(tmp[1].split(" ")[0]);
		tmp = info.split("Max-size:");
		if (!tmp[1]) return null;
		tmp = tmp[1].split('\n')[0].split(' ');
		this.width = parseInt(tmp[0]);
		this.height = parseInt(tmp[1]);
		this.nlevels = parseInt(info.split("Resolution-number:")[1]);

		this.getTileURL = (rasterid, tile) => {

			// Tile index for this resolution
			let index = tile.y * this.qbox[tile.level].xHigh + tile.x;

			// Handle different formats if requested or indicated in the info.json
			let command = "JTL"; // Default
			if (this.suffix == "webp") command = "WTL";
			else if (this.suffix == "png") command = "PTL";

			let url = (this.server ? this.server + '?FIF=' : '') + this.urls[rasterid] + "&" + command + "=" + tile.level + "," + index;
			return url;
		};
	}
}

/**
 * @event Layout#ready
 * Fired when the layout is ready for rendering.
 * This occurs when:
 * - Single-resolution image is fully downloaded
 * - Multi-resolution structure is initialized and validated
 * - Tile pyramid information is computed
 */

/**
 * @event Layout#updateSize
 * Fired when the layout size changes and scene extension needs updating.
 * This occurs when:
 * - Image dimensions are determined
 * - Pyramid levels are initialized
 * - Bounding boxes are computed
 */

/**
 * Factory function to create LayoutTiles instances.
 * @private
 * @param {string} url - URL to image resource
 * @param {Layout#Type} type - Layout type
 * @param {Object} [options] - Configuration options
 * @returns {LayoutTiles} New LayoutTiles instance
 */
const factory = (url, type, options) => {
	return new LayoutTiles(url, type, options);
};

// Register supported layout types
for (let type of ['google', 'deepzoom1px', 'deepzoom', 'zoomify', 'iiif', 'iip', 'tarzoom', 'itarzoom'])
	Layout.prototype.types[type] = factory;

export { LayoutTiles }
