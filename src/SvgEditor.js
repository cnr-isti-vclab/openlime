/* Here we have the primitives to edit SVG annotation, but we don't handle events

1) create a box: mouse down - drag - mouse up -> create element with handles
				 click - (cancel) click -> same

2) in case we can import an existing annotation, work and export the result

3) support for circle, straight line, text, curves, eraser etc.

*/

class SvgEditor {
	constructor(viewer, layer) {
		Object.assign(this, {
			viewer: viewer,
			layer: layer,
			annotation: null,   //FIXME: should only be the elements? not null only when editWidget is shown.
			panning: false,
			tool: null, 
			priority: 20000,
			
			tools: {
				point: new Point(),
				box: new Box(),
				circle: new Circle(),
				pin: new Pin(),
				pen: new Pen(),
				line: new Line(),
				erase: new Erase(),
			},
			enableState: false, //should be in SvgLayerUI
			customState: null,
			customData: null
		});

		viewer.pointerManager.onEvent(this);
		document.addEventListener('keyup', (e) => this.keyUp(e), false);
	}



	/** @ignore */
	setTool(tool) {
		if (this.tool && this.tool.quit)
			this.tool.quit();

		if(!tool) {
			this.tool = null;
			return;
		}
		if (!tool in this.tools)
			throw "Unknown editor tool: " + tool;

		this.tool = this.tools[tool];

		document.querySelector('.openlime-overlay').classList.toggle('erase', tool == 'erase');
		document.querySelector('.openlime-overlay').classList.toggle('crosshair', tool && tool != 'erase');
	}


	/** @ignore */
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
		if(!this.tool) return;
		if(!this.tool.draggable)
			return;
		
		this.panning = true;
		e.preventDefault();

//		this.saveCurrent();

		const pos = this.mapToSvg(e);
		let shape = this.tool.create(pos, e);
		this.annotation.elements.push(shape);
		this.annotation.needsUpdate = true;

		this.viewer.redraw();
	}

	/** @ignore */
	panMove(e) {
		if (!this.panning)
			return false;

		const pos = this.mapToSvg(e);
		this.tool.adjust(pos, e);
	}

	/** @ignore */
	panEnd(e) {
		if (!this.panning)
			return false;
		this.panning = false;

		const pos = this.mapToSvg(e);
		let changed = this.tool.finish(pos, e);
/*		if (!changed) //nothing changed no need to keep current situation in history.
			this.annotation.history.pop();
		else
			this.saveAnnotation(); */
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

		/** @ignore */
	mapToSvg(e) {
		let camera = this.viewer.camera;
		let transform = camera.getCurrentTransform(performance.now());
		let pos = camera.mapToScene(e.offsetX, e.offsetY, transform);
		const topLeft = this.layer.boundingBox().corner(0);
		pos.x -= topLeft[0]; 
		pos.y -= topLeft[1];
		pos.z = transform.z;
		return pos;
	}
	
};
				
/** @ignore */
class Box {
	constructor() {
		this.origin = null;
		this.box = null;
		this.draggable = true;
	}

	create(pos) {
		this.origin = pos;
		this.box = createSVGElement('rect', { x: pos.x, y: pos.y, width: 0, height: 0, class: 'rect' });
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

class Point {
	constructor() {}
}

class Pen {
}

class Line {
}

class Circle {
}

class Pin {
}

class Erase {
}
//FIXME! Again!
function createSVGElement(tag, attributes) {
	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
	if (attributes)
		for (const [key, value] of Object.entries(attributes))
			e.setAttribute(key, value);
	return e;
}


export { SvgEditor }