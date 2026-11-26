/**
 * Renderer adapters for the main canvas projection.
 * They describe a layer. They do not import Layer or Transform, so the
 * scene tests can run without the WebGL modules.
 *
 * Contract:
 * - `sourceBinding: 'single'` uses `renderer.source` → one entry in `asset.sources`
 * - `sourceBinding: 'channels'` uses `renderer.sources` → role → source id map
 * - `sourceFingerprint(ctx)` folds into the share/derive key (pixel-affecting options)
 * - `buildLayerFields(ctx)` returns Layer constructor fields beyond the common shell
 */

function layoutOf(source) {
	return source?.layout?.type || source?.layout || 'image';
}

function singleCtxFields(ctx) {
	const source = ctx.source;
	return {
		url: ctx.resolveUrl(source),
		layout: layoutOf(source)
	};
}

/** `openlime:image` → LayerImage. No pixel-changing options and no shader modes. */
const imageAdapter = {
	type: 'openlime:image',
	layerType: 'image',
	sourceBinding: 'single',
	knownOptions: [],
	defaultShader: 'standard',
	shaders: ['standard'],
	modes: [],
	parameters: {},
	controls: [],
	sourceFingerprint() {
		return {};
	},
	buildLayerFields(ctx) {
		return singleCtxFields(ctx);
	}
};

/** `openlime:rti` → LayerRTI. `normals` changes the rasters, so it is part of the source key. */
const rtiAdapter = {
	type: 'openlime:rti',
	layerType: 'rti',
	sourceBinding: 'single',
	knownOptions: ['normals'],
	defaultShader: 'rti',
	shaders: ['rti'],
	modes: ['light', 'normals', 'diffuse', 'gray_diffuse', 'specular'],
	parameters: { specularExponent: 'setSpecularExp' },
	controls: ['light'],
	validateOptions(options = {}, path, diagnostics) {
		if (options.normals !== undefined && typeof options.normals !== 'boolean') {
			diagnostics.push({
				severity: 'error',
				code: 'RENDERER_OPTION',
				path: path + '/options/normals',
				message: 'RTI option "normals" must be a boolean.'
			});
		}
	},
	sourceFingerprint(ctx) {
		return { normals: ctx.renderer?.options?.normals === true };
	},
	buildLayerFields(ctx) {
		return {
			...singleCtxFields(ctx),
			normals: ctx.renderer?.options?.normals === true
		};
	}
};

/**
 * `openlime:rilsr` → LayerRILSR. Same single-uri package model as RTI (info.json entry).
 * Modes mirror ShaderRILSR; `normals` is intentionally not exposed.
 */
const rilsrAdapter = {
	type: 'openlime:rilsr',
	layerType: 'rilsr',
	sourceBinding: 'single',
	knownOptions: [],
	defaultShader: 'rilsr',
	shaders: ['rilsr'],
	modes: [
		'light',
		'grayscale',
		'edge',
		'response-coherence',
		'response-coherence-normalized',
		'dictionary-response-transfer',
		'dictionary-response-transfer-intensity',
		'atlas-intensity-power',
		'dominant-family',
		'debug',
		'avg',
		'idx00',
		'idx01',
		'coef00',
		'coef01',
		'dictionary'
	],
	parameters: {},
	controls: ['light'],
	sourceFingerprint() {
		return {};
	},
	buildLayerFields(ctx) {
		return singleCtxFields(ctx);
	}
};

/**
 * `openlime:neural` → LayerNeuralRTI. Config JSON + plane tiles (single-uri package).
 * Shader modes are not used; presets pick `neural` or `standard`.
 */
