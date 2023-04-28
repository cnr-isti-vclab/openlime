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
			this.url + "features/features_1.dzi",
			this.url + "features/features_2.dzi",
			this.url + "features/features_3.dzi"
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

	async initialize(data_path) {
	
		const info = await this.loadJSON(data_path + "/utils/info.json");
		this.max = info.max.flat(1);
		/*for (let i in this.max){
			this.max[i] = new Float32Array(this.max[i]);
		}*/
		this.min = info.min.flat(1);
		/*for (let i in this.min){
			this.min[i] = new Float32Array(this.min[i]);
		}*/
		//single tile!
		this.width = info.width;
		this.height = info.height;

		let parameters = {};
		for(let w of ['layer1', 'layer2', 'layer3']) {
			parameters[w + '_weights'] = (await this.loadJSON(data_path + "/parameters/" + w + "_weights.json")).flat(1);
			parameters[w + '_biases'] = (await this.loadJSON(data_path + "/parameters/" + w + "_biases.json")).flat(1);
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

		if(!this.coords_buffer) {
			this.setCoords();
		}
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
		this.worldRotation = transform.a + this.transform.a;
		this.shader = this.imageShader;
		let done = super.draw(transform, viewport);
		this.shader = this.neuralShader;
		return done;
	}

	//relight happens int interpolatecontrols, so viewport tile etc
	//are set for the tile!
	relight(lights) {
		if(!this.networkParameters) return; //neural json not loaded.
		let gl = this.gl;

		
		if(!this.neuralShader.program)
			this.neuralShader.createProgram(gl);

		this.neuralShader.setLight(lights);

		gl.useProgram(this.neuralShader.program);
		this.neuralShader.updateUniforms(gl);

		//gl.clearColor(0,0,1,1);  // specify the color to be used for clearing
		//gl.clear(gl.COLOR_BUFFER_BIT);  // clear the canvas (to black)

		gl.bindBuffer(gl.ARRAY_BUFFER, this.coords_buffer);
		gl.vertexAttribPointer(this.neuralShader.position_location, 2, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoords_buffer);
		gl.vertexAttribPointer(this.neuralShader.texcoord_location, 2, gl.FLOAT, false, 0, 0);

		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.BLEND);

		//save previous viewport
		let v = gl.getParameter(gl.VIEWPORT);

		let w = this.layout.tilesize || this.layout.width;
		let h = this.layout.tilesize || this.layout.height;
		gl.viewport(0, 0, w, h);

	
		for(let [id, tile] of this.tiles) {
			this.relightTile(tile);
		}
		//restore previous viewport
		gl.viewport(v[0], v[1], v[2], v[3]);
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
			gl.uniform1i(this.neuralShader.samplers[i].location, i);
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
		if(!done) {
			(async () => {
				let light = this.controls['light'].current.value;
				let rotated = Transform.rotate(light[0], light[1], this.worldRotation*Math.PI);
				light = [rotated.x, rotated.y];
				//let texture = 
				this.relight(light);
				// this.gl.useProgram(this.shader.program);
				//this.tiles.get(0).tex[0] = texture;
				// console.log('TEXTURE', texture);
			})();
		} 
		return done;
	}
	/*async render(tile, dx, dy) {
		
		if(!tile.planes) {
			tile.planes = tf.concat([tile.tex[0], tile.tex[1], tile.tex[2]], 2);
		}

		let time = await tf.time(async  () => {

			let profile = await tf.profile(async () => {

				let now = performance.now();
				let light = tf.tensor1d([dx, dy]);
				let light1 = tf.broadcastTo(light, [this.width * this.height, 2]);

				let result = this.decoder.predict([tile.planes, light1], { batchSize: 1000000 });
				let image = tf.reshape(result, [this.height, this.width, 3]);
				let image1 = tf.reverse(image, -1);
				let image2 = tf.clipByValue(image1, 0.0, 1.0);


				image2.dataSync();
				
				const tex = tf.backend().getTexture(image2.dataId);
				console.log(tex);
				let canvas = document.getElementById('canvas');
				await tf.browser.toPixels(image2, canvas);

				tf.dispose(image2);
				tf.dispose(image1);
				tf.dispose(image);
				tf.dispose(result);
				tf.dispose(light);
				tf.dispose(light1);
				console.log(performance.now() - now);
			});
			console.log("profile", profile);
		});

		console.log("time", time);
		console.log(tf.memory());
	} */
	initShader() {
		throw "a";
		let shader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id:0, name:'kd', type:'vec3', load: false }]
			//{ id:0, name:'plane_0', type:'vec3', bind: false },
			//{ id:1, name:'plane_1', type:'vec3', bind: false },
			//{ id:2, name:'plane_2', type:'vec3', bind: false }]
		});
		shader.fragShaderSrc = function(gl) {
			return `
			uniform sampler2D kd;
			in vec2 v_texcoord;
			
			vec4 data() {
				return texture(kd, v_texcoord);
			}
			`
		}
		this.shaders = {'standard': shader };
		this.setShader('standard');
	}

}


Layer.prototype.types['neural'] = (options) => { return new LayerNeuralRTI(options); }

export { LayerNeuralRTI }
