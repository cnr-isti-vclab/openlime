// HELPERS
window.structuredClone = typeof(structuredClone) == "function" ? structuredClone : function (value) { return  JSON.parse(JSON.stringify(value)); };

// Utilities
class Util {

    static createSVGElement(tag, attributes) {
        let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attributes)
            for (const [key, value] of Object.entries(attributes))
                e.setAttribute(key, value);
        return e;
    }
    
    static svgFromString(text) {
		const parser = new DOMParser();
		return parser.parseFromString(text, "image/svg+xml").documentElement;
	}

    static async loadHTML(url) {
        let response = await fetch(url);
        if (!response.ok) {
            const message = `An error has occured: ${response.status}`;
            throw new Error(message);
        }
        let data = await response.text();
        return data;
    };
    
    static async loadJSON(url) {
        let response = await fetch(url);
        if (!response.ok) {
            const message = `An error has occured: ${response.status}`;
            throw new Error(message);
        }
        let data = await response.json();
        return data;
    }
    
    static async loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.addEventListener('load', () => resolve(img));
            img.addEventListener('error', (err) => reject(err));
            img.src = url;
        });
    }
    
    static async appendImg(container, url, imgClass = null) {
        const img = await Util.loadImage(url);
        if (imgClass) img.classList.add(imgClass);
        container.appendChild(img);
    }
    
    static async appendImgs(container, urls, imgClass = null) {
        for (const u of urls) {
            const img = await Util.loadImage(u)
            if (imgClass) img.classList.add(imgClass);
            container.appendChild(img);
        }
    }
    

}

export { Util }