import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Raster16Bit } from './Raster16Bit.js'
import { ShaderRSC } from './ShaderRSC.js'
import { Transform } from './Transform.js'
import { Util } from './Util.js'

import { Png16Loader } from './Png16Loader.js'

/**
 * @typedef {Object} LayerRSCOptions
 * @property {string} url - URL to RTI info.json file (required)
 * @property {string} layout - Layout type: 'image', 'deepzoom', 'google', 'iiif', 'zoomify', 'tarzoom', 'itarzoom'
 * @property {boolean} [normals=false] - Whether to load normal maps
 * @property {string} [server] - IIP server URL (for IIP layout)
 * @property {number} [worldRotation=0] - Global rotation offset
 * @extends LayerOptions
 */

/**
 * LayerRTI implements Reflectance Transformation Imaging (RTI) visualization.
 * 
 * RTI is an imaging technique that captures surface reflectance data to enable
 * interactive relighting of an object from different directions. The layer handles
 * the 'relight' data format, which consists of:
 * 
 * - info.json: Contains RTI parameters and configuration
 * - plane_*.jpg: Series of coefficient images
 * - normals.jpg: Optional normal map (when using normals=true)
 * 
 * Features:
 * - Interactive relighting
 * - Multiple layout support
 * - Normal map integration
 * - Light direction control
 * - Animation support
 * - World rotation handling
 * 
 * Technical Details:
 * - Uses coefficient-based relighting
 * - Supports multiple image planes
 * - Handles various tiling schemes
 * - Manages WebGL resources
 * - Coordinates light transformations
 * 
 * Data Format Support:
 * - Relight JSON configuration
 * - Multiple layout systems
 * - JPEG coefficient planes
 * - Optional normal maps
 * - IIP image protocol
 * 
 * @extends Layer
 * 
 * @example
 * ```javascript
 * // Create RTI layer with deepzoom layout
 * const rtiLayer = new OpenLIME.Layer({
 *   type: 'rti',
 *   url: 'path/to/info.json',
 *   layout: 'deepzoom',
 *   normals: true
 * });
 * 
 * // Add to viewer
 * viewer.addLayer('rti', rtiLayer);
 * 
 * // Change light direction with animation
 * rtiLayer.setLight([0.5, 0.5], 1000);
 * ```
 * 
 * @see {@link https://github.com/cnr-isti-vclab/relight|Relight on GitHub}
 */
