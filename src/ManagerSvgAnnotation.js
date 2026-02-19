import { Annotation } from './Annotation.js';
import { LayerSvgAnnotation } from './LayerSvgAnnotation.js';
import { CoordinateSystem } from './CoordinateSystem.js';
import { Util } from './Util.js';
import { addSignals } from './Signals.js';

/**
 * @file ManagerSvgAnnotation.js
 *
 * GUI-free annotation manager for OpenLIME.
 *
 * ## Architecture Overview
 *
 * ```
 *  ┌─────────────────────────────────────────────────────────────────┐
 *  │  ManagerSvgAnnotation                                           │
 *  │                                                                 │
 *  │  ┌──────────────────┐   ┌──────────────────────────────────┐    │
 *  │  │  Marker Registry │   │  LayerSvgAnnotation              │    │
 *  │  │  (extensible)    │   │  (auto-created or injected)      │    │
 *  │  │                  │   │                                  │    │
 *  │  │  'disk'  → Disk  │   │  annotations[]                   │    │
 *  │  │  'pin'   → Pin   │   │  svgGroup (DOM)                  │    │
 *  │  │  'line'  → Line  │   │  annotationUpdate hook ──────┐   │    │
 *  │  │  …               │   │                              │   │    │
 *  │  └──────────────────┘   └──────────────────────────────┼───┘    │
 *  │                                                        │        │
 *  │  CRUD API                                              │        │
 *  │  createAnnotation(pos, opts)                           │        │
 *  │  updateAnnotation(id, data)           zoom ────────────┘        │
 *  │  deleteAnnotation(id)                 updates                   │
 *  │  getAnnotationById(id)                                          │
 *  │  getAnnotations()                                               │
 *  │  importAnnotations(jsonLdArray)                                 │
 *  │  exportAnnotations()                                            │
 *  │                                                                 │
 *  │  Events (via addSignals)                                        │
 *  │  'create' | 'update' | 'delete' | 'select'                      │
 *  │                                                                 │
 *  │  Pencil mode                                                    │
 *  │  toggle(force?) — enabled by UIBasic 'pencil' action            │
 *  │  double-tap on viewer → createAnnotation(pos)                   │
 *  └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Extending with new marker types
 *
 * ```javascript
 * class StarMarker extends Marker {
 *   constructor(opts = {}) { super('star', opts); }
 *   createElement(pos, transform, annotation) { ... return [svgElement]; }
 *   updateElements(elements, transform, annotation) { ... } // optional
 * }
 * ManagerSvgAnnotation.registerMarker('star', StarMarker);
 * manager.setActiveMarker('star');
 * ```
 */

// ─── Marker base class ────────────────────────────────────────────────────────

/**
 * Abstract base class for annotation markers.
 *
 * A marker describes how a single "point of interest" (or geometry) looks as an
 * SVG element, and how it should be updated when the camera zoom changes.
 *
 * To create a new marker type:
 *  1. Subclass `Marker`.
 *  2. Set `this.type` to a unique lowercase string.
 *  3. Implement `createElement(pos, transform, annotation)` returning an array of SVG elements.
 *  4. Optionally override `updateElements(elements, transform, annotation)` for zoom-responsive markers.
 *  5. Register: `ManagerSvgAnnotation.registerMarker('mytype', MyMarker)`.
 */
class Marker {
	/**
	 * @param {string} type - Unique type key ('disk', 'pin', …)
	 * @param {Object} [options] - Marker-specific options
	 */
	constructor(type, options = {}) {
		this.type = type;
		Object.assign(this, options);
	}

	/**
	 * Creates the SVG DOM element(s) representing this marker at `pos`.
	 *
	 * @param {Object} pos - Position in image/model coordinates {x, y}
	 * @param {Object} transform - Current camera transform (contains .z for zoom)
	 * @param {Annotation} annotation - The parent annotation
	 * @returns {SVGElement[]} Array of SVG elements to append to the annotation
	 */
	createElement(pos, transform, annotation) {
		throw new Error(`Marker subclass '${this.constructor.name}' must implement createElement()`);
	}

