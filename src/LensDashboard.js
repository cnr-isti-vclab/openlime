import { CoordinateSystem } from "./CoordinateSystem";
import { Annotation } from "./Annotation";
import { Util } from "./Util"

/**
 * RenderingMode for lens and background. Currently implemented only draw and hide.
 */
const RenderingMode = {
    draw: "draw",
    hide: "hide",
	filter: "filter"
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
		this.svgFilterMaskId = 'openlime-image-filter-mask';
		this.svgFilterMaskUrl = `url(#${this.svgFilterMaskId})`;
		this.svgPlainMaskId = 'openlime-image-plain-mask';
		this.svgPlainMaskUrl = `url(#${this.svgPlainMaskId})`;
		this.svgFilter = null;
		this.filterId="svgFilter"; 
		this.filterUrl = 'url(#' + this.filterId + ')';

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

		// Create a filter for filter rendering
		this.svgDefs = Util.createSVGElement("defs");
		this.svgElement.appendChild(this.svgDefs);
		this.setMonochromeFilter();

		// This is the filter mask. Define the behaviour for the svgCopyGroup
		// where objects are copied to perform filter rendering.
		const w = 100; // The real size will be set at each frame by the update function
		this.svgFilterGroup = Util.createSVGElement("g");
        this.svgFilterMask = Util.createSVGElement("mask", {id: this.svgFilterMaskId});
		this.svgFilterMaskRect = Util.createSVGElement("rect", {x:-w/2, y:-w/2, width: w, height:w,  style:"fill:white;"});
        this.svgFilterMaskCircle = Util.createSVGElement("circle", {cx:0, cy:0, r: w/2, style:"fill:black;"});
		this.svgFilterGroup.appendChild(this.svgFilterMaskRect);
        this.svgFilterGroup.appendChild(this.svgFilterMaskCircle);
        this.svgFilterMask.appendChild(this.svgFilterGroup);
		this.svgElement.appendChild(this.svgFilterMask);

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
		
		// filter rendering requires two instance of each object
		// This group contain a copy of all the svg elements that need to be drawn, when rendering mode is filter
		this.svgCopyGroup = Util.createSVGElement("g", {id:"copyGroup"});
		this.svgCopyGroup.setAttributeNS(null, 'mask', this.svgFilterMaskUrl);
		this.svgCopyGroup.setAttributeNS(null, 'filter', this.filterUrl);
		if (this.layerSvgAnnotation != null) {
			this.layerSvgAnnotation.svgGroup.appendChild(this.svgCopyGroup);
		} else {
			this.svgElement.appendChild(this.svgCopyGroup);
		}

		this.setRenderingMode( RenderingMode.draw, RenderingMode.filter);
		this.renderingModeId = 4;

		console.log(this.svgElement);
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
				this.setRenderingMode( RenderingMode.draw, RenderingMode.filter);
			break;		
			case 5:
				this.setRenderingMode( RenderingMode.filter, RenderingMode.draw);
			break;		
			case 6:
				this.setRenderingMode( RenderingMode.hide, RenderingMode.filter);
			break;		
			case 7:
				this.setRenderingMode( RenderingMode.filter, RenderingMode.hide);
			break;		
			case 8:
				this.setRenderingMode( RenderingMode.filter, RenderingMode.filter);
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

		// Handle filter
		if (lensMode == RenderingMode.filter && outMode == RenderingMode.filter) {
			// No mask needed, draw both side in filter
			this.svgCopyGroup.removeAttribute('mask');
			this.svgCopyGroup.setAttributeNS(null, 'filter', this.filterUrl);
			
			// Activate draw inside and outside lens for filter component
			this.svgFilterMaskCircle.setAttributeNS(null, 'style', "fill:white;");
			this.svgFilterMaskRect.setAttributeNS(null, 'style', "fill:white;");

			// Hide draw inside and outside lens for plain component
			this.svgPlainMaskCircle.setAttributeNS(null, 'style', "fill:black;");
			this.svgPlainMaskRect.setAttributeNS(null, 'style', "fill:black;");
		} else if (lensMode == RenderingMode.filter) {
			// Activate filter inside lens
			this.svgCopyGroup.setAttributeNS(null, 'mask', this.svgFilterMaskUrl);
			this.svgCopyGroup.setAttributeNS(null, 'filter', this.filterUrl);
			this.svgFilterMaskCircle.setAttributeNS(null, 'style', "fill:white;");
			this.svgFilterMaskRect.setAttributeNS(null, 'style', "fill:black;");

			// Hide plain draw inside lens
			this.svgPlainMaskCircle.setAttributeNS(null, 'style', "fill:black;");
		} else if (outMode == RenderingMode.filter) {
			// Activate filter outside lens
			this.svgCopyGroup.setAttributeNS(null, 'mask', this.svgFilterMaskUrl);
			this.svgCopyGroup.setAttributeNS(null, 'filter', this.filterUrl);
			this.svgFilterMaskCircle.setAttributeNS(null, 'style', "fill:black;");
			this.svgFilterMaskRect.setAttributeNS(null, 'style', "fill:white;");

			// Hide plain draw outside lens
			this.svgPlainMaskRect.setAttributeNS(null, 'style', "fill:black;");
		} 

		// Handle plain draw and hide
		if (lensMode != RenderingMode.filter) {
			// Set lens rendering mode
			const fillLens = lensMode == RenderingMode.draw ? "fill:white;" : "fill:black;";
			this.svgPlainMaskCircle.setAttributeNS(null, 'style', fillLens);

			// Hide filter draw inside lens
			this.svgFilterMaskCircle.setAttributeNS(null, 'style',  "fill:black;");
		} 

		if (outMode != RenderingMode.filter) {
			// Set outside rendering mode
			const fillOut  = outMode == RenderingMode.draw ? "fill:white;" : "fill:black;";
			this.svgPlainMaskRect.setAttributeNS(null, 'style', fillOut);

			// Hide filter draw outside lens
			this.svgFilterMaskRect.setAttributeNS(null, 'style', "fill:black;");
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

			// During filter rendering, copy all svg elements to perform two draw steps.
			if (this.lensRenderingMode == RenderingMode.filter ||
				this.outRenderingMode == RenderingMode.filter) {
				

				// Create a copy of this svg within the svgCopyGroup.
				let clone = svg.cloneNode(true);
				let idCopy = id+this.copySuffix;
				clone.setAttribute('id', idCopy);
			
				//console.log("Adding node with id " + clone.getAttribute('id'));
				this.svgCopyGroup.appendChild(clone);
				// Do not set the filter mask on the element, it is already present in the svgCopyGroup
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
			this.svgFilterGroup.setAttribute("transform", invTransfStr);
			this.svgPlainGroup.setAttribute("transform", invTransfStr);
			//const transfStr = this.layerSvgAnnotation.getSvgGroupTransform(cameraT, true);
			//this.svgCopyGroup.setAttribute("transform",	transfStr);
		} else {
			// Set the viewbox.  (in the other branch it is set by the layerSvgAnnotation)
			this.svgElement.setAttribute('viewBox', `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`);
		}

		// Update filter and plain, rect and circle mask positions
		this.svgFilterMaskRect.setAttributeNS(null, 'x', -viewport.w / 2);
		this.svgFilterMaskRect.setAttributeNS(null, 'y', -viewport.h / 2);
		this.svgFilterMaskRect.setAttributeNS(null, 'width', viewport.w);
		this.svgFilterMaskRect.setAttributeNS(null, 'height', viewport.h);

		this.svgFilterMaskCircle.setAttributeNS(null, 'cx', center.x - viewport.w / 2);
		this.svgFilterMaskCircle.setAttributeNS(null, 'cy', center.y - viewport.h / 2);
		this.svgFilterMaskCircle.setAttributeNS(null, 'r', radius - this.borderWidth - 2);
		
		this.svgPlainMaskRect.setAttributeNS(null, 'x', -viewport.w / 2);
		this.svgPlainMaskRect.setAttributeNS(null, 'y', -viewport.h / 2);
		this.svgPlainMaskRect.setAttributeNS(null, 'width', viewport.w);
		this.svgPlainMaskRect.setAttributeNS(null, 'height', viewport.h);

		this.svgPlainMaskCircle.setAttributeNS(null, 'cx', center.x - viewport.w / 2);
		this.svgPlainMaskCircle.setAttributeNS(null, 'cy', center.y - viewport.h / 2);
		this.svgPlainMaskCircle.setAttributeNS(null, 'r', radius - this.borderWidth - 2);
	}

	/**
	 * Set monochrome filter to be used for RenderingMode.filter
	 * Color computed as R=m00*r+m01*g+m02*b+m03*a+m04, G=m10*r+...
	 * See https://developer.mozilla.org/en-US/docs/Web/SVG/Element/feColorMatrix for details
	 * @param {float} matrixValues 20 value matrix implementing the color transform. If null use default values present in the function.
	 */
	 setMonochromeFilter(matrixValues = null) {
		let svgFilter = Util.createSVGElement("filter", {id:this.filterId});
		const m=0.1; // grey color intensity = m(R+G+B) + b
		const b=0.1;
		const a=1; // fixed transparency
		if (matrixValues == null) {
			matrixValues = [	m, m, m, 0, b,
								m, m, m, 0, b,
								m, m, m, 0, b,
								0, 0, 0, a, 0];
		}
		let svgFeColorMatrix = Util.createSVGElement("feColorMatrix", {in:"SourceGraphic", 
			type:"matrix", values:`${matrixValues}`})
		svgFilter.appendChild(svgFeColorMatrix);
		this.setSvgFilter(svgFilter);
	}

	/**
	 * Set SVG filter for RenderingMode.filter
	 * Default is the monochrome one.
	 * @param {*} svgFilter svgElement which implement the desired filter
	 */
	setSvgFilter(svgFilter) {
		if (this.svgFilter != null) this.svgDefs.removeChild(this.svgFilter);
		
		this.svgFilter = svgFilter;
		this.svgDefs.appendChild(this.svgFilter);
		console.log(svgFilter);
	}

}

export {LensDashboard}
export {RenderingMode}