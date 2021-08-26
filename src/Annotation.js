/** coordinates for annotations are relative to the top left corner!!!!
 */

class Annotation {
	constructor(options) {
		Object.assign(
			this, 
			{
				id: Annotation.UUID(),
				code: null,
				description: null,
				class: null,
				target: null,
				selector: { type: null, value: null, elements: [] }, //svg element (could be a group... a circle a path.)
				data: {},
				style: null,
				bbox: null,

				ready: false, //already: convertted to svg
				needsUpdate: true,
			}, 
			options);
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
				const { sx, sy, swidth, sheight } = shape.getBBox();
				x = Math.min(x, sx);
				y = Math.min(x, sy);
				width = Math.max(width + x, sx + swidth) - x; 
				height = Math.max(height + y, sy + sheight) - y; 
		}
		return { x, y, width, height };
	}

	static fromJsonLd(entry) {
		if(entry.type != 'Annotation')
			throw "Not a jsonld annotation.";
		let options = {id: entry.id};

		let rename = { 'identifying': 'code', 'describing': 'description', 'classifying':'class' };
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