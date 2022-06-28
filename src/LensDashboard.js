import { Util } from "./Util"

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
			containerSpace: 50,
			borderColor: [0.5, 0.0, 0.0, 1],
			borderWidth: 7   
		}, options);
		Object.assign(this, options);

        this.viewer = viewer;
		this.elements = [];
        this.container = document.createElement('div');
		this.container.style = `position: absolute; width: 50px; height: 50px; background-color: rgb(200, 0, 0, 0.0); pointer-events: none`;
		this.container.classList.add('openlime-lens-dashboard');		
		this.viewer.containerElement.appendChild(this.container);

		this.lensContainer = document.createElement('div');
		this.lensContainer.style = `position: absolute; width: 50px; height: 50px; background-color: rgb(200, 0, 0, 0.0); pointer-events: none; display: block; margin: 0`;
		this.lensContainer.classList.add('openlime-lens-dashboard-lens-container');
		this.viewer.containerElement.appendChild(this.lensContainer);
  
		const col = [255.0 * this.borderColor[0], 255.0 * this.borderColor[1], 255.0 * this.borderColor[2], 255.0 * this.borderColor[3]];
		this.lensElm = Util.createSVGElement('svg', { viewBox: `0 0 100 100` });
		const circle = Util.createSVGElement('circle', { cx: 10, cy: 10, r: 50 });
		circle.setAttributeNS(null, 'style', `fill: none; stroke: rgb(${col[0]},${col[1]},${col[2]},${col[3]}); stroke-width: ${this.borderWidth}px;`);
		this.lensElm.appendChild(circle);
		this.lensContainer.appendChild(this.lensElm);
		// circle.style.pointerEvents = 'auto';
		// circle.addEventListener('click', (e) => {
		//    console.log("CLICK CIRCLE");
		// });
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
      const center = this.viewer.camera.sceneToCanvas(x, y, cameraT);
      const radius = r * cameraT.z;
      const sizew = 2 * radius + 2 * this.containerSpace;
      const sizeh = 2 * radius + 2 * this.containerSpace;
      const p = { x: 0, y: 0 };
      p.x = center.x - radius - this.containerSpace;
      p.y = center.y + radius + this.containerSpace;
      p.y = this.viewer.camera.viewport.h - 1 - p.y;
      this.container.style.left = `${p.x}px`;
      this.container.style.top = `${p.y}px`;
      this.container.style.width = `${sizew}px`;
      this.container.style.height = `${sizeh}px`;
      this.lensContainer.style.left = `${p.x}px`;
      this.lensContainer.style.top = `${p.y}px`;
      this.lensContainer.style.width = `${sizew}px`;
      this.lensContainer.style.height = `${sizeh}px`;

      // Lens circle
      const cx = Math.round(sizew * 0.5);
      const cy = Math.round(sizeh * 0.5);
      this.lensElm.setAttributeNS(null, 'viewBox', `0 0 ${sizew} ${sizeh}`);
      const circle = this.lensElm.querySelector('circle');
      circle.setAttributeNS(null, 'cx', cx);
      circle.setAttributeNS(null, 'cy', cy);
      circle.setAttributeNS(null, 'r', radius - this.borderWidth - 2);
	}

}

export {LensDashboard}
