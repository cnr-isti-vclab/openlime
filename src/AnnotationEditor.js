import { Skin } from './Skin.js';
import { Util } from './Util.js';
import { simplify, smooth, smoothToPath } from './Simplify.js'
import { LayerSvgAnnotation } from './LayerSvgAnnotation.js'
import { CoordinateSystem } from './CoordinateSystem.js'
import { Annotation } from './Annotation.js';

/**
 * Callback for create/update/delete annotations.
 * @function crudCallback
 * @param {Annotation} anno The current annotation entry.
 */

/**
 * Callback implementing custom state annotations.
 * @function customStateCallback
 * @param {Annotation} anno The current annotation entry.
 */

/**
 * Callback to customize the annotation data object.
 * @function customDataCallback
 * @param {Annotation} anno The current annotation entry.
 */

/**
 * Callback executed when an annotation is selcted on the user interface.
 * @function selectedCallback
 * @param {Annotation} anno The current annotation entry.
 */

/**
 * **AnnotationEditor** enables the {@link UIBasic} interface to edit (create/update/delete) SVG annotations.
 * This class is a mere utility that acts as an adapter between the annotation database and the OpenLIME system.
 * 
 * Here you will find a tutorial to learn how to use the SVG annotation editor. //FIXME
 * 
 * For the experienced developer this class can be used as an example to design more complex editors.
 * 
 * In the following example an **AnnotationEditor** is instatiated and connected to the annotation database
 * through three callbacks implementing database operations (create/update/delete).
 * ``` 
 * // Creates an annotation layer and add it to the canvans
 * const anno = new OpenLIME.Layer(aOptions);
 * lime.addLayer('anno', anno);
 *
 * // Creates a SVG annotation Editor
 * const editor = new OpenLIME.AnnotationEditor(lime, anno, {
 *          viewer: lime,
 *          classes: classParam
 * });
 * editor.createCallback = (anno) => { console.log("Created annotation: ", anno); processRequest(anno, 'create'); return true; };
 * editor.updateCallback = (anno) => { console.log("Updated annotation: ", anno); processRequest(anno, 'update'); return true; };
 * editor.deleteCallback = (anno) => { console.log("Deleted annotation: ", anno); processRequest(anno, 'delete'); return true; };
 * ```
 */
class AnnotationEditor {
	/**
	 * Instatiates a AnnotationEditor object.
	 * @param {Viewer} viewer The OpenLIME viewer.
	 * @param {LayerSvgAnnotation} layer The annotation layer on which to operate.
	 * @param {Object} [options] An object literal with SVG editor parameters.
	 * @param {AnnotationClasses} options.classes An object literal definying colors and labels of the annotation classes.
	 * @param {crudCallback} options.createCallback The callback to implement annotation creation.
	 * @param {crudCallback} options.updateCallback The callback to implement annotation update.
	 * @param {crudCallback} options.deleteCallback The callback to implement annotation deletion.
	 * @param {bool} options.enableState=false Whether to enable custom annotation state. This allows to include some state variables into an annotation item (such as camera, light or lens position).
	 * @param {customStateCallback} options.customState The callback implementing custom state annotations.
	 * @param {customDataCallback} options.customData The callback to customize the annotation data object.
	 * @param {selectedCallback} options.selectedCallback The callback executed when an annotation is selcted on the user interface.
	 */
	constructor(viewer, layer, options) {
		this.viewer = viewer;
		this.layer = layer;
		Object.assign(this, {
			panning: false,
			tool: null, //doing nothing, could: ['line', 'polygon', 'point', 'box', 'circle']
			startPoint: null, //starting point for box and  circle
			currentLine: [],
			annotation: null,
			priority: 20000,
			enableState: false,
			customState: null,
			customData: null,
			editWidget: null,
			selectedCallback: null,
			createCallback: null, //callbacks for backend
			updateCallback: null,
			deleteCallback: null,
			classes: {
				'': {stroke: '#000000', fill: ''},
				'sea': { stroke: '#0000ff', fill: '' },
				'grass': { stroke: '#00ff00', fill: '' },
				'fire': { stroke: '#ff0000', fill: '' },
				'air': { stroke: '#777777', fill: '' },
			},
			tools: {
				point: {
					img: '<svg width=24 height=24><circle cx=12 cy=12 r=3 fill="red" stroke="gray"/></svg>',
					tooltip: 'New point',
					tool: Point,
				},
				pin: {
					template: (x,y) => {
						return `<svg xmlns='http://www.w3.org/2000/svg' x='${x}' y='${y}' width='3%' height='3%' class='pin'
						viewBox='0 0 18 18'><path d='M 0,0 C 0,0 4,0 8,0 12,0 16,4 16,8 16,12 12,16 8,16 4,16 0,12 0,8 0,4 0,0 0,0 Z'/><text class='pin-text' x='4' y='12'>${this.annotation.idx}</text></svg>`;
					}, //pin di alcazar  1. url a svg 2. txt (stringa con svg) 3. funzione(x,y) ritorna svg 4. dom (da skin).
					tooltip: 'New pin',
					tool: Pin
				},
				pen: {
					img: '<svg width=24 height=24><circle cx=12 cy=12 r=3 fill="red" stroke="gray"/></svg>',
					tooltip: 'New polyline',
					tool: Pen,
				},
				line: {
					img: `<svg width=24 height=24>
						<path d="m 4.7,4.5 c 0.5,4.8 0.8,8.5 3.1,11 2.4,2.6 4.2,-4.8 6.3,-5 2.7,-0.3 5.1,9.3 5.1,9.3" stroke-width="3" fill="none" stroke="grey"/>
						<path d="m 4.7,4.5 c 0.5,4.8 0.8,8.5 3.1,11 2.4,2.6 4.2,-4.8 6.3,-5 2.7,-0.3 5.1,9.3 5.1,9.3" stroke-width="1" fill="none" stroke="red"/></svg>`,
					tooltip: 'New line',
					tool: Line,
				},
				erase: {
					img: '',
					tooltip: 'Erase lines',
					tool: Erase,
				},
				box: {
					img: '<svg width=24 height=24><rect x=5 y=5 width=14 height=14 fill="red" stroke="gray"/></svg>',
					tooltip: 'New box',
					tool: Box,
				},
				circle: {
					img: '<svg width=24 height=24><circle cx=12 cy=12 r=7 fill="red" stroke="gray"/></svg>',
					tooltip: 'New circle',
					tool: Circle,
				},
				/*				colorpick: {
									img: '',
									tooltip: 'Pick a color',
									tool: Colorpick,
								} */
			},
		}, options);
		
		layer.style += Object.entries(this.classes).map((g) => {
			// console.assert(g[1].hasOwnProperty('stroke'), "Classes needs a stroke property");
			return `[data-class=${g[0]}] { stroke:${g[1].stroke}; }`;
		}).join('\n');

		this.layerStyle = layer.style;

		//at the moment is not really possible to unregister the events registered here.
		viewer.pointerManager.onEvent(this);
		document.addEventListener('keyup', (e) => this.keyUp(e), false);
		layer.addEvent('selected', (anno) => {
			if (!anno || anno == this.annotation)
				return;
			if(this.selectedCallback) this.selectedCallback(anno);
			this.showAnnotationEditor(anno);
		});

		this.createAnnotationEditor();
	
	}

