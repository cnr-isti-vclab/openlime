import { Layer } from './Layer.js';
import { Raster16Bit } from './Raster16Bit.js';
import { ShaderHDR } from './ShaderHDR.js';
import { Layout } from './Layout.js';

/**
 * LayerHDR extends Layer to handle High Dynamic Range (HDR) images
 * with advanced rendering and processing capabilities.
 * 
 * Key Features:
 * - Supports 16-bit float and integer texture formats
 * - Advanced tone mapping techniques
 * - Dynamic exposure and gamma control
 * - Custom data loading for various HDR formats
 * - Extensive debug and visualization options
 * 
 * @extends Layer
 */
class LayerHDR extends Layer {
  /**
   * Creates a new HDR layer with flexible configuration options.
   * 
   * @param {Object} options - Layer configuration parameters
   * @param {string} options.url - Source URL for the HDR image
   * @param {string} [options.format='rgb16ui'] - Texture data format 
   * @param {Object} [options.hdrOptions] - HDR-specific rendering parameters
   * @param {number} [options.hdrOptions.exposure=0.0] - Initial exposure value
   * @param {number} [options.hdrOptions.gamma=2.2] - Gamma correction value
   * @param {string} [options.hdrOptions.toneMapping='reinhard'] - Tone mapping algorithm
   * @param {boolean} [options.hdrOptions.autoExposure=false] - Automatic exposure adjustment
   * @param {Function} [options.dataLoader] - Custom data loading function
   * @param {boolean} [options.debug=false] - Enable detailed logging
   */
  constructor(options) {
    // Ensure HDR layer type is registered
    if (!Layer.prototype.types.hdr) {
      Layer.prototype.types.hdr = (opts) => new LayerHDR(opts);
    }

    // Define default configuration
    const defaultOptions = {
      format: 'rgb16ui',
      hdrOptions: {
        exposure: 0.0,
        gamma: 2.2,
        toneMapping: 'reinhard',
        autoExposure: false
      },
      layout: 'image',
      debug: false
    };

    // Merge user options with defaults
    const mergedOptions = {
      ...defaultOptions,
      ...options,
      hdrOptions: {
        ...defaultOptions.hdrOptions,
        ...(options.hdrOptions || {})
      }
    };

    // Initialize base layer
    super(mergedOptions);

    // Store HDR-specific configuration
    this.hdrOptions = mergedOptions.hdrOptions;
    this.format = mergedOptions.format;
    this.dataLoader = options.dataLoader;
    this.dataLoaderOptions = options.dataLoaderOptions || {};

    // Initialize HDR layer components
    this._initHDRLayer(mergedOptions);

  }

  /**
   * Initializes HDR layer components: raster, shader, and controls.
   * 
   * @private
   * @param {Object} options - Layer initialization options
   */
  _initHDRLayer(options) {
    try {
      // Create 16-bit HDR raster
      const raster = new Raster16Bit({
        format: this.format,
        isLinear: true,
        useHalfFloat: true,
        dataLoader: this.dataLoader,
        dataLoaderOptions: this.dataLoaderOptions,
        debug: this.debug
      });

      // Add raster to layer
      this.rasters.push(raster);

      // Create HDR shader
      const shader = new ShaderHDR({
        mode: this.hdrOptions.toneMapping,
        exposure: this.hdrOptions.exposure,
        gamma: this.hdrOptions.gamma,
        samplers: [{ id: 0, name: 'hdrSource', type: 'color' }],
        debug: this.debug
      });

      // Add shader to layer
      this.addShader('hdr', shader);

      // Initialize shader controls
      this._initControls();

      // Set default shader
      this.setShader('hdr');

    } catch (error) {
      console.error("HDR Layer Initialization Error:", error);
    }
  }

   /**
   * Override del metodo loadTile per gestire il caricamento personalizzato
   */
   loadTile(tile, callback) {
    // Se non è definito un dataLoader personalizzato, usa il metodo standard
    if (!this.dataLoader) {
      return super.loadTile(tile, callback);
    }

    // Gestisco il caricamento personalizzato delle tile
    const loadHDRTile = async () => {
      try {
        // Usa il dataLoader personalizzato
        const imageData = await this.dataLoader(tile, this.gl, {
          ...this.dataLoaderOptions,
          debug: this.debug
        });

        // Usa il primo raster HDR
        const raster = this.rasters[0];

        // Carica la texture
        const tex = raster.loadTexture(this.gl, imageData);

        // Aggiorna le informazioni della tile
        tile.tex[0] = tex;
        tile.w = imageData.width;
        tile.h = imageData.height;
        tile.missing = 0;
        tile.size = imageData.width * imageData.height * imageData.channels * 2;

        // Emetti l'aggiornamento
        this.emit('update');

        // Chiama la callback di successo
        if (callback) callback(null, tile.size);

      } catch (error) {
        console.error(`Errore nel caricamento della tile HDR ${tile.index}:`, error);
        if (callback) callback(error);
      }
    };

    // Eseguo il caricamento asincrono
    loadHDRTile();
  }

