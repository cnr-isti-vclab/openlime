import { Util } from './Util'
import { Layer } from './Layer'
import { Annotation } from './Annotation'
import { LayerAnnotation } from './LayerAnnotation'

/**
 * Elements to classify the annotations.
 * @typedef {Object} AnnotationClass
 * @property {color} stroke The CSS color of a line, text or outline SVG element.
 * @property {string} label The class name.
 */
/**
 * Annotation classes.
 * @typedef {Object.<string, AnnotationClass>} AnnotationClasses
 */


/**
 * An annotation layer that draws SVG elements directly on the canvas (outside the WebGL context).
 * 
 * Here you will find a tutorial to learn how to build a client-server architecture to manage annotations in OpenLIME. //FIXME
 * 
 * Extends {@link LayerAnnotation}.
 */
class LayerSvgAnnotation extends LayerAnnotation {
	/**
	 * Instantiates a LayerSvgAnnotation object.
	 * @param {Object} [options] An object literal with options that inherits from {@link LayerAnnotation}.
 	 * @param {AnnotationClasses} options.classes An object literal definying colors and labels of the annotation classes.
 	 * @param {Function} options.onClick The callback to fire when the an annotation is clicked on the canvas. The callback is passed an object containing the selected annotation.
	 * @param {bool} options.shadow=true Whether to insert SVG elements in a shadow DOM.
	 */
	constructor(options) {
		options = Object.assign({
			overlayElement: null,   //reference to canvas overlayElement. TODO: check if really needed.
			shadow: true,           //svg attached as shadow node (so style apply only the svg layer)
			svgElement: null, 		//the svg layer
			svgGroup: null,
			onClick: null,			//callback function
			classes: {
				'': { style: { stroke: '#000' }, label: '' },
			},
			annotationUpdate: null
		}, options);
		super(options);
		for(const [key, value] of Object.entries(this.classes)) {
			this.style += `[data-class=${key}] { ` + Object.entries(value.style).map( g => `${g[0]}: ${g[1]};`).join('\n') + '}';
		}
		//this.createOverlaySVGElement();
		//this.setLayout(this.layout);
	}

	/** @ignore */
	createOverlaySVGElement() { 
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

	/**
	 * Sets a value that indicates whether the layer is visible.
	 * @param {bool} visible The value.
	 */
	setVisible(visible) {
		if (this.svgElement)
			this.svgElement.style.display = visible ? 'block' : 'none';
		super.setVisible(visible);
	}

	/** @ignore */
	clearSelected() {
		if (!this.svgElement) this.createOverlaySVGElement();
		//		return;
		this.svgGroup.querySelectorAll('[data-annotation]').forEach((e) => e.classList.remove('selected'));
		super.clearSelected();
	}

	/**
	 * Selects/deselects an annotation
	 * @param {Annotation} anno The annotation.
	 * @param {bool} on=true Whether to select the annotation.
	 */
	setSelected(anno, on = true) {
		for (let a of this.svgElement.querySelectorAll(`[data-annotation="${anno.id}"]`))
			a.classList.toggle('selected', on);

		super.setSelected(anno, on);
	}

	/** @ignore */
	newAnnotation(annotation) {
		let svg = Util.createSVGElement('svg');
		if (!annotation)
			annotation = new Annotation({ element: svg, selector_type: 'SvgSelector' });
		return super.newAnnotation(annotation)
	}

	/** @ignore */
	draw(transform, viewport) {
		if (!this.svgElement)
			return true;
		this.svgElement.setAttribute('viewBox', `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`);

		const svgTransform = this.getSvgGroupTransform(transform);
		this.svgGroup.setAttribute("transform",	svgTransform);
		return true;
	}

	/**
	 * Return the string containing the transform for drawing the svg group in the proper position
	 * @param {Transform} transform current transform parameter of the draw function
	 * @param {bool} inverse when its false return the transform needed to draw the svgGroup
	 * @returns string with svgroup transform 
	 */
	getSvgGroupTransform(transform, inverse=false) {
		let t = this.transform.compose(transform);
		let c = this.boundingBox().corner(0);
		return inverse ?
		 `translate(${-c[0]} ${-c[1]})  scale(${1/t.z} ${1/t.z}) rotate(${t.a} 0 0) translate(${-t.x} ${-t.y})` :
		 `translate(${t.x} ${t.y}) rotate(${-t.a} 0 0) scale(${t.z} ${t.z}) translate(${c[0]} ${c[1]})`;
	}

	/** @ignore */
	prefetch(transform) {
		if (!this.svgElement)
			this.createOverlaySVGElement();

		if (!this.visible) return;
		if (this.status != 'ready')
			return;

		if (typeof (this.annotations) == "string") return; //FIXME Is it right? Should we use this.status?

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

			if(this.annotationUpdate)
    				this.annotationUpdate(anno, transform);

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

Layer.prototype.types['svg_annotations'] = (options) => { return new LayerSvgAnnotation(options); }

export { LayerSvgAnnotation }

