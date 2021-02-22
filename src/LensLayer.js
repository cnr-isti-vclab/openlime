import {CombinerLayer}  from './CombinerLayer.js'
import {Lens}           from './Lens.js'
import {ShaderLens}     from './ShaderLens.js'
import {ControllerLens} from './ControllerLens.js'
import {Layout}         from './Layout.js'

/**
 * options must contain one layer and lens = {x:, y:, r:, border: }
 */
class LensLayer extends LayerCombiner {
	constructor(options) {
        super(options);
        
        if (!this.camera) {
            throw "LayerLens option camera required";
        }
        
        let shader = new ShaderLens({
            'samplers': [ { id:0, name: 'source0'} ]
        });
        this.shaders['lens'] = shader;
		this.setShader('lens');

        let controller = new ControllerLens({handleEvent: (x,y)=>this.handleEvent(x,y),
                                             updatePosition: (x, y)=>this.updatePosition(x, y),
                                             wheelEvent : (delta)=>this.wheelEvent(delta),
                                             hover: true});

        this.controllers.push(controller);
        this.startPos = [0, 0];

		let now = performance.now();
        // this.controls['center'] = { source:{ value: [0, 0], t: now }, target:{ value:[0, 0], t:now }, current:{ value:[0, 0], t:now } };
        this.controls['center'] = { source:{ value: [0, 0],    t: now }, target:{ value:[0, 0],    t:now }, current:{ value:[0, 0],    t:now } };
        this.controls['radius'] = { source:{ value: [0, 0],    t: now }, target:{ value:[0, 0],    t:now }, current:{ value:[0, 0],    t:now } };
        this.setLens(0,0,150,10);

    }

    setLens(x = 0, y = 0, r = 100, border = 10) {
        this.border = border;
        this.setCenter(x, y);
        this.setRadius(r);
    }
    
    setRadius(r) {
        const delayms = 100;
        this.setControl('radius', [r, 0], delayms);
    }

    getRadius() {
        return this.controls['radius'].current.value[0];
    }

    setCenter(x, y) {
        const delayms = 100;
        this.setControl('center', [x, y], delayms);
    }

    getCurrentCenter() {
        return this.controls['center'].current.value;
    }

    getTargetCenter() {
        return this.controls['center'].target.value;
    }

    toScene(x, y) {
        // Transform canvas p to scene coords
        let now = performance.now();
        const t = this.camera.getCurrentTransform(now);
        const p0wh = [(x*0.5+0.5)*this.camera.viewport.w, (y*0.5+0.5)*this.camera.viewport.h];
        const p = t.viewportToSceneCoords(this.camera.viewport, p0wh);
        return p;
    }

    handleEvent(x, y) {
        // isInsideLens ?
        const p = this.toScene(x, y);
        const c = this.getCurrentCenter();
        const dx = p[0] - c[0];
        const dy = p[1] - c[1];
        const d2 = dx*dx + dy*dy;
        const r = this.getRadius();
        const res = d2 < r * r;
        if (res) { this.startPos = p;}
        return res;
    }

    updatePosition(x, y) {
        const p = this.toScene(x, y);
        const c = this.getTargetCenter();
        const dx = p[0]-this.startPos[0];
        const dy = p[1]-this.startPos[1];

        this.setCenter(c[0] + dx, c[1] + dy);
        this.startPos = p;
    }

    wheelEvent(delta) {
        const r = this.getRadius();
        console.log("wheel r " + r.toFixed(2) + ", delta " + delta.toFixed(2));
        const factor = delta > 0 ? 1.2 : 1/1.2;
        this.setRadius(r*factor);
    }

	draw(transform, viewport) {

        let done = this.interpolateControls();
        
		for(let layer of this.layers)
            if(layer.status != 'ready')
                return false;

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
        const vl = this.getLensInViewportCoords(transform, viewport);
        this.shader.setLensUniforms(vl, [viewport.w, viewport.h]);
       
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

export {LensLayer}
