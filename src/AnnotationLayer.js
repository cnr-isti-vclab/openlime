import { Annotation } from './Annotation.js';
import { BoundingBox } from './BoundingBox.js';
import { Layer } from './Layer.js'

/**
 * SVG or OpenGL polygons/lines/points annotation layer
 * @param {object} options
 * * *svgURL*: url for the svg containing the annotations
 * * *svgXML*: svg string containing the annotatiosn
 * * *geometry*: TODO: should contain the areas/lines/points for OpenGL rendering
 * * *style*: css style for the annotation elements (shadow dom allows css to apply only to this layer)
 * * *annotations*: collection of annotations info: each annotations is id: { label, svg (optional), data (custom data) (TODO)
 */


class AnnotationLayer extends Layer {
	constructor(options) {
		options = Object.assign({
			viewBox: null,
			svgURL: null,
			svgXML: null, 
			geometry: null,
			style: null,
			annotations: {},
			overlayElement: null,
			shadow: true,
			hoverable: false, //display info about annotation on mousehover.
		}, options);
		super(options);


		if(typeof(this.viewBox) == "string") {
			this.viewBox = this.viewBox.split(' '); 
		}
		if (Array.isArray(this.viewBox)) {
			let box = new BoundingBox(); 
			box.fromArray(this.viewBox);
			this.viewBox = box;
		}


		(async () => {
			if(typeof(this.annotations) == "string") { //assume it is an URL
				await this.loadAnnotations(this.annotations);
			}
			if(this.svgURL)
				await this.loadSVG(this.svgURL);
			
			this.createSVGElement();

			this.status = 'ready';
			this.emit('update');

		})()/*.catch(e => { 
			console.log(e); 
			this.status = e; 
		});*/
	}
	async loadAnnotations(url) {
		var response = await fetch(url);
		if(!response.ok) {
			this.status = "Failed loading " + this.url + ": " + response.statusText;
			return;
		}
		this.annotations = await response.json();
		this.annotations = this.annotations.map(a => {
			if('@context' in a) 
				return Annotation.fromJsonld(a);
			return a;
		});
	}
	getAnnotationById(id) {
		for(const anno of this.annotations)
			if(anno.id == id)
				return anno;
		return null;
	}

	async loadSVG(url) {
		var response = await fetch(url);
		if(!response.ok) {
			this.status = "Failed loading " + this.url + ": " + response.statusText;
			return;
		}
		let text = await response.text();
		let parser = new DOMParser();
		this.svgXML = parser.parseFromString(text, "image/svg+xml").documentElement;
		throw "if viewbox is set in svgURL should it overwrite options.viewbox or viceversa?"
	}

	createSVGElement() {
		this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.svgElement.classList.add('openlime-svgoverlay');
		this.svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		this.svgElement.append(this.svgGroup);
		this.svgElement.setAttribute('viewBox', this.viewBox.toString()); // box is currently a string of numbers

		let root = this.overlayElement;
		if(this.shadow)
			root = this.overlayElement.attachShadow( { mode: "open" });

		if(this.style) {
			const style = document.createElement('style');
			style.textContent = this.style;
			root.append(style);
		}
		root.appendChild(this.svgElement);


		this.svgElement.addEventListener('click', (e) => { console.log('a', e); }, true);
	}

	boundingBox() {
		return this.viewBox;
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
		let c = this.viewBox.center();
		this.svgGroup.setAttribute("transform", 
			`translate(${t.x} ${t.y}) rotate(${-t.a} 0 0) scale(${t.z} ${t.z}) translate(${-c[0]} ${-c[1]})`); 
		return true;
	}

	prefetch(transform) {
		if(!this.visible) return;
		if(!this.svgElement) return;

		for(let a of this.annotations) {			
			//TODO check for class visibility and bbox culling (or maybe should go to prefetch?)
			if(typeof a.element == 'string') {
				let parser = new DOMParser();
				a.element = parser.parseFromString(a.element, "image/svg+xml").documentElement;


/*				} else if(this.svgXML) {
					a.svgElement = this.svgXML.querySelector(`#${a.id}`);
					if(!a.svgElement)
						throw Error(`Could not find element with id: ${id} in svg`);
				} */
			}

			if(a.element instanceof SVGElement) {
				//second time will be 0 elements, but we need to 
				//store somewhere knowledge of which items in the scene and which still not.
				for(let child of a.element.children) {
					child.setAttribute('id', a.id);
					child.setAttribute('data-layer', this.id);
					this.svgGroup.appendChild(child);

					/*
					//utils
function createElement(tag, attributes) {
	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
	if(attributes)
		for(const [key, value] of Object.entries(attributes))
			e.setAttribute(key, value);
	return e;
}

					let parser = new DOMParser();
					let use = createElement('use', { 'xlink:href': '#' + a.id,  'stroke-width': 10,  'pointer-events': 'stroke' });
					//let use = parser.parseFromString(`<use xlink:href="${a.id}" stroke-width="10" pointer-events="stroke"/>`, "image/svg+xml");
					this.svgGroup.appendChild(use); */
				}
			}
		}
	}
}

Layer.prototype.types['annotations'] = (options) => { return new AnnotationLayer(options); }

export { AnnotationLayer } 
