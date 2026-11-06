import { Layer } from '../Layer.js';
import { LayerLens } from '../LayerLens.js';
import { Transform } from '../Transform.js';
import '../LayerImage.js';
import '../LayerRTI.js';

/**
 * Builds a real OpenLIME layer from a projection description.
 * The scene graph keeps a Similarity. This is the copy onto Transform.
 * Without sourceLayer this is a primary layer. derive() calls this function
 * again with that layer as sourceLayer, so the second context keeps the tiles
 * and owns a new LayerImage or LayerRTI shader.
 * @param {Object} options
 * @returns {Layer}
 */
function createOpenLIMELayer(options) {
	const spec = {
		type: options.type,
		url: options.url,
		layout: options.layout,
		label: options.label,
		visible: options.visible,
		zindex: options.zindex,
		normals: options.normals,
		transform: new Transform({
			x: options.transform?.x || 0,
			y: options.transform?.y || 0,
			a: options.transform?.a || 0,
			z: options.transform?.z === undefined ? 1 : options.transform.z
		})
	};
	if (options.sourceLayer) spec.sourceLayer = options.sourceLayer;
	const layer = new Layer(spec);
	layer.derive = (extra) => createOpenLIMELayer({ ...extra, sourceLayer: layer });
	return layer;
}

/**
 * Builds the lens overlay for one profile. The camera is required by LayerLens.
 * Foreground children are attached later and are not passed to the canvas.
 * @param {Object} spec
 * @returns {LayerLens}
 */
function createOpenLIMELens(spec) {
	return new LayerLens({
		camera: spec.camera,
		overlay: true,
		radius: spec.geometry?.radius ?? 100
	});
}

export { createOpenLIMELayer, createOpenLIMELens };
