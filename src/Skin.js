
let url = 'skin/skin.svg';
let svg = null;
let pad = 5;

/**
 * The static class **Skin** implements some utilities for handling the skin file.
 * A skin file is a SVG file containing SVG icons that are used by **UIBasic*
 * for customizing the visual appearance of the user interface (i.e., icons for buttons, menu, toolbar, dialog...).
 * Each SVG drawing element must be tagged with a 'class' attribute  whose name must begin with *openlime-*:
 * for instance, the HOME icon is a SVG element tagged with `class="openlime-home"`. 
 */
class Skin {
	/**
	 * Sets the URL of the SVG skin file. By default it is *'skin/skin.svg'*;
	 * @param {string} u The URL of the SVG skin file.
	 */
	static setUrl(u) { url = u; }

	/**
	 * Loads the SVG skin file and converts it into a global DOM SVGElement ready for use in a web page.
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
	 * Gets the SVG element with a specific CSS `selector`.
	 * @param {string} selector A CSS selector (e.g. a class name).
	 * @returns {SVGElement} The SVGElement referenced by the selector.
	 */
	static async getElement(selector) {
		if (!svg)
			await Skin.loadSvg();
		return svg.querySelector(selector).cloneNode(true);
	}

	/**
	 * Appends the selected SVG element to the `container`.
	 * @param {HTMLElement} container A HTML DOM node.
	 * @param {SVGElement|string} elm An SVGElement or a CSS selector (e.g. a class name).
	 * @returns {SVGElement} A pointer to the SVG icon referenced by the elm.
	 */
	static async appendIcon(container, icon) {
		let element = null;
		if (typeof icon == 'string') {
			element = await Skin.getElement(icon);
			icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
			icon.appendChild(element);
			container.appendChild(icon);
			let box = element.getBBox();
			let tlist = element.transform.baseVal;
			if (tlist.numberOfItems == 0)
				tlist.appendItem(icon.createSVGTransform());
			tlist.getItem(0).setTranslate(-box.x, -box.y);
			icon.setAttribute('viewBox', `${-pad} ${-pad} ${box.width + 2 * pad} ${box.height + 2 * pad}`);
			icon.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		} else {
			container.appendChild(icon);
			let box = icon.getBBox();
			icon.setAttribute('viewBox', `${-pad} ${-pad} ${box.width + 2 * pad} ${box.height + 2 * pad}`);
			icon.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		}
		return icon;
	 }
}

export { Skin }