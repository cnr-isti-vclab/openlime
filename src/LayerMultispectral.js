import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderMultispectral } from './ShaderMultispectral.js'
import { Util } from './Util.js'

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
 * - Precise pixel access with texelFetch for scientific accuracy
 * - Multiple layout systems for various tiled image formats
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
      case 'image': return path + filename + '.jpg'; break;
      case 'google': return path + filename; break;
      case 'deepzoom': return path + filename + '.dzi'; break;
      case 'tarzoom': return path + filename + '.tzi'; break;
      case 'itarzoom': return path + filename + '.tzi'; break;
      case 'zoomify': return path + filename + '/ImageProperties.xml'; break;
      case 'iip': return url; break;
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
        this.shader.setTextureSize([this.width, this.height]);
      }

      // Get basename from info
      const baseName = this.info.basename;

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
          urls.push(this.imageUrl(url, `${baseName}_${indexStr}`));
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
      console.log(e); this.status = e;
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

  getSpectrum(x, y) {
    const pixelData = this.getPixelValues(x, y);
    const spectrum = [];
    for (let i = 0; i < this.info.nplanes; i++) {
      const idx = Math.floor(i / 3);
      if (idx < pixelData.length) {
        const px = pixelData[idx];
        const pxIdx = i % 3;
        if (px && pxIdx < 3) {
          spectrum.push(px[pxIdx] / 255.0 * 100);
        }
      }
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