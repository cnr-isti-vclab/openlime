import {Layer} from './Layer.js';
import {LayerImage} from './LayerImage.js'
import { ShaderFilterDstretch } from './ShaderFilterDstretch.js';
import { ShaderFilterSelectiveStretch } from './ShaderFilterSelectiveStretch.js';

class LayerDstretch extends LayerImage {
    constructor(options) {
		super(options);

		this.stretchType = options.stretchType;
		this.filter = undefined

		let FilterType;

		if (this.stretchType === 'standard')
			FilterType = ShaderFilterDstretch;
		else
			FilterType = ShaderFilterSelectiveStretch;

		switch (options.sourceType) {
			case 'url':
				if (!options.url)
					console.error("DStretch set to use an URL, but said URL wasn't specified.");
					this.filter = new FilterType(options.url);
				break;
			case 'layer':
				this.filter = new FilterType(this);
				break;
			case 'array':
				this.filter = new FilterType(options.samples);
				break;
			default:
				console.error("DStretch source ", sourceType, " not supported.");
				break;
		}
		this.addShaderFilter(this.filter);
		if (this.stretchType == 'selective')
			this.addControl('light', [0, 0]);
	}

	draw(transform, viewport) {
		return super.draw(transform, viewport);
	}

	setLight(value, dt) {
		if (this.stretchType != 'selective')
			return;

		this.setControl('light', value, dt);

		this.filter.controls[0] = Math.PI * 1.2 * this.getControl('light').current.value[0];//this.controls['light'].current[0];
		this.filter.controls[1] = Math.abs(this.getControl('light').current.value[1]);

		this.filter.setMinMax();
		this.emit('update');
	}
}

Layer.prototype.types['dstretch'] = (options) => { return new LayerDstretch(options); }

export { LayerDstretch }