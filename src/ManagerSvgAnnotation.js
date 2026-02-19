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
 *  │  │  'disk'     →tap │   │  annotations[]                   │    │
 *  │  │  'polyline' →seq │   │  svgGroup (DOM)                  │    │
 *  │  │  'rect'     →drg │   │  annotationUpdate hook ──────┐   │    │
 *  │  │  …               │   │                              │   │    │
 *  │  └──────────────────┘   └──────────────────────────────┼───┘    │
 *  │                                                        │        │
 *  │  Interaction modes                                     │        │
 *  │  'tap'      double-click → instant create              │        │
 *  │  'sequence' click* + dbl-click → polygon/polyline      │        │
 *  │  'drag'     mousedown+move+up → rect/ellipse           │        │
 *  │                                                        │        │
 *  │  DrawingSession (active during 'sequence'/'drag')      │        │
 *  │  { annotation, marker, vertices, previewEl }           │        │
 *  │                                                        │        │
 *  │  CRUD API                                              │        │
 *  │  createAnnotation(pos, opts)           zoom ───────────┘        │
 *  │  updateAnnotation(id, data)            updates                  │
 *  │  deleteAnnotation(id)                                           │
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
 *  └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * ## Extending with new marker types
 *
 * ```javascript
 * // Tap marker (instant creation on double-click) – default behaviour
 * class StarMarker extends Marker {
 *   constructor(opts = {}) { super('star', opts); }
 *   interactionMode() { return 'tap'; }
 *   createElement(pos, transform, annotation) { ... return [svgElement]; }
 * }
 *
 * // Sequence marker (click per vertex, double-click to finalise)
 * class MyPolyline extends Marker {
 *   interactionMode() { return 'sequence'; }
 *   startElement(pos, transform, annotation)      { ... return [svgEl]; }
 *   addVertex(pos, transform, annotation)         { ... }
 *   updatePreview(pos, transform, annotation)     { ... }
 *   finalizeElement(transform, annotation)        { return annotation.elements; }
 * }
 *
 * // Drag marker (mousedown→move→up)
 * class MyRect extends Marker {
 *   interactionMode() { return 'drag'; }
 *   startElement(pos, transform, annotation)      { ... return [svgEl]; }
 *   updatePreview(pos, transform, annotation)     { ... }
 *   finalizeElement(transform, annotation)        { return annotation.elements; }
 * }
 *
 * ManagerSvgAnnotation.registerMarker('mytype', MyClass);
 * manager.setActiveMarker('mytype');
 * ```
 */

// ─── Marker base class ────────────────────────────────────────────────────────

/**
 * Abstract base class for annotation markers.
 *
 * A marker encapsulates both the **visual representation** (SVG elements) and
 * the **interaction mode** used to collect the geometry from the user.
 *
 * ## Interaction modes
 *
 * | `interactionMode()` | UX | Mandatory overrides |
 * |---|---|---|
 * | `'tap'` *(default)* | double-click → instant create | `createElement` |
 * | `'sequence'` | click per vertex, double-click to finalise | `startElement`, `addVertex`, `updatePreview`, `finalizeElement` |
 * | `'drag'` | mousedown + drag + mouseup | `startElement`, `updatePreview`, `finalizeElement` |
 *
 * ### Rules for all modes
 * - `updateElements(elements, transform, annotation)` — called every frame for
 *   zoom-responsive sizes (e.g. keep stroke-width constant). No-op by default.
 * - `serialize()` — return a JSON-safe object stored in `annotation.data`.
 *
 * To create a new marker type:
 *  1. Subclass `Marker`.
 *  2. Override `interactionMode()` if not `'tap'`.
 *  3. Implement the mandatory methods for that mode.
 *  4. Optionally override `updateElements` for zoom-responsive rendering.
 *  5. Register: `ManagerSvgAnnotation.registerMarker('mytype', MyMarker)`.
 */
class Marker {
  /**
   * @param {string} type - Unique type key ('disk', 'polyline', …)
   * @param {Object} [options] - Marker-specific options
   */
  constructor(type, options = {}) {
    this.type = type;
    Object.assign(this, options);
  }

  // ── Mode declaration ────────────────────────────────────────────────────

  /**
   * Declares the interaction mode for this marker.
   * @returns {'tap'|'sequence'|'drag'}
   */
  interactionMode() { return 'tap'; }

  // ── 'tap' mode ──────────────────────────────────────────────────────────

  /**
   * **['tap' mode]** Creates the SVG DOM element(s) for this marker at `pos`.
   * Called once on double-click; must return an array of SVG elements.
   *
   * @param {Object} pos - Position in image coordinates {x, y}
   * @param {Object} transform - Current camera transform (.z = zoom)
   * @param {Annotation} annotation - The parent annotation
   * @returns {SVGElement[]}
   */
  createElement(pos, transform, annotation) {
    throw new Error(`Marker '${this.constructor.name}' must implement createElement() for 'tap' mode`);
  }

  // ── 'sequence' and 'drag' modes ─────────────────────────────────────────

