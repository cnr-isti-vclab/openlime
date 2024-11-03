import { Util } from './Util'

/**
 * ScaleBar module provides measurement scale visualization and unit conversion functionality.
 * Includes both a base Units class for unit management and a ScaleBar class for visual representation.
 *
 * Units class provides unit conversion and formatting capabilities.
 * Supports various measurement units and automatic unit selection based on scale.
 */
class Units {
	/**
	 * Creates a new Units instance.
	 * @param {Object} [options] - Configuration options
	 * @param {string[]} [options.units=['km', 'm', 'cm', 'mm', 'µm']] - Available units in order of preference
	 * @param {Object.<string, number>} [options.allUnits] - All supported units and their conversion factors to millimeters
	 * @param {number} [options.precision=2] - Number of decimal places for formatted values
	 */
	constructor(options) {
		this.units = ["km", "m", "cm", "mm", "µm"],
			this.allUnits = { "µm": 0.001, "mm": 1, "cm": 10, "m": 1000, "km": 1e6, "in": 254, "ft": 254 * 12 }
		this.precision = 2;
		if (options)
			Object.assign(options, this);
	}

	/**
	 * Formats a measurement value with appropriate units.
	 * Automatically selects the best unit if none specified.
	 * @param {number} d - Value to format (in millimeters)
	 * @param {string} [unit] - Specific unit to use for formatting
	 * @returns {string} Formatted measurement with units (e.g., "5.00 mm" or "1.00 m")
	 * 
	 * @example
	 * const units = new Units();
	 * units.format(1500);       // Returns "1.50 m"
	 * units.format(1500, 'mm'); // Returns "1500.00 mm"
	 */
	format(d, unit) {
		if (d == 0)
			return '';
		if (unit)
			return (d / this.allUnits[unit]).toFixed(this.precision) + unit;

		let best_u = null;
		let best_penalty = 100;
		for (let u of this.units) {
			let size = this.allUnits[u];
			let penalty = d <= 0 ? 0 : Math.abs(Math.log10(d / size) - 1);
			if (penalty < best_penalty) {
				best_u = u;
				best_penalty = penalty;
			}
		}
		return this.format(d, best_u);
	}
}

/**
 * ScaleBar class creates a visual scale bar that updates with viewer zoom level.
 * Features:
 * - Automatic scale adjustment based on zoom
 * - Smart unit selection
 * - SVG-based visualization
 * - Configurable size and appearance
 * @extends Units
 */
class ScaleBar extends Units {
	/**
	 * Creates a new ScaleBar instance.
	 * @param {number} pixelSize - Size of a pixel in real-world units (in mm)
	 * @param {Viewer} viewer - The OpenLIME viewer instance
	 * @param {Object} [options] - Configuration options
	 * @param {number} [options.width=200] - Width of the scale bar in pixels
	 * @param {number} [options.fontSize=24] - Font size for scale text in pixels
	 * @param {number} [options.precision=0] - Number of decimal places for scale values
	 * 
	 * @property {SVGElement} svg - Main SVG container element
	 * @property {SVGElement} line - Scale bar line element
	 * @property {SVGElement} text - Scale text element
	 * @property {number} lastScaleZoom - Last zoom level where scale was updated
	 */
	constructor(pixelSize, viewer, options) {
		super(options)
		options = Object.assign(this, {
			pixelSize: pixelSize,
			viewer: viewer,
			width: 200,
			fontSize: 24,
			precision: 0
		}, options);
		Object.assign(this, options);

		this.svg = Util.createSVGElement('svg', { viewBox: `0 0 ${this.width} 30` });
		this.svg.classList.add('openlime-scale');

		this.line = Util.createSVGElement('line', { x1: 5, y1: 26.5, x2: this.width - 5, y2: 26.5 });

		this.text = Util.createSVGElement('text', { x: '50%', y: '16px', 'dominant-basiline': 'middle', 'text-anchor': 'middle' });
		this.text.textContent = "";

		this.svg.appendChild(this.line);
		this.svg.appendChild(this.text);
		this.viewer.containerElement.appendChild(this.svg);
		this.viewer.addEvent('draw', () => { this.updateScale(); });
	}

	/**
	 * Updates the scale bar based on current zoom level.
	 * Called automatically on viewer draw events.
	 * @private
	 */
	updateScale() {
		//let zoom = this.viewer.camera.getCurrentTransform(performance.now()).z;
		let zoom = this.viewer.camera.target.z;
		if (zoom == this.lastScaleZoom)
			return;
		this.lastScaleZoom = zoom;
		let s = this.bestLength(this.width / 2, this.width, this.pixelSize, zoom);

		let margin = this.width - s.length;
		this.line.setAttribute('x1', margin / 2);
		this.line.setAttribute('x2', this.width - margin / 2);
		this.text.textContent = this.format(s.label);
	}

	/**
	 * Calculates the best scale length and label value for current zoom.
	 * Tries to find a "nice" round number that fits within the given constraints.
	 * @private
	 * @param {number} min - Minimum desired length in pixels
	 * @param {number} max - Maximum desired length in pixels
	 * @param {number} pixelSize - Size of a pixel in real-world units
	 * @param {number} zoom - Current zoom level
	 * @returns {Object} Scale information
	 * @returns {number} .length - Length of scale bar in pixels
	 * @returns {number} .label - Value to display (in real-world units)
	 */
	bestLength(min, max, pixelSize, zoom) {
		pixelSize /= zoom;
		//closest power of 10:
		let label10 = Math.pow(10, Math.floor(Math.log(max * pixelSize) / Math.log(10)));
		let length10 = label10 / pixelSize;
		if (length10 > min) return { length: length10, label: label10 };

		let label20 = label10 * 2;
		let length20 = length10 * 2;
		if (length20 > min) return { length: length20, label: label20 };

		let label50 = label10 * 5;
		let length50 = length10 * 5;

		if (length50 > min) return { length: length50, label: label50 };
		return { length: 0, label: 0 }
	}
}
/**
 * Example usage:
 * ```javascript
 * // Create scale bar with 0.1mm per pixel
 * const scaleBar = new ScaleBar(0.1, viewer, {
 *     width: 300,
 *     fontSize: 20,
 *     precision: 1,
 *     units: ['m', 'cm', 'mm']  // Only use these units
 * });
 * 
 * // The scale bar will automatically update with viewer zoom
 * 
 * // Format a specific measurement
 * scaleBar.format(1234);  // Returns "1.23 m"
 * ```
 */
export { Units, ScaleBar }
