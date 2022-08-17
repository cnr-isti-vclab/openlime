import { Annotation } from './Annotation.js'
import { SvgEditor } from './SvgEditor.js'
import { BoundingBox } from './BoundingBox.js'
import { CoordinateSystem } from './CoordinateSystem'
class SvgAnnotationUI {
	constructor(viewer, layer, container) {
		Object.assign(this, {
			container: container,
			viewer: viewer,
			layer: layer,
			tools: ["box", "circle", "line", "curve", "text", "pin", "eraser"],
			properties: [ 
				{ name: "fill", label: "Fill", type: "color" },
				{ name: "stroke", label: "Stroke", type: "color" },
				{ name: "width", label: "Width", type: "number" },
				{ name: "opacity", label: "Opacity", type: "number" },
				{ name: "corners", label: "Corners", type: "number" },
				{ name: "font-size", label: "Font size", type: "number" }
			],
		})
		let toolbar = this.toolbar();
		let svgTools = this.svgTools();
		let svgProperties = this.svgProperties();
		container.innerHTML = `
			<input type="file" accept="image/svg+xml" style="display:none">
			<p class="openlime-input"><input placeholder="Label" name="label" type="text" class="openlime-text-input"/></p>
			<div class="openlime-svg-tools-panel">
				<div class="openlime-svg-tools">
				${svgTools}
				</div>
				<div class="openlime-svg-properties">
				${svgProperties}
				</div>
			</div>
			${toolbar}
		`    
		this.label = container.querySelector('[name=label]');
		for(let t of container.querySelectorAll('.openlime-svg-tools svg')) {
			t.addEventListener('click', () => this.setTool(t.getAttribute('data-tool')));
		}

		let saveSvg = container.querySelector('.openlime-save-svg');
		saveSvg.addEventListener('click', (e) => this.saveSvg());
		
		let importSvg = container.querySelector('.openlime-import-svg');
		importSvg.addEventListener('click', (e) => this.importSvg());
		

		this.svgEditor = new SvgEditor(viewer, layer);
	}
	setAnnotation(anno) {
		this.anno = anno;
		this.label.value = anno.label;
		this.svgEditor.annotation = anno;
	}

	setTool(tool) {
		for(let t of this.container.querySelectorAll('.openlime-svg-tools svg')) 
			t.classList.toggle('selected', tool == t.getAttribute('data-tool'));
		
		this.container.querySelector('.openlime-svg-properties').classList.toggle('selected', tool);
		this.svgEditor.setTool(tool);
	}

	toolbar() {
		let str = `<div class="openlime-annotation-toolbar">`
		str += ['undo', 'redo', 'save-svg', 'import-svg', 'clear-screen'].map( t => 
			 `<svg class="openlime-${t}" data-icon=".openlime-${t}"/>`).join('\n');
		str += `</div>`;
		return str;
	}
	svgTools() {
		return this.tools.map( t => `<svg data-tool="${t}" data-icon=".openlime-${t}"/>`).join('\n');
	}
	svgProperties() {
		let str = ``
		for(let p of this.properties) 
			str += `<p>${p.label}: <input name="${p.name}" type="${p.type}"></p>\n`;
		
		return str;
	}


	/* image using toDataURL <image
	width="100" height="100"
	xlink:href="data:image/png;base64,IMAGE_DATA"
	/>*/
	//pick current view!
	saveSvg() {
		let w = this.layer.layout.width;
		let h = this.layer.layout.height;
		
		let viewport = this.viewer.camera.viewport;
		const viewbox = new BoundingBox({xLow:viewport.x, yLow:viewport.y, xHigh:viewport.x+viewport.dx, yHigh:viewport.y+viewport.dy});
		let cameraT = this.viewer.camera.getCurrentTransform();
		let layerT = this.layer.transform;
		let layerSize = { w: this.layer.layout.width, h: this.layer.layout.height };

		//get current viewbox
		let box = CoordinateSystem.fromViewportBoxToImageBox(viewbox, cameraT, viewport, layerT, layerSize);
		console.log(box);

		let image = this.viewer.canvas.canvasElement.toDataURL();

		
		let serializer = new XMLSerializer();

		let annotations = [];
		for(let a of this.layer.annotations) {
			if(a != this.anno)
				continue;

			let anno = a.elements.map((e) => serializer.serializeToString(e)).join('\n');
			if(a.elements.length > 1) { //group all elements othe annotation.
				anno = `<g data-annotation="${anno.id}">${anno}</g>`;
			}
			annotations.push(anno);
		}

		let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
			<style type="text/css">${this.layer.style}</style>
			<image xlink:href="${image}" x="${box.xLow}" y="${box.yLow}" width="${box.width()}" height="${box.height()}"/>
			${annotations.join('\n')}
		</svg>`;

		var e = document.createElement('a');
		e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(svg));
		e.setAttribute('download', 'annotations.svg');

		e.style.display = 'none';
		document.body.appendChild(e);
		e.click();
		document.body.removeChild(e);
	}

	importSvg() {
		let input = this.container.querySelector("input[type=file]");
		input.addEventListener('change', async () => {
			let file = input.files[0];
			console.log(input.files);
			if (!file) return;
			input.value = null;

			let txt = await file.text();
			const div = document.createElement('div');
			div.innerHTML = txt;
			let svg = div.querySelector('svg');
			let {width, height } = this.layer.layout;
			let scale = width/svg.viewBox.baseVal.width;
			if(Math.abs(scale - 1.0) < 0.001) scale = 1.0;
			
			if (!svg) {
	  			throw Error('<svg> tag not found');
			}
			//inscape encapsulates all in a single layer.
			let layer = svg.querySelector('g[inkscape\\3A groupmode]');
			if(layer) svg = layer;
			let parts = svg.querySelectorAll("svg, g, path, rect, circle, text");

			//clean elements for annotations in the import.
			for(let part of parts) {
				let id = part.getAttribute('data-annotation');
				if(!id) continue;
				let anno = this.layer.getAnnotationById(id);
				if(anno)
					anno.elements = [];
			}

			for(let part of parts) {
				if(scale != 1.0)
					part.setAttribute("transform", `scale(${scale} ${scale})`);

				let id = part.getAttribute('data-annotation');
				let anno;
				if(!id) {
					anno = this.layer.newAnnotation();
					anno.publish = true;
					anno.label = `Annotation ${this.layer.annotations.length}`;
					anno.description = anno.class = '';
				} else
					anno = this.layer.getAnnotationById(id);

				anno.elements.push(part);
				anno.needsUpdate = true;
			}

		})
		input.click();
	}

}

export { SvgAnnotationUI }