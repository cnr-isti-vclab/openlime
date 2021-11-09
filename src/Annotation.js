/** coordinates for annotations are relative to the top left corner!!!!
 */

class Annotation {
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
				selector: { 
					type: null, 
					value: null, 
					elements: []  //svg elements (referencing those in the layer.svgElement
				}, 
				data: {},
				style: null,
				bbox: null,
				visible: true,

				ready: false, //already: convertted to svg
				needsUpdate: true,
				editing: false,
			}, 
			options);
			//TODO label as null is problematic, sort this issue.
			if(!this.label) this.label = ''; 
			this.selector.elements = []; //assign options is not recursive!!!
	}

	static UUID() {
		return 'axxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	getBBoxFromElements() {
		let box = { x: 0, y: 0, width: 0, height: 0 }
		if(!this.selector.elements.length)
			return box;
		let { x, y, width, height } = this.selector.elements[0].getBBox();
		for(let shape of this.selector.elements) {
			let b = shape.getBBox();
			x = Math.min(x, b.x);
			y = Math.min(x, b.y);
			width = Math.max(width + x, b.x + b.width) - x; 
			height = Math.max(height + y, b.y + b.height) - y; 
		}
		return { x: Math.floor(x), y: Math.floor(y), width: Math.floor(width), height: Math.floor(height) };
	}

	static fromJsonLd(entry) {
		if(entry.type != 'Annotation')
			throw "Not a jsonld annotation.";
		let options = {id: entry.id};

		let rename = { 'identifying': 'code', 'identifying': 'label', 'describing': 'description', 'classifying':'class' };
		for(let item of entry.body) {
			let field = rename[item.purpose];
			if(field)
				options[field] = item.value;
		}
		let selector = entry.target && entry.target.selector;
		if(selector) {
			switch(selector.type) {
			case 'SvgSelector':
				options.selector = { type: 'svg', value: selector.value, elements:[] }
				break;
			default:
				throw "Unsupported selector: " + selector.type;
			}
		}
		return new Annotation(options);
	}
	toJsonLd() {
		let body = [];
		if(this.code !== null)
			body.push( { type: 'TextualBody', value: this.code, purpose: 'indentifying' });
		if(this.class !== null)
			body.push( { type: 'TextualBody', value: this.class, purpose: 'classifying' });
		if(this.description !== null)
			body.push( { type: 'TextualBody', value: this.description, purpose: 'describing' });

		let obj = {
			"@context": "http://www.w3.org/ns/anno.jsonld",
			id: this.id,
			type: "Annotation",
			body: body,
			target: { selector: {} }
		}
		if(this.target)
			target.selector.source = this.target;


		if(this.element) {
			var s = new XMLSerializer();
			obj.target.selector.type = 'SvgSelector';
			obj.target.selector.value = s.serializeToString(this.element);
		}
	}
}

export { Annotation }