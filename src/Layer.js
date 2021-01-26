/**
 * @param {string} id unique id for layer.
 * @param {object} options
 *  * *label*:
 *  * *transform*: relative coordinate [transformation](#transform) from layer to canvas
 *  * *visible*: where to render or not
 *  * *zindex*: stack ordering of the layer higher on top
 *  * *opacity*: from 0.0 to 1.0 (0.0 is fully transparent)
 *  * *rasters*: [rasters](#raster) used for rendering.
 *  * *controls*: shader parameters that can be modified (eg. light direction)
 *  * *shader*: [shader](#shader) used for rendering
 *  * *layout*: all the rasters in the layer MUST have the same layout.
 *  * *mipmapBias*: default 0.5, when to switch between different levels of the mipmap
 *  * *prefetchBorder*: border tiles prefetch (default 1)
 *  * *maxRequest*: max number of simultaneous requests (should be GLOBAL not per layer!) default 4
 */
import { Transform } from './Transform.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'

class Layer {
	constructor(options) {

		Object.assign(this, {
			transform: new Transform(),
			visible: true,
			zindex: 0,
			opacity: 1.0,
			layout: null,
			rasters: [],
			controls: {},
			shaders: {},
			layout: 'image',
			shader: null, //current shader.

			prefetchBorder: 1,
			mipmapBias: 0.5,
			maxRequest: 4,

			update: [],  //update callbacks for a redraw

	//internal stuff, should not be passed as options.
			tiles: [],      //keep references to each texture (and status) indexed by level, x and y.
							//each tile is tex: [.. one for raster ..], missing: 3 missing tex before tile is ready.
							//only raster used by the shader will be loade.
			queued: [],     //queue of tiles to be loaded.
			requested: {},  //tiles requested.
		});

		Object.assign(this, options);

		//create from derived class if type specified
		if(this.type) {
			if(this.type in this.types) {
				options.type = null; //avoid infinite recursion!
				return this.types[this.type](options);
			}
			throw "Layer type: " + this.type + " has not been loaded";
		}

		//create members from options.
		this.rasters = this.rasters.map((raster) => new Raster(raster));


		//layout needs to becommon among all rasters.
		if(typeof(this.layout) != 'object' && this.rasters.length)
			this.layout = new Layout(this.rasters[0], this.layout);

		if(this.shader)
			this.shader = new Shader(this.shader);
	}

	

/**
 * @param {bool} visible
 */
	setVisible(visible) {
		this.visible = visible;
		this.emit('update');
	}

/**
 * @param {int} zindex
 */
	setZindex(zindex) {
		this.zindex = zindex;
		this.emit('update');
	}


	draw(transform, gl) {
		//how linear or srgb should be specified here.
//		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
		if(this.status != 'ready')
			return;

		if(!this.shader)
			throw "Shader not specified!";

		this.prepareWebGL(gl);

//		find which quads to draw

//		draw quads.
		drawTile(gl, transform, 0, 0, 0);

//		gl.uniform1f(t.opacitylocation, t.opacity);
	}

	drawTile(gl, transform, level, x, y) {
		var index = this.layout.index(level, x, y);
		let tile = this.tiles[index];
		if(tile.missing != 0) 
			throw "Attempt to draw tile still missing textures"

		//setup matrix

		//setup coords and tex (depends on layout/overlay boundaries).
		
		//update coords and texture buffers
		updateTileBuffers(gl, coords, tcoords);

		//bind textures
		for(var i = 0; i < this.shader.samplers; i++) {
			let id = this.shader.samplers[i];
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, tile.tex[id]);
		}
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);
	}



	updateTileBuffers() {
		//TODO join buffers, and just make one call per draw! (except the bufferData, which is per node)
		gl.bindBuffer(gl.ARRAY_BUFFER, t.vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);

		gl.vertexAttribPointer(t.coordattrib, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(t.coordattrib);

		gl.bindBuffer(gl.ARRAY_BUFFER, t.tbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, tcoords, gl.STATIC_DRAW);

		gl.vertexAttribPointer(t.texattrib, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(t.texattrib);
	}

	setShader(id) {
		if(!id in shaders)
			throw "Unknown shader: " + id;
		this.shader = shaders[id];

		if(!this.shader.program) {
			this.shader.createProgram(gl);

			//send uniforms here!
		}
	}

	prepareWebGL(gl) {
		//interpolate uniforms from controls!
		//update uniforms

		gl.useProgram(this.shader.program);

		if(this.ibuffer) //this part might go into another function.
			return;

		this.ibuffer = gl.createBuffer();
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibuffer);
		gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array([3,2,1,3,1,0]), gl.STATIC_DRAW);

		this.vbuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]), gl.STATIC_DRAW);

		this.tbuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0,  0, 1,  1, 1,  1, 0]), gl.STATIC_DRAW);

		this.coordattrib = gl.getAttribLocation(this.program, "a_position");
		gl.vertexAttribPointer(t.coordattrib, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.coordattrib);

		this.texattrib = gl.getAttribLocation(this.program, "a_texcoord");
		gl.vertexAttribPointer(t.texattrib, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(t.texattrib);
	}

/**
*  @param {object] transform is the canvas coordinate transformation
*  @param {viewport} is the viewport for the rendering, note: for lens might be different! Where we change it? here layer should know!
*/
	prefetch(transform, viewport) {
		if(this.layout.status != 'ready' || !this.visible)
			return;
	}
}

Layer.prototype.types = {}

export { Layer }
