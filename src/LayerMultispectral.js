import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderMultispectral } from './ShaderMultispectral.js'
import { Util } from './Util.js'
import { Transform } from './Transform.js'

/**
 * @typedef {Object} LayerMultispectralOptions
 * @property {string} url - URL to multispectral info.json file (required)
 * @property {string} layout - Layout type: 'image', 'deepzoom', 'google', 'iiif', 'zoomify', 'tarzoom', 'itarzoom'
 * @property {string} [defaultMode='single_band'] - Initial visualization mode ('rgb' or 'single_band')
 * @property {string} [server] - IIP server URL (for IIP layout)
 * @property {boolean} [linearRaster=true] - Whether to use linear color space for rasters (recommended for scientific accuracy)
 * @property {string|Object} presets - Path to presets JSON file or presets object containing CTW configurations
 * @extends LayerOptions
 */

/**
 * LayerMultispectral - Advanced multispectral imagery visualization layer
 * 
 * This layer provides specialized handling of multispectral image data with configurable 
 * visualization modes and interactive spectral analysis capabilities through Color Twist 
 * Weights (CTW). It supports scientific visualization workflows for remote sensing, art analysis,
 * medical imaging, and other multispectral applications.
 * 
 * Features:
 * - Multiple visualization modes (RGB, single band)
 * - UBO-optimized Color Twist Weights implementation for real-time spectral transformations
 * - Preset system for common visualization configurations (false color, etc.)
 * - Support for multiple image layouts and tiling schemes 
 * - Compatible with both single images and tile-based formats (DeepZoom, etc.)
 * 
 * Technical implementation:
 * - Uses WebGL2 features for efficient processing
 * - Implements shader-based visualization pipeline
 * - Supports multiple image layouts and tiling schemes
 * 
 * @extends Layer
 * 
 * @example
 * // Create multispectral layer with deepzoom layout
 * const msLayer = new OpenLIME.Layer({
 *   type: 'multispectral',
 *   url: 'path/to/info.json',
 *   layout: 'deepzoom',
 *   defaultMode: 'rgb',
 *   presets: 'path/to/presets.json'
 * });
 * 
 * // Add to viewer
 * viewer.addLayer('ms', msLayer);
 * 
 * // Apply a preset CTW
 * msLayer.applyPreset('falseColor');
 */
class LayerMultispectral extends Layer {
  /**
   * Creates a new LayerMultispectral instance
   * @param {LayerMultispectralOptions} options - Configuration options
   * @throws {Error} If rasters options is not empty (rasters are created automatically)
   * @throws {Error} If url to info.json is not provided
   * @throws {Error} If presets option is not provided
   */
  constructor(options) {
    super(options);

    if (Object.keys(this.rasters).length != 0)
      throw new Error("Rasters options should be empty!");

    if (!this.url)
      throw new Error("Url option is required");

    if (!this.presets) {
      throw new Error("Presets option is required");
    }
    this.loadPresets();

    // Set default options
    this.linearRaster = this.linearRaster !== undefined ? this.linearRaster : true;
    this.defaultMode = this.defaultMode || 'single_band';

    // Create shader
    this.shaders['multispectral'] = new ShaderMultispectral();
    this.setShader('multispectral');

    // Set current CTW arrays
    this._currentCTW = {
      red: null,
      green: null,
      blue: null
    };

    // Load configuration
    this.info = null;
    this.loadInfo(this.url);
  }

  /**
   * Constructs URL for image resources based on layout type
   * 
   * Handles different image layout conventions including deepzoom, google maps tiles,
   * zoomify, and specialized formats like tarzoom.
   * 
   * @param {string} url - Base URL
   * @param {string} filename - Base filename without extension
   * @returns {string} Complete URL for the resource
   * @private
   */
  imageUrl(url, filename) {
    let path = this.url.substring(0, this.url.lastIndexOf('/') + 1);
    switch (this.layout.type) {
      case 'image': return path + filename + '.jpg';
      case 'google': return path + filename;
      case 'deepzoom':
        // Special handling for multispectral deepzoom
        return path + filename + '.dzi';
      case 'tarzoom': return path + filename + '.tzi';
      case 'itarzoom': return path + filename + '.tzi';
      case 'zoomify': return path + filename + '/ImageProperties.xml';
      case 'iip': return url;
      case 'iiif': throw new Error("Unimplemented");
      default: throw new Error("Unknown layout: " + this.layout.type);
    }
  }

