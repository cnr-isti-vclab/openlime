import { BoundingBox } from "./BoundingBox";
import { addSignals } from "./Signals";
import { Tile } from "./Tile";
import { CoordinateSystem } from "./CoordinateSystem";

// Tile level x y  index ----- tex missing() start/end (tarzoom) ----- time, priority size(byte)

/**
 * @typedef {Object} TileObj
 * @property {number} level - Zoom level in the image pyramid
 * @property {number} x - Horizontal position in tile grid
 * @property {number} y - Vertical position in tile grid
 * @property {number} index - Unique tile identifier
 * @property {number} [start] - Starting byte position in dataset (for tar formats)
 * @property {number} [end] - Ending byte position in dataset (for tar formats)
 * @property {number} missing - Number of pending channel data requests
 * @property {WebGLTexture[]} tex - Array of textures (one per channel)
 * @property {number} time - Tile creation timestamp for cache management
 * @property {number} priority - Loading priority for cache management
 * @property {number} size - Total tile size in bytes
 */

/**
 * @typedef {'image'|'deepzoom'|'deepzoom1px'|'google'|'zoomify'|'iiif'|'tarzoom'|'itarzoom'} LayoutType
 * @description Supported image format types:
 * - image: Single-resolution web images (jpg, png, etc.)
 * - deepzoom: Microsoft Deep Zoom with root tile > 1px
 * - deepzoom1px: Microsoft Deep Zoom with 1px root tile
 * - google: Google Maps tiling scheme
 * - zoomify: Zoomify format
 * - iiif: International Image Interoperability Framework
 * - tarzoom: OpenLIME tar-based tiling
 * - itarzoom: OpenLIME indexed tar-based tiling
 */

/**
 * @typedef {Object} LayoutOptions
 * @property {number} [width] - Image width (required for google layout)
 * @property {number} [height] - Image height (required for google layout)
 * @property {string} [suffix='jpg'] - Tile file extension
 * @property {string} [subdomains='abc'] - Available subdomains for URL templates
 */

/**
 * Layout manages image formats and tiling schemes in OpenLIME.
 * 
 * This class is responsible for:
 * - Managing different image formats
 * - Handling tiling schemes
 * - Coordinating tile loading
 * - Converting between coordinate systems
 * - Managing tile priorities
 * 
 * Format Support:
 * 1. Single-resolution images:
 * - Direct URL to image file
 * - Supports all standard web formats (jpg, png, etc)
 * 
 * 2. Tiled formats:
 * - DeepZoom (Microsoft): Uses .dzi config file
 * - Google Maps: Direct directory structure
 * - Zoomify: Uses ImageProperties.xml
 * - IIIF: Standard server interface
 * - TarZoom: OpenLIME's optimized format
 * 
 * @fires Layout#ready - When layout is initialized and ready for use
 * @fires Layout#updateSize - When layout dimensions change
 * 
 * @example
 * ```javascript
 * // Single image
 * const imageLayout = new Layout('image.jpg', 'image');
 * 
 * // Deep Zoom
 * const dzLayout = new Layout('tiles.dzi', 'deepzoom');
 * 
 * // Google Maps format
 * const googleLayout = new Layout('tiles/', 'google', {
 *   width: 2000,
 *   height: 1500
 * });
 * ```
 */
class Layout {
	/**
	 * Creates a new Layout instance
	 * @param {string} url - URL to image or configuration file
	 * @param {LayoutType} type - Type of image layout
	 * @param {LayoutOptions} [options] - Additional configuration
	 * @throws {Error} If layout type is unknown or module not loaded
	 */
	constructor(url, type, options) {


		if (type == 'image') {
			this.setDefaults(type);
			this.init(url, type, options);

		} else if (type in this.types)
			return this.types[type](url, type, options);

		else if (type == null)
			return;

		else
			throw "Layout type: " + type + " unknown, or module not loaded";
	}

	/**
	 * Gets tile dimensions
	 * @returns {number[]} [width, height] of tiles
	 */
	getTileSize() {
		return [this.width, this.height];
	}

	/**
	 * Sets default layout properties
	 * @param {LayoutType} type - Layout type
	 * @private
	 */
	setDefaults(type) {
		Object.assign(this, {
			type: type,
			width: 0,
			height: 0,
			suffix: 'jpg',
			urls: [],
			status: null,
			subdomains: 'abc'
		});
	}

	/**
	 * Initializes layout configuration
	 * @param {string} url - Resource URL
	 * @param {LayoutType} type - Layout type
	 * @param {LayoutOptions} options - Configuration options
	 * @private
	 */
	init(url, type, options) {
		if (options)
			Object.assign(this, options);

		if (typeof (url) == 'string')
			this.setUrls([url]);
		if (this.width && this.height)
			this.status = 'ready';
	}

