/**
 * Image and RTI adapters for the main canvas projection.
 * They describe a layer. They do not import Layer or Transform, so the
 * scene tests can run without the WebGL modules.
 */

/** `openlime:image` → LayerImage. No pixel-changing options and no shader modes. */
const imageAdapter = {
	type: 'openlime:image',
	layerType: 'image',
	knownOptions: [],
	defaultShader: 'standard',
	shaders: ['standard'],
	modes: [],
	parameters: {},
	controls: [],
	pixelOptions() {
		return {};
	}
};

/** `openlime:rti` → LayerRTI. `normals` changes the rasters, so it is part of the source key. */
const rtiAdapter = {
	type: 'openlime:rti',
	layerType: 'rti',
	knownOptions: ['normals'],
	defaultShader: 'rti',
	shaders: ['rti'],
	modes: ['light', 'normals', 'diffuse', 'gray_diffuse', 'specular'],
	parameters: { specularExponent: 'setSpecularExp' },
	controls: ['light'],
	pixelOptions(options = {}) {
		return { normals: options.normals === true };
	}
};

const adapters = [imageAdapter, rtiAdapter];

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
	if (adapter.type === 'openlime:rti' && options?.normals !== undefined && typeof options.normals !== 'boolean') {
		diagnostics.push({
			severity: 'error',
			code: 'RENDERER_OPTION',
			path: path + '/options/normals',
			message: 'RTI option "normals" must be a boolean.'
		});
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

export { imageAdapter, rtiAdapter, adapters, adapterFor, validateRendererOptions, validatePreset };
