import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Raster16Bit } from './Raster16Bit.js'
import { ShaderRILSR } from './ShaderRILSR.js'
import { Transform } from './Transform.js'
import { Util } from './Util.js'
import { addSignals } from './Signals.js'

import { Png16Loader } from './Png16Loader.js'

/**
 * @typedef {Object} LayerRILSR~Options
 * @property {string} url - URL to the RILSR info.json file (required)
 * @property {string} layout - Layout type: 'image', 'deepzoom', 'google', 'iiif', 'zoomify', 'tarzoom', 'itarzoom'
 * @property {boolean} [normals=false] - Whether to load normal maps
 * @property {string} [server] - IIP server URL (for IIP layout)
 * @property {number} [worldRotation=0] - Global rotation offset
 * @property {number} [edgeDictionaryCutoff=0.2] - Semantic cutoff used by
 * dictionary-aware edge suppression
 * @property {number} [coherenceLow=0] - Lower unnormalized directional-response
 * coherence bound
 * @property {number} [coherenceHigh=0.02] - Upper unnormalized directional-response
 * coherence bound
 * @property {number} [coherenceNormalizedLow=0.95] - Lower normalized
 * directional-response coherence bound
 * @property {number} [coherenceNormalizedHigh=0.995] - Upper normalized
 * directional-response coherence bound
 * @property {number} [dictionaryFamilyCount=12] - Number of runtime dictionary
 * families in the dominant-family diagnostic
 * @property {number} [atlasIntensityPowerAlpha=1] - Atlas intensity-power
 * exponent in the inclusive range `[0.125, 8]`
 * @property {boolean} [atlasIntensityPowerPreserveEnergy=true] - Preserve the
 * squared RGB energy of each transformed atlas tile
 * @extends LayerOptions
 */

/**
 * LayerRILSR renders Relightable Images via Learned Sparse Representations (RILSR).
 * 
 * RILSR decomposes the reflectance field into per-pixel sparse codes and a
 * globally learned dictionary. Dictionary atoms are pre-interpolated into a
 * two-dimensional texture atlas, so arbitrary relighting is a sparse linear
 * combination of fast bilinear texture fetches.
 * The resulting compact representation is stored in native web formats
 * (JSON, JPEG, and PNG), enabling direct transmission and rendering in WebGL.
 * 
 * Data format:
 * - info.json: Contains RILSR parameters and configuration
 * - dictionary_atlas.png: 16 bit RGBA texture atlas of dictionary elements
 * - avg.jpg or avg.dzi: Average image plane
 * - sparse_index_XX.png or sparse_index_XX.dzi: Index planes mapping pixels to dictionary elements
 * - sparse_coeff_XX.jpg or sparse_coeff_XX.dzi: Coefficient planes with weights for dictionary elements 
 * - mask.dzi (optional): Black pixels are discarded before rendering
 * 
 * @extends Layer
 * 
 * @example
 * ```javascript
 * // Create a RILSR layer with deepzoom layout
 * const rilsrLayer = new OpenLIME.Layer({
 *   type: 'rilsr',
 *   url: 'path/to/info.json',
 *   layout: 'deepzoom',
 *   normals: true
 * });
 * 
 * // Add to viewer
 * viewer.addLayer('rilsr', rilsrLayer);
 * 
 * // Change light direction with animation
 * rilsrLayer.setLight([0.5, 0.5], 1000);
 * ```
 */
