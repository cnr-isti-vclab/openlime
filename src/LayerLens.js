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
			radius: 100,
			borderColor: [0.8, 0.8, 0.8, 1],
			borderWidth: 4,
			dashboard: null,
		}, options);
		super(options);
		
		// Shader lens currently handles up to 2 layers
		let shader = new ShaderLens();
		if (this.layers.length == 2) shader.setOverlayLayerEnabled(true); //FIXME Is it a mode? Control?
		this.shaders['lens'] = shader;
		this.setShader('lens');

		this.addControl('center', [0, 0]);
		this.addControl('radius', [this.radius, 0]);
		this.addControl('borderColor', this.borderColor);
		this.addControl('borderWidth', [this.borderWidth]);

		this.oldRadius = -9999;
		this.oldCenter = [-9999, -9999];
	}

	

	removeOverlayLayer() {
		this.layers.length = 1;
		this.shader.setOverlayLayerEnabled(false);
	}

	setBaseLayer(l) {
		this.layers[0] = l;
		this.emit('update');
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

	getBorderColor() {
		return this.controls['borderColor'].current.value;
	}

	getBorderWidth() {
		return this.controls['borderWidth'].current.value[0];
	}

	draw(transform, viewport) {
		let done = this.interpolateControls();

		// Update dashboard size & pos
		if (this.dashboard) {
			const c = this.getCurrentCenter();
			const r = this.getRadius();
			if( c[0] != this.oldCenter[0] || c[1] != this.oldCenter[1] || r != this.oldRadius) {
				this.dashboard.update(c[0], c[1], r);
				this.oldCenter = c;
				this.oldRadius = r;
			}
		}
		// const vlens = this.getLensInViewportCoords(transform, viewport);
		// this.shader.setLensUniforms(vlens, [viewport.w, viewport.h], this.borderColor);
		// this.emit('draw');
		// super.draw(transform, viewport);

		for(let layer of this.layers)
			if(layer.status != 'ready')
				return false;

		if(!this.shader)
			throw "Shader not specified!";

		let gl = this.gl;

		// Draw on a restricted viewport around the lens, to lower down the number of required tiles
		let lensViewport = this.getLensViewport(transform, viewport);

		// If an overlay is present, merge its viewport with the lens one
		let overlayViewport = this.getOverlayLayerViewport(transform, viewport);
		if (overlayViewport != null) {
			lensViewport = this.joinViewports(lensViewport, overlayViewport);
		}

		gl.viewport(lensViewport.x, lensViewport.y, lensViewport.dx, lensViewport.dy);

		// Keep the framwbuffer to the window size in order to avoid changing at each scale event
		if(!this.framebuffers.length || this.layout.width != viewport.w || this.layout.height != viewport.h) {
			this.deleteFramebuffers();
			this.layout.width = viewport.w;
			this.layout.height = viewport.h;
			this.createFramebuffers();
		}
		var b = [0, 0, 0, 0];
		gl.clearColor(b[0], b[1], b[2], b[3]);

		// Draw the layers only within the viewport enclosing the lens
		for(let i = 0; i < this.layers.length; i++) { 
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[i]);
			gl.clear(gl.COLOR_BUFFER_BIT);
			this.layers[i].draw(transform, lensViewport);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}
		
		// Set in the lensShader the proper lens position wrt the window viewport
		const vl = this.getLensInViewportCoords(transform, viewport);
		this.shader.setLensUniforms(vl, [viewport.w, viewport.h], this.getBorderColor());
	
		this.prepareWebGL();

		// Bind all textures and combine them with the shaderLens
		for(let i = 0; i < this.layers.length; i++) {
			gl.uniform1i(this.shader.samplers[i].location, i);
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
		}

		// Get texture coords of the lensViewport with respect to the framebuffer sz
		const lx = lensViewport.x/lensViewport.w;
		const ly = lensViewport.y/lensViewport.h;
		const hx = (lensViewport.x+lensViewport.dx)/lensViewport.w;
		const hy = (lensViewport.y+lensViewport.dy)/lensViewport.h;
		
		this.updateTileBuffers(
			new Float32Array([-1, -1, 0,  -1, 1, 0,  1, 1, 0,  1, -1, 0]), 
			new Float32Array([ lx, ly,     lx, hy,   hx, hy,   hx, ly]));
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);

		// Restore old viewport
		gl.viewport(viewport.x, viewport.x, viewport.dx, viewport.dy);
		
		return done;
	}

	getLensViewport(transform, viewport) {
		const lensC = this.getCurrentCenter();
		const l = transform.sceneToViewportCoords(viewport, lensC);
		const r = this.getRadius() * transform.z;
		return {x: Math.floor(l[0]-r)-1, y: Math.floor(l[1]-r)-1, dx: Math.ceil(2*r)+2, dy: Math.ceil(2*r)+2, w:viewport.w, h:viewport.h};
	}

	getOverlayLayerViewport(transform, viewport) {
		let result = null;
		if (this.layers.length == 2) {
			// Get overlay projected viewport
			let bbox = this.layers[1].boundingBox();
			const p0v = transform.sceneToViewportCoords(viewport, [bbox.xLow, bbox.yLow]);
			const p1v = transform.sceneToViewportCoords(viewport, [bbox.xHigh, bbox.yHigh]);
		
			// Intersect with window viewport
			const x0 = Math.min(Math.max(0, Math.floor(p0v[0])), viewport.w);
			const y0 = Math.min(Math.max(0, Math.floor(p0v[1])), viewport.h);
			const x1 = Math.min(Math.max(0, Math.ceil(p1v[0])), viewport.w);
			const y1 = Math.min(Math.max(0, Math.ceil(p1v[1])), viewport.h);

			const width = x1 - x0;
			const height = y1 - y0;
			result = {x: x0, y: y0, dx:width, dy: height, w:viewport.w, h:viewport.h};
		} 
		return result;
	}

	joinViewports(v0, v1) {
		const xm = Math.min(v0.x, v1.x);
		const xM = Math.max(v0.x+v0.dx, v1.x+v1.dx);
		const ym = Math.min(v0.y, v1.y);
		const yM = Math.max(v0.y+v0.dy, v1.y+v1.dy);
		const width = xM - xm;
		const height = yM - ym;
		
		return {x:xm, y:ym, dx:width, dy:height, w: v0.w, h: v0.h };
	}

	getLensInViewportCoords(transform, viewport) {
		const lensC = this.getCurrentCenter();
		const c = transform.sceneToViewportCoords(viewport, lensC);
		const r = this.getRadius();
		return [c[0],  c[1], r * transform.z, this.getBorderWidth()];
	}

}

Layer.prototype.types['lens'] = (options) => { return new LayerLens(options); }

export {LayerLens}