	/**
	 * Updates marker elements when the view transform changes (e.g. zoom).
	 * Override to maintain constant screen-space size or adapt appearance.
	 * Default implementation is a no-op.
	 *
	 * @param {SVGElement[]} elements - Elements previously created by `createElement`
	 * @param {Object} transform - Current camera transform
	 * @param {Annotation} annotation - The parent annotation
	 */
	updateElements(elements, transform, annotation) {
		// no-op by default
	}

	/**
	 * Returns a JSON-serializable representation of this marker's configuration.
	 * Used when persisting annotations.
	 * @returns {Object}
	 */
	serialize() {
		return { type: this.type };
	}
}

// ─── Built-in: DiskMarker ─────────────────────────────────────────────────────

/**
 * DiskMarker — a filled circle that maintains constant **screen-space** size
 * regardless of zoom level.
 *
 * Stored marker data keys on `annotation.data`:
 *  - `_markerType`  → `'disk'`
 *  - `_markerRadius` → base radius in screen pixels
 *  - `_markerFill`   → fill color
 *  - `_markerOpacity` → opacity
 *
 * @extends Marker
 *
 * @example
 * ```javascript
 * ManagerSvgAnnotation.registerMarker('disk', DiskMarker);
 * manager.setActiveMarker('disk', { radius: 16, fill: '#00aaff', opacity: 0.8 });
 * ```
 */
class DiskMarker extends Marker {
	/**
	 * @param {Object} [options]
	 * @param {number} [options.radius=12] - Screen radius in pixels at zoom level 1
	 * @param {string} [options.fill='#ff0000'] - Fill color
	 * @param {number} [options.opacity=0.7] - Opacity (0–1)
	 */
	constructor(options = {}) {
		super('disk', Object.assign({ radius: 12, fill: '#ff0000', opacity: 0.7 }, options));
	}

	createElement(pos, transform, annotation) {
		const screenRadius = this.radius;
		const modelRadius = screenRadius / (transform?.z ?? 1);

		// Persist marker params in annotation data for later zoom updates
		annotation.data._markerRadius = screenRadius;
		annotation.data._markerFill = this.fill;
		annotation.data._markerOpacity = this.opacity;

		const circle = Util.createSVGElement('circle', {
			cx: pos.x,
			cy: pos.y,
			r: modelRadius,
			class: 'annotation-disk',
			fill: this.fill,
			opacity: String(this.opacity)
		});

		return [circle];
	}

	updateElements(elements, transform, annotation) {
		const baseRadius = annotation.data?._markerRadius ?? this.radius;
		const modelRadius = baseRadius / (transform?.z ?? 1);
		for (const el of elements) {
			if (el.classList?.contains('annotation-disk')) {
				el.setAttribute('r', modelRadius);
			}
		}
	}

	serialize() {
		return { type: this.type, radius: this.radius, fill: this.fill, opacity: this.opacity };
	}
}

// ─── ManagerSvgAnnotation ─────────────────────────────────────────────────────

/**
 * @class ManagerSvgAnnotation
 *
 * GUI-free SVG annotation manager for OpenLIME.
 *
 * Governs annotation lifecycle (create / read / update / delete) and communicates
 * with the outside world exclusively through a JavaScript API and signals.
 * There is **no** built-in user interface.
 *
 * ### Typical usage
 * ```javascript
 * const manager = new ManagerSvgAnnotation(viewer, {
 *   enableState: true,
 *   onCreate: (anno) => saveToServer(anno),
 *   onDelete: ({ id }) => removeFromServer(id),
 * });
 *
 * // Expose pencil toggle to UIBasic
 * const ui = new UIBasic(viewer, {
 *   actions: { pencil: { display: true } },
 *   annotationManager: manager,
 * });
 *
 * // Add metadata from outside
 * manager.updateAnnotation(anno.id, { label: 'Crack A', class: 'defect' });
 *
 * // Delete programmatically
 * manager.deleteAnnotation(anno.id);
 * ```
 *
 * ### Extending with custom markers
 * ```javascript
 * class StarMarker extends Marker {
 *   constructor(opts) { super('star', opts); }
 *   createElement(pos, transform, annotation) {
 *     const star = Util.createSVGElement('polygon', { ... });
 *     return [star];
 *   }
 * }
 * ManagerSvgAnnotation.registerMarker('star', StarMarker);
 * manager.setActiveMarker('star', { size: 20 });
 * ```
 *
 * @fires ManagerSvgAnnotation#create
 * @fires ManagerSvgAnnotation#update
 * @fires ManagerSvgAnnotation#delete
 * @fires ManagerSvgAnnotation#select
 */