  /**
   * Loads and processes multispectral configuration
   * 
   * Fetches the info.json file containing wavelength, basename, and other
   * configuration parameters, then sets up the rasters and shader accordingly.
   * 
   * @param {string} url - URL to info.json
   * @private
   * @async
   */
  async loadInfo(url) {
    try {
      let infoUrl = url;
      // Need to handle embedded info.json when using IIP and TIFF image stacks
      if (this.layout.type == "iip") infoUrl = (this.server ? this.server + '?FIF=' : '') + url + "&obj=description";

      this.info = await Util.loadJSON(infoUrl);
      console.log("Multispectral info loaded:", this.info);

      // Check if basename is present
      if (!this.info.basename) {
        this.status = "Error: 'basename' is required in the multispectral configuration file";
        console.error(this.status);
        return;
      }

      // Update layout image format and pixelSize if provided in info.json
      if (this.info.format) this.layout.suffix = this.info.format;
      if (this.info.pixelSizeInMM) this.pixelSize = this.info.pixelSizeInMM;

      // Initialize shader with info
      this.shader.init(this.info);

      // Set texture size if available
      if (this.info.width && this.info.height) {
        this.width = this.info.width;
        this.height = this.info.height;
      }

      // Get basename from info
      const baseName = this.info.basename;
      console.log("Using basename:", baseName);

      // Create rasters and URLs array for each image
      const urls = [];

      // Handle special case for itarzoom (all planes in one file)
      if (this.layout.type === 'itarzoom') {
        // Create a single raster for all planes
        let raster = new Raster({ format: 'vec3', isLinear: this.linearRaster });
        this.rasters.push(raster);

        // Add a single URL for all planes
        urls.push(this.imageUrl(url, baseName));
      } else {
        // Standard case: one file per image
        for (let p = 0; p < this.shader.nimg; p++) {
          // Create raster with linear color space
          let raster = new Raster({ format: 'vec3', isLinear: this.linearRaster });
          this.rasters.push(raster);

          // Format index with leading zeros (e.g., 00, 01, 02)
          const indexStr = p.toString().padStart(2, '0');

          // Generate URL for this image
          const imgUrl = this.imageUrl(url, `${baseName}_${indexStr}`);
          urls.push(imgUrl);
          console.log(`Plane ${p} URL: ${imgUrl}`);
        }
      }

      // Set URLs for layout
      if (urls.length > 0) {
        this.layout.setUrls(urls);
      }

      // Set up the shader
      this.setMode(this.defaultMode);
      this.initDefault();

    } catch (e) {
      console.error("Error loading multispectral info:", e);
      this.status = e;
    }
  }

  /**
   * Loads preset definitions for Color Twist Weights
   * 
   * Can load presets from a URL or use directly provided preset object.
   * Presets define predefined CTW configurations for common visualization needs.
   * 
   * @private
   * @async
   */
  async loadPresets() {
    if (typeof this.presets === 'string' && this.presets.trim() !== '') {
      this.presets = await Util.loadJSON(this.presets);
    }
    if (typeof this.presets !== 'object') {
      throw new Error("presets not well formed");
    }
  }

  /**
   * Gets info
   * 
   * @returns {Object|null} Object with info on multispectral dataset or null if not found
   */
  info() {
    return this.info;
  }

