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
 * Constructs URLs for RSC resources based on layout type
 * @param {string} url - Base URL (typically the info.json path)
 * @param {number} multiply - number of idx/coef planes to load (input_params.sparsity_multiplier)
 * @returns {{
 *   dictpath: string,
 *   avgpath: string,
 *   idxpaths: string[],
 *   coefpaths: string[]
 * }}
 * @private
 */
	imageUrl(url, multiply) {
		const basename = Util.basenameNoExt(url);
		const basepath = Util.dirname(url);

		// Select extensions by layout
		const makePaths = (extDict, extAvg, extIdx, extCoef) => {
			const idxpaths = [];
			const coefpaths = [];
			for (let i = 0; i < multiply; i++) {
				const s = Util.padZeros(i, 2);
				idxpaths.push(`${basepath}/sparse_index_${s}${extIdx}`);
				coefpaths.push(`${basepath}/sparse_coeff_${s}${extCoef}`);
			}
			return {
				dictpath: `${basepath}/dictionary_atlas${extDict}`, 
				avgpath: `${basepath}/avg${extAvg}`,
				idxpaths,
				coefpaths
			};
		};

		switch (this.layout.type) {
			case 'image':
				// _avg.png, _idx_XX.png, _coef_XX.jpg
				return makePaths('.png', '.jpg', '.png', '.jpg');

			case 'deepzoom':
				// tutto in .dzi
				return makePaths('.png','.dzi', '.dzi', '.dzi');

			// Estendi qui quando implementerai altri layout
			case 'google':
			case 'tarzoom':
			case 'itarzoom':
			case 'zoomify':
			case 'iip':
			case 'iiif':
				throw new Error("Not yet implemented");

			default:
				throw new Error("Unknown layout: " + this.layout.type);
		}
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

			this.pixelSize = 1.0;
			//if (json.pixelSizeInMM) this.pixelSize = json.pixelSizeInMM;

			const sm = json.input_params.sparsity_multiplier;
			console.log("INPUT", json.input_params);
			const configPaths = this.imageUrl(url, sm);

			this.shader.init(json);
			const urls = [];
			this.rasters = [];

			// DICT (static texture) 16bit rgba ui
			await this.addStaticTexture({
				url: configPaths.dictpath,
				uniform: 'dict',
				sizeUniform: 'dictionary_size',
				format: 'rgba16ui',
				isLinear: true,
				dataLoader: LayerRSC.pngLoaderToUint16,
				use16Bit: true
			});

			console.log(configPaths);

			// AVG 

			console.log("Set Raster AVG ", configPaths.avgpath)
			urls.push(configPaths.avgpath);
			const raster_avg = new Raster({format: 'uvec3', isLinear: true});
			this.rasters.push(raster_avg);

			// IDX planes (uvec4)
			console.log("Set Raster IDX ");
			for (const idxPath of configPaths.idxpaths) {
				urls.push(idxPath);
				const raster_idx = new Raster({ format: 'uvec4', isLinear: true });
				this.rasters.push(raster_idx);
			}

			console.log("Set Raster COEF ");
			// COEF planes (vec3)
			for (const coefPath of configPaths.coefpaths) {
				urls.push(coefPath);
				const raster_coef = new Raster({ format: 'vec3', isLinear: true });
				this.rasters.push(raster_coef);
			}
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
