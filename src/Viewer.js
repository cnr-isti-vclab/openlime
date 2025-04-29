import { Canvas } from './Canvas.js'
import { Camera } from './Camera.js'
import { PointerManager } from './PointerManager.js'
import { Controller } from './Controller.js';
import { addSignals } from './Signals.js'

/**
 * @typedef {Object} ViewerOptions
 * Configuration options for Viewer initialization
 * @property {string} [background] - CSS background style
 * @property {boolean} [autofit=true] - Auto-fit camera to scene
 * @property {Object} [canvas={}] - Canvas configuration options
 * @property {Camera} [camera] - Custom camera instance
 */

/**
 * @typedef {Object} Viewport
 * Viewport configuration
 * @property {number} x - Left coordinate
 * @property {number} y - Top coordinate
 * @property {number} dx - Width in pixels
 * @property {number} dy - Height in pixels
 * @property {number} w - Total width
 * @property {number} h - Total height
 */

/**
 * Fired when frame is drawn
 * @event Viewer#draw
 */

/**
 * Fired when viewer is resized
 * @event Viewer#resize
 * @property {Viewport} viewport - New viewport configuration
 */

/**
 * 
 * Central class of the OpenLIME framework.
 * Creates and manages the main viewer interface, coordinates components,
 * and handles rendering pipeline.
 * 
 * Core Responsibilities:
 * - Canvas management
 * - Layer coordination
 * - Camera control
 * - Event handling
 * - Rendering pipeline
 * - Resource management
 * 
 *
 *
 * Component Relationships:
 * ```
 * Viewer
 * ├── Canvas
 * │   └── Layers
 * ├── Camera
 * ├── PointerManager
 * └── Controllers
 * ```
 * 
 * Rendering Pipeline:
 * 1. Camera computes current transform
 * 2. Canvas prepares render state
 * 3. Layers render in order
 * 4. Post-processing applied
 * 5. Frame timing recorded
 * 
 * Event System:
 * - draw: Emitted after each frame render
 * - resize: Emitted when viewport changes
 * 
 * Performance Considerations:
 * - Uses requestAnimationFrame
 * - Tracks frame timing
 * - Handles device pixel ratio
 * - Optimizes redraw requests
 * 
 * Resource Management:
 * - Automatic canvas cleanup
 * - Proper event listener removal
 * - ResizeObserver handling
 * 
 * @fires Viewer#draw
 * @fires Viewer#resize
 * 
 * @example
 * ```javascript
 * // Basic viewer setup
 * const viewer = new OpenLIME.Viewer('#container');
 * 
 * // Add image layer
 * const layer = new OpenLIME.Layer({
 *     layout: 'image',
 *     type: 'image',
 *     url: 'image.jpg'
 * });
 * viewer.addLayer('main', layer);
 * 
 * // Access components
 * const camera = viewer.camera;
 * const canvas = viewer.canvas;
 * ```
 */
class Viewer {
	/**
	 * Creates a new Viewer instance
	 * @param {HTMLElement|string} div - Container element or selector
	 * @param {ViewerOptions} [options] - Configuration options
	 * @param {number} [options.idleTime=60] - Seconds of inactivity before idle event
	 * @throws {Error} If container element not found
	 * 
	 * Component Setup:
	 * 1. Creates/configures canvas element
	 * 2. Sets up overlay system
	 * 3. Initializes camera
	 * 4. Creates pointer manager
	 * 5. Sets up resize observer
	 */
	constructor(div, options) {
		// Set default properties
		Object.assign(this, {
			background: null,
			autofit: true,
			canvas: {},
			camera: new Camera(),
			idleTime: 60 // in seconds
		});

		// Get container element
		if (typeof (div) == 'string')
			div = document.querySelector(div);

		if (!div)
			throw "Missing element parameter";

		// Apply options
		Object.assign(this, options);
		if (this.background)
			div.style.background = this.background;

		// Set up DOM elements
		this.containerElement = div;
		this.canvasElement = div.querySelector('canvas');
		if (!this.canvasElement) {
			this.canvasElement = document.createElement('canvas');
			div.prepend(this.canvasElement);
		}

		this.overlayElement = document.createElement('div');
		this.overlayElement.classList.add('openlime-overlay');
		this.containerElement.appendChild(this.overlayElement);

		// Initialize Canvas
		this.canvas = new Canvas(this.canvasElement, this.overlayElement, this.camera, this.canvas);

		// Event handling for rendering
		this.canvas.addEvent('update', () => { this.redraw(); });

		// Better handling of auto-fit functionality
		if (this.autofit) {
			// Only auto-fit when ALL layers are ready (this ensures we have valid bounding boxes)
			this.canvas.addEvent('ready', () => {
				this.camera.fitCameraBox(0);
			});

			// For updateSize events, only fit if we have at least one ready layer
			this.canvas.addEvent('updateSize', () => {
				const hasReadyLayers = Object.values(this.canvas.layers).some(layer => layer.status === 'ready');
				if (hasReadyLayers) {
					this.camera.fitCameraBox(0);
				}
			});
		}

		// Initialize pointer manager
		this.pointerManager = new PointerManager(this.overlayElement, { idleTime: this.idleTime });

		// Prevent context menu
		this.canvasElement.addEventListener('contextmenu', (e) => {
			e.preventDefault();
			return false;
		});

		// Set up resize observer
		this.resizeObserver = new ResizeObserver(entries => {
			for (let entry of entries) {
				this.resize(entry.contentRect.width, entry.contentRect.height);
			}
		});
		this.resizeObserver.observe(this.canvasElement);

		// Initial resize
		this.resize(this.canvasElement.clientWidth, this.canvasElement.clientHeight);

		// Initialize controllers array
		this.controllers = [];
	}

