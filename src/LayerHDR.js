import { Layer } from './Layer.js'
import { Raster16Bit } from './Raster16Bit.js'
import { ShaderHDR } from './ShaderHDR.js'

/**
 * @typedef {Object} LayerHDROptions
 * @property {string} url - URL of the image to display (required)
 * @property {string|Layout} [layout='image'] - Layout format for image display
 * @property {string} [format='rgba16f'] - Image data format for WebGL processing
 * @property {boolean} [useHalfFloat=false] - Whether to use half-float precision
 * @property {boolean} [debug=false] - Enable debug output
 * @extends LayerOptions
 */

/**
 * LayerHDR provides advanced HDR image rendering capabilities in OpenLIME.
 * It is designed for high dynamic range (HDR) image processing and rendering,
 * leveraging WebGL shaders and tone mapping techniques.
 * 
 * Features:
 * - HDR tone mapping with configurable white point
 * - WebGL-based rendering with 16-bit precision
 * - Automatic raster data management
 * - Shader-based processing for HDR compression
 * 
 * Technical Details:
 * - Uses WebGL textures for HDR image data
 * - Supports 16-bit float formats (e.g., rgba16f)
 * - Integrates with OpenLIME layout system
 * - Provides multiple tone mapping options: Reinhard, ACES, and Exposure
 * 
 * @extends Layer
 * 
 * @example
 * ```javascript
 * const hdrLayer = new OpenLIME.LayerHDR({
 *   url: 'hdr-image.hdr',
 *   format: 'rgba16f',
 *   useHalfFloat: true
 * });
 * viewer.addLayer('hdr', hdrLayer);
 * ```
 */
class LayerHDR extends Layer {
  /**
   * Creates a new LayerHDR instance.
   * 
   * @param {LayerHDROptions} options - Configuration options for the HDR layer
   */
  constructor(options) {
    options = Object.assign({
      format: 'rgba16f',
      useHalfFloat: false,
      autoWhitePoint: true,
      debug: false,
      mode: 'reinhard',
    }, options);
    super(options);

    if (Object.keys(this.rasters).length != 0)
      throw "Rasters options should be empty!";

    if (this.url)
      this.layout.setUrls([this.url]);
    else if (this.layout.urls.length == 0)
      throw "Missing options.url parameter";

    const rasterOptions = {
      format: this.format,
      isLinear: true,  // HDR data is always in linear space
      useHalfFloat: this.useHalfFloat, // Default to full float precision
      debug: this.debug
    };
    // Add custom data loader if provided
    if (this.dataLoader) {
      rasterOptions.dataLoader = this.dataLoader;
      rasterOptions.dataLoaderOptions = this.dataLoaderOptions || {};
    }

    let raster = new Raster16Bit(rasterOptions);
    raster.addEvent('loaded', () => {
      if (this.autoWhitePoint) {
        const maxValue = raster.getStatInfo().maxValue ? raster.getStatInfo().maxValue : 1.0;
        this.setWhitePoint(maxValue);
      }
      this.emit('loaded');
    });
    this.rasters.push(raster);

    // Create the HDR shader with all tone mapping parameters
    let shader = new ShaderHDR({
      label: 'HDR',
      format: this.format,
      mode: this.mode || 'reinhard',
    });

    this.shaders = { 'hdr': shader };
    this.setShader('hdr');

    // Reinhard params
    this.addControl('whitePoint', [1.0]);
    this.addControl('shadowLift', [0.0]);
    // ACES params
    this.addControl('acesContrast', [1.2]);
    // Exposure params
    this.addControl('exposure', [1.0]);
    // Balanced params
    this.addControl('highlightCompression', [1.0]);
  }

  /**
   * Sets the white point for HDR tone mapping.
   * 
   * @param {number} v - The new white point value
   * @param {number} [delayms=1] - Delay in milliseconds for the transition
   * @param {string} [easing='linear'] - Easing function for the transition
   */
  setWhitePoint(v, delayms = 1, easing = 'linear') {
    this.setControl('whitePoint', [v], delayms, easing);
  }