class LayerRSC extends Layer {
	/**
	 * Creates a new LayerRTI instance
	 * @param {LayerRSCOptions} options - Configuration options
	 * @throws {Error} If rasters options is not empty
	 * @throws {Error} If url is not provided
	 */
	constructor(options) {
		super(options);

		if (Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if (!this.url)
			throw "Url option is required";

		this.shaders['rsc'] = new ShaderRSC({ debug: false });
		this.setShader('rsc');

		this.addControl('light', [0, 0]);
		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.

		this.loadJson(this.url);
	}

	/**
	 * Constructs URL for image plane resources based on layout type
	 * @param {string} url - Base URL
	 * @param {string} plane - Plane identifier
	 * @returns {string} Complete URL for the resource
	 * @private
	 */
	imageUrl(url, plane) {
		let path = this.url.substring(0, this.url.lastIndexOf('/') + 1);
		switch (this.layout.type) {
			case 'image': return path + plane + '.jpg'; break;
			case 'google': return path + plane; break;
			case 'deepzoom': return path + plane + '.dzi'; break;
			case 'tarzoom': return path + plane + '.tzi'; break;
			case 'itarzoom': return path + 'planes.tzi'; break;
			case 'zoomify': return path + plane + '/ImageProperties.xml'; break;
			case 'iip': return url; break;
			case 'iiif': throw Error("Unimplemented");
			default: throw Error("Unknown layout: " + layout.type);
		}
	}

	/**
	 * Sets the light direction with optional animation
	 * @param {number[]} light - Light direction vector [x, y]
	 * @param {number} [dt] - Animation duration in milliseconds
	 */
	setLight(light, dt) {
		this.setControl('light', light, dt);
	}


	static async pngLoaderToFloat(tile, gl, options) {
		const { width, height, data16, components } = await Png16Loader.load(tile.url);
		// data16 è Uint16Array, components dovrebbe essere 3 (RGB)

		const pixelCount = width * height;
		const out = new Float32Array(pixelCount * 4);

		const inv = 1.0 / 65535.0;

		for (let i = 0; i < pixelCount; i++) {
			const r = data16[i * components + 0] || 0;
			const g = data16[i * components + 1] || 0;
			const b = data16[i * components + 2] || 0;
			const a = (components == 4) ? data16[i * components + 3] : 65535.0;

			out[i * 4 + 0] = r * inv;
			out[i * 4 + 1] = g * inv;
			out[i * 4 + 2] = b * inv;
			out[i * 4 + 3] = a * inv;
		}

		return {
			data: out,
			width,
			height,
			channels: 4,
			statistics: {
				maxValue: null,
				avgLuminance: null,
				percentileLuminance: null
			}
		};
	}

	static async pngLoaderToUint16(tile, gl, options) {
		// Load the PNG using Png16Loader
		const { width, height, data16, components } = await Png16Loader.load(tile.url);

		const pixelCount = width * height;
		// Prepare output buffer with 4 channels (RGBA)
		const output = new Uint16Array(pixelCount * 4);

		// Throw if length mismatch between data16 array and expected pixels * components
		if (data16.length !== pixelCount * components) {
			throw new Error(`Data length mismatch: expected ${pixelCount * components}, got ${data16.length}`);
		}

		// Iterate over each pixel
		for (let i = 0; i < pixelCount; i++) {
			// Extract color channels, provide default fallback values if channel missing
			const r = data16[i * components + 0] || 65535;
			const g = data16[i * components + 1] || 0;
			const b = data16[i * components + 2] || 0;
			const a = (components === 4) ? data16[i * components + 3] : 65535;

			// Assign to output as RGBA
			output[i * 4 + 0] = r;
			output[i * 4 + 1] = g;
			output[i * 4 + 2] = b;
			output[i * 4 + 3] = a;
		}

		//console.log('Raster loader: Uint16Array output sample:', output.slice(0, 20), 'width:', width, 'height:', height, 'channels:', 4);

		return {
			data: output,
			width,
			height,
			channels: 4,
			statistics: {
				maxValue: null,
				avgLuminance: null,
				percentileLuminance: null
			}
		};
	}

	/**
	 * Loads and processes RTI configuration
	 * @param {string} url - URL to info.json
	 * @private
	 * @async
	 */
	loadJson(url) {
		(async () => {

			const json = await Util.loadJSON(url);
			// console.log(json);

			// Update layout image format and pixelSize if provided in info.json
			//this.layout.suffix = json.format;
			//if (json.pixelSizeInMM) this.pixelSize = json.pixelSizeInMM;


			const basename = Util.basename(json.base_path);
			const basepath = Util.dirname(url);

			//const avgpath = basepath + "/" + basename + "_avg.png";
			const avgpath = basepath + "/" + basename + "_avg.dzi";
			const dictpath = basepath + "/" + basename + "_dict.png";
			const idx00path = basepath + "/" + basename + "_idx_00.dzi ";
			const idx01path = basepath + "/" + basename + "_idx_01.dzi ";
			const coef00path = basepath + "/" + basename + "_coef_00.dzi ";
			const coef01path = basepath + "/" + basename + "_coef_01.dzi ";

			// console.log("AVG PATH: ", avgpath);
			// console.log("DICT PATH: ", dictpath);
			// console.log("IDX00 PATH: ", idx00path);
			// console.log("IDX01 PATH: ", idx01path);
			// console.log("COEF00 PATH: ", coef00path);
			// console.log("COEF01 PATH: ", coef01path);

			this.shader.init(json);
			const urls = [];
			this.rasters = [];

			// DICT (static texture)
			await this.addStaticTexture({
				url: dictpath,
				uniform: 'dict',
				sizeUniform: 'u_dictSize',
				format: 'rgba16ui',
				isLinear: true,
				dataLoader: LayerRSC.pngLoaderToUint16,
				use16Bit: true
			});

			// IMG 8bit (static texture)
			const texture8bitPath = basepath + "/" + basename + "_coef_00.jpg";
			await this.addStaticTexture({
				url: texture8bitPath,
				uniform: 'texture8bit',
				sizeUniform: 'u_texture8bitSize',
				format: 'vec3',
				isLinear: true,
				dataLoader: null,  // Usa il loader di default per JPEG
				use16Bit: false
			});


			// AVG 
			urls.push(avgpath);
			const raster_avg = new Raster16Bit({
				format: 'rgba16ui',
				isLinear: true,
				debug: false,
				dataLoader: LayerRSC.pngLoaderToUint16
			});
			this.rasters.push(raster_avg);

			// IDX00
			urls.push(idx00path);
			const raster_idx00 = new Raster({ format: 'vec4', isLinear: true });
			this.rasters.push(raster_idx00);

			// IDX01
			urls.push(idx01path);
			const raster_idx01 = new Raster({ format: 'vec4', isLinear: true });
			this.rasters.push(raster_idx01);

			// COEF00
			urls.push(coef00path);
			const raster_coef00 = new Raster({ format: 'vec4', isLinear: true });
			this.rasters.push(raster_coef00);

			// COEF01
			urls.push(coef01path);
			const raster_coef01 = new Raster({ format: 'vec4', isLinear: true });
			this.rasters.push(raster_coef01);

			this.layout.setUrls(urls);

		})().catch(e => { console.log(e); this.status = e; });
	}

	/**
	 * Updates light direction based on control state
	 * Handles world rotation transformations
	 * @returns {boolean} Whether interpolation is complete
	 * @override
	 * @private
	 */
	interpolateControls() {
		let done = super.interpolateControls();
		if (!done) {
			let light = this.controls['light'].current.value;
			//this.shader.setLight(light);
			let rotated = Transform.rotate(light[0], light[1], this.worldRotation * Math.PI);
			this.shader.setLight([rotated.x, rotated.y]);
		}
		return done;
	}

	/**
	 * Renders the RTI visualization
	 * Updates world rotation and manages drawing
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @returns {boolean} Whether render completed successfully
	 * @override
	 * @private
	 */
	draw(transform, viewport) {
		this.worldRotation = transform.a + this.transform.a;
		return super.draw(transform, viewport);
	}
}

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['rsc'] = (options) => { return new LayerRSC(options); }

export { LayerRSC }
