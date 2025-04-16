import { Shader } from './Shader.js'

/**
 * @typedef {Object} ShaderMultispectralOptions
 * @property {string} [mode='rgb'] - Initial rendering mode ('rgb' or 'single_band')
 * @property {boolean} [debug=false] - Enable debug output in console
 * @property {number[]} [wavelength] - Array of wavelengths in nanometers
 */

/**
 * ShaderMultispectral - WebGL2 shader implementation for multispectral visualization
 * 
 * This shader handles the real-time rendering of multispectral imagery with 
 * various visualization modes and Color Twist Weight (CTW) transformations.
 * It leverages WebGL2 features such as Uniform Buffer Objects (UBO) for
 * efficient handling of CTW coefficients and texture() for consistent texture sampling.
 * 
 * Features:
 * - Multiple rendering modes (RGB, single band)
 * - UBO-based Color Twist Weights for spectral transformations
 * - Optimized memory access by skipping zero-weight bands
 * - Support for up to 33 spectral bands (11 RGB textures)
 * - Compatible with both single images and tile-based formats (DeepZoom, etc.)
 * 
 * Technical implementation:
 * - Efficient std140 UBO layout for CTW coefficients
 * - Loop unrolling for faster rendering
 * - Optimized band access with constant indices
 * 
 * @extends Shader
 */
class ShaderMultispectral extends Shader {
  /**
   * Creates a new multispectral shader
   * 
   * @param {ShaderMultispectralOptions} [options] - Configuration options
   */
  constructor(options) {
    super({
      autoSamplerDeclaration: false // We'll handle sampler declarations manually
    });

    // Set default properties
    Object.assign(this, {
      debug: false,
      modes: ['rgb', 'single_band'],
      mode: 'rgb',
      wavelength: [],
      nplanes: 0,        // Number of spectral planes (bands)
      nimg: 0,           // Number of images (textures)
      blockIndex: null,  // UBO block index
      uboBuffer: null,   // UBO buffer object
      MAX_SUPPORTED_PLANES: 33, // Maximum number of planes supported (33 bands = 11 RGB textures)
      MAX_TEXTURES: 11         // Maximum number of textures we can use
    });

    // Apply user options
    Object.assign(this, options);

    // Set default uniforms
    this.uniforms = {
      selectedBand: { type: 'int', needsUpdate: true, value: 0 },
      bandOutputChannel: { type: 'int', needsUpdate: true, value: 0 }, // 0=all/gray, 1=R, 2=G, 3=B
    };

    // Set default mode
    this.setMode(this.mode);
  }

  /**
   * Sets the rendering mode
   * 
   * Changes how multispectral data is visualized:
   * - 'rgb': Uses CTW coefficients to create RGB visualization
   * - 'single_band': Shows a single spectral band
   * 
   * @param {string} mode - Visualization mode ('rgb', 'single_band')
   * @throws {Error} If mode is not recognized
   */
  setMode(mode) {
    if (!this.modes.includes(mode))
      throw new Error("Unknown mode: " + mode);

    const prevMode = this.mode;
    this.mode = mode;
    this.needsUpdate = true;

    // Emit update event with mode information
    this.emit('update', { mode: mode, previousMode: prevMode });
  }

  /**
   * Initializes shader with multispectral configuration
   * 
   * Sets up wavelength information, calculates the number of required textures,
   * and configures samplers for each texture.
   * 
   * @param {Object} info - Multispectral configuration object from info.json
   */
  init(info) {
    if (info.wavelength) {
      this.wavelength = info.wavelength;
      this.nplanes = this.wavelength.length;

      if (this.nplanes > this.MAX_SUPPORTED_PLANES) {
        console.warn(`Warning: ${this.nplanes} planes detected, but only ${this.MAX_SUPPORTED_PLANES} are supported. Some bands will be ignored.`);
        this.nplanes = this.MAX_SUPPORTED_PLANES;
      }

      // Calculate how many textures we need (3 bands per texture)
      this.nimg = Math.ceil(this.nplanes / 3);

      // Clear existing samplers
      this.samplers = [];

      // Create samplers for each jpeg texture (up to MAX_TEXTURES)
      const maxTextures = Math.min(this.nimg, this.MAX_TEXTURES);
      for (let i = 0; i < maxTextures; i++) {
        this.samplers.push({ id: i, name: `plane${i}`, type: 'vec3' });
      }
    }

    this.needsUpdate = true;
  }

