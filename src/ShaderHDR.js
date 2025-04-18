import { Shader } from './Shader.js';

/**
 * ShaderHDR extends the base Shader class to provide specialized
 * tone mapping and HDR processing capabilities for 16-bit image data.
 * 
 * Features:
 * - Multiple tone mapping operators (Reinhard, ACES, Filmic, Uncharted2, Raw)
 * - Exposure control
 * - Gamma correction
 * - White point adjustment
 * - Debug visualization options
 *
 * @extends Shader
 */
class ShaderHDR extends Shader {
  /**
   * Creates a new HDR shader.
   * @param {Object} options - Shader configuration options
   * @param {string} [options.mode='reinhard'] - Initial tone mapping operator
   * @param {number} [options.exposure=0.0] - Initial exposure value
   * @param {number} [options.gamma=2.2] - Gamma correction value
   * @param {Array} [options.samplers=[]] - Texture sampler definitions
   * @param {Object} [options.uniforms={}] - Additional uniform variables
   * @param {boolean} [options.debug=false] - Enable debug output
   */
  constructor(options) {
    // Default sampler if none provided
    const defaultSamplers = [
      { id: 0, name: 'hdrSource', type: 'color' }
    ];

    // Merge with provided options
    const mergedOptions = {
      debug: options?.debug || false,
      samplers: options?.samplers || defaultSamplers,
      label: options?.label || 'HDR Shader',
      modes: ['reinhard', 'aces', 'filmic', 'uncharted2', 'raw'],
      mode: options?.mode || 'reinhard',
      uniforms: {
        // Exposure control (EV)
        u_exposure: {
          type: 'float',
          needsUpdate: true,
          value: options?.exposure !== undefined ? options.exposure : 0.0
        },
        // Gamma correction
        u_gamma: {
          type: 'float',
          needsUpdate: true,
          value: options?.gamma !== undefined ? options.gamma : 2.2
        },
        // White point for tone mapping
        u_white: {
          type: 'float',
          needsUpdate: true,
          value: options?.whitePoint !== undefined ? options.whitePoint : 1.0
        },
        // Debug visualization flag
        u_debug_mode: {
          type: 'bool',
          needsUpdate: true,
          value: false
        },
        ...(options?.uniforms || {})
      }
    };

    if (mergedOptions.debug) {
      console.log("ShaderHDR constructor options:", mergedOptions);
    }

    // Call parent constructor
    super(mergedOptions);

    // Store HDR operations for different tone mapping modes
    this.operations = {
      'reinhard': 'color = reinhardToneMapping(hdrColor.rgb);',
      'aces': 'color = acesToneMapping(hdrColor.rgb);',
      'filmic': 'color = filmicToneMapping(hdrColor.rgb);',
      'uncharted2': 'color = uncharted2ToneMapping(hdrColor.rgb);',
      'raw': 'color = rawToneMapping(hdrColor.rgb);'
    };

    if (mergedOptions.debug) {
      console.log(`ShaderHDR initialized with mode: ${this.mode}`);
      console.log(`Available modes: ${this.modes.join(', ')}`);
    }
  }

  /**
   * Updates shader uniforms based on layer controls.
   * @param {WebGL2RenderingContext} gl - WebGL context
   * @override
   */
  updateUniforms(gl) {
    if (this.debug) {
      console.log("ShaderHDR.updateUniforms called");
    }

    // Call parent method to update uniforms in GPU
    super.updateUniforms(gl);
  }

