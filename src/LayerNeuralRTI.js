import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Layout } from './Layout.js'
import { Transform } from './Transform.js'
import { Shader } from './Shader.js'

import * as tf from '@tensorflow/tfjs';
import * as wgl from '@tensorflow/tfjs-backend-webgl';
//import * as wgp from '@tensorflow/tfjs-backend-webgpu';


class LayerNeuralRTI extends Layer {
	constructor(options) {
		super(options || {});

		this.addControl('light', [0, 0]);
		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.

		let raster = new Raster({ format: 'vec3' });
		this.rasters.push(raster); 

/*
		//9 coefficients, for the moment is fixed.

		let urls = [];
		for(let p = 0; p < 3; p++) {
			let url = this.url +  'plane_' + p + ".jpg";
			urls.push(url);
			let raster = new Raster({ format: 'vec3' });

			raster.loadTexture = function(gl, img, callback) {
				let plane = tf.browser.fromPixels(img, 3);
				plane = plane.mul((this.max - this.min)/255.0);
				plane = plane.add(this.min);
				callback(plane, img.width*img.height*3);
			}
			this.rasters.push(raster);
		}
		this.layout.setUrls(urls); */

		//add raster used to store tensorflow computation.


		this.initShader();	
		(async () => { await this.loadNeural(this.url); })();
	}

	setLight(light, dt) {}
	getModes() { return []; }
	loadJson() {}

	setLight(light, dt) {
		this.setControl('light', light, dt);
	}

	loadTile(tile, callback) {
		tile.missing = 0;
		this.tiles.set(tile.index, tile);

		if (this.layout.type == "image") {
			this.layout.width = this.width;
			this.layout.height = this.height;
			this.layout.emit('updateSize');
		}
		//tile.size += size;
		if (callback) callback(0);

		//tile.tex[sampler.id] = tex;
	}
	async loadNeural(url) {

		//load model, info and coefficients
		this.decoder = await tf.loadLayersModel(url + "model.json");

		const info_response = await fetch(url + "info.json");
		const info = await info_response.json();
		this.width = info.width;
		this.height = info.height;

		const coeff_response = await fetch(url + "features.json");
		this.features = await coeff_response.json();
		const min = info.min;
		const max = info.max;
		for(let pixel of this.features.data) {
			for(let k = 0; k < 9; k++)
				pixel[k] = (pixel[k] - min[k])/(max[k] - min[k]);
		}
		//this.coeff = Float32Array.from(); 

		

		//this.coeff = tf.reshape(this.coeff, [this.height, this.width, 9])




		this.status = 'ready';
		this.emit('ready');
		

		//const backend = new wg.MathBackendWebGL(null);
		//tf.registerBackend('neural', () => backend);
		//tf.setBackend('neural');
		//		tf.webgl.forceHalfFloat();
		//	graph = await tf.loadGraphModel('real/model.json');

		
/*		const response = await fetch(encoded)
		const buffer = await response.arrayBuffer();
		const np = fromArrayBuffer(buffer);
		let coeffs = Float32Array.from(np.data); 
				for (let i = 0; i < coeffs.length; i++)
			coeffs[i] = ((coeffs[i]) / 255);
*/

/*
		this.planes = tf.tensor(coeffs, np.shape);

		let imgs = tf.reshape(this.planes, [this.height, this.width, 9])
		imgs = tf.unstack(imgs, 2)
		for (let i = 0; i < 9; i++) {
			let planecanvas = document.getElementById('canvas' + i);
			await tf.browser.toPixels(imgs[i], planecanvas);
			tf.dispose(imgs[i]);
		}

		let d = (max - min);
		this.planes = this.planes.mul(d);
		this.planes = this.planes.add(min); */
	}