  /**
   * **['sequence'/'drag' mode]** Called on the first interaction event (first click
   * or mousedown). Creates the initial draft SVG element(s) and adds them to
   * `annotation.elements`. Must return the same array it appended.
   *
   * @param {Object} pos - First point in image coordinates {x, y}
   * @param {Object} transform - Current camera transform
   * @param {Annotation} annotation - The draft annotation (already in the layer)
   * @returns {SVGElement[]} Newly created elements
   */
  startElement(pos, transform, annotation) {
    throw new Error(`Marker '${this.constructor.name}' must implement startElement() for '${this.interactionMode()}' mode`);
  }

  /**
   * **['sequence' mode]** Appends a new vertex to the in-progress geometry.
   * Called on every single-click after the first.
   *
   * @param {Object} pos - New vertex in image coordinates {x, y}
   * @param {Object} transform - Current camera transform
   * @param {Annotation} annotation - The draft annotation
   */
  addVertex(pos, transform, annotation) {
    // no-op by default (only needed for 'sequence')
  }

  /**
   * **['sequence'/'drag' mode]** Updates the rubber-band / live-preview element
   * as the pointer moves. Called on every pointermove while drawing is in progress.
   *
   * @param {Object} pos - Current pointer position in image coordinates {x, y}
   * @param {Object} transform - Current camera transform
   * @param {Annotation} annotation - The draft annotation
   */
  updatePreview(pos, transform, annotation) {
    // no-op by default
  }

  /**
   * **['sequence'/'drag' mode]** Finalises the geometry: removes any temporary
   * preview/rubber-band elements, makes the shape permanent, and returns the
   * definitive list of SVG elements that should remain on `annotation.elements`.
   *
   * @param {Object} transform - Current camera transform at finalisation time
   * @param {Annotation} annotation - The draft annotation
   * @returns {SVGElement[]} Final elements (used to replace `annotation.elements`)
   */
  finalizeElement(transform, annotation) {
    return annotation.elements;
  }

  /**
   * **['edit' mode]** Moves the vertex at `vertexIndex` to `pos`.
   * Called while the user drags a vertex handle in edit mode.
   * Default implementation is a no-op; override in markers that store vertices.
   *
   * @param {number} vertexIndex - Zero-based index of the vertex being dragged
   * @param {{x:number,y:number}} pos - New position in image coordinates
   * @param {Object} transform - Current camera transform
   * @param {Annotation} annotation - The annotation being edited
   */
  moveVertex(vertexIndex, pos, transform, annotation) {
    // no-op by default
  }

  // ── Common ──────────────────────────────────────────────────────────────

  /**
   * Updates marker elements on every redraw/zoom cycle.
   * Override to maintain constant screen-space size or adapt appearance.
   * Default implementation is a no-op.
   *
   * @param {SVGElement[]} elements - Elements on the annotation
   * @param {Object} transform - Current camera transform
   * @param {Annotation} annotation - The parent annotation
   */
  updateElements(elements, transform, annotation) {
    // no-op by default
  }

  /**
   * Returns a JSON-serializable representation of this marker's configuration.
   * Stored in `annotation.data._markerConfig` for round-trip persistence.
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

// ─── Built-in: PolylineMarker ─────────────────────────────────────────────────

/**
 * PolylineMarker — an open or closed polygon drawn by clicking individual vertices.
 *
 * **Interaction (sequence mode)**
 * - First click starts the shape (also places the first vertex).
 * - Subsequent single-clicks add vertices.
 * - A rubber-band segment follows the pointer between clicks.
 * - **Double-click** finalises the polyline (the last vertex is the double-click point).
 * - **Escape** cancels and removes the draft annotation.
 *
 * Stored marker data keys on `annotation.data`:
 *  - `_markerType`    → `'polyline'`
 *  - `_markerStroke`  → stroke color
 *  - `_markerStrokeWidth` → base stroke width in screen pixels
 *  - `_markerFill`    → fill color (`'none'` for open polyline)
 *  - `_markerClosed`  → whether to close the path as a polygon
 *  - `_markerPoints`  → `[{x,y}, …]` image-space vertices
 *
 * @extends Marker
 *
 * @example
 * ```javascript
 * manager.setActiveMarker('polyline', {
 *   stroke: '#00aaff', strokeWidth: 2, fill: 'none', closed: false
 * });
 * ```
 */
class PolylineMarker extends Marker {
  /**
   * @param {Object} [options]
   * @param {string} [options.stroke='#ff0000']    - Stroke color
   * @param {number} [options.strokeWidth=2]       - Base stroke width in screen pixels
   * @param {string} [options.fill='none']         - Fill color ('none' = open polyline)
   * @param {number} [options.opacity=1]           - Overall opacity (0–1)
   * @param {boolean}[options.closed=false]        - Close the path as a polygon
   */
  constructor(options = {}) {
    super('polyline', Object.assign({
      stroke: '#ff0000',
      strokeWidth: 2,
      fill: 'none',
      opacity: 1,
      closed: false,
      vertexRadius: 5,   // screen-px radius for vertex handle dots
    }, options));
  }

  interactionMode() { return 'sequence'; }

  // ── Internal helpers ────────────────────────────────────────────────────

  /** Converts a vertices array to the SVG `points` attribute string. */
  static _toPointsAttr(vertices) {
    return vertices.map(p => `${p.x},${p.y}`).join(' ');
  }

