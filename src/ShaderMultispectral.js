import { Shader } from './Shader.js'

/**
 * @typedef {Object} ShaderMultispectral~Options
 * Configuration options for multispectral shader
 * @property {string} [mode='rgb'] - Initial rendering mode
 * @property {boolean} [debug=false] - Enable debug output
 * @property {number[]} [wavelength] - Array of wavelengths (in nm)
 */

/**
 * ShaderMultispectral implements visualization for multispectral imagery.
 * Supports various visualization modes and color transformations.
 * 
 * Features:
 * - Multiple rendering modes (rgb, single band, custom)
 * - Color Twist Weights (CTW) for spectral transformations
 * - Efficient UBO implementation for CTW coefficients
 * - Real-time visualization control
 * - Direct pixel access via texelFetch for scientific precision
 * - Optimized memory access by skipping zero-weight bands
 * 
 * @extends Shader
 */
class ShaderMultispectral extends Shader {
  /**
   * Creates a new multispectral shader
   * @param {ShaderMultispectral~Options} [options] - Configuration options
   */
  constructor(options) {
    super({
      autoSamplerDeclaration: false // We'll handle sampler declarations manually
    });

    Object.assign(this, {
      debug: true,
      modes: ['rgb', 'single_band'],
      mode: 'rgb',
      wavelength: [],
      nplanes: 0,
      nimg: 0,
      blockIndex: null,
      uboBuffer: null,
      MAX_SUPPORTED_PLANES: 33, // Maximum number of planes supported (33 bands = 11 RGB textures)
      MAX_TEXTURES: 11         // Maximum number of textures we can use
    });

    Object.assign(this, options);

    // Set default uniforms
    this.uniforms = {
      selectedBand: { type: 'int', needsUpdate: true, value: 0 },
      bandOutputChannel: { type: 'int', needsUpdate: true, value: 0 }, // 0=R, 1=G, 2=B
      textureSize: { type: 'vec2', needsUpdate: true, value: [0, 0] }
    };

    // Set default mode
    this.setMode(this.mode);
  }

  /**
   * Sets the rendering mode
   * @param {string} mode - One of: 'rgb', 'single_band', 'custom'
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
   * @param {Object} info - Multispectral configuration
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
   * Sets up UBO for Color Twist Weights
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
   * Sets single band view parameters
   * @param {number} bandIndex - Index of band to view
   * @param {number} outputChannel - Output channel (0=R, 1=G, 2=B)
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
   * Sets texture dimensions for texelFetch calculations
   * @param {number[]} size - Texture dimensions [width, height]
   */
  setTextureSize(size) {
    this.setUniform('textureSize', size);
  }

  /**
     * Override fragment shader source generation to use constant indices
     * and optimize memory access by skipping zero-weight bands
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
uniform vec2 textureSize;

in vec2 v_texcoord;

// Utility function to get a specific band from the multispectral data
// Using texelFetch for precise pixel access
float getBand(int bandIndex) {
  // Convert texture coordinates to integer pixel coordinates
  ivec2 texCoord = ivec2(v_texcoord * textureSize);
  
  // Handling each possible band with constant indices
`;

    // Generate band access logic with constant indices
    for (let i = 0; i < this.nplanes; i++) {
      const planeIndex = Math.floor(i / 3);
      const channelIndex = i % 3;

      if (planeIndex >= this.MAX_TEXTURES) continue; // Skip if we exceed maximum texture units

      const channelComponent = channelIndex === 0 ? 'r' : (channelIndex === 1 ? 'g' : 'b');

      src += `    if (bandIndex == ${i}) return texelFetch(plane${planeIndex}, texCoord, 0).${channelComponent};\n`;
    }

    src += `    
  return 0.0; // Default return for out-of-range bands
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
  float redNorm = normalizeCTWChannel(ctwRedVec4);
  float greenNorm = normalizeCTWChannel(ctwGreenVec4);
  float blueNorm = normalizeCTWChannel(ctwBlueVec4);
  
  // Calculate linear combination for all channels with optimization
`;

      // Unroll the loop for better performance and to use constant indices
      for (let i = 0; i < this.nplanes; i++) {
        src += `
  // Band ${i} processing
  if (hasNonZeroCTW(${i})) {
      float value${i} = getBand(${i});
      rgb.r += value${i} * ctwRedVec4[${i}].x / redNorm;
      rgb.g += value${i} * ctwGreenVec4[${i}].x / greenNorm;
      rgb.b += value${i} * ctwBlueVec4[${i}].x / blueNorm;
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
  if (bandOutputChannel == 1) rgb.r = value;
  else if (bandOutputChannel == 2) rgb.g = value;
  else if (bandOutputChannel == 3) rgb.b = value;
  
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