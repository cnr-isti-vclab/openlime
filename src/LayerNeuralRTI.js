import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Layout } from './Layout.js'
import { Transform } from './Transform.js'
import { Shader } from './Shader.js'
import { ShaderNeural } from './ShaderNeural.js'

class LayerNeuralRTI extends Layer {
	constructor(options) {
		super(options || {});

		this.addControl('light', [0, 0]);
		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.

		let textureUrls = [
			null,
			this.layout.imageUrl(this.url, 'plane_1'),
			this.layout.imageUrl(this.url, 'plane_2'),
			this.layout.imageUrl(this.url, 'plane_3'),
		];

		this.layout.setUrls(textureUrls);

		for(let url of textureUrls) {
			let raster = new Raster({ format: 'vec3'});
				this.rasters.push(raster);
		}

		this.imageShader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id:0, name:'kd', type:'vec3', load: false }]
		});

	

		this.neuralShader = new ShaderNeural();

		this.shaders = { 'standard': this.imageShader, 'neural': this.neuralShader };
		this.setShader('neural');
		this.neuralShader.setLight([0, 0]);


		(async () => { await this.loadNeural(this.url); })();
	}

	setLight(light, dt) {
		this.setControl('light', light, dt);
	}

	loadTile(tile, callback) {
		this.shader = this.neuralShader;
		super.loadTile(tile, callback);
	}

	async loadNeural(url) {
		await this.initialize(url);

		//this.status = 'ready';
		//this.emit('ready');
	}

	async initialize(json_url) {
	
		const info = await this.loadJSON(json_url);
		this.max = info.max.flat(1);
		this.min = info.min.flat(1);

		this.width = info.width;
		this.height = info.height;

		let parameters = {};
		for(let i = 0; i < 3; i++) {
			let key = 'layer' + (i+1);
			parameters[key + '_weights'] = info.weights[i];//(await this.loadJSON(data_path + "/parameters/" + w + "_weights.json")).flat(1);
			parameters[key + '_biases'] = info.biases[i]; //(await this.loadJSON(data_path + "/parameters/" + w + "_biases.json")).flat(1);
		}

		for(const [name, value] of Object.entries(parameters))
			this.neuralShader.setUniform(name, value);

		//this.neuralShader.updateUniforms(gl, this.neuralShader.program);
		this.neuralShader.setUniform('min', this.min);
		this.neuralShader.setUniform('max', this.max);

		this.networkParameters = parameters;
	}



	/**		this.max = info.max;

	 * Initialize the WebGL graphics context
	 */
	prepareWebGL() {
		// creation of the drawing program
		super.prepareWebGL();


	}


	setCoords() {
		let gl = this.gl;		

		let coords = new Float32Array([-1,-1, -1,1, 1,1, 1,-1 ]);

		this.coords_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.coords_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, coords, gl.STATIC_DRAW);
		
		let texCoords = new Float32Array([ 0,0, 0,1, 1,1, 1,0 ]);
		this.texCoords_buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoords_buffer);
		gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
	}

	setNetworkParameters() {
		throw "obsolete";
		for(const [name, value] of Object.entries(this.networkParameters))
			this.neuralShader.setUniform(name, value);
	
		//this.neuralShader.updateUniforms(gl, this.neuralShader.program);
		this.neuralShader.setUniform('min', this.min);
		this.neuralShader.setUniform('max', this.max);
	}

	/* ************************************************************************** */



	// little set of functions to get model, coeff and info
	async loadJSON(info_file){
		const info_response = await fetch(info_file);
		const info = await info_response.json();
		return info;
	}

	/* ************************************************************************** */
	
	draw(transform, viewport) {
		//TODO this is duplicated code. move this check up 
		if (this.status != 'ready')
			return true;

		this.worldRotation = transform.a + this.transform.a;
		if(this.networkParameters !== undefined) {

			let available = this.layout.available(viewport, transform, this.transform, 0, this.mipmapBias, this.tiles);
			let maxTiles = 5;
			let processed = 0;
			let preRelightDone = false;

		
			//update a few tiles in random order (but keep track of where we stopped.)
			if(this.tileOffset === undefined)
				this.tileOffset = 0;
			//let tiles = shuffle(Object.values(available));
			let tiles = Object.values(available);
			if(tiles.length == 0)
				return;
				
			for(let i = 0; i < tiles.length; i++) {
				let tile = tiles[(this.tileOffset + i*251)%tiles.length];
				if(tile.neuralUpdated)
					continue;
	
				if(!preRelightDone) {
					this.preRelight([viewport.x, viewport.y, viewport.dx, viewport.dy]);
					preRelightDone = true;
				}
				if(processed++ > maxTiles) {
					this.emit('update');
					break;
				}

				this.relightTile(tile);
				tile.neuralUpdated = true;
			}
			this.tileOffset = (this.tileOffset + processed)%tiles.length;
				
			if(preRelightDone)
				this.postRelight();

		}


		this.shader = this.imageShader;
		let done = super.draw(transform, viewport);
		this.shader = this.neuralShader;

		return done;
	}

	//relight happens int interpolatecontrols, so viewport tile etc
	//are set for the tile!
	preRelight(viewport) {
 
		let gl = this.gl;

		if(!this.neuralShader.program) {
			this.neuralShader.createProgram(gl);
			gl.useProgram(this.neuralShader.program);
			for (var i = 0; i < this.neuralShader.samplers.length; i++) 
				gl.uniform1i(this.neuralShader.samplers[i].location, i);
		} else
			gl.useProgram(this.neuralShader.program);
		this.neuralShader.updateUniforms(gl);

		if(!this.coords_buffer) 
			this.setCoords();

		gl.bindBuffer(gl.ARRAY_BUFFER, this.coords_buffer);
		gl.vertexAttribPointer(this.neuralShader.position_location, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoords_buffer);
		gl.vertexAttribPointer(this.neuralShader.texcoord_location, 2, gl.FLOAT, false, 0, 0);

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		//save previous viewport
		this.backupViewport = viewport;

		let w = this.layout.tilesize || this.layout.width;
		let h = this.layout.tilesize || this.layout.height;
		gl.viewport(0, 0, w, h);
	}

	/*	for(let [id, tile] of this.tiles) {
			this.relightTile(tile);
		} */
	postRelight() {

		//restore previous viewport
		let v = this.backupViewport;
		this.gl.viewport(v[0], v[1], v[2], v[3]);
	}

	relightTile(tile) {
		let gl = this.gl;

		let w = this.layout.tilesize || this.layout.width;
		let h = this.layout.tilesize || this.layout.height;


		if(!tile.tex[0]) {
			let tex = tile.tex[0] = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tex);

		
			// define size and format of level 0
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
							w, h, 0,
							gl.RGBA, gl.UNSIGNED_BYTE, null);
			
			// set the filtering so we don't need mips
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
			gl.bindTexture(gl.TEXTURE_2D, null);
		}

		for (var i = 0; i < this.neuralShader.samplers.length; i++) {
			let id = this.neuralShader.samplers[i].id;
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, tile.tex[id]);
		}
		const fb = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
								gl.TEXTURE_2D, tile.tex[0], 0);


		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	}


	interpolateControls() {
		let done = super.interpolateControls();
		if(done)
			return true;

		let light = this.controls['light'].current.value;
		let rotated = Transform.rotate(light[0], light[1], this.worldRotation*Math.PI);
		light = [rotated.x, rotated.y];
		this.neuralShader.setLight(light);

		for(let [id, tile] of this.tiles)
			tile.neuralUpdated = false;
		return false;
	}
}


Layer.prototype.types['neural'] = (options) => { return new LayerNeuralRTI(options); }

export { LayerNeuralRTI }