  /** Returns model-space stroke width from a screen-px base. */
  _modelStroke(transform) {
    return this.strokeWidth / (transform?.z ?? 1);
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  /** Returns model-space vertex-dot radius from a screen-px base. */
  _modelRadius(transform) {
    return (this.vertexRadius ?? 5) / (transform?.z ?? 1);
  }

  /** Creates a vertex dot and appends it to the handles group. */
  _addDot(pos, transform, handles) {
    const r = this._modelRadius(transform);
    const sw = this._modelStroke(transform);
    const dot = Util.createSVGElement('circle', {
      cx: String(pos.x), cy: String(pos.y),
      r: String(r),
      class: 'annotation-vertex-dot',
      fill: this.stroke,
      stroke: '#ffffff',
      'stroke-width': String(sw * 0.5),
      opacity: '0.9',
      // No pointer-events:none — dots must be drag-targets in edit mode.
      // The parent svgGroup has pointer-events:none in draw mode anyway.
      cursor: 'grab',
    });
    handles.appendChild(dot);
    return dot;
  }

  // ── Sequence mode overrides ─────────────────────────────────────────────

  startElement(pos, transform, annotation) {
    // Persist config
    annotation.data._markerStroke = this.stroke;
    annotation.data._markerStrokeWidth = this.strokeWidth;
    annotation.data._markerFill = this.fill;
    annotation.data._markerOpacity = this.opacity;
    annotation.data._markerClosed = this.closed;
    annotation.data._markerVertexRadius = this.vertexRadius ?? 5;
    annotation.data._markerPoints = [pos];

    const sw = this._modelStroke(transform);

    // Main polyline — starts with a single point (will grow with addVertex)
    const polyline = Util.createSVGElement('polyline', {
      points: PolylineMarker._toPointsAttr([pos]),
      class: 'annotation-polyline',
      stroke: this.stroke,
      'stroke-width': String(sw),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: this.fill,
      opacity: String(this.opacity),
    });

    // Rubber-band segment (preview of next edge, removed on finalize)
    const rubber = Util.createSVGElement('line', {
      x1: pos.x, y1: pos.y,
      x2: pos.x, y2: pos.y,
      class: 'annotation-polyline-rubber',
      stroke: this.stroke,
      'stroke-width': String(sw),
      'stroke-dasharray': `${sw * 4},${sw * 2}`,
      'stroke-linecap': 'round',
      opacity: String(this.opacity * 0.6),
    });

    // Vertex-handle dots group — one dot per committed vertex
    const handles = Util.createSVGElement('g', { class: 'annotation-vertex-handles' });
    this._addDot(pos, transform, handles);

    annotation.elements.push(polyline, rubber, handles);
    return [polyline, rubber, handles];
  }

  addVertex(pos, transform, annotation) {
    annotation.data._markerPoints.push(pos);

    const polyline = annotation.elements.find(el => el.classList?.contains('annotation-polyline'));
    if (polyline) {
      polyline.setAttribute('points', PolylineMarker._toPointsAttr(annotation.data._markerPoints));
    }
    // Advance rubber-band start
    const rubber = annotation.elements.find(el => el.classList?.contains('annotation-polyline-rubber'));
    if (rubber) {
      rubber.setAttribute('x1', pos.x);
      rubber.setAttribute('y1', pos.y);
      rubber.setAttribute('x2', pos.x);
      rubber.setAttribute('y2', pos.y);
    }
    // Add vertex dot
    const handles = annotation.elements.find(el => el.classList?.contains('annotation-vertex-handles'));
    if (handles) {
      this._addDot(pos, transform, handles);
    }
  }

  updatePreview(pos, transform, annotation) {
    const rubber = annotation.elements.find(el => el.classList?.contains('annotation-polyline-rubber'));
    if (rubber) {
      rubber.setAttribute('x2', pos.x);
      rubber.setAttribute('y2', pos.y);
    }
  }

  finalizeElement(transform, annotation) {
    // Remove rubber-band element
    const rubberIdx = annotation.elements.findIndex(el => el.classList?.contains('annotation-polyline-rubber'));
    if (rubberIdx !== -1) {
      const rubber = annotation.elements[rubberIdx];
      rubber.parentNode?.removeChild(rubber);
      annotation.elements.splice(rubberIdx, 1);
    }

    // Hide vertex dots (shown again when annotation is selected)
    const handles = annotation.elements.find(el => el.classList?.contains('annotation-vertex-handles'));
    if (handles) handles.setAttribute('visibility', 'hidden');

    // If closed, swap polyline → polygon
    if (annotation.data._markerClosed) {
      const polylineEl = annotation.elements.find(el => el.classList?.contains('annotation-polyline'));
      if (polylineEl) {
        const polygon = Util.createSVGElement('polygon', {
          points: PolylineMarker._toPointsAttr(annotation.data._markerPoints),
          class: 'annotation-polyline',
          stroke: annotation.data._markerStroke,
          'stroke-width': polylineEl.getAttribute('stroke-width'),
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          fill: annotation.data._markerFill,
          opacity: String(annotation.data._markerOpacity),
        });
        polylineEl.parentNode?.replaceChild(polygon, polylineEl);
        const idx = annotation.elements.indexOf(polylineEl);
        if (idx !== -1) annotation.elements[idx] = polygon;
      }
    }

    return annotation.elements;
  }

  // ── Zoom-responsive sizes ───────────────────────────────────────────────

  updateElements(elements, transform, annotation) {
    const baseSW = annotation.data?._markerStrokeWidth ?? this.strokeWidth;
    const baseR = annotation.data?._markerVertexRadius ?? (this.vertexRadius ?? 5);
    const sw = baseSW / (transform?.z ?? 1);
    const r = baseR / (transform?.z ?? 1);

    for (const el of elements) {
      if (el.classList?.contains('annotation-polyline')) {
        el.setAttribute('stroke-width', sw);
      }
      if (el.classList?.contains('annotation-polyline-rubber')) {
        el.setAttribute('stroke-width', sw);
        el.setAttribute('stroke-dasharray', `${sw * 4},${sw * 2}`);
      }
      if (el.classList?.contains('annotation-vertex-handles')) {
        el.setAttribute('stroke-width', sw * 0.5);
        for (const dot of el.children) {
          dot.setAttribute('r', r);
          dot.setAttribute('stroke-width', sw * 0.5);
        }
      }
    }
  }

  moveVertex(vertexIndex, pos, transform, annotation) {
    if (!annotation.data._markerPoints ||
      vertexIndex >= annotation.data._markerPoints.length) return;

    annotation.data._markerPoints[vertexIndex] = pos;

    // Update polyline / polygon points attribute
    const shape = annotation.elements.find(
      el => el.classList?.contains('annotation-polyline'));
    if (shape) {
      shape.setAttribute('points',
        PolylineMarker._toPointsAttr(annotation.data._markerPoints));
    }

    // Update the dot position
    const handles = annotation.elements.find(
      el => el.classList?.contains('annotation-vertex-handles'));
    if (handles) {
      const dot = handles.children[vertexIndex];
      if (dot) {
        dot.setAttribute('cx', String(pos.x));
        dot.setAttribute('cy', String(pos.y));
      }
    }
  }

  serialize() {
    return {
      type: this.type,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      fill: this.fill,
      opacity: this.opacity,
      closed: this.closed,
      vertexRadius: this.vertexRadius ?? 5,
    };
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
      layer: null,
      layerId: 'manager_annotations',
      layerLabel: 'Annotations',
      activeMarker: 'disk',
      markerOptions: {},
      enableState: true,
      customState: null,
    }, options);