  /**
   * Initializes default CTW based on default mode
   * 
   * Creates initial CTW arrays with zeros and applies default
   * visualization settings.
   * 
   * @private
   */
  initDefault() {
    // Create default CTW arrays
    const nplanes = this.shader.nplanes;
    if (!nplanes) return; // Not yet initialized

    let redCTW = new Float32Array(nplanes).fill(0);
    let greenCTW = new Float32Array(nplanes).fill(0);
    let blueCTW = new Float32Array(nplanes).fill(0);

    // Update current CTW and shader
    this._currentCTW.red = redCTW;
    this._currentCTW.green = greenCTW;
    this._currentCTW.blue = blueCTW;

    if (this.defaultMode === 'single-band') {
      this.setSingleBand(0, 0);
    }
  }

  /**
   * Sets the visualization mode
   * 
   * Changes how multispectral data is visualized:
   * - 'rgb': Uses CTW coefficients to create RGB visualization
   * - 'single_band': Shows a single spectral band
   * 
   * @param {string} mode - Mode name ('rgb', 'single_band')
   */
  setMode(mode) {
    if (this.shader) {
      this.shader.setMode(mode);
      this.emit('update');
    }
  }

  /**
   * Sets single band visualization
   * 
   * Displays a single spectral band on a specific output channel.
   * 
   * @param {number} bandIndex - Index of band to visualize
   * @param {number} [channel=0] - Output channel (0=all/gray, 1=R, 2=G, 3=B)
   */
  setSingleBand(bandIndex, channel = 0) {
    if (this.shader) {
      this.shader.setSingleBand(bandIndex, channel);
      this.emit('update');
    }
  }

  /**
   * Sets Color Twist Weights coefficients manually
   * 
   * CTW coefficients define how spectral bands are combined to create
   * RGB visualization. Each array contains weights for each spectral band.
   * 
   * @param {Float32Array} redCTW - Red channel coefficients
   * @param {Float32Array} greenCTW - Green channel coefficients
   * @param {Float32Array} blueCTW - Blue channel coefficients
   * @throws {Error} If arrays have incorrect length
   */
  setCTW(redCTW, greenCTW, blueCTW) {
    if (!this.shader || !this.gl) return;

    // Validate array lengths
    const nplanes = this.shader.nplanes;
    if (redCTW.length !== nplanes || greenCTW.length !== nplanes || blueCTW.length !== nplanes) {
      throw new Error(`CTW arrays must be of length ${nplanes}`);
    }

    // Update current CTW
    this._currentCTW.red = redCTW;
    this._currentCTW.green = greenCTW;
    this._currentCTW.blue = blueCTW;

    // Update shader CTW
    this.shader.setupCTW(this.gl, redCTW, greenCTW, blueCTW);

    // Set to rgb mode
    this.setMode('rgb');
  }

  /**
   * Gets a preset CTW configuration by name
   * 
   * Retrieves the preset's red, green, and blue CTW arrays from
   * the presets collection.
   * 
   * @param {string} presetName - Name of the preset
   * @returns {Object|null} Object with red, green, blue arrays or null if not found
   */
  getPreset(presetName) {
    if (presetName in this.presets) {
      const { red, green, blue } = this.presets[presetName];
      return { red, green, blue };
    } else {
      console.warn(`Preset "${presetName}" not found.`);
      return null;
    }
  }

  /**
   * Applies a preset CTW from the presets library
   * 
   * Loads and applies a predefined set of CTW coefficients for
   * specialized visualization (e.g., false color, vegetation analysis).
   * 
   * @param {string} presetName - Name of the preset
   * @throws {Error} If preset doesn't exist
   */
  applyPreset(presetName) {
    if (!this.shader) return;

    // Get preset from the preset manager
    const preset = this.getPreset(presetName);

    if (!preset) {
      throw new Error(`Preset '${presetName}' not found`);
    }

    // Apply the preset
    this.setCTW(preset.red, preset.green, preset.blue);
  }

  /**
   * Gets the wavelength array for spectral bands
   * 
   * Returns the wavelength values (in nm) for each spectral band.
   * 
   * @returns {number[]} Array of wavelengths
   */
  getWavelengths() {
    return this.shader ? this.shader.wavelength : [];
  }

