import { Layer } from './Layer.js';
import { Annotation } from './Annotation.js';
import { LayerAnnotation } from './LayerAnnotation.js';


/**
 * SVG or OpenGL polygons/lines/points annotation layer
 * @param {object} options
 * * *svgURL*: url for the svg containing the annotations
 * * *svgXML*: svg string containing the annotatiosn
 * * *style*: css style for the annotation elements (shadow dom allows css to apply only to this layer)
 */

class LayerSvgAnnotation extends LayerAnnotation {

	constructor(options) {
		options = Object.assign({
			svgURL: null,
			svgXML: null,
			overlayElement: null,    //reference to canvas overlayElement. TODO: check if really needed.
			shadow: true,            //svg attached as shadow node (so style apply
			svgElement: null, //the svg layer
			svgGroup: null,
			classes: {
				'': { stroke: '#000', label: '' },
			}
		}, options);
		super(options);
		this.style += Object.entries(this.classes).map((g) => `[data-class=${g[0]}] { stroke:${g[1].stroke}; }`).join('\n');
		//this.createSVGElement();
		//this.setLayout(this.layout);
	}

	createSVGElement() {
		this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.svgElement.classList.add('openlime-svgoverlay');
		this.svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		this.svgElement.append(this.svgGroup);

		let root = this.overlayElement;
		if (this.shadow)
			root = this.overlayElement.attachShadow({ mode: "open" });

		if (this.style) {
			const style = document.createElement('style');
			style.textContent = this.style;
			root.append(style);
		}
		root.appendChild(this.svgElement);
	}
	/*  unused for the moment!!! 
		async loadSVG(url) {
			var response = await fetch(url);
			if (!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let text = await response.text();
			let parser = new DOMParser();
			this.svgXML = parser.parseFromString(text, "image/svg+xml").documentElement;
			throw "if viewbox is set in svgURL should it overwrite options.viewbox or viceversa?"
		}
	*/

	setVisible(visible) {
		if (this.svgElement)
			this.svgElement.style.display = visible ? 'block' : 'none';
		super.setVisible(visible);
	}

	clearSelected() {
		if (!this.svgElement) this.createSVGElement();
		//		return;
		this.svgGroup.querySelectorAll('[data-annotation]').forEach((e) => e.classList.remove('selected'));
		super.clearSelected();
	}

	setSelected(anno, on = true) {
		for (let a of this.svgElement.querySelectorAll(`[data-annotation="${anno.id}"]`))
			a.classList.toggle('selected', on);

		super.setSelected(anno, on);
	}


	newAnnotation(annotation, selected = true) {
		let svg = createElement('svg');
		if (!annotation)
			annotation = new Annotation({ element: svg, selector_type: 'SvgSelector' });
		return super.newAnnotation(annotation, selected)
	}

	draw(transform, viewport) {
		if (!this.svgElement)
			return true;
		let t = this.transform.compose(transform);
		this.svgElement.setAttribute('viewBox', `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`);
		let c = this.boundingBox().corner(0);
		this.svgGroup.setAttribute("transform",
			`translate(${t.x} ${t.y}) rotate(${-t.a} 0 0) scale(${t.z} ${t.z}) translate(${c[0]} ${c[1]})`);
		return true;
	}

	prefetch(transform) {
		if (!this.svgElement)
			this.createSVGElement();

		if (!this.visible) return;
		if (this.status != 'ready')
			return;

		const bBox = this.boundingBox();
		this.svgElement.setAttribute('viewBox', `${bBox.xLow} ${bBox.yLow} ${bBox.xHigh - bBox.xLow} ${bBox.yHigh - bBox.yLow}`);

		//find which annotations needs to be added to the ccanvas, some 
		//indexing whould be used, for the moment we just iterate all of them.

		for (let anno of this.annotations) {

			//TODO check for class visibility and bbox culling (or maybe should go to prefetch?)
			if (!anno.ready && typeof anno.svg == 'string') {
				let parser = new DOMParser();
				let element = parser.parseFromString(anno.svg, "image/svg+xml").documentElement;
				anno.elements = [...element.children]
				anno.ready = true;

				/*				} else if(this.svgXML) {
									a.svgElement = this.svgXML.querySelector(`#${a.id}`);
									if(!a.svgElement)
										throw Error(`Could not find element with id: ${id} in svg`);
								} */
			}

			if (!anno.needsUpdate)
				continue;

			anno.needsUpdate = false;

			for (let e of this.svgGroup.querySelectorAll(`[data-annotation="${anno.id}"]`))
				e.remove();

			if (!anno.visible)
				continue;

			//second time will be 0 elements, but we need to 
			//store somewhere knowledge of which items in the scene and which still not.
			for (let child of anno.elements) {
				let c = child; //.cloneNode(true);
				c.setAttribute('data-annotation', anno.id);
				c.setAttribute('data-class', anno.class);

				//c.setAttribute('data-layer', this.id);
				c.classList.add('openlime-annotation');
				if (this.selected.has(anno.id))
					c.classList.add('selected');
				this.svgGroup.appendChild(c);
				c.onpointerdown = (e) => {
					if (e.button == 0) {
						e.preventDefault();
						e.stopPropagation();
						if (this.onClick && this.onClick(anno))
							return;
						if (this.selected.has(anno.id))
							return;
						this.clearSelected();
						this.setSelected(anno, true);
					}
				}


				//utils

				/*				let parser = new DOMParser();
								let use = createElement('use', { 'xlink:href': '#' + a.id,  'stroke-width': 10,  'pointer-events': 'stroke' });
								//let use = parser.parseFromString(`<use xlink:href="${a.id}" stroke-width="10" pointer-events="stroke"/>`, "image/svg+xml");
								this.svgGroup.appendChild(use);  */
			}
		}
	}
}

function createElement(tag, attributes) {
	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
	if (attributes)
		for (const [key, value] of Object.entries(attributes))
			e.setAttribute(key, value);
	return e;
}

Layer.prototype.types['svg_annotations'] = (options) => { return new LayerSvgAnnotation(options); }

export { LayerSvgAnnotation }

