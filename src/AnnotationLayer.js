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
			viewBox: null,   //usually defined by Layout, TODO: should we use layout for multiresolution annotations?
			// geometry: null,  //unused, might want to store here the quads/shapes for opengl rendering
			style: null,    //straightforward for svg annotations, to be defined oro opengl rendering
			annotations: [],
			hoverable: false, //display info about annotation on mousehover.
			selected: new Set,
			annotationsListEntry: null, //TODO: horrible name for the interface list of annotations
		}, options);
		super(options);

		this.signals.selected = [];

		if(typeof(this.viewBox) == "string") {
			this.viewBox = this.viewBox.split(' '); 
		}
		if (Array.isArray(this.viewBox)) {
			let box = new BoundingBox(); 
			box.fromArray(this.viewBox);
			this.viewBox = box;
		}

		if (typeof (this.annotations) == "string") { //assumes it is an URL
			(async () => { await this.loadAnnotations(this.annotations); })();
		}
	}

	async loadAnnotations(url) {
		var response = await fetch(url);
		if(!response.ok) {
			this.status = "Failed loading " + this.url + ": " + response.statusText;
			return;
		}
		this.annotations = await response.json();
		if(this.annotations.status == 'error') {
			alert("Failed to load annotations: " + this.annotations.msg);
			return;
		}
		this.annotations = this.annotations.map(a => '@context' in a ? Annotation.fromJsonLd(a): a);
		console.log(this.annotations);
		if(this.annotationsListEntry)
			this.createAnnotationsList();
		
		this.status = 'ready';
		this.emit('update');
	}


	newAnnotation(annotation, selected = true) {
		if(!annotation)
			annotation = new Annotation();

		this.annotations.push(annotation);
		let html = this.createAnnotationEntry(annotation);
		let template = document.createElement('template');
		template.innerHTML = html.trim();
		
		let list =  this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		list.appendChild(template.content.firstChild);
		
		this.clearSelected();
		this.setSelected(annotation);

		return annotation;
	}


	annotationsEntry() {
		return this.annotationsListEntry =  {
			html: '',
			list: [], //will be filled later.
			classes: 'openlime-annotations',
			status: () => 'active',
			oncreate: () => { 
				if(Array.isArray(this.annotations))
					this.createAnnotationsList();
			}
		}
	}

	createAnnotationsList() {
		let html ='';
		for(let a of this.annotations) {
			html += this.createAnnotationEntry(a);
		}

		let list =  this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		list.innerHTML = html;
		list.addEventListener('click', (e) =>  { 
			let svg = e.srcElement.closest('svg');
			if(svg) {
				let entry = svg.closest('[data-annotation]')
				entry.classList.toggle('hidden');
				let id = entry.getAttribute('data-annotation');
				let anno = this.getAnnotationById(id);
				anno.visible = !anno.visible;
				anno.needsUpdate = true;
				this.emit('update');
			}

			let id = e.srcElement.getAttribute('data-annotation');
			if(id) {
				this.clearSelected();
				let anno = this.getAnnotationById(id);
				this.setSelected(anno, true);
			}
		});
	}

	createAnnotationEntry(a) {
		return `<a href="#" data-annotation="${a.id}" class="openlime-entry">${a.title || ''}
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="openlime-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="openlime-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
			</a>`;
	}

	getAnnotationById(id) {
		for(const anno of this.annotations)
			if(anno.id == id)
				return anno;
		return null;
	}

	boundingBox() {
		return this.viewBox;
	}

	clearSelected() {
		this.annotationsListEntry.element.parentElement.querySelectorAll(`[data-annotation]`).forEach((e) => e.classList.remove('selected'));
		this.selected.clear();
	}
	//set selected class for annotation
	setSelected(anno, on = true) {
		this.annotationsListEntry.element.parentElement.querySelector(`[data-annotation="${anno.id}"]`).classList.toggle('selected', on);
		if(on)
			this.selected.add(anno.id);
		else
			this.selected.delete(anno.id);
		this.emit('selected', anno);
	}
}

export { AnnotationLayer }
