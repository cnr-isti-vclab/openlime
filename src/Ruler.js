import { Units } from './ScaleBar.js'


/* color is specified in the css under the .openlime-ruler selector */this

class Ruler extends Units {
	constructor(viewer, pixelSize, options) {
		super(options);
		Object.assign(this, {
			viewer: viewer,
			camera: viewer.camera,
			overlay: viewer.overlayElement,
			pixelSize: pixelSize,
			enabled: false,
			priority: 100,
			measure: null, //current measure
			history: [],  //past measures
			fontSize: 18,
			markerSize: 8,
			cursor: "crosshair",

			svg: null,
			first: null,
			second: null
		});
		if(options)
			Object.assign(this, options);
	}
	

	start() {
		this.enabled = true;
		this.previousCursor = this.overlay.style.cursor;
		this.overlay.style.cursor = this.cursor;

		if(!this.svg) {
			this.svg = createSVGElement('svg', { class: 'openlime-ruler'} );
			this.svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			this.svg.append(this.svgGroup);
			this.overlay.appendChild(this.svg);
			this.viewer.addEvent('draw', () => this.update());
			this.update();
		}
	}

	end() {
		this.enabled = false;
		this.overlay.style.cursor = this.previousCursor;
		this.clear();
	}
	

	clear() {
		this.svgGroup.replaceChildren([]);
		this.measure = null;
		this.history = [];
	}


	/*finish() {
		let m = this.measure;
		m.line = createSVGElement('line', { x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2 });
		this.svgGroup.appendChild(m.line);

		m.text = createSVGElement('text');
		m.text.textContent = this.format(this.length(m));
		this.svgGroup.appendChild(m.text);

		this.history.push(m);
		this.measure = null;
		this.update();
	}*/

	/** @ignore */
	update() {
		if(!this.history.length)
			return;
		//if not enabled skip
		let t = this.camera.getGlCurrentTransform(performance.now());
		let viewport = this.camera.glViewport();
		this.svg.setAttribute('viewBox', `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`);
		let c = [0, 0]; //this.boundingBox().corner(0);
		this.svgGroup.setAttribute("transform",
			`translate(${t.x} ${t.y}) rotate(${-t.a} 0 0) scale(${t.z} ${t.z}) translate(${c[0]} ${c[1]})`);

		for(let m of this.history) 
			this.updateMeasure(m, t);
	}
	/** @ignore */
	createMarker(x, y) {
		let m = createSVGElement("path");
		this.svgGroup.appendChild(m);
		return m;
	}
	/** @ignore */
	updateMarker(marker, x, y, size) {
		let d = `M ${x-size} ${y} L ${x+size} ${y} M ${x} ${y-size} L ${x} ${y+size}`;
		marker.setAttribute('d', d);
	}
	/** @ignore */
	updateText(measure, fontsize) {
		measure.text.setAttribute('font-size', fontsize + "px");
		
		let dx = measure.x1 - measure.x2;
		let dy = measure.y1 - measure.y2;

		let length = Math.sqrt(dx*dx + dy*dy);
		if(length > 0) {
			dx /= length;
			dy /= length;
		}
		if(dx < 0) {
			dx = -dx;
			dy = -dy;
		}

		let mx = (measure.x1 + measure.x2)/2;
		let my = (measure.y1 + measure.y2)/2;
		if(dy/dx < 0) {
			mx -= 0.25*dy*fontsize;
			my += dx*fontsize;
		} else {
			my -= 0.25*fontsize;
			mx += 0.25*fontsize;
		}
		measure.text.setAttribute('x', mx);
		measure.text.setAttribute('y', my);
		measure.text.textContent = this.format(length*this.pixelSize);
	}
	/** @ignore */
	createMeasure(x, y) {
		let m = {
			marker1: this.createMarker(x, y), 
			x1: x, y1: y,
			marker2: this.createMarker(x, y), 
			x2: x, y2: y
		};
		m.line = createSVGElement('line', { x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2 });
		this.svgGroup.appendChild(m.line);

		m.text = createSVGElement('text');
		m.text.textContent = '';
		this.svgGroup.appendChild(m.text);

		return m;
	}
	/** @ignore */
	updateMeasure(measure, transform) {
		let markersize = window.devicePixelRatio*this.markerSize/transform.z;

		this.updateMarker(measure.marker1, measure.x1, measure.y1, markersize);

		this.updateMarker(measure.marker2, measure.x2, measure.y2, markersize);

		let fontsize = window.devicePixelRatio*this.fontSize/transform.z;
		this.updateText(measure, fontsize);

		for(let p of ['x1', 'y1', 'x2', 'y2'])
			measure.line.setAttribute(p, measure[p]);
	}



	/** @ignore */
	fingerSingleTap(e) { 
		if(!this.enabled)
			return false;

		let transform = this.camera.getCurrentTransform(performance.now())
		let {x, y}  = this.camera.mapToScene(e.layerX, e.layerY, transform);

		
		if(!this.measure) {
			this.measure = this.createMeasure(x, y);
			this.history.push(this.measure);
		} else {
			this.measure.x2 = x;
			this.measure.y2 = y;
			this.measure = null;
		}
		this.update();
		e.preventDefault();
	}
	/** @ignore */
	fingerHover(e) {
		if(!this.enabled || !this.measure)
			return false;

		let transform = this.camera.getCurrentTransform(performance.now())
		let {x, y}  = this.camera.mapToScene(e.layerX, e.layerY, transform);
		this.measure.x2 = x;
		this.measure.y2 = y;
		this.update();	
		e.preventDefault();
	}
};

function createSVGElement(tag, attributes) {
	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
	if (attributes)
		for (const [key, value] of Object.entries(attributes))
			e.setAttribute(key, value);
	return e;
}


export { Ruler }
