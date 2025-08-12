import { Skin } from './Skin.js';
import { Util } from './Util.js';
import { simplify, smooth, smoothToPath } from './Simplify.js'
import { LayerSvgAnnotation } from './LayerSvgAnnotation.js'
import { CoordinateSystem } from './CoordinateSystem.js'

/**
 * EditorSvgAnnotation enables creation and editing of SVG annotations in OpenLIME.
 * Optimized version with simplified erase tool functionality.
 */
class EditorSvgAnnotation {
	constructor(viewer, layer, options) {
		this.layer = layer;
		Object.assign(this, {
			viewer: viewer,
			panning: false,
			tool: null,
			startPoint: null,
			currentLine: [],
			annotation: null,
			priority: 20000,
			pinSize: 36, // Default pin size in pixels at zoom level 1
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
					template: (x, y, annotation, size) => {
						const idx = annotation?.data?.idx || '?';
						return `<svg xmlns='http://www.w3.org/2000/svg' x='${x}' y='${y}' width='${size}' height='${size}' class='pin'
						viewBox='0 0 18 18'><path d='M 0,0 C 0,0 4,0 8,0 12,0 16,4 16,8 16,12 12,16 8,16 4,16 0,12 0,8 0,4 0,0 0,0 Z'/><text class='pin-text' x='7' y='8' text-anchor='middle' dominant-baseline='middle'>${idx}</text></svg>`;
					},
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
					tooltip: 'Erase elements',
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
			},
			annotation: null,
			enableState: false,
			customState: null,
			customData: null,
			editWidget: null,
			selectedCallback: null,
			createCallback: null,
			updateCallback: null,
			deleteCallback: null
		}, options);

		layer.style += Object.entries(this.classes).map((g) => {
			console.assert(g[1].hasOwnProperty('stroke'), "Classes needs a stroke property");
			return `[data-class=${g[0]}] { stroke:${g[1].stroke}; }`;
		}).join('\n');

		// Add default pin sizing based on zoom level - but more advanced
		if (!options.annotationUpdate) {
			layer.annotationUpdate = (anno, transform) => {
				this.updateAnnotationPins(anno, transform);
			};
		}

