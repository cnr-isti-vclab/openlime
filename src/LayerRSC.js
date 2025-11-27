import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Raster16Bit } from './Raster16Bit.js'
import { ShaderRSC } from './ShaderRSC.js'
import { Transform } from './Transform.js'
import { Util } from './Util.js'
import { addSignals } from './Signals.js'

import { Png16Loader } from './Png16Loader.js'

/**
 * @typedef {Object} LayerRSCOptions
 * @property {string} url - URL to rsc info.json file (required)
 * @property {string} layout - Layout type: 'image', 'deepzoom', 'google', 'iiif', 'zoomify', 'tarzoom', 'itarzoom'
 * @property {boolean} [normals=false] - Whether to load normal maps
 * @property {string} [server] - IIP server URL (for IIP layout)
 * @property {number} [worldRotation=0] - Global rotation offset
 * @extends LayerOptions
 */

/**
 * LayerRSC implements Relighting Sparse Coding visualization.
 * 
 * RSC that reconstruct light interaction using a sparse linear combination
 * of elements from an overcomplete dictionary.
 * 
 * Data Structure: 
 * - info.json: Contains rsc parameters and configuration
 * - dictionary_atlas.png: 16 bit RGBA texture atlas of dictionary elements
 * - avg.jpg or avg.dzi: Average image plane
 * - sparse_index_XX.png or sparse_index_XX.dzi: Index planes mapping pixels to dictionary elements
 * - sparse_coeff_XX.jpg or sparse_coeff_XX.dzi: Coefficient planes with weights for dictionary elements 
 * 
 * @extends Layer
 * 
 * @example
 * ```javascript
 * // Create rsc layer with deepzoom layout
 * const rscLayer = new OpenLIME.Layer({
 *   type: 'rsc',
 *   url: 'path/to/info.json',
 *   layout: 'deepzoom',
 *   normals: true
 * });
 * 
 * // Add to viewer
 * viewer.addLayer('rsc', rscLayer);
 * 
 * // Change light direction with animation
 * rscLayer.setLight([0.5, 0.5], 1000);
 * ```
 */
class LayerRSC extends Layer {
	/**
	 * Creates a new LayerRSC instance
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

		this.lightDirs_ = [];

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
		const output = new Uint16Array(pixelCount * components);

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
			output[i * components + 0] = r;
			output[i * components + 1] = g;
			output[i * components + 2] = b;
			output[i * components + 3] = a;
		}

		//console.log('Raster loader: Uint16Array output sample:', output.slice(0, 20), 'width:', width, 'height:', height, 'channels:', 4);

		return {
			data: output,
			width,
			height,
			channels: components,
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
				return makePaths('.png', '.dzi', '.dzi', '.dzi');

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
	 * Loads and processes rsc configuration
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

			console.log("Set Raster DICT ", configPaths.dictpath)
			// DICT (static texture) 16bit rgba ui
			await this.addStaticTexture({
				url: configPaths.dictpath,
				uniform: 'dict',
				sizeUniform: 'dictionary_size',
				format: 'rgb16f',
				isLinear: true,
				dataLoader: LayerRSC.pngLoaderToFloat,
				use16Bit: true,
				buildMipmaps: false
			});

			// AVG 
			console.log("Set Raster AVG ", configPaths.avgpath)
			urls.push(configPaths.avgpath);
			const raster_avg = new Raster({ format: 'vec3', buildMipmaps: false });
			this.rasters.push(raster_avg);

			// IDX  (uvec4)
			console.log("Set Raster IDX ");
			for (const idxPath of configPaths.idxpaths) {
				urls.push(idxPath);
				const raster_idx = new Raster({ format: 'uvec4', buildMipmaps: false, filterLinear: false });
				this.rasters.push(raster_idx);
			}

			console.log("Set Raster COEF ");
			// COEF planes (vec3)
			for (const coefPath of configPaths.coefpaths) {
				urls.push(coefPath);
				// Use coefficients with nearest filtering to avoid interpolation artifacts
				const raster_coef = new Raster({ format: 'vec3', filterLinear: false, buildMipmaps:false });
				this.rasters.push(raster_coef);
			}
			this.layout.setUrls(urls);
			const tld = json.input_params.training_light_directions;
			this.lightDirs_ = Array.isArray(tld)
				? tld
				: [];

			// Normalization
			this.lightDirs_ = (Array.isArray(tld) ? tld : []).map(([x, y, z]) => {
				const n = Math.hypot(x, y, z);     // norm = sqrt(x**2+y**2+z**2)
				return n > 0 ? [x / n, y / n, z / n] : [0, 0, 0];
			});

			// Notifica che il layer è stato caricato
			this.emit('config_ready');

		})().catch(e => { console.log(e); this.status = e; });
	}

	/**
	 * Returns the training light directions loaded from the rsc configuration.
	 * Each element is a triplet [x, y, z] representing a normalized
	 * light direction on the hemisphere.
	 *
	 * @returns {number[][]} Array of training light direction vectors.
	 */
	lightDirs() {
		return this.lightDirs_;
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
	 * Renders the rsc visualization
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

addSignals(LayerRSC, 'config_ready');

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['rsc'] = (options) => { return new LayerRSC(options); }

export { LayerRSC }