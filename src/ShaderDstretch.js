import { Shader } from "./Shader";

/**
 * @typedef {Object} ShaderDStretch~Config
 * Configuration data for DStretch transformation
 * @property {Array<Array<number>>} samples - RGB color samples for statistics computation
 * @property {number[]} [transformation] - Optional 4x4 transformation matrix
 */

/**
 * @typedef {Object} ShaderDStretch~UniformData
 * Shader uniform data for DStretch processing
 * @property {Object} rotation - 4x4 transformation matrix
 * @property {Object} min - Minimum RGB values after transformation
 * @property {Object} max - Maximum RGB values after transformation
 */

/**
 * @class
 * @extends Shader
 * ShaderDStretch implements the GPU-accelerated portion of the DStretch algorithm.
 * Handles color space transformation and normalization for image enhancement.
 * 
 * Features:
 * - Real-time color space transformation
 * - Dynamic range computation
 * - Euler angle-based rotation control
 * - Automatic statistics computation
 * - WebGL 1.0 and 2.0 compatibility
 * 
 * Technical Implementation:
 * - Uses 4x4 matrices for color space transformation
 * - Implements color normalization based on sample statistics
 * - Supports dynamic update of transformation parameters
 * - Handles WebGL uniform management
 */
class ShaderDstretch extends Shader {
    /**
     * Creates a new ShaderDStretch instance
     * @param {Object} [options] - Configuration options (inherited from Shader)
     */
    constructor(options) {
        super(options);
    }

    /**
     * Initializes the shader with configuration data
     * @param {ShaderDStretch~Config} json - Configuration data
     * @property {Array<Array<number>>} json.samples - Color samples for statistics
     */
    init(json) {
        this.rotationMatrix = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

        // Store samples, compute min / max on the fly
        this.samples = json["samples"];
        this.samplers.push({ id: 0, name: 'image', type: 'vec3' });

        this.setMinMax();
    }

    /**
     * Computes and updates color range statistics
     * Calculates min/max values in transformed color space
     * @private
     */
    setMinMax() {
        if (this.samples == undefined)
            return;

        let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
        for (let i = 0; i < this.samples.length; i++) {
            let transformedSample = this.transformSample(this.matToArray(this.transpose(this.rotationMatrix)),
                this.transformSample(
                    this.matToArray(this.rotationMatrix),
                    this.samples[i].concat(1)));

            for (let j = 0; j < 3; j++) {
                if (transformedSample[j] < min[j])
                    min[j] = transformedSample[j];
                if (transformedSample[j] > max[j])
                    max[j] = transformedSample[j];
            }
        }

        this.min = min;
        this.max = max;

        this.uniforms = {
            rotation: { type: 'mat4', needsUpdate: true, size: 16, value: this.matToArray(this.rotationMatrix) },
            min: { type: 'vec3', needsUpdate: true, size: 3, value: this.min },
            max: { type: 'vec3', needsUpdate: true, size: 3, value: this.max }
        }
    }

    /**
     * Transposes a 4x4 matrix
     * @param {Array<Array<number>>} mat - Input matrix
     * @returns {Array<Array<number>>} Transposed matrix
     * @private
     */
    transpose(mat) {
        let ret = [];

        for (let i = 0; i < 4; i++) {
            let arr = [];
            for (let j = 0; j < 4; j++)
                arr.push(mat[j][i]);
            ret.push(arr);
        }

        return ret;
    }

    /**
     * Updates the color transformation matrix based on Euler angles
     * @param {number[]} eulerRotation - Rotation angles [x,y,z] in radians
     */
    updateRotationMatrix(eulerRotation) {
        let x = [[1, 0, 0, 0],
        [0, Math.cos(eulerRotation[0]), -Math.sin(eulerRotation[0]), 0],
        [0, Math.sin(eulerRotation[0]), Math.cos(eulerRotation[0]), 0],
        [0, 0, 0, 1]];
        let y = [
            [Math.cos(eulerRotation[1]), 0, Math.sin(eulerRotation[1]), 0],
            [0, 1, 0, 0],
            [Math.sin(eulerRotation[1]), 0, Math.cos(eulerRotation[1]), 0],
            [0, 0, 0, 1]];
        let z = [
            [Math.cos(eulerRotation[2]), -Math.sin(eulerRotation[2]), 0, 0],
            [Math.sin(eulerRotation[2]), Math.cos(eulerRotation[2]), 0, 0],
            [0, 0, 1, 0],
            [0, 0, 0, 1]
        ];

        let mat = this.multiplyMatrices(y, x);
        mat = this.multiplyMatrices(z, mat);

        this.rotationMatrix = mat;
        this.setMinMax();
    }