		// Register for pointer events
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
				list: [],
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
							let icon = await Skin.appendIcon(entry.element.firstChild, '.openlime-' + label);
							icon.setAttribute('title', tool.title);
							icon.addEventListener('click', tool.action);
						}
					})();
				}
			}
			layer.annotationsListEntry = entry;
			return entry;
		}

		// IMPORTANT: Capture clicks in capture phase for erase tool
		// This prevents the annotation layer from handling the click first
		this.viewer.containerElement.addEventListener('click', (ev) => {
			// Only process if erase tool is active AND we have an annotation selected
			if (this.tool !== 'erase' || !this.annotation) {
				return; // Let other handlers process the event normally
			}
			
			// Don't intercept clicks on UI elements (toolbar, menus, etc.)
			const target = ev.target;
			if (target && (
				target.closest('.openlime-toolbar') ||
				target.closest('.openlime-layers-menu') || 
				target.closest('.openlime-annotation-edit') ||
				target.classList.contains('openlime-tool') ||
				target.classList.contains('openlime-button') ||
				target.closest('button') ||
				target.closest('.openlime-dialog')
			)) {
				return; // Let UI elements handle their own clicks
			}
			
			// Find the target element
			const targetElement = this._findElementUnderPointer(ev);
			
			if (targetElement) {
				// Save current state for undo
				this.saveCurrent();
				
				// Remove element from annotation
				const index = this.annotation.elements.indexOf(targetElement);
				if (index > -1) {
					this.annotation.elements.splice(index, 1);
					
					// Check if annotation is now empty
					if (this.annotation.elements.length === 0) {
						// Remove the entire annotation instead of keeping empty annotation
						this.deleteAnnotation(this.annotation.id);
						
						// Hide edit widget since annotation is gone
						this.hideEditWidget();
					} else {
						// Save and update for non-empty annotations
						this.saveAnnotation();
						this.annotation.needsUpdate = true;
						this.viewer.redraw();
					}
				}
				
				// Stop event propagation to prevent other handlers
				ev.stopImmediatePropagation();
				ev.preventDefault();
			}
			// No target element found, let the click be handled normally
		}, true); // true = capture phase (runs before other event handlers)
	}

	/**
	 * Finds the SVG element under the pointer for erase tool
	 * @param {Event} e - The event object
	 * @private
	 */
	_findElementUnderPointer(e) {
		// Temporarily disable overlay pointer events
		const overlay = this.viewer?.overlayElement || document.querySelector('.openlime-overlay');
		const prevPointerEvents = overlay ? overlay.style.pointerEvents : null;
		if (overlay) {
			overlay.style.pointerEvents = 'none';
		}
		
		let targetElement = null;
		
		try {
			// Get element from document
			let element = document.elementFromPoint(e.clientX, e.clientY);
			
			// If we hit a shadow host, try to get element from shadow root
			if (element && element.shadowRoot) {
				const shadowElement = element.shadowRoot.elementFromPoint(e.clientX, e.clientY);
				if (shadowElement) {
					element = shadowElement;
				}
			}
			
			// Check if this element (or any parent) is in our annotation
			if (element && this.annotation && Array.isArray(this.annotation.elements)) {
				let current = element;
				const elementSet = new Set(this.annotation.elements);
				
				// Walk up the DOM tree
				while (current && current !== document) {
					if (elementSet.has(current)) {
						targetElement = current;
						break;
					}
					
					// Check if current element is a child of any annotation element
					for (const annotationEl of this.annotation.elements) {
						if (annotationEl.contains && annotationEl.contains(current)) {
							targetElement = annotationEl;
							break;
						}
					}
					
					if (targetElement) break;
					current = current.parentNode;
				}
			}
			
		} finally {
			// Restore overlay pointer events
			if (overlay) {
				overlay.style.pointerEvents = prevPointerEvents ?? '';
			}
		}
		
		return targetElement;
	}

	/**
	 * Calculates the correct pin size based on current zoom level
	 * @returns {number} Pin size in pixels
	 * @private
	 */
	getCurrentPinSize() {
		const transform = this.viewer.camera.getCurrentTransform(performance.now());
		return this.pinSize / transform.z;
	}

	/**
	 * Updates pin sizes in an annotation based on transform
	 * @param {Object} anno - Annotation object
	 * @param {Object} transform - Current transform
	 * @private
	 */
	updateAnnotationPins(anno, transform) {
		let size = this.pinSize / transform.z;
		if (size !== anno.previous_pin_size) {
			anno.elements.forEach(element => {
				if (element.classList.contains('pin')) {
					element.setAttribute('width', size + 'px');
					element.setAttribute('height', size + 'px');
				}
			});
			anno.previous_pin_size = size;
		}
	}

	/**
	 * Creates a new annotation with correct initial state
	 * @returns {void}
	 */
	createAnnotation() {
		let anno = this.layer.newAnnotation();
		if (this.customData) this.customData(anno);
		if (this.enableState) this.setAnnotationCurrentState(anno);
		anno.data.idx = this.layer.annotations.length;
		anno.publish = 1;
		anno.label = anno.description = anno.class = '';
		let post = {
			id: anno.id, label: anno.label, description: anno.description, 'class': anno.class, svg: null,
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

	toggleEditWidget() {
		if (this.annotation)
			return this.hideEditWidget();

		let id = this.layer.selected.values().next().value;
		if (!id)
			return;

		let anno = this.layer.getAnnotationById(id);
		this.showEditWidget(anno);
	}

	updateEditWidget() {
		let anno = this.annotation;
		let edit = this.editWidget;
		if (!anno.class)
			anno.class = '';
		edit.querySelector('[name=label]').value = anno.label || '';
		edit.querySelector('[name=description]').value = anno.description || '';
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

	showEditWidget(anno) {
		this.annotation = anno;
		
		// Add reference to editor for pin size calculations
		anno.editor = this;
		
		this.setTool(null);
		this.setActiveTool();
		this.layer.annotationsListEntry.element.querySelector('.openlime-edit').classList.add('active');
		(async () => {
			await this.createEditWidget();
			this.updateEditWidget();
		})();
	}

	hideEditWidget() {
		this.annotation = null;
		this.setTool(null);
		if (this.editWidget) {
			this.editWidget.classList.add('hidden');
		}
		this.layer.annotationsListEntry.element.querySelector('.openlime-edit').classList.remove('active');
	}

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
		pin.addEventListener('click', (e) => {
			if (this.tool === 'pin') { this.setTool(null); this.setActiveTool(); }
			else { this.setTool('pin'); this.setActiveTool(pin); }
		});

		let draw = await Skin.appendIcon(tools, '.openlime-draw');
		draw.addEventListener('click', (e) => {
			if (this.tool === 'line') { this.setTool(null); this.setActiveTool(); }
			else { this.setTool('line'); this.setActiveTool(draw); }
		});

		let erase = await Skin.appendIcon(tools, '.openlime-erase');
		erase.addEventListener('click', (e) => {
			if (this.tool === 'erase') { this.setTool(null); this.setActiveTool(); }
			else { this.setTool('erase'); this.setActiveTool(erase); }
		});

		let undo = await Skin.appendIcon(tools, '.openlime-undo');
		undo.addEventListener('click', (e) => { this.undo(); });

		let redo = await Skin.appendIcon(tools, '.openlime-redo');
		redo.addEventListener('click', (e) => { this.redo(); });

		// Setup form field event listeners
		this._setupFormEventListeners(edit);

		edit.classList.add('hidden');
		this.editWidget = edit;
	}

	_setupFormEventListeners(edit) {
		let label = edit.querySelector('[name=label]');
		label.addEventListener('blur', (e) => { 
			if (this.annotation.label != label.value) {
				this.saveCurrent(); 
				this.saveAnnotation(); 
			}
		});

		let descr = edit.querySelector('[name=description]');
		descr.addEventListener('blur', (e) => { 
			if (this.annotation.description != descr.value) {
				this.saveCurrent(); 
				this.saveAnnotation(); 
			}
		});

		let idx = edit.querySelector('[name=data-data-idx]');
		if (idx) {
			idx.addEventListener('blur', (e) => {
				if (this.annotation.data.idx != idx.value) {
					const svgPinIdx = this.annotation.elements[0];
					if (svgPinIdx) {
						const txt = svgPinIdx.querySelector(".pin-text");
						if (txt) {
							txt.textContent = idx.value;
						}
					}
					this.saveCurrent();
					this.saveAnnotation();
				}
			});
		}

		Object.entries(this.annotation.data).map(k => {
			let dataElm = edit.querySelector(`[name=data-data-${k[0]}]`);
			if (dataElm) {
				dataElm.addEventListener('blur', (e) => { 
					if (this.annotation.data[k[0]] != dataElm.value) {
						this.saveCurrent(); 
						this.saveAnnotation(); 
					}
				});
			}
		});

		let classes = edit.querySelector('[name=classes]');
		classes.addEventListener('change', (e) => { 
			if (this.annotation.class != classes.value) {
				this.saveCurrent(); 
				this.saveAnnotation(); 
			}
		});

		let publish = edit.querySelector('[name=publish]');
		publish.addEventListener('change', (e) => { 
			if (this.annotation.publish != (publish.checked ? 1 : 0)) {
				this.saveCurrent(); 
				this.saveAnnotation(); 
			}
		});
	}

	setAnnotationCurrentState(anno) {
		anno.state = window.structuredClone(this.viewer.canvas.getState());
		if (this.customState) this.customState(anno);
	}

	saveAnnotation() {
		let edit = this.editWidget;
		let anno = this.annotation;

		anno.label = edit.querySelector('[name=label]').value || '';
		anno.description = edit.querySelector('[name=description]').value || '';
		Object.entries(anno.data).map(k => {
			const element = edit.querySelector(`[name=data-data-${k[0]}]`);
			if (element) {
				anno.data[k[0]] = element.value || '';
			}
		});
		anno.publish = edit.querySelector('[name=publish]').checked ? 1 : 0;
		let select = edit.querySelector('[name=classes]');
		anno.class = select.value || '';

		let button = edit.querySelector('.openlime-select-button');
		button.style.background = this.classes[anno.class].stroke;

		for (let e of this.annotation.elements)
			e.setAttribute('data-class', anno.class);

		let post = {
			id: anno.id, label: anno.label, description: anno.description, class: anno.class,
			publish: anno.publish, data: anno.data
		};
		if (this.enableState) post = { ...post, state: anno.state };

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
		}

		// Recreate the annotations list
		if (this.layer.annotationsListEntry && this.layer.annotationsListEntry.element && this.layer.annotationsListEntry.element.parentElement) {
			const list = this.layer.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
			if (list) {
				const selectContainer = list.querySelector('.openlime-annotations-select');
				const wasActive = selectContainer && selectContainer.classList.contains('active');

				if (selectContainer && selectContainer._cleanup) {
					selectContainer._cleanup();
				}

				this.layer.createAnnotationsList();

				if (wasActive) {
					const newSelectContainer = list.querySelector('.openlime-annotations-select');
					if (newSelectContainer) {
						newSelectContainer.classList.add('active');
					}
				}
			}
		}

		this.layer.setSelected(anno);
	}

	deleteSelected() {
		let id = this.layer.selected.values().next().value;
		if (id)
			this.deleteAnnotation(id);
	}

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
		
		// Remove SVG elements from the canvas
		this.layer.svgGroup.querySelectorAll(`[data-annotation="${anno.id}"]`).forEach(e => e.remove());

		// Remove entry from the list
		let list = this.layer.annotationsListEntry.element.parentElement.querySelector('.openlime-list');
		list.querySelectorAll(`[data-annotation="${anno.id}"]`).forEach(e => e.remove());

		this.layer.annotations = this.layer.annotations.filter(a => a !== anno);
		this.layer.clearSelected();
		this.hideEditWidget();
	}

	exportAnnotations() {
		let svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		const bBox = this.layer.boundingBox();
		svgElement.setAttribute('viewBox', `0 0 ${bBox.xHigh - bBox.xLow} ${bBox.yHigh - bBox.yLow}`);
		let style = Util.createSVGElement('style');
		style.textContent = this.layer.style;
		svgElement.appendChild(style);
		let serializer = new XMLSerializer();
		
		for (let anno of this.layer.annotations) {
			for (let e of anno.elements) {
				if (e.tagName == 'path') {
					let d = e.getAttribute('d');
					e.setAttribute('d', d.replaceAll(',', ' '));
				}
				svgElement.appendChild(e.cloneNode());
			}
		}
		let svg = serializer.serializeToString(svgElement);

		var e = document.createElement('a');
		e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(svg));
		e.setAttribute('download', 'annotations.svg');
		e.style.display = 'none';
		document.body.appendChild(e);
		e.click();
		document.body.removeChild(e);
	}

	setActiveTool(e) {
		if (!this.editWidget) return;
		let tools = this.editWidget.querySelector('.openlime-annotation-edit-tools');
		tools.querySelectorAll('svg').forEach(a =>
			a.classList.remove('active'));
		if (e)
			e.classList.add('active');
	}

	setTool(tool) {
		this.tool = tool;
		if (this.factory && this.factory.quit)
			this.factory.quit();
		if (tool) {
			if (!(tool in this.tools)) throw "Unknown editor tool: " + tool;

			this.factory = new this.tools[tool].tool(this.tools[tool]);
			this.factory.annotation = this.annotation;
			this.factory.layer = this.layer;
			
			// Add reference to editor for pin size calculations
			if (this.annotation) {
				this.annotation.editor = this;
			}
		}
		document.querySelector('.openlime-overlay').classList.toggle('erase', tool == 'erase');
		document.querySelector('.openlime-overlay').classList.toggle('crosshair', tool && tool != 'erase');
	}

	// UNDO/REDO SYSTEM
	undo() {
		let anno = this.annotation;
		if (!anno) return;
		
		if (this.factory && this.factory.undo && this.factory.undo()) {
			anno.needsUpdate = true;
			this.viewer.redraw();
			return;
		}

		if (anno.history && anno.history.length) {
			anno.future.push(this.annoToData(anno));
			let data = anno.history.pop();
			this.dataToAnno(data, anno);
			anno.needsUpdate = true;
			this.viewer.redraw();
			this.updateEditWidget();
		}
	}

	redo() {
		let anno = this.annotation;
		if (!anno) return;
		
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

	saveCurrent() {
		let anno = this.annotation;
		if (!anno.history) anno.history = [];
		anno.history.push(this.annoToData(anno));
		anno.future = [];
	}

	annoToData(anno) {
		let data = {};
		for (let i of ['id', 'label', 'description', 'class', 'publish', 'data'])
			data[i] = `${anno[i] || ''}`;
		data.elements = anno.elements.map(e => { 
			let n = e.cloneNode(); 
			n.points = e.points; 
			return n; 
		});
		return data;
	}

	dataToAnno(data, anno) {
		for (let i of ['id', 'label', 'description', 'class', 'publish', 'data'])
			anno[i] = `${data[i]}`;
		anno.elements = data.elements.map(e => { 
			let n = e.cloneNode(); 
			n.points = e.points; 
			return n; 
		});
	}

	// EVENT HANDLERS
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
			case 'z':
				if (e.ctrlKey) this.undo();
				break;
			case 'Z':
				if (e.ctrlKey) this.redo();
				break;
		}
	}

	panStart(e) {
		if (e.buttons != 1 || e.ctrlKey || e.altKey || e.shiftKey || e.metaKey)
			return;
		if (!['line', 'box', 'circle'].includes(this.tool))
			return;
		this.panning = true;
		e.preventDefault();

		this.saveCurrent();
		const pos = this.mapToSvg(e);
		let shape = this.factory.create(pos, e);
		this.annotation.needsUpdate = true;
		this.viewer.redraw();
	}

	panMove(e) {
		if (!this.panning) return false;
		const pos = this.mapToSvg(e);
		this.factory.adjust(pos, e);
	}

	panEnd(e) {
		if (!this.panning) return false;
		this.panning = false;

		const pos = this.mapToSvg(e);
		let changed = this.factory.finish(pos, e);
		if (!changed) {
			this.annotation.history.pop();
		} else {
			this.saveAnnotation();
		}
		this.annotation.needsUpdate = true;
		this.viewer.redraw();
	}

	fingerHover(e) {
		if (this.tool != 'line') return;
		e.preventDefault();
		const pos = this.mapToSvg(e);
		let changed = this.factory.hover(pos, e);
		this.annotation.needsUpdate = true;
		this.viewer.redraw();
	}

	fingerSingleTap(e) {
		if (!['point', 'pin', 'line', 'erase'].includes(this.tool))
			return;
		e.preventDefault();

		// For erase tool, ensure we have an annotation and factory
		if (this.tool === 'erase' && (!this.annotation || !this.factory)) {
			return;
		}

		this.saveCurrent();

		const pos = this.mapToSvg(e);
		let changed = this.factory.tap(pos, e);
		
		if (!changed) {
			this.annotation.history.pop();
		} else {
			this.saveAnnotation();
		}
		this.annotation.needsUpdate = true;
		this.viewer.redraw();
	}

	fingerDoubleTap(e) {
		if (!['line'].includes(this.tool)) return;
		e.preventDefault();

		this.saveCurrent();
		const pos = this.mapToSvg(e);
		let changed = this.factory.doubleTap(pos, e);
		
		if (!changed) {
			this.annotation.history.pop();
		} else {
			this.saveAnnotation();
		}
		this.annotation.needsUpdate = true;
		this.viewer.redraw();
	}

	mapToSvg(e) {
		// For erase tool, find the element under the pointer
		if (this.tool === 'erase') {
			e.targetElement = this._findElementUnderPointer(e);
		}

		const p = { x: e.offsetX, y: e.offsetY };
		const layerT = this.layer.transform;
		const useGL = false;
		const layerbb = this.layer.boundingBox();
		const layerSize = { w: layerbb.width(), h: layerbb.height() };
		let pos = CoordinateSystem.fromCanvasHtmlToImage(p, this.viewer.camera, layerT, layerSize, useGL);
		p.x += 1;
		let pos1 = CoordinateSystem.fromCanvasHtmlToImage(p, this.viewer.camera, layerT, layerSize, useGL);
		pos.pixelSize = Math.abs(pos1.x - pos.x);
		return pos;
	}
}

