/**
 * @param {string} id unique id for layer.
 * @param {object} options
 *  * *label*:
 *  * *transform*: relative coordinate [transformation](#transform) from layer to canvas
 */

class Layer {
	constructor(id, options) {
		this.needsUpdate = true;
	}

	setVisible(visible) {
		this.visible = visible;
		this.needsUpdate = true;
	}

/**
 * @param {int} zindex
 */
	setZindex(zindex) {
		this.zindex = zindex;
		this.needsUpdate = true;
	}
}

export { Layer }
