
class Color {
	constructor(r, g = undefined, b = undefined, a = undefined) {
		if (typeof (r) == 'string') {
			if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(r)) {
				let c = r.substring(1).split('');
				if (c.length == 3) {
					c = [c[0], c[0], c[1], c[1], c[2], c[2]];
				}
				c = '0x' + c.join('') + 'FF';
				r = Color.valFunc(c >> 24);
				g = Color.valFunc(c >> 16);
				b = Color.valFunc(c >> 8);
				a = Color.valFunc(c);
			} else if (/^#([A-Fa-f0-9]{4}){1,2}$/.test(r)) {
				let c = r.substring(1).split('');
				c = '0x' + c.join('');
				r = Color.valFunc(c >> 24);
				g = Color.valFunc(c >> 16);
				b = Color.valFunc(c >> 8);
				a = Color.valFunc(c);
			} else if(/^rgb\(/.test(r)) {
				let c = r.split("(")[1].split(")")[0];
				c = c.split(',');
				r = Color.clamp( c[0] / 255, 0.0, 1.0);
				g = Color.clamp( c[1] / 255, 0.0, 1.0);
				b = Color.clamp( c[2] / 255, 0.0, 1.0);
				a = 1.0;
			} else if(/^rgba\(/.test(r)) {
				let c = r.split("(")[1].split(")")[0];
				c = c.split(',');
				r = Color.clamp( c[0] / 255, 0.0, 1.0);
				g = Color.clamp( c[1] / 255, 0.0, 1.0);
				b = Color.clamp( c[2] / 255, 0.0, 1.0);
				a = Color.clamp( c[3] / 255, 0.0, 1.0);
			} else {
				throw Error("Value is not a color");
			}
		}
		this.r = r;
		this.g = g;
		this.b = b;
		this.a = a;
	}

	static clamp = (num, min, max) => Math.min(Math.max(num, min), max);

	static hexFunc(c) {
		var hex = c.toString(16).toUpperCase();
		return hex.length == 1 ? "0" + hex : hex;
	}

	static valFunc(c) {
		return Color.clamp((c & 255) / 255, 0.0, 1.0);
	}

	static rgbToHex(r, g, b) {
		const rgb = b | (g << 8) | (r << 16);
		return '#' + ((0x1000000 | rgb).toString(16).substring(1)).toUpperCase();
	}

	static rgbToHexa(r, g, b, a) {
		return '#' + Color.hexFunc(r) + Color.hexFunc(g) + Color.hexFunc(b) + Color.hexFunc(a);
	}

	value() {
		return [r, g, b, a];
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
			domain: [0.0, 1.0]
		}, options);
		Object.assign(this, options);
		this.colors = colors;
		this.nval = colors.length;
		const nd = this.domain.length;
		const delta = (this.domain[nd - 1] - this.domain[0]) / (this.nval - 1);
		this.xarr = [];
		for (let i = 0; i < this.nval; i++) {
			this.xarr.push(this.domain[0] + i * delta);
		}
	}

	static clamp = (num, min, max) => Math.min(Math.max(num, min), max);

	linear(x) {
		Colormap.clamp(x, this.xarr[0], this.xarr[this.nval]);
		const c = this.colors[0];
		for (let i = 0; i < this.nval - 1; i++) {
			if (x > this.xarr[i] && x <= this.xarr[i + 1]) {
				c.r = (this.colors[i + 1].r - this.colors[i].r) * (x - this.xarr[i]) / (this.xarr[i + 1] - this.xarr[i]) + this.colors[i].r;
				c.g = (this.colors[i + 1].g - this.colors[i].g) * (x - this.xarr[i]) / (this.xarr[i + 1] - this.xarr[i]) + this.colors[i].g;
				c.b = (this.colors[i + 1].b - this.colors[i].b) * (x - this.xarr[i]) / (this.xarr[i + 1] - this.xarr[i]) + this.colors[i].b;
				c.a = (this.colors[i + 1].a - this.colors[i].a) * (x - this.xarr[i]) / (this.xarr[i + 1] - this.xarr[i]) + this.colors[i].a;
			}
		}
		return c;
	}
}
export { Color, Colormap }