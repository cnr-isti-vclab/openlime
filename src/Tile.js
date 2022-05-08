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

class Tile {
    constructor() {
        Object.assign(this, {
            index: null, 
            bbox: null,

            level: null, //used only in LayoutTiles
            x: null,
            y: null,

            start:null,
            end:null,

            tex: [],
            missing: null,
            time: null,
            priority: null,
            size: null
        });
    }
};

export { Tile }