  /**
   * Gets the number of spectral bands
   * 
   * Returns the count of spectral planes in the multispectral dataset.
   * 
   * @returns {number} Number of bands
   */
  getBandCount() {
    return this.shader ? this.shader.nplanes : 0;
  }

  /**
   * Gets available presets
   * 
   * Returns the names of all available preset CTW configurations.
   * 
   * @returns {string[]} Array of preset names
   */
  getAvailablePresets() {
    return this.presets ? Object.keys(this.presets) : [];
  }

  /**
   * Prepares WebGL resources including UBO for CTW
   * 
   * Sets up WebGL context and ensures CTW arrays are uploaded to GPU.
   * 
   * @override
   * @private
   */
  prepareWebGL() {
    // Call parent implementation
    super.prepareWebGL();

    // Setup CTW if needed
    if (this._currentCTW.red && this.shader && this.gl) {
      this.shader.setupCTW(
        this.gl,
        this._currentCTW.red,
        this._currentCTW.green,
        this._currentCTW.blue
      );
    }
  }

  /**
   * Gets spectrum data for a specific pixel
   * 
   * For tiled formats, this method finds the appropriate tiles
   * and reads the spectral values.
   * 
   * @param {number} x - X coordinate in image space
   * @param {number} y - Y coordinate in image space  
   * @returns {number[]} Array of spectral values (0-100)
   */
  getSpectrum(x, y) {
    // For tiled formats, we need a special approach
    if (this.isTiledFormat()) {
      return this.getTiledSpectrum(x, y);
    }

    // For standard formats, use the original approach
    const pixelData = this.getPixelValues(x, y);
    const spectrum = [];

    if (!pixelData || pixelData.length === 0) {
      return new Array(this.shader.nplanes).fill(0);
    }

    for (let i = 0; i < this.info.nplanes; i++) {
      const idx = Math.floor(i / 3);
      if (idx < pixelData.length) {
        const px = pixelData[idx];
        const pxIdx = i % 3;
        if (px && pxIdx < 3) {
          spectrum.push(px[pxIdx] / 255.0 * 100);
        } else {
          spectrum.push(0);
        }
      } else {
        spectrum.push(0);
      }
    }
    return spectrum;
  }

  /**
   * Checks if current layout is a tiled format
   * @private
   * @returns {boolean} True if using a tiled format
   */
  isTiledFormat() {
    const tiledFormats = ['deepzoom', 'deepzoom1px', 'google', 'zoomify', 'iiif', 'tarzoom'];
    return tiledFormats.includes(this.layout.type);
  }

  /**
 * Get spectral data from tiled image formats
 * 
 * This method finds the correct tile for a given pixel coordinate,
 * then extracts the spectral values from it. It correctly handles
 * coordinate conversions between global image space and local tile space.
 * 
 * @param {number} x - X coordinate in image space
 * @param {number} y - Y coordinate in image space
 * @returns {number[]} Array of spectral values (0-100)
 * @private
 */
  getTiledSpectrum(x, y) {
    // Initialize spectrum array with zeros
    const spectrum = new Array(this.shader.nplanes).fill(0);

    // Check if coordinates are within image bounds
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      console.warn(`Coordinates out of bounds: (${x}, ${y})`);
      return spectrum;
    }

    console.log(`Getting spectrum at pixel (${x}, ${y}) in image of size ${this.width}x${this.height}`);

