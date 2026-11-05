/**
 * Image and RTI adapters for the main canvas projection.
 * They describe a layer. They do not import Layer or Transform, so the
 * scene tests can run without the WebGL modules.
 */

/** `openlime:image` → LayerImage. No pixel-changing options. */
const imageAdapter = {
	type: 'openlime:image',
	layerType: 'image',
	knownOptions: [],
	pixelOptions() {
		return {};
	}
};

/** `openlime:rti` → LayerRTI. `normals` changes the rasters, so it is part of the source key. */
const rtiAdapter = {
	type: 'openlime:rti',
	layerType: 'rti',
	knownOptions: ['normals'],
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

export { imageAdapter, rtiAdapter, adapters, adapterFor, validateRendererOptions };
