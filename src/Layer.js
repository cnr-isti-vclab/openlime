
import { Transform } from './Transform.js'
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'
import { Layout } from './Layout.js'
import { Cache } from './Cache.js'

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

class Layer {
	constructor(options) {

		Object.assign(this, {
			transform: new Transform(),
			visible: true,
			zindex: 0,
			opacity: 1.0,

			rasters: [],
			layers: [],
			controls: {},
			controllers: [],
			shaders: {},
			layout: 'image',
			shader: null, //current shader.
			gl: null,

			prefetchBorder: 1,
			mipmapBias: 0.5,
			maxRequest: 4,

			signals: { update: [], ready: [] },  //update callbacks for a redraw, ready once layout is known.

	//internal stuff, should not be passed as options.
			tiles: [],      //keep references to each texture (and status) indexed by level, x and y.
							//each tile is tex: [.. one for raster ..], missing: 3 missing tex before tile is ready.
							//only raster used by the shader will be loade.
			queue: [],     //queue of tiles to be loaded.
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
		this.transform = new Transform(this.transform);

		//layout needs to becommon among all rasters.
		if(typeof(this.layout) != 'object' && this.rasters.length) 
			this.setLayout(new Layout(this.rasters[0], this.layout));

		if(this.shader)
			this.shader = new Shader(this.shader);
	}

	addEvent(event, callback) {
		this.signals[event].push(callback);
	}

	emit(event) {
		for(let r of this.signals[event])
			r(this);
	}

	setLayout(layout) {
		let callback = () => { 
			this.status = 'ready';
			this.setupTiles(); //setup expect status to be ready!
			this.emit('ready');
			this.emit('update');
		};
		if(layout.status == 'ready') //layout already initialized.
			callback();
		else
			layout.addEvent('ready', callback);
		this.layout = layout;
	}


	setShader(id) {
		if(!id in this.shaders)
			throw "Unknown shader: " + id;
		this.shader = this.shaders[id];
		this.setupTiles();
		this.shader.setEvent('update', ()=>{ this.emit('update'); });
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

	boundingBox() {
		return this.layout.boundingBox();
	}


	setControl(name, value, dt) {
		let now = performance.now();
		let control = this.controls[name];
		this.interpolateControl(control, now);

		control.source.value = [...control.current.value];
		control.source.t = now;

		control.target.value = [...value];
		control.target.t = now + dt;

		this.emit('update');
	}

	interpolateControls() {
		let now = performance.now();
		let done = true;
		for(let control of Object.values(this.controls))
			done = this.interpolateControl(control, now) && done;
		return done;
	}

	interpolateControl(control, time) {
		let source = control.source;
		let target = control.target;
		let current = control.current;

		current.t = time;
		if(time < source.t) {
			current.value = [...source.value];
			return false;
		}

		if(time > target.t - 0.0001) {
			current.value = [...target.value];
			return true;
		}

		let t = (target.t - source.t);
		let tt = (time - source.t)/t;
		let st = (target.t - time)/t;

		current.value = [];
		for(let i  = 0; i < source.value.length; i++)
			current.value[i] = (st*source.value[i] + tt*target.value[i]);
		return false;
	}

/**
 *  render the 
 */
	draw(transform, viewport) {
		//exception for layout image where we still do not know the image size
		//how linear or srgb should be specified here.
//		gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
		if(!this.status == 'ready' || this.tiles.length == 0)
			return;

		if(!this.shader)
			throw "Shader not specified!";

		let done = this.interpolateControls();
		this.prepareWebGL();

//		find which quads to draw and in case request for them
		transform = this.transform.compose(transform);
		let needed = this.layout.neededBox(viewport, transform, this.prefetchBorder, this.mipmapBias);
		let torender = this.toRender(needed);

		let matrix = transform.projectionMatrix(viewport);
		this.gl.uniformMatrix4fv(this.shader.matrixlocation, this.gl.FALSE, matrix);

		for(let index in torender) {
			let tile = torender[index];
//			if(tile.complete)
				this.drawTile(torender[index]);
		}

//		gl.uniform1f(t.opacitylocation, t.opacity);
		return done;
	}

	drawTile(tile) {
		let tiledata = this.tiles[tile.index];
		if(tiledata.missing != 0) 
			throw "Attempt to draw tile still missing textures"

		//TODO might want to change the function to oaccept tile as argument
		let c = this.layout.tileCoords(tile.level, tile.x, tile.y);

		//update coords and texture buffers
		this.updateTileBuffers(c.coords, c.tcoords);

		//bind textures
		let gl = this.gl;
		for(var i = 0; i < this.shader.samplers.length; i++) {
			let id = this.shader.samplers[i].id;
			gl.uniform1i(this.shader.samplers[i].location, i);
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, tiledata.tex[id]);
		}
		gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT,0);
	}

/* given the full pyramid of needed tiles for a certain bounding box, 
 *  starts from the preferred levels and goes up in the hierarchy if a tile is missing.
 *  complete is true if all of the 'brothers' in the hierarchy are loaded,
 *  drawing incomplete tiles enhance the resolution early at the cost of some overdrawing and problems with opacity.
 */

	toRender(needed) {

		var torender = {}; //array of minlevel, actual level, x, y (referred to minlevel)
		var brothers = {};

		let minlevel = needed.level;
		var box = needed.pyramid[minlevel];

		for(var y = box[1]; y < box[3]; y++) {
			for(var x = box[0]; x < box[2]; x++) {
				var level = minlevel;
				while(level >= 0) {
					var d = minlevel - level;
					var index = this.layout.index(level, x>>d, y>>d);
					if(this.tiles[index].missing == 0) {
						torender[index] = {index:index, level:level, x:x>>d, y:y>>d, complete:true};
						break;
					} else {
						var sx = (x>>(d+1))<<1;
						var sy = (y>>(d+1))<<1;
						brothers[this.layout.index(level, sx, sy)] = 1;
						brothers[this.layout.index(level, sx+1, sy)] = 1;
						brothers[this.layout.index(level, sx+1, sy+1)] = 1;
						brothers[this.layout.index(level, sx, sy+1)] = 1;
					}
					level--;
				}
			}
		}
		for(let index in brothers) {
			if(index in torender)
				torender[index].complete = false;
		}
		return torender;
	}


	updateTileBuffers(coords, tcoords) {
		let gl = this.gl;
		//TODO to reduce the number of calls (probably not needed) we can join buffers, and just make one call per draw! (except the bufferData, which is per node)
		gl.bindBuffer(gl.ARRAY_BUFFER, this.vbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);

		gl.vertexAttribPointer(this.shader.coordattrib, 3, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.shader.coordattrib);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.tbuffer);
		gl.bufferData(gl.ARRAY_BUFFER, tcoords, gl.STATIC_DRAW);

		gl.vertexAttribPointer(this.shader.texattrib, 2, gl.FLOAT, false, 0, 0);
		gl.enableVertexAttribArray(this.shader.texattrib);
	}



/**
 *  If layout is ready and shader is assigned, creates or update tiles to keep track of what is missing.
 */
	setupTiles() {
		if(!this.shader || !this.layout || this.layout.status != 'ready')
			return;

		if(!this.tiles.length) {
			this.tiles = JSON.parse(JSON.stringify(this.layout.tiles));
			for(let tile of this.tiles) {
				tile.tex = new Array(this.shader.samplers.length);
				tile.missing = this.shader.samplers.length;
				tile.size = 0;
			}
			return;
		}

		for(let tile of this.tiles) {
			tile.missing = this.shader.samplers.length;;
			for(let sampler of this.shader.samplers) {
				if(tile.tex[sampler.id])
					tile.missing--;
			}
		}
	}