  /**
   * Sets the debug mode flag for visualization.
   * @param {boolean} enabled - Whether to enable debug visualization
   */
  setDebugMode(enabled) {
    this.setUniform('u_debug_mode', enabled);
    if (this.debug) {
      console.log(`Debug visualization ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Provides fragment shader source code.
   * @returns {string} Fragment shader source code
   * @override
   */
  fragShaderSrc() {
    if (this.debug) {
      console.log(`ShaderHDR.fragShaderSrc() called with mode: ${this.mode}`);
    }

    return `
in vec2 v_texcoord;

// Uniforms for HDR processing
uniform float u_exposure;
uniform float u_gamma;
uniform float u_white;
uniform bool u_debug_mode;

// Read HDR data from texture
vec4 readHDR() {
    // Read the 16-bit texture data
    vec4 hdrColor = texture(hdrSource, v_texcoord);
    
    // Convert from normalized range back to actual HDR values
    // For 16-bit uint format, the range is [0, 65535]
    // hdrColor = hdrColor * 65535.0;
    
    // Apply exposure (2^EV)
    hdrColor.rgb *= pow(2.0, u_exposure);
    
    return hdrColor;
}

// Calculate luminance (perceived brightness)
float luminance(vec3 color) {
    return dot(color, vec3(0.2126, 0.7152, 0.0722));
}

// Apply gamma correction
vec3 gammaCorrect(vec3 color, float gamma) {
    return pow(color, vec3(1.0 / gamma));
}

// Reinhard tone mapping operator
vec3 reinhardToneMapping(vec3 color) {
    color *= u_white;
    return color / (1.0 + color);
}

// ACES filmic tone mapping approximation
vec3 acesToneMapping(vec3 color) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    
    color *= u_white;
    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}

// Filmic tone mapping operator
vec3 filmicToneMapping(vec3 color) {
    color *= u_white;
    
    // Filmic curve parameters
    float A = 0.15;
    float B = 0.50;
    float C = 0.10;
    float D = 0.20;
    float E = 0.02;
    float F = 0.30;
    
    vec3 x = max(vec3(0.0), color - vec3(0.004));
    return (x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F) - E / F;
}

// Uncharted 2 tone mapping
vec3 uncharted2ToneMapping(vec3 color) {
    float A = 0.15;
    float B = 0.50;
    float C = 0.10;
    float D = 0.20;
    float E = 0.02;
    float F = 0.30;
    float W = 11.2;
    
    color *= u_white;
    
    // Uncharted 2 filmic operator
    vec3 curr = ((color * (A * color + C * B) + D * E) / (color * (A * color + B) + D * F)) - E / F;
    
    // Also apply to white
    vec3 whiteScale = 1.0 / (((W * (A * W + C * B) + D * E) / (W * (A * W + B) + D * F)) - E / F);
    
    return curr * whiteScale;
}

// Raw mode (linear mapping with simple clamp)
vec3 rawToneMapping(vec3 color) {
    return clamp(color * u_white, 0.0, 1.0);
}

// Debug visualization of HDR values
vec3 debugVisualization(vec3 color, float originalLum) {
    // Color code based on luminance range
    if (originalLum > 10.0) return vec3(1.0, 0.0, 0.0); // Red for very bright areas
    if (originalLum > 5.0) return vec3(1.0, 1.0, 0.0);  // Yellow for bright areas
    if (originalLum > 1.0) return vec3(0.0, 1.0, 0.0);  // Green for mid-range
    if (originalLum > 0.5) return vec3(0.0, 0.0, 1.0);  // Blue for darker areas
    return vec3(0.5, 0.0, 0.5);                        // Purple for very dark areas
}

vec4 data() {
    vec4 hdrColor = readHDR();
    
    // Store original luminance for debug mode
    float originalLum = luminance(hdrColor.rgb);
    
    vec3 color;
    
    // Choose tone mapping operator based on current mode
    ${this.getModeSpecificCode()}
    
    // Apply gamma correction
    color = gammaCorrect(color, u_gamma);
    
    // Debug visualization if enabled
    if (u_debug_mode) {
        color = debugVisualization(color, originalLum);
    }
    
    return vec4(color, hdrColor.a);
}
`;
  }

  /**
   * Generates mode-specific code based on current tone mapping operator.
   * @returns {string} GLSL code for current tone mapping operation
   * @private
   */
  getModeSpecificCode() {
    if (!this.mode || !this.operations[this.mode]) {
      if (this.debug) {
        console.warn(`Unknown mode: ${this.mode}, falling back to reinhard`);
      }
      return this.operations['reinhard'];
    }

    if (this.debug) {
      console.log(`Using tone mapping operation: ${this.mode}`);
    }

    return this.operations[this.mode];
  }

  /**
   * Sets the tone mapping mode.
   * @param {string} mode - New tone mapping mode
   * @override
   */
  setMode(mode) {
    if (this.debug) {
      console.log(`ShaderHDR.setMode: ${mode}`);
    }

    if (this.modes.indexOf(mode) === -1) {
      console.error(`ShaderHDR: Unknown tone mapping mode: ${mode}`);
      console.error(`Available modes: ${this.modes.join(', ')}`);
      return;
    }

    const oldMode = this.mode;
    this.mode = mode;
    this.needsUpdate = true;

    if (this.debug) {
      console.log(`ShaderHDR: Mode changed from ${oldMode} to ${mode}`);
    }

    this.emit('update');
  }
}

export { ShaderHDR };