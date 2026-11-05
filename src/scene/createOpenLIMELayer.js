import { Layer } from '../Layer.js';
import { Transform } from '../Transform.js';
import '../LayerImage.js';
import '../LayerRTI.js';

/**
 * Builds a real OpenLIME layer from a projection description.
 * The scene graph keeps a Similarity. This is the copy onto Transform.
 * @param {Object} options
 * @returns {Layer}
 */
function createOpenLIMELayer(options) {
	return new Layer({
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
	});
}

export { createOpenLIMELayer };
