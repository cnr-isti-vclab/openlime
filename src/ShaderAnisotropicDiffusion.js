import { Shader } from './Shader.js';

/**
 * ShaderAnisotropicDiffusion extends the base Shader class to implement
 * a Perona-Malik anisotropic diffusion filter to enhance inscriptions
 * on metal surfaces based on normal maps.
 * 
 * This filter preserves and enhances edges while smoothing other areas,
 * making it ideal for revealing inscriptions on uneven surfaces.
 */
class ShaderAnisotropicDiffusion extends Shader {
  /**
   * Creates a new Anisotropic Diffusion Shader instance.
   * @param {Object} [options] - Configuration options passed to parent Shader
   * @param {number} [options.kappa=15.0] - Diffusion conductance parameter
   * @param {number} [options.iterations=3] - Number of diffusion iterations
   * @param {number} [options.lambda=0.25] - Diffusion rate (0.0-0.25 for stability)
   * @param {number} [options.normalStrength=1.0] - Normal contribution strength
   */
  constructor(options = {}) {
    // Set default options for anisotropic diffusion
    const diffusionOptions = Object.assign({
      kappa: 0.03,          // Very low value to strongly preserve edges
      iterations: 3,        // Fewer iterations to avoid over-smoothing
      lambda: 0.1,          // Gentler diffusion
      normalStrength: 1.2,  // Increased strength for better visibility
      uniforms: {
        kappa: { type: 'float', value: 0.03, needsUpdate: true },
        iterations: { type: 'int', value: 3, needsUpdate: true },
        lambda: { type: 'float', value: 0.1, needsUpdate: true },
        normalStrength: { type: 'float', value: 1.2, needsUpdate: true }
      },
      samplers: [
        { id: 0, name: 'source', label: 'Normal Map', samplers: [{ id: 0, type: 'color' }] }
      ],
      label: 'Anisotropic Diffusion',
      modes: ['perona-malik', 'weickert'],
      mode: 'perona-malik'
    }, options);

    super(diffusionOptions);

    // Set parameters from options
    if (options.kappa !== undefined) {
      this.setUniform('kappa', options.kappa);
    }

    if (options.iterations !== undefined) {
      this.setUniform('iterations', options.iterations);
    }

    if (options.lambda !== undefined) {
      this.setUniform('lambda', options.lambda);
    }

    if (options.normalStrength !== undefined) {
      this.setUniform('normalStrength', options.normalStrength);
    }
  }