	/**
	 * Adds a device event controller to the viewer.
	 * @param {Controller} controller An OpenLIME controller.
	 */
	addController(controller) {
		this.controllers.push(controller);
		this.pointerManager.onEvent(controller);
	}

	/**
	 * Adds layer to viewer
	 * @param {string} id - Unique layer identifier
	 * @param {Layer} layer - Layer instance
	 * @fires Canvas#update
	 * 
	 * @example
	 * ```javascript
	 * const layer = new OpenLIME.Layer({
	 *     type: 'image',
	 *     url: 'image.jpg'
	 * });
	 * viewer.addLayer('background', layer);
	 * ```
	 */
	addLayer(id, layer) {
		this.canvas.addLayer(id, layer);
		this.redraw();
	}

	/**
	 * Removes layer from viewer
	 * @param {Layer|string} layer - Layer instance or ID
	 * @fires Canvas#update
	 */
	removeLayer(layer) {
		if (typeof (layer) == 'string')
			layer = this.canvas.layers[layer];
		if (layer) {
			this.canvas.removeLayer(layer);
			this.redraw();
		}
	}


	/**
	 * Handles viewer resizing
	 * @param {number} width - New width in CSS pixels
	 * @param {number} height - New height in CSS pixels
	 * @private
	 * @fires Viewer#resize
	 */
	resize(width, height) {
		if (width == 0 || height == 0) return;
		// Test with retina display!
		this.canvasElement.width = width * window.devicePixelRatio;
		this.canvasElement.height = height * window.devicePixelRatio;

		let view = { x: 0, y: 0, dx: width, dy: height, w: width, h: height };
		this.camera.setViewport(view);
		this.canvas.updateSize();
		this.emit('resize', view);

		this.canvas.prefetch();
		this.redraw();
	}

	/**
	 * Schedules next frame for rendering
	 * Uses requestAnimationFrame for optimal performance
	 */
	redraw() {
		if (this.animaterequest) return;
		this.animaterequest = requestAnimationFrame((time) => { this.draw(time); });
		this.requestTime = performance.now();
	}

	/**
	 * Performs actual rendering
	 * @param {number} time - Current timestamp
	 * @private
	 * @fires Viewer#draw
	 */
	draw(time) {
		if (!time) time = performance.now();
		this.animaterequest = null;

		let elapsed = performance.now() - this.requestTime;
		this.canvas.addRenderTiming(elapsed);

		let viewport = this.camera.viewport;
		let transform = this.camera.getCurrentTransform(time);

		let done = this.canvas.draw(time);
		if (!done)
			this.redraw();
		this.emit('draw');
	}

	/**
	 * Enables or disables split viewport mode and sets which layers appear on each side
	 * @param {boolean} enabled - Whether split viewport mode is enabled
	 * @param {string[]} leftLayerIds - Array of layer IDs to show on left side
	 * @param {string[]} rightLayerIds - Array of layer IDs to show on right side
	 * @fires Canvas#update
	 */
	setSplitViewport(enabled, leftLayerIds = [], rightLayerIds = []) {
		this.canvas.setSplitViewport(enabled, leftLayerIds, rightLayerIds);
	}

}
addSignals(Viewer, 'draw');
addSignals(Viewer, 'resize'); //args: viewport

export { Viewer };