import { Annotation } from './Annotation.js'
import { SvgAnnotationUI } from './SvgAnnotationUI.js'

class SvgLayerUI {
	constructor(viewer, layer, container) {
		this.viewer = viewer;
		this.layer = layer;
		this.container = container;

		let html = `
		<div id="openlime-layer-panel" class="openlime-collapsed">
			<div class="openlime-row" style="justify-content:space-between">
				<svg data-icon=".openlime-main-menu"></svg>
			</div>

			<div class="openlime-annotations-panel">

				<div class="openlime-row">
					<svg data-icon=".openlime-add"></svg>
					<button class="openlime-button openlime-collapse">New annotation</button>
				</div>
				<div class="openlime-collapse" style="display:flex; flex-grow:1;flex-direction:column;">
			
					<div class="openlime-row openlime-layer-toolbar">
						<input type="file" accept="image/svg+xml" style="display:none">
						<svg data-icon=".openlime-download"></svg>
						<svg data-icon=".openlime-upload"></svg>
						<svg data-icon=".openlime-json"></svg>
						<svg data-icon=".openlime-edit"></svg>
						<svg data-icon=".openlime-trash"></svg>
					</div>
					<div class="openlime-annotation-list" style="grow:1">
					</div>
				</div>
		
				<div class="openlime-row">
					<svg data-icon=".openlime-pin"></svg>
					<button class="openlime-button openlime-collapse">Show pins</button>
				</div>
				<svg data-icon=".openlime-config"></svg>
			</div>
			
			<div class="openlime-annotation-panel" style="display:none">
			</div>
		
		
		</div>
		`;
		let div = document.createElement('div');
		div.innerHTML = html;
		this.panel = div.firstElementChild;
		container.append(this.panel);
		
		this.annotationsPanel = this.panel.querySelector('div.openlime-annotations-panel');
		this.annotationPanel = this.panel.querySelector('div.openlime-annotation-panel');

		this.svgAnnotationUI = new SvgAnnotationUI(viewer, layer, this.annotationPanel);
		
		(async () => {
			for(let svg of this.panel.querySelectorAll('[data-icon]'))
				await OpenLIME.Skin.setIcon(svg, svg.getAttribute('data-icon'));

	
			let mainMenu = this.panel.querySelector('.openlime-main-menu')
			mainMenu.addEventListener('click', () => this.panel.classList.toggle('openlime-collapsed'));

			let download = this.panel.querySelector('.openlime-download');
			download.addEventListener('click', () => this.exportAnnotations() );

			let upload = this.panel.querySelector('.openlime-upload');
			upload.addEventListener('click', () => this.importAnnotations() );

			let newAnnotation = this.panel.querySelector('.openlime-add');
			newAnnotation.addEventListener('click', ()=> this.newAnnotation() );

			let editAnnotation = this.panel.querySelector('.openlime-edit');
			editAnnotation.addEventListener('click', () => this.editSelected() );

		})();
		this.layer.addEvent('update', () => this.updateAnnotationsList());
		this.layer.addEvent('selected', () => this.updateSelected());

		this.annotationsList = this.panel.querySelector('.openlime-annotation-list');
		this.annotationsList.addEventListener('click', (e) => this.listClicked(e)); 
		
	}
	listClicked(event) {
		let div = event.target;
		if(div == this.annotationsList) return;
		let id = div.getAttribute('data-anno');
		if(!id) return;
		let anno = this.layer.getAnnotationById(id);
		this.layer.clearSelected(anno);
		this.layer.setSelected(anno)
	}
	updateSelected() {
		this.annotationsList.querySelectorAll('div').forEach((d) => {
			let id = d.getAttribute('data-anno');
			d.classList.toggle('selected', this.layer.selected.has(id));
		});
	}

	showAnnotation(anno) {
		this.annotationsPanel.style.display = 'none';
		this.annotationPanel.style.display = 'flex';
		this.svgAnnotationUI.setAnnotation(anno);
	}
	newAnnotation() {
		let anno = new Annotation({
			publish: true,
			label: `Annotation ${this.layer.annotations.length}`,
			description: '',
			class: '',
			needsUpdate: true
		});
		this.layer.newAnnotation(anno);

		this.showAnnotation(anno);
	}

	updateAnnotationsList() {
		let list = this.panel.querySelector('.openlime-annotation-list');
		//FIXME should check for differences in annotations and add/remove piexes, not rebuild from scratch
		list.innerHTML = "";
		let str = ``;
		for(let anno of this.layer.annotations) {
			str += `<div data-anno="${anno.id}"><input type='checkbox'> ${anno.label}</div>`
		}
		list.innerHTML = str;
	}
	importAnnotations() {
		let input = this.panel.querySelector("input");
		input.addEventListener('change', async () => {
			let file = input.files[0];
			console.log(input.files);
			if (!file) return;

			let txt = await file.text();
			const div = document.createElement('div');
			div.innerHTML = txt;
			let svg = div.querySelector('svg');
			let {width, height } = this.layer.layout;
			let scale = width/svg.viewBox.baseVal.width;
			
			if (!svg) {
	  			throw Error('<svg> tag not found');
			}
			//inscape encapsulates all in a single layer.
			let layer = svg.querySelector('g[inkscape\\3A groupmode]');
			if(layer) svg = layer;
			let parts = svg.querySelectorAll("svg, g, path, rect, circle, text, image");
			for(let part of parts) {
				
				part.setAttribute("transform", `scale(${scale} ${scale})`);
				let anno = this.layer.newAnnotation();
				anno.elements.push(part);
				
				anno.publish = true;
				anno.label = `Annotation ${this.layer.annotations.length}`;
				anno.description = anno.class = '';
				anno.needsUpdate = true;
			}

		})
		input.click();
	}

	exportAnnotations() {
		let w = this.layer.layout.width;
		let h = this.layer.layout.height;
		
		let serializer = new XMLSerializer();

		let annotations = [];
		for(let a of this.layer.annotations) {
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

	editSelected() {
		let selected = this.layer.selected;
		if(selected.size != 1)
			return;
		let id = selected.values().next().value;
		let anno = this.layer.getAnnotationById(id);
		this.showAnnotation(anno);
	}
}

export { SvgLayerUI }
