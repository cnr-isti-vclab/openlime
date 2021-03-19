import { BoundingBox } from './BoundingBox.js';
import { Layer } from './Layer.js'

class AnnotationLayer extends Layer {
	constructor(options) {
		options = Object.assign({
			viewBox: null,
			svgURL: null,
			svgXML: null, 
			geometry: null,
			style: null,
			annotations: {},
			overlayElement: null
		}, options);
		super(options);

		if(this.svgURL)
			this.loadSVG(this.svgURL);
	}

	loadSVG(url) {
		(async () => {
			var response = await fetch(url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			
			let text = await response.text();
			let parser = new DOMParser();
			this.svgXML = parser.parseFromString(text, "image/svg+xml").documentElement;


			this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			this.svgElement.classList.add('openlime-svgoverlay');
			this.svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			this.svgElement.append(this.svgGroup);
			this.svgElement.setAttribute('viewBox', this.viewBox); // box is currently a string of numbers
			// this.viewBox = this.viewBox.split(' ');
			this.viewBox = new BoundingBox(); // convert to bbox object
			this.viewBox.fromArray(options.box.split(' '));

			let root = this.overlayElement.attachShadow( { mode: "open" });

			if(this.style) {
				const style = document.createElement('style');
				style.textContent = this.style;
				root.append(style);
			}
			root.appendChild(this.svgElement);
			this.status = 'ready';
			this.emit('update');
		})().catch(e => { console.log(e); this.status = e; });
	}

	boundingBox() {
		return [-this.viewBox[2]/2, -this.viewBox[3]/2, this.viewBox[2]/2, this.viewBox[3]/2];
	}

	setVisible(visible) {
		if(this.svgElement) {
			this.svgElement.style.display = visible? 'block' : 'none';
		}
		super.setVisible(visible);
	}

	draw(transform, viewport) {
		if(!this.svgElement)
			return;

		let t =  this.transform.compose(transform);
		this.svgElement.setAttribute('viewBox', `${-viewport.w/2} ${-viewport.h/2} ${viewport.w} ${viewport.h}`);
		this.svgGroup.setAttribute("transform", 
			`translate(${t.x} ${t.y}) rotate(${-t.a} 0 0) scale(${t.z} ${t.z}) translate(${ -this.viewBox[2]/2.0} ${-this.viewBox[3]/2.0})`); 


		return true;
	}

	prefetch(transform) {
		if(!this.visible) return;

		for(let [id, a] of Object.entries(this.annotations)) {
			//TODO check for class visibility and bbox culling (or maybe should go to prefetch?)
			if(!a.svgElement) {
				if(a.svg) {
					let parser = new DOMParser();
					a.svgElement = parser.parseFromString(a.svg, "image/svg+xml").documentElement;
				} else if(this.svgXML) {
					a.svgElement = this.svgXML.querySelector(`#${id}`);
					if(!a.svgElement)
						throw Error(`Could not find element with id: ${id} in svg`);
				}
			}
			if(a.svgElement)
				this.svgGroup.appendChild(a.svgElement);
		}
	}
	
}

Layer.prototype.types['annotations'] = (options) => { return new AnnotationLayer(options); }

export { AnnotationLayer } 