class LayerRILSR extends Layer {
	/**
 	 * Creates a new LayerRILSR instance.
 	 * @param {LayerRILSR~Options} options - Configuration options
	 * @throws {Error} If rasters options is not empty
	 */
	constructor(options) {
		super(options);

		if (!this.sourceLayer && Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		this.lightDirs_ = [];
		this._responseTransferReady = false;
		this._responseTransferTimer = null;
		this._responseTransferSharpness = null;
		this._responseTransferPendingSharpness = null;
		this._atlasIntensityPowerReady = false;
		this._atlasIntensityPowerTimer = null;
		this._atlasIntensityPowerAlpha = null;
		this._atlasIntensityPowerPreserveEnergy = null;
		this._atlasIntensityPowerPendingAlpha = null;
		this._atlasIntensityPowerPendingPreserveEnergy = null;
		this._dictionaryGramData = null;
		this._dictionaryFamilyData = null;
		this._dictionaryFamilyCount = this.dictionaryFamilyCount ?? 12;

		this.shaders['rilsr'] = new ShaderRILSR({
			debug: false,
			edgeDictionaryCutoff: this.edgeDictionaryCutoff ?? 0.2,
			coherenceLow: this.coherenceLow ?? 0.0,
			coherenceHigh: this.coherenceHigh ?? 0.02,
			coherenceNormalizedLow: this.coherenceNormalizedLow ?? 0.95,
			coherenceNormalizedHigh: this.coherenceNormalizedHigh ?? 0.995,
			dictionaryFamilyCount: this._dictionaryFamilyCount,
			atlasIntensityPowerAlpha: this.atlasIntensityPowerAlpha ?? 1.0,
			atlasIntensityPowerPreserveEnergy: this.atlasIntensityPowerPreserveEnergy ?? true
		});
		this.setShader('rilsr');
		this.shader.addEvent('update', () => this._queueResponseTransferAtlasUpdate());

		this.addControl('light', [0, 0]);
		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.

		if (this.sourceLayer) {
			const initFromSource = () => {
				const config = this.sourceLayer.shader?.config ?? this.sourceLayer.json;
				if (!config || this.shader.config) return;

				this.shader.init(config);
				this.lightDirs_ = this.sourceLayer.lightDirs_ ?? [];
				if (this.mode) this.setMode(this.mode);
				this.setupTiles();
			};
			initFromSource();
			if (!this.shader.config)
				this.sourceLayer.addEvent('config_ready', initFromSource);
		} else {
			this.loadJson(this.url);
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

	/**
	 * Sets response-transfer sharpness and invalidates the shared transformed atlas.
	 * Derived lens layers forward the cache parameter to their source layer while
	 * retaining the same value in their own shader state.
	 * @param {number} value Sharpness in the inclusive range `[-1, 1]`.
	 */
	setResponseSharpness(value) {
		this.shader.setResponseSharpness(value);
		const root = this.sourceLayer || this;
		if (root !== this) root.shader.setResponseSharpness(value);
		root._queueResponseTransferAtlasUpdate();
	}

	/**
	 * Sets the directional contrast gain for this RILSR rendering layer.
	 * @param {number} value Non-negative directional gain.
	 */
	setResponseDirectionalGain(value) {
		this.shader.setResponseDirectionalGain(value);
	}

	/**
	 * Sets the exponent for atlas intensity-power relighting and rebuilds the
	 * shared transformed dictionary atlas.
	 * @param {number} value Exponent in the inclusive range `[0.125, 8]`.
	 */
	setAtlasIntensityPowerAlpha(value) {
		this.shader.setAtlasIntensityPowerAlpha(value);
		const root = this.sourceLayer || this;
		if (root !== this) root.shader.setAtlasIntensityPowerAlpha(value);
		root._queueAtlasIntensityPowerUpdate();
	}

	/**
	 * Enables or disables energy preservation for atlas intensity-power.
	 * @param {boolean} enabled Whether each transformed atlas tile is rescaled.
	 */
	setAtlasIntensityPowerPreserveEnergy(enabled) {
		this.shader.setAtlasIntensityPowerPreserveEnergy(enabled);
		const root = this.sourceLayer || this;
		if (root !== this) root.shader.setAtlasIntensityPowerPreserveEnergy(enabled);
		root._queueAtlasIntensityPowerUpdate();
	}

	/**
	 * Sets the semantic cutoff for dictionary-aware edge suppression.
	 * @param {number} value Cosine-distance cutoff in the inclusive range `[0, 1]`.
	 */
	setEdgeDictionaryCutoff(value) {
		this.shader.setEdgeDictionaryCutoff(value);
	}

	/**
	 * Sets the similarity range used by both directional-response coherence modes.
	 * @param {number} low Lower smoothstep bound.
	 * @param {number} high Upper smoothstep bound.
	 * @param {boolean} [normalized=false] Set the normalized-mode range.
	 */
	setResponseCoherenceRange(low, high, normalized = false) {
		this.shader.setResponseCoherenceRange(low, high, normalized);
	}

	/**
	 * Rebuilds the runtime atom-family lookup from the dictionary Gram matrix.
	 * Derived layers forward the shared lookup update to their source layer.
	 * @param {number} value Integer family count in [2, 255].
	 */
	setDictionaryFamilyCount(value) {
		const root = this.sourceLayer || this;
		root._setDictionaryFamilyCount(value);
		this.shader.setDictionaryFamilyCount(value);
	}

	/** @private */
	_setDictionaryFamilyCount(value) {
		this.shader.setDictionaryFamilyCount(value);
		this._dictionaryFamilyCount = Number(value);
		this._dictionaryFamilyData = this._buildDictionaryFamilies(this._dictionaryFamilyCount);
		const available = this._dictionaryFamilyData !== null;
		this.shader.setDictionaryFamiliesEnabled(available);
		if (this.gl) this._initializeDictionaryFamilies(this.gl);
		this.emit('update');
	}

	/**
	 * Loads the precomputed D^T D / L dictionary Gram matrix as float32.
	 * @param {Object} config Parsed RILSR configuration.
	 * @param {string} infoUrl URL of info.json.
	 * @returns {Promise<Float32Array|null>}
	 * @private
	 */
	async _loadDictionaryGram(config, infoUrl) {
		if (config.output_params.dictionary_gram_format !== 'raw') return null;
		const atomCount = config.input_params.dictionary_atom_count || config.output_params.dictionary_cols;
		if (!Number.isInteger(atomCount) || atomCount <= 0) return null;
		const url = `${Util.dirname(infoUrl)}/dictionary_gram.raw`;
		try {
			const response = await fetch(url);
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			const buffer = await response.arrayBuffer();
			const expectedBytes = atomCount * atomCount * Float32Array.BYTES_PER_ELEMENT;
			if (buffer.byteLength !== expectedBytes)
				throw new Error(`expected ${expectedBytes} bytes, received ${buffer.byteLength}`);
			const data = new Float32Array(buffer);
			for (let i = 0; i < data.length; ++i)
				if (!Number.isFinite(data[i])) throw new Error(`non-finite value at entry ${i}`);
			return data;
		} catch (error) {
			console.warn(`Unable to load RILSR dictionary Gram matrix from ${url}: ${error.message}`);
			return null;
		}
	}

	/** @private */
	_initializeDictionaryGram(gl) {
		const target = this._responseTransferTexture('dictionary_gram');
		if (!target) return;
		const atomCount = this.shader.config.input_params.dictionary_atom_count ||
			this.shader.config.output_params.dictionary_cols;
		const available = this._dictionaryGramData instanceof Float32Array &&
			this._dictionaryGramData.length === atomCount * atomCount;
		const data = available ? this._dictionaryGramData : new Float32Array([0]);
		const size = available ? atomCount : 1;

		if (!target.texture) target.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, target.texture);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, size, size, 0, gl.RED, gl.FLOAT, data);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		target.width = size;
		target.height = size;
		this.shader.setResponseCoherenceEnabled(available);
	}

	/**
	 * Clusters atoms with deterministic, density-aware k-medoids in absolute
	 * cosine space. Unlike pure farthest-point sampling, the initialization
	 * avoids spending a family on an isolated dictionary outlier; a short
	 * medoid-refinement pass then makes every family representative of its
	 * assigned cluster. The output is a compact atom-index -> family-index
	 * lookup for the shader.
	 * @param {number} requestedCount Number of families.
	 * @returns {Uint8Array|null}
	 * @private
	 */
	_buildDictionaryFamilies(requestedCount) {
		const atomCount = this.shader.config.input_params.dictionary_atom_count ||
			this.shader.config.output_params.dictionary_cols;
		const gram = this._dictionaryGramData;
		if (!(gram instanceof Float32Array) || gram.length !== atomCount * atomCount)
			return null;
		const familyCount = Math.min(requestedCount, atomCount);
		if (!Number.isInteger(familyCount) || familyCount < 2) return null;
		const energies = new Float32Array(atomCount);
		for (let atom = 0; atom < atomCount; ++atom)
			energies[atom] = Math.max(0, gram[atom * atomCount + atom]);
		const similarity = (a, b) => {
			const denominator = Math.sqrt(energies[a] * energies[b]);
			return denominator > 1e-12
				? Math.min(1, Math.abs(gram[a * atomCount + b] / denominator))
				: (a === b ? 1 : 0);
		};
		// Density is the total similarity to the full dictionary. It favours
		// representatives of populated response families over isolated atoms.
		const densities = new Float32Array(atomCount);
		let firstMedoid = 0;
		for (let atom = 0; atom < atomCount; ++atom) {
			let density = 0;
			for (let other = 0; other < atomCount; ++other)
				density += similarity(atom, other);
			densities[atom] = density;
			if (density > densities[firstMedoid]) firstMedoid = atom;
		}
		const medoids = [firstMedoid];
		while (medoids.length < familyCount) {
			let candidate = 0;
			let highestScore = -Infinity;
			for (let atom = 0; atom < atomCount; ++atom) {
				if (medoids.includes(atom)) continue;
				let bestSimilarity = 0;
				for (const medoid of medoids)
					bestSimilarity = Math.max(bestSimilarity, similarity(atom, medoid));
				const score = densities[atom] * (1.0 - bestSimilarity);
				if (score > highestScore) {
					highestScore = score;
					candidate = atom;
				}
			}
			medoids.push(candidate);
		}
		const families = new Uint8Array(atomCount);
		const assignFamilies = () => {
			for (let atom = 0; atom < atomCount; ++atom) {
				let bestFamily = 0;
				let bestSimilarity = -1;
				for (let family = 0; family < medoids.length; ++family) {
					const value = similarity(atom, medoids[family]);
					if (value > bestSimilarity) {
						bestSimilarity = value;
						bestFamily = family;
					}
				}
				families[atom] = bestFamily;
			}
		};
		// A few deterministic k-medoids updates are sufficient for the small
		// (typically 512 atom) dictionary and are run only when the UI changes F.
		for (let iteration = 0; iteration < 4; ++iteration) {
			assignFamilies();
			let changed = false;
			for (let family = 0; family < familyCount; ++family) {
				let bestMedoid = medoids[family];
				let bestTotalSimilarity = -Infinity;
				for (let candidate = 0; candidate < atomCount; ++candidate) {
					if (families[candidate] !== family) continue;
					let totalSimilarity = 0;
					for (let member = 0; member < atomCount; ++member)
						if (families[member] === family)
							totalSimilarity += similarity(candidate, member);
					if (totalSimilarity > bestTotalSimilarity) {
						bestTotalSimilarity = totalSimilarity;
						bestMedoid = candidate;
					}
				}
				if (bestMedoid !== medoids[family]) {
					medoids[family] = bestMedoid;
					changed = true;
				}
			}
			if (!changed) break;
		}
		assignFamilies();
		return families;
	}

	/** @private */
	_initializeDictionaryFamilies(gl) {
		const target = this._responseTransferTexture('dictionary_families');
		if (!target) return;
		const data = this._dictionaryFamilyData || new Uint8Array([0]);
		if (!target.texture) target.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, target.texture);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8UI, data.length, 1, 0, gl.RED_INTEGER, gl.UNSIGNED_BYTE, data);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		target.width = data.length;
		target.height = 1;
		this.shader.setDictionaryFamiliesEnabled(this._dictionaryFamilyData !== null);
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
	 * Returns the shared static-texture descriptor for a uniform.
	 * @param {string} uniform Texture uniform name.
	 * @returns {Object|undefined}
	 * @private
	 */
	_responseTransferTexture(uniform) {
		return this.staticTextures.find(texture => texture.uniform === uniform);
	}

