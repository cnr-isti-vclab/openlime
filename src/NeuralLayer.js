import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { Layout } from './Layout.js'
import { RTILayer } from './RTILayer.js'

import { Shader } from './Shader.js'

import * as tf from '@tensorflow/tfjs';
import * as wg from '@tensorflow/tfjs-backend-webgl';

class NeuralLayer extends RTILayer {
	constructor(options) {
		super(options || {});

		//9 coefficients, for the moment is fixed.

		for(let p = 0; p < 3; p++) {
			let url = this.imageUrl(this.url, 'plane_' + p);
			let raster = new Raster({ url: url, type: 'vec3', attribute: 'coeff', colorspace: 'linear' });
			if(p == 0 || this.layout == 'tarzoom')
				raster.layout = new Layout(url, this.layout);
			else
				raster.layout = this.rasters[0].layout;
			raster.loadTexture = function(gl, img, callback) {
				let plane = tf.browser.fromPixels(img, 3);
				plane = plane.mul((this.max - this.min)/255.0);
				plane = plane.add(this.min);
				callback(plane, img.width*img.height*3);
			}
			this.rasters.push(raster);
		}
		this.setLayout(this.rasters[0].layout);


		//add raster used to store tensorflow computation.
		let raster = new Raster({ url: this.url, type: 'vec3', attribute: 'kd', colorspace: 'sRGB' });
		raster.layout = this.rasters[0].layout;
		this.rasters.push(raster);

		this.initShader();
		console.log(this.url);
		(async () => {
			await this.loadNeural(this.url);
			await this.render(0.5, 0.5);
		})();
	}

	setLight(light, dt) {}
	getModes() { return []; }
	loadJson() {}

	async loadNeural(url) {
		//TODO check for /
		let model = url + 'model.json';
//		let encoded = url + 'encoded.npy';
		let header = url + 'header.json';

		console.log(model);
		const backend = new wg.MathBackendWebGL(null);
		//tf.registerBackend('neural', () => backend);
		//tf.setBackend('neural');
		wg.setWebGLContext(this.gl);
		tf.setBackend('webgl')
		tf.enableProdMode();
		//		tf.webgl.forceHalfFloat();
		//	graph = await tf.loadGraphModel('real/model.json');

		this.decoder = await tf.loadLayersModel(model);

/*		const response = await fetch(encoded)
		const buffer = await response.arrayBuffer();
		const np = fromArrayBuffer(buffer);
		let coeffs = Float32Array.from(np.data); 
				for (let i = 0; i < coeffs.length; i++)
			coeffs[i] = ((coeffs[i]) / 255);
*/

		const head_response = await fetch(header);
		let head = await head_response.json();
		this.width = head.width;
		this.height = head.height;
		this.min = head.min;
		this.max = head.max;
		


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

	draw() { 
		console.log('drawing?');
		console.log(this);
		return true;
	}
	async render(tile, dx, dy) {
		
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
	}
	initShader() {
		let shader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id:3, name:'kd', type:'vec3', load: false }, 
			{ id:0, name:'plane_0', type:'vec3', bind: false },
			{ id:1, name:'plane_1', type:'vec3', bind: false },
			{ id:2, name:'plane_2', type:'vec3', bind: false }],
			'body': `#version 300 es

precision highp float; 
precision highp int; 

uniform sampler2D kd;

in vec2 v_texcoord;
out vec4 color;


void main() {
	color = texture(kd, v_texcoord);
}
`
		});

		this.shaders = {'standard': shader };
		this.setShader('standard');
	}

}

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
}


Layer.prototype.types['neural'] = (options) => { return new NeuralLayer(options); }

export { NeuralLayer }