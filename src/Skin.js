
let url = 'skin.svg';
let svg = null;
let pad = 5;

class Skin {

	static setUrl(u) { url = u; }
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
	static async getElement(selector) { 
		if(!svg)
		await Skin.loadSvg();
		return svg.querySelector(selector).cloneNode(true);
	}

	//can't return just the svg, because it needs the container BEFORE computing the box.
	static async appendIcon(container, selector) {
		let element = await Skin.getElement(selector);

		let icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		container.appendChild(icon);
		icon.appendChild(element);
		
		let box = element.getBBox();

		let tlist = element.transform.baseVal;
		if (tlist.numberOfItems == 0)
			tlist.appendItem(icon.createSVGTransform());
		tlist.getItem(0).setTranslate(-box.x, -box.y);

		icon.setAttribute('viewBox', `${-pad} ${-pad} ${box.width + 2*pad} ${box.height + 2*pad}`);
		icon.setAttribute('preserveAspectRatio', 'xMidYMid meet');
		return icon;
	}
}

export { Skin }