	prepareWebGL() {

		let gl = this.gl;

		if(this.shader.needsUpdate)
			this.shader.createProgram(gl);

		gl.useProgram(this.shader.program);
		this.shader.updateUniforms(gl, this.shader.program);


		//interpolate uniforms from controls!
		//update uniforms

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
	}

	sameNeeded(a, b) {
		return a.level == b.level &&
		a.pyramid[a.level][0] == b.pyramid[a.level][0] &&
		a.pyramid[a.level][1] == b.pyramid[a.level][1] &&
		a.pyramid[a.level][2] == b.pyramid[a.level][2] &&
		a.pyramid[a.level][3] == b.pyramid[a.level][3];
	}
/**
*  @param {object] transform is the canvas coordinate transformation
*  @param {viewport} is the viewport for the rendering, note: for lens might be different! Where we change it? here layer should know!
*/
	prefetch(transform, viewport) {

		if(this.layers.length != 0) { //combine layers
			for(let layer of this.layers)
				layer.prefetch(transform, viewport);
		}

		if(this.rasters.length == 0)
			return;

		if(this.status != 'ready') 
			return;

		let needed = this.layout.neededBox(viewport, transform, this.prefetchBorder, this.mipmapBias);
		if(this.previouslyNeeded && this.sameNeeded(this.previouslyNeeded, needed))
				return;
		this.previouslyNeeded = needed;




		this.queue = [];
		let now = performance.now();
		//look for needed nodes and prefetched nodes (on the pos destination

		for(let level = 0; level <= needed.level; level++) {
			let box = needed.pyramid[level];
			let tmp = [];
			for(let y = box[1]; y < box[3]; y++) {
				for(let x = box[0]; x < box[2]; x++) {
					let index = this.layout.index(level, x, y);
					let tile = this.tiles[index];
					tile.time = now;
					tile.priority = needed.level - level;
					if(tile.missing != 0 && !this.requested[index])
						tmp.push(tile);
				}
			}
			let cx = (box[0] + box[2])/2;
			let cy = (box[1] + box[3])/2;
			//sort tiles by distance to the center TODO: check it's correct!
			tmp.sort(function(a, b) { return Math.abs(a.x - cx) + Math.abs(a.y - cy) - Math.abs(b.x - cx) - Math.abs(b.y - cy); });
			this.queue = this.queue.concat(tmp);
		}
		Cache.setCandidates(this);
	}

	loadTile(tile, callback) {
		if(this.requested[tile.index])
			throw"AAARRGGHHH double request!";

		this.requested[tile.index] = true;

		for(let sampler of this.shader.samplers) {
			let path = this.layout.getTileURL(this.rasters[sampler.id].url, tile.x, tile.y, tile.level );
			let raster = this.rasters[sampler.id];
			raster.loadImage(path, this.gl, (tex, size) => {

				if(this.layout.type == "image")
					this.layout.initImage(raster.width, raster.height);

				tile.size += size;
				tile.tex[sampler.id] = tex;
				tile.missing--;
				if(tile.missing <= 0) {
					this.emit('update');
					delete this.requested[tile.index];
					if(callback) callback(size);
				}
			});
		}
	}

}


Layer.prototype.types = {}

export { Layer }
