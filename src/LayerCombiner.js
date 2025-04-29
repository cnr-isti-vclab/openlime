import { Layer } from './Layer.js'

/**
 * @typedef {Object} LayerCombinerOptions
 * @property {Layer[]} layers - Array of layers to be combined (required)
 * @property {Object.<string, Shader>} [shaders] - Map of available shaders
 * @property {string} [type='combiner'] - Must be 'combiner' when using Layer factory
 * @property {boolean} [visible=true] - Whether the combined output is visible
 * @extends LayerOptions
 */

/**
 * LayerCombiner provides functionality to combine multiple layers using framebuffer operations
 * and custom shaders. It enables complex visual effects by compositing layers in real-time
 * using GPU-accelerated rendering.
 * 
 * Features:
 * - Real-time layer composition
 * - Custom shader-based effects
 * - Framebuffer management
 * - Dynamic texture allocation
 * - Resolution-independent rendering
 * - GPU-accelerated compositing
 * 
 * Use Cases:
 * - Layer blending and mixing
 * - Image comparison tools
 * - Lens effects (see {@link LayerLens})
 * - Custom visual effects
 * - Multi-layer compositing
 * 
 * Technical Details:
 * - Creates framebuffers for each input layer
 * - Manages WebGL textures and resources
 * - Supports dynamic viewport resizing
 * - Handles shader-based composition
 * - Maintains proper resource cleanup
 * 
 * @extends Layer
 * 
 * @example
 * ```javascript
 * // Create two base layers
 * const baseLayer = new OpenLIME.Layer({
 *   type: 'image',
 *   url: 'base.jpg'
 * });
 * 
 * const overlayLayer = new OpenLIME.Layer({
 *   type: 'image',
 *   url: 'overlay.jpg'
 * });
 * 
 * // Create combiner with custom shader
 * const combiner = new OpenLIME.Layer({
 *   type: 'combiner',
 *   layers: [baseLayer, overlayLayer],
 *   visible: true
 * });
 * 
 * // Set up blend shader
 * const shader = new OpenLIME.ShaderCombiner();
 * shader.mode = 'blend';
 * combiner.shaders = { 'standard': shader };
 * combiner.setShader('standard');
 * 
 * // Add to viewer
 * viewer.addLayer('combined', combiner);
 * ```
 */
class LayerCombiner extends Layer {
    /**
     * Creates a new LayerCombiner instance.
     * 
     * @param {LayerCombinerOptions} options - Configuration options
     * @throws {Error} If rasters option is not empty (rasters should be defined in source layers)
     */
    constructor(options) {
        options = Object.assign({
            isLinear: true,
        }, options);

        super(options);

        if (Object.keys(this.rasters).length != 0)
            throw "Rasters options should be empty!";

        this.textures = [];
        this.framebuffers = [];
        this.status = 'ready';
    }

    /**
     * Cleans up WebGL resources by deleting framebuffers and textures.
     * Should be called before recreating buffers or when the layer is destroyed.
     * Prevents memory leaks by properly releasing GPU resources.
     * @private
     */
    deleteFramebuffers() {
        if (!this.gl) return;

        // Clean up textures
        for (let i = 0; i < this.textures.length; i++) {
            if (this.textures[i]) {
                this.gl.deleteTexture(this.textures[i]);
            }
        }

        // Clean up framebuffers
        for (let i = 0; i < this.framebuffers.length; i++) {
            if (this.framebuffers[i]) {
                this.gl.deleteFramebuffer(this.framebuffers[i]);
            }
        }

        this.textures = [];
        this.framebuffers = [];
    }

    /**
     * Renders the combined layers using framebuffer operations.
     * Handles framebuffer creation, layer rendering, and final composition.
     * 
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport parameters
     * @param {number} viewport.x - Viewport X position
     * @param {number} viewport.y - Viewport Y position
     * @param {number} viewport.dx - Viewport width
     * @param {number} viewport.dy - Viewport height
     * @param {number} viewport.w - Total width
     * @param {number} viewport.h - Total height
     * @throws {Error} If shader is not specified
     * @private
     */
    draw(transform, viewport) {
        for (let layer of this.layers)
            if (layer.status != 'ready')
                return;

        if (!this.shader)
            throw "Shader not specified!";

        let w = viewport.dx;
        let h = viewport.dy;

        // Recreate framebuffers if viewport size changes
        if (!this.framebuffers.length || this.layout.width != w || this.layout.height != h) {
            this.deleteFramebuffers();
            this.layout.width = w;
            this.layout.height = h;
            this.createFramebuffers();
        }

        let gl = this.gl;
        var b = [0, 0, 0, 0];
        gl.clearColor(b[0], b[1], b[2], b[3]);

        // Save the active framebuffer before starting operations
        const activeFramebuffer = this.canvas.getActiveFramebuffer();

        // Render each layer to its corresponding framebuffer
        for (let i = 0; i < this.layers.length; i++) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[i]);
            gl.clear(gl.COLOR_BUFFER_BIT);
            this.layers[i].draw(transform, { x: 0, y: 0, dx: w, dy: h, w: w, h: h });
        }

        // Restore the active framebuffer for final rendering
        this.canvas.setActiveFramebuffer(activeFramebuffer);

        this.prepareWebGL();

        // Bind textures and set shader uniforms
        for (let i = 0; i < this.layers.length; i++) {
            gl.uniform1i(this.shader.samplers[i].location, i);
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
        }

        // Update tile buffers and draw the final composition
        this.updateTileBuffers(
            new Float32Array([-1, -1, 0, -1, 1, 0, 1, 1, 0, 1, -1, 0]),
            new Float32Array([0, 0, 0, 1, 1, 1, 1, 0]));
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
    }

    /**
     * Creates framebuffers and textures for layer composition.
     * Initializes WebGL resources for each input layer.
     * @private
     */
    createFramebuffers() {
        let gl = this.gl;
        for (let i = 0; i < this.layers.length; i++) {
            const texture = gl.createTexture();

            gl.bindTexture(gl.TEXTURE_2D, texture);

            const level = 0;
            const internalFormat = gl.RGBA;
            const border = 0;
            const format = gl.RGBA;
            const type = gl.UNSIGNED_BYTE;
            gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
                this.layout.width, this.layout.height, border, format, type, null);

            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

            // Verify that the framebuffer is complete
            const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
            if (status !== gl.FRAMEBUFFER_COMPLETE) {
                console.error("LayerCombiner framebuffer not complete. Status:", status);
            }

            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            this.textures[i] = texture;
            this.framebuffers[i] = framebuffer;
        }
    }

    /**
     * Computes the combined bounding box of all input layers.
     * 
     * @returns {BoundingBox} Combined bounding box
     * @override
     * @private
     */
    boundingBox() {
        const discardHidden = false;
        let result = Layer.computeLayersBBox(this.layers, discardHidden);
        if (result && this.transform != null && this.transform != undefined) {
            result = this.transform.transformBox(result);
        }
        return result;
    }

    /**
     * Computes the minimum scale across all input layers.
     * 
     * @returns {number} Combined scale factor
     * @override
     * @private
     */
    scale() {
        const discardHidden = false;
        let scale = Layer.computeLayersMinScale(this.layers, discardHidden);
        scale *= this.transform.z;
        return scale;
    }
}

/**
 * Registers this layer type with the Layer factory.
 * 
 * @type {Function}
 * @private
 */
Layer.prototype.types['combiner'] = (options) => { return new LayerCombiner(options); }

export { LayerCombiner }