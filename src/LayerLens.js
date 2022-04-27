import { Layer }  from './Layer.js'
import {LayerCombiner}  from './LayerCombiner.js'
import {ShaderLens}     from './ShaderLens.js'

/**
 * Displays a lens on the canvas. 
 */
class LayerLens extends LayerCombiner {
	constructor(options) {
		options = Object.assign({
			overlay: true,
			defaultBorderColor: [0.8, 0.8, 0.8, 1],
		}, options);
		super(options);
		
		// Shader lens currently handles up to 2 layers
		let shader = new ShaderLens();
		if (this.layers.length == 2) shader.setOverlayLayerEnabled(true);
		this.shaders['lens'] = shader;
		this.setShader('lens');

		this.startPos = [0, 0];
		this.border = 4;

		this.addControl('center', [0, 0]);
		this.addControl('radius', [0, 0]);

		this.setLens(0,0,this.radius,this.border);
		this.signals.draw = [];
		const c = this.defaultBorderColor;
		this.borderColor = [c[0], c[1], c[2], c[3]];
	}

	removeOverlayLayer() {
		this.layers.length = 1;
		this.shader.setOverlayLayerEnabled(false);
	}

	setOverlayLayer(l) {
		this.layers[1] = l;
		this.layers[1].setVisible(true);
		this.shader.setOverlayLayerEnabled(true);

		this.regenerateFrameBuffers();
	}

	regenerateFrameBuffers() {
		// Regenerate frame buffers
		const w = this.layout.width;
		const h = this.layout.height;
		this.deleteFramebuffers();
		this.layout.width = w;
		this.layout.height = h;
		this.createFramebuffers();
	}

	setLens(x = 0, y = 0, r = 100, border = 10) {
		this.border = border;
		this.setCenter(x, y);
		this.setRadius(r);
	}
	
	setRadius(r, delayms = 100, easing='linear') {
		this.setControl('radius', [r, 0], delayms, easing);
	}

	getRadius() {
		return this.controls['radius'].current.value[0];
	}

	setCenter(x, y, delayms = 100, easing='linear') {
		this.setControl('center', [x, y], delayms, easing);
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
		this.shader.setLensUniforms(vlens, [viewport.w, viewport.h], this.borderColor);
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
