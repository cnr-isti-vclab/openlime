import { Layout } from './Layout.js';
import { BoundingBox } from './BoundingBox.js';
import { Tile } from './Tile.js';
import { Annotation } from './Annotation.js';
/**
 * @fileoverview
 * LayoutTileImages module provides management for collections of image tiles with associated regions.
 * This layout type is specialized for handling multiple independent image tiles, each with their own
 * position and dimensions, rather than a regular grid of tiles like LayoutTiles.
 */

/**
 * @typedef {Object} TileDescriptor
 * Properties expected in tile descriptors:
 * @property {boolean} visible - Whether the tile should be rendered
 * @property {Object} region - Position and dimensions of the tile
 * @property {number} region.x - X coordinate of tile's top-left corner
 * @property {number} region.y - Y coordinate of tile's top-left corner
 * @property {number} region.w - Width of the tile
 * @property {number} region.h - Height of the tile
 * @property {string} image - URL or path to the tile's image
 * @property {number} [publish] - Publication status (1 = published)
 */

/**
 * LayoutTileImages class manages collections of image tiles with associated regions.
 * Each tile represents an independent image with its own position and dimensions in the layout space.
 * Tiles can be individually shown or hidden and are loaded from annotation files or external descriptors.
 * @extends Layout
 */
class LayoutTileImages extends Layout {
	/**
	 * Creates a new LayoutTileImages instance.
	 * @param {string|null} url - URL to the annotation file containing tile descriptors, or null if descriptors will be set later
	 * @param {string} type - The layout type (should be 'tile_images')
	 * @param {Object} [options] - Configuration options inherited from Layout
	 */
	constructor(url, type, options) {
		super(url, null, options);
		this.setDefaults(type);
		this.init(url, type, options);

		// Contain array of records with at least visible,region,image (url of the image). 
		// Can be also a pointer to annotation array set from outside with setTileDescriptors()
		this.tileDescriptors = [];
		this.box = new BoundingBox();

		if (url != null) {
			// Read data from annotation file
			this.loadDescriptors(url);
		}
	}

	/**
	 * Gets the tile size. For this layout, tiles don't have a fixed size.
	 * @returns {number[]} Returns [0, 0] as tiles have variable sizes
	 */
	getTileSize() {
		return [0, 0];
	}

	/**
	 * Loads tile descriptors from an annotation file.
	 * @private
	 * @async
	 * @param {string} url - URL of the annotation file
	 * @fires Layout#ready - When descriptors are loaded and processed
	 * @fires Layout#updateSize - When bounding box is computed
	 */
	async loadDescriptors(url) {
		// Load tile descriptors from annotation file
		let response = await fetch(url);
		if (!response.ok) {
			this.status = "Failed loading " + url + ": " + response.statusText;
			return;
		}
		this.tileDescriptors = await response.json();
		if (this.tileDescriptors.status == 'error') {
			alert("Failed to load annotations: " + this.tileDescriptors.msg);
			return;
		}
		//this.annotations = this.annotations.map(a => '@context' in a ? Annotation.fromJsonLd(a): a);
		this.tileDescriptors = this.tileDescriptors.map(a => new Annotation(a));
		for (let a of this.tileDescriptors) {
			if (a.publish != 1)
				a.visible = false;
		}
		this.computeBoundingBox();
		this.emit('updateSize');

		if (this.path == null) {
			this.setPathFromUrl(url);
		}

		this.status = 'ready';
		this.emit('ready');
	}

	/**
	 * Computes the bounding box containing all tile regions.
	 * @private
	 * Updates the layout's box property to encompass all tile regions.
	 */
	computeBoundingBox() {
		this.box = new BoundingBox();
		for (let a of this.tileDescriptors) {
			let r = a.region;
			let b = new BoundingBox({ xLow: r.x, yLow: r.y, xHigh: r.x + r.w, yHigh: r.y + r.h });
			this.box.mergeBox(b);
		}
	}

	/**
	 * Gets the layout's bounding box.
	 * @returns {BoundingBox} The bounding box containing all tile regions
	 */
	boundingBox() {
		return this.box;
	}

