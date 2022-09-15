import { CoordinateSystem } from "./CoordinateSystem";
import { Annotation } from "./Annotation";
import { Util } from "./Util"

/**
 * RenderingMode for lens and background. Currently implemented only draw and hide.
 */
const RenderingMode = {
    draw: "draw",
    hide: "hide",
	monochrome: "monochrome"
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
		this.setupCircleInteraction(circle);
		this.lensBox = { x: 0, y: 0, r: 0, w: 0, h: 0 };

		this.svgElement = null;
		this.svgMonochromeMaskId = 'openlime-image-monochrome-mask';
		this.svgMonochromeMaskUrl = `url(#${this.svgMonochromeMaskId})`;
		this.svgPlainMaskId = 'openlime-image-plain-mask';
		this.svgPlainMaskUrl = `url(#${this.svgPlainMaskId})`;

		this.copySuffix = "-copy";

		this.svgElementMap = new Map();

		this.noupdate=false;
    }

	/**
	 * Setup the event listener to update lens radius by dragging lens border.
	 * Call the lens controller to update lens radius.
	 * @param {*} circle lens svg border.
	 */
	setupCircleInteraction(circle) {
		circle.style.pointerEvents = 'auto';
		this.isCircleSelected = false;

		// OffsetXY are unstable from this point (I don't know why)
		// Thus get coordinates from clientXY
		function getXYFromEvent(e, container) {
			const x = e.clientX -  container.offsetLeft - container.clientLeft;
			const y = e.clientY - container.offsetTop - container.clientTop;
			return {offsetX:x, offsetY:y};
		}

        this.viewer.containerElement.addEventListener('pointerdown', (e) => {
            if(circle == e.target) {
                this.isCircleSelected = true;
				if (this.lensLayer.controllers[0]) {
					const p = getXYFromEvent(e, this.viewer.containerElement);
					this.lensLayer.controllers[0].zoomStart(p);
				}
				e.preventDefault();
				e.stopPropagation();
			}
		 });

		 this.viewer.containerElement.addEventListener('pointermove', (e) => {
			 if (this.isCircleSelected) {
				if (this.lensLayer.controllers[0]) {
					const p = getXYFromEvent(e, this.viewer.containerElement);
					this.lensLayer.controllers[0].zoomMove(p);
				}
				e.preventDefault();
				e.stopPropagation();
			}
		 });

		 this.viewer.containerElement.addEventListener('pointerup', (e) => {
			if (this.isCircleSelected) {
				if (this.lensLayer.controllers[0]) {
					this.lensLayer.controllers[0].zoomEnd();
				}
				this.isCircleSelected = false;
				e.preventDefault();
				e.stopPropagation();
			}
		 });
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

		// Create a filter for monochrome rendering
		const filterId="greyScale"; 
		this.svgDefs = Util.createSVGElement("defs");
		this.svgFilter = Util.createSVGElement("filter", {id:filterId});
		const m=0.1; // grey color intensity = m(R+G+B) + b
		const b=0.1;
		const a=1; // fixed transparency
		const matrixValues = [	m, m, m, 0, b,
								m, m, m, 0, b,
								m, m, m, 0, b,
								0, 0, 0, a, 0];
		this.svgFeColorMatrix = Util.createSVGElement("feColorMatrix", {in:"SourceGraphic", 
			type:"matrix", values:`${matrixValues}`});
		this.svgFilter.appendChild(this.svgFeColorMatrix);
		this.svgDefs.appendChild(this.svgFilter);
		this.svgElement.appendChild(this.svgDefs);

		// This is the Monochrome mask. Define the behaviour for the svgCopyGroup
		// where objects are copied to perform monochrome rendering.
		const w = 100; // The real size will be set at each frame by the update function
		this.svgMonochromeGroup = Util.createSVGElement("g");
        this.svgMonochromeMask = Util.createSVGElement("mask", {id: this.svgMonochromeMaskId});
		this.svgMonochromeMaskRect = Util.createSVGElement("rect", {x:-w/2, y:-w/2, width: w, height:w,  style:"fill:white;"});
        this.svgMonochromeMaskCircle = Util.createSVGElement("circle", {cx:0, cy:0, r: w/2, style:"fill:black;"});
		this.svgMonochromeGroup.appendChild(this.svgMonochromeMaskRect);
        this.svgMonochromeGroup.appendChild(this.svgMonochromeMaskCircle);
        this.svgMonochromeMask.appendChild(this.svgMonochromeGroup);
		this.svgElement.appendChild(this.svgMonochromeMask);

		// Plain Mask. Define the behaviour of the original group of object which
		//  can be drawn with plain drawing or hidden.
		this.svgPlainGroup = Util.createSVGElement("g", );
		this.svgPlainMask = Util.createSVGElement("mask", {id: this.svgPlainMaskId});
		this.svgPlainMaskRect = Util.createSVGElement("rect", {x:-w/2, y:-w/2, width: w, height:w,  style:"fill:black;"});
        this.svgPlainMaskCircle = Util.createSVGElement("circle", {cx:0, cy:0, r: w/2, style:"fill:white;"});
        this.svgPlainGroup.appendChild(this.svgPlainMaskRect);
        this.svgPlainGroup.appendChild(this.svgPlainMaskCircle);
        this.svgPlainMask.appendChild(this.svgPlainGroup);
		this.svgElement.appendChild(this.svgPlainMask);
		this.svgPlainGroup.setAttributeNS(null, 'mask', this.svgPlainMaskUrl);
		
		// Monochrome rendering requires two instance of each object
		// This group contain a copy of all the svg elements that need to be drawn, when rendering mode is monochrome
		this.svgCopyGroup = Util.createSVGElement("g", {id:"copyGroup"});
		this.svgCopyGroup.setAttributeNS(null, 'mask', this.svgMonochromeMaskUrl);
		this.filterUrl = 'url(#' + filterId + ')';
		this.svgCopyGroup.setAttributeNS(null, 'filter', this.filterUrl);
		this.layerSvgAnnotation.svgGroup.appendChild(this.svgCopyGroup);

		this.setRenderingMode( RenderingMode.draw, RenderingMode.monochrome);
		this.renderingModeId = 4;
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
			let shadowRoot = this.getShadowRoot();

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

	getShadowRoot() {
		let shadowRoot = this.viewer.canvas.overlayElement.shadowRoot;
		if (shadowRoot == null) {
			//console.log("WARNING: null ShadowRoot, create a new one");
			shadowRoot = this.viewer.canvas.overlayElement.attachShadow({ mode: "open" });
		}
		return shadowRoot;
	}

	/**
	 * Helper function to iterate among all the possible renderingMode combinations 
	 */
	iterateRenderingMode() {
		this.renderingModeId++;
		if (this.renderingModeId > 8) this.renderingModeId = 0;
		else if (this.renderingModeId < 0) this.renderingModeId = 8;

		switch(this.renderingModeId) {
			case 0:
				this.setRenderingMode( RenderingMode.draw, RenderingMode.draw);
			break;		
			case 1:
				this.setRenderingMode( RenderingMode.draw, RenderingMode.hide);
			break;		
			case 2:
				this.setRenderingMode( RenderingMode.hide, RenderingMode.draw);
			break;		
			case 3:
				this.setRenderingMode( RenderingMode.hide, RenderingMode.hide);
			break;		
			case 4:
				this.setRenderingMode( RenderingMode.draw, RenderingMode.monochrome);
			break;		
			case 5:
				this.setRenderingMode( RenderingMode.monochrome, RenderingMode.draw);
			break;		
			case 6:
				this.setRenderingMode( RenderingMode.hide, RenderingMode.monochrome);
			break;		
			case 7:
				this.setRenderingMode( RenderingMode.monochrome, RenderingMode.hide);
			break;		
			case 8:
				this.setRenderingMode( RenderingMode.monochrome, RenderingMode.monochrome);
			break;	
			default:
				console.log("Not Supported rendering mode id " + this.renderingModeId);
				break;
		}
	}

	/**
	 * Set renderingMode within and outside the lens
	 * @param {RenderingMode} lensMode renderingMode inside the lens
	 * @param {RenderingMode} outMode  renderingMode outside the lens
	 */
	setRenderingMode(lensMode, outMode) {
		console.log("Set Rendering Mode " + lensMode + " " + outMode);
		this.lensRenderingMode = lensMode;
		this.outRenderingMode = outMode;

		// Remove from the copygroup all stored svg element copies
		this.svgCopyGroup.querySelectorAll('*').forEach(n => n.remove());

		// Handle monochrome
		if (lensMode == RenderingMode.monochrome && outMode == RenderingMode.monochrome) {
			// No mask needed, draw both side in monochrome
			this.svgCopyGroup.removeAttribute('mask');
			this.svgCopyGroup.setAttributeNS(null, 'filter', this.filterUrl);
			
			// Activate draw inside and outside lens for monochrome component
			this.svgMonochromeMaskCircle.setAttributeNS(null, 'style', "fill:white;");
			this.svgMonochromeMaskRect.setAttributeNS(null, 'style', "fill:white;");

			// Hide draw inside and outside lens for plain component
			this.svgPlainMaskCircle.setAttributeNS(null, 'style', "fill:black;");
			this.svgPlainMaskRect.setAttributeNS(null, 'style', "fill:black;");
		} else if (lensMode == RenderingMode.monochrome) {
			// Activate monochrome inside lens
			this.svgCopyGroup.setAttributeNS(null, 'mask', this.svgMonochromeMaskUrl);
			this.svgCopyGroup.setAttributeNS(null, 'filter', this.filterUrl);
			this.svgMonochromeMaskCircle.setAttributeNS(null, 'style', "fill:white;");
			this.svgMonochromeMaskRect.setAttributeNS(null, 'style', "fill:black;");

			// Hide plain draw inside lens
			this.svgPlainMaskCircle.setAttributeNS(null, 'style', "fill:black;");
		} else if (outMode == RenderingMode.monochrome) {
			// Activate monochrome outside lens
			this.svgCopyGroup.setAttributeNS(null, 'mask', this.svgMonochromeMaskUrl);
			this.svgCopyGroup.setAttributeNS(null, 'filter', this.filterUrl);
			this.svgMonochromeMaskCircle.setAttributeNS(null, 'style', "fill:black;");
			this.svgMonochromeMaskRect.setAttributeNS(null, 'style', "fill:white;");

			// Hide plain draw outside lens
			this.svgPlainMaskRect.setAttributeNS(null, 'style', "fill:black;");
		} 

		// Handle plain draw and hide
		if (lensMode != RenderingMode.monochrome) {
			// Set lens rendering mode
			const fillLens = lensMode == RenderingMode.draw ? "fill:white;" : "fill:black;";
			this.svgPlainMaskCircle.setAttributeNS(null, 'style', fillLens);

			// Hide monochrome draw inside lens
			this.svgMonochromeMaskCircle.setAttributeNS(null, 'style',  "fill:black;");
		} 

		if (outMode != RenderingMode.monochrome) {
			// Set outside rendering mode
			const fillOut  = outMode == RenderingMode.draw ? "fill:white;" : "fill:black;";
			this.svgPlainMaskRect.setAttributeNS(null, 'style', fillOut);

			// Hide monochrome draw outside lens
			this.svgMonochromeMaskRect.setAttributeNS(null, 'style', "fill:black;");
		} 

		// Update mask on already present svg elements
		this.svgElementMap.forEach((value, key) => {
			const updateMap = false;
			this.removeMaskFromSvgLayer(value, updateMap);
			this.setMaskOnSvgLayer(value, updateMap);
		});
	}

	/**
	 * Set mask property on the svg element which need to be displayed with the lens
	 * @param {*} svg element which need to be displayed within the lens
	 * @param {bool} updateMap leave at default value (true). 
	 */
	setMaskOnSvgLayer(svg, updateMap = true) {
		if (!svg.classList.contains('pin')) {
			// Set an id if it is missing 
			let id = svg.getAttribute('id');
			if (id == null) {
				id = Annotation.UUID();
			
				// Set the id in the original svg (will be used to recover/delete the copy)
				svg.setAttributeNS({}, 'id', id);
			}

			if (updateMap) {
				// Remember the used svg
				this.svgElementMap.set(id, svg);
			}

			// During monochrome rendering, copy all svg elements to perform two draw steps.
			if (this.lensRenderingMode == RenderingMode.monochrome ||
				this.outRenderingMode == RenderingMode.monochrome) {
				

				// Create a copy of this svg within the svgCopyGroup.
				let clone = svg.cloneNode(true);
				let idCopy = id+this.copySuffix;
				clone.setAttribute('id', idCopy);
			
				//console.log("Adding node with id " + clone.getAttribute('id'));
				this.svgCopyGroup.appendChild(clone);
				// Do not set the monochrome mask on the element, it is already present in the svgCopyGroup
			}

			// Set on each original tree element the plain mask
			svg.setAttributeNS(null, 'mask', this.svgPlainMaskUrl);
		}
	}

	/**
	 * Remove mask attribute from svg element
	 * @param {*} svg element from which remove the mask attribute
   	 * @param {bool} updateMap leave at default value (true). 
	 */
	removeMaskFromSvgLayer(svg, updateMap = true) {
		// Remove a link to this svg within the svgCopyGroup
		let id = svg.getAttribute('id');
		if (id != null && id != "null") {

			if (updateMap) {
				this.svgElementMap.delete(id);
			}

			// Remove copied element from svgCopyGroup
			id = id + this.copySuffix;
			let idStr = '#'+id;
			let elm = this.svgCopyGroup.querySelector(idStr);
			if (elm != null) {
				elm.remove();
			} 
		}

		svg.removeAttribute('mask');
	}

	/**
	 * Set colorMatrix used to compute filtered color when using monochrome rendering.
	 * Color computed as R=m00*r+m01*g+m02*b+m03*a+m04, G=m10*r+...
	 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feColorMatrix for details
	 * @param {float} colorMatrix array of (5x4) float
	 */
	setFilterColorMatrix(colorMatrix) {
		this.svgFeColorMatrix.setAttributeNS(null, 'values', colorMatrix);
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
		const useGL = false;
		const center = CoordinateSystem.fromSceneToCanvasHtml({x:x, y:y}, this.viewer.camera, useGL);

		const now = performance.now();
		let cameraT = this.viewer.camera.getCurrentTransform(now);
		const radius = r * cameraT.z;
		const sizew = 2 * radius + 2 * this.containerSpace;
		const sizeh = 2 * radius + 2 * this.containerSpace;
		const p = { x: 0, y: 0 };
		p.x = center.x - radius - this.containerSpace;
		p.y = center.y - radius - this.containerSpace;
		this.container.style.left = `${p.x}px`;
		this.container.style.top = `${p.y}px`;
		this.container.style.width = `${sizew}px`;
		this.container.style.height = `${sizeh}px`;

		// Lens circle
		if (sizew != this.lensBox.w || sizeh != this.lensBox.h) {
			const cx = Math.ceil(sizew * 0.5);
			const cy = Math.ceil(sizeh * 0.5);
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

	/** @ignore */
	updateMask(cameraT, center, radius) {
		if (this.svgElement == null) { this.createSvgLensMask(); }
		if (this.svgElement == null) return;

		// Lens Mask
		const viewport = this.viewer.camera.viewport;
		if (this.layerSvgAnnotation != null) {
			// Compensate the mask transform with the inverse of the annotation svgGroup transform
			const inverse = true;
			const invTransfStr = this.layerSvgAnnotation.getSvgGroupTransform(cameraT, inverse);
			this.svgMonochromeGroup.setAttribute("transform", invTransfStr);
			this.svgPlainGroup.setAttribute("transform", invTransfStr);
			//const transfStr = this.layerSvgAnnotation.getSvgGroupTransform(cameraT, true);
			//this.svgCopyGroup.setAttribute("transform",	transfStr);
		} else {
			// Set the viewbox.  (in the other branch it is set by the layerSvgAnnotation)
			this.svgElement.setAttribute('viewBox', `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`);
		}

		// Update monochrome and plain, rect and circle mask positions
		this.svgMonochromeMaskRect.setAttributeNS(null, 'x', -viewport.w / 2);
		this.svgMonochromeMaskRect.setAttributeNS(null, 'y', -viewport.h / 2);
		this.svgMonochromeMaskRect.setAttributeNS(null, 'width', viewport.w);
		this.svgMonochromeMaskRect.setAttributeNS(null, 'height', viewport.h);

		this.svgMonochromeMaskCircle.setAttributeNS(null, 'cx', center.x - viewport.w / 2);
		this.svgMonochromeMaskCircle.setAttributeNS(null, 'cy', center.y - viewport.h / 2);
		this.svgMonochromeMaskCircle.setAttributeNS(null, 'r', radius - this.borderWidth - 2);
		
		this.svgPlainMaskRect.setAttributeNS(null, 'x', -viewport.w / 2);
		this.svgPlainMaskRect.setAttributeNS(null, 'y', -viewport.h / 2);
		this.svgPlainMaskRect.setAttributeNS(null, 'width', viewport.w);
		this.svgPlainMaskRect.setAttributeNS(null, 'height', viewport.h);

		this.svgPlainMaskCircle.setAttributeNS(null, 'cx', center.x - viewport.w / 2);
		this.svgPlainMaskCircle.setAttributeNS(null, 'cy', center.y - viewport.h / 2);
		this.svgPlainMaskCircle.setAttributeNS(null, 'r', radius - this.borderWidth - 2);
	}

}

export {LensDashboard}
export {RenderingMode}