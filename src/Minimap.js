import { addSignals } from './Signals'
import { Viewer } from './Viewer'
import { BoundingBox } from './BoundingBox'
import { Layer } from './Layer'

/**
 * @typedef {Object} Minimap~Options
 * @property {Layer|Object} [layer]             - Layer instance or layer options object
 * @property {string} [thumbnailUrl]            - URL to thumbnail image
 * @property {BoundingBox} [viewport]           - Viewport bounds (defaults to first layer's bbox)
 * @property {string} [position='bottom-right'] - Position: 'top-left'|'top-right'|'bottom-left'|'bottom-right'
 * @property {number} [width=200] 
 * @property {number} [height=150]
 * @property {number} [padding=10]
 */

/**
 * Minimap overlay showing current view area over the full dataset
 */
class Minimap {
    constructor(viewer, options) {
        Object.assign(this, {
            viewer: viewer,
            layer: null,
            thumbnailUrl: null,
            viewport: null,
            position: 'bottom-right',
            width: 200,
            height: 150,
            padding: 10,
            interactive: true,
            viewportStyle: {
                stroke: 'rgba(255, 255, 255, 0.8)',
                strokeWidth: 2,
                fill: 'rgba(255, 255, 255, 0.1)',
                vector_effect: 'non-scaling-stroke'
            } 
        });

        // Apply options, but merge viewportStyle instead of replacing it
        if (options) {
            const { viewportStyle, ...otherOptions } = options;
            Object.assign(this, otherOptions);
            if (viewportStyle) {
                Object.assign(this.viewportStyle, viewportStyle);
            }
        }

        this.element = null;
        this.minimapViewer = null;
        this.viewportRect = null;
        
        this.init();
    }

    init() {
        this.createMinimapDOM();
        this.setupMinimapCanvas();
        this.setupViewportIndicator();
        this.setupEventListeners();
    }

    createMinimapDOM() {
        // Create minimap container
        this.element = document.createElement('div');
        this.element.classList.add('openlime-minimap');
        this.element.classList.add(`openlime-minimap-${this.position}`);
        
        // Apply positioning
        this.element.style.position = 'absolute';
        this.element.style.pointerEvents = 'auto';
        const [vPos, hPos] = this.position.split('-');
        this.element.style[vPos] = `${this.padding}px`;
        this.element.style[hPos] = `${this.padding}px`;
        this.element.style.width = `${this.width}px`;
        this.element.style.height = `${this.height}px`;
        
        this.viewer.containerElement.appendChild(this.element);
    }

    setupMinimapCanvas() {
        // Create a Viewer instance for the minimap
        this.minimapViewer = new Viewer(this.element, { background: 'black', autofit: true });

        
        // Set minimap canvas size
        this.minimapViewer.canvasElement.width = this.width;
        this.minimapViewer.canvasElement.height = this.height;
        
        // If thumbnailUrl is provided, create a simple image layer
        if (this.thumbnailUrl) {
            this.createThumbnailLayer();
        } else if (this.layer) {
            // Create layer from options object or use existing layer instance
            this.createMinimapLayer();
        }
        
        // Set up minimap camera to show full viewport
        if (this.viewport) {
            //this.minimapViewer.camera.viewport = this.viewport;
            this.minimapViewer.camera.fitCameraBox(0);
        } else {
            // Use first layer's bounding box
            const firstLayer = Object.values(this.viewer.canvas.layers)[0];
            if (firstLayer) {
                this.viewport = firstLayer.boundingBox();
                //this.minimapViewer.camera.viewport = this.viewport;
                this.minimapViewer.camera.fitCameraBox(0);
            }
        }
    }

    createThumbnailLayer() {
        // Create a simple image layer from thumbnail URL
        const layer = new Layer({
            type: 'image',
            url: this.thumbnailUrl,
            layout: 'image'
        });
        
        this.minimapViewer.addLayer('minimap-thumbnail', layer);
        
        // Wait for layer to be ready and set viewport
        layer.addEvent('ready', () => {
            if (!this.viewport && layer.boundingBox) {
                //this.viewport = layer.boundingBox;
                //this.minimapViewer.camera.viewport = this.viewport;
                this.minimapViewer.camera.fitCameraBox(0);
            }
        });
    }

