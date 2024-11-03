
/**
 *  @default
 */
let url = 'skin/skin.svg';

/**
 *  @default
 */
let pad = 5;

let svg = null;


/**
 * @typedef {Object} SkinIcon
 * A UI icon element from the skin file
 * @property {string} class - CSS class name (must start with 'openlime-')
 * @property {SVGElement} element - SVG DOM element
 */

/**
 * Manages SVG-based user interface elements (skin) for OpenLIME.
 * 
 * The Skin system provides a centralized way to manage and customize UI elements
 * through an SVG-based theming system. Each UI component (buttons, menus, toolbars, 
 * dialogs) sources its visual elements from a single SVG file.
 * 
 * Design Requirements:
 * - SVG elements must have class names prefixed with 'openlime-'
 * - Icons should be properly viewboxed for scaling
 * - SVG should use relative paths for resources
 * 
 * Technical Features:
 * - Async SVG loading
 * - DOM-based SVG manipulation
 * - Element cloning support
 * - Automatic viewbox computation
 * - Padding management
 * - Transform handling
 * 
 *
 * Default Configuration
 * 
 * - {string} url - Default skin URL ('skin/skin.svg')
 * - {number} pad - Icon padding in SVG units (5)
 * 
 * File Structure Requirements:
 * ```xml
 * <svg>
 *   <!-- Icons should use openlime- prefix -->
 *   <g class="openlime-home">...</g>
 *   <g class="openlime-zoom">...</g>
 *   <g class="openlime-menu">...</g>
 * </svg>
 * ```
 * 
 * Common Icon Classes:
 * - openlime-home: Home/reset view
 * - openlime-zoom: Zoom controls
 * - openlime-menu: Menu button
 * - openlime-close: Close button
 * - openlime-next: Next/forward
 * - openlime-prev: Previous/back
 * 
 * Usage Notes:
 * - Always use async/await with icon methods
 * - Icons are cloned to allow multiple instances
 * - SVG is loaded once and cached
 * - Padding is applied uniformly
 * - ViewBox is computed automatically
 *
 * 
 * @static
 */
class Skin {
	/**
	 * Sets the URL for the skin SVG file
	 * @param {string} url - Path to SVG file containing UI elements
	 * 
	 * @example
	 * ```javascript
	 * // Set custom skin location
	 * Skin.setUrl('/assets/custom-skin.svg');
	 * ```
	 */
	static setUrl(u) { url = u; }

	/**
	 * Loads and parses the skin SVG file
	 * Creates a DOM-based SVG element for future use
	 * 
	 * @throws {Error} If SVG file fails to load
	 * @returns {Promise<void>}
	 * 
	 * @example
	 * ```javascript
	 * await Skin.loadSvg();
	 * // SVG is now loaded and ready for use
	 * ```
	 */
	static async loadSvg() {
		var response = await fetch(url);
		if (!response.ok) {
			throw Error("Failed loading " + url + ": " + response.statusText);
			return;
		}

		let text = await response.text();
		let parser = new DOMParser();
		svg = parser.parseFromString(text, "image/svg+xml").documentElement;
	}

	/**
	 * Retrieves a specific element from the skin by CSS selector
	 * Automatically loads the SVG if not already loaded
	 * 
	 * @param {string} selector - CSS selector for the desired element
	 * @returns {Promise<SVGElement>} Cloned SVG element
	 * @throws {Error} Implicitly if element not found
	 * 
	 * @example
	 * ```javascript
	 * // Get home icon
	 * const homeIcon = await Skin.getElement('.openlime-home');
	 * 
	 * // Get menu button
	 * const menuBtn = await Skin.getElement('.openlime-menu');
	 * ```
	 */
	static async getElement(selector) {
		if (!svg)
			await Skin.loadSvg();
		return svg.querySelector(selector).cloneNode(true);
	}

	/**
	 * Appends an SVG icon to a container element
	 * Handles both string selectors and SVG elements
	 * Automatically manages viewBox and transformations
	 * 
	 * @param {HTMLElement} container - Target DOM element to append icon to
	 * @param {string|SVGElement} icon - Icon selector or SVG element
	 * @returns {Promise<SVGElement>} Processed and appended SVG element
	 * 
	 * Processing steps:
	 * 1. Loads icon (from selector or element)
	 * 2. Creates SVG wrapper if needed
	 * 3. Computes and sets viewBox
	 * 4. Applies padding
	 * 5. Handles transformations
	 * 6. Appends to container
	 * 
	 * @example
	 * ```javascript
	 * // Append by selector
	 * const icon1 = await Skin.appendIcon(
	 *     document.querySelector('.toolbar'),
	 *     '.openlime-zoom'
	 * );
	 * 
	 * // Append existing SVG
	 * const icon2 = await Skin.appendIcon(
	 *     container,
	 *     existingSvgElement
	 * );
	 * ```
	 */
	static async appendIcon(container, icon) {
		let element = null;
		let box = null;
		if (typeof icon == 'string') {
			element = await Skin.getElement(icon);
			icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			icon.appendChild(element);
			document.body.appendChild(icon);
			box = element.getBBox();
			let tlist = element.transform.baseVal;
			if (tlist.numberOfItems == 0)
				tlist.appendItem(icon.createSVGTransform());
			tlist.getItem(0).setTranslate(-box.x, -box.y);
		} else {
			document.body.appendChild(icon);
			box = icon.getBBox();
		}
		icon.setAttribute('viewBox', `${-pad} ${-pad} ${box.width + 2 * pad} ${box.height + 2 * pad}`);
		icon.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		container.appendChild(icon);
		return icon;
	}
}

export { Skin }