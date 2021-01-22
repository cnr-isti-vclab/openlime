
class Canvas {
	constructor(element, options) {
		console.log("Canvas constructor");
		
		this.initElement(element);
		this.viewport = [0, 0, 0, 0];
	}

	resize(width, height) {
		this.canvas.width = width;
		this.canvas.height = height;

//		this.layers.forEach((layer) => { layer.prefetch(); });
		this.redraw();
	}

	initElement(element) {
		if(!element)
			throw "Missing element parameter"

		if(typeof(element) == 'string') {
			element = document.querySelector(element);
			if(!element)
				throw "Could not find dom element.";
		}

		if(!element.tagName) {
			throw "Element is not a DOM element"
		}

		if(element.tagName != "CANVAS") {
			this.canvas = document.createElement("canvas");
		} else
			this.canvas = element;
	}
}

export { Canvas }
