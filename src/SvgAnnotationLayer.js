import { Layer } from './Layer.js';
import { Annotation } from './Annotation.js';
import { AnnotationLayer } from './AnnotationLayer.js';


/**
 * SVG or OpenGL polygons/lines/points annotation layer
 * @param {object} options
 * * *svgURL*: url for the svg containing the annotations
 * * *svgXML*: svg string containing the annotatiosn
 * * *style*: css style for the annotation elements (shadow dom allows css to apply only to this layer)
 */

class SvgAnnotationLayer extends AnnotationLayer {

	constructor(options) {
		options = Object.assign({
				svgURL: null,
			svgXML: null,
			overlayElement: null,    //reference to canvas overlayElement. TODO: check if really needed.
			shadow: true,            //svg attached as shadow node (so style apply
			svgElement: null, //the svg layer
			svgGroup: null,
			lod: null,
			currentLod: null, 
		}, options);
		super(options);
		//this.createSVGElement();
		//this.setLayout(this.layout);
	}

	createSVGElement() {
		this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		this.svgElement.classList.add('openlime-svgoverlay');
		this.svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
		this.svgElement.append(this.svgGroup);

		this.root = this.overlayElement;
		if (this.shadow)
			this.root = this.overlayElement.attachShadow({ mode: "open" });

		if (this.style) {
			const style = document.createElement('style');
			style.textContent = this.style;
			this.root.append(style);
		}
		this.root.appendChild(this.svgElement);
	}
/*  unused for the moment!!! 
	async loadSVG(url) {
		var response = await fetch(url);
		if (!response.ok) {
			this.status = "Failed loading " + this.url + ": " + response.statusText;
			return;
		}
		let text = await response.text();
		let parser = new DOMParser();
		this.svgXML = parser.parseFromString(text, "image/svg+xml").documentElement;
		throw "if viewbox is set in svgURL should it overwrite options.viewbox or viceversa?"
	}
*/

	setVisible(visible) {
		if(this.svgElement)
			this.svgElement.style.display = visible ? 'block' : 'none';
		super.setVisible(visible);
	}

	clearSelected() {
		if(!this.svgElement) this.createSVGElement();
//		return;
		this.svgGroup.querySelectorAll('[data-annotation]').forEach((e) => e.classList.remove('selected'));
		super.clearSelected();
	}

	setSelected(anno, on = true) {
		for (let a of this.svgElement.querySelectorAll(`[data-annotation="${anno.id}"]`))
			a.classList.toggle('selected', on);

		super.setSelected(anno, on);
	}


	newAnnotation(annotation, selected = true) {
		let svg = createElement('svg');
		if(!annotation)
			annotation = new Annotation({ element: svg, selector_type: 'SvgSelector'});
		return super.newAnnotation(annotation, selected)
	}

	draw(transform, viewport) {
		if(!this.svgElement)
			return true;
		let t = this.transform.compose(transform);
		let c = this.boundingBox().corner(0);
//		this.svgElement.setAttribute('viewBox', `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`);
//		this.svgGroup.setAttribute("transform",
//			`translate(${t.x} ${t.y}) rotate(${-t.a} 0 0) scale(${t.z} ${t.z}) translate(${c[0]} ${c[1]})`); 
		
		let w = viewport.w;
		let h = viewport.h;
		let x = -0.5*w/t.z - t.x/t.z - c[0];
		let y = -0.5*h/t.z - t.y/t.z - c[1];
		let dx = w/t.z; 
		let dy = h/t.z; 
		this.svgElement.setAttribute('viewBox', `${x} ${y} ${dx} ${dy}`); 
		return true;
	}

