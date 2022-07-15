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
				<div class="openlime-collapse">
			
					<div class="openlime-row openlime-layer-toolbar">
						<input type="file" accept="image/svg+xml" style="display:none">
						<svg data-icon=".openlime-download"></svg>
						<svg data-icon=".openlime-upload"></svg>
						<svg data-icon=".openlime-json"></svg>
						<svg data-icon=".openlime-edit"></svg>
						<svg data-icon=".openlime-trash"></svg>
					</div>
					<div class="openlime-annotation-list">
					</div>
				</div>
		
				<div class="openlime-row">
					<svg data-icon=".openlime-pin"></svg>
					<button class="openlime-button openlime-collapse">Show pins</button>
				</div>
				<svg data-icon=".openlime-config" style="position:absolute; bottom:0px"></svg>
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
			download.addEventListener('click', () => this.importAnnotations() );

			let newAnnotation = this.panel.querySelector('.openlime-add');
			newAnnotation.addEventListener('click', ()=> this.newAnnotation() );

		})();
		this.layer.addEvent('update', () => this.updateAnnotationsList());

		
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
			str += `<div data-anon="${anno.id}"><input type='checkbox'> ${anno.label}</div>`
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
}

export { SvgLayerUI }