	/** @ignore */
	/**
	 * Create the annotation menu 
	 */
	async createAnnotationEditor() {

		// information about the annotation
		// label: it's the title/name of the annotation
		// class: styling class
		// color: color for the specific annotation (overwrite class?)
		// description: general description of the annotation (only text for now)
		// descriptionButton: button to toggle the description

		// for each info:
		// html: html code
		// element: html element
		// event: used for event listener (type and listener specified as object)

		// each info is provided of id to access them specifically with querySelector()
		const annotationInfo = {
			label: {
				html: '<input type="text" name="label" placeholder="Name" id="openlime-annotation-label"/>',
				element: null,
				event:  {
					type: 'change',
					listener: (event) => { 
						this.annotation.label = document.querySelector('#openlime-annotation-label').value || '';
						this.saveCurrent(); 
						this.saveAnnotation(); 
					} 
				},
			},
			class: {
				html: '<select name="class" id="openlime-annotation-class"> <option value="">Class</option> <option value="sea">Sea</option> <option value="grass">Grass</option> <option value="fire">Fire</option> <option value="air">Air</option> </select>',
				element: null,
				event:  { 
					type: 'change', 
					listener: (event) => {
						const c = document.querySelector('#openlime-annotation-class').value || '';
						this.annotation.class = c;
						this.annotation.style.stroke = this.classes[c].stroke;
						this.updateAnnotationStyle();
						this.saveCurrent();
						this.saveAnnotation();
						this.updateAnnotationEditor();
					} 
				},
			},
			stroke: {
				html: '<input type="color" name="stroke" value="#ff0000" id="openlime-annotation-stroke"/>',
				element: null,
				event:  { 
					type: 'change', 
					listener: (event) => { 
						this.annotation.style.stroke = document.querySelector('#openlime-annotation-stroke').value;
						this.updateAnnotationStyle();
						this.saveCurrent(); 
						this.saveAnnotation();  
					} 
				},
			},
			fill: {
				html: '<input hidden type="color" name="fill" value="#ff0000" id="openlime-annotation-fill"/>',
				element: null,
				event:  { 
					type: 'change', 
					listener: (event) => { 
						this.annotation.style.fill = document.querySelector('#openlime-annotation-fill').value;
						this.updateAnnotationStyle();
						this.saveCurrent(); 
						this.saveAnnotation();
				 	} 
				},
			},
			description: {
				html: '<textarea name="description" placeholder="Insert description." hidden="true" id="openlime-annotation-description"></textarea>',
				element: null,
				event:  { 
					type: 'change', 
					listener: (event) => { 
						this.annotation.description = document.querySelector('#openlime-annotation-description').value || '';
						this.saveCurrent(); 
						this.saveAnnotation(); 
					} 
				},
			},
			descriptionButton: {
				html: '<input type="button" name="description-button" value="Description" id="openlime-annotation-description-button"/>',
				element: null,
				event:  { 
					type: 'click', 
					listener: (event) => { 
						this.toggleDescription(); 
					} 
				},
			},
			printBBoxButton: {
				html: '<input type="button" name="bbox-button" value="BBOX" id="openlime-annotation-bbox-button"/>',
				element: null,
				event:  { 
					type: 'click', 
					listener: (event) => { 
						console.log(this.getPixelsAroundAllAnnotations()); 
					} 
				},
			},
			annotationFile: {
				html: '<input type="file" name="annotation-file" id="openlime-annotation-file"/>',
				element: null,
				event: {
					type: 'change',
					listener: (event) => {
						const selectedFile = document.querySelector("#openlime-annotation-file").files[0];
						const editor = this;
						this.deleteAllAnnotation();
						const reader = new FileReader();
						reader.readAsText(selectedFile, "UTF-8");
						reader.onload = function (evt) {
							const newAnnotations = JSON.parse(evt.target.result);
							editor.loadAnnotationsFromFile(newAnnotations);
						};			
					},
				},
			},
		}

		// set of drawing tools, for each tool:
		// title: title of the tool, used for tooltip
		// display: weather to show the icon or not
		// icon: name of the svg element (or svg itself?)
		// element: html element of the icon
		// label: used if the the icon and the tool has two different names (like for draw)
		const tools = {
			pin: {title: "Pin", display: true, icon: null, element: null, label: 'pin' },
			draw: {title: "Line", display: true, icon: null, element: null, label: 'line' },
			// pen: {title: "Pen", display: true, icon: null, element: null, label: 'pen' },
			erase: { title: 'Erase', display: true, icon: null, element: null, label: 'erase' },
		}

		// set of general actions, for each action:
		// title: title of the action, used for tooltip
		// display: weather to show the icon or not
		// task: function to do on click
		
		const actions = {
			undo: { title: 'Undo', display: true, task: (event) => { this.undo() } },
			redo: { title: 'Redo', display: true, task: (event) => { this.redo() } },
			trash: { title: 'Delete', display: true, task: (event) => { this.deleteSelected() } },
			export: { title: 'Export', display: true, task: (event) => { this.exportAnnotations(); this.exportAnnotationsJSON(); } },
			add: { title: 'New', display: true, task: (event) => {
				this.createAnnotation();
				document.querySelector('#openlime-overlay-menu-layer').classList.remove('open');
				document.querySelector('#openlime-overlay-menu-option').classList.remove('open');
				document.querySelector('#openlime-overlay-menu-annotation').classList.add('open');
			} },
		}

		// create the annotation menu div
		let annotationEditor = document.createElement('div');
		annotationEditor.classList.add('openlime-annotation-editor');

		// adding input for annotation info, with events
		for (let info of Object.values(annotationInfo)){
			let template = document.createElement('template');
			template.innerHTML = info.html.trim();
			info.element = template.content.firstChild;
			info.element.addEventListener(info.event.type, info.event.listener);
			annotationEditor.appendChild(info.element);
		}

		this.viewer.containerElement.appendChild(annotationEditor);

		// adding icons for drawing tools, with events
		for (let [name, tool] of Object.entries(tools)) {

			if (tool.display !== true)
				continue;

			tool.icon = '.openlime-' + name;
			tool.element = await Skin.appendIcon(annotationEditor, tool.icon); // TODO pass entry.element.firstChild as parameter in onCreate
			tool.element.setAttribute('title', tool.title);
			tool.element.addEventListener('click', (event) => {
				this.toggleTool(tool.element);
				if (tool.element.classList.contains('active'))
					this.setTool(tool.label);
				else
					this.setTool(null);
			});
			// tooltip
			let title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
			title.textContent = tool.title;
			tool.element.appendChild(title);
			
		}

		// adding icons for general actions, with events
		for (let [name, action] of Object.entries(actions)) {

			if (action.display !== true)
				continue;

			action.icon = '.openlime-' + name;
			let icon = await Skin.appendIcon(annotationEditor, action.icon); // TODO pass entry.element.firstChild as parameter in onCreate
			icon.setAttribute('title', action.title);
			icon.addEventListener('click', action.task);
			action.element = icon;
			// tooltip
			let title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
			title.textContent = action.title;
			action.element.appendChild(title);
			
		}

		// save the div with all elements
		this.annotationEditor = annotationEditor;
	}

