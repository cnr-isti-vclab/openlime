import { BoundingBox } from './BoundingBox.js'

/**
 * Represents an annotation that can be drawn as an overlay on a canvas.
 * An annotation is a decoration (text, graphics element, glyph) that provides
 * additional information for interpreting underlying drawings.
 * Each annotation has a unique identifier and can contain various properties
 * such as description, category, drawing style, labels, etc.
 * 
 */
class Annotation {
	/**
		* Creates a new Annotation instance.
		* @param {Object} [options] - Configuration options for the annotation.
		* @param {string} [options.id] - Unique identifier for the annotation. If not provided, a UUID will be generated.
		* @param {string} [options.code] - A code identifier for the annotation.
		* @param {string} [options.label=''] - Display label for the annotation.
		* @param {string} [options.description] - HTML text containing a comprehensive description.
		* @param {string} [options.class] - Category or classification of the annotation.
		* @param {string} [options.target] - Target element or area this annotation refers to.
		* @param {string} [options.svg] - SVG content for the annotation.
		* @param {Object} [options.image] - Image data associated with the annotation.
		* @param {Object} [options.region] - Region coordinates {x, y, w, h} for the annotation.
		* @param {Object} [options.data={}] - Additional custom data for the annotation.
		* @param {Object} [options.style] - Style configuration for rendering.
		* @param {BoundingBox} [options.bbox] - Bounding box of the annotation.
		* @param {boolean} [options.visible=true] - Visibility state of the annotation.
		* @param {Object} [options.state] - State variables for the annotation.
		* @param {boolean} [options.ready=false] - Indicates if SVG conversion is complete.
		* @param {boolean} [options.needsUpdate=true] - Indicates if annotation needs updating.
		* @param {boolean} [options.editing=false] - Indicates if annotation is being edited.
		* @class
		*/
	constructor(options) {
		Object.assign(
			this,
			{
				id: Annotation.UUID(),
				code: null,
				label: null,
				description: null,
				class: null,
				target: null,
				svg: null,
				image: null,
				region: null,
				data: {},
				style: null,
				bbox: null,
				visible: true,
				state: null,
				ready: false, //already: converted to svg
				needsUpdate: true,
				editing: false,
			},
			options);
		//TODO label as null is problematic, sort this issue.
		if (!this.label) this.label = '';
		this.elements = []; //assign options is not recursive!!!
	}

	/**
		* Generates a UUID (Universally Unique Identifier) for annotation instances.
		* @returns {string} A newly generated UUID.
		* @private
		*/
	static UUID() {
		return 'axxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	/**
	 * Calculates and returns the bounding box of the annotation based on its elements or region.
	 * The coordinates are always relative to the top-left corner of the canvas.
	 * @returns {BoundingBox} The calculated bounding box of the annotation.
	 * If the annotation has no elements and no region, returns an empty bounding box.
	 * If the annotation has a region but no elements, returns a bounding box based on the region.
	 * If the annotation has elements, calculates the bounding box that encompasses all elements.
	 */
	getBBoxFromElements() {
		let box = null;
		if (!this.elements.length) {
			if (this.region == null) {
				box = new BoundingBox();
			} else {
				const r = this.region;
				box = new BoundingBox({ xLow: r.x, yLow: r.y, xHigh: r.x + r.w, yHigh: r.y + r.h });
			}
		} else {
			let { x, y, width, height } = this.elements[0].getBBox();
			for (let shape of this.elements) {
				const { sx, sy, swidth, sheight } = shape.getBBox();
				x = Math.min(x, sx);
				y = Math.min(x, sy);
				width = Math.max(width + x, sx + swidth) - x;
				height = Math.max(height + y, sy + sheight) - y;
			}
			box = new BoundingBox({ xLow: x, yLow: y, xHigh: x + width, yHigh: y + width });
		}
		return box;
	}

	/////////////////////////////////
	/**
	 * Creates an Annotation instance from a JSON-LD format string.
	 * @param {Object} entry - The JSON-LD object representing an annotation.
	 * @returns {Annotation} A new Annotation instance.
	 * @throws {Error} If the entry is not a valid JSON-LD annotation or contains unsupported selectors.
	 */
	static fromJsonLd(entry) {
		if (entry.type != 'Annotation')
			throw "Not a jsonld annotation.";
		let options = { id: entry.id };

		let rename = { 'identifying': 'code', 'identifying': 'label', 'describing': 'description', 'classifying': 'class' };
		for (let item of entry.body) {
			let field = rename[item.purpose];
			if (field)
				options[field] = item.value;
		}
		let selector = entry.target && entry.target.selector;
		if (selector) {
			switch (selector.type) {
				case 'SvgSelector':
					options.svg = selector.value;
					options.elements = [];
					break;
				default:
					throw "Unsupported selector: " + selector.type;
			}
		}
		return new Annotation(options);
	}

	/**
	* Converts the annotation to a JSON-LD format object.
 	* @returns {Object} A JSON-LD representation of the annotation including context, 
	* id, type, body (with code, class, and description), and target selector information.
 	*/
	toJsonLd() {
		let body = [];
		if (this.code !== null)
			body.push({ type: 'TextualBody', value: this.code, purpose: 'indentifying' });
		if (this.class !== null)
			body.push({ type: 'TextualBody', value: this.class, purpose: 'classifying' });
		if (this.description !== null)
			body.push({ type: 'TextualBody', value: this.description, purpose: 'describing' });

		let obj = {
			"@context": "http://www.w3.org/ns/anno.jsonld",
			id: this.id,
			type: "Annotation",
			body: body,
			target: { selector: {} }
		}
		if (this.target)
			target.selector.source = this.target;


		if (this.element) {
			var s = new XMLSerializer();
			obj.target.selector.type = 'SvgSelector';
			obj.target.selector.value = s.serializeToString(this.element);
		}
	}
}

export { Annotation }