	prefetch(transform) {
		if(!this.svgElement)
			this.createSVGElement();


		if (!this.visible) return;
		if(this.status != 'ready') 
			return;

		//const bBox=this.boundingBox();
//		this.svgElement.setAttribute('viewBox', `${bBox.xLow} ${bBox.yLow} ${bBox.xHigh-bBox.xLow} ${bBox.yHigh-bBox.yLow}`);
	
		//find which annotations needs to be added to the ccanvas, some 
		//indexing whould be used, for the moment we just iterate all of them.
		let lod = null;
		if(this.lod) {
			for(lod = 0; lod < this.lod.length; lod++) {
				let l = this.lod[lod];
				if(transform.z >  l.min && transform.z <= l.max)
					break;
			}
		}
		let lodChanged = false;
		if(lod !== null && this.currentLod != lod) {
			this.currentLod = lod;
			lodChanged = true;
		}

		let box1 = this.boundingBox()

		let count = 0;
		function buildPin(anno, cx, cy) {
			let pin = `
		<svg xmlns='http://www.w3.org/2000/svg' x='${cx}' y='${cy}' width="4%" height="4%" viewBox="-16 -16 32 32">
			<circle cx='0' cy='0' r="14"/>
			<text x='0' y='0'>${count}</text>
		</svg>`;
		
			let parser = new DOMParser();
			let svg = parser.parseFromString(pin, "image/svg+xml").documentElement; //"text/html").body.childNodes[0];
			count++;
			return svg;
		}

		for (let anno of this.annotations) {
			if(anno.publish != '1') continue;
			
			//TODO check for class visibility and bbox culling (or maybe should go to prefetch?)
			if (!anno.ready && typeof anno.selector.value == 'string') {
				let parser = new DOMParser();
				let element = parser.parseFromString(anno.selector.value, "image/svg+xml").documentElement;
				anno.selector.elements = [...element.children]
				anno.ready = true;
				let box = element.viewBox.baseVal;
				console.log(box, box1);
				anno.box = box;
				
				/*				} else if(this.svgXML) {
									a.svgElement = this.svgXML.querySelector(`#${a.id}`);
									if(!a.svgElement)
										throw Error(`Could not find element with id: ${id} in svg`);
								} */
				if(this.lod) {

					anno.lod = [];
					for(let l of this.lod) {
						if(l.type == 'vector')
							anno.lod.push(anno.selector.elements);
						else if(l.type == 'pin') {
							let cx = box.x + box.width/2;
							let cy = box.y + box.height/2;

							let buildFunction = l.build || buildPin;
							anno.lod.push([buildFunction(anno, cx, cy)]);
						}
					}
				}
			}
			
			if (!anno.needsUpdate && !lodChanged)
				continue;


			anno.needsUpdate = false;

			for (let e of this.svgGroup.querySelectorAll(`[data-annotation="${anno.id}"]`))
				e.remove();

			if(!anno.visible)
				continue;

			//second time will be 0 elements, but we need to 
			//store somewhere knowledge of which items in the scene and which still not.
			let elements = anno.selector.elements;
			let type = 'openlime-annotation';
			let clickHandler = null;
			if(this.currentLod !== null) { 
				let lodtype = this.lod[this.currentLod].type;

				elements = anno.lod[this.currentLod];
				clickHandler = this.lod[this.currentLod].onclick;
				if(lodtype == 'pin')
					type = 'openlime-pin';
			}

			for (let child of elements) {
				let c = child; //.cloneNode(true);
				
				c.setAttribute('data-annotation', anno.id);
				c.setAttribute('data-class', anno.class);

				//c.setAttribute('data-layer', this.id);
				c.classList.add(type);
				if (this.selected.has(anno.id))
					c.classList.add('selected');
				this.svgGroup.appendChild(c);
				c.onpointerdown =  (e) => {
					e.preventDefault();
					e.stopPropagation();
					if(clickHandler && clickHandler(anno))
						return;
						
					if(this.selected.has(anno.id))
						return;
					this.clearSelected();
					this.setSelected(anno, true);
				}


				//utils

				/*				let parser = new DOMParser();
								let use = createElement('use', { 'xlink:href': '#' + a.id,  'stroke-width': 10,  'pointer-events': 'stroke' });
								//let use = parser.parseFromString(`<use xlink:href="${a.id}" stroke-width="10" pointer-events="stroke"/>`, "image/svg+xml");
								this.svgGroup.appendChild(use);  */
			}
		}
	}
}

function createElement(tag, attributes) {
	let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
	if (attributes)
		for (const [key, value] of Object.entries(attributes))
			e.setAttribute(key, value);
	return e;
}

Layer.prototype.types['svg_annotations'] = (options) => { return new SvgAnnotationLayer(options); }

export { SvgAnnotationLayer }

