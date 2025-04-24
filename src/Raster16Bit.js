import { Raster } from './Raster.js';

/**
* @typedef {('r16f'|'rg16f'|'rgb16f'|'rgba16f'|'r16ui'|'rg16ui'|'rgb16ui'|'rgba16ui'|'r16i'|'rg16i'|'rgb16i'|'rgba16i'|'depth16')} Raster16Bit#Format
* Defines the 16-bit format for image data storage in textures.
* @property {'r16f'} r16f - Single-channel 16-bit floating point format
* @property {'rg16f'} rg16f - Two-channel 16-bit floating point format
* @property {'rgb16f'} rgb16f - Three-channel 16-bit floating point format
* @property {'rgba16f'} rgba16f - Four-channel 16-bit floating point format
* @property {'r16ui'} r16ui - Single-channel 16-bit unsigned integer format
* @property {'rg16ui'} rg16ui - Two-channel 16-bit unsigned integer format
* @property {'rgb16ui'} rgb16ui - Three-channel 16-bit unsigned integer format
* @property {'rgba16ui'} rgba16ui - Four-channel 16-bit unsigned integer format
* @property {'r16i'} r16i - Single-channel 16-bit signed integer format
* @property {'rg16i'} rg16i - Two-channel 16-bit signed integer format
* @property {'rgb16i'} rgb16i - Three-channel 16-bit signed integer format
* @property {'rgba16i'} rgba16i - Four-channel 16-bit signed integer format
* @property {'depth16'} depth16 - 16-bit depth texture format
*/

/**
* @typedef {Function} DataLoaderCallback
* @param {Object} tile - The tile information object
* @param {WebGL2RenderingContext} gl - The WebGL2 rendering context
* @param {Object} options - Additional options for the data loader
* @returns {Promise<Object>} The loaded data object with properties:
*   - data: TypedArray or Image data
*   - width: Width of the image
*   - height: Height of the image
*   - channels: Number of channels in the data
*/

/**
* Raster16Bit class extends Raster to handle 16-bit textures with WebGL 2.0.
* Provides functionality for:
* - Loading 16-bit images from URLs or blobs via custom data loaders
* - Converting data to appropriate WebGL 2.0 texture formats
* - Supporting various 16-bit formats (float, int, uint)
* - Creating appropriate texture parameters for 16-bit data
* - Support for custom data loaders for specialized formats
*/
class Raster16Bit extends Raster {
  /**
   * Creates a new Raster16Bit instance.
   * @param {Object} [options] - Configuration options
   * @param {Raster16Bit#Format} [options.format='rgb16ui'] - 16-bit data format
   * @param {boolean} [options.useHalfFloat=false] - Use HALF_FLOAT type instead of FLOAT for better performance when applicable
   * @param {boolean} [options.flipY=false] - Whether to flip the image vertically during loading
   * @param {boolean} [options.premultiplyAlpha=false] - Whether to premultiply alpha during loading
   * @param {DataLoaderCallback} [options.dataLoader=null] - Custom data loader callback
   * @param {Object} [options.dataLoaderOptions={}] - Options to pass to the data loader
   * @param {boolean} [options.debug=false] - Enable debug output
   */
  constructor(options) {
    // Initialize with parent constructor but override defaults
    super(Object.assign({
        format: 'rgb16ui',
        debug: false,
        useHalfFloat: false,
        flipY: false,
        premultiplyAlpha: false,
    }, options));

    // Additional options specific to 16-bit handling
    Object.assign(this, {
        dataLoader: null,
        dataLoaderOptions: {},
        statInfo: {}
    });

    // Override with provided options
    if (options) {
        Object.assign(this, options);
    }

    // Check if the format is supported
    if (!this._isFormatSupported(this.format)) {
        throw new Error(`The format "${this.format}" is not supported by the browser.`);
    }

    if (this.debug) {
        console.log(`Raster16Bit created with format: ${this.format}`);
    }
  }


  
  /**
   * Gets the number of components for the current format
   * @private
   * @returns {number} Number of components (1, 2, 3, or 4)
   */
  _getComponentCount() {
    if (this.format.startsWith('r16') && !this.format.startsWith('rg16') && !this.format.startsWith('rgb16') && !this.format.startsWith('rgba16')) {
      return 1; // Single channel (r16f, r16ui, r16i)
    } else if (this.format.startsWith('rg16')) {
      return 2; // Two channels (rg16f, rg16ui, rg16i)
    } else if (this.format.startsWith('rgb16')) {
      return 3; // Three channels (rgb16f, rgb16ui, rgb16i)
    } else if (this.format.startsWith('rgba16')) {
      return 4; // Four channels (rgba16f, rgba16ui, rgba16i)
    } else if (this.format === 'depth16') {
      return 1; // Depth is single channel
    }
    return 1; // Default to 1 if unknown
  }

