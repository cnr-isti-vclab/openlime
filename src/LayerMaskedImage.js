import { Layer } from './Layer.js';
import { Raster } from './Raster.js'
import { Shader } from './Shader.js'

class LayerMaskedImage extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if (this.url)
			this.layout.setUrls([this.url]);
		else if (this.layout.urls.length == 0)
			throw "Missing options.url parameter";	

		const rasterFormat = this.format != null ? this.format : 'vec4';
		let raster = new Raster({ format: rasterFormat }); //FIXME select format for GEO stuff

		this.rasters.push(raster);
		
		let shader = new Shader({
			'label': 'Rgb',
			'samplers': [{ id: 0, name: 'kd', type: rasterFormat }]
		});

		shader.uniforms = {
            u_width_height: { type: 'vec2', needsUpdate: true, size: 2, value: [1,1]},
		}

		shader.fragShaderSrc = function (gl) {

			let gl2 = !(gl instanceof WebGLRenderingContext);
			let str = `${gl2 ? '#version 300 es' : ''}

		precision highp float;
		precision highp int;

		uniform vec2 u_width_height; // Keep wh to map to pixels.

		uniform sampler2D kd;

		${gl2 ? 'in' : 'varying'} vec2 v_texcoord;
		${gl2 ? 'out' : ''} vec4 color;

		vec2 bilinear_masked_scalar(sampler2D field, vec2 uv) {
			vec2 px = uv*u_width_height;
			ivec2 iuv = ivec2(floor( px ));
			vec2 fuv = fract(px);
			int i0 = iuv.x;
			int j0 = iuv.y;
			int i1 = i0+1>int(u_width_height.x) ? i0 : i0+1;
			int j1 = j0+1>int(u_width_height.y) ? j0 : j0+1;
		  
			float f00 = texelFetch(field, ivec2(i0, j0), 0).r;
			float f10 = texelFetch(field, ivec2(i1, j0), 0).r;
			float f01 = texelFetch(field, ivec2(i0, j1), 0).r;
			float f11 = texelFetch(field, ivec2(i1, j1), 0).r;
		  
			vec2 result_masked_scalar;
			result_masked_scalar.y = f00*f01*f10*f11;
			result_masked_scalar.y = result_masked_scalar.y > 0.0 ? 1.0 : 0.0;

			const float scale = 255.0/254.0;
			const float bias  = -1.0/254.0;
			result_masked_scalar.x = mix(mix(f00, f10, fuv.x), mix(f01, f11, fuv.x), fuv.y);
			result_masked_scalar.x = result_masked_scalar.y * (scale * result_masked_scalar.x + bias);		  
			return result_masked_scalar;
		  }
		  
		  void main() { 
			vec2  masked_scalar = bilinear_masked_scalar(kd, v_texcoord);
			color = masked_scalar.y > 0.0 ?  vec4(masked_scalar.x, masked_scalar.x, masked_scalar.x, masked_scalar.y) :  vec4(1.0, 0.0, 0.0, masked_scalar.y);
			${gl2 ? '' : 'gl_FragColor = color;'}
		  }
		`;
			return str;

		};

		this.shaders = { 'scalarimage': shader };
		this.setShader('scalarimage');

		this.rasters[0].loadTexture = this.loadTexture.bind(this);
		//this.layout.setUrls([this.url]);
	}


	draw(transform, viewport) {
		return super.draw(transform, viewport);
	}

	loadTexture(gl, img) {
		console.log("LOADING TEXTURE SCALAR...");
		this.rasters[0].width = img.width;
		this.rasters[0].height = img.height;

		this.shader.setUniform('u_width_height', [img.width, img.height]);

		var tex = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, tex);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); //_MIPMAP_LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

		// gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16UI, gl.R16UI, gl.UNSIGNED_SHORT, img);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, gl.LUMINANCE, gl.UNSIGNED_BYTE, img);
		return tex;
	}
}

Layer.prototype.types['maskedimage'] = (options) => { return new LayerMaskedImage(options); }

export { LayerMaskedImage }