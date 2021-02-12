import {LayerCombiner}  from './LayerCombiner.js'
import {Lens}           from './Lens.js'
import {ShaderLens}     from './ShaderLens.js'
import {ControllerLens} from './ControllerLens.js'
import {Layout}         from './Layout.js'

/**
 * options must contain one layer and lens = {x:, y:, r:, border: }
 */
class LayerLens extends LayerCombiner {
	constructor(options) {
        super(options);
        
        if (!this.lens) {
            throw "LayerLens option lens required";
        }

        if (!this.camera) {
            throw "LayerLens option camera required";
        }
        
        let shader = new ShaderLens({
            'lens': this.lens,
            'camera': this.camera,
            'samplers': [ { id:0, name: 'source0'} ]
        });
        this.shaders['lens'] = shader;
		this.setShader('lens');

        let controller = new ControllerLens((lensVec)=>shader.setLensVector(lensVec), 
                                            { hover: true, 
                                              lens: this.lens,
                                              camera: this.camera});
        this.controllers.push(controller);
    }


	draw(transform, viewport) {

		for(let layer of this.layers)
            if(layer.status != 'ready')
                return;

        if(!this.shader)
            throw "Shader not specified!";
            
         let gl = this.gl;

        // Store old viewport
        let oldViewport = {x: viewport.x, y: viewport.y, dx: viewport.dx, dy: viewport.dy, w: viewport.w, h: viewport.h };

        // Draw on a restricted viewport around the lens
        let lensViewport = this.getLensViewport(transform, viewport);
        this.camera.viewport = lensViewport;
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
        
//TODO optimize: render to texture ONLY if some parameters change!
//provider di textures... max memory and reference counting.

        // Draw the layers only within the viewport encolsing the lens
        for(let i = 0; i < this.layers.length; i++) { 
        	gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[i]);
            gl.clear(gl.COLOR_BUFFER_BIT);
			this.layers[i].draw(transform, lensViewport);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        }
        
        var b = [0, 0, 0, 0];
		gl.clearColor(b[0], b[1], b[2], b[3]);
        
        // Set in the lensShader the proper lens position wrt the window viewport
        this.shader.setLensUniforms(transform, viewport);
		this.prepareWebGL();

        // Bibd all textures and combine them with the shaderLens
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
        this.camera.viewport = oldViewport;
		gl.viewport(viewport.x, viewport.x, viewport.dx, viewport.dy);
    }

    getLensViewport(transform, viewport) {
        const l = this.lens.toViewportCoords(transform, viewport);
        const r = l[2];

        return {x: Math.floor(l[0]-r), y: Math.floor(l[1]-r), dx: Math.ceil(2*r), dy: Math.ceil(2*r), w:viewport.w, h:viewport.h};
    }
}

export {LayerLens}