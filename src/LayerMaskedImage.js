import { Layer } from './Layer.js';
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'

/**
 * @typedef {Object} LayerMaskedImageOptions
 * @property {string} url - URL of the masked image to display (required)
 * @property {string} [format='vec4'] - Image data format
 * @property {string} [type='maskedimage'] - Must be 'maskedimage' when using Layer factory
 * @extends LayerOptions
 */

/**
 * LayerMaskedImage provides specialized handling for masked scalar images with bilinear interpolation.
 * It implements custom texture sampling and masking operations through WebGL shaders.
 * 
 * Features:
 * - Custom scalar image handling
 * - Bilinear interpolation with masking
 * - WebGL shader-based processing
 * - Support for both WebGL 1 and 2
 * - Nearest-neighbor texture filtering
 * - Masked value visualization
 * 
 * Technical Details:
 * - Uses LUMINANCE format for single-channel data
 * - Implements custom bilinear sampling in shader
 * - Handles mask values through alpha channel
 * - Supports value rescaling (255.0/254.0 scale with -1.0/254.0 bias)
 * - Uses custom texture parameters for proper sampling
 * 
 * Shader Implementation:
 * - Performs bilinear interpolation in shader
 * - Handles masked values (0 = masked)
 * - Implements value rescaling
 * - Provides visualization of masked areas (in red)
 * - Uses texelFetch for precise sampling
 * 
 * @extends Layer
 * 
 * @example
 * ```javascript
 * // Create masked image layer
 * const maskedLayer = new OpenLIME.Layer({
 *   type: 'maskedimage',
 *   url: 'masked-data.png',
 *   format: 'vec4'
 * });
 * 
 * // Add to viewer
 * viewer.addLayer('masked', maskedLayer);
 * ```
 */
class LayerMaskedImage extends Layer {
	/**
	 * Creates a new LayerMaskedImage instance
	 * @param {LayerMaskedImageOptions} options - Configuration options
	 * @throws {Error} If rasters options is not empty
	 * @throws {Error} If url is not provided and layout has no URLs
	 */
	constructor(options) {
		super(options);

		if (Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if (this.url) {
			this.layout.setUrls([this.url]);
		} else if (this.layout.urls.length == 0)
			throw "Missing options.url parameter";

		const rasterFormat = this.format != null ? this.format : 'vec4';
		let raster = new Raster({ format: rasterFormat }); //FIXME select format for GEO stuff

		this.rasters.push(raster);

		let shader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id: 0, name: 'kd', type: rasterFormat }]
		});

		shader.fragShaderSrc = function (gl) {

			let gl2 = !(gl instanceof WebGLRenderingContext);
			let str = `

		${gl2 ? 'in' : 'varying'} vec2 v_texcoord;

		vec2 bilinear_masked_scalar(sampler2D field, vec2 uv) {
			vec2 px = uv*tileSize;
			ivec2 iuv = ivec2(floor( px ));
			vec2 fuv = fract(px);
			int i0 = iuv.x;
			int j0 = iuv.y;
			int i1 = i0+1>=int(tileSize.x) ? i0 : i0+1;
			int j1 = j0+1>=int(tileSize.y) ? j0 : j0+1;
		  
			float f00 = texelFetch(field, ivec2(i0, j0), 0).r;
			float f10 = texelFetch(field, ivec2(i1, j0), 0).r;
			float f01 = texelFetch(field, ivec2(i0, j1), 0).r;
			float f11 = texelFetch(field, ivec2(i1, j1), 0).r;

			// FIXME Compute weights of valid
		  
			vec2 result_masked_scalar;
			result_masked_scalar.y = f00*f01*f10*f11;
			result_masked_scalar.y = result_masked_scalar.y > 0.0 ? 1.0 : 0.0;

			const float scale = 255.0/254.0;
			const float bias  = -1.0/254.0;
			result_masked_scalar.x = mix(mix(f00, f10, fuv.x), mix(f01, f11, fuv.x), fuv.y);
			result_masked_scalar.x = result_masked_scalar.y * (scale * result_masked_scalar.x + bias);		  
			return result_masked_scalar;
		  }
		  
		  vec4 data() { 
			vec2  masked_scalar = bilinear_masked_scalar(kd, v_texcoord);
			return masked_scalar.y > 0.0 ?  vec4(masked_scalar.x, masked_scalar.x, masked_scalar.x, masked_scalar.y) :  vec4(1.0, 0.0, 0.0, masked_scalar.y);
		  }
		`;
			return str;

		};

		this.shaders = { 'scalarimage': shader };
		this.setShader('scalarimage');

		this.rasters[0].loadTexture = this.loadTexture.bind(this);
		//this.layout.setUrls([this.url]);
	}

	/**
	 * Renders the masked image
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @returns {boolean} Whether render completed successfully
	 * @override
	 * @private
	 */
	draw(transform, viewport) {
		return super.draw(transform, viewport);
	}

	/**
	 * Custom texture loader for masked images
	 * Sets up proper texture parameters for scalar data
	 * 
	 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
	 * @param {HTMLImageElement} img - Source image
	 * @returns {WebGLTexture} Created texture
	 * @private
	 */
	/**
 * Loads a texture supporting both WebGL 1.0 and WebGL 2.0
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - The WebGL context
 * @param {HTMLImageElement} img - The image to load as a texture
 * @returns {WebGLTexture} - The created texture
 */
	loadTexture(gl, img) {
		// Update image dimensions
		this.rasters[0].width = img.width;
		this.rasters[0].height = img.height;

		// Create the texture
		const tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);

		// Set texture parameters (compatible with both versions)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		// Check WebGL version and load the texture appropriately
		const isWebGL2 = gl instanceof WebGL2RenderingContext;

		if (isWebGL2) {
			// In WebGL 2.0 we can use more advanced formats
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, gl.RED, gl.UNSIGNED_BYTE, img);
			// Alternative for 16-bit data if needed:
			// gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16UI, gl.RED_INTEGER, gl.UNSIGNED_SHORT, img);
		} else {
			// In WebGL 1.0 we use LUMINANCE (deprecated in WebGL 2.0 but supported for compatibility)
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
		}

		return tex;
	}
}

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['maskedimage'] = (options) => { return new LayerMaskedImage(options); }

export { LayerMaskedImage }