import { Layer }  from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderRTI } from './ShaderRTI.js'
import { Layout } from './Layout.js'
import { Controller2D } from './Controller2D.js'

/**
 * Extends {@link Layer}.
 * @param {options} options Same as {@link Layer}, but url and layout are required.
 */

class LayerRTI extends Layer {
	constructor(options) {
		super(options);

		if(Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if(!this.url)
			throw "Url option is required";

		if(!this.layout)
			this.layout = 'image';

		this.shaders['rti'] = new ShaderRTI();
		this.setShader('rti');

		this.sourceLight = this.targetLight = {x:0, y:0, z:1, t:performance.now()};

		if(this.url)
			this.init(this.url);
	}

	planeUrl(url, plane) {
		let path = this.url.split('/').slice(0, -1).join('/') + '/';
		switch(this.layout) {
			case 'image':    return path + 'plane_' + plane + '.jpg'; break;
			case 'google':   return path + 'plane_' + plane;          break;
			case 'deepzoom': return path + 'plane_' + plane + '.dzi'; break;
			case 'zoomify':  return path + 'plane_' + plane + '/ImageProperties.xml'; break;
			case 'iip':  throw Error("Unimplemented");
			case 'iiif': throw Error("Unimplemented");
			default:     throw Error("Unknown layout: " + layout);
		}
	}

	setLight(light, dt) {
		let now = performance.now();
		this.sourceLight = this.interpolateLight(this.sourceLight, this.targetLight, now);
		this.targetLight = light;
		this.targetLight.t = now + dt;;
		this.emit('update');
	}

	interpolateLight(source, target, time) {
		if(time < source.t) return source;
		if(time > target.t) return target;

		let t = (target.t - source.t);
		if(t < 0.0001) {
			Object.assign(this, target);
			return;
		}

		let tt = (time - source.t)/t;
		let st = (target.t - time)/t;

		let light = {};
		for(let i of ['x', 'y', 'z'])
			light[i] = (st*source[i] + tt*target[i]);
		light.t = time;
		return light;
	}
	
	init(url) {
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let json = await response.json();
			this.shader.init(json);

//			let controller = new Controller2D((x, y)=>shader.setLight([x, y]), { hover: true });
//			this.controllers.push(controller);

			for(let p = 0; p < this.shader.njpegs; p++)
				this.rasters.push(new Raster({ url: this.planeUrl(this.url, p), type: 'vec3', attribute: 'coeff', colorspace: 'linear' }));

			let size = {width:this.width, height:this.height};
			this.setLayout(new Layout(this.planeUrl(this.url, 0), this.layout, size));


		})().catch(e => { console.log(e); this.status = e; });
	}
	draw(transform, viewport) {
		if(this.status != 'ready')
			return;

		//TODO parameter interpolation should be generalized! (brdf and rti have light, for example)
		let now = performance.now();
		let light = this.interpolateLight(this.sourceLight, this.targetLight, now);
		let done = this.targetLight.t <= now;
		if(!done)
			this.shader.setLight([light.x, light.y, light.z]);

		super.draw(transform, viewport);
		return done;
	}
}

Layer.prototype.types['rti'] = (options) => { return new LayerRTI(options); }

export { LayerRTI }
