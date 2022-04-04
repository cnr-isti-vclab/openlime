import { Canvas } from './Canvas.js'
import { Camera } from './Camera.js'
import { PointerManager } from './PointerManager.js'

/**
 * Instantiates a Viewer object given the `div` element or a DOM selector of a `div` element.
 * Additionally, an object literal with Viewer `options` can be specified.
 * The class creates the canvas, enables the WebGL context and takes care of the content redrawing when needed.
 * Viewer is the main class of the OpenLIME framework. It allows access to all the internal structures that make up the system.
 * 
 * @param {(element|String)} div A DOM element or a selector (es. '#openlime' or '.openlime').
 * @param {Object} [options]  An object literal describing the viewer content.
 * @param {color} options.background CSS style for background (it overwrites CSS if present).
 * 
 * @example
 * // Create an OpenLIME canvas into .openlime
 * const lime = new OpenLIME.Viewer('.openlime');
 *
 * // Create an image layer and add it to the canvans
 * const layer = new OpenLIME.Layer({
 *     layout: 'image',
 *     type: 'image',
 *     url: '../../assets/lime/image/lime.jpg'
 * });
 * lime.addLayer('Base', layer);
 * 
 * // Access to internal structures
 * const camera = lime.camera;
 * const canvas = lime.canvas;
 * const layers = canvas.layers;
*/
class Viewer {

    constructor(div, options) {

        Object.assign(this, {
            background: null,
            canvas: {},
            controllers: [],
            camera: new Camera()
        });

        if (typeof (div) == 'string')
            div = document.querySelector(div);

        if (!div)
            throw "Missing element parameter";

        Object.assign(this, options);
        if (this.background)
            div.style.background = this.background;

        this.containerElement = div;
        this.canvasElement = div.querySelector('canvas');
        if (!this.canvasElement) {
            this.canvasElement = document.createElement('canvas');
            div.prepend(this.canvasElement);
        }

        this.overlayElement = document.createElement('div');
        this.overlayElement.classList.add('openlime-overlay');
        this.containerElement.appendChild(this.overlayElement);

        this.canvas = new Canvas(this.canvasElement, this.overlayElement, this.camera, this.canvas);
        this.canvas.addEvent('update', () => { this.redraw(); });

        this.pointerManager = new PointerManager(this.overlayElement);

        this.canvasElement.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            return false;
        });

        var resizeobserver = new ResizeObserver(entries => {
            for (let entry of entries) {
                this.resize(entry.contentRect.width, entry.contentRect.height);
            }
        });
        resizeobserver.observe(this.canvasElement);

        this.resize(this.canvasElement.clientWidth, this.canvasElement.clientHeight);
    }

    /** Adds the given layer to the Viewer.
    * @param {String} id A label to identify the layer.
    * @param {Layer} layer An OpenLIME Layer object.
    */
    addLayer(id, layer) {
        this.canvas.addLayer(id, layer);
        this.redraw();
    }

    /** Remove the given layer from the Viewer.
    * @param {(Layer|String)} layer An OpenLIME Layer or a Layer identifier.
    */
    removeLayer(layer) {
        if (typeof (layer) == 'string')
            layer = this.canvas.layers[layer];
        if (layer) {
            this.canvas.removeLayer(layer);
            this.redraw();
        }
    }

    /* Resizes the canvas (and the overlay) and triggers a redraw.
     * This method is internal and used by a ResizeObserver of the Canvas size.
     * @param {number} width A width value defined in CSS pixel.
     * @param {number} height A height value defined in CSS pixel.
    */
    /**
     * @ignore
    */
     resize(width, height) {
        // Test with retina display!
        this.canvasElement.width = width * window.devicePixelRatio;
        this.canvasElement.height = height * window.devicePixelRatio;

        this.camera.setViewport({ x: 0, y: 0, dx: width, dy: height, w: width, h: height });
        this.canvas.prefetch();
        this.redraw();
    }

    /**
     * Schedules a redrawing.
    */
    redraw() {
        if (this.animaterequest) return;
        this.animaterequest = requestAnimationFrame((time) => { this.draw(time); });
    }

    /*
     * Renders the canvas content.
     * This method is internal.
     * @param {time} time The current time (a DOMHighResTimeStamp variable, as in `performance.now()`).
    */
     /**
     * @ignore
    */
      draw(time) {
        if (!time) time = performance.now();
        this.animaterequest = null;

        let viewport = this.camera.viewport;
        let transform = this.camera.getCurrentTransform(time);

        let done = this.canvas.draw(time);
        if (!done)
            this.redraw();
    }

}

export { Viewer };