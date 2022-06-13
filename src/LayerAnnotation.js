import { Annotation } from './Annotation.js';
import { Layer } from './Layer.js'

/**
 * An annotation layer is a layer used to display decorations (text, graphics elements, glyphs, etc...) on top of other layers.
 * Its purpose is to provide additional information useful for the interpretation of the underlying layers.
 * An object literal with `options` can be specified.
 * 
 * Here you will find a tutorial to learn how to build a client-server architecture to manage annotations in OpenLIME. //FIXME
 * 
 * Extends {@link Layer}.
 */
class LayerAnnotation extends Layer { //FIXME CustomData Object template {name: { label: defaultValue: type:number,enum,string,boolean min: max: enum:[] }}
	/**
	 * Instantiates a LayerAnnotation object.
	 * @param {Object} [options] An object literal with options that inherits from {@link Layer}.
	 * @param {string} options.style Properties to style annotations.
 	 * @param {(string|Array)} options.annotations The URL of the annotation data (JSON file or HTTP GET Request to an annotation server) or an array of annotations.
	 */
	constructor(options) {
		options = Object.assign({
			// geometry: null,  //unused, might want to store here the quads/shapes for opengl rendering
			style: null,    //straightforward for svg annotations, to be defined or opengl rendering
			annotations: [],
			selected: new Set,
			overlay: true,
			annotationsListEntry: null, //TODO: horrible name for the interface list of annotations
		}, options);
		super(options);

		this.signals.selected = [];
		this.signals.loaded = [];

		if (typeof (this.annotations) == "string") { //assumes it is an URL
			(async () => { await this.loadAnnotations(this.annotations); })();
		}
	}

	/** @ignore */
	async loadAnnotations(url) {
		const headers = new Headers();
		headers.append('pragma', 'no-cache');
		headers.append('cache-control', 'no-cache');
		var response = await fetch(url, {
			method: 'GET',
			headers: headers,
	  	});
		if(!response.ok) {
			this.status = "Failed loading " + this.url + ": " + response.statusText;
			return;
		}
		this.annotations = await response.json();
		if(this.annotations.status == 'error') {
			alert("Failed to load annotations: " + this.annotations.msg);
			return;
		}
		//this.annotations = this.annotations.map(a => '@context' in a ? Annotation.fromJsonLd(a): a);
		this.annotations = this.annotations.map(a => new Annotation(a));
		for(let a of this.annotations)
			if(a.publish != 1)
				a.visible = false;
		//this.annotations.sort((a, b) => a.label.localeCompare(b.label));
		if(this.annotationsListEntry)
			this.createAnnotationsList();
		
		this.emit('update');
		this.emit('ready');
		this.emit('loaded');
	}

	/** @ignore */
	newAnnotation(annotation) {
		if(!annotation)
			annotation = new Annotation();

		this.annotations.push(annotation);
		let html = this.createAnnotationEntry(annotation);
		let template = document.createElement('template');
		template.innerHTML = html.trim();
		
		let list =  this.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		list.appendChild(template.content.firstChild);
		
		this.clearSelected();
		//this.setSelected(annotation);
		return annotation;
	}

	/** @ignore */
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

	/** @ignore */
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

	/** @ignore */
	createAnnotationEntry(a) {
		return `<a href="#" data-annotation="${a.id}" class="openlime-entry ${a.visible == 0? 'hidden':''}">${a.label || ''}
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="openlime-eye"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
			<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="openlime-eye-off"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
			</a>`;
	}

	/**
	 * Gets an annotation by its `id`
	 * @param {string} id 
	 * @returns {Annotation} The annotation.
	 */
	getAnnotationById(id) {
		for(const anno of this.annotations)
			if(anno.id == id)
				return anno;
		return null;
	}

	/** @ignore */
	clearSelected() {
		this.annotationsListEntry.element.parentElement.querySelectorAll(`[data-annotation]`).forEach((e) => e.classList.remove('selected'));
		this.selected.clear();
	}

	/**
	 * Selects/deselects an annotation
	 * @param {Annotation} anno The annotation.
	 * @param {bool} on=true Whether to select the annotation.
	 */
	setSelected(anno, on = true) {
		this.annotationsListEntry.element.parentElement.querySelector(`[data-annotation="${anno.id}"]`).classList.toggle('selected', on);
		if(on)
			this.selected.add(anno.id);
		else
			this.selected.delete(anno.id);
		this.emit('selected', anno);
	}
}

export { LayerAnnotation }
