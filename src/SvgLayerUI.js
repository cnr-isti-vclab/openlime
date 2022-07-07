class SvgLayerUI {
	constructor(layer, container) {
		var shadow = container.attachShadow({mode: 'open'});
		let html = `
		<link rel="stylesheet" href="../../css/svglayerui.css"/>
		<div class="openlime layer-panel collapsed1">
			<div class="row" style="justify-content:space-between">
				<svg data-icon=".openlime-main-menu"></svg>
				<svg data-icon=".openlime-close" class="collapse"></svg>
			</div>
			<div class="row">
				<svg data-icon=".openlime-add"></svg>
				<button class="button collapse">New annotation</button>
			</div>
			<div class="collapse">
		
				<div class="row toolbar">
					<input type="file" id="doanload" accept="image/svg+xml" style="display:none">
					<svg data-icon=".openlime-download"></svg>
					<svg data-icon=".openlime-upload"></svg>
					<svg data-icon=".openlime-json"></svg>
					<svg data-icon=".openlime-edit"></svg>
					<svg data-icon=".openlime-trash"></svg>
				</div>
				<div class="annotation-list">
				</div>
			</div>
		
			<div class="row">
				<svg data-icon=".openlime-drop-pin"></svg>
				<button class="button collapse">Show pins</button>
			</div>
		
			<svg data-icon=".openlime-config" style="position:absolute; bottom:0px"></svg>
		
		</div>
		`;
		
		shadow.innerHTML += html;
		
		(async () => {
			for(let svg of shadow.querySelectorAll('[data-icon]'))
				await OpenLIME.Skin.setIcon(svg, svg.getAttribute('data-icon'));

		
			let div = shadow.querySelector('.layer-panel');
		
			let mainMenu = div.querySelector('.openlime-main-menu')
			mainMenu.addEventListener('click', () => div.classList.toggle('collapsed'));

			let download = div.querySelector('.openlime-download');
			download.addEventListener('click', () => this.importAnnotations() );
		})();
	}
	importAnnotations() {
		let input = document.getElementById("download");
		input.click();

	}
}

export { SvgLayerUI }