	/** @ignore */
	getPixelsAroundPath(path) {
		let gl = this.viewer.canvas.gl;
		// let bbox = path.getBBox();
		let bbox = path.getBoundingClientRect();
		let pixels = new Uint8Array(3*bbox.width*bbox.height);
		gl.readPixels(
			bbox.x,
			bbox.y,
			bbox.width,
			bbox.height,
			gl.RGB,
			gl.UNSIGNED_BYTE,
			pixels
		);

		gl.getError();

		console.log('gl', gl);
		console.log('gl viewport', gl.getParameter(gl.VIEWPORT));
		console.log('bbox', bbox);

		console.log('svgElement', this.layer.svgElement);
		console.log('svgElement bbox', this.layer.svgElement.getBBox());

		console.log('layer bbox', this.layer.boundingBox());

		return pixels;
	}

	/** @ignore */
	getPixelsAroundAnnotation(annotation) {
		if (!annotation)
			annotation = this.annotation;

		let pixelsForEachPath = [];

		for (let element of annotation.elements) {
			if (element.tagName == 'path') {
				let pixels = this.getPixelsAroundPath(element);
				pixelsForEachPath.push(pixels);
			}
		}
		
		return {id: annotation.id, pixels: pixelsForEachPath};
	}

	/** @ignore */
	getPixelsAroundAllAnnotations() {
		let pixelsForEachAnnotation = [];
		for (let annotation of this.layer.annotations)
			pixelsForEachAnnotation.push(this.getPixelsAroundAnnotation(annotation));
		return pixelsForEachAnnotation;
	}


