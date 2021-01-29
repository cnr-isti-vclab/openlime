
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
			'samplers': [{ id:0, attribute:'source1', type:'vec3' }, { id:1, attribute:'source2', type:'vec3' }],
		});

		this.shaders = {'standard': shader };
		this.setShader('standard');

		this.textures = [];
		this.framebuffers = [];
	}


	draw(transform, viewport) {
		for(let layer of this.layers)
			if(layer.status != 'ready')
				return;

		if(!this.shader)
			throw "Shader not specified!";

		let w = viewport[2] - viewport[0];
		let h = viewport[3] - viewport[1];

		if(!this.framebuffers.length || this.layout.width != w || this.layout.height != h) {
			this.deleteFramebuffers();
			this.layout.width = w;
			this.layout.height = h;
			this.createFramebuffers();
		}



//TODO optimize: render to texture ONLY if some parameters change!
		let gl = this.gl;
		for(let i = 0; i < this.layers.length; i++) { 
//			gl.activeTexture(gl.TEXTURE0 + i);
//			gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);

			gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffers[i]);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[i], 0);

			this.layers[i].draw(transform, [0, 0, w, h]);
		}
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);


		this.prepareWebGL();

		for(let i = 0; i < this.layers.length; i++) { 
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
		}

		let c = this.layout.tileCoords(0, 0, 0);
		this.updateTileBuffers(new Float32Array([-1, -1, 0,  -1, 1, 0,  1, 1, 0,  1, -1, 0]), c.tcoords);
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);
	}

	createFramebuffers() {
		let gl = this.gl;
		for(let i = 0; i < this.layers.length; i++) {
			let layer = this.layers[i];
			const texture = gl.createTexture();

			gl.activeTexture(gl.TEXTURE0 + 0);
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

			this.textures[i] = texture;

			const framebuffer = gl.createFramebuffer();
			this.framebuffers[i] = framebuffer;
		}
	}
	//TODO release textures and framebuffers
	deleteFramebuffers() {
	}
}

Layer.prototype.types['combiner'] = (options) => { return new ImageCombiner(options); }

export { LayerCombiner }