class ManagerSvgAnnotation {
	/**
	 * @param {import('./Viewer.js').Viewer} viewer - OpenLIME viewer instance
	 * @param {Object} [options]
	 * @param {LayerSvgAnnotation} [options.layer]
	 *   Existing SVG annotation layer to manage.
	 *   If omitted, the manager looks for an existing layer in the viewer or auto-creates one.
	 * @param {string} [options.layerId='manager_annotations']
	 *   ID used when auto-creating a missing layer.
	 * @param {string} [options.layerLabel='Annotations']
	 *   Label for the auto-created layer.
	 * @param {string} [options.activeMarker='disk']
	 *   Default marker type for new annotations.
	 * @param {Object} [options.markerOptions={}]
	 *   Default options forwarded to the active marker constructor.
	 * @param {boolean} [options.enableState=true]
	 *   Capture viewer canvas state (e.g. light direction, mode) into each annotation.
	 * @param {Function} [options.customState]
	 *   Called with `(annotation)` after state capture; use to attach extra custom state.
	 * @param {Function} [options.onCreate]   - Shorthand: `.addEvent('create', fn)`
	 * @param {Function} [options.onUpdate]   - Shorthand: `.addEvent('update', fn)`
	 * @param {Function} [options.onDelete]   - Shorthand: `.addEvent('delete', fn)`
	 * @param {Function} [options.onSelect]   - Shorthand: `.addEvent('select', fn)`
	 */
	constructor(viewer, options = {}) {
		Object.assign(this, {
			viewer,
			layer:         null,
			layerId:       'manager_annotations',
			layerLabel:    'Annotations',
			activeMarker:  'disk',
			markerOptions: {},
			enableState:   true,
			customState:   null,
			_active:       false,
		}, options);

		// Resolve or auto-create the annotation layer
		this._resolveLayer();

		// Wire selection events from the layer → 'select' signal
		this.layer.addEvent('selected', (anno) => {
			if (anno) this.emit('select', anno);
		});

		// Register pointer handler for double-tap → annotation creation
		this._pointerHandler = {
			priority: 10000,
			fingerDoubleTap: (e) => this._onDoubleTap(e)
		};
		viewer.pointerManager.onEvent(this._pointerHandler);

		// Shorthand callback registration
		if (options.onCreate) this.addEvent('create', options.onCreate);
		if (options.onUpdate) this.addEvent('update', options.onUpdate);
		if (options.onDelete) this.addEvent('delete', options.onDelete);
		if (options.onSelect) this.addEvent('select', options.onSelect);
	}

	// ─── Static Marker Registry ───────────────────────────────────────────────

	/**
	 * Registers a new marker class under a type key.
	 * Registration is global (shared across all manager instances).
	 *
	 * @param {string} type - Unique lowercase type identifier (e.g. `'star'`)
	 * @param {typeof Marker} MarkerClass - Subclass of {@link Marker}
	 * @example
	 * ManagerSvgAnnotation.registerMarker('star', StarMarker);
	 */
	static registerMarker(type, MarkerClass) {
		ManagerSvgAnnotation._registry = ManagerSvgAnnotation._registry || new Map();
		ManagerSvgAnnotation._registry.set(type, MarkerClass);
	}

	/**
	 * Returns a list of registered marker type keys.
	 * @returns {string[]}
	 */
	static getMarkerTypes() {
		return [...(ManagerSvgAnnotation._registry?.keys() ?? [])];
	}

	// ─── Pencil mode ──────────────────────────────────────────────────────────

	/**
	 * Toggles pencil mode (annotation-on-double-click).
	 * Called by `UIBasic.toggleAnnotations()` when the pencil action fires.
	 *
	 * @param {boolean} [force] - Force a specific state; toggles if omitted.
	 * @returns {boolean} The new active state.
	 */
	toggle(force) {
		this._active = force === undefined ? !this._active : !!force;
		if (this._active && this.viewer.panzoom) {
			// Prevent double-tap zoom while pencil mode is on
			this.viewer.panzoom.enableDoubleTapZoom = false;
		} else if (!this._active && this.viewer.panzoom) {
			this.viewer.panzoom.enableDoubleTapZoom = true;
		}
		return this._active;
	}