    /** @type {'idle'|'draw'|'edit'} Current interaction mode. */
    this._mode = 'idle';
    /** @type {DrawingSession|null} Active drawing session, or null when idle. */
    this._session = null;
    /** @type {{annotation, vertexIndex}|null} Active vertex-drag session in edit mode. */
    this._vertexSession = null;
    /** @type {Annotation|null} The annotation whose vertex handles are currently visible. */
    this._selectedAnnotation = null;

    // Resolve or auto-create the annotation layer
    this._resolveLayer();

    // Wire selection events from the layer → 'select' signal + vertex-handle visibility
    this.layer.addEvent('selected', (anno) => {
      this._updateHandlesVisibility(anno);
      if (anno) this.emit('select', anno);
    });

    // ── Pointer handlers ────────────────────────────────────────────────
    // All three are registered permanently; each guards on _active and
    // the current interaction mode, so they are effectively no-ops when idle.

    // Double-tap: finalise 'sequence' OR instant-create 'tap'
    this._pointerHandler = {
      priority: 10000,
      fingerDoubleTap: (e) => this._onDoubleTap(e),
    };

    // Single-tap: add vertex for 'sequence' mode
    this._singleTapHandler = {
      priority: 10000,
      fingerSingleTap: (e) => this._onSingleTap(e),
    };

    // Pan (drag): used for 'drag' mode markers
    this._dragHandler = {
      priority: 10000,
      panStart: (e) => this._onDragStart(e),
      panMove: (e) => this._onDragMove(e),
      panEnd: (e) => this._onDragEnd(e),
    };

    // Hover: rubber-band update for 'sequence' mode
    this._hoverHandler = {
      priority: 10000,
      fingerHover: (e) => this._onHover(e),
    };

    viewer.pointerManager.onEvent(this._pointerHandler);
    viewer.pointerManager.onEvent(this._singleTapHandler);
    viewer.pointerManager.onPan(this._dragHandler);
    viewer.pointerManager.onEvent(this._hoverHandler);