	/**
	 * Sets URLs for layout resources
	 * @param {string[]} urls - Array of resource URLs
	 * @fires Layout#ready
	 * @private
	 */
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
	 * Constructs URL for specific image plane
	 * @param {string} url - Base URL
	 * @param {string} plane - Plane identifier
	 * @returns {string} Complete URL
	 */
	imageUrl(url, plane) {
		let path = url.substring(0, url.lastIndexOf('/') + 1);
		return path + plane + '.jpg';
	}

	/**
	 * Gets URL for specific tile
	 * @param {number} id - Channel identifier
	 * @param {TileObj} tile - Tile object
	 * @returns {string} Tile URL
	 * @abstract
	 */
	getTileURL(id, tile) {
		throw Error("Layout not defined or ready.");
	}

	/**
	 * Gets layout bounds
	 * @returns {BoundingBox} Layout boundaries
	 */
	boundingBox() {
		//if(!this.width) throw "Layout not initialized still";
		return new BoundingBox({ xLow: -this.width / 2, yLow: -this.height / 2, xHigh: this.width / 2, yHigh: this.height / 2 });
	}

	/**
	 * Calculates tile coordinates
	 * @param Obj} tile - Tile to calculate coordinates for
	 * @returns {{coords: Float32Array, tcoords: Float32Array}} Image and texture coordinates
	 */
	tileCoords(tile) {
		let w = this.width;
		let h = this.height;
		//careful: here y is inverted due to textures not being flipped on load (Firefox fault!).
		var tcoords = new Float32Array([0, 1, 0, 0, 1, 0, 1, 1]);

		return {
			coords: new Float32Array([-w / 2, -h / 2, 0, -w / 2, h / 2, 0, w / 2, h / 2, 0, w / 2, -h / 2, 0]),
			tcoords: tcoords
		};
	}

	/**
	 * Creates new tile instance
	 * @param {number} index - Tile identifier
	 * @returns {TileObj} New tile object
	 * @private
	 */
	newTile(index) {
		let tile = new Tile();
		tile.index = index;
		return tile;
	}

	/**
	 * Determines required tiles for rendering
	 * @param {Object} viewport - Current viewport
	 * @param {Transform} transform - Current transform
	 * @param {Transform} layerTransform - Layer transform
	 * @param {number} border - Border size
	 * @param {number} bias - Mipmap bias
	 * @param {Map} tiles - Existing tiles
	 * @param {number} [maxtiles=8] - Maximum tiles to return
	 * @returns {TileObj[]} Array of needed tiles
	 */
	needed(viewport, transform, layerTransform, border, bias, tiles, maxtiles = 8) {
		//FIXME should check if image is withing the viewport (+ border)
		let tile = tiles.get(0) || this.newTile(0); //{ index, x, y, missing, tex: [], level };
		tile.time = performance.now();
		tile.priority = 10;

		if (tile.missing === null) // || tile.missing != 0 && !this.requested[index])
			return [tile];
		return [];
	}

	/**
	 * Gets tiles available for rendering
	 * @param {Object} viewport - Current viewport
	 * @param {Transform} transform - Current transform
	 * @param {Transform} layerTransform - Layer transform
	 * @param {number} border - Border size
	 * @param {number} bias - Mipmap bias
	 * @param {Map} tiles - Existing tiles
	 * @returns {Object.<number, Tile>} Map of available tiles
	 */
	available(viewport, transform, layerTransform, border, bias, tiles) {
		//FIXME should check if image is withing the viewport (+ border)
		let torender = {};

		if (tiles.has(0) && tiles.get(0).missing == 0)
			torender[0] = tiles.get(0); //{ index: index, level: level, x: x >> d, y: y >> d, complete: true };
		return torender;
	}

	/**
	 * Calculates viewport bounding box
	 * @param {Object} viewport - Viewport parameters
	 * @param {Transform} transform - Current transform
	 * @param {Transform} layerT - Layer transform
	 * @returns {BoundingBox} Viewport bounds in image space
	 */
	getViewportBox(viewport, transform, layerT) {
		const boxViewport = new BoundingBox({ xLow: viewport.x, yLow: viewport.y, xHigh: viewport.x + viewport.dx, yHigh: viewport.y + viewport.dy });
		return CoordinateSystem.fromViewportBoxToImageBox(boxViewport, transform, viewport, layerT, { w: this.width, h: this.height });
	}
}

Layout.prototype.types = {}

addSignals(Layout, 'ready', 'updateSize');

export { Layout }
