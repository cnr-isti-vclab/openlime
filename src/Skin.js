
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
		let element = svg.querySelector(selector);
		if(!element)
			throw("Missing element in svg, selector: " + selector);
		return element.cloneNode(true);
	}

	/**
	 * Appends the selected SVG icons to the `container`.
	 * @param {HTMLElement} container A HTML DOM node.
	 * @param {string} selector A CSS selector (e.g. a class name).
	 * @returns {SVGElement} A pointer to the SVG icon referenced by the selector.
	 */
	static async appendIcon(container, selector) {
		let icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		icon.style.visibility = 'hidden';
		container.appendChild(icon);
		
		
		this.setIcon(icon, selector);		
		icon.style.visibility = 'visible';
		return icon;
	}
	static async setIcon(icon, selector) {
		//we need to make sure the icon display is not none (or some parent) in order to get the bbox
		let placeholder = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		let parent = icon.parentElement;
		parent.replaceChild(placeholder, icon);
		document.body.appendChild(icon);
		
		let element = await Skin.getElement(selector);
		icon.appendChild(element);

		let box = element.getBBox();

		let tlist = element.transform.baseVal;
		if (tlist.numberOfItems == 0)
			tlist.appendItem(icon.createSVGTransform());
		tlist.getItem(0).setTranslate(-box.x, -box.y);

		icon.setAttribute('viewBox', `${-pad} ${-pad} ${box.width + 2*pad} ${box.height + 2*pad}`);
		icon.setAttribute('preserveAspectRatio', 'xMidYMid meet');

		parent.replaceChild(icon, placeholder);
		
	}
}

export { Skin }