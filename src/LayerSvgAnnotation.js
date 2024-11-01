import { Util } from './Util'
import { Layer } from './Layer'
import { Annotation } from './Annotation'
import { LayerAnnotation } from './LayerAnnotation'
import { CoordinateSystem } from './CoordinateSystem';

/**
* @typedef {Object} AnnotationClass
* @property {string} stroke - CSS color for SVG elements (lines, text, outlines)
* @property {string} label - Display name for the class
*/

/**
* @typedef {Object.<string, AnnotationClass>} AnnotationClasses
* @description Map of class names to their visual properties
*/

/**
* @typedef {Object} LayerSvgAnnotationOptions
* @property {AnnotationClasses} classes - Annotation class definitions with styles
* @property {Function} [onClick] - Callback for annotation click events (param: selected annotation)
* @property {boolean} [shadow=true] - Whether to use Shadow DOM for SVG elements
* @property {HTMLElement} [overlayElement] - Container for SVG overlay
* @property {string} [style] - Additional CSS styles for annotations
* @property {Function} [annotationUpdate] - Custom update function for annotations
* @extends LayerAnnotationOptions
*/

/**
* LayerSvgAnnotation provides SVG-based annotation capabilities in OpenLIME.
* It renders SVG elements directly on the canvas overlay, outside the WebGL context,
* enabling rich vector graphics annotations with interactive features.
* 
* Features:
* - SVG-based vector annotations
* - Custom styling per annotation class
* - Interactive selection
* - Shadow DOM isolation
* - Dynamic SVG transformation
* - Event handling
* - Custom update callbacks
* 
* Technical Details:
* - Uses SVG overlay for rendering
* - Handles coordinate system transformations
* - Manages DOM element lifecycle
* - Supports custom class styling
* - Implements visibility management
* - Provides selection mechanisms
* 
* @extends LayerAnnotation
* 
* @example
* ```javascript
* // Create SVG annotation layer with custom classes
* const annotationLayer = new OpenLIME.Layer({
*   type: 'svg_annotations',
*   classes: {
*     'highlight': { stroke: '#ff0', label: 'Highlight' },
*     'comment': { stroke: '#0f0', label: 'Comment' }
*   },
*   onClick: (annotation) => {
*     console.log('Clicked:', annotation.label);
*   },
*   shadow: true
* });
* 
* // Add to viewer
* viewer.addLayer('annotations', annotationLayer);
* ```
*/
class LayerSvgAnnotation extends LayerAnnotation {
	/**
	 * Creates a new LayerSvgAnnotation instance
	 * @param {LayerSvgAnnotationOptions} [options] - Configuration options
	 */
	constructor(options) {
		options = Object.assign({
			overlayElement: null,   //reference to canvas overlayElement. TODO: check if really needed.
			shadow: true,           //svg attached as shadow node (so style apply only the svg layer)
			svgElement: null, 		//the svg layer
			svgGroup: null,
			onClick: null,			//callback function
			classes: {
				'': { stroke: '#000', label: '' },
			},
			annotationUpdate: null
		}, options);
		super(options);
		for (const [key, value] of Object.entries(this.classes)) {
			this.style += `[data-class=${key}] { ` + Object.entries(value).map(g => `${g[0]}: ${g[1]};`).join('\n') + '}';
		}

		this.style += `.openlime-svgoverlay { position:absolute; top:0px; left:0px;}`;

		//this.createOverlaySVGElement();
		//this.setLayout(this.layout);
	}