    try {
      // Create a transform to match the layer's viewport
      const transform = this.transform.copy();

      // For coordinate system alignment, we need to know in which direction Y grows
      // In OpenLIME, origin is at center, and Y grows upward in scene coordinates

      // Find all levels that might contain our coordinates
      let foundData = false;

      // Start from the highest resolution level (finest detail)
      for (let level = this.layout.nlevels - 1; level >= 0; level--) {
        if (foundData) break;

        // Calculate tile size at this level
        const scale = Math.pow(2, this.layout.nlevels - 1 - level);
        const tileSize = this.layout.tilesize * scale;

        // Find which tile contains our coordinates
        // Note: The y-coordinate might need flipping depending on your coordinate system
        const tileX = Math.floor(x / tileSize);
        const tileY = Math.floor(y / tileSize);

        console.log(`Level ${level}: Looking for tile at grid position (${tileX}, ${tileY}) with tileSize=${tileSize}`);

        // Get the tile index
        const tileIndex = this.layout.index(level, tileX, tileY);

        // Check if this tile exists in our cache
        if (this.tiles.has(tileIndex)) {
          const tile = this.tiles.get(tileIndex);
          console.log(`Found tile with index ${tileIndex}, missing=${tile.missing}`);

          // Only proceed if the tile is fully loaded
          if (tile.missing === 0) {
            // Calculate local coordinates within the tile
            // Important: These are pixel coordinates within the tile texture
            const localX = x - (tileX * tileSize);
            const localY = y - (tileY * tileSize);

            console.log(`Local coordinates within tile: (${localX}, ${localY})`);

            // Check if local coordinates are within tile bounds
            if (localX >= 0 && localX < tileSize && localY >= 0 && localY < tileSize) {
              // Scale local coordinates to match the actual texture dimensions
              // The tile texture may be smaller than tileSize, especially at edges
              const texWidth = tile.w || this.layout.tilesize;
              const texHeight = tile.h || this.layout.tilesize;

              // Scale coordinates to actual texture size
              const texX = Math.min(Math.floor(localX * texWidth / tileSize), texWidth - 1);
              const texY = Math.min(Math.floor(localY * texHeight / tileSize), texHeight - 1);

              console.log(`Texture coordinates: (${texX}, ${texY}) in texture of size ${texWidth}x${texHeight}`);

              // For each spectral band, read the corresponding pixel value
              for (let plane = 0; plane < this.shader.nplanes; plane++) {
                const textureIndex = Math.floor(plane / 3);
                const channelIndex = plane % 3;

                if (textureIndex < tile.tex.length && tile.tex[textureIndex]) {
                  // Create a framebuffer for reading from the texture
                  const framebuffer = this.gl.createFramebuffer();
                  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
                  this.gl.framebufferTexture2D(
                    this.gl.FRAMEBUFFER,
                    this.gl.COLOR_ATTACHMENT0,
                    this.gl.TEXTURE_2D,
                    tile.tex[textureIndex],
                    0
                  );

                  if (this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER) === this.gl.FRAMEBUFFER_COMPLETE) {
                    // Read the pixel data
                    const pixelData = new Uint8Array(4);
                    this.gl.readPixels(
                      texX, texY, 1, 1,
                      this.gl.RGBA, this.gl.UNSIGNED_BYTE,
                      pixelData
                    );

                    // Extract the value from the appropriate channel (R, G, or B)
                    spectrum[plane] = pixelData[channelIndex] / 255.0 * 100;
                  }

                  // Clean up
                  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);
                  this.gl.deleteFramebuffer(framebuffer);
                }
              }

              // Mark that we've found data
              foundData = true;

              // Check if all values are zero - this might mean we need to debug further
              const allZeros = spectrum.every(val => val === 0);
              if (allZeros) {
                console.warn("All spectral values are zero - possible incorrect coordinate mapping");
              } else {
                console.log("Successfully retrieved spectral data:", spectrum);
              }

              // No need to check more levels if we found valid data
              break;
            } else {
              console.warn(`Local coordinates (${localX}, ${localY}) outside tile bounds (0-${tileSize})`);
            }
          }
        } else {
          console.log(`Tile index ${tileIndex} not found in cache`);
        }
      }

      if (!foundData) {
        console.warn("No valid tile found containing the requested pixel");
      }
    } catch (e) {
      console.error("Error getting spectral data:", e);
    }

    return spectrum;
  }

}

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['multispectral'] = (options) => { return new LayerMultispectral(options); }

export { LayerMultispectral }