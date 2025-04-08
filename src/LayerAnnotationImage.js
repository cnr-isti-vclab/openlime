import { LayerAnnotation } from './LayerAnnotation.js'
import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'
import { LayoutTileImages } from './LayoutTileImages.js';

/**
 * @typedef {Object} LayerAnnotationImageOptions
 * @property {string} [url] - URL to the annotations JSON file
 * @property {string} [path] - Base path for annotation image files
 * @property {string} [format='vec4'] - Raster format for image data
 * @extends LayerAnnotationOptions
 */

/**
 * LayerAnnotationImage extends LayerAnnotation to provide support for image-based annotations.
 * Each annotation corresponds to a single tile in the layer, with customizable visibility
 * and shader-based rendering.
 * 
 * Features:
 * - Image-based annotation rendering
 * - Per-annotation visibility control
 * - Custom shader support for image processing
 * - Automatic texture management
 * - WebGL/WebGL2 compatibility
 * - Multi-format raster support
 * 
 * The class handles:
 * - Image loading and caching
 * - Texture creation and binding
 * - Shader setup and compilation
 * - Tile visibility management
 * - WebGL state management
 * 
 * @extends LayerAnnotation
 * 
 * @example
 * ```javascript
 * // Create image annotation layer
 * const imageAnnoLayer = new OpenLIME.LayerAnnotationImage({
 *   url: 'annotations.json',
 *   path: './annotation-images/',
 *   format: 'vec4'
 * });
 * 
 * // Configure visibility
 * imageAnnoLayer.setAllTilesVisible(true);
 * imageAnnoLayer.setTileVisible(0, false); // Hide first annotation
 * 
 * // Add to viewer
 * viewer.addLayer('imageAnnotations', imageAnnoLayer);
 * ```
 */
class LayerAnnotationImage extends LayerAnnotation {
    /**
 * Creates a new LayerAnnotationImage instance
 * @param {LayerAnnotationImageOptions} options - Configuration options
 * @throws {Error} If path is not specified (warns in console)
 */
    constructor(options) {
        const url = options.url;
        if (options.path == null) {
            console.log("WARNING MISSING ANNOTATION PATH, SET TO ./annot/");
        }
        super(options);
        const rasterFormat = this.format != null ? this.format : 'vec4';

        let initCallback = () => {
            // Set Annotation Urls path
            if (options.path) {
                this.layout.path = options.path;
            } else if (url != null) {
                // Extract path from annotation.json path
                this.layout.setPathFromUrl(path);
            }

            for (let a of this.annotations) {
                let raster = new Raster({ format: rasterFormat });
                this.rasters.push(raster);
            }
            console.log("Set " + this.annotations.length + " annotations into layout");
            this.setupShader(rasterFormat);
            this.layout.setTileDescriptors(this.annotations);
        }
        this.addEvent('loaded', initCallback);
    }

    /**
     * Gets the number of annotations in the layer
     * @returns {number} Number of annotations
     */
    length() {
        return this.annotations.length;
    }

    /**
     * Sets visibility for a specific annotation/tile
     * @param {number} index - Index of the annotation
     * @param {boolean} visible - Whether the annotation should be visible
     */
    setTileVisible(index, visible) {
        this.layout.setTileVisible(index, visible);
        //this.annotations[index].needsUpdate = true;
        //this.emit('update');
    }

    /**
     * Sets visibility for all annotations/tiles
     * @param {boolean} visible - Whether all annotations should be visible
     */
    setAllTilesVisible(visible) {
        this.layout.setAllTilesVisible(visible);
        // for(let a of this.annotations) {
        //     a.needsUpdate = true;
        // }
        //this.emit('update');
    }

    /**
     * Renders a specific tile/annotation
     * @param {Object} tile - Tile object containing texture information
     * @param {number} index - Index of the tile
     * @throws {Error} If tile is missing textures
     * @private
     */
    drawTile(tile, index) {
        if (tile.missing != 0)
            throw "Attempt to draw tile still missing textures"

        const idx = tile.index;

        //coords and texture buffers updated once for all tiles from main draw() call

        //bind texture of this tile only (each tile corresponds to an image)
        let gl = this.gl;
        let id = this.shader.samplers[idx].id;
        gl.uniform1i(this.shader.samplers[idx].location, idx);
        gl.activeTexture(gl.TEXTURE0 + idx);
        gl.bindTexture(gl.TEXTURE_2D, tile.tex[id]);

        const byteOffset = this.getTileByteOffset(index);
        gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, byteOffset);
    }

    /**
     * Configures the shader for rendering annotations
     * @param {string} rasterFormat - Format of the raster data ('vec4', etc)
     * @private
     */
    setupShader(rasterFormat) {
        let samplers = [];
        let N = this.rasters.length;
        for (let i = 0; i < N; ++i) {
            samplers.push({ id: i, name: 'source', type: rasterFormat });
        }
        let shader = new Shader({
            'label': 'Rgb',
            'samplers': samplers //[{ id:0, name:'source', type: rasterFormat }]
        });

        shader.fragShaderSrc = function (gl) {

            let gl2 = !(gl instanceof WebGLRenderingContext);
            let str = `

${gl2 ? 'in' : 'varying'} vec2 v_texcoord;

vec4 data() {
	return texture${gl2 ? '' : '2D'}(source, v_texcoord);
}
`;
            return str;

        };

        this.shaders = { 'standard': shader };
        this.setShader('standard');
    }

}

Layer.prototype.types['annotation_image'] = (options) => { return new LayerAnnotationImage(options); }

export { LayerAnnotationImage }