	/**
	 * Creates the SVG overlay element and initializes the shadow DOM if enabled
	 * @private
	 */
	createOverlaySVGElement() {
		this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.svgElement.classList.add('openlime-svgoverlay');
		this.svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		this.svgElement.append(this.svgGroup);

		// Check if the shadow root already exists before attaching
		let root = this.overlayElement;
		if (this.shadow) {
			if (!this.overlayElement.shadowRoot) {
				root = this.overlayElement.attachShadow({ mode: "open" });
			} else {
				root = this.overlayElement.shadowRoot; // Use existing shadow root
			}
		}

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
	 * Sets visibility of the annotation layer
	 * Updates both SVG display and underlying layer visibility
	 * @param {boolean} visible - Whether layer should be visible
	 * @override
	 */
	setVisible(visible) {
		if (this.svgElement)
			this.svgElement.style.display = visible ? 'block' : 'none';
		super.setVisible(visible);
	}

	/**
	 * Clears all annotation selections
	 */
	clearSelected() {
		if (!this.svgElement) this.createOverlaySVGElement();
		//		return;
		this.svgGroup.querySelectorAll('[data-annotation]').forEach((e) => e.classList.remove('selected'));
		super.clearSelected();
	}

	/**
	 * Sets selection state of an annotation
	 * @param {Annotation} anno - The annotation to select/deselect
	 * @param {boolean} [on=true] - Whether to select (true) or deselect (false)
	 */
	setSelected(anno, on = true) {
		for (let a of this.svgElement.querySelectorAll(`[data-annotation="${anno.id}"]`))
			a.classList.toggle('selected', on);

		super.setSelected(anno, on);
	}

	/**
	 * Creates a new SVG annotation
	 * @param {Annotation} [annotation] - Optional existing annotation to use
	 * @returns {Annotation} The created annotation
	 * @private
	 */
	newAnnotation(annotation) {
		let svg = Util.createSVGElement('svg');
		if (!annotation)
			annotation = new Annotation({ element: svg, selector_type: 'SvgSelector' });
		return super.newAnnotation(annotation)
	}

	/**
	 * Renders the SVG annotations
	 * Updates SVG viewBox and transformation to match current view
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @returns {boolean} Whether render completed successfully
	 * @override
	 */
	draw(transform, viewport) {
		if (!this.svgElement)
			return true;
		this.svgElement.setAttribute('viewBox', `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`);

		const svgTransform = this.getSvgGroupTransform(transform);
		this.svgGroup.setAttribute("transform", svgTransform);
		return true;
	}

	/**
	 * Calculates SVG group transform string
	 * @param {Transform} transform - Current view transform
	 * @param {boolean} [inverse=false] - Whether to return inverse transform
	 * @returns {string} SVG transform attribute value
	 */
	getSvgGroupTransform(transform, inverse = false) {
		let t = this.transform.compose(transform);
		let c = this.boundingBox().corner(0);
		// FIXME CHECK IT: Convert from GL to SVG, but without any scaling. It just needs to reflect around 0,
		t = CoordinateSystem.reflectY(t);
		return inverse ?
			`translate(${-c.x} ${-c.y})  scale(${1 / t.z} ${1 / t.z}) rotate(${t.a} 0 0) translate(${-t.x} ${-t.y})` :
			`translate(${t.x} ${t.y}) rotate(${-t.a} 0 0) scale(${t.z} ${t.z}) translate(${c.x} ${c.y})`;
	}

	/**
	 * Prepares annotations for rendering
	 * Handles SVG element creation and updates
	 * @param {Transform} transform - Current view transform
	 * @private
	 */
	prefetch(transform) {
		if (!this.svgElement)
			this.createOverlaySVGElement();

		if (!this.visible) return;
		if (this.status != 'ready')
			return;

		if (typeof (this.annotations) == "string") return; //FIXME Is it right? Should we use this.status?

		const bBox = this.boundingBox();
		//this.svgElement.setAttribute('viewBox', `${bBox.xLow} ${bBox.yLow} ${bBox.xHigh - bBox.xLow} ${bBox.yHigh - bBox.yLow}`);

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

			if (this.annotationUpdate)
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
			}
		}
	}
}

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['svg_annotations'] = (options) => { return new LayerSvgAnnotation(options); }

export { LayerSvgAnnotation }

