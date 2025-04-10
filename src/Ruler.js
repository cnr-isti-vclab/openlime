import { Util } from './Util'
import { Units } from './ScaleBar'
import { CoordinateSystem } from './CoordinateSystem';


/**
 * @fileoverview
 * Ruler module provides measurement functionality for the OpenLIME viewer.
 * Allows users to measure distances in the scene with an interactive ruler tool.
 * Extends the Units class to handle unit conversions and formatting.
 *
 * Ruler class creates an interactive measurement tool for the OpenLIME viewer.
 * Features:
 * - Interactive distance measurement
 * - SVG-based visualization
 * - Scale-aware display
 * - Multiple measurement history
 * - Touch and mouse support
 * 
 * @extends Units
 */
class Ruler extends Units {
	/**
	 * Creates a new Ruler instance.
	 * @param {Viewer} viewer - The OpenLIME viewer instance
	 * @param {number} pixelSize - Size of a pixel in real-world units
	 * @param {Object} [options] - Configuration options
	 * @param {boolean} [options.enabled=false] - Whether the ruler is initially enabled
	 * @param {number} [options.priority=100] - Event handling priority
	 * @param {number} [options.fontSize=18] - Font size for measurements in pixels
	 * @param {number} [options.markerSize=8] - Size of measurement markers in pixels
	 * @param {string} [options.cursor='crosshair'] - Cursor style when ruler is active
	 */
	constructor(viewer, pixelSize, options) {
		super(options);
		Object.assign(this, {
			viewer: viewer,
			camera: viewer.camera,
			overlay: viewer.overlayElement,
			pixelSize: pixelSize,
			enabled: false,
			priority: 100,
			measure: null, //current measure
			history: [],  //past measures
			fontSize: 18,
			markerSize: 8,
			cursor: "crosshair",

			svg: null,
			first: null,
			second: null
		});
		if (options)
			Object.assign(this, options);
	}

	/**
	 * Activates the ruler tool.
	 * Creates SVG elements if needed and sets up event listeners.
	 * Changes cursor to indicate tool is active.
	 */
	start() {
		this.enabled = true;
		this.previousCursor = this.overlay.style.cursor;
		this.overlay.style.cursor = this.cursor;

		if (!this.svg) {
			this.svg = Util.createSVGElement('svg', { class: 'openlime-ruler' });
			this.svgGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
			this.svg.append(this.svgGroup);
			this.overlay.appendChild(this.svg);
			this.viewer.addEvent('draw', () => this.update());
			this.update();
		}
	}

	/**
	 * Deactivates the ruler tool.
	 * Restores original cursor and clears current measurement.
	 */
	end() {
		this.enabled = false;
		this.overlay.style.cursor = this.previousCursor;
		this.clear();
	}

	/**
	 * Clears all measurements.
	 * Removes all SVG elements and resets measurement history.
	 */
	clear() {
		this.svgGroup.replaceChildren([]);
		this.measure = null;
		this.history = [];
	}

	/*finish() {
		let m = this.measure;
		m.line = Util.createSVGElement('line', { x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2 });
		this.svgGroup.appendChild(m.line);

		m.text = Util.createSVGElement('text');
		m.text.textContent = this.format(this.length(m));
		this.svgGroup.appendChild(m.text);

		this.history.push(m);
		this.measure = null;
		this.update();
	}*/

	/**
	 * Updates the visual representation of all measurements.
	 * Handles camera transformations and viewport changes.
	 * @private
	 */
	update() {
		if (!this.history.length)
			return;
		//if not enabled skip
		let t = this.camera.getGlCurrentTransform(performance.now());
		let viewport = this.camera.glViewport();
		this.svg.setAttribute('viewBox', `${-viewport.w / 2} ${-viewport.h / 2} ${viewport.w} ${viewport.h}`);
		let c = { x: 0, y: 0 }; //this.boundingBox().corner(0);
		this.svgGroup.setAttribute("transform",
			`translate(${t.x} ${t.y}) rotate(${-t.a} 0 0) scale(${t.z} ${t.z}) translate(${c.x} ${c.y})`);

		for (let m of this.history)
			this.updateMeasure(m, t);
	}

	/**
	 * Creates a marker SVG element.
	 * @private
	 * @param {number} x - X coordinate in scene space
	 * @param {number} y - Y coordinate in scene space
	 * @returns {SVGElement} The created marker element
	 */
	createMarker(x, y) {
		let m = Util.createSVGElement("path");
		this.svgGroup.appendChild(m);
		return m;
	}

	/**
	 * Updates a marker's position and size.
	 * @private
	 * @param {SVGElement} marker - The marker to update
	 * @param {number} x - X coordinate in scene space
	 * @param {number} y - Y coordinate in scene space
	 * @param {number} size - Marker size in pixels
	 */
	updateMarker(marker, x, y, size) {
		let d = `M ${x - size} ${y} L ${x + size} ${y} M ${x} ${y - size} L ${x} ${y + size}`;
		marker.setAttribute('d', d);
	}

