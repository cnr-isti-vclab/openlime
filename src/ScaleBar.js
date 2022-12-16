import { Util } from './Util'

/* units are those in use, scale and ruler will pick the appropriate unit 
   allUnits contains all of the known units */

class Units {
    constructor(options) {
        this.units = ["km", "m", "cm", "mm"],
        this.allUnits = { "mm": 1, "cm": 10, "m": 1000, "km": 1e6, "in": 254, "ft": 254*12,  }
        this.precision = 2;
        if(options)
            Object.assign(options, this);
    }

    format(d, unit) {
		if(d == 0)
			return '';
        if(unit)
            return (d/this.allUnits[unit]).toFixed(this.precision) + unit;
        
        let best_u = null;
        let best_penalty = 100;
        for(let u of this.units) {
            let size = this.allUnits[u];
            let penalty = d <= 0 ? 0 : Math.abs(Math.log10(d/size)-1);
            if(penalty < best_penalty) {
                best_u = u;
                best_penalty = penalty;
            }
        }
        return this.format(d, best_u);
    }
}

class ScaleBar extends Units {
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

		this.line = Util.createSVGElement('line', { x1: 5, y1: 26.5, x2:this.width - 5, y2: 26.5 });

		this.text = Util.createSVGElement('text', { x: '50%', y: '16px', 'dominant-basiline': 'middle', 'text-anchor': 'middle' });
		this.text.textContent = "";
		
		this.svg.appendChild(this.line);
		this.svg.appendChild(this.text);
		this.viewer.containerElement.appendChild(this.svg);
		this.viewer.addEvent('draw', () => { this.updateScale(); });
    }

	/** @ignore */
	updateScale() {
		//let zoom = this.viewer.camera.getCurrentTransform(performance.now()).z;
		let zoom = this.viewer.camera.target.z;
		if (zoom == this.lastScaleZoom)
			return;
		this.lastScaleZoom = zoom;
		let s = this.bestLength(this.width/2, this.width, this.pixelSize, zoom);

		let margin = this.width - s.length;
		this.line.setAttribute('x1', margin / 2);
		this.line.setAttribute('x2', this.width - margin/2);
		this.text.textContent = this.format(s.label);
	}
	

    //find best length for scale from min -> max
	//zoom 2 means a pixel in image is now 2 pixel on screen, scale is
	/** @ignore */
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

export { Units, ScaleBar }