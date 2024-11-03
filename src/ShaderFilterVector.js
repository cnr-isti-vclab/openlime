import { Color } from './Colormap.js';
import { ShaderFilter } from './ShaderFilter.js'

// vector field https://www.shadertoy.com/view/4s23DG
// isolines https://www.shadertoy.com/view/Ms2XWc

/**
 * @typedef {Object} ShaderFilterVector~Options
 * Configuration options for vector field visualization
 * @property {number[]} [inDomain=[]] - Input value range [min, max] for magnitude mapping
 * @property {number} [maxSteps=256] - Number of discrete steps in the colormap texture
 * @property {number[]} [arrowColor=[0.0, 0.0, 0.0, 1.0]] - RGBA color for arrows when using 'col' mode
 */

/**
 * @typedef {Object} ShaderFilterVector~Modes
 * Available visualization modes
 * @property {string} normalize - Arrow normalization ('on'|'off')
 * @property {string} arrow - Arrow coloring mode ('mag'|'col')
 * @property {string} field - Background field visualization ('none'|'mag')
 */

/**
 * 
 * ShaderFilterVector implements 2D vector field visualization techniques.
 * Based on techniques from "2D vector field visualization by Morgan McGuire"
 * and enhanced by Matthias Reitinger.
 * 
 * Features:
 * - Arrow-based vector field visualization
 * - Magnitude-based or custom arrow coloring
 * - Optional vector normalization
 * - Background field visualization
 * - Customizable arrow appearance
 * - Smooth interpolation
 * 
 * Technical Implementation:
 * - Tile-based arrow rendering
 * - Signed distance field for arrow shapes
 * - Dynamic magnitude scaling
 * - Colormap-based magnitude visualization
 * - WebGL 1.0 and 2.0 compatibility
 *
 * Example usage:
 * ```javascript
 * // Basic usage with default options
 * const vectorField = new ShaderFilterVector(myColorScale);
 * shader.addFilter(vectorField);
 * 
 * // Configure visualization modes
 * vectorField.setMode('normalize', 'on');  // Normalize arrow lengths
 * vectorField.setMode('arrow', 'col');     // Use custom arrow color
 * vectorField.setMode('field', 'mag');     // Show magnitude field
 * ```
 * 
 * Advanced usage with custom configuration:
 * ```javascript
 * const vectorField = new ShaderFilterVector(colorscale, {
 *     inDomain: [-10, 10],         // Vector magnitude range
 *     maxSteps: 512,               // Higher colormap resolution
 *     arrowColor: [1, 0, 0, 1]     // Red arrows
 * });
 * 
 * // Add to shader pipeline
 * shader.addFilter(vectorField);
 * ```
 *
 * GLSL Implementation Details
 * 
 * Key Components:
 * 1. Arrow Generation:
 *    - Tile-based positioning
 *    - Shaft and head construction
 *    - Size and direction control
 * 
 * 2. Distance Functions:
 *    - line3(): Distance to line segment
 *    - line(): Signed distance to line
 *    - arrow(): Complete arrow shape
 * 
 * 3. Color Processing:
 *    - Vector magnitude computation
 *    - Colormap lookup
 *    - Mode-based blending
 * 
 * Constants:
 * - ARROW_TILE_SIZE: Spacing between arrows (16.0)
 * - ISQRT2: 1/sqrt(2) for magnitude normalization
 * 
 * Uniforms:
 * - {vec4} arrow_color - Custom arrow color
 * - {vec4} low_color - Color for values below range
 * - {vec4} high_color - Color for values above range
 * - {float} scale - Magnitude scaling factor
 * - {float} bias - Magnitude offset
 * - {sampler2D} colormap - Magnitude colormap texture
 *
 * @extends ShaderFilter
 */