  /**
   * Loads a 16-bit image tile and converts it to a WebGL texture.
   * Overrides parent method to handle 16-bit specific formats.
   * @async
   * @param {Object} tile - The tile to load
   * @param {string} tile.url - URL of the image
   * @param {number} [tile.start] - Start byte for partial requests
   * @param {number} [tile.end] - End byte for partial requests
   * @param {WebGL2RenderingContext} gl - The WebGL2 rendering context
   * @returns {Promise<Array>} Promise resolving to [texture, size]:
   *   - texture: WebGLTexture object
   *   - size: Size of the image in bytes (width * height * components * bytesPerComponent)
   * @throws {Error} If context is not WebGL2
   */
  async loadImage(tile, gl) {
    // Ensure we have a WebGL2 context
    if (!(gl instanceof WebGL2RenderingContext)) {
      throw new Error("WebGL2 context is required for 16-bit textures");
    }

    if (this.debug) {
      console.log(`Raster16Bit.loadImage called for URL: ${tile.url}`);
    }

    let imageData;

    // Use the appropriate data loader
    if (this.dataLoader) {
      // Use custom data loader if provided
      if (this.debug) {
        console.log("Using custom data loader");
      }

      try {
        imageData = await this.dataLoader(tile, gl, this.dataLoaderOptions);
        this.statInfo.maxValue = imageData.statistics.maxValue;
        this.statInfo.avgLuminance = imageData.statistics.avgLuminance;
        this.statInfo.percentileLuminance = imageData.statistics.percentileLuminance;
        this.emit('loaded');
        if (this.debug) {
          console.log(`Data loader returned: ${imageData.width}x${imageData.height}, ${imageData.channels} channels`);
        }
      } catch (error) {
        console.error("Error in data loader:", error);
        throw error;
      }
    } else {
      // Use default parent class loading mechanism if no dataLoader provided
      if (this.debug) {
        console.log("Using default loader mechanism");
      }

      try {
        let [tex, size] = await super.loadImage(tile, gl);

        // Adjust size calculation for 16-bit (2 bytes per component)
        size = this.width * this.height * this._getComponentCount() * 2;

        return [tex, size];
      } catch (error) {
        console.error("Error in default loader:", error);
        throw error;
      }
    }

    // Store dimensions
    this.width = imageData.width;
    this.height = imageData.height;

    if (this.debug) {
      console.log(`Creating texture: ${this.width}x${this.height}`);
    }

    // Create texture from the loaded data
    const tex = this._createTextureFromData(gl, imageData.data, imageData.width, imageData.height, imageData.channels);

    // Calculate size in bytes
    const bytesPerComponent = 2; // 16 bits = 2 bytes
    const size = imageData.width * imageData.height * imageData.channels * bytesPerComponent;

    return [tex, size];
  }

  getStatInfo() {
    return this.statInfo;
  }

  /**
   * Creates a WebGL2 texture from raw data.
   * @private
   * @param {WebGL2RenderingContext} gl - The WebGL2 rendering context
   * @param {TypedArray} data - The raw pixel data
   * @param {number} width - Width of the image
   * @param {number} height - Height of the image
   * @param {number} channels - Number of channels in the data
   * @returns {WebGLTexture} The created texture
   */
  _createTextureFromData(gl, data, width, height, channels) {
    if (this.debug) {
      console.log(`Creating texture from data: ${width}x${height}, ${channels} channels, data type: ${data.constructor.name}`);
    }

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);

