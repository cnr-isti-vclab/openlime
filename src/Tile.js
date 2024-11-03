// Tile level x y  index ----- tex missing() start/end (tarzoom) ----- time, priority size(byte)

/**
 * @typedef {Object} TileProperties
 * @property {number} index - Unique identifier for the tile
 * @property {number[]} bbox - Bounding box coordinates [minX, minY, maxX, maxY]
 * @property {number} level - Zoom level in the pyramid (for tiled layouts)
 * @property {number} x - Horizontal grid position
 * @property {number} y - Vertical grid position
 * @property {number} w - Tile width (for image layouts)
 * @property {number} h - Tile height (for image layouts)
 * @property {number} start - Starting byte position in dataset (for tar-based formats)
 * @property {number} end - Ending byte position in dataset (for tar-based formats)
 * @property {WebGLTexture[]} tex - Array of WebGL textures (one per channel)
 * @property {number} missing - Count of pending channel data requests
 * @property {number} time - Creation timestamp for cache management
 * @property {number} priority - Loading priority for cache management
 * @property {number} size - Total size in bytes for cache management
 */

/**
 * 
 * Represents a single tile in an image tiling system.
 * Tiles are fundamental units used to manage large images through regular grid subdivision.
 * Supports both traditional pyramid tiling and specialized formats like RTI/BRDF.
 * 
 * Features:
 * - Multi-channel texture support
 * - Cache management properties
 * - Format-specific byte positioning
 * - Flexible layout compatibility
 * - Priority-based loading
 * 
 * Usage Contexts:
 * 1. Tiled Layouts:
 *    - Part of zoom level pyramid
 *    - Grid-based positioning (x, y, level)
 * 
 * 2. Image Layouts:
 *    - Direct image subdivision
 *    - Dimensional specification (w, h)
 * 
 * 3. Specialized Formats:
 *    - RTI (Reflectance Transformation Imaging)
 *    - BRDF (Bidirectional Reflectance Distribution Function)
 *    - TAR-based formats (tarzoom, itarzoom)
 * 
 *
 * Implementation Details
 * 
 * Property Categories:
 * 
 * 1. Identification:
 * ```javascript
 * {
 *     index: number,    // Unique tile ID
 *     bbox: number[],   // Spatial bounds
 * }
 * ```
 * 
 * 2. Positioning:
 * ```javascript
 * {
 *     // Tiled Layout Properties
 *     level: number,    // Zoom level
 *     x: number,        // Grid X
 *     y: number,        // Grid Y
 *     
 *     // Image Layout Properties
 *     w: number,        // Width
 *     h: number,        // Height
 * }
 * ```
 * 
 * 3. Data Access:
 * ```javascript
 * {
 *     start: number,    // Byte start
 *     end: number,      // Byte end
 *     tex: WebGLTexture[], // Channel textures
 *     missing: number,  // Pending channels
 * }
 * ```
 * 
 * 4. Cache Management:
 * ```javascript
 * {
 *     time: number,     // Creation time
 *     priority: number, // Load priority
 *     size: number      // Memory size
 * }
 * ```
 * 
 * Format-Specific Considerations:
 * 
 * 1. Standard Tiling:
 * - Uses level, x, y for pyramid positioning
 * - Single texture per tile
 * 
 * 2. RTI/BRDF:
 * - Multiple textures per tile (channels)
 * - Missing counter tracks channel loading
 * 
 * 3. TAR Formats:
 * - Uses start/end for byte positioning
 * - Enables direct data access in archives
 * 
 * Cache Management:
 * - time: Used for LRU (Least Recently Used) calculations
 * - priority: Influences loading order
 * - size: Helps manage memory constraints
 */
class Tile {
    /**
     * Creates a new Tile instance with default properties
     * 
     * @example
     * ```javascript
     * // Create a basic tile
     * const tile = new Tile();
     * tile.level = 2;
     * tile.x = 3;
     * tile.y = 4;
     * tile.priority = 1;
     * ```
     * 
     * @example
     * ```javascript
     * // Create a multi-channel tile
     * const tile = new Tile();
     * tile.tex = new Array(3); // For RGB channels
     * tile.missing = 3; // Waiting for all channels
     * ```
     */
    constructor() {
        Object.assign(this, {
            index: null,
            bbox: null,

            level: null, //used only in LayoutTiles
            x: null,
            y: null,
            w: null, // used only in LayoutImages
            h: null, // used only in LayoutImages

            start: null,
            end: null,

            tex: [],
            missing: null,
            time: null,
            priority: null,
            size: null
        });
    }
};

export { Tile }