class ShaderFilterVector extends ShaderFilter {
    /**
     * Creates a new vector field visualization filter
     * @param {ColorScale} colorscale - Colorscale for magnitude mapping
     * @param {ShaderFilterVector~Options} [options] - Configuration options
     * @throws {Error} If inDomain is invalid (length !== 2 or min >= max)
     * 
     * @example
     * ```javascript
     * // Create with default options
     * const filter = new ShaderFilterVector(colorscale, {
     *     inDomain: [0, 1],
     *     maxSteps: 256,
     *     arrowColor: [0, 0, 0, 1]
     * });
     * ```
     */
    constructor(colorscale, options) {
        super(options);
        options = Object.assign({
            inDomain: [],
            maxSteps: 256,
            arrowColor: [0.0, 0.0, 0.0, 1.0],

        }, options);
        Object.assign(this, options);

        if (this.inDomain.length != 2 && this.inDomain[1] <= this.inDomain[0]) {
            throw Error("inDomain bad format");
        }

        this.colorscale = colorscale;
        if (this.inDomain.length == 0) this.inDomain = this.colorscale.rangeDomain();

        const cscaleDomain = this.colorscale.rangeDomain();

        const scale = Math.sqrt((this.inDomain[1] * this.inDomain[1] + this.inDomain[0] * this.inDomain[0]) / (cscaleDomain[1] * cscaleDomain[1] + cscaleDomain[0] * cscaleDomain[0]));
        const bias = 0.0;

        this.modes = {
            normalize: [
                { id: 'off', enable: true, src: `const bool ${this.modeName('arrowNormalize')} = false;` },
                { id: 'on', enable: false, src: `const bool ${this.modeName('arrowNormalize')} = true;` }
            ],
            arrow: [
                { id: 'mag', enable: true, src: `const int ${this.modeName('arrowColor')} = 0;` },
                { id: 'col', enable: false, src: `const int ${this.modeName('arrowColor')} = 1;` }
            ],
            field: [
                { id: 'none', enable: true, src: `const int ${this.modeName('fieldColor')} = 0;` },
                { id: 'mag', enable: false, src: `const int ${this.modeName('fieldColor')} = 1;` }
            ]
        };

        this.samplers = [{ name: `${this.samplerName('colormap')}` }];

        this.uniforms[this.uniformName('arrow_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.arrowColor };
        this.uniforms[this.uniformName('low_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.lowColor.value() };
        this.uniforms[this.uniformName('high_color')] = { type: 'vec4', needsUpdate: true, size: 4, value: this.colorscale.highColor.value() };
        this.uniforms[this.uniformName('scale')] = { type: 'float', needsUpdate: true, size: 1, value: scale };
        this.uniforms[this.uniformName('bias')] = { type: 'float', needsUpdate: true, size: 1, value: bias };
    }

    /**
     * Creates the colormap texture for magnitude visualization.
     * Samples colorscale at specified resolution, creates 1D RGBA texture,
     * configures appropriate texture filtering, and links texture with sampler.
     * 
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {Promise<void>}
     * @private
     */
    async createTextures(gl) {
        const colormap = this.colorscale.sample(this.maxSteps);
        let textureFilter = gl.LINEAR;
        if (this.colorscale.type == 'bar') {
            textureFilter = gl.NEAREST;
        }
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, textureFilter);
        gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, textureFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, this.maxSteps, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, colormap.buffer);
        this.getSampler('colormap').tex = tex; // Link tex to sampler
    }

    /**
     * Generates GLSL code for vector field visualization.
     * 
     * Shader Features:
     * - Tile-based arrow placement
     * - Signed distance field arrow rendering
     * - Multiple visualization modes
     * - Magnitude-based colormapping
     * - Smooth field interpolation
     * 
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} GLSL function definition
     * @private
     */
    fragDataSrc(gl) {
        return `
        // 2D vector field visualization by Matthias Reitinger, @mreitinger
        // Based on "2D vector field visualization by Morgan McGuire, http://casual-effects.com", https://www.shadertoy.com/view/4s23DG
        
        const float ARROW_TILE_SIZE = 16.0;
        const float ISQRT2 = 0.70710678118; // 1/sqrt(2)

        // Computes the center pixel of the tile containing pixel pos
        vec2 arrowTileCenterCoord(vec2 pos) {
            return (floor(pos / ARROW_TILE_SIZE) + 0.5) * ARROW_TILE_SIZE;
        }

        // Computes the distance from a line segment
        float line3(vec2 a, vec2 b, vec2 c) {
            vec2 ab = a - b;
            vec2 cb = c - b;
            float d = dot(ab, cb);
            float len2 = dot(cb, cb);
            float t = 0.0;
            if (len2 != 0.0) {
              t = clamp(d / len2, 0.0, 1.0);
            }
            vec2 r = b + cb * t;
            return distance(a, r);
        }

        // Computes the signed distance from a line segment
        float line(vec2 p, vec2 p1, vec2 p2) {
            vec2 center = (p1 + p2) * 0.5;
            float len = length(p2 - p1);
            vec2 dir = (p2 - p1) / len;
            vec2 rel_p = p - center;
            float dist1 = abs(dot(rel_p, vec2(dir.y, -dir.x)));
            float dist2 = abs(dot(rel_p, dir)) - 0.5*len;
            return max(dist1, dist2);
        }
        
        // v = field sampled at arrowTileCenterCoord(p), scaled by the length
        // desired in pixels for arrows
        // Returns a signed distance from the arrow
        float arrow(vec2 p, vec2 v) {
            if (${this.modeName('arrowNormalize')}) v = normalize(v);
            v *= ARROW_TILE_SIZE * 0.5; // Change from [-1,1] to pixels
            // Make everything relative to the center, which may be fractional
            p -= arrowTileCenterCoord(p);
                
            float mag_v = length(v), mag_p = length(p);
            
            if (mag_v > 0.0) {
                // Non-zero velocity case
                vec2 dir_v = normalize(v);
                
                // We can't draw arrows larger than the tile radius, so clamp magnitude.
                // Enforce a minimum length to help see direction
                mag_v = clamp(mag_v, 2.0, ARROW_TILE_SIZE * 0.4);
        
                // Arrow tip location
                v = dir_v * mag_v;
        
                // Signed distance from shaft
                float shaft = line3(p, v, -v);
                // Signed distance from head
                float head = min(line3(p, v, 0.4*v + 0.2*vec2(-v.y, v.x)),
                                 line3(p, v, 0.4*v + 0.2*vec2(v.y, -v.x)));
                return min(shaft, head);
            } else {
                // Signed distance from the center point
                return mag_p;
            }
        }
        
        vec4 lookupColormap(float cv) {            
            if(cv >= 1.0) 
                return ${this.uniformName('high_color')};
            else if(cv <= 0.0) 
                return ${this.uniformName('low_color')};
            return texture(${this.samplerName('colormap')}, vec2(cv, 0.5));
        }

        vec4 ${this.functionName()}(vec4 col){
            if(col.a == 0.0) return col;

            vec2 p = v_texcoord*tileSize; // point in pixel
            vec2 pc_coord = arrowTileCenterCoord(p)/tileSize; // center coordinate
            vec4 pc_val = texture(kd, pc_coord); // [0..1] - lookup color in center
            float s = 2.0;
            float b = -1.0;
            vec2 uvc = vec2(pc_val.x*s+b, pc_val.y*s+b); // [-1..1]
            vec2 uvr =  vec2(col.r*s+b, col.g*s+b); // [-1..1]

            // Colors
            float vc = length(uvc)*ISQRT2;
            float cvc = vc*${this.uniformName('scale')} + ${this.uniformName('bias')};
            float vr = length(uvr)*ISQRT2;
            float cvr = vr*${this.uniformName('scale')} + ${this.uniformName('bias')};
            vec4 cmapc = lookupColormap(cvc);
            vec4 cmapr = lookupColormap(cvr);
                
            // Arrow            
            float arrow_dist = arrow(p, uvc);
            
            vec4 arrow_col = cmapc;
            vec4 field_col = vec4(0.0, 0.0, 0.0, 0.0);

            switch (${this.modeName('arrowColor')}) {
                case 0:
                    arrow_col = cmapc;
                    break;
                case 1:
                    arrow_col = ${this.uniformName('arrow_color')};               
                    break;
            }

            switch (${this.modeName('fieldColor')}) {
                case 0:
                    field_col = vec4(0.0, 0.0, 0.0, 0.0);
                    break;
                case 1:
                    field_col = cmapr;              
                    break;
            }

            float t = clamp(arrow_dist, 0.0, 1.0);
            return  mix(arrow_col, field_col, t);
        }`;
    }


}

export { ShaderFilterVector }