    /**
     * Multiplies two 4x4 matrices
     * @param {Array<Array<number>>} mat1 - First matrix
     * @param {Array<Array<number>>} mat2 - Second matrix
     * @returns {Array<Array<number>>} Result matrix
     * @private
     */
    multiplyMatrices(mat1, mat2) {
        var res = [];
        let i, j, k;
        for (i = 0; i < 4; i++) {
            res[i] = [];
            for (j = 0; j < 4; j++) {
                res[i][j] = 0;
                for (k = 0; k < 4; k++) {
                    res[i][j] += mat1[i][k] * mat2[k][j];
                }
            }
        }
        return res;
    }

    /**
     * Converts a 4x4 matrix to flat array format for WebGL
     * @param {Array<Array<number>>} mat - Input matrix
     * @returns {number[]} Flat array of matrix values
     * @private
     */    
    matToArray(mat) {
        let arr = [];
        for (let i = 0; i < 4; i++)
            arr = arr.concat(mat[i]);
        return arr;
    }

    /**
     * Transforms a color sample using 4x4 matrix
     * @param {number[]} matrix - Transformation matrix in flat array format
     * @param {number[]} point - Color point as [r,g,b,1]
     * @returns {number[]} Transformed color point
     * @private
     */    
    transformSample(matrix, point) {
        let c0r0 = matrix[0], c1r0 = matrix[1], c2r0 = matrix[2], c3r0 = matrix[3];
        let c0r1 = matrix[4], c1r1 = matrix[5], c2r1 = matrix[6], c3r1 = matrix[7];
        let c0r2 = matrix[8], c1r2 = matrix[9], c2r2 = matrix[10], c3r2 = matrix[11];
        let c0r3 = matrix[12], c1r3 = matrix[13], c2r3 = matrix[14], c3r3 = matrix[15];

        let x = point[0] - 127, y = point[1] - 127, z = point[2] - 127, w = point[3];

        let resultX = (x * c0r0) + (y * c0r1) + (z * c0r2) + (w * c0r3);
        let resultY = (x * c1r0) + (y * c1r1) + (z * c1r2) + (w * c1r3);
        let resultZ = (x * c2r0) + (y * c2r1) + (z * c2r2) + (w * c2r3);
        let resultW = (x * c3r0) + (y * c3r1) + (z * c3r2) + (w * c3r3);

        return [resultX + 127, resultY + 127, resultZ + 127, resultW];
    }

    /**
     * Generates fragment shader source code
     * Implements DStretch color transformation and normalization
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} Fragment shader source code
     * @private
     */    
    fragShaderSrc(gl) {

        let gl2 = !(gl instanceof WebGLRenderingContext);
        let str = `

${gl2 ? 'in' : 'varying'} vec2 v_texcoord;

uniform mat4 rotation;
uniform vec3 min;
uniform vec3 max;
uniform sampler2D image;

vec4 data() {
    vec3 ret = vec3(127.0, 127.0, 127.0) + (transpose(rotation) * (rotation * 255.0 * (texture(image, v_texcoord) - vec4(0.5, 0.5, 0.5, 0.0)))).xyz;
    ret = (ret - min) / (max - min);

    return vec4(ret, 1.0);
}`;
        return str;
    }
}
/**
 * Example usage:
 * ```javascript
 * // Create shader with configuration
 * const shader = new ShaderDStretch();
 * shader.init({
 *     samples: [[255,0,0], [0,255,0], [0,0,255]], // RGB samples
 * });
 * 
 * // Update transformation
 * shader.updateRotationMatrix([Math.PI/4, 0, 0]);
 * ```
 * 
 * Advanced usage with pre-computed statistics:
 * ```javascript
 * const shader = new ShaderDStretch();
 * shader.init({
 *     samples: precalculatedSamples,
 *     transformation: customMatrix
 * });
 * 
 * // Shader will use provided statistics and transformation
 * ```
 */

/**
 * Default class properties
 * 
 * @property {Array<Array<number>>} rotationMatrix - Current color transformation matrix
 * @property {Array<Array<number>>} samples - Color samples for statistics
 * @property {number[]} min - Minimum RGB values in transformed space
 * @property {number[]} max - Maximum RGB values in transformed space
 * @property {Object} uniforms - WebGL uniform variables for transformation
 */

/**
 * Fragment Shader Details
 * 
 * The shader performs these steps:
 * 1. Centers color values around 127
 * 2. Applies rotation matrix transformation
 * 3. Normalizes results using min/max values
 * 4. Outputs transformed and normalized color
 * 
 * Uniforms:
 * @property {mat4} rotation - Color transformation matrix
 * @property {vec3} min - Minimum RGB values for normalization
 * @property {vec3} max - Maximum RGB values for normalization
 * @property {sampler2D} image - Input image texture
 */

export { ShaderDstretch }