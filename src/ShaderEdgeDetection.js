import { Shader } from './Shader.js';

/**
 * ShaderEdgeDetection extends the base Shader class to implement
 * a Sobel edge detection filter on input textures.
 * 
 * The shader detects edges by calculating gradients in both 
 * horizontal and vertical directions using Sobel operators.
 */
class ShaderEdgeDetection extends Shader {
  /**
   * Creates a new EdgeDetectionShader instance.
   * @param {Object} [options] - Configuration options passed to parent Shader
   * @param {number} [options.threshold=0.1] - Edge detection threshold (0.0-1.0)
   * @param {boolean} [options.colorEdges=false] - Whether to preserve edge colors
   */
  constructor(options = {}) {
    // Set default options for edge detection
    const edgeOptions = Object.assign({
      threshold: 0.1,
      colorEdges: false,
      uniforms: {
        threshold: { type: 'float', value: 0.1, needsUpdate: true },
        colorEdges: { type: 'bool', value: false, needsUpdate: true }
      },
      samplers: [
        { id: 0, name: 'source', label: 'Color', samplers: [{ id: 0, type: 'color' }] }
      ],
      label: 'Edge Detection',
      modes: ['sobel', 'prewitt'],
      mode: 'sobel'
    }, options);

    super(edgeOptions);

    // Set threshold from options
    if (options.threshold !== undefined) {
      this.setUniform('threshold', options.threshold);
    }

    // Set color mode from options
    if (options.colorEdges !== undefined) {
      this.setUniform('colorEdges', options.colorEdges);
    }
  }

  /**
   * Override fragment shader source to implement edge detection.
   * This version is compatible with both WebGL 1.0 and 2.0+.
   * @param {WebGLRenderingContext} gl - WebGL context
   * @returns {string} Fragment shader source code
   */
  fragShaderSrc(gl) {
    // Check if we're using WebGL2
    let gl2 = !(gl instanceof WebGLRenderingContext);

    return `

uniform float threshold;
uniform bool colorEdges;

${gl2 ? 'in' : 'varying'} vec2 v_texcoord;

// Calculate texture offset based on tile size
vec2 texelSize = vec2(1.0) / tileSize;

vec4 data() {
  // Sample the 3x3 neighborhood around the current pixel
  vec4 tl = texture${gl2 ? '' : '2D'}(source, v_texcoord + texelSize * vec2(-1, -1));
  vec4 t  = texture${gl2 ? '' : '2D'}(source, v_texcoord + texelSize * vec2( 0, -1));
  vec4 tr = texture${gl2 ? '' : '2D'}(source, v_texcoord + texelSize * vec2( 1, -1));
  vec4 l  = texture${gl2 ? '' : '2D'}(source, v_texcoord + texelSize * vec2(-1,  0));
  vec4 c  = texture${gl2 ? '' : '2D'}(source, v_texcoord);
  vec4 r  = texture${gl2 ? '' : '2D'}(source, v_texcoord + texelSize * vec2( 1,  0));
  vec4 bl = texture${gl2 ? '' : '2D'}(source, v_texcoord + texelSize * vec2(-1,  1));
  vec4 b  = texture${gl2 ? '' : '2D'}(source, v_texcoord + texelSize * vec2( 0,  1));
  vec4 br = texture${gl2 ? '' : '2D'}(source, v_texcoord + texelSize * vec2( 1,  1));
  
  // Convert to grayscale for edge detection
  float tlGray = dot(tl.rgb, vec3(0.299, 0.587, 0.114));
  float tGray  = dot(t.rgb, vec3(0.299, 0.587, 0.114));
  float trGray = dot(tr.rgb, vec3(0.299, 0.587, 0.114));
  float lGray  = dot(l.rgb, vec3(0.299, 0.587, 0.114));
  float cGray  = dot(c.rgb, vec3(0.299, 0.587, 0.114));
  float rGray  = dot(r.rgb, vec3(0.299, 0.587, 0.114));
  float blGray = dot(bl.rgb, vec3(0.299, 0.587, 0.114));
  float bGray  = dot(b.rgb, vec3(0.299, 0.587, 0.114));
  float brGray = dot(br.rgb, vec3(0.299, 0.587, 0.114));
  
  float gx, gy;
  
  // Different convolution kernels based on mode
  if (${this.mode === 'sobel' ? 'true' : 'false'}) {
      // Sobel operator
      gx = -1.0 * tlGray + 1.0 * trGray +
           -2.0 * lGray  + 2.0 * rGray  +
           -1.0 * blGray + 1.0 * brGray;
           
      gy = -1.0 * tlGray + -2.0 * tGray + -1.0 * trGray +
            1.0 * blGray +  2.0 * bGray +  1.0 * brGray;
  } else {
      // Prewitt operator
      gx = -1.0 * tlGray + 1.0 * trGray +
           -1.0 * lGray  + 1.0 * rGray  +
           -1.0 * blGray + 1.0 * brGray;
           
      gy = -1.0 * tlGray + -1.0 * tGray + -1.0 * trGray +
            1.0 * blGray +  1.0 * bGray +  1.0 * brGray;
  }
  
  // Calculate edge magnitude
  float g = sqrt(gx * gx + gy * gy);
  
  // Apply threshold
  float edge = step(threshold, g);
  
  // Output either edge intensity or colored edges
  if (colorEdges) {
      return vec4(c.rgb * edge, c.a);
  } else {
      return vec4(vec3(edge), c.a);
  }
}`;
  }

  /**
   * Sets the edge detection threshold.
   * @param {number} value - Threshold value (0.0-1.0)
   */
  setThreshold(value) {
    this.setUniform('threshold', value);
  }

  /**
   * Toggles colored edges mode.
   * @param {boolean} enabled - Whether to preserve edge colors
   */
  setColorEdges(enabled) {
    this.setUniform('colorEdges', enabled);
  }
}

export { ShaderEdgeDetection };