	/** @ignore */
	toggleDescription() {
		let description = document.querySelector('#openlime-annotation-description');
		description.hidden = !description.hidden;
	}

	/** @ignore */
	toggleAnnotationEditor() {
		if (this.annotation)
			return this.hideAnnotationEditor();

		let id = this.layer.selected.values().next().value;
		if (!id)
			return;

		let anno = this.layer.getAnnotationById(id);
		this.showAnnotationEditor(anno);
	}

	/** @ignore */
	updateAnnotationEditor() {
		let anno = this.annotation;
		if (!anno.class)
			anno.class = '';

		document.querySelector('#openlime-annotation-label').value = anno.label || '';
		document.querySelector('#openlime-annotation-class').value = anno.class || '';
		document.querySelector('#openlime-annotation-stroke').value = anno.style.stroke || '';
		document.querySelector('#openlime-annotation-fill').value = anno.style.fill || '';
		document.querySelector('#openlime-annotation-description').value = anno.description || '';


	}

	/** @ignore */
	showAnnotationEditor(anno) {
		this.annotation = anno;
		// this.setTool(null);
		// this.toggleTool();
		// this.layer.annotationsListEntry.element.querySelector('.openlime-edit').classList.add('active');
		// await this.createEditWidget();
		this.updateAnnotationEditor();
		this.annotationEditor.classList.remove('hidden');
	}

	/** @ignore */
	hideAnnotationEditor() {
		this.annotation = null;
		// this.setTool(null);
		// this.editWidget.classList.add('hidden');
		// this.layer.annotationsListEntry.element.querySelector('.openlime-edit').classList.remove('active');
		this.annotationEditor.classList.add('hidden');
	}

	

	/** @ignore */
	setAnnotationCurrentState(anno) {
		anno.state = window.structuredClone(this.viewer.canvas.getState());
		// Callback to add  light/lens params or other data
		if(this.customState) this.customState(anno);
	}

	/** @ignore */
	createAnnotation() {
		let anno = this.layer.newAnnotation();
		if(this.customData) this.customData(anno);
		if(this.enableState) this.setAnnotationCurrentState(anno);
		anno.idx = this.layer.annotations.length;
		anno.publish = 1;
		anno.label = anno.description = anno.class = '';
		let post = {
			id: anno.id,
			idx: anno.idx,
			label: anno.label,
			class: anno.class,
			style: anno.style,
			description: anno.description,
			svg: null,
			publish: anno.publish,
			data: anno.data
		};
		if (this.enableState) post = { ...post, state: anno.state };
		if (this.createCallback) {
			let result = this.createCallback(post);
			if (!result)
				alert("Failed to create annotation!");
		}
		this.layer.setSelected(anno);
	}

	/** @ignore */
	saveAnnotation() {
		let anno = this.annotation;

		for (let e of this.annotation.elements)
			e.setAttribute('data-class', anno.class);

		let post = {
			id: anno.id,
			idx: anno.idx,
			label: anno.label,
			class: anno.class,
			style: anno.style,
			description: anno.description,
			publish: anno.publish,
			data: anno.data
		};
		if (this.enableState) post = { ...post, state: anno.state };
		// if (anno.light) post = { ...post, light: anno.light }; FIXME
		// if (anno.lens) post = { ...post, lens: anno.lens };

		//anno.bbox = anno.getBBoxFromElements();
		let serializer = new XMLSerializer();
		post.svg = `<svg xmlns="http://www.w3.org/2000/svg">
				${anno.elements.map((s) => { 
					s.classList.remove('selected'); 
					return serializer.serializeToString(s) 
				}).join("\n")}  
				</svg>`;

		if (this.updateCallback) {
			let result = this.updateCallback(post);
			if (!result) {
				alert("Failed to update annotation");
				return;
			}
		}				//for (let c of element.children)
		//		a.elements.push(c);

		//update the entry
		let template = document.createElement('template');
		template.innerHTML = this.layer.createAnnotationEntry(anno);
		let entry = template.content.firstChild;
		//TODO find a better way to locate the entry!
		this.layer.annotationsListEntry.element.parentElement.querySelector(`[data-annotation="${anno.id}"]`).replaceWith(entry);
		this.layer.setSelected(anno);
	}

