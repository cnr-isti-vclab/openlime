import { Camera } from './Camera.js'

/**
 * @param {WebGL} gl is the WebGL context
 * @param {Object} options
 * * *layers*: Object specifies layers (see. {@link Layer})
 */

class Canvas {
	constructor(gl, camera, options) {
		Object.assign(this, { 
			preserveDrawingBuffer: false, 
			gl: gl,
			camera: camera,
			layers: {},

			signals: {'update':[]}
		});

		if(options) {
			Object.assign(this, options);
			for(let id in this.layers)
				this.addLayer(id, new Layer(id, this.layers[id]));
		}
	}

	addEvent(event, callback) {
		this.signals[event].push(callback);
	}

	emit(event) {
		for(let r of this.signals[event])
			r(this);
	}

	addLayer(id, layer) {
		layer.addEvent('update', () => { console.log('update!'); this.emit('update'); });
		layer.gl = this.gl;
		this.layers[id] = layer;
	}


	draw(time) {
		let gl = this.gl;
		let view = this.camera.viewport;
		gl.viewport(view[0], view[1], view[2], view[3]);

		var b = [0, 1, 0, 1];
		gl.clearColor(b[0], b[1], b[2], b[3], b[4]);
		gl.clear(gl.COLOR_BUFFER_BIT);

		let pos = this.camera.getCurrentTransform(time);
		//todo we could actually prefetch toward the future a little bit
		this.prefetch(pos);

		//draw layers using zindex.
		let ordered = Object.values(this.layers).sort( (a, b) => a.zindex - b.zindex);

		for(let layer of ordered)
			if(layer.visible)
				layer.draw(pos, view)

//TODO not really an elegant solution to tell if we have reached the target, the check should be in getCurrentTransform.
		return pos.t == this.camera.target.t;
	}

/**
 * This function have each layer to check which tiles are needed and schedule them for download.
 * @param {object} transform is the camera position (layer will combine with local transform).
 */
	prefetch(transform) {
		for(let id in this.layers)
			this.layers[id].prefetch(transform, this.camera.viewport);
	}
}

export { Canvas }