	/**
	 * Sets the base path for tile URLs based on the annotation file location.
	 * @private
	 * @param {string} url - URL of the annotation file
	 */
	setPathFromUrl(url) {
		// Assume annotations in dir of annotation.json + /annot/
		const myArray = url.split("/");
		const N = myArray.length;
		this.path = "";
		for (let i = 0; i < N - 1; ++i) {
			this.path += myArray[i] + "/";
		}
		this.getTileURL = (id, tile) => {
			const url = this.path + '/' + this.tileDescriptors[tile.index].image;
			return url;
		}
		//this.path += "/annot/";
	}

	/**
	 * Sets tile descriptors programmatically instead of loading from a file.
	 * @param {Annotation[]} tileDescriptors - Array of tile descriptors
	 * @fires Layout#ready
	 */
	setTileDescriptors(tileDescriptors) {
		this.tileDescriptors = tileDescriptors;

		this.status = 'ready';
		this.emit('ready');
	}

	/**
	 * Gets the URL for a specific tile.
	 * @param {number} id - Channel/raster ID
	 * @param {Tile} tile - Tile object
	 * @returns {string} URL to fetch tile image
	 */
	getTileURL(id, tile) {
		const url = this.path + '/' + this.tileDescriptors[id].image;
		return url;
	}

	/**
	 * Sets visibility for a specific tile.
	 * @param {number} index - Index of the tile
	 * @param {boolean} visible - Visibility state to set
	 */
	setTileVisible(index, visible) {
		this.tileDescriptors[index].visible = visible;
	}

	/**
	 * Sets visibility for all tiles.
	 * @param {boolean} visible - Visibility state to set for all tiles
	 */
	setAllTilesVisible(visible) {
		const N = this.tileCount();

		for (let i = 0; i < N; ++i) {
			this.tileDescriptors[i].visible = visible;
		}
	}

	/**
	 * Maps tile coordinates to a linear index.
	 * In this layout, x directly maps to the index as tiles are stored in a flat list.
	 * @param {number} level - Zoom level (unused in this layout)
	 * @param {number} x - X coordinate (used as index)
	 * @param {number} y - Y coordinate (unused in this layout)
	 * @returns {number} Linear index of the tile
	 */
	index(level, x, y) {
		// Map x to index (flat list)
		return x;
	}

	/**
	 * Gets coordinates for a tile in both image space and texture space.
	 * @param {Tile} tile - The tile to get coordinates for
	 * @returns {Object} Coordinate data
	 * @returns {Float32Array} .coords - Image space coordinates [x,y,z, x,y,z, x,y,z, x,y,z]
	 * @returns {Float32Array} .tcoords - Texture coordinates [u,v, u,v, u,v, u,v]
	 */
	tileCoords(tile) {
		const r = this.tileDescriptors[tile.index].region;
		const x0 = r.x;
		const y0 = r.y
		const x1 = x0 + r.w;
		const y1 = y0 + r.h;

		return {
			coords: new Float32Array([x0, y0, 0, x0, y1, 0, x1, y1, 0, x1, y0, 0]),

			//careful: here y is inverted due to textures not being flipped on load (Firefox fault!).
			tcoords: new Float32Array([0, 1, 0, 0, 1, 0, 1, 1])
		};
	}