	/**
	 * Creates or replaces a linearly filtered RGBA16F texture.
	 * @param {WebGL2RenderingContext} gl
	 * @param {Object} target Shared static-texture descriptor.
	 * @param {Float32Array} data Texture data.
	 * @param {number} width Texture width.
	 * @param {number} height Texture height.
	 * @private
	 */
	_uploadResponseTransferTexture(gl, target, data, width, height) {
		if (!target.texture) target.texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, target.texture);
		gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, data);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		target.width = width;
		target.height = height;
	}

	/**
	 * Builds the transformed dictionary atlas once for a sharpness value.
	 *
	 * This is the atlas-domain equivalent of the offline response-transfer
	 * command. Rendering subsequently samples the cached atlas normally instead
	 * of recomputing 32×32 response statistics for every image pixel.
	 *
	 * @param {number} sharpness Unified response-transfer sharpness.
	 * @returns {{atlas: Float32Array, means: Float32Array, gains: Float32Array}|null}
	 * @private
	 */
	_buildResponseTransferAtlas(sharpness) {
		const config = this.shader.config;
		const dictionaryTexture = this._responseTransferTexture('dict');
		const source = dictionaryTexture?.sourceData;
		if (!config || !(source instanceof Float32Array)) return null;

		const { input_params: input, output_params: output } = config;
		const tileWidth = input.dictionary_atlas_atom_tile_w;
		const tileHeight = input.dictionary_atlas_atom_tile_h;
		const atomCount = input.dictionary_atom_count;
		const atomsPerRow = input.dictionary_atlas_atom_tile_nx || output.dictionary_atlas_atom_tile_nx;
		const atlasWidth = dictionaryTexture.width;
		const atlasHeight = dictionaryTexture.height;
		if (!Number.isInteger(tileWidth) || !Number.isInteger(tileHeight) || !Number.isInteger(atomCount) ||
			!Number.isInteger(atomsPerRow) || atlasWidth <= 0 || atlasHeight <= 0 || source.length !== atlasWidth * atlasHeight * 4)
			return null;

		const minimum = output.dictionary_quantizer_min_max.map(range => range[0]);
		const scale = output.dictionary_quantizer_min_max.map(range => range[1] - range[0]);
		const sampleCount = tileWidth * tileHeight;
		const atlas = new Float32Array(source.length);
		const means = new Float32Array(atomCount * 4);
		const gains = new Float32Array(atomCount * 4);
		const values = new Float32Array(sampleCount * 3);
		const transferred = new Float32Array(sampleCount * 3);
		const epsilon = 1e-8;
		const q = Math.max(-1, Math.min(1, Number(sharpness)));

		const transfer = value => {
			const magnitude = Math.abs(value);
			let transformed = magnitude;
			if (q > 0) {
				const t = Math.max(0, Math.min(1, (magnitude - 0.15) / 0.6));
				const gate = t * t * t * (t * (t * 6 - 15) + 10);
				transformed = (1 - q) * magnitude + q * magnitude * gate;
			} else if (q < 0) {
				const rational = 1.25 * magnitude / (magnitude + 0.25);
				transformed = (1 + q) * magnitude - q * rational;
			}
			return Math.sign(value) * transformed;
		};

		for (let atom = 0; atom < atomCount; ++atom) {
			const mean = [0, 0, 0];
			const responseScale = [0, 0, 0];
			const energy = [0, 0, 0];
			const transferredMean = [0, 0, 0];
			const transferredEnergy = [0, 0, 0];
			const tileX = atom % atomsPerRow;
			const tileY = Math.floor(atom / atomsPerRow);

			for (let y = 0; y < tileHeight; ++y) {
				for (let x = 0; x < tileWidth; ++x) {
					const sample = y * tileWidth + x;
					const sourceOffset = ((tileY * tileHeight + y) * atlasWidth + tileX * tileWidth + x) * 4;
					for (let channel = 0; channel < 3; ++channel) {
						const value = source[sourceOffset + channel] * scale[channel] + minimum[channel];
						values[sample * 3 + channel] = value;
						mean[channel] += value;
					}
				}
			}
			for (let channel = 0; channel < 3; ++channel) mean[channel] /= sampleCount;

			for (let sample = 0; sample < sampleCount; ++sample) {
				for (let channel = 0; channel < 3; ++channel) {
					const residual = values[sample * 3 + channel] - mean[channel];
					responseScale[channel] = Math.max(responseScale[channel], Math.abs(residual));
					energy[channel] += residual * residual;
				}
			}

			for (let sample = 0; sample < sampleCount; ++sample) {
				for (let channel = 0; channel < 3; ++channel) {
					const residual = values[sample * 3 + channel] - mean[channel];
					const normalized = Math.max(-1, Math.min(1, residual / Math.max(responseScale[channel], epsilon)));
					const value = transfer(normalized);
					transferred[sample * 3 + channel] = value;
					transferredMean[channel] += value;
				}
			}
			for (let channel = 0; channel < 3; ++channel) transferredMean[channel] /= sampleCount;

			for (let sample = 0; sample < sampleCount; ++sample)
				for (let channel = 0; channel < 3; ++channel) {
					const centered = transferred[sample * 3 + channel] - transferredMean[channel];
					transferredEnergy[channel] += centered * centered;
				}

			for (let channel = 0; channel < 3; ++channel) {
				means[atom * 4 + channel] = mean[channel];
				gains[atom * 4 + channel] = energy[channel] > epsilon && responseScale[channel] > epsilon &&
					Math.sqrt(transferredEnergy[channel]) > epsilon ? 1 : 0;
			}
			means[atom * 4 + 3] = 1;
			gains[atom * 4 + 3] = 1;

			for (let y = 0; y < tileHeight; ++y) {
				for (let x = 0; x < tileWidth; ++x) {
					const sample = y * tileWidth + x;
					const destinationOffset = ((tileY * tileHeight + y) * atlasWidth + tileX * tileWidth + x) * 4;
					for (let channel = 0; channel < 3; ++channel) {
						const hasSignal = energy[channel] > epsilon && responseScale[channel] > epsilon;
						const hasTransferredSignal = Math.sqrt(transferredEnergy[channel]) > epsilon;
						const value = !hasSignal ? mean[channel]
							: !hasTransferredSignal ? values[sample * 3 + channel]
							: mean[channel] + (transferred[sample * 3 + channel] - transferredMean[channel]) *
								Math.sqrt(energy[channel]) / Math.sqrt(transferredEnergy[channel]);
						atlas[destinationOffset + channel] = value;
					}
					atlas[destinationOffset + 3] = 1;
				}
			}
		}
		return { atlas, means, gains };
	}

	/**
	 * Builds the atlas-intensity-power transform specified by LumiLab. Each
	 * atlas texel is treated as one signed RGB vector: its direction is retained
	 * and only its magnitude is mapped relative to the tile maximum.
	 *
	 * @param {number} alpha Intensity exponent in `[0.125, 8]`.
	 * @param {boolean} preserveEnergy Rescale each tile to its input energy.
	 * @returns {Float32Array|null}
	 * @private
	 */
	_buildAtlasIntensityPowerAtlas(alpha, preserveEnergy) {
		const config = this.shader.config;
		const dictionaryTexture = this._responseTransferTexture('dict');
		const source = dictionaryTexture?.sourceData;
		if (!config || !(source instanceof Float32Array)) return null;

		const { input_params: input, output_params: output } = config;
		const tileWidth = input.dictionary_atlas_atom_tile_w;
		const tileHeight = input.dictionary_atlas_atom_tile_h;
		const atomCount = input.dictionary_atom_count;
		const atomsPerRow = input.dictionary_atlas_atom_tile_nx || output.dictionary_atlas_atom_tile_nx;
		const atlasWidth = dictionaryTexture.width;
		const atlasHeight = dictionaryTexture.height;
		if (!Number.isInteger(tileWidth) || !Number.isInteger(tileHeight) || !Number.isInteger(atomCount) ||
			!Number.isInteger(atomsPerRow) || atlasWidth <= 0 || atlasHeight <= 0 || source.length !== atlasWidth * atlasHeight * 4)
			return null;

		const minimum = output.dictionary_quantizer_min_max.map(range => range[0]);
		const scale = output.dictionary_quantizer_min_max.map(range => range[1] - range[0]);
		const atlas = new Float32Array(source.length);
		const exponent = Math.max(0.125, Math.min(8, Number(alpha)));
		const epsilon = 1e-8;

		for (let atom = 0; atom < atomCount; ++atom) {
			const tileX = atom % atomsPerRow;
			const tileY = Math.floor(atom / atomsPerRow);
			let maximumIntensity = 0;
			let originalEnergy = 0;
			for (let y = 0; y < tileHeight; ++y) {
				for (let x = 0; x < tileWidth; ++x) {
					const offset = ((tileY * tileHeight + y) * atlasWidth + tileX * tileWidth + x) * 4;
					const r = source[offset] * scale[0] + minimum[0];
					const g = source[offset + 1] * scale[1] + minimum[1];
					const b = source[offset + 2] * scale[2] + minimum[2];
					const intensity = Math.hypot(r, g, b);
					maximumIntensity = Math.max(maximumIntensity, intensity);
					originalEnergy += intensity * intensity;
				}
			}
			let transformedEnergy = 0;
			for (let y = 0; y < tileHeight; ++y) {
				for (let x = 0; x < tileWidth; ++x) {
					const offset = ((tileY * tileHeight + y) * atlasWidth + tileX * tileWidth + x) * 4;
					const r = source[offset] * scale[0] + minimum[0];
					const g = source[offset + 1] * scale[1] + minimum[1];
					const b = source[offset + 2] * scale[2] + minimum[2];
					const intensity = Math.hypot(r, g, b);
					const transformedIntensity = maximumIntensity > epsilon && intensity > epsilon
						? maximumIntensity * Math.pow(intensity / maximumIntensity, exponent)
						: 0;
					const factor = intensity > epsilon ? transformedIntensity / intensity : 0;
					atlas[offset] = r * factor;
					atlas[offset + 1] = g * factor;
					atlas[offset + 2] = b * factor;
					atlas[offset + 3] = 1;
					transformedEnergy += transformedIntensity * transformedIntensity;
				}
			}
			if (preserveEnergy && transformedEnergy > epsilon) {
				const energyScale = Math.sqrt(originalEnergy / transformedEnergy);
				for (let y = 0; y < tileHeight; ++y)
					for (let x = 0; x < tileWidth; ++x) {
						const offset = ((tileY * tileHeight + y) * atlasWidth + tileX * tileWidth + x) * 4;
						atlas[offset] *= energyScale;
						atlas[offset + 1] *= energyScale;
						atlas[offset + 2] *= energyScale;
					}
			}
		}
		return atlas;
	}

	/** @private */
	_initializeAtlasIntensityPowerAtlas(gl) {
		const target = this._responseTransferTexture('atlas_intensity_power_dict');
		const dictionaryTexture = this._responseTransferTexture('dict');
		if (!target || !dictionaryTexture) return;
		const alpha = this.shader.uniforms.atlas_intensity_power_alpha?.value ?? 1.0;
		const preserveEnergy = this.shader.uniforms.atlas_intensity_power_preserve_energy?.value ?? true;
		const atlas = this._buildAtlasIntensityPowerAtlas(alpha, preserveEnergy);
		if (!atlas) {
			console.warn('RILSR atlas intensity-power requires a decoded floating-point dictionary atlas.');
			return;
		}
		this._uploadResponseTransferTexture(gl, target, atlas, dictionaryTexture.width, dictionaryTexture.height);
		this._atlasIntensityPowerAlpha = alpha;
		this._atlasIntensityPowerPreserveEnergy = preserveEnergy;
		this._atlasIntensityPowerPendingAlpha = null;
		this._atlasIntensityPowerPendingPreserveEnergy = null;
		this._atlasIntensityPowerReady = true;
	}

	/** @private */
	_queueAtlasIntensityPowerUpdate() {
		const root = this.sourceLayer || this;
		if (root !== this) return root._queueAtlasIntensityPowerUpdate();
		if (!this._atlasIntensityPowerReady || !this.gl) return;
		const alpha = this.shader.uniforms.atlas_intensity_power_alpha?.value;
		const preserveEnergy = this.shader.uniforms.atlas_intensity_power_preserve_energy?.value ?? true;
		if (!Number.isFinite(alpha) || (alpha === this._atlasIntensityPowerAlpha &&
			preserveEnergy === this._atlasIntensityPowerPreserveEnergy)) return;
		if (alpha === this._atlasIntensityPowerPendingAlpha &&
			preserveEnergy === this._atlasIntensityPowerPendingPreserveEnergy) return;
		clearTimeout(this._atlasIntensityPowerTimer);
		this._atlasIntensityPowerPendingAlpha = alpha;
		this._atlasIntensityPowerPendingPreserveEnergy = preserveEnergy;
		this._atlasIntensityPowerTimer = setTimeout(() => {
			const target = this._responseTransferTexture('atlas_intensity_power_dict');
			const dictionaryTexture = this._responseTransferTexture('dict');
			const atlas = this._buildAtlasIntensityPowerAtlas(alpha, preserveEnergy);
			if (!target || !dictionaryTexture || !atlas) {
				this._atlasIntensityPowerPendingAlpha = null;
				this._atlasIntensityPowerPendingPreserveEnergy = null;
				return;
			}
			this._uploadResponseTransferTexture(this.gl, target, atlas, dictionaryTexture.width, dictionaryTexture.height);
			this._atlasIntensityPowerAlpha = alpha;
			this._atlasIntensityPowerPreserveEnergy = preserveEnergy;
			this._atlasIntensityPowerPendingAlpha = null;
			this._atlasIntensityPowerPendingPreserveEnergy = null;
			this.emit('update');
		}, 100);
	}

	/** @private */
	_initializeResponseTransferAtlases(gl) {
		const responseAtlas = this._responseTransferTexture('response_dict');
		const responseMeans = this._responseTransferTexture('response_mean');
		const responseGains = this._responseTransferTexture('response_gain');
		if (!responseAtlas || !responseMeans || !responseGains) return;
		const sharpness = this.shader.uniforms.response_sharpness?.value ?? 0.9;
		const result = this._buildResponseTransferAtlas(sharpness);
		if (!result) {
			console.warn('RILSR response transfer requires a decoded floating-point dictionary atlas.');
			return;
		}
		const dictionaryTexture = this._responseTransferTexture('dict');
		this._uploadResponseTransferTexture(gl, responseAtlas, result.atlas, dictionaryTexture.width, dictionaryTexture.height);
		this._uploadResponseTransferTexture(gl, responseMeans, result.means, result.means.length / 4, 1);
		this._uploadResponseTransferTexture(gl, responseGains, result.gains, result.gains.length / 4, 1);
		this._responseTransferSharpness = sharpness;
		this._responseTransferPendingSharpness = null;
		this._responseTransferReady = true;
	}

	/** @private */
	_queueResponseTransferAtlasUpdate() {
		const root = this.sourceLayer || this;
		if (root !== this) return root._queueResponseTransferAtlasUpdate();
		if (!this._responseTransferReady || !this.gl) return;
		const sharpness = this.shader.uniforms.response_sharpness?.value;
		if (!Number.isFinite(sharpness) || sharpness === this._responseTransferSharpness) return;
		if (sharpness === this._responseTransferPendingSharpness) return;
		clearTimeout(this._responseTransferTimer);
		this._responseTransferPendingSharpness = sharpness;
		this._responseTransferTimer = setTimeout(() => {
			const responseAtlas = this._responseTransferTexture('response_dict');
			const responseMeans = this._responseTransferTexture('response_mean');
			const responseGains = this._responseTransferTexture('response_gain');
			const dictionaryTexture = this._responseTransferTexture('dict');
			const result = this._buildResponseTransferAtlas(sharpness);
			if (!responseAtlas || !responseMeans || !responseGains || !dictionaryTexture || !result) {
				this._responseTransferPendingSharpness = null;
				return;
			}
			this._uploadResponseTransferTexture(this.gl, responseAtlas, result.atlas, dictionaryTexture.width, dictionaryTexture.height);
			this._uploadResponseTransferTexture(this.gl, responseMeans, result.means, result.means.length / 4, 1);
			this._uploadResponseTransferTexture(this.gl, responseGains, result.gains, result.gains.length / 4, 1);
			this._responseTransferSharpness = sharpness;
			this._responseTransferPendingSharpness = null;
			this.emit('update');
		}, 100);
	}

	/**
	 * Constructs URLs for RILSR resources based on layout type.
	 * @param {Object} json - Parsed info.json content
	 * @param {string} url - Base URL (typically the info.json path)
	 * @param {number} multiply - number of idx/coef planes to load (input_params.sparsity_multiplier)
	 * @returns {{
	 *   dictpath: string,
	 *   avgpath: string,
	 *   idxpaths: string[],
	 *   coefpaths: string[],
	 *   maskpath: string|null
	 * }}
	 * @private
	 */
	imageUrl(json, url, multiply) {
		const basename = Util.basenameNoExt(url);
		const basepath = Util.dirname(url);

		const extDict = "." + json['input_params']['dictionary_format'];
		const extAvg  = "." + json['input_params']['sparse_coding_average_format'];
		const extCoef = "." + json['input_params']['sparse_coding_coefficient_format'];
		const extIdx  = "." + json['output_params']['index_format'];

		console.log("Extensions: dict", extDict, ", avg", extAvg, ", coef", extCoef, ", idx", extIdx);
		// Select extensions by layout
		const mask = json.input_params.mask;
		const maskpath = typeof mask === 'string' && mask.length > 0
			? (/^(?:[a-z][a-z0-9+.-]*:)?\//i.test(mask) ? mask : `${basepath}/${mask}`)
			: null;
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
				coefpaths,
				maskpath
			};
		};

		switch (this.layout.type) {
			case 'image':
				// _avg.png, _idx_XX.png, _coef_XX.jpg
				return makePaths(extDict, extAvg, extIdx, extCoef);

			case 'deepzoom':
				// tutto in .dzi
				return makePaths(extDict, '.dzi', '.dzi', '.dzi');

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
	 * Loads and processes RILSR configuration.
	 * @param {string} url - URL to info.json
	 * @private
	 * @async
	 */
	loadJson(url) {
		(async () => {

			console.log("Loading RILSR config from ", url);

			const json = await Util.loadJSON(url);
			this.json = json;
			// console.log(json);

			this.pixelSize = 1.0;
			//if (json.pixelSizeInMM) this.pixelSize = json.pixelSizeInMM;

			const sm = json.input_params.sparsity_multiplier;
			console.log("INPUT", json.input_params);
			const configPaths = this.imageUrl(json, url, sm);
			const dictionaryGramPromise = this._loadDictionaryGram(json, url);

			this.shader.init(json);
			const urls = [];
			this.rasters = [];

			console.log("Set Raster DICT ", configPaths.dictpath)

			if (json.output_params.dictionary_quantizer_bits === 16) {
				console.log("Using 16 bit dictionary texture");
				// DICT (static texture) 16bit rgba ui
				await this.addStaticTexture({
					url: configPaths.dictpath,
					uniform: 'dict',
					sizeUniform: 'dictionary_size',
					format: 'rgb16f',
					colorEncoding: 'linear',
					dataLoader: LayerRILSR.pngLoaderToFloat,
					use16Bit: true,
					buildMipmaps: false
				});
			} else {
				console.log("Using 8 bit dictionary texture");

				// DICT (static texture) 8bit rgba u
				await this.addStaticTexture({
					url: configPaths.dictpath,
					uniform: 'dict',
					sizeUniform: 'dictionary_size',
					format: 'rgba',
					colorEncoding: 'linear',
					buildMipmaps: false,
					use16Bit: false
				});
			}

			// Shared, runtime-generated textures used only by the cached
			// dictionary-response-transfer shader modes. They are populated after
			// the source dictionary texture has been decoded and uploaded.
			this.staticTextures.push(
				{ uniform: 'response_dict', texture: null, width: 0, height: 0, loaded: true },
				{ uniform: 'response_mean', texture: null, width: 0, height: 0, loaded: true },
				{ uniform: 'response_gain', texture: null, width: 0, height: 0, loaded: true },
				{ uniform: 'atlas_intensity_power_dict', texture: null, width: 0, height: 0, loaded: true },
				{ uniform: 'dictionary_gram', texture: null, width: 0, height: 0, loaded: true },
				{ uniform: 'dictionary_families', texture: null, width: 0, height: 0, loaded: true }
			);
			this._dictionaryGramData = await dictionaryGramPromise;
			json._dictionaryGramAvailable = this._dictionaryGramData !== null;
			this._dictionaryFamilyData = this._buildDictionaryFamilies(this._dictionaryFamilyCount);
			json._dictionaryFamiliesAvailable = this._dictionaryFamilyData !== null;
			this.shader.setDictionaryDistanceEnabled(json._dictionaryGramAvailable);
			this.shader.setResponseCoherenceEnabled(json._dictionaryGramAvailable);
			this.shader.setDictionaryFamiliesEnabled(json._dictionaryFamiliesAvailable);
			this.onFirstDraw = gl => {
				this._initializeDictionaryGram(gl);
				this._initializeDictionaryFamilies(gl);
				this._initializeResponseTransferAtlases(gl);
				this._initializeAtlasIntensityPowerAtlas(gl);
			};

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

			if (configPaths.maskpath) {
				urls.push(configPaths.maskpath);
				// A binary mask must not be interpolated at tile edges.
				this.rasters.push(new Raster({ format: 'vec3', filterLinear: false, buildMipmaps: false }));
			}
			this.layout.setUrls(urls);
			const tld = json.output_params.lights;
			this.lightDirs_ = Array.isArray(tld)
				? tld
				: [];

			// Normalization
			this.lightDirs_ = (Array.isArray(tld) ? tld : []).map(([x, y, z]) => {
				const n = Math.hypot(x, y, z);     // norm = sqrt(x**2+y**2+z**2)
				return n > 0 ? [x / n, y / n, z / n] : [0, 0, 0];
			});

			console.log("RILSR Light Directions: ", this.lightDirs_);
			// Notifica che il layer è stato caricato
			this.emit('config_ready');

		})().catch(e => { console.log(e); this.status = e; });
	}

	/**
	 * Returns the training light directions loaded from the RILSR configuration.
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
		// Always synchronize the shader with the current control value. A control
		// can already be complete before this layer is drawn (notably when it is
		// rendered only through a lens), but its target may still be a new light.
		const light = this.controls['light'].current.value;
		const rotated = Transform.rotate(light[0], light[1], this.worldRotation * Math.PI);
		this.shader.setLight([rotated.x, rotated.y]);
		return done;
	}

	/**
	 * Renders the RILSR visualization.
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

addSignals(LayerRILSR, 'config_ready');

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['rilsr'] = (options) => { return new LayerRILSR(options); }

export { LayerRILSR }
