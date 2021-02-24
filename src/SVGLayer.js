import { Transform } from './Transform.js'

class AnnotationSVG {
	
	constructor(options) {
		Object.assign(this, {
			svg: null,
			appended: false
			transform: new Transform();
		});

		if(Object.keys(this.svg).length != 0)
			throw "Svg option url is required";
		
		this.loadSVG(this.svg);
	}

	loadSVG(url) {
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			
			let text = await response.text();
			let parser = new DOMParser();
			let svg = parser.parseFromString(text, "image/svg+xml").documentElement;


			this.svgElement = document.createElement('svg');
			this.svgElement.classList.add('openlime-svglayer');
		})().catch(e => { console.log(e); this.status = e; });
	}

	draw(overlay, transform, viewport) {
		if(!this.appended && this.visible) {
			overlay.appendChild(this.svgElement);
			this.appended = true;
		} else if(this.appended && !this.visible) {
			overlay.removeChild(this.svgElement);
			this.appended = false;
		}
	}
}

Layer.prototype.types['svg'] = (options) => { return new LayerSVG(options); }

export { LayerSVG }