// TOOL CLASSES
class Point {
	tap(pos) {
		let point = Util.createSVGElement('circle', { cx: pos.x, cy: pos.y, r: 10, class: 'point' });
		this.annotation.elements.push(point);
		return true;
	}
}

class Pin {
	constructor(options) {
		Object.assign(this, options);
	}
	tap(pos) {
		// Calculate correct pin size for current zoom level
		const currentSize = this.annotation.editor?.getCurrentPinSize() || 36;
		
		const str = this.template(pos.x, pos.y, this.annotation, currentSize);
		let parser = new DOMParser();
		let point = parser.parseFromString(str, "image/svg+xml").documentElement;
		
		// Add reference to editor for future updates
		if (!this.annotation.editor) {
			// Find the editor instance from the factory
			if (this.layer && this.layer.editor) {
				this.annotation.editor = this.layer.editor;
			}
		}
		
		// Add to elements array
		this.annotation.elements.push(point);
		return true;
	}
}

class Pen {
	constructor() {
		this.points = [];
	}
	create(pos) {
		this.points.push(pos);
		if (this.points.length == 1) {
			this.path = Util.createSVGElement('path', { d: `M${pos.x} ${pos.y}`, class: 'line' });
			return this.path;
		}
		let p = this.path.getAttribute('d');
		this.path.setAttribute('d', p + ` L${pos.x} ${pos.y}`);
		this.path.points = this.points;
	}
	undo() {
		if (!this.points.length) return;
		this.points.pop();
		let d = this.points.map((p, i) => `${i == 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
		this.path.setAttribute('d', d);

		if (this.points.length < 2) {
			this.points = [];
			this.annotation.elements = this.annotation.elements.filter((e) => e != this.path);
		}
	}
}

class Box {
	constructor() {
		this.origin = null;
		this.box = null;
	}

	create(pos) {
		this.origin = pos;
		this.box = Util.createSVGElement('rect', { x: pos.x, y: pos.y, width: 0, height: 0, class: 'rect' });
		this.annotation.elements.push(this.box);
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
		return true;
	}
}

class Circle {
	constructor() {
		this.origin = null;
		this.circle = null;
	}
	create(pos) {
		this.origin = pos;
		this.circle = Util.createSVGElement('circle', { cx: pos.x, cy: pos.y, r: 0, class: 'circle' });
		this.annotation.elements.push(this.circle);
		return this.circle;
	}
	adjust(pos) {
		let p = this.origin;
		let r = Math.hypot(pos.x - p.x, pos.y - p.y);
		this.circle.setAttribute('r', r);
	}
	finish() {
		return true;
	}
}

class Line {
	constructor() {
		this.history = []
	}
	create(pos) {
		for (let e of this.annotation.elements) {
			if (!e.points || e.points.length < 2)
				continue;
			if (Line.distance(e.points[0], pos) / pos.pixelSize < 5) {
				e.points.reverse();
				this.path = e;
				this.path.setAttribute('d', Line.svgPath(e.points));
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
		if (!this.path) return false;
		if (this.adjust(pos)) {
			this.history = [this.path.points.length - 1];
			this.path = null;
		}
		return false;
	}

	hover(pos, event) {
		return;
	}

	quit() {
		return;
	}

	adjust(pos) {
		let gap = Line.distanceToLast(this.path.points, pos);
		if (gap / pos.pixelSize < 4) return false;

		this.path.points.push(pos);
		this.path.setAttribute('d', Line.svgPath(this.path.points));
		return true;
	}

	finish() {
		this.path.setAttribute('d', Line.svgPath(this.path.points));
		return true;
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

	static svgPath(points) {
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

/**
 * Simplified Erase class that removes entire SVG elements
 */
class Erase {
	tap(pos, event) {
		// Get the target element from the event (set in mapToSvg)
		const targetElement = event.targetElement;
		
		if (!targetElement) {
			return false; // No element found under pointer
		}

		// Simply remove from annotation elements array
		const index = this.annotation.elements.indexOf(targetElement);
		if (index > -1) {
			this.annotation.elements.splice(index, 1);
			
			// Mark annotation as needing update so it gets redrawn
			this.annotation.needsUpdate = true;
			return true; // Element was successfully removed
		}

		return false;
	}

	// These methods are required by the factory system but not used for simple erase
	create(pos, event) { return this.tap(pos, event); }
	adjust(pos, event) { return false; }
	finish(pos, event) { return false; }
}

export { EditorSvgAnnotation }