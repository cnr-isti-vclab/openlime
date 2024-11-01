import { Skin } from './Skin.js';
import { Util } from './Util.js';
import { simplify, smooth, smoothToPath } from './Simplify.js'
import { LayerSvgAnnotation } from './LayerSvgAnnotation.js'
import { CoordinateSystem } from './CoordinateSystem.js'

/**
 * @typedef {Object} Annotation
 * @property {string} id - Unique identifier
 * @property {string} label - Annotation title
 * @property {string} description - Detailed description
 * @property {string} class - Class name for styling/categorization
 * @property {number} publish - Publication status (0 or 1)
 * @property {Object} data - Custom data object
 * @property {Array<SVGElement>} elements - SVG elements composing the annotation
 * @property {Object} [state] - Camera and viewer state
 */

/**
 * @callback crudCallback
 * @param {Annotation} annotation - The annotation being operated on
 * @returns {boolean} Success status of the operation
 * @description Callback for create/update/delete operations on annotations
 */

/**
 * @callback customStateCallback
 * @param {Annotation} annotation - The annotation being modified
 * @description Callback to customize state information saved with annotations
 */

/**
 * @callback customDataCallback
 * @param {Annotation} annotation - The annotation being modified
 * @description Callback to customize the annotation data object
 */

/**
 * @callback selectedCallback
 * @param {Annotation} annotation - The selected annotation
 * @description Callback executed when an annotation is selected in the UI
 */

/**
 * EditorSvgAnnotation enables creation and editing of SVG annotations in OpenLIME.
 * It provides tools for drawing various shapes and managing annotations through a user interface.
 * 
 * Features:
 * - Drawing tools: point, pin, line, box, circle
 * - Annotation editing and management
 * - Custom state and data storage
 * - Integration with annotation databases through callbacks
 * - Undo/redo functionality
 * - SVG export capabilities
 * 
 * @example
 * ```javascript
 * // Create annotation layer
 * const anno = new OpenLIME.Layer(options);
 * viewer.addLayer('annotations', anno);
 * 
 * // Initialize editor
 * const editor = new OpenLIME.EditorSvgAnnotation(viewer, anno, {
 *   classes: {
 *     'default': { stroke: '#000', label: 'Default' },
 *     'highlight': { stroke: '#ff0', label: 'Highlight' }
 *   }
 * });
 * 
 * // Setup callbacks
 * editor.createCallback = (anno) => { 
 *   console.log("Created:", anno);
 *   return saveToDatabase(anno);
 * };
 * ```
 */