	/**
	 * Updates measurement text display.
	 * Handles text positioning and scaling based on camera transform.
	 * @private
	 * @param {Object} measure - The measurement object to update
	 * @param {number} fontsize - Font size in pixels
	 */
	updateText(measure, fontsize) {
		measure.text.setAttribute('font-size', fontsize + "px");

		let dx = measure.x1 - measure.x2;
		let dy = measure.y1 - measure.y2;

		let length = Math.sqrt(dx * dx + dy * dy);
		if (length > 0) {
			dx /= length;
			dy /= length;
		}
		if (dx < 0) {
			dx = -dx;
			dy = -dy;
		}

		let mx = (measure.x1 + measure.x2) / 2;
		let my = (measure.y1 + measure.y2) / 2;
		if (dy / dx < 0) {
			mx -= 0.25 * dy * fontsize;
			my += dx * fontsize;
		} else {
			my -= 0.25 * fontsize;
			mx += 0.25 * fontsize;
		}
		measure.text.setAttribute('x', mx);
		measure.text.setAttribute('y', my);
		let pixelSize = this.pixelSize;
		let units = null;
		if (!pixelSize) {
			pixelSize = 1.0;
			units = 'px';
		}
		measure.text.textContent = this.format(length * pixelSize, units);
	}

	/**
	 * Creates a new measurement.
	 * Sets up SVG elements for line, markers, and text.
	 * @private
	 * @param {number} x - Initial X coordinate
	 * @param {number} y - Initial Y coordinate
	 * @returns {Object} Measurement object containing all SVG elements and coordinates
	 */
	createMeasure(x, y) {
		let m = {
			marker1: this.createMarker(x, y),
			x1: x, y1: y,
			marker2: this.createMarker(x, y),
			x2: x, y2: y
		};
		m.line = Util.createSVGElement('line', { x1: m.x1, y1: m.y1, x2: m.x2, y2: m.y2 });
		this.svgGroup.appendChild(m.line);

		m.text = Util.createSVGElement('text');
		m.text.textContent = '';
		this.svgGroup.appendChild(m.text);

		return m;
	}

	/**
	 * Updates a measurement's visual elements.
	 * @private
	 * @param {Object} measure - The measurement to update
	 * @param {Transform} transform - Current camera transform
	 */
	updateMeasure(measure, transform) {
		let markersize = window.devicePixelRatio * this.markerSize / transform.z;

		this.updateMarker(measure.marker1, measure.x1, measure.y1, markersize);

		this.updateMarker(measure.marker2, measure.x2, measure.y2, markersize);

		let fontsize = window.devicePixelRatio * this.fontSize / transform.z;
		this.updateText(measure, fontsize);

		for (let p of ['x1', 'y1', 'x2', 'y2'])
			measure.line.setAttribute(p, measure[p]);
	}

	/**
	 * Handles single tap/click events.
	 * Creates or completes measurements.
	 * @private
	 * @param {Event} e - The pointer event
	 * @returns {boolean} Whether the event was handled
	 */
	fingerSingleTap(e) {
		if (!this.enabled)
			return false;

		//let transform = this.camera.getCurrentTransform(performance.now())
		//let { x, y } = this.camera.mapToScene(e.layerX, e.layerY, transform);
		const { x, y } = CoordinateSystem.fromViewportToScene({ x: e.layerX, y: e.layerY }, this.camera, false);


		if (!this.measure) {
			this.measure = this.createMeasure(x, y);
			this.history.push(this.measure);
		} else {
			this.measure.x2 = x;
			this.measure.y2 = y;
			this.measure = null;
		}
		this.update();
		e.preventDefault();
	}

	/**
	 * Handles hover/move events.
	 * Updates the current measurement endpoint.
	 * @private
	 * @param {Event} e - The pointer event
	 * @returns {boolean} Whether the event was handled
	 */
	fingerHover(e) {
		if (!this.enabled || !this.measure)
			return false;

		//let transform = this.camera.getCurrentTransform(performance.now())
		//let { x, y } = this.camera.mapToScene(e.layerX, e.layerY, transform);
		const { x, y } = CoordinateSystem.fromViewportToScene({ x: e.layerX, y: e.layerY }, this.camera, false);

		this.measure.x2 = x;
		this.measure.y2 = y;
		this.update();
		e.preventDefault();
	}
};
/**
 * Example usage of Ruler:
 * ```javascript
 * // Create ruler with 1mm per pixel scale
 * const ruler = new Ruler(viewer, 0.001, {
 *     fontSize: 24,
 *     markerSize: 10
 * });
 * 
 * // Activate ruler
 * ruler.start();
 * 
 * // Deactivate ruler
 * ruler.end();
 * 
 * // Clear measurements
 * ruler.clear();
 * ```
 */
export { Ruler }