	/**
	 * Current pencil mode state.
	 * @type {boolean}
	 */
	get active() { return this._active; }

	// ─── CRUD API ─────────────────────────────────────────────────────────────

	/**
	 * Creates a new annotation at the given model-space position.
	 *
	 * This is the primary factory method. It:
	 *  1. Creates an `Annotation` via the layer.
	 *  2. Optionally captures viewer state into `annotation.state`.
	 *  3. Delegates SVG element creation to the active (or specified) marker.
	 *  4. Adds the annotation to the layer and requests a redraw.
	 *  5. Fires the `'create'` event.
	 *
	 * @param {Object} pos - Position in image/model coordinates `{x, y}`.
	 * @param {Object} [opts={}]
	 * @param {string}   [opts.markerType]    - Override the active marker type.
	 * @param {Object}   [opts.markerOptions] - Override marker constructor options.
	 * @param {string}   [opts.label='']
	 * @param {string}   [opts.description='']
	 * @param {string}   [opts.class='']
	 * @param {number}   [opts.publish=1]
	 * @param {Object}   [opts.data={}]       - Extra custom data merged into `annotation.data`.
	 * @param {boolean}  [opts.select=false]  - Select the annotation after creation.
	 * @returns {Annotation} The newly created annotation.
	 * @fires ManagerSvgAnnotation#create
	 */
	createAnnotation(pos, opts = {}) {
		const markerType    = opts.markerType    ?? this.activeMarker;
		const markerOptions = Object.assign({}, this.markerOptions, opts.markerOptions ?? {});
		const marker        = this._instantiateMarker(markerType, markerOptions);

		// Create a bare annotation through the layer (ensures proper SVG element wrapping)
		const annotation = this.layer.newAnnotation();
		annotation.label       = opts.label       ?? '';
		annotation.description = opts.description ?? '';
		annotation.class       = opts.class       ?? '';
		annotation.publish     = opts.publish      ?? 1;
		annotation.data        = Object.assign({}, opts.data ?? {});

		// Record the marker type so zoom updates work correctly
		annotation.data._markerType = markerType;

		// Optionally capture viewer state
		if (this.enableState) {
			this._captureState(annotation);
		}

		// Let the marker build its SVG elements
		const transform = this.viewer.camera.getCurrentTransform(performance.now());
		const elements  = marker.createElement(pos, transform, annotation);
		annotation.elements.push(...elements);
		annotation.needsUpdate = true;

		// Register in layer (newAnnotation may or may not have pushed it already)
		if (!this.layer.annotations.includes(annotation)) {
			this.layer.annotations.push(annotation);
		}

		if (opts.select) {
			this.layer.setSelected(annotation);
		}

		this.viewer.redraw();
		this.emit('create', annotation);
		return annotation;
	}

	/**
	 * Updates metadata of an existing annotation by ID.
	 *
	 * Accepts any subset of `{label, description, class, publish, data}`.
	 * `data` is **merged** (not replaced) into `annotation.data`.
	 *
	 * @param {string} id - Annotation ID.
	 * @param {Object} patch - Properties to update.
	 * @param {string}  [patch.label]
	 * @param {string}  [patch.description]
	 * @param {string}  [patch.class]
	 * @param {number}  [patch.publish]
	 * @param {Object}  [patch.data]    - Merged into annotation.data.
	 * @returns {Annotation|null} Updated annotation, or `null` if not found.
	 * @fires ManagerSvgAnnotation#update
	 */
	updateAnnotation(id, patch) {
		const anno = this.getAnnotationById(id);
		if (!anno) {
			console.warn(`ManagerSvgAnnotation.updateAnnotation: annotation '${id}' not found.`);
			return null;
		}

		const allowedKeys = ['label', 'description', 'class', 'publish'];
		for (const key of allowedKeys) {
			if (Object.hasOwn(patch, key)) anno[key] = patch[key];
		}

		if (patch.data && typeof patch.data === 'object') {
			Object.assign(anno.data, patch.data);
		}

		anno.needsUpdate = true;
		this.viewer.redraw();
		this.emit('update', anno);
		return anno;
	}

