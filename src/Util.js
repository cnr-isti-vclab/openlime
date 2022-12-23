// HELPERS
window.structuredClone = typeof (structuredClone) == "function" ? structuredClone : function (value) { return JSON.parse(JSON.stringify(value)); };

// Utilities
class Util {

    static createSVGElement(tag, attributes) {
        let e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attributes)
            for (const [key, value] of Object.entries(attributes))
                e.setAttribute(key, value);
        return e;
    }

    static SVGFromString(text) {
        const parser = new DOMParser();
        return parser.parseFromString(text, "image/svg+xml").documentElement;
    }

    static async loadSVG(url) {
        let response = await fetch(url);
        if (!response.ok) {
            const message = `An error has occured: ${response.status}`;
            throw new Error(message);
        }
        let data = await response.text();
        let result = null;
        if (Util.isSVGString(data)) {
            result = Util.SVGFromString(data);
        } else {
            const message = `${url} is not an SVG file`;
            throw new Error(message);
        }
        return result;
    };

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
            const img = await Util.loadImage(u);
            if (imgClass) img.classList.add(imgClass);
            container.appendChild(img);
        }
    }

    static isSVGString(input) {
        const regex = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!doctype svg[^>]*\s*(?:\[?(?:\s*<![^>]*>\s*)*\]?)*[^>]*>\s*)?(?:<svg[^>]*>[^]*<\/svg>|<svg[^/>]*\/\s*>)\s*$/i
        if (input == undefined || input == null)
            return false;
        input = input.toString().replace(/\s*<!Entity\s+\S*\s*(?:"|')[^"]+(?:"|')\s*>/img, '');
        input = input.replace(/<!--([\s\S]*?)-->/g, '');
        return Boolean(input) && regex.test(input);
    }

    static computeSDF(buffer, w, h, cutoff = 0.25, radius = 8) {

        // 2D Euclidean distance transform by Felzenszwalb & Huttenlocher https://cs.brown.edu/~pff/dt/
        function edt(data, width, height, f, d, v, z) {
            for (let x = 0; x < width; x++) {
                for (let y = 0; y < height; y++) {
                    f[y] = data[y * width + x]
                }
                edt1d(f, d, v, z, height)
                for (let y = 0; y < height; y++) {
                    data[y * width + x] = d[y]
                }
            }
            for (let y = 0; y < height; y++) {
                for (let x = 0; x < width; x++) {
                    f[x] = data[y * width + x]
                }
                edt1d(f, d, v, z, width)
                for (let x = 0; x < width; x++) {
                    data[y * width + x] = Math.sqrt(d[x])
                }
            }
        }

        // 1D squared distance transform
        function edt1d(f, d, v, z, n) {
            v[0] = 0;
            z[0] = -INF
            z[1] = +INF

            for (let q = 1, k = 0; q < n; q++) {
                var s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
                while (s <= z[k]) {
                    k--
                    s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
                }
                k++
                v[k] = q
                z[k] = s
                z[k + 1] = +INF
            }

            for (let q = 0, k = 0; q < n; q++) {
                while (z[k + 1] < q) k++
                d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]
            }
        }

        var data = new Uint8ClampedArray(buffer);
        const INF = 1e20;
        const size = Math.max(w, h);

        // temporary arrays for the distance transform
        const gridOuter = Array(w * h);
        const gridInner = Array(w * h);
        const f = Array(size);
        const d = Array(size);
        const z = Array(size + 1);
        const v = Array(size);

        for (let i = 0; i < w * h; i++) {
            var a = data[i] / 255.0;
            gridOuter[i] = a === 1 ? 0 : a === 0 ? INF : Math.pow(Math.max(0, 0.5 - a), 2);
            gridInner[i] = a === 1 ? INF : a === 0 ? 0 : Math.pow(Math.max(0, a - 0.5), 2);
        }

        edt(gridOuter, w, h, f, d, v, z)
        edt(gridInner, w, h, f, d, v, z)

        const dist = window.Float32Array ? new Float32Array(w * h) : new Array(w * h)

        for (let i = 0; i < w * h; i++) {
            dist[i] = Math.min(Math.max(1 - ((gridOuter[i] - gridInner[i]) / radius + cutoff), 0), 1)
        }
        return dist;
    }

    static async rasterizeSVG(url, size = [64, 64]) {
        const svg = await Util.loadSVG(url);
        const svgWidth = svg.getAttribute('width');
        const svgHeight = svg.getAttribute('height');

        const canvas = document.createElement("canvas");
        canvas.width = size[0];
        canvas.height = size[1];

        svg.setAttributeNS(null, 'width', `100%`);
        svg.setAttributeNS(null, 'height', `100%`);

        const ctx = canvas.getContext("2d");
        const data = (new XMLSerializer()).serializeToString(svg);
        const DOMURL = window.URL || window.webkitURL || window;

        const img = new Image();
        const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
        const svgurl = DOMURL.createObjectURL(svgBlob);
        img.src = svgurl;

        return new Promise((resolve, reject) => {
            img.onload = () => {
                const aCanvas = size[0] / size[1];
                const aSvg = svgWidth / svgHeight;
                let wSvg = 0;
                let hSvg = 0;
                if (aSvg < aCanvas) {
                    hSvg = size[1];
                    wSvg = hSvg * aSvg;
                } else {
                    wSvg = size[0];
                    hSvg = wSvg / aSvg;
                }

                let dy = (size[1] - hSvg) * 0.5;
                let dx = (size[0] - wSvg) * 0.5;

                ctx.translate(dx, dy);
                ctx.drawImage(img, 0, 0);

                DOMURL.revokeObjectURL(svgurl);

                const imageData = ctx.getImageData(0, 0, size[0], size[1]);

                // const imgURI = canvas
                //     .toDataURL('image/png')
                //     .replace('image/png', 'image/octet-stream');

                // console.log(imgURI);

                resolve(imageData);
            };
            img.onerror = (e) => reject(e);
        });
    }

}

export { Util }