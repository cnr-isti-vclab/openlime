import { Util } from "./Util"

/**
 * RenderingMode for lens and background. Currently implemented only draw and hide.
 */
const RenderingMode = {
    draw: "fill:white;",
    hide: "fill:black;"
};

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
			containerSpace: 80,
			borderColor: [0.078, 0.078, 0.078, 1],
			borderWidth: 12,
			layerSvgAnnotation: null   
		}, options);
		Object.assign(this, options);

		this.lensLayer = null;
        this.viewer = viewer;
		this.elements = [];
        this.container = document.createElement('div');
		this.container.style = `position: absolute; width: 50px; height: 50px; background-color: rgb(200, 0, 0, 0.0); pointer-events: none`;
		this.container.classList.add('openlime-lens-dashboard');		
		this.viewer.containerElement.appendChild(this.container);
  
		const col = [255.0 * this.borderColor[0], 255.0 * this.borderColor[1], 255.0 * this.borderColor[2], 255.0 * this.borderColor[3]];
		this.lensElm = Util.createSVGElement('svg', { viewBox: `0 0 100 100` });
		const circle = Util.createSVGElement('circle', { cx: 10, cy: 10, r: 50 });
		circle.setAttributeNS(null, 'style', `position:absolute; visibility: visible; fill: none; stroke: rgb(${col[0]},${col[1]},${col[2]},${col[3]}); stroke-width: ${this.borderWidth}px;`);
		circle.setAttributeNS(null, 'shape-rendering', 'geometricPrecision');
		this.lensElm.appendChild(circle);
		this.container.appendChild(this.lensElm);
		circle.style.pointerEvents = 'auto';
		circle.addEventListener('click', (e) => {
		   console.log("CLICK CIRCLE");
		});

		this.lensBox = { x: 0, y: 0, r: 0, w: 0, h: 0 };
		  
		this.svgElement = null;
		this.svgMaskId = 'openlime-image-mask';
		this.svgMaskUrl = `url(#${this.svgMaskId})`;

		this.noupdate=false;
    }

	/**
	 * Call this to set the corresponding LayerSvgAnnotation
	 * @param {LayerSvgAnnotation} l 
	 */
	setLayerSvgAnnotation(l) {
		this.layerSvgAnnotation = l;
		this.svgElement = this.layerSvgAnnotation.svgElement;
	}

	/** @ignore */
	createSvgLensMask() {
		if (this.svgElement == null) this.setupSvgElement();
		if (this.svgElement == null) return;
	
		// Create a mask made of a rectangle (it will be set to the full viewport) for the background
		// And a circle, corresponding to the lens. 
        const w = 100; // The real size will be set at each frame by the update function
        this.svgMask = Util.createSVGElement("mask", {id: this.svgMaskId});
		this.svgGroup = Util.createSVGElement("g");
        this.outMask = Util.createSVGElement("rect", {id:'outside-lens-mask', x:-w/2, y:-w/2, width: w, height:w,  style:"fill:black;"});
        this.inMask = Util.createSVGElement("circle", {id:'inside-lens-mask', cx:0, cy:0, r: w/2, style:"fill:white;"});
        this.svgGroup.appendChild(this.outMask);
        this.svgGroup.appendChild(this.inMask);
        this.svgMask.appendChild(this.svgGroup);
		this.svgElement.appendChild(this.svgMask);

        // FIXME Remove svgCheck. It's a Check, just to have an SVG element to mask
		// this.svgCheck = Util.createSVGElement('rect', {x:-w/2, y:-w/2, width:w/2, height:w/2, style:'fill:orange; stroke:blue; stroke-width:5px;'}); //  
		// this.svgCheck.setAttribute('mask', this.svgMaskUrl);
		// this.svgElement.appendChild(this.svgCheck);
		// console.log(this.svgCheck);
	}

	/** @ignore */
	setupSvgElement() {
		if (this.layerSvgAnnotation) {
			// AnnotationLayer available, get its root svgElement
			if (this.svgElement == null) {
				//console.log("NULL SVG ELEMENT, take it from layerSvgAnnotation");
				this.svgElement = this.layerSvgAnnotation.svgElement;
			}
		} else {
			// No annotationLayer, search for an svgElement
		
			// First: get shadowRoot to attach the svgElement
			let shadowRoot = this.viewer.canvas.overlayElement.shadowRoot; 
			if (shadowRoot == null) {
				//console.log("WARNING: null ShadowRoot, create a new one");
				shadowRoot = this.viewer.canvas.overlayElement.attachShadow({ mode: "open" });
			}
		
			//console.log("WARNING: no svg element, create a new one");
			this.svgElement = shadowRoot.querySelector('svg');
			if (this.svgElement == null) {
				// Not availale svg element: build a new one and attach to the tree
				this.svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				this.svgElement.classList.add('openlime-svgoverlay-mask');
				this.svgElement.setAttributeNS(null, 'style', 'pointer-events: none;');
				shadowRoot.appendChild(this.svgElement);
			}
		}
	}

	/**
	 * Set mask property on the svg element which need to be displayed with the lens
	 * @param {*} svg element which need to be displayed within the lens
	 */
	setMaskOnSvgLayer(svg) {
		svg.setAttributeNS(null, 'mask', this.svgMaskUrl);
	}

	/**
	 * Remove mask attribute from svg element
	 * @param {*} svg element from which remove the mask attribute
	 */
	removeMaskFromSvgLayer(svg) {
		svg.removeAttribute('mask');
	}

	/**
	 * Appends a HTML element to the dashboard. The element must be positioned in 'absolute' mode.
	 * @param {*} elm A HTML element
	 */
    append(elm) {
		this.container.appendChild(elm);
	}
	
	/**
	 * Set rendering mode within the lens.
	 * @param {RenderingMode} mode RenderingMode.draw or RenderingMode.hide
	 */
    setLensRenderingMode(mode) {
        this.inMask.setAttributeNS(null, 'style', mode);
    }

	/**
	 * Set the background rendering mode within the lens.
	 * @param {RenderingMode} mode RenderingMode.draw or RenderingMode.hide
	 */
    setBackgroundRenderingMode(mode) {
        this.outMask.setAttributeNS(null, 'style', mode);
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

		// Lens circle
		if (sizew != this.lensBox.w || sizeh != this.lensBox.h) {
			const cx = Math.ceil(sizew * 0.5);
			const cy = Math.ceil(sizeh * 0.5);
			// const cx = sizew * 0.5;
			// const cy = sizeh * 0.5;
			this.lensElm.setAttributeNS(null, 'viewBox', `0 0 ${sizew} ${sizeh}`);
			const circle = this.lensElm.querySelector('circle');
			circle.setAttributeNS(null, 'cx', cx);
			circle.setAttributeNS(null, 'cy', cy);
			circle.setAttributeNS(null, 'r', radius - 0.5*this.borderWidth);
		}

		this.updateMask(cameraT, center, radius);

		this.lensBox = {
			x: center.x,
			y: center.y,
			r: radius,
			w: sizew,
			h: sizeh
		}

	}

	updateMask(cameraT, center, radius) {
	   if (this.svgElement == null) { this.createSvgLensMask(); }
	   if (this.svgElement == null) return;

	  // Lens Mask
	  const viewport = this.viewer.camera.viewport;
	  if (this.layerSvgAnnotation != null) {
		// Compensate the mask transform with the inverse of the annotation svgGroup transform
		const inverse = true;
		const invTransfStr = this.layerSvgAnnotation.getSvgGroupTransform(cameraT, inverse);
		this.svgGroup.setAttribute("transform", invTransfStr);
	 } else {
		 // Set the viewbox.  (in the other branch it is set by the layerSvgAnnotation)
		this.svgElement.setAttribute('viewBox', `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`);
	 }

	  // Set the full viewport for outer mask rectangle
	  this.outMask.setAttribute( 'x', -viewport.w / 2);
	  this.outMask.setAttribute( 'y', -viewport.h / 2);
	  this.outMask.setAttribute( 'width', viewport.w);
	  this.outMask.setAttribute( 'height', viewport.h);

	  // Set lens parameter for inner lens
	  this.inMask.setAttributeNS(null, 'cx', center.x  - viewport.w / 2);
	  this.inMask.setAttributeNS(null, 'cy', -(center.y - viewport.h / 2));
	  this.inMask.setAttributeNS(null, 'r', radius - this.borderWidth - 2);
	}

}

export {LensDashboard}
export {RenderingMode}