	/**
	 * Deletes the annotation with the given ID from the layer and the DOM.
	 *
	 * @param {string} id - Annotation ID.
	 * @returns {boolean} `true` if deleted, `false` if not found.
	 * @fires ManagerSvgAnnotation#delete
	 */
	deleteAnnotation(id) {
		const anno = this.getAnnotationById(id);
		if (!anno) {
			console.warn(`ManagerSvgAnnotation.deleteAnnotation: annotation '${id}' not found.`);
			return false;
		}

		// LayerSvgAnnotation.deleteAnnotationById removes SVG nodes and list entry
		this.layer.deleteAnnotationById(id);
		this.viewer.redraw();
		this.emit('delete', { id });
		return true;
	}

	/**
	 * Returns the annotation with the given ID, or `null`.
	 * @param {string} id
	 * @returns {Annotation|null}
	 */
	getAnnotationById(id) {
		return this.layer.annotations?.find(a => a.id === id) ?? null;
	}

	/**
	 * Returns all annotations managed by this instance.
	 * @returns {Annotation[]}
	 */
	getAnnotations() {
		return this.layer.annotations ?? [];
	}

	// ─── Import / Export ──────────────────────────────────────────────────────

	/**
	 * Serializes all annotations to JSON-LD format.
	 * @returns {Object[]} Array of JSON-LD annotation objects.
	 */
	exportAnnotations() {
		return this.getAnnotations().map(a => a.toJsonLd());
	}

	/**
	 * Imports annotations from a JSON-LD array and adds them to the layer.
	 * Malformed entries are skipped with a console warning.
	 *
	 * @param {Object[]} jsonLdArray
	 */
	importAnnotations(jsonLdArray) {
		for (const entry of jsonLdArray) {
			try {
				const anno = Annotation.fromJsonLd(entry);
				anno.needsUpdate = true;
				this.layer.annotations.push(anno);
			} catch (err) {
				console.warn('ManagerSvgAnnotation.importAnnotations: skipping entry', entry, err);
			}
		}
		this.viewer.redraw();
	}

	// ─── Active marker control ────────────────────────────────────────────────

	/**
	 * Sets the active marker type and optional default options.
	 *
	 * @param {string} type - Registered marker type key.
	 * @param {Object} [options={}] - Default options passed to the marker constructor.
	 * @throws {Error} If `type` is not registered.
	 */
	setActiveMarker(type, options = {}) {
		if (!ManagerSvgAnnotation._registry?.has(type)) {
			throw new Error(
				`ManagerSvgAnnotation.setActiveMarker: unknown type '${type}'. ` +
				`Registered types: [${ManagerSvgAnnotation.getMarkerTypes().join(', ')}]`
			);
		}
		this.activeMarker  = type;
		this.markerOptions = options;
	}

	// ─── Internal: layer resolution ───────────────────────────────────────────

	/**
	 * Resolves `this.layer` — finds an existing LayerSvgAnnotation in the viewer, or
	 * creates a new one and registers it.
	 * @private
	 */
	_resolveLayer() {
		// If a layer was passed explicitly, use it.
		if (this.layer instanceof LayerSvgAnnotation) {
			this._wireAnnotationUpdate();
			return;
		}

		// Try to find a LayerSvgAnnotation already present in the viewer
		const existing = Object.values(this.viewer.canvas.layers)
			.find(l => l instanceof LayerSvgAnnotation);
		if (existing) {
			this.layer = existing;
			this._wireAnnotationUpdate();
			return;
		}

		// Auto-create a new layer, sharing layout/transform with the first base layer
		const baseLayer = Object.values(this.viewer.canvas.layers).find(l => !l.overlay)
			?? Object.values(this.viewer.canvas.layers)[0];

		const layerOptions = {
			label:       this.layerLabel,
			annotations: [],
		};

		if (baseLayer) {
			layerOptions.layout    = baseLayer.layout;
			layerOptions.transform = baseLayer.transform.copy();
		}

		this.layer = new LayerSvgAnnotation(layerOptions);
		this._wireAnnotationUpdate();
		this.viewer.addLayer(this.layerId, this.layer);
	}

	/**
	 * Attaches the `annotationUpdate` callback to the layer so markers can
	 * maintain constant screen-space size on every redraw/zoom.
	 * @private
	 */
	_wireAnnotationUpdate() {
		this.layer.annotationUpdate = (anno, transform) => {
			this._onAnnotationUpdate(anno, transform);
		};
	}