class EditorSvgAnnotation {
	/**
	 * Creates an EditorSvgAnnotation instance
	 * @param {Viewer} viewer - The OpenLIME viewer instance
	 * @param {LayerSvgAnnotation} layer - The annotation layer to edit
	 * @param {Object} [options] - Configuration options
	 * @param {Object.<string, {stroke: string, label: string}>} options.classes - Annotation classes with colors and labels
	 * @param {crudCallback} [options.createCallback] - Called when creating annotations
	 * @param {crudCallback} [options.updateCallback] - Called when updating annotations
	 * @param {crudCallback} [options.deleteCallback] - Called when deleting annotations
	 * @param {boolean} [options.enableState=false] - Whether to save viewer state with annotations
	 * @param {customStateCallback} [options.customState] - Customize saved state data
	 * @param {customDataCallback} [options.customData] - Customize annotation data
	 * @param {selectedCallback} [options.selectedCallback] - Called when annotation is selected
	 * @param {Object} [options.tools] - Custom tool configurations
	 * @param {number} [options.priority=20000] - Event handling priority
	 */
	constructor(viewer, layer, options) {
		this.layer = layer;
		Object.assign(this, {
			viewer: viewer,
			panning: false,
			tool: null, //doing nothing, could: ['line', 'polygon', 'point', 'box', 'circle']
			startPoint: null, //starting point for box and  circle
			currentLine: [],
			annotation: null,
			priority: 20000,
			classes: {
				'': { stroke: '#000', label: '' },
				'class1': { stroke: '#770', label: '' },
				'class2': { stroke: '#707', label: '' },
				'class3': { stroke: '#777', label: '' },
				'class4': { stroke: '#070', label: '' },
				'class5': { stroke: '#007', label: '' },
				'class6': { stroke: '#077', label: '' },
			},
			tools: {
				point: {
					img: '<svg width=24 height=24><circle cx=12 cy=12 r=3 fill="red" stroke="gray"/></svg>',
					tooltip: 'New point',
					tool: Point,
				},
				pin: {
					template: (x, y) => {
						return `<svg xmlns='http://www.w3.org/2000/svg' x='${x}' y='${y}' width='4%' height='4%' class='pin'
						viewBox='0 0 18 18'><path d='M 0,0 C 0,0 4,0 8,0 12,0 16,4 16,8 16,12 12,16 8,16 4,16 0,12 0,8 0,4 0,0 0,0 Z'/><text class='pin-text' x='7' y='8'>${this.annotation.idx}</text></svg>`;
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
			annotation: null, //not null only when editWidget is shown.
			enableState: false,
			customState: null,
			customData: null,
			editWidget: null,
			selectedCallback: null,
			createCallback: null, //callbacks for backend
			updateCallback: null,
			deleteCallback: null
		}, options);

		layer.style += Object.entries(this.classes).map((g) => {
			console.assert(g[1].hasOwnProperty('stroke'), "Classes needs a stroke property");
			return `[data-class=${g[0]}] { stroke:${g[1].stroke}; }`;
		}).join('\n');
		//at the moment is not really possible to unregister the events registered here.
		viewer.pointerManager.onEvent(this);
		document.addEventListener('keyup', (e) => this.keyUp(e), false);
		layer.addEvent('selected', (anno) => {
			if (!anno || anno == this.annotation)
				return;
			if (this.selectedCallback) this.selectedCallback(anno);
			this.showEditWidget(anno);
		});

		layer.annotationsEntry = () => {

			let entry = {
				html: `<div class="openlime-tools"></div>`,
				list: [], //will be filled later.
				classes: 'openlime-annotations',
				status: () => 'active',
				oncreate: () => {
					if (Array.isArray(layer.annotations))
						layer.createAnnotationsList();

					let tools = {
						'add': { action: () => { this.createAnnotation(); }, title: "New annotation" },
						'edit': { action: () => { this.toggleEditWidget(); }, title: "Edit annotations" },
						'export': { action: () => { this.exportAnnotations(); }, title: "Export annotations" },
						'trash': { action: () => { this.deleteSelected(); }, title: "Delete selected annotations" },
					};
					(async () => {

						for (const [label, tool] of Object.entries(tools)) {
							let icon = await Skin.appendIcon(entry.element.firstChild, '.openlime-' + label); // TODO pass entry.element.firstChild as parameter in onCreate
							icon.setAttribute('title', tool.title);
							icon.addEventListener('click', tool.action);
						}
					})();
				}
			}
			layer.annotationsListEntry = entry;
			return entry;
		}
	}

	/**
	 * Creates a new annotation
	 * @returns {void}
	 */
	createAnnotation() {
		let anno = this.layer.newAnnotation();
		if (this.customData) this.customData(anno);
		if (this.enableState) this.setAnnotationCurrentState(anno);
		anno.idx = this.layer.annotations.length;
		anno.publish = 1;
		anno.label = anno.description = anno.class = '';
		let post = {
			id: anno.id, idx: anno.idx, label: anno.label, description: anno.description, 'class': anno.class, svg: null,
			publish: anno.publish, data: anno.data
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
	toggleEditWidget() {
		if (this.annotation)
			return this.hideEditWidget();

		let id = this.layer.selected.values().next().value;
		if (!id)
			return;

		let anno = this.layer.getAnnotationById(id);
		this.showEditWidget(anno);
	}

	/** @ignore */
	updateEditWidget() {
		let anno = this.annotation;
		let edit = this.editWidget;
		if (!anno.class)
			anno.class = '';
		edit.querySelector('[name=label]').value = anno.label || '';
		edit.querySelector('[name=description]').value = anno.description || '';
		edit.querySelector('[name=idx]').value = anno.idx || '';
		Object.entries(anno.data).map(k => {
			edit.querySelector(`[name=data-data-${k[0]}]`).value = k[1] || '';
		});

		edit.querySelector('[name=classes]').value = anno.class;
		edit.querySelector('[name=publish]').checked = anno.publish == 1;
		edit.classList.remove('hidden');
		let button = edit.querySelector('.openlime-select-button');
		button.textContent = this.classes[anno.class].label;
		button.style.background = this.classes[anno.class].stroke;
	}

	/**
 * Shows the annotation editor widget
 * @param {Annotation} annotation - Annotation to edit
 * @private
 */
	showEditWidget(anno) {
		this.annotation = anno;
		this.setTool(null);
		this.setActiveTool();
		this.layer.annotationsListEntry.element.querySelector('.openlime-edit').classList.add('active');
		(async () => {
			await this.createEditWidget();
			this.updateEditWidget();
		})();
	}

	/** @ignore */
	hideEditWidget() {
		this.annotation = null;
		this.setTool(null);
		this.editWidget.classList.add('hidden');
		this.layer.annotationsListEntry.element.querySelector('.openlime-edit').classList.remove('active');
	}

	//TODO this should actually be in the html.
	/** @ignore */
	async createEditWidget() {
		if (this.editWidget)
			return;
		let html = `
				<div class="openlime-annotation-edit">
					<label for="label">Title:</label> <input name="label" type="text"><br>
					<label for="description">Description:</label><br>
					<textarea name="description" cols="30" rows="5"></textarea><br>
					<span>Class:</span> 
					<div class="openlime-select">
						<input type="hidden" name="classes" value=""/>
						<div class="openlime-select-button"></div>
						<ul class="openlime-select-menu">
						${Object.entries(this.classes).map((c) =>
			`<li data-class="${c[0]}" style="background:${c[1].stroke};">${c[1].label}</li>`).join('\n')}
						</ul>
					</div>
					<label for="idx">Index:</label> <input name="idx" type="text"><br>	
					${Object.entries(this.annotation.data).map(k => {
				let label = k[0];
				let str = `<label for="data-data-${k[0]}">${label}:</label> <input name="data-data-${k[0]}" type="text"><br>`
				return str;
			}).join('\n')}
					<br>
					<span><button class="openlime-state">SAVE</button></span>
					<span><input type="checkbox" name="publish" value=""> Publish</span><br>
					<div class="openlime-annotation-edit-tools"></div>
				</div>`;
		let template = document.createElement('template');
		template.innerHTML = html.trim();
		let edit = template.content.firstChild;

		let select = edit.querySelector('.openlime-select');
		let button = edit.querySelector('.openlime-select-button');
		let ul = edit.querySelector('ul');
		let options = edit.querySelectorAll('li');
		let input = edit.querySelector('[name=classes]');

		let state = edit.querySelector('.openlime-state');

		state.addEventListener('click', (e) => {
			if (this.enableState) this.setAnnotationCurrentState(this.annotation);
			this.saveCurrent();
			this.saveAnnotation();
		});

		button.addEventListener('click', (e) => {
			e.stopPropagation();
			for (let o of options)
				o.classList.remove('selected');
			select.classList.toggle('active');

		});

		ul.addEventListener('click', (e) => {
			e.stopPropagation();

			input.value = e.srcElement.getAttribute('data-class');
			input.dispatchEvent(new Event('change'));
			button.style.background = this.classes[input.value].stroke;
			button.textContent = e.srcElement.textContent;

			select.classList.toggle('active');
		});

		document.addEventListener('click', (e) => {
			select.classList.remove('active');
		});

		document.querySelector('.openlime-layers-menu').appendChild(edit);

		let tools = edit.querySelector('.openlime-annotation-edit-tools');

		let pin = await Skin.appendIcon(tools, '.openlime-pin');
		pin.addEventListener('click', (e) => { this.setTool('pin'); this.setActiveTool(pin); });

		let draw = await Skin.appendIcon(tools, '.openlime-draw');
		draw.addEventListener('click', (e) => { this.setTool('line'); this.setActiveTool(draw); });


		//		let pen = await Skin.appendIcon(tools, '.openlime-pen'); 
		//		pen.addEventListener('click', (e) => { this.setTool('pen'); setActive(pen); });

		let erase = await Skin.appendIcon(tools, '.openlime-erase');
		erase.addEventListener('click', (e) => { this.setTool('erase'); this.setActiveTool(erase); });

		let undo = await Skin.appendIcon(tools, '.openlime-undo');
		undo.addEventListener('click', (e) => { this.undo(); });

		let redo = await Skin.appendIcon(tools, '.openlime-redo');
		redo.addEventListener('click', (e) => { this.redo(); });

		/*		let colorpick = await Skin.appendIcon(tools, '.openlime-colorpick'); 
				undo.addEventListener('click', (e) => { this.pickColor(); }); */

		let label = edit.querySelector('[name=label]');
		label.addEventListener('blur', (e) => { if (this.annotation.label != label.value) this.saveCurrent(); this.saveAnnotation(); });

		let descr = edit.querySelector('[name=description]');
		descr.addEventListener('blur', (e) => { if (this.annotation.description != descr.value) this.saveCurrent(); this.saveAnnotation(); });

		let idx = edit.querySelector('[name=idx]');
		idx.addEventListener('blur', (e) => {
			if (this.annotation.idx != idx.value) {
				const svgPinIdx = this.annotation.elements[0];
				if (svgPinIdx) {
					const txt = svgPinIdx.querySelector(".pin-text");
					if (txt) {
						txt.textContent = idx.value;
					}
				}
				this.saveCurrent();
			}
			this.saveAnnotation();
		});

		Object.entries(this.annotation.data).map(k => {
			let dataElm = edit.querySelector(`[name=data-data-${k[0]}]`);
			dataElm.addEventListener('blur', (e) => { if (this.annotation.data[k[0]] != dataElm.value) this.saveCurrent(); this.saveAnnotation(); });
		});

		let classes = edit.querySelector('[name=classes]');
		classes.addEventListener('change', (e) => { if (this.annotation.class != classes.value) this.saveCurrent(); this.saveAnnotation(); });

		let publish = edit.querySelector('[name=publish]');
		publish.addEventListener('change', (e) => { if (this.annotation.publish != publish.value) this.saveCurrent(); this.saveAnnotation(); });

		edit.classList.add('hidden');
		this.editWidget = edit;
	}

	/** @ignore */
	setAnnotationCurrentState(anno) {
		anno.state = window.structuredClone(this.viewer.canvas.getState());
		// Callback to add  light/lens params or other data
		if (this.customState) this.customState(anno);
	}

	/**
	 * Saves annotation changes and triggers update callback
	 * @private
	 */
	saveAnnotation() {
		let edit = this.editWidget;
		let anno = this.annotation;

		anno.label = edit.querySelector('[name=label]').value || '';
		anno.description = edit.querySelector('[name=description]').value || '';
		anno.idx = edit.querySelector('[name=idx]').value || '0';
		Object.entries(anno.data).map(k => {
			anno.data[k[0]] = edit.querySelector(`[name=data-data-${k[0]}]`).value || '';
		});
		anno.publish = edit.querySelector('[name=publish]').checked ? 1 : 0;
		let select = edit.querySelector('[name=classes]');
		anno.class = select.value || '';

		let button = edit.querySelector('.openlime-select-button');
		button.style.background = this.classes[anno.class].stroke;

		for (let e of this.annotation.elements)
			e.setAttribute('data-class', anno.class);

		let post = {
			id: anno.id, idx: anno.idx, label: anno.label, description: anno.description, class: anno.class,
			publish: anno.publish, data: anno.data
		};
		if (this.enableState) post = { ...post, state: anno.state };
		// if (anno.light) post = { ...post, light: anno.light }; FIXME
		// if (anno.lens) post = { ...post, lens: anno.lens };

		//anno.bbox = anno.getBBoxFromElements();
		let serializer = new XMLSerializer();
		post.svg = `<svg xmlns="http://www.w3.org/2000/svg">
				${anno.elements.map((s) => { s.classList.remove('selected'); return serializer.serializeToString(s) }).join("\n")}  
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

	/**
	 * Deletes the selected annotation
	 * @returns {void}
	 */
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
		this.hideEditWidget();
	}

	/**
	 * Exports all annotations as SVG
	 * @returns {void}
	 */
	exportAnnotations() {
		let svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const bBox = this.layer.boundingBox();
		svgElement.setAttribute('viewBox', `0 0 ${bBox.xHigh - bBox.xLow} ${bBox.yHigh - bBox.yLow}`);
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

	/** @ignore */
	setActiveTool(e) {
		if (!this.editWidget) return;
		let tools = this.editWidget.querySelector('.openlime-annotation-edit-tools');
		tools.querySelectorAll('svg').forEach(a =>
			a.classList.remove('active'));
		if (e)
			e.classList.add('active');
	}

	/**
	 * Sets the active drawing tool
	 * @param {string} tool - Tool name ('point', 'pin', 'line', 'box', 'circle', 'erase', or null)
	 * @private
	 */
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

	/**
	 * Performs an undo operation
	 * @returns {void}
	 */
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
			this.updateEditWidget();
		}
	}

	/**
	 * Performs a redo operation
	 * @returns {void}
	 */
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
			this.updateEditWidget();
		}
	}

	/**
	 * Saves current annotation state to history
	 * @private
	 */
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
					this.setActiveTool();
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
		if (!['point', 'pin', 'line', 'erase'].includes(this.tool))
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

	/**
	 * Converts viewer coordinates to SVG coordinates
	 * @param {PointerEvent} event - Pointer event
	 * @returns {Object} Position in SVG coordinates with pixel size information
	 * @private
	 */
	mapToSvg(e) {
		const p = { x: e.offsetX, y: e.offsetY };
		const layerT = this.layer.transform;
		const useGL = false;
		const layerbb = this.layer.boundingBox();
		const layerSize = { w: layerbb.width(), h: layerbb.height() };
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
		const str = this.template(pos.x, pos.y);
		let parser = new DOMParser();
		let point = parser.parseFromString(str, "image/svg+xml").documentElement;
		//		this.annotation.elements.push(point);
		this.annotation.elements[0] = point;
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
			saveCurrent

			this.path = Util.createSVGElement('path', { d: `M${pos.x} ${pos.y}`, class: 'line' });
			return this.path;
		}
		let p = this.path.getAttribute('d');
		this.path.setAttribute('d', p + ` L${pos.x} ${pos.y}`);
		this.path.points = this.points;
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

export { EditorSvgAnnotation }