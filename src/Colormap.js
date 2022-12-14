class Spline {
	constructor(xs, ys) {
		this.xs = xs;
		this.ys = ys;
		this.ks = this.getNaturalKs(new Float64Array(this.xs.length));
	}

	getNaturalKs(ks) {
		const n = this.xs.length - 1;
		const A = Spline.zerosMat(n + 1, n + 2);
		for (let i = 1; i < n; i++ // rows
		) {
			A[i][i - 1] = 1 / (this.xs[i] - this.xs[i - 1]);
			A[i][i] =
				2 *
				(1 / (this.xs[i] - this.xs[i - 1]) + 1 / (this.xs[i + 1] - this.xs[i]));
			A[i][i + 1] = 1 / (this.xs[i + 1] - this.xs[i]);
			A[i][n + 1] =
				3 *
				((this.ys[i] - this.ys[i - 1]) /
					((this.xs[i] - this.xs[i - 1]) * (this.xs[i] - this.xs[i - 1])) +
					(this.ys[i + 1] - this.ys[i]) /
					((this.xs[i + 1] - this.xs[i]) * (this.xs[i + 1] - this.xs[i])));
		}
		A[0][0] = 2 / (this.xs[1] - this.xs[0]);
		A[0][1] = 1 / (this.xs[1] - this.xs[0]);
		A[0][n + 1] =
			(3 * (this.ys[1] - this.ys[0])) /
			((this.xs[1] - this.xs[0]) * (this.xs[1] - this.xs[0]));
		A[n][n - 1] = 1 / (this.xs[n] - this.xs[n - 1]);
		A[n][n] = 2 / (this.xs[n] - this.xs[n - 1]);
		A[n][n + 1] =
			(3 * (this.ys[n] - this.ys[n - 1])) /
			((this.xs[n] - this.xs[n - 1]) * (this.xs[n] - this.xs[n - 1]));
		return Spline.solve(A, ks);
	}
	/**
	 * inspired by https://stackoverflow.com/a/40850313/4417327
	 */
	getIndexBefore(target) {
		let low = 0;
		let high = this.xs.length;
		let mid = 0;
		while (low < high) {
			mid = Math.floor((low + high) / 2);
			if (this.xs[mid] < target && mid !== low) {
				low = mid;
			}
			else if (this.xs[mid] >= target && mid !== high) {
				high = mid;
			}
			else {
				high = low;
			}
		}
		if (low === this.xs.length - 1) {
			return this.xs.length - 1;
		}
		return low + 1;
	}
	at(x) {
		let i = this.getIndexBefore(x);
		const t = (x - this.xs[i - 1]) / (this.xs[i] - this.xs[i - 1]);
		const a = this.ks[i - 1] * (this.xs[i] - this.xs[i - 1]) -
			(this.ys[i] - this.ys[i - 1]);
		const b = -this.ks[i] * (this.xs[i] - this.xs[i - 1]) +
			(this.ys[i] - this.ys[i - 1]);
		const q = (1 - t) * this.ys[i - 1] +
			t * this.ys[i] +
			t * (1 - t) * (a * (1 - t) + b * t);
		return q;
	}

	// Utilities 

	static solve(A, ks) {
		const m = A.length;
		let h = 0;
		let k = 0;
		while (h < m && k <= m) {
			let i_max = 0;
			let max = -Infinity;
			for (let i = h; i < m; i++) {
				const v = Math.abs(A[i][k]);
				if (v > max) {
					i_max = i;
					max = v;
				}
			}
			if (A[i_max][k] === 0) {
				k++;
			}
			else {
				Spline.swapRows(A, h, i_max);
				for (let i = h + 1; i < m; i++) {
					const f = A[i][k] / A[h][k];
					A[i][k] = 0;
					for (let j = k + 1; j <= m; j++)
						A[i][j] -= A[h][j] * f;
				}
				h++;
				k++;
			}
		}
		for (let i = m - 1; i >= 0; i-- // rows = columns
		) {
			var v = 0;
			if (A[i][i]) {
				v = A[i][m] / A[i][i];
			}
			ks[i] = v;
			for (let j = i - 1; j >= 0; j-- // rows
			) {
				A[j][m] -= A[j][i] * v;
				A[j][i] = 0;
			}
		}
		return ks;
	}

	static zerosMat(r, c) {
		const A = [];
		for (let i = 0; i < r; i++)
			A.push(new Float64Array(c));
		return A;
	}

	static swapRows(m, k, l) {
		let p = m[k];
		m[k] = m[l];
		m[l] = p;
	}
}