const neuralAdapter = {
	type: 'openlime:neural',
	layerType: 'neural',
	sourceBinding: 'single',
	knownOptions: ['convergenceSpeed', 'maxTiles'],
	defaultShader: 'neural',
	shaders: ['neural', 'standard'],
	modes: [],
	parameters: {},
	controls: ['light'],
	validateOptions(options = {}, path, diagnostics) {
		if (options.convergenceSpeed !== undefined && typeof options.convergenceSpeed !== 'number') {
			diagnostics.push({
				severity: 'error',
				code: 'RENDERER_OPTION',
				path: path + '/options/convergenceSpeed',
				message: 'Neural option "convergenceSpeed" must be a number.'
			});
		}
		if (options.maxTiles !== undefined && typeof options.maxTiles !== 'number') {
			diagnostics.push({
				severity: 'error',
				code: 'RENDERER_OPTION',
				path: path + '/options/maxTiles',
				message: 'Neural option "maxTiles" must be a number.'
			});
		}
	},
	sourceFingerprint() {
		return {};
	},
	buildLayerFields(ctx) {
		const options = ctx.renderer?.options || {};
		const fields = singleCtxFields(ctx);
		if (options.convergenceSpeed !== undefined) fields.convergenceSpeed = options.convergenceSpeed;
		if (options.maxTiles !== undefined) fields.maxTiles = options.maxTiles;
		return fields;
	}
};

const adapters = [imageAdapter, rtiAdapter, rilsrAdapter, neuralAdapter];

/** @returns {Object|null} The adapter for a manifest renderer type. */
function adapterFor(type) {
	return adapters.find(adapter => adapter.type === type) || null;
}

/** Reject options the adapter does not know. Unknown options are not passed through. */
function validateRendererOptions(adapter, options = {}, path, diagnostics) {
	for (const key of Object.keys(options)) {
		if (!adapter.knownOptions.includes(key)) {
			diagnostics.push({
				severity: 'error',
				code: 'RENDERER_OPTION',
				path: path + '/options/' + key,
				message: `Renderer "${adapter.type}" does not accept option "${key}".`
			});
		}
	}
	if (typeof adapter.validateOptions === 'function') {
		adapter.validateOptions(options, path, diagnostics);
	}
}

/** Reject a preset the adapter cannot apply. Modes the shader knows but the document omits stay unavailable. */
function validatePreset(adapter, preset, path, diagnostics) {
	if (!preset) return;
	const shader = preset.shader || adapter.defaultShader;
	if (adapter.shaders && !adapter.shaders.includes(shader)) {
		diagnostics.push({
			severity: 'error',
			code: 'PRESET_SHADER',
			path: path + '/shader',
			message: `Renderer "${adapter.type}" has no shader "${shader}".`
		});
	}
	if (preset.mode && !(adapter.modes || []).includes(preset.mode)) {
		diagnostics.push({
			severity: 'error',
			code: 'PRESET_MODE',
			path: path + '/mode',
			message: `Mode "${preset.mode}" is not offered by "${adapter.type}".`
		});
	}
	for (const name of Object.keys(preset.parameters || {})) {
		if (!adapter.parameters || !Object.prototype.hasOwnProperty.call(adapter.parameters, name)) {
			diagnostics.push({
				severity: 'error',
				code: 'PRESET_PARAMETER',
				path: path + '/parameters/' + name,
				message: `Renderer "${adapter.type}" has no parameter "${name}".`
			});
		}
	}
	for (const name of Object.keys(preset.controls || {})) {
		if (!(adapter.controls || []).includes(name)) {
			diagnostics.push({
				severity: 'error',
				code: 'PRESET_CONTROL',
				path: path + '/controls/' + name,
				message: `Renderer "${adapter.type}" has no control "${name}".`
			});
		}
	}
}

/**
 * Resolve renderer → source binding for an adapter.
 * @returns {{ kind: 'single', source: Object } | { kind: 'channels', channels: Object } | null}
 */
