/**
 * Callback function fired by a 'click' event on a lens dashboard element.
 * @function taskCallback
 * @param {Event} e The DOM event.
 */

/**
 * The LensDashboard class is an optional element that can be embedded in an instance of {@link LayerLens}.
 * It represents a square HTML container of sufficient size to hold the lens that is positioned solidly against it.
 * Its main use is to allow the creation of a dashboard of HTML elements positioned around the lens.
 * 
 * In the example below a simple HTML button is positioned close to the top-left corner of the dashboard:
 * 
 * @example
 * 
 * const lensDashboard = new OpenLIME.LensDashboard(lime);
 * const lensLayer = new OpenLIME.Layer({
 * type: "lens",
 * layers: [layerIn],
 * 		camera: lime.camera,
 *		radius: 200,
 *		border: 10,
 *		dashboard: lensDashboard,
 *		visible: true
 * });
 * lime.addLayer('lens', lensLayer);
 *  
 * const btn = document.createElement('button');
 * btn.innerHTML = "Click Me";
 * btn.style = `position: absolute;  
 *				left: 0px; 
 *				top: 0px;
 *				display: inline-block; 
 *				cursor: pointer;
 *				pointer-events: auto;`;
 * lensDashboard.append(btn);
 */
class LensDashboard {
	/**
 	* Manages creation and update of a lens dashboard.
 	* An object literal with Layer `options` can be specified.
	* This class instatiates an optional element of {@link LayerLens}
 	* @param {Object} options An object literal with Lensdashboard parameters.
 	* @param {number} options.borderWidth=30 The extra border thickness (in pixels) around the square including the lens.
 	*/
	constructor(viewer, options) {
		options = Object.assign({
			borderWidth: 38
		}, options);
		Object.assign(this, options);
        this.viewer = viewer;
		this.elements = [];
        this.container = document.createElement('div');
		this.container.style = `position: absolute; width: 50px; height: 50px; background-color: rgb(200, 0, 0, 0.0); pointer-events: none`;
		this.container.classList.add('openlime-lens-dashboard');		
		this.viewer.containerElement.appendChild(this.container);
    }

	/**
	 * Appends a HTML element to the dashboard. The element must be positioned in 'absolute' mode.
	 * @param {*} elm A HTML element
	 */
    append(elm) {
		this.container.appendChild(elm);
	}

	/** @ignore */
    update(x, y, r) {
		const now = performance.now();
		let cameraT = this.viewer.camera.getCurrentTransform(now);
		const p = this.viewer.camera.sceneToCanvas(x, y, cameraT);
		const size = r * cameraT.z + this.borderWidth;
		const size2 = 2 * size;
		p.x -= size;
		p.y += size;
		p.y = this.viewer.camera.viewport.h - p.y;
		this.container.style.left = `${p.x}px`;
		this.container.style.top = `${p.y}px`;
		this.container.style.width = `${size2}px`;
		this.container.style.height = `${size2}px`;
	}

	/**
	 * Utility function to create a simple SVG element (icon) from an inline description
	 * @param {Object} icon An object literal describing the SVG element.
	 * @param {string} icon.id A unique id for the SVG element.
	 * @param {string} icon.path The SVG path describing the shape of the icon.
	 * @param {string} icon.style The CSS style of the icon.
	 * @param {string} icon.class An optional class useful as HTML selector.
	 * @param {taskCallback} icon.task A callback function fired by a 'click' event on a lens dashboard element.
	 * @returns {SVGElement} A SVG element
	 * @static
	 */
	static createSVG(icon) {
		const svgns = 'http://www.w3.org/2000/svg';
		const svg = document.createElementNS(svgns, 'svg');

		svg.setAttribute('id', icon.id);
		svg.setAttribute('class', icon.class);
		svg.setAttribute('style', icon.style);

		svg.setAttribute('viewBox', '0 0 64 64');

		// const circle = document.createElementNS(svgns, 'circle');
        // circle.setAttributeNS(null, 'cx', 32);
        // circle.setAttributeNS(null, 'cy', 32);
        // circle.setAttributeNS(null, 'r', 24);
        // circle.setAttributeNS(null, 'style', 'fill: #999; stroke: red; stroke-width: 1px;' );
        // svg.appendChild(circle);

		const path = document.createElementNS(svgns, 'path');
		path.setAttribute('d', icon.path);
		svg.appendChild(path);

		console.log(path);

		svg.addEventListener('click', (e) => icon.task(e));
		return svg;
	};

	static svgFromString(text) {
		const parser = new DOMParser();
		return parser.parseFromString(text, "image/svg+xml").documentElement;
	}

}

export {LensDashboard}