  /**
   * Sets up Uniform Buffer Object for Color Twist Weights
   * 
   * Creates and configures a UBO for efficient handling of CTW coefficients.
   * Uses WebGL2's std140 layout for optimal performance.
   * 
   * @param {WebGL2RenderingContext} gl - WebGL2 context
   * @param {Float32Array} redCTW - Red channel CTW coefficients
   * @param {Float32Array} greenCTW - Green channel CTW coefficients
   * @param {Float32Array} blueCTW - Blue channel CTW coefficients
   */
  setupCTW(gl, redCTW, greenCTW, blueCTW) {
    if (!gl) return;

    // Ensure we have a valid block index
    if (this.blockIndex === null && this.program) {
      this.blockIndex = gl.getUniformBlockIndex(this.program, "CTWBlock");
      if (this.blockIndex === gl.INVALID_INDEX) {
        console.error("Failed to get UBO block index for CTWBlock");
        return;
      }
    }

    // Create UBO if it doesn't exist
    if (!this.uboBuffer) {
      this.uboBuffer = gl.createBuffer();
    }

    // Calculate buffer size for std140 layout
    // Each array in std140 needs to be aligned to 16 bytes boundaries
    // and each element may need vec4 (16 byte) alignment
    const elementsPerArray = this.nplanes;
    const bytesPerElement = 4; // float32 = 4 bytes

    // Calculate std140 aligned size for a single array
    // For an array of floats in std140, each element takes up 16 bytes (vec4 alignment)
    const arrayStride = 16; // vec4 alignment in std140
    const alignedArraySize = arrayStride * elementsPerArray;

    // Total buffer size for 3 arrays (R, G, B)
    const uboSize = alignedArraySize * 3;

    // Bind and initialize the buffer
    gl.bindBuffer(gl.UNIFORM_BUFFER, this.uboBuffer);
    gl.bufferData(gl.UNIFORM_BUFFER, uboSize, gl.DYNAMIC_DRAW);

    // Create temporary buffers with proper std140 alignment
    const tempBuffer = new ArrayBuffer(uboSize);
    const float32View = new Float32Array(tempBuffer);

    // Fill temp buffer with std140 layout - R values
    for (let i = 0; i < elementsPerArray; i++) {
      // Each float is at index i*4 (because we're skipping 3 padding floats per element)
      float32View[i * 4] = redCTW[i];
    }

    // Fill temp buffer with std140 layout - G values
    const gOffset = alignedArraySize / 4; // offset in float32 elements
    for (let i = 0; i < elementsPerArray; i++) {
      float32View[gOffset + i * 4] = greenCTW[i];
    }

    // Fill temp buffer with std140 layout - B values
    const bOffset = (alignedArraySize * 2) / 4; // offset in float32 elements
    for (let i = 0; i < elementsPerArray; i++) {
      float32View[bOffset + i * 4] = blueCTW[i];
    }

    // Upload the entire aligned buffer
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, float32View);

