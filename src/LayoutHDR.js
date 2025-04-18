import { Layout } from './Layout.js';
import { Tile } from './Tile.js';

/**
 * LayoutHDR extends the Layout class to provide specific support for HDR image formats.
 * 
 * While not strictly necessary (as base Layout classes can handle HDR content),
 * this specialized class adds features useful for HDR-specific formats such as:
 * 
 * - EXR (OpenEXR) format support
 * - 16-bit TIFF metadata extraction
 * - Multi-exposure image sets
 * - HDR-specific metadata handling
 * - Adaptive tile sizing for HDR content
 * 
 * @extends Layout
 */
class LayoutHDR extends Layout {
  /**
   * Creates a new HDR layout.
   * @param {string} url - URL to HDR image or configuration
   * @param {('tiff16'|'exr'|'hdr'|'image')} type - Type of HDR format
   * @param {Object} [options] - Additional options
   * @param {boolean} [options.extractMetadata=true] - Whether to extract HDR-specific metadata
   * @param {number} [options.tileSize=256] - Tile size for tiled formats
   * @param {string} [options.suffix='tif'] - Default file extension
   */
  constructor(url, type, options) {
    // Register layout type factories if not already registered
    if (!Layout.prototype.types.tiff16) {
      Layout.prototype.types.tiff16 = (url, type, options) => new LayoutHDR(url, type, options);
    }

    if (!Layout.prototype.types.exr) {
      Layout.prototype.types.exr = (url, type, options) => new LayoutHDR(url, type, options);
    }

    if (!Layout.prototype.types.hdr) {
      Layout.prototype.types.hdr = (url, type, options) => new LayoutHDR(url, type, options);
    }

    // Call parent constructor
    super(url, type, options);

    // Set HDR-specific options
    this.extractMetadata = options?.extractMetadata !== false;
    this.hdrMetadata = null;

    // Initialize based on type
    if (['tiff16', 'exr', 'hdr'].includes(type)) {
      this._initHDRLayout(url, type, options);
    }
  }

  /**
   * Initializes HDR-specific layout.
   * @private
   * @param {string} url - URL to HDR image
   * @param {string} type - Format type
   * @param {Object} options - Configuration options
   */
  _initHDRLayout(url, type, options) {
    // Default settings for different HDR formats
    switch (type) {
      case 'tiff16':
        this.suffix = options?.suffix || 'tif';
        break;
      case 'exr':
        this.suffix = options?.suffix || 'exr';
        break;
      case 'hdr':
        this.suffix = options?.suffix || 'hdr';
        break;
    }

    // Set layout type
    this.type = type;

    // For single images, use the image layout method
    if (!options?.tiled) {
      this.setDefaults('image');
      this.init(url, 'image', options);
      return;
    }

    // For tiled formats, continue with initialization
    this.setDefaults(type);
    this.init(url, type, options);

    // For tiled formats, try to load metadata or layout information
    if (this.extractMetadata) {
      this._extractHDRMetadata(url);
    }

    this._setupTileLoading();
  }

  _setupTileLoading() {
    // Verifica che il dataLoader sia presente
    if (!this.dataLoader) {
      console.warn("No dataLoader specified for HDR layer");
      return;
    }
  
    // Override del metodo loadTile di Layer per utilizzare il dataLoader personalizzato
    this.loadTile = async (tile, callback) => {
      try {
        if (this.debug) {
          console.log(`LayerHDR loading tile: ${tile.index}`);
        }
  
        // Usa il dataLoader personalizzato per caricare la tile
        const imageData = await this.dataLoader(tile, this.gl, this.dataLoaderOptions);
  
        // Crea la texture usando il primo raster (HDR)
        const raster = this.rasters[0];
        const tex = raster.loadTexture(this.gl, imageData.data);
  
        // Aggiorna le informazioni della tile
        tile.tex[0] = tex;
        tile.w = imageData.width;
        tile.h = imageData.height;
        tile.missing = 0;
        tile.size = imageData.width * imageData.height * imageData.channels * 2; // 16-bit = 2 bytes
  
        // Chiama la callback di successo
        if (callback) callback(null, tile.size);
  
        // Emetti un aggiornamento
        this.emit('update');
      } catch (error) {
        console.error(`Error loading HDR tile ${tile.index}:`, error);
        if (callback) callback(error);
      }
    };
  }

  /**
   * Extracts metadata specific to HDR formats.
   * @private
   * @param {string} url - URL to HDR image or metadata
   */
  _extractHDRMetadata(url) {
    // This would normally make an async request to get metadata
    // For now, we'll set up a placeholder and make the layout ready

    const metadataUrl = url.replace(/\.(tif|exr|hdr)$/, '.json');

    fetch(metadataUrl)
      .then(response => {
        if (response.ok) {
          return response.json();
        }
        // If no metadata file exists, we'll continue without it
        throw new Error('No metadata file available');
      })
      .then(metadata => {
        this.hdrMetadata = metadata;

        // Update layout dimensions if provided in metadata
        if (metadata.width && metadata.height) {
          this.width = metadata.width;
          this.height = metadata.height;
          this.emit('updateSize');
        }

        // Set layout as ready
        this.status = 'ready';
        this.emit('ready');
      })
      .catch(() => {
        // If we can't get metadata, simply set as ready
        this.status = 'ready';
        this.emit('ready');
      });
  }

  /**
   * Creates tile URL for HDR formats.
   * @param {number} id - Raster ID
   * @param {Tile} tile - Tile object
   * @returns {string} URL for the tile
   */
  getTileURL(id, tile) {
    // For single image layout
    if (this.type === 'image') {
      return this.urls[id || 0];
    }

    // For tiled formats (this is a basic implementation)
    const url = this.urls[id || 0];

    // If it's a TIFF16 deepzoom-style URL pattern
    if (this.type === 'tiff16') {
      return `${url}/${tile.level}/${tile.x}_${tile.y}.${this.suffix}`;
    }

    // For EXR or HDR formats
    return `${url}/${tile.level}/${tile.x}_${tile.y}.${this.suffix}`;
  }

  /**
   * Gets HDR-specific metadata if available.
   * @returns {Object|null} HDR metadata or null if not available
   */
  getHDRMetadata() {
    return this.hdrMetadata;
  }

  /**
   * Creates a new tile appropriate for HDR content.
   * @param {number} index - Tile identifier 
   * @returns {Tile} New tile object
   */
  newTile(index) {
    const tile = super.newTile(index);

    // Add HDR-specific properties if needed
    tile.hdrData = {
      // Properties specific to HDR tiles could be added here
      // For example, exposure range, gamut information, etc.
      exposureRange: [-10, 10]
    };

    return tile;
  }
}

export { LayoutHDR };