  /**
   * Initializes controls for HDR parameters.
   * @private
   */
  _initControls() {
    if (this.debug) {
      console.log("LayerHDR._initControls called");
    }

    try {
      // Add exposure control
      this.addControl('exposure', [this.hdrOptions.exposure]);

      // Add gamma correction control
      this.addControl('gamma', [this.hdrOptions.gamma]);

      // Add white point control (for some tone mapping operators)
      this.addControl('whitePoint', [1.0]);

      if (this.debug) {
        console.log("HDR controls initialized:", {
          exposure: this.hdrOptions.exposure,
          gamma: this.hdrOptions.gamma,
          whitePoint: 1.0
        });
      }
    } catch (error) {
      console.error("Error initializing HDR controls:", error);
    }
  }

  /**
   * Sets the HDR exposure value.
   * @param {number} value - Exposure value (-10 to 10)
   * @param {number} [duration=0] - Animation duration in ms
   * @param {string} [easing='linear'] - Easing function
   */
  setExposure(value, duration = 0, easing = 'linear') {
    if (this.debug) {
      console.log(`LayerHDR.setExposure(${value}, ${duration}, ${easing})`);
    }

    this.setControl('exposure', [value], duration, easing);
  }

  /**
   * Sets the gamma correction value.
   * @param {number} value - Gamma value (typically 1.0 to 3.0)
   * @param {number} [duration=0] - Animation duration in ms
   * @param {string} [easing='linear'] - Easing function
   */
  setGamma(value, duration = 0, easing = 'linear') {
    if (this.debug) {
      console.log(`LayerHDR.setGamma(${value}, ${duration}, ${easing})`);
    }

    this.setControl('gamma', [value], duration, easing);
  }

  /**
   * Sets the white point for tone mapping.
   * @param {number} value - White point value
   * @param {number} [duration=0] - Animation duration in ms
   * @param {string} [easing='linear'] - Easing function
   */
  setWhitePoint(value, duration = 0, easing = 'linear') {
    if (this.debug) {
      console.log(`LayerHDR.setWhitePoint(${value}, ${duration}, ${easing})`);
    }

    this.setControl('whitePoint', [value], duration, easing);
  }

  /**
   * Sets the tone mapping operator.
   * @param {string} operator - Tone mapping operator ('reinhard', 'filmic', 'aces', 'uncharted2', 'raw')
   */
  setToneMapping(operator) {
    if (this.debug) {
      console.log(`LayerHDR.setToneMapping(${operator})`);
    }

    if (this.shader) {
      this.setMode(operator);
    }
  }

  /**
   * Overrides draw method to add HDR-specific debug functionality.
   * @param {Transform} transform - Current view transform
   * @param {Object} viewport - Current viewport parameters
   * @returns {boolean} Whether all animations are complete
   * @override
   */
  draw(transform, viewport) {
    if (this.debug) {
      console.log("LayerHDR.draw called");

      // Print current HDR controls state
      for (const [key, control] of Object.entries(this.controls)) {
        console.log(`Control ${key}:`, control.current.value[0]);
      }

      // Print current shader mode
      if (this.shader) {
        console.log(`Current shader mode: ${this.shader.mode}`);
      }
    }

    // Call parent method to perform the actual drawing
    return super.draw(transform, viewport);
  }

  /**
   * Toggles debug visualization mode.
   * @param {boolean} enabled - Whether to enable debug visualization
   */
  setDebugVisualization(enabled) {
    if (this.shader && this.shader instanceof ShaderHDR) {
      this.shader.setDebugMode(enabled);

      if (this.debug) {
        console.log(`HDR debug visualization ${enabled ? 'enabled' : 'disabled'}`);
      }

      this.emit('update');
    } else {
      console.warn("HDR shader not available for debug visualization");
    }
  }
}

// Register the HDR layer type if not already registered
// (redundant with constructor registration but added for clarity)
Layer.prototype.types.hdr = (options) => new LayerHDR(options);

export { LayerHDR };