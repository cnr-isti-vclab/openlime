import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderMultispectral } from './ShaderMultispectral.js'
import { Util } from './Util.js'

/**
 * @typedef {Object} LayerMultispectralOptions
 * @property {string} url - URL to multispectral info.json file (required)
 * @property {string} layout - Layout type: 'image', 'deepzoom', 'google', 'iiif', 'zoomify', 'tarzoom', 'itarzoom'
 * @property {string} [defaultMode='single_band'] - Initial visualization mode
 * @property {string} [server] - IIP server URL (for IIP layout)
 * @property {boolean} [linearRaster=true] - Whether to use linear color space for rasters
 * @extends LayerOptions
 */

/**
 * LayerMultispectral implements visualization of multispectral imagery.
 * 
 * This layer handles multispectral image data with configurable visualization modes
 * and supports interactive analysis through Color Twist Weights (CTW).
 * 
 * Features:
 * - Multiple visualization modes
 * - UBO-optimized CTW implementation
 * - Built-in preset library
 * - Scientific accuracy with texelFetch
 * - Single band visualization
 * - Custom spectral transformations
 * 
 * Technical Details:
 * - Efficient WebGL2 implementation
 * - Precise pixel access for scientific applications
 * - Shader-based visualization pipeline
 * - Integration with preset system
 * 
 * Data Format Support:
 * - Standard multispectral JSON configuration
 * - Multiple layout systems (deepzoom, google, iiif, etc.)
 * - Single-file tiled formats (tarzoom, itarzoom)
 * 
 * @extends Layer
 * 
 * @example
 * ```javascript
 * // Create multispectral layer with deepzoom layout
 * const msLayer = new OpenLIME.Layer({
 *   type: 'multispectral',
 *   url: 'path/to/info.json',
 *   layout: 'deepzoom',
 *   defaultMode: 'rgb'
 * });
 * 
 * // Add to viewer
 * viewer.addLayer('ms', msLayer);
 * 
 * // Apply a preset CTW
 * msLayer.applyPreset('gold');
 * ```
 */
class LayerMultispectral extends Layer {
  /**
   * Creates a new LayerMultispectral instance
   * @param {LayerMultispectralOptions} options - Configuration options
   * @throws {Error} If rasters options is not empty
   * @throws {Error} If url is not provided
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
    this.loadInfo(this.url);
  }

  /**
   * Constructs URL for image resources based on layout type
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
   * @param {string} url - URL to info.json
   * @private
   * @async
   */
  async loadInfo(url) {
    try {
      let infoUrl = url;
      // Need to handle embedded info.json when using IIP and TIFF image stacks
      if (this.layout.type == "iip") infoUrl = (this.server ? this.server + '?FIF=' : '') + url + "&obj=description";

      const info = await Util.loadJSON(infoUrl);

      // Check if basename is present
      if (!info.basename) {
        this.status = "Error: 'basename' is required in the multispectral configuration file";
        console.error(this.status);
        return;
      }

      // Update layout image format and pixelSize if provided in info.json
      if (info.format) this.layout.suffix = info.format;
      if (info.pixelSizeInMM) this.pixelSize = info.pixelSizeInMM;

      // Initialize shader with info
      this.shader.init(info);

      // Set texture size if available
      if (info.width && info.height) {
        this.shader.setTextureSize([info.width, info.height]);
      }

      // Get basename from info
      const baseName = info.basename;

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
 * Loads presets
 * @param {string} url - URL to info.json
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
   * Initializes default CTW based on default mode
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
   * @param {number} bandIndex - Index of band to visualize
   * @param {number} [channel=0] - Output channel (0=R, 1=G, 2=B)
   */
  setSingleBand(bandIndex, channel = 0) {
    if (this.shader) {
      this.shader.setSingleBand(bandIndex, channel);
      this.emit('update');
    }
  }

  /**
   * Sets CTW coefficients manually
   * @param {Float32Array} redCTW - Red channel coefficients
   * @param {Float32Array} greenCTW - Green channel coefficients
   * @param {Float32Array} blueCTW - Blue channel coefficients
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

  getPreset(presetName) {
    if (presetName in this.presets) {
      const { red, green, blue } = this.presets[presetName];
      return { red, green, blue };
    } else {
      console.warn(`Preset "${presetName}" not found.`);
      return null;
    }
  }

  getPresetNames() {
    return Object.keys(this.presets);
  }

  /**
   * Applies a preset CTW from the presets library
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
   * Gets the wavelength array
   * @returns {number[]} Array of wavelengths
   */
  getWavelengths() {
    return this.shader ? this.shader.wavelength : [];
  }

  /**
   * Gets the number of spectral bands
   * @returns {number} Number of bands
   */
  getBandCount() {
    return this.shader ? this.shader.nplanes : 0;
  }

  /**
   * Gets available presets
   * @returns {string[]} Array of preset names
   */
  getAvailablePresets() {
    return this.presets ? this.getPresetNames() : [];
  }

  /**
   * Prepares WebGL resources including UBO for CTW
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
}

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['multispectral'] = (options) => { return new LayerMultispectral(options); }

export { LayerMultispectral }