  /**
   * Gets the current white point value.
   * 
   * @returns {number} The current white point value
   */
  getWhitePoint() {
    return this.controls['whitePoint'].current.value[0];
  }

  /**
   * Sets the shadow lift value for HDR tone mapping.
   *
   * @param {number} v - The new shadow lift value
   * @param {number} [delayms=1] - Delay in milliseconds for the transition
   * @param {string} [easing='linear'] - Easing function for the transition
   */
  setShadowLift(v, delayms = 1, easing = 'linear') {
    this.setControl('shadowLift', [v], delayms, easing);
  }

  /**
   * Gets the current shadow lift value.
   * 
   * @returns {number} The current shadow lift value
   */
  getShadowLift() {
    return this.controls['shadowLift'].current.value[0];
  }

  /**
   * Sets the ACES contrast parameter for ACES tone mapping.
   * 
   * @param {number} v - The new ACES contrast value
   * @param {number} [delayms=1] - Delay in milliseconds for the transition
   * @param {string} [easing='linear'] - Easing function for the transition
   */
  setAcesContrast(v, delayms = 1, easing = 'linear') {
    this.setControl('acesContrast', [v], delayms, easing);
  }

  /**
   * Gets the current ACES contrast value.
   * 
   * @returns {number} The current ACES contrast value
   */
  getAcesContrast() {
    return this.controls['acesContrast'].current.value[0];
  }

  /**
   * Sets the exposure value for exposure-based tone mapping.
   * 
   * @param {number} v - The new exposure value
   * @param {number} [delayms=1] - Delay in milliseconds for the transition
   * @param {string} [easing='linear'] - Easing function for the transition
   */
  setExposure(v, delayms = 1, easing = 'linear') {
    this.setControl('exposure', [v], delayms, easing);
  }

  /**
   * Gets the current exposure value.
   * 
   * @returns {number} The current exposure value
   */
  getExposure() {
    return this.controls['exposure'].current.value[0];
  }
  /**
   * Sets the highlight compression value for HDR tone mapping.
   * 
   * @param {number} v - The new highlight compression value
   * @param {number} [delayms=1] - Delay in milliseconds for the transition
   * @param {string} [easing='linear'] - Easing function for the transition
   */
  setHighlightCompression(v, delayms = 1, easing = 'linear') {
    this.setControl('highlightCompression', [v], delayms, easing);
  }
  /**
   * Gets the current highlight compression value.
   * 
   * @returns {number} The current highlight compression value
   */
  getHighlightCompression() {
    return this.controls['highlightCompression'].current.value[0];
  }

  /**
   * Retrieves statistical information about the raster data.
   * 
   * @returns {Object} An object containing statistical information (e.g., maxValue, avgLuminance)
   */
  getStatInfo() {
    return this.rasters[0].getStatInfo();
  }

  /**
   * Interpolates control values and updates the shader with the current parameters.
   * 
   * @returns {boolean} Whether the interpolation is complete
   */
  interpolateControls() {
    const done = super.interpolateControls();
    const whitePoint = this.getWhitePoint();
    const shadowLift = this.getShadowLift();
    const acesContrast = this.getAcesContrast();
    const exposure = this.getExposure();
    const highlightCompression = this.getHighlightCompression();

    this.shader.setWhitePoint(whitePoint);
    this.shader.setShadowLift(shadowLift);
    this.shader.setAcesContrast(acesContrast);
    this.shader.setExposure(exposure);
    this.shader.setHighlightCompression(highlightCompression);

    return done;
  }
}

/**
 * Registers this layer type with the Layer factory.
 * 
 * @type {Function}
 * @private
 */
Layer.prototype.types['hdr'] = (options) => { return new LayerHDR(options); }

export { LayerHDR }