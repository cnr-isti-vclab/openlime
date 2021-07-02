import { Annotation } from './Annotation.js'
import { simplify, smooth, smoothToPath, simplifyLineRDP } from './Simplify.js'

/**annotation editor interface:
   click a button and we get into a modality:
      new line: when user pan start start drawing a line. on end can eigher get out or remain in this mode until a new button  is pressed (or ex)
	  new box (same thing)
	  new polygon: just finget SingleTab. how to finish? either click on first point, hit esc or enter doubleclick.
	  new point (just fingerSingleTap) (and you can zoom)

	problems: allow pan and drawing at the same time! especially in the line after line mode: 
	   middle mouse for panning (two fingers for mobile?)

	events:
		modeChanged: when entering some editing mode (point, line etc.)
		createAnnotation(editor, annotation)
		deleteAnnotation(editor, annotation)
		updateAnnotation(editor, annotation)

		Annotation parameter is a json containing all the data of the annotation (see Annotation.js)
*/
class AnnotationEditor {
	constructor(lime, options) {
		Object.assign(this, {
			lime: lime,
			panning: false,
			tool: null, //doing nothing, could: ['line', 'polygon', 'point', 'box', 'circle']
			startPoint: null, //starting point for box and  circle
			currentLine: [],
			currentElement: null,
			currentAnnotation: null,
			priority: 20000,
			multiple: false, //if true multiple elements per annotation.
			signals: {'toolChanged':[], 'createAnnotation':[], 'deleteAnnotation':[], 'updateAnnotation':[]},
			tools: { 
				point: { 
					img: '<svg width=24 height=24><circle cx=12 cy=12 r=3 fill="red" stroke="gray"/></svg>',
					tooltip: 'New point',
					tool: Point,
				},
				line: {
					img: `<svg width=24 height=24>
							<path d="m 4.7,4.5 c 0.5,4.8 0.8,8.5 3.1,11 2.4,2.6 4.2,-4.8 6.3,-5 2.7,-0.3 5.1,9.3 5.1,9.3" stroke-width="3" fill="none" stroke="grey"/>
							<path d="m 4.7,4.5 c 0.5,4.8 0.8,8.5 3.1,11 2.4,2.6 4.2,-4.8 6.3,-5 2.7,-0.3 5.1,9.3 5.1,9.3" stroke-width="1" fill="none" stroke="red"/></svg>`,
					tooltip: 'New line',
					tool: Line,
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
			}
		});
		if(options)
			Object.assign(this, options);
		
		//at the moment is not really possible to unregister the events registered here.
		this.lime.pointerManager.onEvent(this);
		document.addEventListener('keyup', (e) => { this.keyEvent(e); });
	}
	addEvent(event, callback) { this.signals[event].push(callback); }
	emit(event, ...parameters) { for(let r of this.signals[event]) r(this, ...parameters); }

	setTool(layer, tool) {
		this.layer = layer;
		this.tool = tool;
		this.currentAnnotation = null;
		if(tool) {

			if(!tool in this.tools)
				throw "Unknown editor tool: " + tool;

			this.factory = new this.tools[tool].tool;
		}
		this.emit('toolChanged');
	}

	menuWidget(layer) {
		let menu = [];
		for(const [id, tool] of Object.entries(this.tools))
			menu.push({
				button: tool.img,
				tooltip: tool.tooltip,
				onclick: () => { this.setTool(layer, id); },
				status: () => this.tool == id ? 'active': '' ,
				classes: 'openlime-tool'
			});

		let toolbar = {
			html: '',
			classes: 'openlime-tools',
			list: menu,
			status: () => 'active'
		};	
		return toolbar;
	}

	keyEvent(e) {
		console.log(e);
		switch(e.key) {
		case 'Escape':
			if(this.tool)
				this.setTool(null, null);
			break;
		case 'Delete':
		case 'Backspace':
			break;	
		}
	}

	panStart(e) {
		//console.log(e.composedPath());
		if(!['line', 'box', 'circle'].includes(this.tool))
			return;
		this.panning = true;
		e.preventDefault();

		const pos = this.mapToSvg(e);
		let svg = createElement('svg');
		svg.appendChild(this.factory.create(pos));

		this.currentAnnotation = new Annotation({element: svg});
		this.layer.annotations.push(this.currentAnnotation);
		this.lime.redraw();
	}

	panMove(e) {
		if(!this.panning)
			return false;

		const pos = this.mapToSvg(e);
		this.factory.adjust(pos);
	}

	panEnd(e) {
		if(!this.panning)
			return false;
		this.panning = false;

		const pos = this.mapToSvg(e);
		this.factory.finish(pos);
		this.layer.emit('createAnnotation', this.currentAnnotation);

		if(!this.multiple)
			this.setTool(null, null);
	}

	fingerSingleTap(e) {
		if(!this.layer) return true;
		
//		console.log("Editor:", e, e.composedPath());

		if(!['point', 'polygon'].includes(this.tool))
			return;
		e.preventDefault();

		const pos = this.mapToSvg(e);
		let svg = createElement('svg');
		svg.appendChild(this.factory.create(pos));

		this.currentAnnotation = new Annotation({element: svg});
		this.layer.annotations.push(this.currentAnnotation);
		this.layer.emit('createAnnotation', this.currentAnnotation);

		if(!this.multiple)
			this.setTool(null, null);
		this.lime.redraw();
	}

	mapToSvg(e) {
		let camera = this.lime.camera;
		let transform = camera.getCurrentTransform(performance.now());
		let pos = camera.mapToScene(e.offsetX, e.offsetY, transform);
		pos.x += this.layer.boundingBox().width()/2;
		pos.y += this.layer.boundingBox().height()/2;
		pos.z = transform.z;
		return pos;
	}
}

class Point {
	create(pos) {
		//const pos = this.mapToSvg(e);
		let point = createElement('circle', { cx: pos.x, cy: pos.y, r: 10, class:'point' });
		//point.classList.add('selected');
		return point;
	}
}

class Box {
	constructor() {
		this.origin = null;
		this.box = null;
	}