	/** @ignore */
	updateAnnotationStyle(){
		let anno = this.annotation;

		///////
		anno.style.fill = '';
		// anno.style.stroke = '';
		///////

		for (let e of anno.elements){
			e.setAttribute('style', Object.entries(anno.style).map(p => `${p[0]}:${p[1]};`).join(' '));
		}
	}

	/** @ignore */
	deleteSelected() {
		let id = this.layer.selected.values().next().value;
		if (id)
			this.deleteAnnotation(id);
	}

	/** @ignore */
	deleteAnnotation(id) {
		let anno = this.layer.getAnnotationById(id);
		if (this.deleteCallback) {
			if (!confirm(`Deleting annotation ${anno.label}, are you sure?`))
				return;
			let result = this.deleteCallback(anno);
			if (!result) {
				alert("Failed to delete this annotation.");
				return;
			}
		}
		//remove svg elements from the canvas
		this.layer.svgGroup.querySelectorAll(`[data-annotation="${anno.id}"]`).forEach(e => e.remove());

		//remove entry from the list
		let list = this.layer.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		list.querySelectorAll(`[data-annotation="${anno.id}"]`).forEach(e => e.remove());

		this.layer.annotations = this.layer.annotations.filter(a => a !== anno);
		this.layer.clearSelected();
		// this.hideAnnotationEditor();
	}

	/** @ignore */
	loadAnnotationsFromFile(newAnnotations) {
		//this.annotations = this.annotations.map(a => '@context' in a ? Annotation.fromJsonLd(a): a);
		this.layer.annotations = newAnnotations;
		this.layer.annotations = this.layer.annotations.map(a => new Annotation(a));
		console.log(this.layer.annotations);
		for(let a of this.layer.annotations)
			if(a.publish != 1)
				a.visible = false;
		//this.layer.annotations.sort((a, b) => a.label.localeCompare(b.label));
		if(this.layer.annotationsListEntry)
			this.layer.createAnnotationsList();
		
		this.layer.emit('update');
		this.layer.status = 'ready';
		this.layer.emit('ready');
		this.layer.emit('loaded');

		//update the entry
		for (let anno of this.layer.annotations){
			let template = document.createElement('template');
			template.innerHTML = this.layer.createAnnotationEntry(anno);
			let entry = template.content.firstChild;
			//TODO find a better way to locate the entry!
			this.layer.annotationsListEntry.element.parentElement.querySelector(`[data-annotation="${anno.id}"]`).replaceWith(entry);
		}
	}

	/** @ignore */
	deleteAllAnnotation() {
		
		for (let anno of this.layer.annotations) {
		
			//remove svg elements from the canvas
			this.layer.svgGroup.querySelectorAll(`[data-annotation="${anno.id}"]`).forEach(e => e.remove());

			//remove entry from the list
			let list = this.layer.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
			list.querySelectorAll(`[data-annotation="${anno.id}"]`).forEach(e => e.remove());

			this.layer.annotations = [];
			// this.hideAnnotationEditor();
		}
	}

