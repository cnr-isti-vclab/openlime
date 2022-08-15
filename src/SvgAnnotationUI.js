import { Annotation } from './Annotation.js'
import { SvgEditor } from './SvgEditor.js'

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

//        t        str += ['undo', 'redo', 'save-svg', 'import-svg', 'clear-screen'].map( t => 
		let saveSvg = container.querySelector('.openlime-save-svg');
		saveSvg.addEventListener('click', (e) => this.saveSvg());
		

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
	saveSvg() {
		let w = this.layer.layout.width;
		let h = this.layer.layout.height;
		
		let serializer = new XMLSerializer();

		let annotations = [];
		for(let a of this.layer.annotations) {
			if(a != this.anno)
				return;

			let anno = a.elements.map((e) => serializer.serializeToString(e)).join('\n');
			if(a.elements.length > 1) { //group all elements othe annotation.
				anno = `<g data-annotation="${anno.id}">${anno}</g>`;
			}
			annotations.push(anno);
		}

		let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
			<style>${this.layer.style}</style>
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


	}

	getDataUrl(origCanvas, mimeType){
        var canvas = document.createElement( 'canvas' );
        canvas.width = origCanvas.width;
        canvas.height = origCanvas.height;
        var destCtx = canvas.getContext('2d');
        if(!destCtx) {
            console.error("Cannot create context")
            return ""
        }
        destCtx?.drawImage(origCanvas, 0, 0);

        return destCtx.canvas.toDataURL(mimeType);
	}
}

export { SvgAnnotationUI }