	create(pos) {
		this.origin = pos;
		this.box = createElement('rect', { x: pos.x, y: pos.y, width: 0, height: 0 });
		//this.box.classList.add('selected');
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
	}
}

class Circle {
	constructor() {
		this.origin = null;
		this.circle = null;
	}
	create(pos) {
		this.origin = pos;
		this.circle = createElement('circle', { cx: pos.x, cy: pos.y, r: 0 });
		//this.circle.classList.add('selected');
		return this.circle;
	}
	adjust(pos) {
		let p = this.origin;
		let r = Math.hypot(pos.x - p.x, pos.y - p.y);
		this.circle.setAttribute('r', r);
	}
	finish() {
	}
}

class Line {
	constructor() {
		this.points = [];
	}

	create(pos) {
		this.points = [pos];
		this.path = createElement('path', { d: `M${pos.x} ${pos.y}` });
		//this.path.classList.add('selected');
		return this.path;
	}

	adjust(pos) {
		let gap = this.distanceToLast(this.points, pos);
		if(gap*pos.z < 2) return;

		this.points.push(pos);

		let d = this.path.getAttribute('d');
		this.path.setAttribute('d', d + `L${pos.x} ${pos.y}`);
	}

	finish(pos) {
		//todo should pick the last one? or the smallest?
		let tolerance = 2/this.points[0].z;
		let tmp = simplify(this.points, tolerance);

		let smoothed = smooth(tmp, 90, true);
		let d = smoothToPath(smoothed);

		this.path.setAttribute('d', d);
	}

	distanceToLast(line, point) {
		let last = line[line.length-1];
		let dx = last.x - point.x;
		let dy = last.y - point.y; 
		return Math.sqrt(dx*dx + dy*dy);
	}
}

//utils
function createElement(tag, attributes) {
	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
	if(attributes)
		for(const [key, value] of Object.entries(attributes))
			e.setAttribute(key, value);
	return e;
}



export { AnnotationEditor }