	/** @ignore */
	exportAnnotations() {
		let svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const bBox = this.layer.boundingBox();
		svgElement.setAttribute('viewBox', `0 0 ${bBox.xHigh-bBox.xLow} ${bBox.yHigh-bBox.yLow}`);
		let style = Util.createSVGElement('style');
		style.textContent = this.layer.style;
		svgElement.appendChild(style);
		let serializer = new XMLSerializer();
		//let svg = `<svg xmlns="http://www.w3.org/2000/svg">
		for (let anno of this.layer.annotations) {
			for (let e of anno.elements) {
				if (e.tagName == 'path') {
					//Inkscape nitpicks on the commas in svg path.
					let d = e.getAttribute('d');
					e.setAttribute('d', d.replaceAll(',', ' '));
				}
				svgElement.appendChild(e.cloneNode());
			}
		}
		let svg = serializer.serializeToString(svgElement);
		/*(${this.layer.annotations.map(anno => {
			return `<group id="${anno.id}" title="${anno.label}" data-description="${anno.description}">
				${anno.elements.map((s) => { 
					s.classList.remove('selected'); 
					return serializer.serializeToString(s) 
				}).join("\n")}
				</group>`;
		})}
		</svg>`; */

		///console.log(svg);

		var e = document.createElement('a');
		e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(svg));
		e.setAttribute('download', 'annotations.svg');
		e.style.display = 'none';
		document.body.appendChild(e);
		e.click();
		document.body.removeChild(e);
	}

	exportAnnotationsJSON() {

		let annotationsArray = []

		for (let anno of this.layer.annotations) {
			let post = {
				id: anno.id,
				idx: anno.idx,
				label: anno.label,
				class: anno.class,
				style: anno.style,
				description: anno.description,
				publish: anno.publish,
				data: anno.data
			};
			if (this.enableState) post = { ...post, state: anno.state };
			// if (anno.light) post = { ...post, light: anno.light }; FIXME
			// if (anno.lens) post = { ...post, lens: anno.lens };

			//anno.bbox = anno.getBBoxFromElements();
			let serializer = new XMLSerializer();
			post.svg = `<svg xmlns="http://www.w3.org/2000/svg">
					${anno.elements.map((s) => { 
						s.classList.remove('selected'); 
						return serializer.serializeToString(s) 
					}).join("\n")}  
					</svg>`;

			annotationsArray.push(post);
		}

		let annotationsJSON = JSON.stringify(annotationsArray);

		let e = document.createElement('a');
		e.setAttribute('href', "data:text/json;charset=utf-8," + encodeURIComponent(annotationsJSON));
		e.setAttribute('download', 'annotations.json');
		e.style.display = 'none';
		document.body.appendChild(e);
		e.click();
		document.body.removeChild(e);
	}

	/** @ignore */
	toggleTool(e) {
		if (!this.annotationEditor) return;
		// let tools = this.annotationEditor.querySelector('.openlime-annotation-edit-tools');
		this.annotationEditor.querySelectorAll('svg').forEach(a => {
			if (a != e) a.classList.remove('active')});
		if (e)
			e.classList.toggle('active');
	}

	/** @ignore */
	setTool(tool) {
		this.tool = tool;
		if (this.factory && this.factory.quit)
			this.factory.quit();
		if (tool) {
			if (!tool in this.tools)
				throw "Unknown editor tool: " + tool;

			this.factory = new this.tools[tool].tool(this.tools[tool]);
			this.factory.annotation = this.annotation;
			this.factory.layer = this.layer;
		}
		document.querySelector('.openlime-overlay').classList.toggle('erase', tool == 'erase');
		document.querySelector('.openlime-overlay').classList.toggle('crosshair', tool && tool != 'erase');
	}


	// UNDO STUFF	

	/** @ignore */
	undo() {
		let anno = this.annotation; //current annotation.
		if (!anno)
			return;
		if (this.factory && this.factory.undo && this.factory.undo()) {
			anno.needsUpdate = true;
			this.viewer.redraw();
			return;
		}

		if (anno.history && anno.history.length) {
			//FIXME TODO history will be more complicated if it has to manage multiple tools.
			anno.future.push(this.annoToData(anno));

			let data = anno.history.pop();
			this.dataToAnno(data, anno);

			anno.needsUpdate = true;
			this.viewer.redraw();
			this.updateAnnotationEditor();
		}
	}

	/** @ignore */
	redo() {
		let anno = this.annotation; //current annotation.
		if (!anno)
			return;
		if (this.factory && this.factory.redo && this.factory.redo()) {
			anno.needsUpdate = true;
			this.viewer.redraw();
			return;
		}
		if (anno.future && anno.future.length) {
			anno.history.push(this.annoToData(anno));

			let data = anno.future.pop();
			this.dataToAnno(data, anno);

			anno.needsUpdate = true;
			this.viewer.redraw();
			this.updateAnnotationEditor();
		}
	}

	/** @ignore */
	saveCurrent() {
		let anno = this.annotation; //current annotation.
		if (!anno.history)
			anno.history = [];

		anno.history.push(this.annoToData(anno));
		anno.future = [];
	}

	/** @ignore */
	annoToData(anno) {
		let data = {};
		for (let i of ['id', 'label', 'description', 'class', 'publish', 'data'])
			data[i] = `${anno[i] || ''}`;
		data.elements = anno.elements.map(e => { let n = e.cloneNode(); n.points = e.points; return n; });
		return data;
	}

	/** @ignore */
	dataToAnno(data, anno) {
		for (let i of ['id', 'label', 'description', 'class', 'publish', 'data'])
			anno[i] = `${data[i]}`;
		anno.elements = data.elements.map(e => { let n = e.cloneNode(); n.points = e.points; return n; });
	}


	// TOOLS STUFF

	/** @ignore */
	keyUp(e) {
		if (e.defaultPrevented) return;
		switch (e.key) {
			case 'Escape':
				if (this.tool) {
					this.toggleTool();
					this.setTool(null);
					e.preventDefault();
				}
				break;
			case 'Delete':
				this.deleteSelected();
				break;
			case 'Backspace':
				break;
			case 'z':
				if (e.ctrlKey)
					this.undo();
				break;
			case 'Z':
				if (e.ctrlKey)
					this.redo();
				break;
		}
	}

	/** @ignore */
	panStart(e) {
		if (e.buttons != 1 || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey)
			return;
		if (!['line', 'erase', 'box', 'circle'].includes(this.tool))
			return;
		this.panning = true;
		e.preventDefault();

		this.saveCurrent();

		const pos = this.mapToSvg(e);
		let shape = this.factory.create(pos, e);

		this.annotation.needsUpdate = true;

		this.viewer.redraw();
	}

	/** @ignore */
	panMove(e) {
		if (!this.panning)
			return false;

		const pos = this.mapToSvg(e);
		this.factory.adjust(pos, e);
	}

	/** @ignore */
	panEnd(e) {
		if (!this.panning)
			return false;
		this.panning = false;

		const pos = this.mapToSvg(e);
		let changed = this.factory.finish(pos, e);
		if (!changed) //nothing changed no need to keep current situation in history.
			this.annotation.history.pop();
		else
			this.saveAnnotation();
		this.annotation.needsUpdate = true;
		this.viewer.redraw();
	}

	/** @ignore */
	fingerHover(e) {
		if (this.tool != 'line')
			return;
		e.preventDefault();
		const pos = this.mapToSvg(e);
		let changed = this.factory.hover(pos, e);
		this.annotation.needsUpdate = true;
		this.viewer.redraw();
	}

	/** @ignore */
	fingerSingleTap(e) {
		if (!['point', 'pin', 'line', 'erase', 'pen'].includes(this.tool))
			return;
		e.preventDefault();

		this.saveCurrent();

		const pos = this.mapToSvg(e);
		let changed = this.factory.tap(pos, e)
		if (!changed) //nothing changed no need to keep current situation in history.
			this.annotation.history.pop();
		else
			this.saveAnnotation();
		this.annotation.needsUpdate = true;

		this.viewer.redraw();
	}

	/** @ignore */
	fingerDoubleTap(e) {
		if (!['line'].includes(this.tool))
			return;
		e.preventDefault();

		this.saveCurrent();

		const pos = this.mapToSvg(e);
		let changed = this.factory.doubleTap(pos, e)
		if (!changed) //nothing changed no need to keep current situation in history.
			this.annotation.history.pop();
		else
			this.saveAnnotation();
		this.annotation.needsUpdate = true;

		this.viewer.redraw();
	}

	/** @ignore */
	mapToSvg(e) {
		const p = {x:e.offsetX, y: e.offsetY};
		const layerT = this.layer.transform;
		const useGL = false;
		const layerbb = this.layer.boundingBox();
		const layerSize = {w:layerbb.width(), h:layerbb.height()};
		//compute also size of an image pixel on screen and store in pixelSize.
		let pos = CoordinateSystem.fromCanvasHtmlToImage(p, this.viewer.camera, layerT, layerSize, useGL);
		p.x += 1;
		let pos1 = CoordinateSystem.fromCanvasHtmlToImage(p, this.viewer.camera, layerT, layerSize, useGL);
		pos.pixelSize = Math.abs(pos1.x - pos.x);
		return pos;
	}
}


