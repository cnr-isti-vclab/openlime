import { CoordinateSystem } from "./CoordinateSystem";
import { Util } from "./Util"

/*
 * @fileoverview
 * LensDashboard module provides functionality for creating and managing an interactive lens interface
 * in OpenLIME. It handles the lens border, SVG masking, and positioning of UI elements around the lens.
 */

/**
 * @enum {string}
 * Defines rendering modes for lens and background areas.
 * @property {string} draw - "fill:white;" Shows content in the specified area
 * @property {string} hide - "fill:black;" Hides content in the specified area
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
 * LensDashboard class creates an interactive container for a lens interface.
 * It provides:
 * - A square HTML container that moves with the lens
 * - SVG-based circular lens border with drag interaction for resizing
 * - Masking capabilities for controlling content visibility inside/outside the lens
 * - Ability to add HTML elements positioned relative to the lens
 */
class LensDashboard {
	/**
	 * Creates a new LensDashboard instance.
	 * @param {Viewer} viewer - The OpenLIME viewer instance
	 * @param {Object} [options] - Configuration options
	 * @param {number} [options.containerSpace=80] - Extra space around the lens for dashboard elements (in pixels)
	 * @param {number[]} [options.borderColor=[0.078, 0.078, 0.078, 1]] - RGBA color for lens border
	 * @param {number} [options.borderWidth=12] - Width of the lens border (in pixels)
	 * @param {LayerSvgAnnotation} [options.layerSvgAnnotation=null] - Associated SVG annotation layer
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
		this.svgMaskId = 'openlime-image-mask';
		this.svgMaskUrl = `url(#${this.svgMaskId})`;

		this.noupdate = false;
	}

	/**
	 * Sets up interactive lens border resizing.
	 * Creates event listeners for pointer events to allow users to drag the lens border to resize.
	 * @private
	 * @param {SVGElement} circle - The SVG circle element representing the lens border
	 */
	setupCircleInteraction(circle) {
		circle.style.pointerEvents = 'auto';
		this.isCircleSelected = false;

		// OffsetXY are unstable from this point (I don't know why)
		// Thus get coordinates from clientXY
		function getXYFromEvent(e, container) {
			const x = e.clientX - container.offsetLeft - container.clientLeft;
			const y = e.clientY - container.offsetTop - container.clientTop;
			return { offsetX: x, offsetY: y };
		}

		this.viewer.containerElement.addEventListener('pointerdown', (e) => {
			if (circle == e.target) {
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
	 * Toggles the visibility of the dashboard UI elements.
	 * Uses CSS classes to show/hide the interface.
	 */
	toggle() {
		this.container.classList.toggle('closed');
	}


	/**
	 * Associates a LayerSvgAnnotation with the dashboard.
	 * This enables proper masking of SVG annotations within the lens area.
	 * @param {LayerSvgAnnotation} layer - The SVG annotation layer to associate
	 */
	setLayerSvgAnnotation(layer) {
		this.layerSvgAnnotation = layer;
		this.svgElement = this.layerSvgAnnotation.svgElement;
	}

	/**
	 * Creates SVG masking elements for the lens.
	 * Sets up a composite mask consisting of:
	 * - A full-viewport rectangle for the background
	 * - A circle for the lens area
	 * The mask controls visibility of content inside vs outside the lens.
	 * @private
	 */
	createSvgLensMask() {
		if (this.svgElement == null) this.setupSvgElement();
		if (this.svgElement == null) return;

		// Create a mask made of a rectangle (it will be set to the full viewport) for the background
		// And a circle, corresponding to the lens. 
		const w = 100; // The real size will be set at each frame by the update function
		this.svgMask = Util.createSVGElement("mask", { id: this.svgMaskId });
		this.svgGroup = Util.createSVGElement("g");
		this.outMask = Util.createSVGElement("rect", { id: 'outside-lens-mask', x: -w / 2, y: -w / 2, width: w, height: w, style: "fill:black;" });
		this.inMask = Util.createSVGElement("circle", { id: 'inside-lens-mask', cx: 0, cy: 0, r: w / 2, style: "fill:white;" });
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

	/**
	 * Sets up the SVG container element for the lens.
	 * Will either:
	 * - Use the SVG element from an associated annotation layer
	 * - Find an existing SVG element in the shadow DOM
	 * - Create a new SVG element if needed
	 * @private
	 */
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
	 * Applies the lens mask to an SVG element.
	 * Elements with the mask will only be visible within the lens area
	 * (or outside, depending on mask configuration).
	 * @param {SVGElement} svg - The SVG element to mask
	 */
	setMaskOnSvgLayer(svg) {
		svg.setAttributeNS(null, 'mask', this.svgMaskUrl);
	}

	/**
	 * Removes the lens mask from an SVG element.
	 * Returns the element to its normal, unmasked rendering.
	 * @param {SVGElement} svg - The SVG element to unmask
	 */
	removeMaskFromSvgLayer(svg) {
		svg.removeAttribute('mask');
	}

	/**
	 * Adds an HTML element to the dashboard container.
	 * The element should use absolute positioning relative to the container.
	 * Example:
	 * ```javascript
	 * const button = document.createElement('button');
	 * button.style = 'position: absolute; left: 10px; top: 10px;';
	 * lensDashboard.append(button);
	 * ```
	 * @param {HTMLElement} elm - The HTML element to add
	 */
	append(elm) {
		this.container.appendChild(elm);
	}

	/**
	 * Sets the rendering mode for the lens area.
	 * Controls whether content inside the lens is shown or hidden.
	 * @param {RenderingMode} mode - The rendering mode to use
	 */
	setLensRenderingMode(mode) {
		this.inMask.setAttributeNS(null, 'style', mode);
	}

	/**
	 * Sets the rendering mode for the background (area outside the lens).
	 * Controls whether content outside the lens is shown or hidden.
	 * @param {RenderingMode} mode - The rendering mode to use
	 */
	setBackgroundRenderingMode(mode) {
		this.outMask.setAttributeNS(null, 'style', mode);
	}

	/**
	 * Updates the dashboard position and size.
	 * Called internally when the lens moves or resizes.
	 * @private
	 * @param {number} x - Center X coordinate in scene space
	 * @param {number} y - Center Y coordinate in scene space
	 * @param {number} r - Lens radius in scene space
	 */
	update(x, y, r) {
		const useGL = false;
		const center = CoordinateSystem.fromSceneToCanvasHtml({ x: x, y: y }, this.viewer.camera, useGL);

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
			circle.setAttributeNS(null, 'r', radius - 0.5 * this.borderWidth);
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

	/**
	 * Updates the SVG mask position and size.
	 * Called internally by update() to keep the mask aligned with the lens.
	 * @private
	 * @param {Transform} cameraT - Current camera transform
	 * @param {Object} center - Lens center in canvas coordinates
	 * @param {number} center.x - Center X coordinate
	 * @param {number} center.y - Center Y coordinate
	 * @param {number} radius - Lens radius in canvas coordinates
	 */
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
		this.outMask.setAttribute('x', -viewport.w / 2);
		this.outMask.setAttribute('y', -viewport.h / 2);
		this.outMask.setAttribute('width', viewport.w);
		this.outMask.setAttribute('height', viewport.h);

		// Set lens parameter for inner lens
		this.inMask.setAttributeNS(null, 'cx', center.x - viewport.w / 2);
		this.inMask.setAttributeNS(null, 'cy', center.y - viewport.h / 2);
		this.inMask.setAttributeNS(null, 'r', radius - this.borderWidth - 2);
	}

}

/**
 * Example usage of LensDashboard:
 * ```javascript
 * const lensDashboard = new OpenLIME.LensDashboard(limeViewer, {
 *     containerSpace: 100,
 *     borderColor: [0.1, 0.1, 0.1, 1],
 *     borderWidth: 10
 * });
 * 
 * const lensLayer = new OpenLIME.Layer({
 *     type: "lens",
 *     layers: [innerLayer],
 *     camera: limeViewer.camera,
 *     radius: 200,
 *     dashboard: lensDashboard,
 *     visible: true
 * });
 * 
 * const button = document.createElement('button');
 * button.innerHTML = "Toggle Layer";
 * button.style = `
 *     position: absolute;
 *     left: 10px;
 *     top: 10px;
 *     pointer-events: auto;
 * `;
 * lensDashboard.append(button);
 * ```
 */

export { LensDashboard, RenderingMode };