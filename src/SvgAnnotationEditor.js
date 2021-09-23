import { SvgAnnotationLayer } from './SvgAnnotationLayer.js';
import { Annotation } from './Annotation.js';
import { Skin } from './Skin.js';
import { simplify, smooth, smoothToPath } from './Simplify.js'


class SvgAnnotationEditor {
	constructor(lime, layer, options) {
		this.layer = layer;
		Object.assign(this, {
			lime: lime,
			panning: false,
			tool: null, //doing nothing, could: ['line', 'polygon', 'point', 'box', 'circle']
			startPoint: null, //starting point for box and  circle
			currentLine: [],
			annotation: null,
			priority: 20000,
			multiple: true, //if true multiple elements per annotation.
			tools: {
				point: {
					img: '<svg width=24 height=24><circle cx=12 cy=12 r=3 fill="red" stroke="gray"/></svg>',
					tooltip: 'New point',
					tool: Point,
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
					tooltip: 'New line',
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
				}
			},
			annotation: null, //not null only when editWidget is shown.
			editWidget: null, 
			createCallback: null, //callbacks for backend
			updateCallback: null, 
			deleteCallback: null
		}, options);

		//at the moment is not really possible to unregister the events registered here.
		lime.pointerManager.onEvent(this);
		document.addEventListener('keyup', (e) => this.keyUp(e), false);
		layer.addEvent('selected', (anno) => {
			if(anno == this.annotation)
				return;
			this.showEditWidget(anno);
		});

		layer.annotationsEntry = () => {

			let entry =  {
				html: `<div class="openlime-tools"></div>`,
				list: [], //will be filled later.
				classes: 'openlime-annotations',
				status: () => 'active',
				oncreate: () => {
					if(Array.isArray(layer.annotations))
						layer.createAnnotationsList();

					let tools = {
						'add':    { action: () => { this.createAnnotation(); },  title: "New annotation" },
						'edit':   { action: () => { this.toggleEditWidget(); },  title: "Edit annotations" },
						'export': { action: () => { this.exportAnnotations(); }, title: "Export annotations" },
						'trash':  { action: () => { this.deleteSelected(); },    title: "Delete selected annotations" },
					};
					(async () => {
						
						for(const [label,tool] of Object.entries(tools)) {
							let icon = await Skin.appendIcon(entry.element.firstChild, '.openlime-' + label ); 
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

	createAnnotation() {
		let anno = this.layer.newAnnotation();
		anno.svg = "";
		if(this.createCallback) {
			let result = this.createCallback(anno);
			if(!result)
				alert("Failed to create annotation!");
		}
		this.showEditWidget(anno);
		this.layer.setSelected(anno);
	}
	

	toggleEditWidget() {
		if(this.annotation)
			return this.hideEditWidget();

		let id = this.layer.selected.values().next().value; 
		if(!id)
			return;
		
		let anno = this.layer.getAnnotationById(id);
		this.showEditWidget(anno);
	}

	showEditWidget(anno) {
		this.annotation = anno;
		this.layer.annotationsListEntry.element.querySelector('.openlime-edit').classList.add('active');
		(async () => { 
			await this.createEditWidget();
			this.editWidget.querySelector('[name=title]').value = anno.title;
			this.editWidget.querySelector('[name=description]').value = anno.description;
			this.editWidget.classList.remove('hidden');
		})();
	}

	hideEditWidget() {
		console.log('hide');
		this.annotation = null;
		this.editWidget.classList.add('hidden');
		this.layer.annotationsListEntry.element.querySelector('.openlime-edit').classList.remove('active');
	}


	async createEditWidget() {
		if(this.editWidget)
			return;

		let html = `
				<div class="openlime-annotation-edit">
					<span>Title:</span> <input name="title" type="text">
					<span>Description:</span> <input name="description" type="text">
					
					<div class="openlime-annotation-edit-tools"></div>
				</div>`;
		let template = document.createElement('template');
		template.innerHTML = html.trim();
		let edit = template.content.firstChild;
		document.querySelector('.openlime-layers-menu').appendChild(edit);
		
		let tools = edit.querySelector('.openlime-annotation-edit-tools');
		
		let setActive = e => { tools.querySelectorAll('svg').forEach(a => a.classList.remove('active')); if(e) e.classList.add('active'); };
		let draw = await Skin.appendIcon(tools, '.openlime-draw'); 
		draw.addEventListener('click', (e) => { this.setTool(this.annotation, 'line'); setActive(draw); });

		let pen = await Skin.appendIcon(tools, '.openlime-pen'); 
		pen.addEventListener('click', (e) => { this.setTool(this.annotation, 'pen'); setActive(pen); });

		let erase = await Skin.appendIcon(tools, '.openlime-erase'); 
		erase.addEventListener('click', (e) => { this.setTool(this.annotation, 'erase'); setActive(erase); });

		let undo = await Skin.appendIcon(tools, '.openlime-undo'); 
		undo.addEventListener('click', (e) => { this.undo(); });
		
		/*let ok = await Skin.appendIcon(tools, '.openlime-ok'); 
		ok.addEventListener('click', (e) => { setActive(); this.saveAnnotation(edit); });  */

		edit.querySelector('[name=title]').addEventListener('blur', (e) => { this.saveAnnotation(); });
		edit.querySelector('[name=description]').addEventListener('blur', (e) => { this.saveAnnotation(); });

		edit.classList.add('hidden');
		this.editWidget = edit;
	}




	saveAnnotation() {
		let edit = this.editWidget;
		let anno = this.annotation;
		anno.title = edit.querySelector('[name=title]').value;
		anno.description = edit.querySelector('[name=description]').value;

		//anno.bbox = anno.getBBoxFromElements();
		let serializer = new XMLSerializer();
		anno.svg = `<svg xmlns="http://www.w3.org/2000/svg">
				${anno.selector.elements.map((s) => { s.classList.remove('selected'); return serializer.serializeToString(s) }).join("\n")}  
				</svg>`;
		if(this.updateCallback) {
			let result = this.updateCallback(anno);
			if(!result) {
				alert("Failed to update annotation");
				return;
			}
		}
		//update the entry
		let template = document.createElement('template');
		template.innerHTML = this.layer.createAnnotationEntry(anno);
		let entry =  template.content.firstChild;
		//TODO find a better way to locate the entry!
		this.layer.annotationsListEntry.element.parentElement.querySelector(`[data-annotation="${anno.id}"]`).replaceWith(entry);
	}

	deleteSelected() {
		let id = this.layer.selected.values().next().value; 
		if(id) 
			this.deleteAnnotation(id);
	}

	deleteAnnotation(id) {
		let anno = this.layer.getAnnotationById(id);
		if(this.deleteCallback) {
			if(!confirm(`Deleting annotation ${anno.title}, are you sure?`))
				return;
			let result = this.deleteCallback(anno);
			if(!result)  {
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

	exportAnnotations() {
		let svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svgElement.setAttribute('viewBox', '0 0 256 256');

		let style = createElement('style');
		style.textContent = this.layer.style;
		svgElement.appendChild(style);

		let serializer = new XMLSerializer();
		//let svg = `<svg xmlns="http://www.w3.org/2000/svg">
		for(let anno of this.layer.annotations) {
			for(let e of anno.selector.elements) {
				if(e.tagName == 'path') {
					//Inkscape nitpicks on the commas in svg path.
					let d = e.getAttribute('d');
					e.setAttribute('d', d.replaceAll(',', ' '));
				}
				svgElement.appendChild(e.cloneNode());
			}
		}

		let svg = serializer.serializeToString(svgElement);
		/*(${this.layer.annotations.map(anno => {
			return `<group id="${anno.id}" title="${anno.title}" data-description="${anno.description}">
				${anno.selector.elements.map((s) => { 
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
	
	setTool(annotation, tool) {
		this.annotation = annotation;
		this.tool = tool;
		if (tool) {
			if (!tool in this.tools)
				throw "Unknown editor tool: " + tool;

			this.factory = new this.tools[tool].tool();
			this.factory.annotation = annotation;
		}
		document.querySelector('.openlime-overlay').classList.toggle('erase', tool =='erase');
		document.querySelector('.openlime-overlay').classList.toggle('crosshair', tool && tool !='erase');
	}

	undo() {
		if(this.tool) {
			let ok = this.factory.undo();
			if(!ok)
				this.annotation.selector.elements.pop();
			this.annotation.needsUpdate = true;
			this.lime.redraw();
		}
	}
	keyUp(e) {
		if (e.defaultPrevented) return;
		switch (e.key) {
			case 'Escape':
				if (this.tool) {
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
				if (!e.ctrlKey)
					break;
				this.undo();
				break;
		}
	}

	panStart(e) {
		if (e.buttons != 1 || e.ctrlKey || e.shiftKey || e.metaKey)
			return;
		if (!['line', 'erase', 'box', 'circle'].includes(this.tool))
			return;
		this.panning = true;
		e.preventDefault();

		const pos = this.mapToSvg(e);
		let shape = this.factory.create(pos);

		if(shape)
			this.annotation.selector.elements.push(shape);
		this.annotation.needsUpdate = true;

		this.lime.redraw();
	}

	panMove(e) {
		if (!this.panning)
			return false;

		const pos = this.mapToSvg(e);
		this.factory.adjust(pos);
	}

	panEnd(e) {
		if (!this.panning)
			return false;
		this.panning = false;

		const pos = this.mapToSvg(e);
		this.factory.finish(pos);

		this.annotation.needsUpdate = true;
		this.saveAnnotation();

	if (!this.multiple)
			this.setTool(null);
	}

	fingerSingleTap(e) {

		if (!['point', 'line'].includes(this.tool))
			return;
		e.preventDefault();

		const pos = this.mapToSvg(e);
		let shape = this.factory.tap(pos)

		if(shape)
			this.annotation.selector.elements.push(shape);
		this.annotation.needsUpdate = true;

		if (!this.multiple)
			this.setTool(null);
		this.lime.redraw();
	}

	mapToSvg(e) {
		let camera = this.lime.camera;
		let transform = camera.getCurrentTransform(performance.now());
		let pos = camera.mapToScene(e.offsetX, e.offsetY, transform);
		pos.x += this.layer.boundingBox().width() / 2;
		pos.y += this.layer.boundingBox().height() / 2;
		pos.z = transform.z;
		return pos;
	}
}

class Point {
	tap(pos) {
		//const pos = this.mapToSvg(e);
		let point = createElement('circle', { cx: pos.x, cy: pos.y, r: 10, class: 'point' });
		//point.classList.add('selected');
		return point;
	}
}

class Pen {
	constructor() {
		this.points = [];
	}
	create(pos) {
		this.points.push(pos);
		if(this.points.length == 1) {
			
			this.path = createElement('path', { d: `M${pos.x} ${pos.y}`, class: 'line' });
			return this.path;
		} 
		let p = this.path.getAttribute('d');
		this.path.setAttribute('d', p + ` L${pos.x} ${pos.y}`);
		this.path.points = this.points;
	}
	undo() {
		if(!this.points.length)
			return;
		this.points.pop();
		let d = this.points.map((p, i) => `${i == 0 ? 'M' : 'L'}${p.x} ${p.y}`).join(' ');
		this.path.setAttribute('d', d);
		
		if(this.points.length < 2) {
			this.points = [];
			return false;
		}
		return true;
	}
}


class Box {
	constructor() {
		this.origin = null;
		this.box = null;
	}

	create(pos) {
		this.origin = pos;
		this.box = createElement('rect', { x: pos.x, y: pos.y, width: 0, height: 0, class: 'rect' });
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

class Circle {
	constructor() {
		this.origin = null;
		this.circle = null;
	}
	create(pos) {
		this.origin = pos;
		this.circle = createElement('circle', { cx: pos.x, cy: pos.y, r: 0, class: 'circle' });
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

class Line {
	constructor() {
		this.points = [];
		this.history = [];
	}

	create(pos) {
		for(let e of this.annotation.selector.elements) {
			if(!e.points || e.points.length < 2)
				continue;
			if(Line.distance(e.points[0], pos)*pos.z < 5) {
				e.points.reverse();
				this.path = e;
				this.points = e.points;
				if(!this.history.length)
					this.history = [[...this.points]];
				this.path.setAttribute('d', this.svgPath());
				//reverse points!
				return;
			}
			if(Line.distanceToLast(e.points, pos) < 5) {
				this.path = e;
				this.points = e.points;
				if(!this.history.length)
				this.history = [[...this.points]];
				this.adjust(pos);
				return;
			}
		}
		this.history = [];
		this.points = [pos];
		this.path = createElement('path', { d: `M${pos.x} ${pos.y}`, class: 'line' });
		return this.path;
	}
	tap(pos) {
		if(!this.points.length)
			this.create(pos);
		else {
			this.history.push([...this.points]);
			this.adjust(pos);
		}
	}

	adjust(pos) {
		let gap = Line.distanceToLast(this.points, pos);
		if (gap * pos.z < 2) return;

		this.points.push(pos);

		let d = this.path.getAttribute('d');
		this.path.setAttribute('d', d + `L${pos.x} ${pos.y}`);
	}

	finish(pos) {
		//todo should pick the last one? or the smallest?
		/*let tolerance = 2 / this.points[0].z;
		let tmp = simplify(this.points, tolerance);

		let smoothed = smooth(tmp, 90, true);
		let d = smoothToPath(smoothed); */

		//this.path.setAttribute('data-points', this.path.getAttribute('d'));
		this.path.points = this.points;
		this.path.setAttribute('d', this.svgPath());
		this.history.push([...this.points]);
		return this.path;
	}
	undo() {
		if(this.history.length) {
			this.points = this.history.pop();
			this.path.points = this.points;
			this.path.setAttribute('d', this.svgPath());

			return true;
		} else {
			this.points = [];
			return false;
		}
	}

	svgPath() {
		let tolerance = 2 / this.points[0].z;
		let tmp = simplify(this.points, tolerance);

		let smoothed = smooth(tmp, 90, true);
		return smoothToPath(smoothed);
		
		return this.points.map((p, i) =>  `${(i == 0? "M" : "L")}${p.x} ${p.y}`).join(' '); 
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

class Erase {
	create(pos) { this.erase(pos); }
	adjust(pos) { this.erase(pos); }
	finish(pos) { this.erase(pos); }
	erase(pos) {
		for(let e of this.annotation.selector.elements) {
			let points = e.points;
			if(!points || !points.length)
				continue;
			if(Line.distanceToLast(points, pos) < 10)
				points.pop();
			else if(Line.distance(points[0], pos) < 10)
				points.shift();
			else
				continue;

			if(points.length <= 2) {
				e.points = [];
				e.setAttribute('d', '');
				this.annotation.needsUpdate = true;
				continue;
			}

			let tolerance = 2 / points[0].z;
			let tmp = simplify(points, tolerance);

			let smoothed = smooth(tmp, 90, true);
			let d = smoothToPath(smoothed);

			e.setAttribute('d', d);
		}
		this.annotation.selector.elements = this.annotation.selector.elements.filter(e => { return !e.points || e.points.length > 2; });
	}
}

//utils
function createElement(tag, attributes) {
	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
	if (attributes)
		for (const [key, value] of Object.entries(attributes))
			e.setAttribute(key, value);
	return e;
}



export { SvgAnnotationEditor }