class Color {
	constructor(r, g = undefined, b = undefined, a = undefined) {
		if (typeof (r) == 'string') {
			if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(r)) {
				let c = r.substring(1).split('');
				if (c.length == 3) {
					c = [c[0], c[0], c[1], c[1], c[2], c[2]];
				}
				c = '0x' + c.join('') + 'FF';
				r = Color.normalizedRGBA(c >> 24);
				g = Color.normalizedRGBA(c >> 16);
				b = Color.normalizedRGBA(c >> 8);
				a = Color.normalizedRGBA(c);
			} else if (/^#([A-Fa-f0-9]{4}){1,2}$/.test(r)) {
				let c = r.substring(1).split('');
				c = '0x' + c.join('');
				r = Color.normalizedRGBA(c >> 24);
				g = Color.normalizedRGBA(c >> 16);
				b = Color.normalizedRGBA(c >> 8);
				a = Color.normalizedRGBA(c);
			} else if (/^rgb\(/.test(r)) {
				let c = r.split("(")[1].split(")")[0];
				c = c.split(',');
				r = Color.clamp(c[0] / 255);
				g = Color.clamp(c[1] / 255);
				b = Color.clamp(c[2] / 255);
				a = 1.0;
			} else if (/^rgba\(/.test(r)) {
				let c = r.split("(")[1].split(")")[0];
				c = c.split(',');
				r = Color.clamp(c[0] / 255);
				g = Color.clamp(c[1] / 255);
				b = Color.clamp(c[2] / 255);
				a = Color.clamp(c[3] / 255);
			} else {
				throw Error("Value is not a color");
			}
		}
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	static clamp = (num, min = 0.0, max = 1.0) => Math.min(Math.max(num, min), max);

	static hex(c) {
		var hex = c.toString(16).toUpperCase();
		return hex.length == 1 ? "0" + hex : hex;
	}

	static normalizedRGBA(c) {
		return Color.clamp((c & 255) / 255);
	}

	static rgbToHex(r, g, b) {
		const rgb = b | (g << 8) | (r << 16);
		return '#' + ((0x1000000 | rgb).toString(16).substring(1)).toUpperCase();
	}

	static rgbToHexa(r, g, b, a) {
		return '#' + Color.hex(r) + Color.hex(g) + Color.hex(b) + Color.hex(a);
	}

	value() {
		return [this.r, this.g, this.b, this.a];
	}

	toRGB() {
		const rgb = [this.r * 255, this.g * 255, this.b * 255];
		rgb.forEach((e, idx, arr) => {
			arr[idx] = Color.clamp(Math.round(e), 0, 255);
		});
		return rgb;
	}

	toHex() {
		const rgb = this.toRGB();
		return Color.rgbToHex(rgb[0], rgb[1], rgb[2]);
	}

	toHexa() {
		const rgba = this.toRGBA();
		return Color.rgbToHexa(rgba[0], rgba[1], rgba[2], rgba[3]);
	}

	toRGBA() {
		const rgba = [this.r * 255, this.g * 255, this.b * 255, this.a * 255];
		rgba.forEach((e, idx, arr) => {
			arr[idx] = Color.clamp(Math.round(e), 0, 255);
		});
		return rgba;
	}
}

class Colormap {
	constructor(colors = [new Color(0, 0, 0, 1), new Color(1, 1, 1, 1)], options = '') {
		options = Object.assign({
			domain: [0.0, 1.0],
			lowColor: null,
			highColor: null,
			description: '',
			type: 'linear'
		}, options);
		Object.assign(this, options);
		const nval = colors.length;

		if (!this.lowColor) this.lowColor = colors[0];
		if (!this.highColor) this.highColor = colors[nval - 1];

		const nd = this.domain.length;
		if (nval < 2 && nd != 2 && this.nval != nd && this.domain[nd - 1] <= this.domain[0]) {
			throw Error("Colormap colors/domain bad format");
		}

		const delta = (this.domain[nd - 1] - this.domain[0]) / (nval - 1);
		this.xarr = [];
		this.rarr = [];
		this.garr = [];
		this.barr = [];
		this.aarr = [];
		for (let i = 0; i < nval; i++) {
			if (nd == 2)
				this.xarr.push(this.domain[0] + i * delta);
			else
				this.xarr.push(this.domain[i]);
			this.rarr.push(colors[i].r);
			this.garr.push(colors[i].g);
			this.barr.push(colors[i].b);
			this.aarr.push(colors[i].a);
		}
		this.rspline = new Spline(this.xarr, this.rarr);
		this.gspline = new Spline(this.xarr, this.garr);
		this.bspline = new Spline(this.xarr, this.barr);
		this.aspline = new Spline(this.xarr, this.aarr);
	}

	static clamp = (num, min, max) => Math.min(Math.max(num, min), max);

	rangeDomain() {
		return [this.domain[0], this.domain[this.domain.length - 1]];
	}

	bar(x) {
		if (x < this.xarr[0]) return this.lowColor;
		if (x > this.xarr[this.xarr.length - 1]) return this.highColor;
		const c = new Color(this.rarr[0], this.garr[0], this.barr[0], this.aarr[0]);
		for (let i = 0; i < this.xarr.length - 1; i++) {
			if (x > this.xarr[i] && x <= this.xarr[i + 1]) {
				c.r = this.rarr[i];
				c.g = this.garr[i];
				c.b = this.barr[i];
				c.a = this.aarr[i];
			}
		}
		return c;
	}

	linear(x) {
		if (x < this.xarr[0]) return this.lowColor;
		if (x > this.xarr[this.xarr.length - 1]) return this.highColor;
		const c = new Color(this.rarr[0], this.garr[0], this.barr[0], this.aarr[0]);
		for (let i = 0; i < this.xarr.length - 1; i++) {
			if (x > this.xarr[i] && x <= this.xarr[i + 1]) {
				c.r = (this.rarr[i + 1] - this.rarr[i]) * (x - this.xarr[i]) / (this.xarr[i + 1] - this.xarr[i]) + this.rarr[i];
				c.g = (this.garr[i + 1] - this.garr[i]) * (x - this.xarr[i]) / (this.xarr[i + 1] - this.xarr[i]) + this.garr[i];
				c.b = (this.barr[i + 1] - this.barr[i]) * (x - this.xarr[i]) / (this.xarr[i + 1] - this.xarr[i]) + this.barr[i];
				c.a = (this.aarr[i + 1] - this.aarr[i]) * (x - this.xarr[i]) / (this.xarr[i + 1] - this.xarr[i]) + this.aarr[i];
			}
		}
		return c;
	}

	spline(x) {
		if (x < this.xarr[0]) return this.lowColor;
		if (x > this.xarr[this.xarr.length - 1]) return this.highColor;
		return new Color(this.rspline.at(x), this.gspline.at(x), this.bspline.at(x), this.aspline.at(x));
	}

	at(x) {
		let result = null;
		switch (this.type) {
			case 'linear':
				result = this.linear(x);
				break;
			case 'spline':
				result = this.spline(x);
				break;
			case 'bar':
				result = this.bar(x);
				break;
			default:
				throw Error("Interpolant type not exist");
				break;
		}
		return result;
	}

	/** Precision as parameter for future dev */
	sample(maxSteps) {
		let min = this.xarr[0];
		let max = this.xarr[this.xarr.length - 1];
		if (this.domain.length == 2) maxSteps = this.xarr.length;
		let buffer = new Uint8Array(maxSteps * 4);
		let delta = (max - min) / maxSteps;
		for (let i = 0; i < maxSteps; i++) {
			let c = this.at(min + i * delta).toRGBA();
			buffer[i * 4 + 0] = c[0];
			buffer[i * 4 + 1] = c[1];
			buffer[i * 4 + 2] = c[2];
			buffer[i * 4 + 3] = c[3];
		}
		return { min, max, buffer };
	}
}

class ColormapLegend {
	constructor(viewer, colorscale, options) {
		options = Object.assign({
			nticks: 6,
			legendWidth: 25,
			textColor: '#fff',
			class: 'openlime-legend'
		}, options);
		Object.assign(this, options);
		this.viewer = viewer;
		this.colorscale = colorscale;

		this.container = document.querySelector(`.${this.class}`);
		if (!this.container) {
			this.container = document.createElement('div');
			this.container.classList.add(this.class);
		}

		this.scale = document.createElement('div');
		this.scale.style = `display: flex; border-radius: 20px; height: 22px; color: ${this.textColor}; 
		font-weight: bold; overflow: hidden; margin: 0px 2px 4px 0px; background-color: #7c7c7c; 
		font-family: Arial,Helvetica,sans-serif; font-size:12px;
		border: 1px solid #000;`;
		this.container.appendChild(this.scale);
		this.viewer.containerElement.appendChild(this.container);

		const domain = colorscale.rangeDomain();
		const legend = document.createElement('div');
		legend.style = `display: flex; align-items: center; justify-content: center; 
		background: ${colorscale.linear(domain[0]).toHex()}; width: ${this.legendWidth}%; margin: 0`;
		legend.textContent = colorscale.description;
		this.scale.appendChild(legend);

		if(this.colorscale.type == 'linear') this.legendLinear();
		if(this.colorscale.type == 'bar') this.legendBar();
	}

	legendLinear() {
		const domain = this.colorscale.rangeDomain();
		const delta = (domain[1] - domain[0]) / this.nticks;
		const deltaWidth = (100 - this.legendWidth) / this.nticks;
		let vl = domain[0];
		for (let i = 0; i < this.nticks; i++) {
			let v = domain[0] + delta * i;
			let vr = i < (this.nticks - 1) ? domain[0] + delta * (i + 0.5) : v;
			const c = this.colorscale.at(v);
			const cl = this.colorscale.at(vl);
			const cr = this.colorscale.at(vr);
			const value = document.createElement('div');
			const bkg = `background: linear-gradient(to right, ${cl.toHex()}, ${c.toHex()}, ${cr.toHex()})`
			value.style = `display: flex; align-items: center; justify-content: center; 
			${bkg};	width: ${deltaWidth}%; margin: 0`;
			value.textContent = v.toFixed(1);
			this.scale.appendChild(value);
			vl = vr;
		}
	}

	legendBar() {
		const deltaWidth = (100 - this.legendWidth) / this.colorscale.domain.length;
		for (let i=0 ; i<this.colorscale.xarr.length; i++) {
			const c = new Color(this.colorscale.rarr[i], this.colorscale.garr[i], this.colorscale.barr[i], this.colorscale.aarr[i]);
			const v = this.colorscale.xarr[i];
			const value = document.createElement('div');
			const bkg = `background: ${c.toHex()}`;
			value.style = `display: flex; align-items: center; justify-content: center; 
			${bkg};	width: ${deltaWidth}%; margin: 0`;
			value.textContent = v.toFixed(1);
			this.scale.appendChild(value);
		}
	}

}

export { Color, Colormap, ColormapLegend }