/** @ignore */
class Point {
	tap(pos) {
		let point = Util.createSVGElement('circle', { cx: pos.x, cy: pos.y, r: 10, class: 'point' });
		this.annotation.elements.push(point);
		return true;
	}
}

/** @ignore */
class Pin {
	constructor(options) {
		Object.assign(this, options);
	}
	tap(pos) {
		const str = this.template(pos.x,pos.y);
		let parser = new DOMParser();
	    let point = parser.parseFromString(str, "image/svg+xml").documentElement;
		this.annotation.elements.push(point);
		// this.annotation.elements[0] = point;
		return true;
	}
}

/** @ignore */
class Pen {
	constructor() {
		//TODO Use this.path.points as in line, instead.
		this.points = [];
	}
	create(pos) {
		this.points.push(pos);
		if (this.points.length == 1) {
			this.saveCurrent();

			this.path = Util.createSVGElement('path', { d: `M${pos.x} ${pos.y}`, class: 'line' });
			return this.path;
		}
		let p = this.path.getAttribute('d');
		this.path.setAttribute('d', p + ` L${pos.x} ${pos.y}`);
		this.path.points = this.points;
	}


	tap(pos) {
		if (!this.path) {
			this.create(pos);
			return false;
		} else {
			if (this.adjust(pos))
				this.history = [this.path.points.length - 1];
			return true;
		}
	}

	adjust(pos) {
		// let gap = Line.distanceToLast(this.path.points, pos);
		// if (gap / pos.pixelSize < 4) return false;

		// this.path.points.push(pos);

		// let d = this.path.getAttribute('d');
		// this.path.setAttribute('d', Line.svgPath(this.path.points));//d + `L${pos.x} ${pos.y}`);
		return true;
	}



