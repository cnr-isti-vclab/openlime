import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Layout } from './Layout.js'
import { Transform } from './Transform.js'
import { Shader } from './Shader.js'
import { ShaderNeural } from './ShaderNeural.js'

class LayerNeuralRTI extends Layer {
	constructor(options) {
		super(options || {});
		this.currentRelightFraction = 1.0; //(min: 0, max 1)
		this.maxTiles = 40;
		this.relighted = false;
		this.convergenceSpeed = 1.2;
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

		// make the fragment shader flexible to different network configurations
		let n = info.samples;
		let c = info.planes + 2;
		while (n % 4 != 0)
			n++;
		while (c % 4 != 0)
			c++;
		this.neuralShader.setShaderInfo(info.samples, info.planes, n, c, info.colorspace);

		this.networkParameters = parameters;
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

			let previousRelightFraction = this.relightFraction;
			//adjust maxTiles to presserve framerate only when we had a draw which included relighting (but not a refine operation!).
			if(this.relighted) {
				if(this.canvas.fps > this.canvas.targetfps*1.5) {
					this.currentRelightFraction = Math.min(1.0, this.currentRelightFraction * this.convergenceSpeed);
					//console.log('fps fast: ', this.canvas.fps, this.currentRelightFraction);
				} else if(this.canvas.fps < this.canvas.targetfps*0.75) {
					this.currentRelightFraction = Math.max(this.currentRelightFraction/this.convergenceSpeed, 0.125);
					this.convergenceSpeed = Math.max(1.05, Math.pow(this.convergenceSpeed, 0.9));
					console.log('fps slow: ', this.canvas.fps, this.currentRelightFraction);
				}
			}
			this.refine = true;

			//setup final refinement
			if(this.refineTimeout)
				clearTimeout(this.refineTimeout);

			if(this.currentRelightFraction < 0.75 && this.refine == false)
				this.refineTimeout = setTimeout(() => { this.emit('update'); this.refine = true; }, Math.max(400, 4000/this.canvas.fps));

			this.relightFraction = this.refine ? 1.0 : this.currentRelightFraction;
			this.relightFraction = Math.round(this.relightFraction * 8)/8;

			let sizeChanged = this.relightFraction != previousRelightFraction;

			let w = Math.round((this.layout.tilesize || this.layout.width) * this.relightFraction);
			let h = Math.round((this.layout.tilesize || this.layout.height) * this.relightFraction);
			
			//console.log("Canvas fps: ", this.canvas.fps, "relighted: ", this.relighted, "Refine? ", this.refine, " fraction: ", this.relightFraction, " w: ", this.tileRelightWidth);
			this.refine = false;

			let available = this.layout.available(viewport, transform, this.transform, 0, this.mipmapBias, this.tiles);

			let tiles = Object.values(available);
			if(tiles.length == 0)
				return;


			this.relighted = false;
			for(let tile of tiles) {
				if(tile.neuralUpdated && !sizeChanged)
					continue;
				if(!this.relighted) {
					this.relighted = true; //update fps next turn.
					this.preRelight([viewport.x, viewport.y, viewport.dx, viewport.dy], w, h, sizeChanged);
				}
				this.relightTile(tile, w, h, sizeChanged);
			}
			if(this.relighted)
				this.postRelight();

			this.relighted = this.relighted && !this.refine; //udpate fps only if not refined.
		} 

		this.shader = this.imageShader;
		let done = super.draw(transform, viewport);
		this.shader = this.neuralShader;

		return done;
	}

	preRelight(viewport, w, h) { 
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

		if(!this.framebuffer)
			this.framebuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);


		//save previous viewport
		this.backupViewport = viewport;
		gl.viewport(0, 0, w, h);
	}

	postRelight() {
		let gl = this.gl;
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);

		//restore previous viewport
		let v = this.backupViewport;
		this.gl.viewport(v[0], v[1], v[2], v[3]);
	}

	relightTile(tile, w, h, sizeChanged) {
		let gl = this.gl;

		
		let needsCreate = tile.tex[0] == null;
		if(needsCreate) {
			let tex = tile.tex[0] = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D, tex);
			// set the filtering so we don't need mips
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		}
		if(sizeChanged || needsCreate) {
			gl.bindTexture(gl.TEXTURE_2D, tile.tex[0]);
			// define size and format of level 0
			gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,
							w, h, 0,
							gl.RGBA, gl.UNSIGNED_BYTE, null);
			
			//gl.bindTexture(gl.TEXTURE_2D, null);
		}

		for (var i = 0; i < this.neuralShader.samplers.length; i++) {
			let id = this.neuralShader.samplers[i].id;
			gl.activeTexture(gl.TEXTURE0 + i);
			gl.bindTexture(gl.TEXTURE_2D, tile.tex[id]);
		}
		
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
								gl.TEXTURE_2D, tile.tex[0], 0);
		gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

		tile.neuralUpdated = true;
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