    createMinimapLayer() {
        // Check if layer is an options object or a Layer instance
        let minimapLayer;
        
        if (this.layer.constructor && this.layer.constructor.name === 'Object') {
            // It's an options object, create a new Layer
            minimapLayer = new Layer(this.layer);
        } else {
            // It's a Layer instance - for now, just log that cloning is not supported
            console.warn('Minimap: Layer cloning not yet supported. Please provide layer options object instead.');
            return;
        }
        
        this.minimapViewer.addLayer('minimap-layer', minimapLayer);
        
        // Wait for layer to be ready and set viewport
        minimapLayer.addEvent('ready', () => {
            if (!this.viewport && minimapLayer.boundingBox) {
                this.minimapViewer.camera.fitCameraBox(0);
            }
        });
    }

    setupViewportIndicator() {
        // Create SVG overlay for viewport rectangle
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('openlime-minimap-viewport');
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.width = '100%';
        svg.style.height = '100%';
        svg.style.pointerEvents = 'none';
        
        // Create viewport polygon to show actual rotated shape
        this.viewportRect = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        this.viewportRect.setAttribute('stroke',        this.viewportStyle.stroke);
        this.viewportRect.setAttribute('stroke-width',  this.viewportStyle.strokeWidth);
        this.viewportRect.setAttribute('fill',          this.viewportStyle.fill);
        this.viewportRect.setAttribute('vector-effect', this.viewportStyle.vector_effect);
        
        svg.appendChild(this.viewportRect);
        this.element.appendChild(svg);
        
        // Initial update
        this.updateViewport();
    }

    setupEventListeners() {
        // Listen to camera changes
        this.viewer.camera.addEvent('update', () => this.updateViewport());
        
        // Handle clicks for navigation
        if (this.interactive) {
            this.element.addEventListener('click', (e) => this.onMinimapClick(e));
        }
    }

    updateViewport() {
        if (!this.viewportRect || !this.viewport) return;
        
        const mainCamera = this.viewer.camera;
        const minimapCamera = this.minimapViewer.camera;
        
        // Use the target transform instead of getCurrentTransform to avoid animation delay
        const transform = mainCamera.target;
        const viewport = mainCamera.viewport;
        
        // Calculate the four corners of the viewport in scene coordinates
        const hw = viewport.dx / (2 * transform.z);
        const hh = viewport.dy / (2 * transform.z);
        
        // Get corners relative to camera position (before rotation)
        const relativeCorners = [
            { x: -hw, y: -hh }, // bottom-left
            { x:  hw, y: -hh }, // bottom-right
            { x:  hw, y:  hh }, // top-right
            { x: -hw, y:  hh }  // top-left
        ];
        
        // Rotate corners around camera center and translate to scene space
        const cos = Math.cos(transform.a);
        const sin = Math.sin(transform.a);
        
        const sceneCorners = relativeCorners.map(corner => {
            return {
                x: -transform.x / transform.z + corner.x * cos - corner.y * sin,
                y: -transform.y / transform.z + corner.x * sin + corner.y * cos
            };
        });
        
        // Transform corners from scene space to minimap viewport pixel space
        const minimapTransform = minimapCamera.target;
        const minimapViewport = minimapCamera.viewport;

        if(!minimapViewport)
            return;
        
        const pixelCorners = sceneCorners.map(corner => {
            // Use Transform's sceneToViewportCoords method
            const viewportCoords = minimapTransform.sceneToViewportCoords(minimapViewport, [corner.x, corner.y]);
            return { x: viewportCoords[0], y: viewportCoords[1] };
        });
        
        // Set polygon points
        const points = pixelCorners.map(p => `${p.x},${p.y}`).join(' ');
        this.viewportRect.setAttribute('points', points);
    }

    onMinimapClick(e) {
        // Navigate main viewer to clicked location
        const rect = this.element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Convert minimap pixel coords to scene coords
        const sceneCoords = this.minimapViewer.camera.viewportToSceneCoords(x, y);
        
        // Pan main viewer to clicked location
        this.viewer.camera.setPosition(0, sceneCoords.x, sceneCoords.y);
    }

    show() {
        this.element.style.display = 'block';
    }

    hide() {
        this.element.style.display = 'none';
    }

    destroy() {
        // Remove event listeners
        this.viewer.camera.removeEvent('update', this.updateViewport);
        
        if (this.interactive) {
            this.element.removeEventListener('click', this.onMinimapClick);
        }
        
        // Cleanup minimap viewer
        if (this.minimapViewer) {
            // Additional viewer cleanup if needed
        }
        
        // Remove DOM element
        this.element.remove();
        
        this.element = null;
        this.minimapViewer = null;
        this.viewportRect = null;
    }
}

addSignals(Minimap, 'update');

export { Minimap }