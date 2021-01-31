
import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'
import { Layout } from './Layout.js'
import { ShaderCombiner } from './ShaderCombiner.js'

/**
 * Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but url and layout are required.
 */
class LayerCombiner extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		this.layout = 'image';
		this.setLayout(new Layout(this.url, this.layout));


		let shader = new ShaderCombiner({
			'label': 'Combiner',
			'samplers': [{ id:0, name:'source1', type:'vec3' }, { id:1, name:'source2', type:'vec3' }],
		});

		this.shaders = {'standard': shader };
		this.setShader('standard');

//todo if layers check for importjson

		this.textures = [];
		this.framebuffers = [];
	}


	draw(transform, viewport) {
		for(let layer of this.layers)
			if(layer.status != 'ready')
				return;

		if(!this.shader)
			throw "Shader not specified!";

		let w = viewport.dx;
		let h = viewport.dy;

		if(!this.framebuffers.length || this.layout.width != w || this.layout.height != h) {
			this.deleteFramebuffers();
			this.layout.width = w;
			this.layout.height = h;
			this.createFramebuffers();
		}

		let gl = this.gl;
		gl.viewport(viewport.x, viewport.y, viewport.dx, viewport.dy);

		var b = [0, 0, 0, 0];
		gl.clearColor(b[0], b[1], b[2], b[3]);


//TODO optimize: render to texture ONLY if some parameters change!
//provider di textures... max memory and reference counting.

		for(let i = 0; i < this.layers.length; i++) { 
			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[i]);
			gl.clear(gl.COLOR_BUFFER_BIT);
			this.layers[i].draw(transform, {x:0, y:0, dx:w, dy:h, w:w, h:h});
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		}


		this.prepareWebGL();

		for(let i = 0; i < this.layers.length; i++) {
			gl.uniform1i(this.shader.samplers[i].location, i);
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
		}



		this.updateTileBuffers(
			new Float32Array([-1, -1, 0,  -1, 1, 0,  1, 1, 0,  1, -1, 0]), 
			new Float32Array([ 0,  0,      0, 1,     1, 1,     1,  0]));
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);
	}

	createFramebuffers() {
		let gl = this.gl;
		for(let i = 0; i < this.layers.length; i++) {
			//TODO for thing like lens, we might want to create SMALLER textures for some layers.
			const texture = gl.createTexture();

			gl.bindTexture(gl.TEXTURE_2D, texture);

			const level = 0;
			const internalFormat = gl.RGBA;
			const border = 0;
			const format = gl.RGBA;
			const type = gl.UNSIGNED_BYTE;
			gl.texImage2D(gl.TEXTURE_2D, level, internalFormat,
				this.layout.width, this.layout.height, border, format, type, null);

			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

			const framebuffer = gl.createFramebuffer();
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);

			this.textures[i] = texture;
			this.framebuffers[i] = framebuffer;
		}
	}
	//TODO release textures and framebuffers
	deleteFramebuffers() {
	}
}

Layer.prototype.types['combiner'] = (options) => { return new ImageCombiner(options); }

export { LayerCombiner }
