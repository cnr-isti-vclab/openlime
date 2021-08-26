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
			selected: new Set,
			annotationsListEntry: null,

			svgElement: null, //the svg layer
			svgGroup: null,
		}, options);
		super(options);

		this.signals = {...this.signals, ...{ 'createAnnotation':[], 'updateAnnotation':[], 'deleteAnnotation':[] } };


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
				return Annotation.fromJsonLd(a);
			return a;
		});
		if(this.annotationsListEntry)
			this.createAnnotationsList();
	}

	annotationsEntry() {
		return this.annotationsListEntry =  {
			html: this.editable? '<a href="#" class="openlime-entry">New annotation...</a>': '',
			list: [], //will be filled later.
			classes: 'openlime-annotations',
			status: () => 'active',
			onclick: this.editable? () => { this.newAnnotation(); } : null,
			oncreate: () => { 
				if(Array.isArray(this.annotations))
					this.createAnnotationsList();
			}
		}
	}

	newAnnotation() {
		let svg = createElement('svg');
		let annotation = new Annotation({ element: svg, selector_type: 'SvgSelector'});
		this.addAnnotation(annotation, true);
		return annotation;
	}

	addAnnotation(annotation, selected = true) {
		this.annotations.push(annotation);
		let html = this.createAnnotationEntry(annotation);
		let template = document.createElement('template');
		template.innerHTML = html.trim();
		
		let list =  this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		list.appendChild(template.content.firstChild);
		this.emit('createAnnotation', annotation);
		this.setSelected(annotation.id);
	}

	
	createAnnotationEntry(a) {
		let title = a.title? a.title : (a.class? a.class : '');
		return `<a href="#" data-annotation="${a.id}" class="openlime-entry">${a.code || a.code} ${title}</a>`;
	}
	createAnnotationEdit(a) {
		//should just fill the template with some stuff<<
	}

	createAnnotationsList() {
		let html ='';
		for(let a of this.annotations) {
			html += this.createAnnotationEntry(a);
		}
		let list =  this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		list.addEventListener('click', (e) =>  { 
			let id = e.srcElement.getAttribute('data-annotation');
			if(id) 
				this.setSelected(id);
		});
		list.innerHTML = html;
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


		//this.svgElement.addEventListener('click', (e) => { console.log('a', e); }, true);
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
	clearSelected() {
		let entry = document.querySelector(`div[data-annotation]`);
		if(this.edited) {
			entry.replaceWith(this.edited);
			this.edited = null;
		}
		this.svgGroup.querySelectorAll('[data-layer]').forEach((e) => e.classList.remove('selected'));
	}
	//set selected class for annotation
	setSelected(id, on = true) {
		this.clearSelected();

		if(on)
			this.selected.add(id);
		else
			this.selected.delete(id);
			
		for(let a of this.svgElement.querySelectorAll(`[id=${id}]`))
			a.classList.toggle('selected', on);

		if(!this.editable)
			return;
		//find corresponding entry
		let anno = this.getAnnotationById(id);
		let entry = document.querySelector(`[data-annotation="${id}"]`);

		let html = `
	<div data-annotation="${id}" class="openlime-annotation-edit">
		<span>Code:</span> <input name="code" type="text" value="${anno.code}">
		<span>Class:</span> <input name="class" type="text" value="${anno.class}">
		<span>Description:</span> <input name="description" type="text" value="${anno.description}">
		<button name="save" type="button">Save</button>
		<button name="edit" type="button">Edit</button>
		<button name="delete" type="button">Delete</button>
	</div>`;


		//this should definitely be a function in some 'utils'.
		let template = document.createElement('template');
		template.innerHTML = html.trim();
		let edit = template.content.firstChild;
		entry.replaceWith(edit);
		this.edited = entry;
		edit.querySelector('button[name="save"]').addEventListener('click', (e) => this.saveAnnotation(edit, anno));
		edit.querySelector('button[name="edit"]').addEventListener('click', (e) => this.editAnnotation(edit, anno));
		edit.querySelector('button[name="delete"]').addEventListener('click', (e) => this.deleteAnnotation(edit, anno));
	}

	saveAnnotation(edit, anno) {
		anno.code = edit.querySelector('[name=code]').value;
		anno.class = edit.querySelector('[name=class]').value;
		anno.description = edit.querySelector('[name=description]').value;
		
		anno.bbox = anno.getBBoxFromElements();
		let serializer = new XMLSerializer();
		anno.selector.value = `<svg xmlns="http://www.w3.org/2000/svg">
			${anno.selector.elements.map((s) => { s.classList.remove('selected'); return serializer.serializeToString(s) }).join("\n")}  
			</svg>`;
		this.emit('updateAnnotation', anno);
	}

	deleteAnnotation(edit, anno) {
		//remove svg elements from the canvas
		for(let e  of this.svgGroup.querySelectorAll('#' + anno.id))
			e.remove();
		//remove entry from the list
		let list =  this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		for(let e of list.querySelectorAll(`[data-annotation="${anno.id}"]`))
			e.remove();
		this.edited = null;

		this.annotations = this.annotations.filter(a => a !== anno);
		this.emit('deleteAnnotation', anno);
	}

	editAnnotation(edit, anno) {
		this.editor.setTool(this, anno, 'line');
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

		//find which annotations needs to be added to the ccanvas, some 
		//indexing whould be used, for the moment we just iterate all of them.

		for(let a of this.annotations) {

			//TODO check for class visibility and bbox culling (or maybe should go to prefetch?)
			if(!a.ready && typeof a.selector.value == 'string') {
				let parser = new DOMParser();
				let element = parser.parseFromString(a.selector.value, "image/svg+xml").documentElement;
				for(let c of element.children)
					a.selector.elements.push(c);
				a.ready = true;

/*				} else if(this.svgXML) {
					a.svgElement = this.svgXML.querySelector(`#${a.id}`);
					if(!a.svgElement)
						throw Error(`Could not find element with id: ${id} in svg`);
				} */
			}

			if(!a.needsUpdate)
				continue;

			for(let e of this.svgGroup.querySelectorAll(`[id="${a.id}"]`))
				e.remove();
			//second time will be 0 elements, but we need to 
			//store somewhere knowledge of which items in the scene and which still not.
			for(let child of a.selector.elements) {
				let c = child; //.cloneNode(true);
				c.setAttribute('id', a.id);
				c.setAttribute('data-layer', this.id);
				c.classList.add('openlime-annotation');
				if(this.selected.has(a.id))
					c.classList.add('selected');
				this.svgGroup.appendChild(c);

					
				//utils

/*				let parser = new DOMParser();
				let use = createElement('use', { 'xlink:href': '#' + a.id,  'stroke-width': 10,  'pointer-events': 'stroke' });
				//let use = parser.parseFromString(`<use xlink:href="${a.id}" stroke-width="10" pointer-events="stroke"/>`, "image/svg+xml");
				this.svgGroup.appendChild(use);  */
			}
			a.needsUpdate = false;
		}
	}
}

function createElement(tag, attributes) {
	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
	if(attributes)
		for(const [key, value] of Object.entries(attributes))
			e.setAttribute(key, value);
	return e;
} 

Layer.prototype.types['annotations'] = (options) => { return new AnnotationLayer(options); }

export { AnnotationLayer } 
