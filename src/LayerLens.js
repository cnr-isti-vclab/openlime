import { Layer }  from './Layer.js'
import {LayerCombiner}  from './LayerCombiner.js'
import {ShaderLens}     from './ShaderLens.js'

/**
 * options must contain one layer and lens = {x:, y:, r:, border: }
 */
class LayerLens extends LayerCombiner {
	constructor(options) {
		options = Object.assign({
			overlay: true
		}, options);
		super(options);
		
		// Shader lens currently handles up to 2 layers
		let shader = new ShaderLens();
		if (this.layers.length == 2) shader.setSecondLayerEnabled(true);
		this.shaders['lens'] = shader;
		this.setShader('lens');

		this.startPos = [0, 0];
		this.border = 2;

		let now = performance.now();
		this.controls['center'] = { source:{ value: [0, 0],    t: now }, target:{ value:[0, 0],    t:now }, current:{ value:[0, 0],    t:now } };
		this.controls['radius'] = { source:{ value: [0, 0],    t: now }, target:{ value:[0, 0],    t:now }, current:{ value:[0, 0],    t:now } };
		this.setLens(0,0,this.radius,this.border);
		this.signals.draw = [];
	}

	setSecondLayerEnabled(x) {
		if (this.layers.length == 2) {
			// With two layers set visible or not the second layer and set the property in the shader
			this.layers[1].setVisible(x);
			this.shader.setSecondLayerEnabled(x);
		} else if (!x) {
			// With a single layer, just tell the shader to use only the first layer 
			this.shader.setSecondLayerEnabled(x);
		}

	}

	setLens(x = 0, y = 0, r = 100, border = 10) {
		this.border = border;
		this.setCenter(x, y);
		this.setRadius(r);
	}
	
	setRadius(r, delayms = 100) {
		this.setControl('radius', [r, 0], delayms);
	}

	getRadius() {
		return this.controls['radius'].current.value[0];
	}

	setCenter(x, y, delayms = 100) {
		this.setControl('center', [x, y], delayms);
	}

	getCurrentCenter() {
		return this.controls['center'].current.value;
	}

	getTargetCenter() {
		return this.controls['center'].target.value;
	}

	draw(transform, viewport) {
		let done = this.interpolateControls();
		const vlens = this.getLensInViewportCoords(transform, viewport);
		this.shader.setLensUniforms(vlens, [viewport.w, viewport.h]);
		this.emit('draw');

		super.draw(transform, viewport);

		return done;
	}

	getLensViewport(transform, viewport) {
		const lensC = this.getCurrentCenter();
		const l = transform.sceneToViewportCoords(viewport, lensC);
		const r = this.getRadius() * transform.z;
		return {x: Math.floor(l[0]-r), y: Math.floor(l[1]-r), dx: Math.ceil(2*r), dy: Math.ceil(2*r), w:viewport.w, h:viewport.h};
	}

	getLensInViewportCoords(transform, viewport) {
		const lensC = this.getCurrentCenter();
		const c = transform.sceneToViewportCoords(viewport, lensC);
		const r = this.getRadius();
		return [c[0],  c[1], r * transform.z, this.border];
	}

}

Layer.prototype.types['lens'] = (options) => { return new LayerLens(options); }

export {LayerLens}
