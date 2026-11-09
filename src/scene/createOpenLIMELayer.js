import { Layer } from '../Layer.js';
import { LayerLens } from '../LayerLens.js';
import { Transform } from '../Transform.js';
import { ControllerLens } from '../ControllerLens.js';
import { ControllerFocusContext } from '../ControllerFocusContext.js';
import '../LayerImage.js';
import '../LayerRTI.js';

/** Asset controller ids and the classes that implement them. */
const lensControllers = {
	'openlime:controller-lens': ControllerLens,
	'openlime:controller-focus-context': ControllerFocusContext
};

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

/**
 * Builds the pointer controller named by a lens profile.
 * The caller registers it with the viewer pointer manager.
 * @param {Object} spec
 * @param {string} spec.type - `openlime:controller-lens` or `openlime:controller-focus-context`
 * @param {Layer} spec.lensLayer
 * @param {Object} spec.camera
 * @param {Object} spec.canvas - Required by the focus-context controller
 * @returns {ControllerLens}
 */
function createOpenLIMEController(spec) {
	const type = spec.type || 'openlime:controller-lens';
	const Controller = lensControllers[type];
	if (!Controller) throw new Error(`Unsupported lens controller "${type}".`);
	return new Controller({
		lensLayer: spec.lensLayer,
		camera: spec.camera,
		canvas: spec.canvas
	});
}

export { createOpenLIMELayer, createOpenLIMELens, createOpenLIMEController };
