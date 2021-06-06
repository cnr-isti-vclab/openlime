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

	
*/
class AnnotationEditor {
	constructor(lime, options) {
		Object.assign(this, {
			lime: lime,
			panning: false,
			mode: null, //doing nothing, could: ['line', 'polygon', 'point', 'box', 'circle']
			startPoint: null, //starting point for box and  circle
			currentLine: [],
			currentElement: null,
			currentAnnotation: null,
			priority: 20000,
			multiple: false, //if true multiple elements per annotation.
			signals: {'modeChanged':[]}
		});
		if(options)
			Object.assign(this, options);
		
		lime.pointerManager.onEvent(this);
	}
	addEvent(event, callback) { this.signals[event].push(callback); }
	emit(event) { for(let r of this.signals[event]) r(this); }

	setMode(layer, mode) {
		this.layer = layer;
		this.mode = mode;
		this.currentAnnotation = null;
		if(!mode)
			return;

		let modes = { 'point': Point, 'circle': Circle, 'box': Box, 'line': Line };
		if(!mode in modes)
			throw "Unknown editor mode: " + mode;

		this.factory = new modes[mode]();

		this.emit('modeChanged');
	}

	panStart(e) {
		//console.log(e.composedPath());
		if(!['line', 'box', 'circle'].includes(this.mode))
			return;
		this.panning = true;
		e.preventDefault();

		const pos = this.mapToSvg(e);
		let svg = createElement('svg');
		svg.appendChild(this.factory.create(pos));

		let annotation = new Annotation({element: svg});
		this.layer.annotations.push(annotation);
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

		if(!this.multiple)
			this.setMode(null, null);
	}

	fingerSingleTap(e) {
		if(!this.layer) return true;
		
//		console.log("Editor:", e, e.composedPath());

		if(!['point', 'polygon'].includes(this.mode))
			return;
		e.preventDefault();

		const pos = this.mapToSvg(e);
		let svg = createElement('svg');
		svg.appendChild(this.factory.create(pos));

		let annotation = new Annotation({element: svg});
		this.layer.annotations.push(annotation);
		if(!this.multiple)
			this.setMode(null, null);
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
		return  createElement('circle', { cx: pos.x, cy: pos.y, r: 200 });
	}
}

class Box {
	constructor() {
		this.origin = null;
		this.box = null;
	}

	create(pos) {
		this.origin = pos;
		return this.box = createElement('rect', { x: pos.x, y: pos.y, width: 0, height: 0 });
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
		return this.circle = createElement('circle', { cx: pos.x, cy: pos.y, r: 0 });
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
		return this.path = createElement('path', { d: `M${pos.x} ${pos.y}` });
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