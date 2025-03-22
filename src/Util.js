// HELPERS
window.structuredClone = typeof (structuredClone) == "function" ? structuredClone : function (value) { return JSON.parse(JSON.stringify(value)); };

/**
 * Utility class providing various helper functions for OpenLIME.
 * Includes methods for SVG manipulation, file loading, image processing, and string handling.
 * 
 * 
 * @static
 */
class Util {

    /**
     * Pads a number with leading zeros
     * @param {number} num - Number to pad
     * @param {number} size - Desired string length
     * @returns {string} Zero-padded number string
     * 
     * @example
     * ```javascript
     * Util.padZeros(42, 5); // Returns "00042"
     * ```
     */
    static padZeros(num, size) {
        return num.toString().padStart(size, '0');
    }

    /**
     * Prints source code with line numbers
     * Useful for shader debugging
     * @param {string} str - Source code to print
     * @private
     */
    static printSrcCode(str) {
        let result = '';
        str.split(/\r\n|\r|\n/).forEach((line, i) => {
            const nline = Util.padZeros(i + 1, 5);
            result += `${nline}   ${line}\n`;
        });
        console.log(result);
    }
    

    /**
     * Creates an SVG element with optional attributes
     * @param {string} tag - SVG element tag name
     * @param {Object} [attributes] - Key-value pairs of attributes
     * @returns {SVGElement} Created SVG element
     * 
     * @example
     * ```javascript
     * const circle = Util.createSVGElement('circle', {
     *     cx: '50',
     *     cy: '50',
     *     r: '40'
     * });
     * ```
     */
    static createSVGElement(tag, attributes) {
        const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
        if (attributes)
            for (const [key, value] of Object.entries(attributes))
                e.setAttribute(key, value);
        return e;
    }

    /**
     * Parses SVG string into DOM element
     * @param {string} text - SVG content string
     * @returns {SVGElement} Parsed SVG element
     * @throws {Error} If parsing fails
     */
    static SVGFromString(text) {
        const parser = new DOMParser();
        return parser.parseFromString(text, "image/svg+xml").documentElement;
    }

    /**
     * Loads SVG file from URL
     * @param {string} url - URL to SVG file
     * @returns {Promise<SVGElement>} Loaded and parsed SVG
     * @throws {Error} If fetch fails or content isn't SVG
     * 
     * @example
     * ```javascript
     * const svg = await Util.loadSVG('icons/icon.svg');
     * document.body.appendChild(svg);
     * ```
     */
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

    /**
     * Loads HTML content from URL
     * @param {string} url - URL to HTML file
     * @returns {Promise<string>} HTML content
     * @throws {Error} If fetch fails
     */
    static async loadHTML(url) {
        let response = await fetch(url);
        if (!response.ok) {
            const message = `An error has occured: ${response.status}`;
            throw new Error(message);
        }
        let data = await response.text();
        return data;
    };

    /**
     * Loads and parses JSON from URL
     * @param {string} url - URL to JSON file
     * @returns {Promise<Object>} Parsed JSON data
     * @throws {Error} If fetch or parsing fails
     */
    static async loadJSON(url) {
        let response = await fetch(url);
        if (!response.ok) {
            const message = `An error has occured: ${response.status}`;
            throw new Error(message);
        }
        let data = await response.json();
        return data;
    }

    /**
     * Loads image from URL
     * @param {string} url - Image URL
     * @returns {Promise<HTMLImageElement>} Loaded image
     * @throws {Error} If image loading fails
     */
    static async loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.addEventListener('load', () => resolve(img));
            img.addEventListener('error', (err) => reject(err));
            img.src = url;
        });
    }

    /**
     * Appends loaded image to container
     * @param {HTMLElement} container - Target container
     * @param {string} url - Image URL
     * @param {string} [imgClass] - Optional CSS class
     * @returns {Promise<void>}
     */
    static async appendImg(container, url, imgClass = null) {
        const img = await Util.loadImage(url);
        if (imgClass) img.classList.add(imgClass);
        container.appendChild(img);
        return img;
    }

    /**
      * Appends multiple images to container
      * @param {HTMLElement} container - Target container
      * @param {string[]} urls - Array of image URLs
      * @param {string} [imgClass] - Optional CSS class
      * @returns {Promise<void>}
      */
    static async appendImgs(container, urls, imgClass = null) {
        for (const u of urls) {
            const img = await Util.loadImage(u);
            if (imgClass) img.classList.add(imgClass);
            container.appendChild(img);
        }
    }

    /**
     * Tests if string is valid SVG content
     * @param {string} input - String to test
     * @returns {boolean} True if string is valid SVG
     */
    static isSVGString(input) {
        const regex = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!doctype svg[^>]*\s*(?:\[?(?:\s*<![^>]*>\s*)*\]?)*[^>]*>\s*)?(?:<svg[^>]*>[^]*<\/svg>|<svg[^/>]*\/\s*>)\s*$/i
        if (input == undefined || input == null)
            return false;
        input = input.toString().replace(/\s*<!Entity\s+\S*\s*(?:"|')[^"]+(?:"|')\s*>/img, '');
        input = input.replace(/<!--([\s\S]*?)-->/g, '');
        return Boolean(input) && regex.test(input);
    }

    /**
     * Computes Signed Distance Field from image data
     * Implementation based on Felzenszwalb & Huttenlocher algorithm
     * 
     * @param {Uint8Array} buffer - Input image data
     * @param {number} w - Image width
     * @param {number} h - Image height
     * @param {number} [cutoff=0.25] - Distance field cutoff
     * @param {number} [radius=8] - Maximum distance to compute
     * @returns {Float32Array|Array} Computed distance field
     * 
     * Technical Details:
     * - Uses 2D Euclidean distance transform
     * - Separate inner/outer distance fields
     * - Optimized grid computation
     * - Sub-pixel accuracy
     */
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

    /**
     * Rasterizes SVG to ImageData
     * @param {string} url - SVG URL
     * @param {number[]} [size=[64,64]] - Output dimensions [width, height]
     * @returns {Promise<ImageData>} Rasterized image data
     * 
     * Processing steps:
     * 1. Loads SVG file
     * 2. Sets up canvas context
     * 3. Handles aspect ratio
     * 4. Centers image
     * 5. Renders to ImageData
     * 
     * @example
     * ```javascript
     * const imageData = await Util.rasterizeSVG('icon.svg', [128, 128]);
     * context.putImageData(imageData, 0, 0);
     * ```
     */
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

/**
 * Implementation Notes:
 * 
 * File Loading:
 * - Consistent error handling across loaders
 * - Promise-based async operations
 * - Resource cleanup (URL revocation)
 * 
 * SVG Processing:
 * - Namespace-aware element creation
 * - Robust SVG validation
 * - Attribute management
 * 
 * Image Processing:
 * - Canvas-based rasterization
 * - Aspect ratio preservation
 * - Memory efficient operations
 * 
 * SDF Computation:
 * - Efficient distance field generation
 * - Configurable parameters
 * - TypedArray support
 * 
 * Error Handling:
 * - Input validation
 * - Descriptive error messages
 * - Resource cleanup on failure
 * 
 * Browser Compatibility:
 * - Fallbacks for older browsers
 * - Polyfill for structuredClone
 * - Vendor prefix handling
 */

export { Util }