    // Keyboard: Escape cancels, Enter finalises an in-progress drawing
    this._keyHandler = (e) => {
      if (e.key === 'Escape' && this._session) {
        this._cancelSession();
        e.preventDefault();
      } else if ((e.key === 'Enter') && this._session) {
        this._finalizeSession(e);
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    // Shorthand callback registration
    if (options.onCreate) this.addEvent('create', options.onCreate);
    if (options.onUpdate) this.addEvent('update', options.onUpdate);
    if (options.onDelete) this.addEvent('delete', options.onDelete);
    if (options.onSelect) this.addEvent('select', options.onSelect);
    if (options.onSessionStart) this.addEvent('sessionStart', options.onSessionStart);
    if (options.onSessionCancel) this.addEvent('sessionCancel', options.onSessionCancel);
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
   * Sets the interaction mode.
   *
   * | Mode   | Behaviour |
   * |--------|-----------|
   * | `'idle'` | No annotation interaction; panzoom/light work normally |
   * | `'draw'` | Creates new annotations; existing annotations are non-clickable (pointer-events:none) |
   * | `'edit'` | Selects and (future) edits existing annotations; no new creation |
   *
   * Cancels any in-progress drawing session when leaving `'draw'`.
   * Fires the `'modeChange'` signal when the mode actually changes.
   *
   * @param {'idle'|'draw'|'edit'} mode
   * @returns {string} The new mode.
   */
  setMode(mode) {
    const valid = ['idle', 'draw', 'edit'];
    if (!valid.includes(mode))
      throw new Error(`ManagerSvgAnnotation.setMode: invalid mode '${mode}'. Valid: ${valid.join(', ')}`);

    // Cancel in-progress drawing when leaving draw mode
    if (this._mode === 'draw' && mode !== 'draw' && this._session)
      this._cancelSession();

    const prev = this._mode;
    this._mode = mode;

    // Double-tap zoom: disable whenever a mode other than idle is active
    if (this.viewer.panzoom)
      this.viewer.panzoom.enableDoubleTapZoom = (mode === 'idle');

    this._syncPointerEvents();
    if (mode !== prev) this.emit('modeChange', mode);
    return mode;
  }

  /**
   * Convenience toggle for `UIBasic` backward compatibility.
   * Toggles between `'draw'` and `'idle'`; `force=true` → draw, `force=false` → idle.
   * @param {boolean} [force]
   * @returns {boolean} True if now in draw mode.
   */
  toggle(force) {
    const target = force === undefined
      ? (this._mode === 'draw' ? 'idle' : 'draw')
      : (force ? 'draw' : 'idle');
    this.setMode(target);
    return this._mode === 'draw';
  }

  /**
   * Current interaction mode: `'idle'`, `'draw'`, or `'edit'`.
   * @type {string}
   */
  get mode() { return this._mode; }

  /**
   * `true` when any mode other than `'idle'` is active.
   * Kept for backward compatibility with `UIBasic`.
   * @type {boolean}
   */
  get active() { return this._mode !== 'idle'; }

  /**
   * Programmatically finalises the current sequence/drag drawing.
   * Equivalent to pressing Enter. No-op if no drawing is in progress.
   * @returns {Annotation|null} The created annotation, or null.
   */
  finishDrawing() {
    if (!this._session) return null;
    this._finalizeSession(null);
    return null; // annotation already emitted via 'create' event
  }

  /**
   * Removes all event listeners registered by this manager.
   * Call when removing the manager from the viewer.
   */
  destroy() {
    document.removeEventListener('keydown', this._keyHandler);
    const svgGroup = this.layer?.svgGroup;
    if (svgGroup) svgGroup.style.pointerEvents = ''; // restore
    if (this._session) this._cancelSession();
    if (this._selectedAnnotation) this._detachVertexDragListeners(this._selectedAnnotation);
  }

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
    const markerType = opts.markerType ?? this.activeMarker;
    const markerOptions = Object.assign({}, this.markerOptions, opts.markerOptions ?? {});
    const marker = this._instantiateMarker(markerType, markerOptions);

    // Create a bare annotation through the layer (ensures proper SVG element wrapping)
    const annotation = this.layer.newAnnotation();
    annotation.label = opts.label ?? '';
    annotation.description = opts.description ?? '';
    annotation.class = opts.class ?? '';
    annotation.publish = opts.publish ?? 1;
    annotation.data = Object.assign({}, opts.data ?? {});

    // Record the marker type and creation position so callers can read them
    annotation.data._markerType = markerType;
    annotation.data._x = pos.x;
    annotation.data._y = pos.y;

    // Optionally capture viewer state
    if (this.enableState) {
      this._captureState(annotation);
    }

    // Let the marker build its SVG elements
    const transform = this.viewer.camera.getCurrentTransform(performance.now());
    const elements = marker.createElement(pos, transform, annotation);
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
    annotation.syncSvg();
    this.emit('create', annotation);
    return annotation;
  }

  /*
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
    this.activeMarker = type;
    this.markerOptions = options;
    this._syncPointerEvents(); // re-evaluate pointer-events for new interaction mode
  }

  // ─── Internal: pointer-events management ────────────────────────────────────

  /**
   * Sets `pointer-events: none` on the annotation SVG group when pencil mode is
   * active AND the current marker uses 'sequence' or 'drag' interaction.
   *
   * **Why this is needed:**
   * `LayerSvgAnnotation` wires `onpointerdown` on every annotation SVG element
   * and calls `e.stopPropagation()`.  That prevents the event from bubbling to
   * `overlayElement` where `PointerManager` listens — so `fingerSingleTap` and
   * `fingerMovingStart` are never emitted for those clicks.
   *
   * By setting `pointer-events: none` on the SVG group the browser treats the
   * transparent area as hit-target instead of the SVG shapes, so pointer events
   * land directly on `overlayElement`/canvas and `PointerManager` sees them all.
   *
   * @private
   */
  _syncPointerEvents() {
    const svgGroup = this.layer?.svgGroup;
    if (!svgGroup) return;
    if (this._mode === 'draw') {
      // In draw mode, existing annotations must NOT intercept pointer events so
      // PointerManager sees every click — even clicks on top of drawn shapes.
      try {
        const iMode = this._instantiateMarker(this.activeMarker, this.markerOptions).interactionMode();
        // For sequence/drag the whole svgGroup is transparent.
        // For tap, single-clicks still need to reach PointerManager for double-tap
        // detection, so we also set none (tap mode only fires on dblclick).
        svgGroup.style.pointerEvents = 'none';
      } catch {
        svgGroup.style.pointerEvents = 'none';
      }
    } else {
      // idle or edit: annotations respond to clicks normally (selection)
      svgGroup.style.pointerEvents = '';
    }
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
      label: this.layerLabel,
      annotations: [],
    };

    if (baseLayer) {
      layerOptions.layout = baseLayer.layout;
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
    const rect = this.viewer.canvasElement.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const bb = this.layer.layout.boundingBox();
    const size = { w: bb.width(), h: bb.height() };
    return CoordinateSystem.fromCanvasHtmlToImage(
      p, this.viewer.camera, this.layer.transform, size, false
    );
  }

  // ─── Internal: pointer handlers ──────────────────────────────────────────

  /** Guard: returns true if the event should be ignored (not in draw mode, or UI overlays). */
  _shouldIgnore(e) {
    if (this._mode !== 'draw') return true;
    if (!this.layer?.layout) return true;
    const t = e.target;
    if (t?.closest?.('.openlime-toolbar') ||
      t?.closest?.('.openlime-layers-menu') ||
      t?.closest?.('.openlime-dialog') ||
      t?.classList?.contains('openlime-button')) return true;
    return false;
  }

  /**
   * Double-tap:
   *  - 'tap'      → instant create (existing behaviour, unchanged)
   *  - 'sequence' → if session active: add final vertex + finalise
   *                 (classic GIS UX: double-click = "place last point and close")
   *                 if no session: ignored
   *  - 'drag'     → ignored
   * @private
   */
  _onDoubleTap(e) {
    if (this._shouldIgnore(e)) return;
    e.preventDefault?.();
    e.stopPropagation?.();

    const mode = this._instantiateMarker(this.activeMarker, this.markerOptions).interactionMode();

    if (mode === 'tap') {
      const pos = this._eventToImageCoords(e);
      this.createAnnotation(pos);

    } else if (mode === 'sequence') {
      if (this._session) {
        // Add the double-clicked point as an extra vertex, then finalize.
        // This mirrors the intuitive "last click = close" UX of drawing tools.
        const pos = this._eventToImageCoords(e);
        const transform = this.viewer.camera.getCurrentTransform(performance.now());
        this._session.marker.addVertex(pos, transform, this._session.annotation);
        this._session.annotation.needsUpdate = true;
        this._finalizeSession(e);
      }
    }
  }

  /**
   * Single-tap:
   *  - 'sequence' + no session → start a new drawing session (first vertex)
   *  - 'sequence' + session    → add a vertex
   *  - other modes             → ignored
   * @private
   */
  _onSingleTap(e) {
    if (this._shouldIgnore(e)) return;

    const mode = this._instantiateMarker(this.activeMarker, this.markerOptions).interactionMode();
    if (mode !== 'sequence') return;

    e.preventDefault?.();
    e.stopPropagation?.();

    const pos = this._eventToImageCoords(e);

    if (!this._session) {
      this._startSession(pos, e);
    } else {
      const transform = this.viewer.camera.getCurrentTransform(performance.now());
      this._session.marker.addVertex(pos, transform, this._session.annotation);
      this._session.annotation.needsUpdate = true;
      this.viewer.redraw();
    }
  }

  /** Hover → rubber-band update for 'sequence' sessions (mouse up + moving). @private */
  _onHover(e) {
    if (!this._session) return;
    const pos = this._eventToImageCoords(e);
    const transform = this.viewer.camera.getCurrentTransform(performance.now());
    this._session.marker.updatePreview(pos, transform, this._session.annotation);
    this._session.annotation.needsUpdate = true;
    this.viewer.redraw();
  }

  /**
   * Pan/drag start.
   *
   * When pencil is active this handler runs BEFORE panzoom (priority 10000 vs -1000).
   * Calling `e.preventDefault()` here stops the PointerManager from registering
   * per-pointer fingerMoving/fingerMovingEnd handlers for panzoom, AND breaks the
   * broadcast() loop so panzoom's fingerMovingStart never fires — full pan lockout.
   *
   * Modes:
   *  - 'drag'     → start a drag session (rect/ellipse)
   *  - 'sequence' → treat pan-start position as a vertex (fallback for "drag-click")
   *  - 'tap'      → pan is just blocked, no drawing action
   * @private
   */
  _onDragStart(e) {
    // Interfere when in draw OR edit mode (but not idle)
    if (this._mode === 'idle' || !this.layer?.layout) return;

    // Allow toolbar/menu clicks to fall through normally
    const t = e.target;
    if (t?.closest?.('.openlime-toolbar') ||
      t?.closest?.('.openlime-layers-menu') ||
      t?.closest?.('.openlime-dialog') ||
      t?.classList?.contains('openlime-button')) return;

    // Block light controller (priority 0) and panzoom (priority -1000) from
    // receiving this pan.  In draw mode we go on to handle drawing; in edit mode
    // we start a vertex-drag session if the pointer is on a vertex dot.
    e.preventDefault?.();

    if (this._mode === 'edit') {
      // In edit mode, vertex drag is handled by direct per-dot listeners
      // (see _attachVertexDragListeners). We still call e.preventDefault() here
      // only if the target is NOT a vertex dot (to block light/panzoom on 
      // non-vertex drags). For vertex dots the dot's own pointerdown listener
      // calls stopPropagation so this handler won't be reached at all.
      e.preventDefault?.();
      return;
    }

    const mode = this._instantiateMarker(this.activeMarker, this.markerOptions).interactionMode();

    if (mode === 'drag') {
      const pos = this._eventToImageCoords(e);
      this._startSession(pos, e);

    } else if (mode === 'sequence') {
      // "Drag-click": user pressed and moved slightly (> 1 mm threshold).
      // Treat the press position as a vertex, same as a clean single-tap.
      const pos = this._eventToImageCoords(e);
      if (!this._session) {
        this._startSession(pos, e);
      } else {
        const transform = this.viewer.camera.getCurrentTransform(performance.now());
        this._session.marker.addVertex(pos, transform, this._session.annotation);
        this._session.annotation.needsUpdate = true;
        this.viewer.redraw();
      }
    }
    // 'tap' mode: pan is blocked, no drawing action (user uses double-click)
  }

  /**
   * Pan/drag move → live shape/rubber-band preview.
   * (Vertex drag is handled entirely via direct listeners on the dot elements.)
   * @private
   */
  _onDragMove(e) {
    if (!this._session) return;
    const pos = this._eventToImageCoords(e);
    const transform = this.viewer.camera.getCurrentTransform(performance.now());
    this._session.marker.updatePreview(pos, transform, this._session.annotation);
    this._session.annotation.needsUpdate = true;
    this.viewer.redraw();
  }

  /** Pan/drag end → finalise 'drag' mode only. 'sequence' finalises on double-tap. @private */
  _onDragEnd(e) {
    if (!this._session) return;
    if (this._session.marker.interactionMode() === 'drag') {
      this._finalizeSession(e);
    }
  }

  // ─── Internal: drawing session lifecycle ──────────────────────────────────

  /**
   * Starts a new DrawingSession for the current active marker.
   * Creates a draft annotation visible in the layer immediately.
   * @param {{x:number,y:number}} pos - First point in image coordinates
   * @param {PointerEvent} e
   * @private
   */
  _startSession(pos, e) {
    const markerOptions = Object.assign({}, this.markerOptions);
    const marker = this._instantiateMarker(this.activeMarker, markerOptions);

    const annotation = this.layer.newAnnotation();
    annotation.label = '';
    annotation.description = '';
    annotation.class = '';
    annotation.publish = 1;
    annotation.data = {};
    annotation.data._markerType = this.activeMarker;
    annotation.data._x = pos.x;
    annotation.data._y = pos.y;

    if (this.enableState) this._captureState(annotation);

    const transform = this.viewer.camera.getCurrentTransform(performance.now());
    marker.startElement(pos, transform, annotation);
    annotation.needsUpdate = true;

    if (!this.layer.annotations.includes(annotation)) {
      this.layer.annotations.push(annotation);
    }

    this._session = { annotation, marker };
    this.viewer.redraw();
    this.emit('sessionStart', annotation);
  }

  /**
   * Shows vertex handles for `selectedAnno` and hides them for all others.
   * In edit mode also re-wires direct pointer-down drag listeners on the visible dots.
   * Called on 'selected' events from the layer.
   * @param {Annotation|null} selectedAnno
   * @private
   */
  _updateHandlesVisibility(selectedAnno) {
    if (!this.layer?.annotations) return;

    // Detach drag listeners from the previously-selected annotation
    if (this._selectedAnnotation && this._selectedAnnotation !== selectedAnno) {
      this._detachVertexDragListeners(this._selectedAnnotation);
    }

    let changed = false;
    for (const anno of this.layer.annotations) {
      const handles = anno.elements?.find(el => el.classList?.contains('annotation-vertex-handles'));
      if (!handles) continue;
      if (anno === selectedAnno) {
        handles.removeAttribute('visibility');
      } else {
        handles.setAttribute('visibility', 'hidden');
      }
      anno.needsUpdate = true;
      changed = true;
    }

    this._selectedAnnotation = selectedAnno ?? null;

    // Attach drag listeners to the newly-selected annotation (if any)
    if (selectedAnno) this._attachVertexDragListeners(selectedAnno);

    if (changed) this.viewer.redraw();
  }

  /**
   * Finalises (commits) the current drawing session.
   * Calls `marker.finalizeElement`, fires 'create', clears session.
   * @param {PointerEvent} e
   * @private
   */
  _finalizeSession(e) {
    if (!this._session) return;
    const { annotation, marker } = this._session;
    this._session = null;

    const transform = this.viewer.camera.getCurrentTransform(performance.now());
    const finalElements = marker.finalizeElement(transform, annotation);
    annotation.elements = finalElements;
    annotation.needsUpdate = true;
    annotation.syncSvg();
    this.viewer.redraw();
    this.emit('create', annotation);
  }

  /**
   * Cancels the current drawing session, removing the draft annotation.
   * @private
   */
  _cancelSession() {
    if (!this._session) return;
    const { annotation } = this._session;
    this._session = null;
    this.layer.deleteAnnotationById(annotation.id);
    this.viewer.redraw();
    this.emit('sessionCancel');
  }

  // ─── Internal: vertex-drag direct listeners ────────────────────────────────

  /**
   * Attaches a direct `pointerdown` listener to every vertex dot of `annotation`.
   *
   * Why direct listeners instead of PointerManager:
   * `LayerSvgAnnotation` sets `onpointerdown` (with `stopPropagation`) on every
   * element in `anno.elements`, including the `annotation-vertex-handles` group.
   * A click on a dot bubbles to that group handler and is swallowed before
   * PointerManager sees it.  By adding an `addEventListener` on the dot itself
   * we intercept the event at the target (before it bubbles to the group handler)
   * and drive the drag via `setPointerCapture` + raw `pointermove`/`pointerup`.
   *
   * @param {Annotation} annotation
   * @private
   */
  _attachVertexDragListeners(annotation) {
    const handles = annotation.elements?.find(
      el => el.classList?.contains('annotation-vertex-handles'));
    if (!handles) return;

    [...handles.children].forEach((dot, idx) => {
      // Idempotent: skip if already attached
      if (dot._vertexDragHandler) return;

      dot._vertexDragHandler = (e) => {
        if (e.button !== 0) return;
        // Prevent the event from bubbling to handles.onpointerdown (stopPropagation)
        // and from being treated as a pan by PointerManager.
        e.stopPropagation();
        e.preventDefault();

        this._vertexSession = { annotation, vertexIndex: idx };

        // setPointerCapture ensures pointermove fires even if the dot element is
        // detached mid-drag by a redraw/syncSvg cycle.  We also capture on
        // document so we always get the events regardless of DOM changes.
        dot.setPointerCapture(e.pointerId);

        const onMove = (ev) => {
          if (ev.pointerId !== e.pointerId) return;
          if (!this._vertexSession) { cleanup(); return; }
          const pos = this._eventToImageCoords(ev);
          const transform = this.viewer.camera.getCurrentTransform(performance.now());
          const markerType = annotation.data?._markerType ?? this.activeMarker;
          try {
            const marker = this._instantiateMarker(markerType, {});
            marker.moveVertex(idx, pos, transform, annotation);
          } catch { /* unknown marker — ignore */ }
          annotation.needsUpdate = true;
          this.viewer.redraw();
        };

        const onUp = (ev) => {
          if (ev.pointerId !== e.pointerId) return;
          cleanup();
          this._vertexSession = null;
          annotation.syncSvg?.();
          this.emit('update', annotation);
        };

        const cleanup = () => {
          document.removeEventListener('pointermove', onMove);
          document.removeEventListener('pointerup', onUp);
          document.removeEventListener('pointercancel', onUp);
        };

        // Listen on document so events arrive even if the dot is replaced
        // by a syncSvg() call during the redraw triggered inside onMove.
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      };

      dot.addEventListener('pointerdown', dot._vertexDragHandler);
    });
  }

  /**
   * Removes the vertex-drag `pointerdown` listeners previously attached by
   * `_attachVertexDragListeners`.
   * @param {Annotation} annotation
   * @private
   */
  _detachVertexDragListeners(annotation) {
    const handles = annotation?.elements?.find(
      el => el.classList?.contains('annotation-vertex-handles'));
    if (!handles) return;
    for (const dot of handles.children) {
      if (dot._vertexDragHandler) {
        dot.removeEventListener('pointerdown', dot._vertexDragHandler);
        delete dot._vertexDragHandler;
      }
    }
  }

  // ─── Internal: vertex-hit detection (kept for reference) ───────────────────

  /**
   * Returns the annotation and vertex index for a pointer target that is a
   * vertex dot, or `null` if the target is not a vertex dot.
   *
   * @param {EventTarget} target
   * @returns {{annotation: Annotation, vertexIndex: number}|null}
   * @private
   */
  _findVertexAtTarget(target) {
    if (!target?.classList?.contains('annotation-vertex-dot')) return null;
    for (const anno of this.layer.annotations) {
      const handles = anno.elements?.find(
        el => el.classList?.contains('annotation-vertex-handles'));
      if (!handles) continue;
      const idx = [...handles.children].indexOf(target);
      if (idx !== -1) return { annotation: anno, vertexIndex: idx };
    }
    return null;
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

addSignals(ManagerSvgAnnotation, 'create', 'update', 'delete', 'select', 'sessionStart', 'sessionCancel', 'modeChange');

// Register built-in markers
ManagerSvgAnnotation.registerMarker('disk', DiskMarker);
ManagerSvgAnnotation.registerMarker('polyline', PolylineMarker);

export { ManagerSvgAnnotation, Marker, DiskMarker, PolylineMarker };