	/**
	 * Determines which tiles are needed for the current view.
	 * @param {Viewport} viewport - Current viewport
	 * @param {Transform} transform - Current transform
	 * @param {Transform} layerTransform - Layer-specific transform
	 * @param {number} border - Border size in viewport units
	 * @param {number} bias - Resolution bias (unused in this layout)
	 * @param {Map<number,Tile>} tiles - Currently available tiles
	 * @param {number} [maxtiles=8] - Maximum number of tiles to return
	 * @returns {Tile[]} Array of needed tiles sorted by distance to viewport center
	 */
	needed(viewport, transform, layerTransform, border, bias, tiles, maxtiles = 8) {
		//look for needed nodes and prefetched nodes (on the pos destination
		const box = this.getViewportBox(viewport, transform, layerTransform);

		let needed = [];
		let now = performance.now();

		// Linear scan of all the potential tiles
		const N = this.tileCount();
		const flipY = true;
		for (let x = 0; x < N; x++) {
			let index = this.index(0, x, 0);
			let tile = tiles.get(index) || this.newTile(index);

			if (this.intersects(box, index, flipY)) {
				tile.time = now;
				tile.priority = this.tileDescriptors[index].visible ? 10 : 1;
				if (tile.missing === null)
					needed.push(tile);
			}
		}
		let c = box.center();
		//sort tiles by distance to the center TODO: check it's correct!
		needed.sort(function (a, b) { return Math.abs(a.x - c[0]) + Math.abs(a.y - c[1]) - Math.abs(b.x - c[0]) - Math.abs(b.y - c[1]); });

		return needed;
	}

	/**
	 * Gets tiles currently available for rendering.
	 * @param {Viewport} viewport - Current viewport
	 * @param {Transform} transform - Current transform
	 * @param {Transform} layerTransform - Layer-specific transform
	 * @param {number} border - Border size in viewport units
	 * @param {number} bias - Resolution bias (unused in this layout)
	 * @param {Map<number,Tile>} tiles - Available tiles
	 * @returns {Object.<number,Tile>} Map of tile index to tile object for visible, loaded tiles
	 */
	available(viewport, transform, layerTransform, border, bias, tiles) {
		//find box in image coordinates where (0, 0) is in the upper left corner.
		const box = this.getViewportBox(viewport, transform, layerTransform);

		let torender = [];

		// Linear scan of all the potential tiles
		const N = this.tileCount();
		const flipY = true;
		for (let x = 0; x < N; x++) {
			let index = this.index(0, x, 0);

			if (this.tileDescriptors[index].visible && this.intersects(box, index, flipY)) {
				if (tiles.has(index)) {
					let tile = tiles.get(index);
					if (tile.missing == 0) {
						torender[index] = tile;
					}
				}
			}
		}

		return torender;
	}

	/**
	 * Creates a new tile instance with properties from its descriptor.
	 * @param {number} index - Index of the tile descriptor
	 * @returns {Tile} New tile instance with region and image properties
	 */
	newTile(index) {
		let tile = new Tile();
		tile.index = index;

		let descriptor = this.tileDescriptors[index];
		tile.image = descriptor.image;
		Object.assign(tile, descriptor.region);
		return tile;
	}

	/**
	 * Checks if a tile's region intersects with a given box.
	 * @private
	 * @param {BoundingBox} box - Box to check intersection with
	 * @param {number} index - Index of the tile to check
	 * @param {boolean} [flipY=true] - Whether to flip Y coordinates for texture coordinate space
	 * @returns {boolean} True if the tile intersects the box
	 */
	intersects(box, index, flipY = true) {
		const r = this.tileDescriptors[index].region;
		const xLow = r.x;
		const yLow = r.y;
		const xHigh = xLow + r.w;
		const yHigh = yLow + r.h;
		const boxYLow = flipY ? -box.yHigh : box.yLow;
		const boxYHigh = flipY ? -box.yLow : box.yHigh;

		return xLow < box.xHigh && yLow < boxYHigh && xHigh > box.xLow && yHigh > boxYLow;
	}

	/**
	 * Gets the total number of tiles in the layout.
	 * @returns {number} Number of tile descriptors
	 */
	tileCount() {
		return this.tileDescriptors.length;
	}

}
/**
 * @event Layout#ready
 * Fired when the layout is ready for rendering.
 * This occurs when:
 * - Tile descriptors are loaded from annotation file
 * - Tile descriptors are set programmatically
 */

/**
 * @event Layout#updateSize
 * Fired when the layout size changes and scene extension needs updating.
 * This occurs when:
 * - Tile descriptors are loaded and bounding box is computed
 */

// Register the tile_images layout type
Layout.prototype.types['tile_images'] = (url, type, options) => { return new LayoutTileImages(url, type, options); };

export { LayoutTileImages }