    // Set texture parameters
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, this.flipY);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this.premultiplyAlpha);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    // Determine format parameters based on format
    const formatParams = this._getFormatParameters(gl, channels);

    if (this.debug) {
      console.log("Format parameters:", formatParams);
    }

    try {
      // Upload data to texture
      gl.texImage2D(
        gl.TEXTURE_2D,                // target
        0,                            // level
        formatParams.internalFormat,  // internalformat
        width,                        // width
        height,                       // height
        0,                            // border
        formatParams.format,          // format
        formatParams.type,            // type
        data                          // pixels
      );
    } catch (error) {
      console.error("Error creating texture:", error);
      throw error;
    }

    // Set filtering and wrapping parameters
    if (width > 1024 || height > 1024) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Store color space information on the texture
    this._texture = tex;

    return tex;
  }

  /**
   * Get format parameters for WebGL texture creation based on format and channels.
   * @private
   * @param {WebGL2RenderingContext} gl - The WebGL2 rendering context
   * @param {number} channels - Number of channels in the data
   * @returns {Object} Object with internalFormat, format, and type properties
   */
  _getFormatParameters(gl, channels) {
    let internalFormat, format, type;

    // Determine format parameters based on the specified format
    if (this.format.includes('16f')) {
      // Floating point formats
      type = this.useHalfFloat ? gl.HALF_FLOAT : gl.FLOAT;

      switch (channels) {
        case 1:
          internalFormat = gl.R16F;
          format = gl.RED;
          break;
        case 2:
          internalFormat = gl.RG16F;
          format = gl.RG;
          break;
        case 3:
          internalFormat = gl.RGB16F;
          format = gl.RGB;
          break;
        case 4:
          internalFormat = gl.RGBA16F;
          format = gl.RGBA;
          break;
        default:
          throw new Error(`Unsupported channel count: ${channels}`);
      }
    } else if (this.format.includes('16ui')) {
      // Unsigned integer formats
      type = gl.UNSIGNED_SHORT;

      switch (channels) {
        case 1:
          internalFormat = gl.R16UI;
          format = gl.RED_INTEGER;
          break;
        case 2:
          internalFormat = gl.RG16UI;
          format = gl.RG_INTEGER;
          break;
        case 3:
          internalFormat = gl.RGB16UI;
          format = gl.RGB_INTEGER;
          break;
        case 4:
          internalFormat = gl.RGBA16UI;
          format = gl.RGBA_INTEGER;
          break;
        default:
          throw new Error(`Unsupported channel count: ${channels}`);
      }
    } else if (this.format.includes('16i')) {
      // Signed integer formats
      type = gl.SHORT;

      switch (channels) {
        case 1:
          internalFormat = gl.R16I;
          format = gl.RED_INTEGER;
          break;
        case 2:
          internalFormat = gl.RG16I;
          format = gl.RG_INTEGER;
          break;
        case 3:
          internalFormat = gl.RGB16I;
          format = gl.RGB_INTEGER;
          break;
        case 4:
          internalFormat = gl.RGBA16I;
          format = gl.RGBA_INTEGER;
          break;
        default:
          throw new Error(`Unsupported channel count: ${channels}`);
      }
    } else if (this.format === 'depth16') {
      // Depth texture
      internalFormat = gl.DEPTH_COMPONENT16;
      format = gl.DEPTH_COMPONENT;
      type = gl.UNSIGNED_SHORT;
    } else {
      throw new Error(`Unsupported format: ${this.format}`);
    }

    return { internalFormat, format, type };
  }

  /**
 * Checks if the specified format is supported by the browser.
 * Also verifies that required WebGL extensions are available.
 * @private
 * @param {string} format - The format to check
 * @returns {boolean} True if the format is supported, false otherwise
 */
_isFormatSupported(format) {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');

    if (!gl) {
        console.error('WebGL2 is not supported by this browser.');
        return false;
    }

    const formatMap = {
        'r16f': { internalFormat: gl.R16F, requiredExtensions: ['EXT_color_buffer_float'] },
        'rg16f': { internalFormat: gl.RG16F, requiredExtensions: ['EXT_color_buffer_float'] },
        'rgb16f': { internalFormat: gl.RGB16F, requiredExtensions: ['EXT_color_buffer_float'] },
        'rgba16f': { internalFormat: gl.RGBA16F, requiredExtensions: ['EXT_color_buffer_float'] },
        'r16ui': { internalFormat: gl.R16UI, requiredExtensions: [] },
        'rg16ui': { internalFormat: gl.RG16UI, requiredExtensions: [] },
        'rgb16ui': { internalFormat: gl.RGB16UI, requiredExtensions: [] },
        'rgba16ui': { internalFormat: gl.RGBA16UI, requiredExtensions: [] },
        'r16i': { internalFormat: gl.R16I, requiredExtensions: [] },
        'rg16i': { internalFormat: gl.RG16I, requiredExtensions: [] },
        'rgb16i': { internalFormat: gl.RGB16I, requiredExtensions: [] },
        'rgba16i': { internalFormat: gl.RGBA16I, requiredExtensions: [] },
        'depth16': { internalFormat: gl.DEPTH_COMPONENT16, requiredExtensions: [] }
    };

    const formatInfo = formatMap[format];
    if (!formatInfo) {
        console.error(`Unknown format: ${format}`);
        return false;
    }

    // Check for required extensions
    for (const extension of formatInfo.requiredExtensions) {
        if (!gl.getExtension(extension)) {
            console.error(`Required WebGL extension "${extension}" is not supported for format "${format}".`);
            return false;
        }
    }

    // Check if the internal format is supported
    const isSupported = gl.getInternalformatParameter(gl.RENDERBUFFER, formatInfo.internalFormat, gl.SAMPLES);
    return isSupported && isSupported.length > 0;
}
}

export { Raster16Bit };