	// ─── Internal: per-frame annotation update ────────────────────────────────

	/**
	 * Called by `layer.annotationUpdate` on every prefetch cycle.
	 * Retrieves the correct marker for this annotation and asks it to update its elements.
	 * @param {Annotation} anno
	 * @param {Object} transform
	 * @private
	 */
	_onAnnotationUpdate(anno, transform) {
		const markerType = anno.data?._markerType ?? this.activeMarker;
		try {
			const marker = this._instantiateMarker(markerType, this.markerOptions);
			marker.updateElements(anno.elements, transform, anno);
		} catch {
			// Unknown marker type — silently ignore for robustness
		}
	}

	// ─── Internal: state capture ──────────────────────────────────────────────

	/**
	 * Snapshots the current viewer canvas state into the annotation.
	 * @param {Annotation} annotation
	 * @private
	 */
	_captureState(annotation) {
		annotation.state = window.structuredClone(this.viewer.canvas.getState());
		if (this.customState) this.customState(annotation);
	}

	// ─── Internal: coordinate mapping ────────────────────────────────────────

	/**
	 * Converts a pointer event's client coordinates to image (model) coordinates
	 * for the managed layer, taking the camera transform and layer transform into account.
	 *
	 * @param {PointerEvent|MouseEvent} e
	 * @returns {{x: number, y: number}} Position in image space
	 * @private
	 */
	_eventToImageCoords(e) {
		const rect  = this.viewer.canvasElement.getBoundingClientRect();
		const p     = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		const bb    = this.layer.layout.boundingBox();
		const size  = { w: bb.width(), h: bb.height() };
		return CoordinateSystem.fromCanvasHtmlToImage(
			p, this.viewer.camera, this.layer.transform, size, false
		);
	}

	// ─── Internal: pointer handler ────────────────────────────────────────────

	/**
	 * Handles a double-tap (double-click) event from the PointerManager.
	 * Creates a new annotation when pencil mode is active.
	 * @param {PointerEvent} e
	 * @private
	 */
	_onDoubleTap(e) {
		if (!this._active) return;
		if (!this.layer?.layout) return; // layer not ready yet

		// Ignore taps on toolbar or dialog overlays
		const t = e.target;
		if (t?.closest?.('.openlime-toolbar')    ||
		    t?.closest?.('.openlime-layers-menu') ||
		    t?.closest?.('.openlime-dialog')      ||
		    t?.classList?.contains('openlime-button')) {
			return;
		}

		e.preventDefault?.();
		e.stopPropagation?.();

		const pos = this._eventToImageCoords(e);
		this.createAnnotation(pos);
	}

	// ─── Internal: marker instantiation ──────────────────────────────────────

	/**
	 * Instantiates a registered marker class.
	 * @param {string} type
	 * @param {Object} [options={}]
	 * @returns {Marker}
	 * @throws {Error} If the type is not registered
	 * @private
	 */
	_instantiateMarker(type, options = {}) {
		const cls = ManagerSvgAnnotation._registry?.get(type);
		if (!cls) {
			throw new Error(
				`ManagerSvgAnnotation: unknown marker type '${type}'. ` +
				`Registered: [${ManagerSvgAnnotation.getMarkerTypes().join(', ')}]`
			);
		}
		return new cls(options);
	}
}

// ─── Signal definitions ───────────────────────────────────────────────────────

/**
 * @event ManagerSvgAnnotation#create
 * @type {Annotation}
 * @description Fired when a new annotation is successfully created.
 */

/**
 * @event ManagerSvgAnnotation#update
 * @type {Annotation}
 * @description Fired when an annotation's metadata is updated.
 */

/**
 * @event ManagerSvgAnnotation#delete
 * @type {{id: string}}
 * @description Fired when an annotation is deleted (payload contains the id).
 */

/**
 * @event ManagerSvgAnnotation#select
 * @type {Annotation}
 * @description Fired when the user selects an annotation in the layer.
 */

addSignals(ManagerSvgAnnotation, 'create', 'update', 'delete', 'select');

// Register the built-in DiskMarker
ManagerSvgAnnotation.registerMarker('disk', DiskMarker);

export { ManagerSvgAnnotation, Marker, DiskMarker };