	undo() {
		if (!this.points.length)
			return;
		this.points.pop();
		let d = this.points.map((p, i) => `${i == 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
		this.path.setAttribute('d', d);

		if (this.points.length < 2) {
			this.points = [];
			this.annotation.elements = this.annotation.elements.filter((e) => e != this.path);
		}
	}
}

/** @ignore */
class Box {
	constructor() {
		this.origin = null;
		this.box = null;
	}

	create(pos) {
		this.origin = pos;
		this.box = Util.createSVGElement('rect', { x: pos.x, y: pos.y, width: 0, height: 0, class: 'rect' });
		return this.box;
	}

	adjust(pos) {
		let p = this.origin;

		this.box.setAttribute('x', Math.min(p.x, pos.x));
		this.box.setAttribute('width', Math.abs(pos.x - p.x));
		this.box.setAttribute('y', Math.min(p.y, pos.y));
		this.box.setAttribute('height', Math.abs(pos.y - p.y));
	}

	finish(pos) {
		return this.box;
	}
}

/** @ignore */
class Circle {
	constructor() {
		this.origin = null;
		this.circle = null;
	}
	create(pos) {
		this.origin = pos;
		this.circle = Util.createSVGElement('circle', { cx: pos.x, cy: pos.y, r: 0, class: 'circle' });
		return this.circle;
	}
	adjust(pos) {
		let p = this.origin;
		let r = Math.hypot(pos.x - p.x, pos.y - p.y);
		this.circle.setAttribute('r', r);
	}
	finish() {
		return this.circle;
	}
}

/** @ignore */
class Line {
	constructor() {
		this.history = []
	}
	create(pos) {
		/*if(this.segment) {
			this.layer.svgGroup.removeChild(this.segment);
			this.segment = null;
		}*/
		for (let e of this.annotation.elements) {
			if (!e.points || e.points.length < 2)
				continue;
			if (Line.distance(e.points[0], pos) / pos.pixelSize < 5) {
				e.points.reverse();
				this.path = e;
				this.path.setAttribute('d', Line.svgPath(e.points));
				//reverse points!
				this.history = [this.path.points.length];
				return;
			}
			if (Line.distanceToLast(e.points, pos) < 5) {
				this.path = e;
				this.adjust(pos);
				this.history = [this.path.points.length];
				return;
			}
		}
		this.path = Util.createSVGElement('path', { d: `M${pos.x} ${pos.y}`, class: 'line' });
		this.path.points = [pos];
		this.history = [this.path.points.length];
		this.annotation.elements.push(this.path);
	}

	tap(pos) {
		if (!this.path) {
			this.create(pos);
			return false;
		} else {
			if (this.adjust(pos))
				this.history = [this.path.points.length - 1];
			return true;
		}
	}
	doubleTap(pos) {
		if (!this.path)
			return false;
		if (this.adjust(pos)) {
			this.history = [this.path.points.length - 1];
			this.path = null;
		}
		return false;
	}

	hover(pos, event) {
		return;
		if (!this.path)
			return false;
		let s = this.path.points[this.path.points.length - 1];
		if (!this.segment) {
			this.segment = Util.createSVGElement('path', { class: 'line' });
			this.layer.svgGroup.appendChild(this.segment);
		}
		pos.x = pos.x - s.x;
		pos.y = pos.y - s.y;
		let len = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
		if (len > 30) {
			pos.x *= 30 / len;
			pos.y *= 30 / len;
		}
		this.segment.setAttribute('d', `M${s.x} ${s.y} l${pos.x} ${pos.y}`);
		return true;
	}
	quit() {
		return;
		if (this.segment) {
			this.layer.svgGroup.removeChild(this.segment);
			this.segment = null;
		}
	}

	adjust(pos) {
		let gap = Line.distanceToLast(this.path.points, pos);
		if (gap / pos.pixelSize < 4) return false;

		this.path.points.push(pos);

		let d = this.path.getAttribute('d');
		this.path.setAttribute('d', Line.svgPath(this.path.points));//d + `L${pos.x} ${pos.y}`);
		return true;
	}

	finish() {
		this.path.setAttribute('d', Line.svgPath(this.path.points));
		return true; //some changes where made!
	}

	undo() {
		if (!this.path || !this.history.length)
			return false;
		this.path.points = this.path.points.slice(0, this.history.pop());
		this.path.setAttribute('d', Line.svgPath(this.path.points));
		return true;
	}
	redo() {
		return false;
	}
	//TODO: smooth should be STABLE, if possible.
	static svgPath(points) {
		//return points.map((p, i) =>  `${(i == 0? "M" : "L")}${p.x} ${p.y}`).join(' '); 

		let tolerance = 1.5 * points[0].pixelSize;
		let tmp = simplify(points, tolerance);

		let smoothed = smooth(tmp, 90, true);
		return smoothToPath(smoothed);
		
	}
	static distanceToLast(line, point) {
		let last = line[line.length - 1];
		return Line.distance(last, point);
	}
	static distance(a, b) {
		let dx = a.x - b.x;
		let dy = a.y - b.y;
		return Math.sqrt(dx * dx + dy * dy);
	}
}

/** @ignore */
class Erase {
	create(pos, event) { this.erased = false; this.erase(pos, event); }
	adjust(pos, event) { this.erase(pos, event); }
	finish(pos, event) { return this.erase(pos, event); } //true if some points where removed.
	tap(pos, event) { return this.erase(pos, event); }
	erase(pos, event) {
		for (let e of this.annotation.elements) {
			if (e == event.originSrc) {
				e.points = [];
				this.erased = true;
				continue;
			}

			let points = e.points;
			if (!points || !points.length)
				continue;

			if (Line.distanceToLast(points, pos) < 10)
				this.erased = true, points.pop();
			else if (Line.distance(points[0], pos) < 10)
				this.erased = true, points.shift();
			else
				continue;

			if (points.length <= 2) {
				e.points = [];
				e.setAttribute('d', '');
				this.annotation.needsUpdate = true;
				this.erased = true;
				continue;
			}

			e.setAttribute('d', Line.svgPath(points));
		}
		this.annotation.elements = this.annotation.elements.filter(e => { return !e.points || e.points.length > 2; });
		return this.erased;
	}
}

export { AnnotationEditor }