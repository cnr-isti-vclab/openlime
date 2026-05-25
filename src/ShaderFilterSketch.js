import { ShaderFilter } from './ShaderFilter.js'

/**
 * @typedef {Object} ShaderFilterSketch~Options
 * Configuration options for the sketch filter
 * @property {number} [width=0.5] - Controls the sharpness of the sketch lines [0..1]
 * @property {number} [radius=0.5] - Controls the neighbourhood search radius [0..1]
 */

/**
 * ShaderFilterSketch implements a sketch (pencil-drawing) rendering mode.
 * It operates on the `normals` sampler already declared by the host shader (ShaderRTI),
 * detecting curvature discontinuities to produce edge lines.
 *
 * Intended to be added via ShaderRTI.setMode('sketch') — no extra sampler wiring needed.
 *
 * Features:
 * - Curvature-based edge detection from normal maps
 * - Adjustable search radius
 * - Adjustable line width/sharpness
 * - GPU-accelerated processing (WebGL 2.0+)
 *
 * Technical Implementation:
 * - Computes a local average normal within a configurable kernel
 * - Detects wedge-shaped curvature discontinuities
 * - Maps discontinuity strength to a sketch-line intensity via power functions
 *
 * @extends ShaderFilter
 *
 * @example
 * ```javascript
 * // Basic usage
 * const sketch = new ShaderFilterSketch();
 * shader.addFilter(sketch);
 *
 * // Custom parameters
 * const sketch = new ShaderFilterSketch({ width: 0.7, radius: 0.3 });
 * shader.addFilter(sketch);
 *
 * // Adjust at runtime
 * sketch.setUniform('width', 0.8);
 * sketch.setUniform('radius', 0.4);
 * ```
 */
class ShaderFilterSketch extends ShaderFilter {
    /**
     * Creates a new sketch filter
     * @param {ShaderFilterSketch~Options} [options] - Configuration options
     * @param {number} [options.width=0.5] - Sketch line sharpness [0..1]
     * @param {number} [options.radius=0.5] - Neighbourhood search radius [0..1]
     */
    constructor(options) {
        super(options);
        options = Object.assign({
            width: 0.5,
            radius: 0.5,
        }, options);
        Object.assign(this, options);

        // No sampler needed: 'normals' is already declared by the host shader (ShaderRTI)
        this.uniforms[this.uniformName('width')]  = { type: 'float', needsUpdate: true, size: 1, value: this.width };
        this.uniforms[this.uniformName('radius')] = { type: 'float', needsUpdate: true, size: 1, value: this.radius };
    }

    /**
     * Sets the sketch line sharpness.
     * @param {number} value - Width value in [0..1]
     */
    setWidth(value) {
        this.setUniform('width', value);
    }

    /**
     * Sets the neighbourhood search radius.
     * @param {number} value - Radius value in [0..1]
     */
    setRadius(value) {
        this.setUniform('radius', value);
    }

    /**
     * Generates the GLSL function for sketch rendering.
     *
     * Algorithm:
     * 1. Compute kernel half-size from the radius uniform
     * 2. Average normals in the neighbourhood (smoothing pass)
     * 3. Accumulate a signed curvature measure (wedge detection)
     * 4. Threshold and power-map the curvature to a line intensity
     *
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} GLSL function definition
     */
    fragDataSrc(gl) {
        return `
            vec4 ${this.functionName()}(vec4 col) {
                // 1. Kernel half-size from radius uniform
                int s = int(1.0 + 5.0 * ${this.uniformName('radius')});
                float invn = 1.0 / float((2 * s + 1) * (2 * s + 1));

                // 2. Average normal in the neighbourhood (smoothing)
                vec3 sum = vec3(0.0);
                for (int i = 1; i <= 11; i++) {
                    for (int y = -1; y <= 1; y++) {
                        for (int x = -1; x <= 1; x++) {
                            vec2 offset = vec2(float(x * i) / tileSize.x, float(y * i) / tileSize.y);
                            vec3 n = texture(normals, v_texcoord + offset).rgb * 2.0 - 1.0;
                            sum += n;
                        }
                    }
                    if (i == s) break;
                }
                vec3 avgNormal = normalize(sum);

                // 3. Curvature measure (wedge detection)
                float sigma2 = 0.0;
                for (int i = 1; i <= 11; i++) {
                    for (int y = -1; y <= 1; y++) {
                        for (int x = -1; x <= 1; x++) {
                            vec2 offset = vec2(float(x * i) / tileSize.x, float(y * i) / tileSize.y);
                            vec3 neighborN = texture(normals, v_texcoord + offset).rgb * 2.0 - 1.0;
                            vec3 dir = vec3(-float(x * i), float(y * i), 0.0);
                            float neighborSign = dot(avgNormal - neighborN, dir);
                            sigma2 += neighborSign * dot(avgNormal - neighborN, avgNormal - neighborN);
                        }
                    }
                    if (i == s) break;
                }
                sigma2 *= invn;

                // 4. Threshold and map to sketch line intensity
                float wedge = smoothstep(0.0, -0.01, sigma2);
                float value = 1.0 - pow(wedge, ${this.uniformName('width')});
                return vec4(vec3(pow(value, 3.0)), 1.0);
            }`;
    }
}

export { ShaderFilterSketch }