	async relight(light_dir) {
		console.log(light_dir);

		if(!this.inited) {

			const gpgpu = new wgl.GPGPUContext(this.gl);
			tf.registerBackend('webgl-shared', () => {
				return new wgl.MathBackendWebGL(gpgpu);
			}, 2);
			
			tf.copyRegisteredKernels('webgl', 'webgl-shared');
			tf.setBackend('webgl-shared');
			tf.enableProdMode();
	
			this.coeff = tf.tensor(this.features.data, [this.height*this.width, 9]);
			this.inited = true;
		}

		let t = this.coeff;
		let width = this.width;
		let height = this.height;
		let texture;
		let useTidy = false;
		let decoder = this.decoder;
		let profile = await tf.profile(async function() {
	
			if (useTidy){
	
				const input = tf.tidy(() => {
					return t.concat(tf.tensor1d(light_dir).broadcastTo([width*height, 2]), -1);
				});
	
				const result = tf.tidy(() => {
					return this.decoder.predictOnBatch(input).reshape([height, width, 3]).clipByValue(0.0, 1.0).dataToGPU();
				});
	
				tf.dispose(input);
	
				texture = result.texture;
				tf.dispose(result);
	
			}
	
			else{
				let l = tf.broadcastTo(light_dir, [width*height, 2]);
				// predict the whole image
				let r1 = tf.concat([t, l], -1)
				tf.dispose(l);
				let r2 = decoder.predictOnBatch(r1);
				tf.dispose(r1);
				let r3 = tf.reshape(r2, [height, width, 3]); 
				tf.dispose(r2);
				// r3 = tf.reverse(r3, -1);
				let result = tf.clipByValue(r3, 0.0, 1.0);
				tf.dispose(r3);
	
				let canvas = document.querySelector('#neural');
				await tf.browser.toPixels(result, canvas);
	
				//let tex = result.dataToGPU();
				tf.dispose(result);
	
				//texture = tex.texture;
				//tf.dispose(tex);
			}
		});
	
		//console.log('profile', profile);
		console.log('memory', tf.memory());
	
		// const tex = result.dataToGPU();
		// tf.dispose(result);
		return texture;
	}

	
	draw(transform, viewport) { 
		return super.draw(transform, viewport);
	}

	interpolateControls() {
		let done = super.interpolateControls();
		if(!done) {
			(async () => {
			let light = this.controls['light'].current.value;
			let rotated = Transform.rotate(light[0], light[1], this.worldRotation*Math.PI);
			let texture = await this.relight(light);
			//this.tiles.get(0).tex[0] = texture;
			console.log(texture);
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
/*

function asciiDecode(buf) {
	return String.fromCharCode.apply(null, new Uint8Array(buf));
}

function readUint16LE(buffer) {
	let view = new DataView(buffer);
	let val = view.getUint8(0);
	val |= view.getUint8(1) << 8;
	return val;
}

function fromArrayBuffer(buf) {
	let magic = asciiDecode(buf.slice(0, 6));
	if (magic.slice(1, 6) != 'NUMPY') {
		throw new Error('unknown file type');
	}
	let version = new Uint8Array(buf.slice(6, 8));

	let headerLength = readUint16LE(buf.slice(8, 10));
	let headerStr = asciiDecode(buf.slice(10, 10 + headerLength));
	let offsetBytes = 10 + headerLength;
	//rest = buf.slice(10+headerLength);  XXX -- This makes a copy!!! https://www.khronos.org/registry/typedarray/specs/latest/#5

	console.log(headerStr);
	// Hacky conversion of dict literal string to JS Object
	let info = eval("(function() { return " + headerStr.toLowerCase().replace('(', '[').replace('),', ']') + "; })")();

	var data;
	if (info.descr === "|u1") {
		data = new Uint8Array(buf, offsetBytes);
	} else if (info.descr === "|i1") {
		data = new Int8Array(buf, offsetBytes);
	} else if (info.descr === "<u2") {
		data = new Uint16Array(buf, offsetBytes);
	} else if (info.descr === "<i2") {
		data = new Int16Array(buf, offsetBytes);
	} else if (info.descr === "<u4") {
		data = new Uint32Array(buf, offsetBytes);
	} else if (info.descr === "<i4") {
		data = new Int32Array(buf, offsetBytes);
	} else if (info.descr === "<f4") {
		data = new Float32Array(buf, offsetBytes);
	} else if (info.descr === "<f8") {
		data = new Float64Array(buf, offsetBytes);
	} else {
		throw new Error('unknown numeric dtype')
	}

	return {
		shape: info.shape,
		fortran_order: info.fortran_order,
		data: data
	};
} */


Layer.prototype.types['neural'] = (options) => { return new LayerNeuralRTI(options); }

export { LayerNeuralRTI }