    // Bind the buffer to binding point 0
    gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, this.uboBuffer);

    // Link the uniform block to the binding point
    if (this.program && this.blockIndex !== gl.INVALID_INDEX) {
      gl.uniformBlockBinding(this.program, this.blockIndex, 0);
    }

    // Store current CTW values
    this._currentCTW = {
      red: redCTW,
      green: greenCTW,
      blue: blueCTW
    };
  }

  /**
   * Sets single band visualization
   * 
   * Configures the shader to display a specific spectral band
   * on a chosen output channel.
   * 
   * @param {number} bandIndex - Index of band to view
   * @param {number} outputChannel - Output channel (0=all/gray, 1=R, 2=G, 3=B)
   * @throws {Error} If band index is out of range
   */
  setSingleBand(bandIndex, outputChannel = 0) {
    if (bandIndex < 0 || bandIndex >= this.nplanes) {
      throw new Error(`Band index ${bandIndex} out of range [0-${this.nplanes - 1}]`);
    }

    this.setUniform('selectedBand', bandIndex);
    this.setUniform('bandOutputChannel', outputChannel);
    this.setMode('single_band');
  }

  /**
   * Sets texture dimensions for calculations
   * 
   * No longer needed since we're using normalized coordinates
   * @deprecated Use normalized texture coordinates instead
   */
  setTextureSize(size) {
    // No longer needed - we use normalized coordinates
  }

  /**
   * Generate fragment shader source code
   * 
   * Creates optimized GLSL code for multispectral visualization.
   * Uses texture() with normalized coordinates instead of texelFetch.
   * 
   * @override
   * @returns {string} GLSL fragment shader source code
   */
  fragShaderSrc() {
    // Individual texture samplers declaration
    let src = '';

    // Declare each texture sampler individually
    for (let i = 0; i < this.nimg && i < this.MAX_TEXTURES; i++) {
      src += `uniform sampler2D plane${i};\n`;
    }

    src += `
// UBO for Color Twist Weights (CTW)
// std140 layout requires special alignment
layout(std140) uniform CTWBlock {
  // Each element in std140 array is aligned to vec4 (16 bytes)
  // We use a vec4 instead of float to make alignment explicit
  vec4 ctwRedVec4[${this.nplanes}];
  vec4 ctwGreenVec4[${this.nplanes}];
  vec4 ctwBlueVec4[${this.nplanes}];
};

// Uniforms for single band mode
uniform int selectedBand;
uniform int bandOutputChannel;

in vec2 v_texcoord;

// Utility function to get a specific band from the multispectral data
// Using texture() with normalized coordinates for better compatibility
float getBand(int bandIndex) {
  float result = 0.0;
  
  // Handling each possible band with constant indices
`;

    // Generate band access logic with constant indices
    for (let i = 0; i < this.nplanes; i++) {
      const planeIndex = Math.floor(i / 3);
      const channelIndex = i % 3;

      if (planeIndex >= this.MAX_TEXTURES) continue; // Skip if we exceed maximum texture units

      const channelComponent = channelIndex === 0 ? 'r' : (channelIndex === 1 ? 'g' : 'b');

      src += `    if (bandIndex == ${i}) result = texture(plane${planeIndex}, v_texcoord).${channelComponent};\n`;
    }

    src += `    
  return result; // Default return for out-of-range bands
}

// Check if a band has any non-zero CTW values to optimize memory access
bool hasNonZeroCTW(int bandIndex) {
  // Access the x component of each vec4 (where we store the actual value)
  float r = ctwRedVec4[bandIndex].x;
  float g = ctwGreenVec4[bandIndex].x;
  float b = ctwBlueVec4[bandIndex].x;
  return r != 0.0 || g != 0.0 || b != 0.0;
}

// Normalize CTW for a single channel
float normalizeCTWChannel(vec4 ctwChannel[${this.nplanes}]) {
  float totalWeight = 0.0;
  
  // Compute total absolute weight for the channel
  for (int i = 0; i < ${this.nplanes}; i++) {
      totalWeight += abs(ctwChannel[i].x);
  }
  
  // Return normalization factor (avoid division by zero)
  return totalWeight > 0.0 ? totalWeight : 1.0;
}

vec4 data() {
`;

    // RGB mode implementation with advanced normalization
    if (this.mode === 'rgb') {
      src += `
  // RGB mode - Linear combination with channel-specific normalization
  vec3 rgb = vec3(0.0);
  
  // Normalize weights for each channel
  //float redNorm = normalizeCTWChannel(ctwRedVec4);
  //float greenNorm = normalizeCTWChannel(ctwGreenVec4);
  //float blueNorm = normalizeCTWChannel(ctwBlueVec4);
  
  // Calculate linear combination for all channels with optimization
`;

      // Unroll the loop for better performance and to use constant indices
      for (let i = 0; i < this.nplanes; i++) {
        src += `
  // Band ${i} processing
  if (hasNonZeroCTW(${i})) {
      float value${i} = getBand(${i});
      rgb.r += value${i} * ctwRedVec4[${i}].x;
      rgb.g += value${i} * ctwGreenVec4[${i}].x;
      rgb.b += value${i} * ctwBlueVec4[${i}].x;
  }`;
      }

      src += `
  
  // Additional normalization to ensure output is in [0,1]
  //vec3 absRgb = abs(rgb);
  //float maxVal = max(max(absRgb.r, absRgb.g), absRgb.b);
  
  // Normalize to preserve relative magnitudes and sign
  //if (maxVal > 1.0) {
  //    rgb /= maxVal;
  //}

  //return srgb2linear(vec4(rgb, 1.0));
  return vec4(rgb, 1.0);
`;
    } else if (this.mode === 'single_band') {
      src += `
  // Single band mode - Show one band in a specific channel
  float value = getBand(selectedBand);
  
  // Output to specified channel
  vec3 rgb = vec3(value, value, value);
  if (bandOutputChannel == 1) rgb = vec3(value, 0.0, 0.0);
  else if (bandOutputChannel == 2) rgb = vec3(0.0, value, 0.0);
  else if (bandOutputChannel == 3) rgb = vec3(0.0, 0.0, value);
  
  return vec4(rgb, 1.0);
`;
    } else {
      // Default fallback
      src += `
  // Default mode fallback
  return vec4(0.5, 0.5, 0.5, 1.0);
`;
    }

    src += `
}`;

    return src;
  }

  /**
   * Creates WebGL shader program with UBO support
   * 
   * Extends the base shader program creation to setup UBO bindings.
   * 
   * @param {WebGL2RenderingContext} gl - WebGL2 context
   * @override
   */
  createProgram(gl) {
    super.createProgram(gl);

    // Get uniform block index for CTW
    if (this.program) {
      this.blockIndex = gl.getUniformBlockIndex(this.program, "CTWBlock");

      // Check if UBO is supported
      if (this.blockIndex === gl.INVALID_INDEX) {
        console.error("Uniform block CTWBlock not found");
      } else {
        // Bind the block to binding point 0
        gl.uniformBlockBinding(this.program, this.blockIndex, 0);
      }
    }
  }
}

export { ShaderMultispectral }