  /**
   * Override fragment shader source to implement anisotropic diffusion.
   * This version is compatible with WebGL 2.0+.
   * @param {WebGLRenderingContext} gl - WebGL context
   * @returns {string} Fragment shader source code
   */
  fragShaderSrc(gl) {
    return `
uniform float kappa;
uniform int iterations;
uniform float lambda;
uniform float normalStrength;

in vec2 v_texcoord;

// Calculate texture offset based on tile size
vec2 texelSize = vec2(1.0) / tileSize;

// Edge-stopping functions from Perona-Malik algorithm
float g1(float gradient, float k) {
  return exp(-pow(gradient/k, 2.0));
}

float g2(float gradient, float k) {
  return 1.0 / (1.0 + pow(gradient/k, 2.0));
}

  // Extract grayscale value from normal map, giving more weight to z component
float normalToGray(vec3 normal) {
  // Heavily favor the blue channel (z component) since it contains the depth information
  return dot(normal, vec3(0.15, 0.15, 0.7));
}

vec4 data() {
  // Sample the center pixel color (normal map)
  vec4 centerColor = texture(source, v_texcoord);
  ${this.isLinear ? "" : "centerColor = srgb2linear(centerColor);"}
  // Convert normal to working grayscale image
  // Adjust normal vector to be in [-1,1] range
  vec3 normal = centerColor.rgb * 2.0 - 1.0;
  normal = normalize(normal);
  
  // Extract grayscale value with emphasis on z component
  // Map to 0-1 range for better visualization
  float intensity = (normalToGray(normal) + 1.0) * 0.5;
  
  // Store the original intensity before diffusion for later use
  float originalIntensity = intensity;
  
  // Initial image for diffusion
  float currentIntensity = intensity;
  
  // Perform multiple iterations of anisotropic diffusion
  for (int i = 0; i < 20; i++) {
    if (i >= iterations) break; // Handle dynamic loop limit
    
    // Sample the 4-connected neighborhood
    vec4 vN = texture(source, v_texcoord + texelSize * vec2(0.0, -1.0));
     ${this.isLinear ? "" : "vN = srgb2linear(vN);"}
    vec4 vS = texture(source, v_texcoord + texelSize * vec2(0.0, 1.0));
     ${this.isLinear ? "" : "vS = srgb2linear(vS);"}
    vec4 vE = texture(source, v_texcoord + texelSize * vec2(1.0, 0.0));
     ${this.isLinear ? "" : "vE = srgb2linear(vE);"}
    vec4 vW = texture(source, v_texcoord + texelSize * vec2(-1.0, 0.0));
     ${this.isLinear ? "" : "vW = srgb2linear(vW);"}

    vec3 normalN = vN.rgb * 2.0 - 1.0;
    vec3 normalS = vS.rgb * 2.0 - 1.0;
    vec3 normalE = vE.rgb * 2.0 - 1.0;
    vec3 normalW = vW.rgb * 2.0 - 1.0;
    
    // Convert to grayscale with normalization to 0-1 range
    float n = (normalToGray(normalN) + 1.0) * 0.5;
    float s = (normalToGray(normalS) + 1.0) * 0.5;
    float e = (normalToGray(normalE) + 1.0) * 0.5;
    float w = (normalToGray(normalW) + 1.0) * 0.5;
    
    // Calculate gradients (using normalized intensity values)
    float gradN = abs(n - currentIntensity);
    float gradS = abs(s - currentIntensity);
    float gradE = abs(e - currentIntensity);
    float gradW = abs(w - currentIntensity);
    
    // Apply edge-stopping function
    float mode = ${this.mode === 'perona-malik' ? '1.0' : '0.0'};
    float cN = mix(g2(gradN, kappa), g1(gradN, kappa), mode);
    float cS = mix(g2(gradS, kappa), g1(gradS, kappa), mode);
    float cE = mix(g2(gradE, kappa), g1(gradE, kappa), mode);
    float cW = mix(g2(gradW, kappa), g1(gradW, kappa), mode);
    
    // Update intensity with weighted contributions
    float laplacian = cN * (n - currentIntensity) +
                     cS * (s - currentIntensity) +
                     cE * (e - currentIntensity) +
                     cW * (w - currentIntensity);
                     
    currentIntensity += lambda * laplacian;
  }
  
  // Enhance contrast in the final result
  float enhancedIntensity = currentIntensity * normalStrength;
  
  // Combine with original intensity to preserve details
  float mixFactor = 0.6; // 60% diffused result, 40% original
  enhancedIntensity = mix(originalIntensity, enhancedIntensity, mixFactor);
  
  // Custom contrast enhancement to bring out inscriptions
  // Apply contrast and brightness adjustment
  float adjustedIntensity = enhancedIntensity;
  
  // Invert the image for better visibility of inscriptions
  adjustedIntensity = 1.0 - adjustedIntensity;
  
  // Significantly enhance brightness and contrast
  adjustedIntensity = pow(adjustedIntensity, 0.5); // Increase brightness (gamma correction)
  adjustedIntensity = smoothstep(0.1, 0.6, adjustedIntensity); // Enhance contrast with bigger bright areas
  
  // Boost brightness again
  adjustedIntensity = adjustedIntensity * 1.3;
  adjustedIntensity = clamp(adjustedIntensity, 0.0, 1.0);
  
  // Return grayscale result with good visibility
  return vec4(vec3(adjustedIntensity), centerColor.a);
}`;
  }

  /**
   * Sets the kappa parameter which controls edge sensitivity.
   * Higher values preserve fewer edges.
   * @param {number} value - Kappa value (typically 5-50)
   */
  setKappa(value) {
    this.setUniform('kappa', value);
  }

  /**
   * Sets the number of diffusion iterations.
   * More iterations produce smoother results but take longer to compute.
   * @param {number} value - Number of iterations (typically 1-10)
   */
  setIterations(value) {
    this.setUniform('iterations', value);
  }

  /**
   * Sets the lambda parameter which controls diffusion rate.
   * Should be between 0.0 and 0.25 for numerical stability.
   * @param {number} value - Lambda value (0.0-0.25)
   */
  setLambda(value) {
    value = Math.min(0.25, Math.max(0.0, value)); // Clamp for stability
    this.setUniform('lambda', value);
  }

  /**
   * Sets the normal strength parameter which controls how much
   * the normal map information influences the final result.
   * @param {number} value - Normal strength multiplier
   */
  setNormalStrength(value) {
    this.setUniform('normalStrength', value);
  }
}

export { ShaderAnisotropicDiffusion };