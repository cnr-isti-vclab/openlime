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
				data: {},
				element: null, //svg element (could be a group... a circle a path.)
				bbox: null,
				style: null,
			}, 
			options);
	}

	static UUID() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	static fromJsonld(entry) {
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
				options.element = selector.value;
				break;
			default:
				throw "Unsupported selector: " + selector.type;
			}
		}
		return new Annotation(options);
	}
	toJsonld() {
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
			target.selector.type = SvgSelector;
			target.selector.value = s.serializeToString(this.element);
		}
	}
}

export { Annotation }