function resolveRendererSources(adapter, renderer, assetSources, path, diagnostics) {
	const binding = adapter.sourceBinding || 'single';
	if (binding === 'channels') {
		const roles = adapter.channelRoles || { required: [], optional: [] };
		const required = roles.required || [];
		const optional = roles.optional || [];
		const map = renderer.sources || {};
		if (!renderer.sources || typeof renderer.sources !== 'object') {
			diagnostics.push({
				severity: 'error',
				code: 'MISSING_SOURCES',
				path: path + '/sources',
				message: `Renderer "${adapter.type}" needs a sources map.`
			});
			return null;
		}
		const channels = {};
		for (const role of required) {
			const sourceId = map[role];
			if (!sourceId) {
				diagnostics.push({
					severity: 'error',
					code: 'MISSING_CHANNEL',
					path: path + '/sources/' + role,
					message: `Renderer "${adapter.type}" requires channel "${role}".`
				});
				continue;
			}
			const source = assetSources?.[sourceId];
			if (!source || !source.uri) {
				diagnostics.push({
					severity: 'error',
					code: 'MISSING_SOURCE',
					path: path + '/sources/' + role,
					message: `Channel "${role}" needs a source with a uri.`
				});
				continue;
			}
			channels[role] = source;
		}
		for (const role of optional) {
			const sourceId = map[role];
			if (!sourceId) continue;
			const source = assetSources?.[sourceId];
			if (!source || !source.uri) {
				diagnostics.push({
					severity: 'error',
					code: 'MISSING_SOURCE',
					path: path + '/sources/' + role,
					message: `Channel "${role}" needs a source with a uri.`
				});
				continue;
			}
			channels[role] = source;
		}
		if (diagnostics.some(item => item.severity === 'error')) return null;
		return { kind: 'channels', channels };
	}

	const source = assetSources?.[renderer.source];
	if (!source || !source.uri) {
		diagnostics.push({
			severity: 'error',
			code: 'MISSING_SOURCE',
			path: path + '/source',
			message: 'Layer needs a source with a uri.'
		});
		return null;
	}
	return { kind: 'single', source };
}

/**
 * Stable share/derive key. Fingerprint is adapter-owned; uri layout is projection-owned.
 * Single-binding keeps the historical `{ type, uri, revision, layout, options }` shape.
 */
function buildSourceKey(adapter, ctx, binding) {
	const fingerprint = typeof adapter.sourceFingerprint === 'function'
		? adapter.sourceFingerprint(ctx)
		: {};
	if (binding.kind === 'channels') {
		const channels = {};
		for (const [role, source] of Object.entries(binding.channels)) {
			channels[role] = {
				uri: ctx.resolveUrl(source),
				revision: source.revision || '',
				layout: layoutOf(source)
			};
		}
		return JSON.stringify({
			type: adapter.type,
			channels,
			options: fingerprint
		});
	}
	const source = binding.source;
	return JSON.stringify({
		type: adapter.type,
		uri: ctx.resolveUrl(source),
		revision: source.revision || '',
		layout: layoutOf(source),
		options: fingerprint
	});
}

/** Record stored on bySource (diagnostics / debugging). */
function buildSourceRecord(adapter, ctx, binding) {
	const fingerprint = typeof adapter.sourceFingerprint === 'function'
		? adapter.sourceFingerprint(ctx)
		: {};
	if (binding.kind === 'channels') {
		const channels = {};
		for (const [role, source] of Object.entries(binding.channels)) {
			channels[role] = {
				uri: ctx.resolveUrl(source),
				revision: source.revision || '',
				layout: layoutOf(source)
			};
		}
		return { type: adapter.type, channels, options: fingerprint };
	}
	const source = binding.source;
	return {
		type: adapter.type,
		uri: ctx.resolveUrl(source),
		revision: source.revision || '',
		layout: layoutOf(source),
		options: fingerprint
	};
}

export {
	imageAdapter,
	rtiAdapter,
	rilsrAdapter,
	neuralAdapter,
	adapters,
	adapterFor,
	validateRendererOptions,
	validatePreset,
	resolveRendererSources,
	buildSourceKey,
	buildSourceRecord,
	layoutOf
};
