import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'

/**
 * @typedef {Object} LayerImageOptions
 * @property {string} url - URL of the image to display (required)
 * @property {string|Layout} [layout='image'] - Layout format for image display
 * @property {string} [format='vec4'] - Image data format for WebGL processing
 * @property {string} [type='image'] - Must be 'image' when using Layer factory
 * @extends LayerOptions
 */

/**
 * LayerImage provides fundamental image rendering capabilities in OpenLIME.
 * It serves as both a standalone layer for basic image display and a foundation
 * for more complex image-based layers.
 * 
 * Features:
 * - Single image rendering
 * - WebGL-based display
 * - Automatic format handling
 * - Layout system integration
 * - Shader-based processing
 * 
 * Technical Details:
 * - Uses WebGL textures for image data
 * - Supports various color formats (vec3, vec4)
 * - Integrates with OpenLIME layout system
 * - Manages raster data automatically
 * - Provides standard RGB shader by default
 * 
 * @extends Layer
 * 
 * @example
 * ```javascript
 * // Direct instantiation
 * const imageLayer = new OpenLIME.LayerImage({
 *   url: 'image.jpg',
 *   layout: 'image',
 *   format: 'vec4'
 * });
 * viewer.addLayer('main', imageLayer);
 * 
 * // Using Layer factory
 * const factoryLayer = new OpenLIME.Layer({
 *   type: 'image',
 *   url: 'image.jpg',
 *   layout: 'image'
 * });
 * viewer.addLayer('factory', factoryLayer);
 * ```
 */
class LayerImage extends Layer {
	/**
	 * Creates a new LayerImage instance
	 * @param {LayerImageOptions} options - Configuration options
	 * @throws {Error} If rasters options is not empty (should be auto-configured)
	 * @throws {Error} If no URL is provided and layout has no URLs
	 */
	constructor(options) {
		super(options);

		if (Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if (this.url)
			this.layout.setUrls([this.url]);
		else if (this.layout.urls.length == 0)
			throw "Missing options.url parameter";

		const rasterFormat = this.format != null ? this.format : 'vec4';
		let raster = new Raster({ format: rasterFormat }); //FIXME select format for GEO stuff

		this.rasters.push(raster);


		let shader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id: 0, name: 'source', type: rasterFormat }]
		});

		this.shaders = { 'standard': shader };
		this.setShader('standard');
	}
}

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['image'] = (options) => { return new LayerImage(options); }

export { LayerImage }
