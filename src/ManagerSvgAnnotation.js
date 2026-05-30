import { Annotation } from './Annotation.js';
import { LayerSvgAnnotation } from './LayerSvgAnnotation.js';
import { CoordinateSystem } from './CoordinateSystem.js';
import { Util } from './Util.js';
import { addSignals } from './Signals.js';
import { ramerDouglasPeucker, smooth, relaxDenseZigZagPoints } from './Simplify.js';

// CSS drop-shadow() is post-rasterisation (CSS pixels), so the shadow keeps a
// constant visual size at every zoom level (unlike SVG feDropShadow in user space).
const _SHADOW_FILTER = 'drop-shadow(1.5px 1.5px 2.0px rgba(0,0,0,0.80))';
const _SHADOW        = `filter: ${_SHADOW_FILTER}`;
const _SHADOW_RUBBER = 'filter: drop-shadow(1px 1px 1.8px rgba(0,0,0,0.40))';

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
 *  │  'tap'      create-click → instant create                │      │
 *  │  'sequence' click* + dbl-click → polygon/polyline      │        │
 *  │  'drag'     mousedown+move+up → rect/ellipse           │        │
 *  │                                                        │        │
 *  │  CreationSession (active during 'sequence'/'drag')     │        │
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
 * // Tap marker (instant creation with single-click in create mode)
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
 * | `'tap'` *(default)* | create-click → instant create | `createElement` |
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
  * Called once for instant creation; must return an array of SVG elements.
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

  /**
   * Called by `_finalizeSession` to decide whether the current drawing can be
   * committed.  Return `false` to silently cancel instead.
   * Default implementation always allows finalising (safe for 'tap'/'drag').
   * @param {Annotation} annotation
   * @returns {boolean}
   */
  canFinalize(annotation) { return true; }

  /**
   * Called by `_finalizeSession` to decide whether the manager should stay in
   * `create` mode after committing the current shape.
   * Default keeps the existing behaviour (switch back to `edit`).
   * @param {Annotation} annotation
   * @returns {boolean}
   */
  shouldStayInCreateModeAfterFinalize(annotation) { return false; }

  /**
   * Creates a vertex-handle dot SVG circle.
   * Shared by all built-in markers for visual consistency:
   * white fill with a dark outline, constant model-space radius.
   *
   * @param {number} x      - cx in image coordinates
   * @param {number} y      - cy in image coordinates
   * @param {number} r      - model-space radius
   * @param {string} [cursor='grab'] - CSS cursor shown on the dot
   * @returns {SVGCircleElement}
   */
  makeDot(x, y, r, cursor = 'grab') {
    return Util.createSVGElement('circle', {
      cx: x, cy: y, r,
      fill: '#fff',
      stroke: '#333',
      'stroke-width': r * 0.4,
      class: 'annotation-vertex-dot',
      style: `cursor: ${cursor}`,
    });
  }
}

// ─── Built-in: DiskMarker ─────────────────────────────────────────────────────

/**
 * DiskMarker — a filled circle that maintains constant **screen-space** size
 * regardless of zoom level.
 *
 * Colors are **not** stored in the marker; they are resolved by
 * `ManagerSvgAnnotation` from its `semanticClasses` map and passed as the `style`
 * parameter to each method.
 *
 * Stored geometry keys on `annotation.data`:
 *  - `_markerType` → `'disk'`
 *
 * @extends Marker
 *
 * @example
 * ```javascript
 * ManagerSvgAnnotation.registerMarker('disk', DiskMarker);
 * manager.setActiveMarker('disk', { radius: 16 });
 * ```
 */
class DiskMarker extends Marker {
  /**
   * @param {Object} [options]
   * @param {number} [options.radius=7] - Screen radius in pixels at zoom level 1
   */
  constructor(options = {}) {
    super('disk', Object.assign({ radius: 7 }, options));
  }

  createElement(pos, transform, annotation, style = {}) {
    const modelRadius = this.radius / (transform?.z ?? 1);

    const sw = (style.strokeWidth ?? 2) / (transform?.z ?? 1);
    const circle = Util.createSVGElement('circle', {
      cx: pos.x,
      cy: pos.y,
      r: modelRadius,
      class: 'annotation-disk',
      fill: style.fill ?? '#ff0000',
      stroke: style.stroke ?? 'none',
      'stroke-width': String(sw),
      opacity: String(style.fillOpacity ?? 0.7),
      style: _SHADOW,
    });
    return [circle];
  }

  updateElements(elements, transform, annotation, style = {}) {
    const modelRadius = this.radius / (transform?.z ?? 1);
    const sw = (style.strokeWidth ?? 2) / (transform?.z ?? 1);
    for (const el of elements) {
      if (el.classList?.contains('annotation-disk')) {
        el.setAttribute('r', modelRadius);
        el.setAttribute('stroke-width', String(sw));
      }
    }
  }

  moveVertex(vertexIndex, pos, transform, annotation) {
    // A disk has a single implicit vertex at its centre
    annotation.data._x = pos.x;
    annotation.data._y = pos.y;
    const circle = annotation.elements?.find(el => el.classList?.contains('annotation-disk'));
    if (circle) {
      circle.setAttribute('cx', String(pos.x));
      circle.setAttribute('cy', String(pos.y));
    }
  }

  serialize() {
    return { type: this.type, radius: this.radius };
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
 * - **Double-click** finalises the polyline.
 * - **Escape** cancels and removes the draft annotation.
 *
 * Colors are **not** stored in the marker; they are resolved by
 * `ManagerSvgAnnotation` from its `semanticClasses` map and passed as the `style`
 * parameter to each method.
 *
 * Stored geometry keys on `annotation.data`:
 *  - `_markerType`   → `'polyline'`
 *  - `_markerClosed` → whether to close the path as a polygon
 *  - `_markerPoints`  → `[{x,y}, …]` image-space vertices
 *
 * @extends Marker
 *
 * @example
 * ```javascript
 * manager.setActiveMarker('polyline', { closed: false, vertexRadius: 5 });
 * ```
 */
class PolylineMarker extends Marker {
  /**
   * @param {Object} [options]
   * @param {boolean}[options.closed=false]      - Close the path as a polygon
   * @param {number} [options.vertexRadius=5]    - Screen-px radius for vertex handle dots
   */
  constructor(options = {}) {
    super('polyline', Object.assign({
      closed: false,
      vertexRadius: 5,
      hitTolerance: 8,   // screen-px extra hit area on each side of the stroke
    }, options));
  }

  interactionMode() { return 'sequence'; }

  // ── Internal helpers ────────────────────────────────────────────────────

  /** Converts a vertices array to the SVG `points` attribute string. */
  static _toPointsAttr(vertices) {
    return vertices.map(p => `${p.x},${p.y}`).join(' ');
  }

  /** Returns model-space stroke width from the style and current zoom. */
  _modelStroke(transform, style) {
    return (style?.strokeWidth ?? 2) / (transform?.z ?? 1);
  }

  /** Returns model-space vertex-dot radius from a screen-px base. */
  _modelRadius(transform) {
    return (this.vertexRadius ?? 5) / (transform?.z ?? 1);
  }

  /** Creates a vertex dot and appends it to the handles group. */
  _addDot(pos, transform, handles) {
    const r = this._modelRadius(transform);
    const dot = this.makeDot(pos.x, pos.y, r);
    handles.appendChild(dot);
    return dot;
  }

  // ── Sequence mode overrides ─────────────────────────────────────────────

  startElement(pos, transform, annotation, style = {}) {
    annotation.data._markerClosed = this.closed;
    annotation.data._markerPoints = [pos];

    const sw = this._modelStroke(transform, style);
    const stroke = style.stroke ?? '#ff0000';
    const fill = this.closed ? (style.fill ?? 'none') : 'none';
    const opacity = style.fillOpacity ?? 1;

    annotation.type = this.closed ? 'polygon' : 'polyline';

    // Main polyline — starts with a single point (will grow with addVertex)
    const polyline = Util.createSVGElement('polyline', {
      points: PolylineMarker._toPointsAttr([pos]),
      class: 'annotation-polyline',
      stroke,
      'stroke-width': String(sw),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill,
      opacity: String(opacity),
      style: _SHADOW,
    });

    // Invisible hit-target with wider stroke for easier selection.
    // Do NOT set `pointer-events` explicitly here: the element must inherit
    // the group-level pointer-events policy (e.g. `none` when pencil disabled).
    const hitSw = (this.hitTolerance ?? 8) / (transform?.z ?? 1);
    const hitFill = this.closed ? 'transparent' : 'none';
    const hit = Util.createSVGElement('polyline', {
      points: PolylineMarker._toPointsAttr([pos]),
      class: 'annotation-polyline-hit',
      stroke: 'transparent',
      'stroke-width': String(hitSw),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: hitFill,
    });

    // Rubber-band polyline (preview of next edge, removed on finalize).
    // Using <polyline> instead of <line> so that for closed polygons we can
    // extend it to [lastCommitted, cursor, firstCommitted] and show the
    // closing edge live — without ever touching the main annotation-polyline.
    const rubberAttrs = {
      points: PolylineMarker._toPointsAttr([pos, pos]),
      class: 'annotation-polyline-rubber',
      stroke,
      'stroke-width': String(sw),
      'stroke-dasharray': `${sw * 4},${sw * 2}`,
      'stroke-linecap': 'round',
      opacity: String(opacity * 0.6),
      fill: this.closed ? fill : 'none',
      style: _SHADOW_RUBBER,
    };
    if (this.closed) {
      rubberAttrs['fill-opacity'] = String(Math.max(0.08, (style.fillOpacity ?? 0.25) * 0.6));
    }
    const rubber = Util.createSVGElement('polyline', rubberAttrs);

    // Vertex-handle dots group — one dot per committed vertex
    // Explicitly visible during the creation session; finalizeElement will hide it.
    const handles = Util.createSVGElement('g', { class: 'annotation-vertex-handles', visibility: 'visible' });
    this._addDot(pos, transform, handles);

    annotation.elements.push(polyline, hit, rubber, handles);
    return [polyline, hit, rubber, handles];
  }

  addVertex(pos, transform, annotation) {
    annotation.data._markerPoints.push(pos);

    const pts = PolylineMarker._toPointsAttr(annotation.data._markerPoints);
    const polyline = annotation.elements.find(el => el.classList?.contains('annotation-polyline'));
    if (polyline) polyline.setAttribute('points', pts);

    const hit = annotation.elements.find(el => el.classList?.contains('annotation-polyline-hit'));
    if (hit) hit.setAttribute('points', pts);

    // Advance rubber-band start
    const rubber = annotation.elements.find(el => el.classList?.contains('annotation-polyline-rubber'));
    if (rubber) {
      const pts = annotation.data._markerPoints;
      const last = pts[pts.length - 1];
      // rubber: [newVertex, newVertex] (collapsed; updatePreview will expand it)
      rubber.setAttribute('points', PolylineMarker._toPointsAttr([last, last]));
    }
    // Add vertex dot
    const handles = annotation.elements.find(el => el.classList?.contains('annotation-vertex-handles'));
    if (handles) {
      const r = this._modelRadius(transform);
      handles.appendChild(this.makeDot(pos.x, pos.y, r));
    }
  }

  updatePreview(pos, transform, annotation) {
    // The main annotation-polyline is NEVER modified here — only the rubber-band.
    // For open polylines: rubber = [lastCommitted, cursor]  (single segment).
    // For closed polygons with ≥2 committed vertices: rubber = [lastCommitted, cursor, firstCommitted]
    // so the closing edge is shown live without touching the authoritative polyline element.
    const rubber = annotation.elements.find(el => el.classList?.contains('annotation-polyline-rubber'));
    if (!rubber) return;
    const pts = annotation.data._markerPoints;
    if (!pts?.length) return;
    const last = pts[pts.length - 1];
    const close = annotation.data._markerClosed && pts.length >= 2 ? [pos, pts[0]] : [pos];
    rubber.setAttribute('points', PolylineMarker._toPointsAttr([last, ...close]));
  }

  finalizeElement(transform, annotation, style = {}) {
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

    // If closed, swap polyline → polygon (both visible and hit-target elements)
    if (annotation.data._markerClosed) {
      const pts = PolylineMarker._toPointsAttr(annotation.data._markerPoints);

      const polylineEl = annotation.elements.find(el =>
        el.classList?.contains('annotation-polyline') && !el.classList?.contains('annotation-polyline-hit'));
      if (polylineEl) {
        const polygon = Util.createSVGElement('polygon', {
          points: pts,
          class: 'annotation-polyline',
          stroke: style.stroke ?? polylineEl.getAttribute('stroke'),
          'stroke-width': polylineEl.getAttribute('stroke-width'),
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          fill: style.fill ?? 'none',
          opacity: polylineEl.getAttribute('opacity'),
          style: _SHADOW,
        });
        polylineEl.parentNode?.replaceChild(polygon, polylineEl);
        const idx = annotation.elements.indexOf(polylineEl);
        if (idx !== -1) annotation.elements[idx] = polygon;
      }

      const hitEl = annotation.elements.find(el => el.classList?.contains('annotation-polyline-hit'));
      if (hitEl) {
        const hitPolygon = Util.createSVGElement('polygon', {
          points: pts,
          class: 'annotation-polyline-hit',
          stroke: 'transparent',
          'stroke-width': hitEl.getAttribute('stroke-width'),
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          fill: 'transparent',
        });
        hitEl.parentNode?.replaceChild(hitPolygon, hitEl);
        const hidx = annotation.elements.indexOf(hitEl);
        if (hidx !== -1) annotation.elements[hidx] = hitPolygon;
      }
    }

    return annotation.elements;
  }

  // ── Zoom-responsive sizes ───────────────────────────────────────────────

  updateElements(elements, transform, annotation, style = {}) {
    const sw = this._modelStroke(transform, style);
    const r = this._modelRadius(transform);
    // Hit-target tolerance in model space: fixed 8 screen-px converted to model.
    const hitSw = (this.hitTolerance ?? 8) / (transform?.z ?? 1);

    for (const el of elements) {
      if (el.classList?.contains('annotation-polyline')) {
        el.setAttribute('stroke-width', sw);
      }
      if (el.classList?.contains('annotation-polyline-hit')) {
        el.setAttribute('stroke-width', hitSw);
        // Ensure legacy hit-targets created with explicit pointer-events
        // no longer override group-level pointer-event policy.
        el.removeAttribute('pointer-events');
      }
      if (el.classList?.contains('annotation-polyline-rubber')) {
        el.setAttribute('stroke-width', sw);
        // rubber is now a <polyline>; update dash pattern for all its segments
        el.setAttribute('stroke-dasharray', `${sw * 4},${sw * 2}`);
      }
      if (el.classList?.contains('annotation-vertex-handles')) {
        for (const dot of el.children) {
          dot.setAttribute('r', r);
          dot.setAttribute('stroke-width', r * 0.4);
        }
      }
    }
  }

  moveVertex(vertexIndex, pos, transform, annotation) {
    if (!annotation.data._markerPoints ||
      vertexIndex >= annotation.data._markerPoints.length) return;

    annotation.data._markerPoints[vertexIndex] = pos;
    const pts = PolylineMarker._toPointsAttr(annotation.data._markerPoints);

    // Update polyline / polygon points attribute
    const shape = annotation.elements.find(
      el => el.classList?.contains('annotation-polyline'));
    if (shape) shape.setAttribute('points', pts);

    // Update hit-target points
    const hitEl = annotation.elements.find(
      el => el.classList?.contains('annotation-polyline-hit'));
    if (hitEl) hitEl.setAttribute('points', pts);

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
      closed: this.closed,
      vertexRadius: this.vertexRadius ?? 5,
      hitTolerance: this.hitTolerance ?? 8,
    };
  }

  canFinalize(annotation) {
    const pts = annotation.data._markerPoints?.length ?? 0;
    const minPts = annotation.data._markerClosed ? 3 : 2;
    return pts >= minPts;
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
 * manager.updateAnnotation(anno.id, { label: 'Crack A', semanticClass: 'defect' });
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
   * @param {Viewer} viewer - OpenLIME viewer instance
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
  * @param {string} [options.defaultFill='rgba(0, 0, 0, 0.30)']
   *   Default fill colour. Overridden per-class with `fill`.
  * @param {string} [options.defaultStroke='#000000']
   *   Default stroke colour. Overridden per-class with `stroke`.
   * @param {number} [options.defaultFillOpacity=1]
   *   Default fill opacity. Overridden per-class with `fillOpacity`.
   * @param {number} [options.defaultStrokeWidth=2]
   *   Default stroke width. Overridden per-class with `strokeWidth`.
   * @param {string} [options.selectionFill='rgba(255,225,100,0.20)']
   *   Fill colour for selected annotations. Per-class `fillSelected` overrides this.
   * @param {string} [options.selectionStroke='#aaaa00']
   *   Stroke colour for selected annotations. Per-class `strokeSelected` overrides this.
  * @param {Object<string, Object>} [options.semanticClasses]
  *   Semantic class definitions keyed by class ID (e.g. `{ crack: { stroke: '#f00' } }`).
  * @param {Object<string, Object>} [options.structuralClasses]
  *   Structural class definitions keyed by class ID (e.g. `default`, `selected`, `underEditing`).
   * @param {Function} [options.onCreate]   - Shorthand: `.addEvent('create', fn)`
   * @param {Function} [options.onUpdate]   - Shorthand: `.addEvent('update', fn)`
   * @param {Function} [options.onEditStart] - Shorthand: `.addEvent('editStart', fn)` — fires with the annotation when the user starts dragging a vertex or disc handle (pointerdown)
   * @param {Function} [options.onDelete]   - Shorthand: `.addEvent('delete', fn)`
   * @param {Function} [options.onSelect]   - Shorthand: `.addEvent('select', fn)` — fires with the last activated annotation
   * @param {Function} [options.onSelectionChange] - Shorthand: `.addEvent('selectionChange', fn)` — fires with the full `Annotation[]` array
   * @param {boolean} [options.showAnnotationLabels=true]
   *   Enables/disables annotation label rendering globally.
   * @param {Object} [options.labelStyle]
   *   Rendering style for annotation labels and their background box.
   * @param {number} [options.labelStyle.fontSizePx=14]
   * @param {string} [options.labelStyle.fontFamily='sans-serif']
   * @param {string|number} [options.labelStyle.fontWeight=600]
   * @param {string} [options.labelStyle.textFill='#ffffff']
   * @param {string} [options.labelStyle.textFillSelected]
   *   Label text colour when the annotation is selected; defaults to resolved shape stroke.
   * @param {string} [options.labelStyle.textStroke='none']
   * @param {number} [options.labelStyle.textStrokeWidthPx=0]
   * @param {string} [options.labelStyle.backgroundFill='rgba(0, 0, 0, 0.72)']
  * @param {string} [options.labelStyle.backgroundFillSelected]
  *   Label background colour when the annotation is selected; defaults to `backgroundFill`.
   * @param {string} [options.labelStyle.backgroundStroke='rgba(255, 255, 255, 0.22)']
   * @param {number} [options.labelStyle.backgroundStrokeWidthPx=1]
   * @param {number} [options.labelStyle.paddingPx=6]
   * @param {number} [options.labelStyle.borderRadiusPx=4]
  * @param {number} [options.labelStyle.offsetYPx=8]
   * @param {boolean} [options.singleEditMode=false]
   *   When `true`, vertex-drag listeners (and `activeAnnotation`) are suppressed
   *   when **more than one** annotation is selected — no single annotation can be
   *   vertex-dragged in a multi-selection.  Handle *visibility* is orthogonal and
   *   still controlled by `showVertexHandles`.  Defaults to `false`.
   */
  constructor(viewer, options = {}) {
    const defaultLabelStyle = {
      fontSizePx: 14,
      fontFamily: 'sans-serif',
      fontWeight: 600,
      textFill: '#ffffff',
      textStroke: 'none',
      textStrokeWidthPx: 0,
      backgroundFill: 'rgba(0, 0, 0, 0.30)',
      backgroundFillSelected: undefined,
      backgroundStroke: 'rgba(255, 255, 255, 0.22)',
      backgroundStrokeWidthPx: 1,
      paddingPx: 6,
      borderRadiusPx: 4,
      offsetYPx: 4,
    };

    Object.assign(this, {
      viewer,
      layer: null,
      layerId: 'manager_annotations',
      layerLabel: 'Annotations',
      activeMarker: 'disk',
      markerOptions: {},
      enableState: true,
      customState: null,
      /** Default fill colour for annotations (overridden per-class with `fill`). @type {string} */
      defaultFill: 'rgba(0, 0, 0, 0.30)',
      /** Default stroke colour for annotations (overridden per-class with `stroke`). @type {string} */
      defaultStroke: '#888888',
      /** Default fill opacity (overridden per-class with `fillOpacity`). @type {number} */
      defaultFillOpacity: 1,
      /** Default stroke width in model units (overridden per-class with `strokeWidth`). @type {number} */
      defaultStrokeWidth: 2,
      /** Fill colour for selected annotations (overridden per-class with `fillSelected`). @type {string} */
      selectionFill: 'rgba(255,225,100,0.20)',
      /** Stroke colour for selected annotations (overridden per-class with `strokeSelected`). @type {string} */
      selectionStroke: '#aaaa00',
      /**
       * When true, preload a small set of reusable structural SVG filters in defs.
       * @type {boolean}
       */
      preloadStructuralFilters: true,
      /**
       * Semantic class definitions keyed by class ID.
       * @type {Object<string, {label:string, fill?:string, stroke?:string,
       *              fillOpacity?:number, strokeWidth?:number,
       *              fillSelected?:string, strokeSelected?:string,
      *              fillUnderEditing?:string, strokeUnderEditing?:string,
      *              filter?:string, filterSelected?:string, filterUnderEditing?:string}>}
       */
      semanticClasses: {
        default: { label: 'Default' },
      },
      /**
       * Structural class definitions used as state overlays.
      * @type {Object<string, {fill?:string, stroke?:string, fillOpacity?:number, strokeWidth?:number, filter?:string}>}
       */
      structuralClasses: {
        default: { stroke: '#000000', fill: 'rgba(0, 0, 0, 0.30)' },
        selected: {},
        underEditing: {},
      },
      /**
       * When true, vertex-drag listeners and `activeAnnotation` are suppressed
       * whenever more than one annotation is selected.  Handle *visibility* is
       * unaffected: dots still follow `showVertexHandles` regardless.
       * @type {boolean}
       */
      singleEditMode: false,
      /**
       * When true (default), vertex-handle dots are shown on selected annotations
       * in edit mode, allowing the user to drag individual vertices.
       * Set to false to keep dots hidden after finalisation — they will still
       * appear during an active creation session but disappear as soon as the
       * annotation is committed (last double-click / Enter).
       * @type {boolean}
       */
      showVertexHandles: true,
      /** Global toggle for annotation labels. @type {boolean} */
      showAnnotationLabels: true,
      /** Label rendering style (text + dark semitransparent background). @type {Object} */
      labelStyle: defaultLabelStyle,
    }, options);

    this.labelStyle = { ...defaultLabelStyle, ...(this.labelStyle ?? {}) };

    // Normalize semantic and structural class registries.
    this.setSemanticClasses(this.semanticClasses, false);
    this.setStructuralClasses(this.structuralClasses, false);

    // Resolve the semantic class used for grouped annotations.
    // Priority: options.groupAnnotationClass > class labelled 'Group'/'group' > auto-created entry.
    if (this.groupAnnotationClass == null) {
      const existingGroupId = this.semanticClassOrder.find((id) => {
        const label = this.semanticClasses[id]?.label;
        return label === 'group' || label === 'Group';
      });
      if (existingGroupId) {
        this.groupAnnotationClass = existingGroupId;
      } else {
        this.semanticClasses.group = {
          label: 'Group',
          fill: '#fa5aff',
          stroke: '#fa5aff',
          fillOpacity: 0.7,
        };
        if (!this.semanticClassOrder.includes('group')) this.semanticClassOrder.push('group');
        this.groupAnnotationClass = 'group';
      }
    }

    /**
     * Current interaction mode.
     * @type {'idle'|'create'|'edit'}
     */
    this._mode = 'idle';
    /**
     * Active creation session, or null when idle.
     * @type {CreationSession|null}
     */
    this._session = null;
    /**
     * Active vertex-drag session in edit mode.
     * @type {{annotation, vertexIndex}|null}
     */
    this._vertexSession = null;
    /**
     * The annotation whose vertex handles are currently visible and whose
     * vertex-drag listeners are attached.  In a multi-selection this is the
     * **most recently activated** annotation (last in the selection order).
     * @type {Annotation|null}
     */
    this._selectedAnnotation = null;

    /**
     * Set to `true` while `setSelectedIds` is processing its batch so that
     * the per-item `layer 'selected'` events do not trigger redundant
     * `_updateHandlesVisibility` calls.
     * @type {boolean}
     * @private
     */
    this._batchSelectInProgress = false;

    /**
     * Set by `_wireClickHandler` when a click lands on an annotation element.
     * Read and reset in `_onSingleTap` to distinguish "click on annotation" from
     * "click on empty area" for automatic mode switching.
     * @type {boolean}
     * @private
     */
    this._lastClickWasOnAnnotation = false;

    /**
     * Whether the pencil has been explicitly enabled by the user.
     * When `false` the manager is completely transparent: all pointer events
     * pass through unchanged and OpenLIME behaves as if the manager did not exist.
     * Set to `true` only via `toggle()`.
     * @type {boolean}
     * @private
     */
    this._pencilEnabled = false;

    // Resolve or auto-create the annotation layer
    this._resolveLayer();
    this._ensureDefaultStructuralFilters();

    // Wire selection events from the layer → 'select' signal + vertex-handle visibility
    this.layer.addEvent('selected', (anno) => {
      if (this._mode === 'create') {
        if (this.layer.selected?.size) this.deselectAll();
        return;
      }
      // During a setSelectedIds batch we skip per-item updates; the batch
      // method calls _updateHandlesVisibility once at the end instead.
      if (this._batchSelectInProgress) return;
      this._updateHandlesVisibility(anno);
      if (anno) this.emit('select', anno);
      const all = [...this.layer.selected]
        .map(id => this.layer.getAnnotationById(id)).filter(Boolean);
      this.emit('selectionChange', all);
    });

    // ── Pointer handlers ────────────────────────────────────────────────
    // All three are registered permanently; each guards on _active and
    // the current interaction mode, so they are effectively no-ops when idle.

    // Double-tap finalises sequence markers; pen hold offers a tablet-friendly alternative.
    this._pointerHandler = {
      priority: 10000,
      fingerDoubleTap: (e) => this._onDoubleTap(e),
      fingerHold: (e) => this._onHold(e),
    };

    // Single-tap: create 'tap' markers in create mode, or add vertices for 'sequence'.
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
      if (!this._pencilEnabled) return;
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
    if (options.onEditStart) this.addEvent('editStart', options.onEditStart);
    if (options.onDelete) this.addEvent('delete', options.onDelete);
    if (options.onSelect) this.addEvent('select', options.onSelect);
    if (options.onSelectionChange) this.addEvent('selectionChange', options.onSelectionChange);
    if (options.onSessionStart) this.addEvent('sessionStart', options.onSessionStart);
    if (options.onSessionCancel) this.addEvent('sessionCancel', options.onSessionCancel);
  }

  // ─── Static Marker Registry ───────────────────────────────────────────────

  /**
   * Registers a new marker class under a type key.
   * Registration is global (shared across all manager instances).
   *
   * @param {string} type - Unique lowercase type identifier (e.g. `'star'`)
   * @param {Function} MarkerClass - Subclass of {@link Marker}
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
   * | `'create'` | Creates new annotations; existing annotations are non-clickable (pointer-events:none) |
   * | `'edit'` | Selects and (future) edits existing annotations; no new creation |
   *
   * Cancels any in-progress creation session when leaving `'create'`.
   * Fires the `'modeChange'` signal when the mode actually changes.
   *
   * @param {'idle'|'create'|'edit'} mode
   * @param {boolean} [fireEvent=true] Whether to fire the 'modeChange' event if the mode changes.
   * @returns {string} The new mode.
   */
  setMode(mode, fireEvent = true) {
    const valid = ['idle', 'create', 'edit'];
    if (!valid.includes(mode))
      throw new Error(`ManagerSvgAnnotation.setMode: invalid mode '${mode}'. Valid: ${valid.join(', ')}`);

    // Cancel in-progress creation session when leaving create mode
    if (this._mode === 'create' && mode !== 'create' && this._session)
      this._cancelSession();

    // Clear selection when leaving edit mode
    if (this._mode === 'edit' && mode !== 'edit')
      this.deselectAll();

    const prev = this._mode;
    this._mode = mode;

    // Double-tap zoom: disable whenever a mode other than idle is active
    if (this.viewer.panzoom)
      this.viewer.panzoom.enableDoubleTapZoom = (mode === 'idle');

    this._syncPointerEvents();
    if (mode !== prev && fireEvent) this.emit('modeChange', mode);
    return mode;
  }

  /**
   * Enables or disables the pencil (annotation system).
   *
   * - `toggle()`       — flips the enabled state.
  * - `toggle(true)`   — enables; enters `'edit'` mode (ready to select/inspect).
  *                      Drawing starts once the user explicitly arms `'create'`
  *                      mode (for example by selecting a marker).
   * - `toggle(false)`  — disables; returns to `'idle'` and deselects everything.
   *
   * When disabled the manager is completely transparent: every pointer event
   * passes through to OpenLIME's normal panzoom / light controllers.
   *
   * @param {boolean} [force]
   * @returns {boolean} `true` if the pencil is now enabled.
   */
  toggle(force) {
    const enable = force === undefined ? !this._pencilEnabled : !!force;
    this._pencilEnabled = enable;
    this.setMode(enable ? 'edit' : 'idle');
    return this._pencilEnabled;
  }

  /**
   * Current interaction mode: `'idle'`, `'create'`, or `'edit'`.
   * @type {string}
   */
  get mode() { return this._mode; }

  /**
   * `true` when the pencil has been explicitly enabled by the user.
   * Kept for backward compatibility with `UIBasic`.
   * @type {boolean}
   */
  get active() { return this._pencilEnabled; }

  /**
   * The **active** annotation: the most recently activated one inside the
   * current selection.  This is also the annotation that receives vertex-drag
   * handles in edit mode.
   *
   * `null` when nothing is selected.
   *
   * In a single-selection scenario this is always the selected annotation.
   * In a multi-selection it is the last annotation added to the selection
   * (either by click, Ctrl+click, or the last id in a `setSelectedIds` call).
   *
   * Read-only; updated automatically by the manager.
   *
   * When {@link ManagerSvgAnnotation#singleEditMode} is `true` and more than
   * one annotation is selected, returns `null`.
   * @type {Annotation|null}
   */
  get activeAnnotation() {
    if (this.singleEditMode && this.layer?.selected?.size !== 1) return null;
    return this._selectedAnnotation;
  }

  /**
   * Programmatically finalises the current sequence/drag creation.
   * Equivalent to pressing Enter. No-op if no creation is in progress.
   * @returns {Annotation|null} The created annotation, or null.
   */
  finishCreating() {
    if (!this._session) return null;
    this._finalizeSession(null);
    return null; // annotation already emitted via 'create' event
  }

  /**
   * Clears the entire selection: detaches vertex-drag listeners, hides all
   * vertex-handle overlays, removes the CSS `selected` class, and restores
   * the original fill/stroke colours from the annotation's class definition.
   * Does **not** fire the `'select'` event but fires `'selectionChange'` with
   * an empty array.
   */
  deselectAll() {
    this.layer.clearSelected();
    this._updateHandlesVisibility(null);
    this.emit('selectionChange', []);
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
  * @param {string}   [opts.semanticClass]
   * @param {number}   [opts.publish=1]
   * @param {Object}   [opts.data={}]       - Extra custom data merged into `annotation.data`.
   * @param {boolean}  [opts.select=false]  - Select the annotation after creation.
   * @returns {Annotation} The newly created annotation.
   * @fires ManagerSvgAnnotation#create
   */
  createAnnotation(pos, opts = {}) {
    const keepCreateMode = this._mode === 'create';
    const markerType = opts.markerType ?? this.activeMarker;
    const markerOptions = Object.assign({}, this.markerOptions, opts.markerOptions ?? {});
    const marker = this._instantiateMarker(markerType, markerOptions);

    // Create a bare annotation through the layer (ensures proper SVG element wrapping)
    const annotation = this.layer.newAnnotation();
    annotation.label = opts.label ?? '';
    annotation.description = opts.description ?? '';
    const semanticClass = this._resolveSemanticClassId(opts.semanticClass);
    annotation.semanticClass = semanticClass;
    annotation.structuralClass = this._resolveStructuralClassId(opts.structuralClass);
    annotation.type = 'point';
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

    // Let the marker build its SVG elements (using class-derived style)
    const transform = this.viewer.camera.getCurrentTransform(performance.now());
    const style = this._getClassStyle(annotation, false);
    const elements = marker.createElement(pos, transform, annotation, style);
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
    if (keepCreateMode) this.setMode('create');
    else this.setMode('edit');
    return annotation;
  }

  /**
   * Updates any subset of annotation properties and immediately repaints.
   *
   * `data` is **merged** (not replaced) into `annotation.data`.
   *
   * Per-annotation colour overrides (`fill`, `stroke`, `fillOpacity`,
   * `strokeWidth`) take precedence over the class palette.  Pass `null` to
   * remove an override and fall back to the class colour.
   *
   * @param {string} id - Annotation ID.
   * @param {Object} patch
   * @param {string}  [patch.label]
   * @param {string}  [patch.description]
  * @param {string|null}         [patch.semanticClass] - Semantic class id or label.
  * @param {string|null}         [patch.structuralClass] - Structural class id.
   * @param {number}  [patch.publish]
  * @param {string|null}  [patch.fill]        - Per-annotation fill override.
  * @param {string|null}  [patch.stroke]      - Per-annotation stroke override.
  * @param {number|null}  [patch.fillOpacity] - Per-annotation fill-opacity override.
  * @param {number|null}  [patch.strokeWidth] - Per-annotation stroke-width override.
  * @param {string|null}  [patch.filter]      - Per-annotation SVG filter override (`url(#...)`).
   * @param {Object}  [patch.data]        - Merged into annotation.data.
   * @returns {Annotation|null}
   * @fires ManagerSvgAnnotation#update
   */
  updateAnnotation(id, patch) {
    const anno = this.getAnnotationById(id);
    if (!anno) {
      console.warn(`ManagerSvgAnnotation.updateAnnotation: annotation '${id}' not found.`);
      return null;
    }

    const scalarKeys = ['label', 'description', 'semanticClass', 'structuralClass', 'publish',
              'fill', 'stroke', 'fillOpacity', 'strokeWidth', 'filter'];
    for (const key of scalarKeys) {
      if (!Object.hasOwn(patch, key)) continue;
      if (key === 'semanticClass') {
        const resolved = this._resolveSemanticClassId(patch[key]);
        anno.semanticClass = resolved;
        continue;
      }
      if (key === 'structuralClass') {
        anno.structuralClass = this._resolveStructuralClassId(patch[key]);
        continue;
      }
      anno[key] = patch[key];
    }

    if (patch.data && typeof patch.data === 'object') {
      Object.assign(anno.data, patch.data);
    }

    const styleChanged = scalarKeys.slice(2).some(k => Object.hasOwn(patch, k));
    if (styleChanged) {
      const isSelected = this.layer.selected?.has(anno.id) ?? false;
      this._applyStyleToElements(anno, isSelected);
    }

    anno.needsUpdate = true;
    this.viewer.redraw();
    this.emit('update', anno);
    return anno;
  }

  /**
   * Delete all selected annotations
   */
  deleteSelected() {
    this.layer.selected.forEach(id => {
      this.layer.deleteAnnotation(id);
    });
  }

  /**
  * Delete array of annotations
  * @param {ids} array of annotaion ids 
  */
  deleteAnnotations(ids) {
    ids.forEach(id => {
      this.layer.deleteAnnotation(id);
    })
  }

  /**
   * Adds or removes a **single** annotation from the current selection.
   *
   * This operation is **additive**: it does not clear the rest of the
   * selection.  Call it multiple times to build up a multi-selection
   * one item at a time, or use {@link setSelectedIds} to replace the
   * entire selection atomically.
  *
  * Does not implicitly enable pencil mode: callers that need interactive
  * editing should explicitly call {@link toggle} / {@link setMode}.
   *
   * @param {string}  id          - Annotation ID.
   * @param {boolean} [on=true]   - `true` to select, `false` to deselect.
   */
  setSelected(id, on = true) {
    if (this._mode === 'create') return;
    const anno = this.layer.getAnnotationById(id);
    if (!anno) return;
    this.layer.setSelected(anno, on);
  }

  /**
   * Atomically replaces the current selection with the provided annotation IDs.
   *
   * More efficient than calling `setSelected` repeatedly: the SVG style update
   * and vertex-handle rewiring happen **once** at the end, not once per item.
   *
   * - Fires one `'select'` event with the **last** annotation in `ids`
   *   (or nothing if `ids` is empty), preserving backward compatibility.
   * - Fires one `'selectionChange'` event with the full array of selected
   *   {@link Annotation} objects (in the same order as `ids`).
   * - Vertex-drag handles are attached to the last annotation in `ids`.
  *
  * Does not implicitly enable pencil mode: callers that need interactive
  * editing should explicitly call {@link toggle} / {@link setMode}.
   *
   * @param {string[]} ids - Annotation IDs to select. Duplicates are ignored.
   *                         Pass an empty array to deselect everything.
   */
  setSelectedIds(ids) {
    if (this._mode === 'create') return;
    const unique = [...new Set(ids)];

    // Suppress per-item _updateHandlesVisibility calls during the batch.
    this._batchSelectInProgress = true;
    this.layer.clearSelected();
    for (const id of unique) {
      const anno = this.layer.getAnnotationById(id);
      if (anno) this.layer.setSelected(anno, true);
    }
    this._batchSelectInProgress = false;

    // Single visual + vertex-handle update for the whole new selection.
    const lastAnno = unique.length > 0
      ? this.layer.getAnnotationById(unique[unique.length - 1])
      : null;
    this._updateHandlesVisibility(lastAnno);

    // Emit events once.
    if (lastAnno) this.emit('select', lastAnno);
    const selected = [...this.layer.selected]
      .map(id => this.layer.getAnnotationById(id)).filter(Boolean);
    this.emit('selectionChange', selected);
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
    let imported = 0;
    for (const entry of jsonLdArray) {
      try {
        const anno = Annotation.fromJsonLd(entry);
        anno.needsUpdate = true;
        this.layer.annotations.push(anno);
        imported++;
      } catch (err) {
        console.warn('ManagerSvgAnnotation.importAnnotations: skipping entry', entry, err);
      }
    }
    if (imported > 0) {
      this._repaintClassStyles();
    } else {
      this.viewer.redraw();
    }

    this._schedulePostLayoutRedraw();
  }

  /**
   * Schedules an extra redraw pass after SVG text/layout settles in DOM.
   * This keeps annotation label background sizing stable right after imports.
   * @private
   */
  _schedulePostLayoutRedraw() {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      return;
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        this.viewer.redraw();
      });
    });
  }

  // ─── Class management ────────────────────────────────────────────────────

  /**
   * Resolves a semantic class reference to a class ID in `semanticClasses`.
   * Supports IDs, labels and empty values.
   * @param {string|null|undefined} classRef
   * @returns {string|null}
   * @private
   */
  _resolveSemanticClassId(classRef) {
    if (classRef == null || classRef === '') return null;

    const id = String(classRef);
    if (this.semanticClasses[id]) return id;

    const byLabel = this.semanticClassOrder.find((candidateId) =>
      this.semanticClasses[candidateId]?.label === id
    );
    if (byLabel) return byLabel;

    return null;
  }

  /**
   * Resolves a structural class reference to a class ID in `structuralClasses`.
   * @param {string|null|undefined} classRef
   * @returns {string|null}
   * @private
   */
  _resolveStructuralClassId(classRef) {
    if (classRef == null || classRef === '') return null;
    const id = String(classRef);
    return this.structuralClasses?.[id] ? id : null;
  }

  /**
   * Ensures a `<defs>` element exists in the annotation SVG layer.
   * @returns {SVGDefsElement|null}
   * @private
   */
  _getOrCreateSvgDefs() {
    const svg = this.layer?.svgElement;
    if (!svg) return null;
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.prepend(defs);
    }
    return defs;
  }

  /**
   * Preloads lightweight SVG filters for structural classes.
   *
   * Available filter ids:
   * - `olime-glow-soft`
   * - `olime-shadow-soft`
   * - `olime-outline-soft`
   *
   * @private
   */
  _ensureDefaultStructuralFilters() {
    if (!this.preloadStructuralFilters) return;
    const defs = this._getOrCreateSvgDefs();
    if (!defs) return;

    const ensureFilter = (id, build) => {
      if (defs.querySelector(`#${id}`)) return;
      const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      filter.setAttribute('id', id);
      filter.setAttribute('x', '-45%');
      filter.setAttribute('y', '-45%');
      filter.setAttribute('width', '190%');
      filter.setAttribute('height', '190%');
      build(filter);
      defs.appendChild(filter);
    };

    ensureFilter('olime-glow-soft', (filter) => {
      // Build an outer-edge ring from SourceAlpha so glow affects only contours
      // and keeps interior fill untouched.
      const dilate = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
      dilate.setAttribute('in', 'SourceAlpha');
      dilate.setAttribute('operator', 'dilate');
      dilate.setAttribute('radius', '1.2');
      dilate.setAttribute('result', 'expandedAlpha');

      const outerRing = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
      outerRing.setAttribute('in', 'expandedAlpha');
      outerRing.setAttribute('in2', 'SourceAlpha');
      outerRing.setAttribute('operator', 'out');
      outerRing.setAttribute('result', 'outerRing');

      const blur = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
      blur.setAttribute('in', 'outerRing');
      blur.setAttribute('stdDeviation', '2.4');
      blur.setAttribute('result', 'blurredRing');

      const flood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
      flood.setAttribute('flood-color', '#ffd54a');
      flood.setAttribute('flood-opacity', '0.95');
      flood.setAttribute('result', 'glowColor');

      const comp = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
      comp.setAttribute('in', 'glowColor');
      comp.setAttribute('in2', 'blurredRing');
      comp.setAttribute('operator', 'in');
      comp.setAttribute('result', 'glow');

      const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
      const m1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      m1.setAttribute('in', 'glow');
      const m2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      m2.setAttribute('in', 'SourceGraphic');
      merge.appendChild(m1);
      merge.appendChild(m2);

      filter.appendChild(dilate);
      filter.appendChild(outerRing);
      filter.appendChild(blur);
      filter.appendChild(flood);
      filter.appendChild(comp);
      filter.appendChild(merge);
    });

    ensureFilter('olime-shadow-soft', (filter) => {
      const dropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
      dropShadow.setAttribute('dx', '0.8');
      dropShadow.setAttribute('dy', '0.8');
      dropShadow.setAttribute('stdDeviation', '1.1');
      dropShadow.setAttribute('flood-color', '#000000');
      dropShadow.setAttribute('flood-opacity', '0.55');
      filter.appendChild(dropShadow);
    });

    ensureFilter('olime-outline-soft', (filter) => {
      const morph = document.createElementNS('http://www.w3.org/2000/svg', 'feMorphology');
      morph.setAttribute('in', 'SourceAlpha');
      morph.setAttribute('operator', 'dilate');
      morph.setAttribute('radius', '1.0');
      morph.setAttribute('result', 'expanded');

      const flood = document.createElementNS('http://www.w3.org/2000/svg', 'feFlood');
      flood.setAttribute('flood-color', '#ffd54a');
      flood.setAttribute('flood-opacity', '0.75');
      flood.setAttribute('result', 'outlineColor');

      const comp = document.createElementNS('http://www.w3.org/2000/svg', 'feComposite');
      comp.setAttribute('in', 'outlineColor');
      comp.setAttribute('in2', 'expanded');
      comp.setAttribute('operator', 'in');
      comp.setAttribute('result', 'outline');

      const merge = document.createElementNS('http://www.w3.org/2000/svg', 'feMerge');
      const m1 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      m1.setAttribute('in', 'outline');
      const m2 = document.createElementNS('http://www.w3.org/2000/svg', 'feMergeNode');
      m2.setAttribute('in', 'SourceGraphic');
      merge.appendChild(m1);
      merge.appendChild(m2);

      filter.appendChild(morph);
      filter.appendChild(flood);
      filter.appendChild(comp);
      filter.appendChild(merge);
    });
  }

  /**
   * Replaces semantic classes map.
   *
   * @param {Object<string, Object>} semanticClasses
   * @param {boolean} [repaint=true]
   */
  setSemanticClasses(semanticClasses, repaint = true) {
    const byId = {};
    const order = [];

    if (semanticClasses && typeof semanticClasses === 'object') {
      for (const [id, entry] of Object.entries(semanticClasses)) {
        if (!entry || typeof entry !== 'object') continue;
        byId[id] = { label: entry.label ?? id, ...entry };
        order.push(id);
      }
    }

    if (!order.length) {
      byId.default = { label: 'Default' };
      order.push('default');
    }

    this.semanticClasses = byId;
    this.semanticClassOrder = order;

    if (repaint) this._repaintClassStyles();
  }

  /**
   * Replaces structural classes map.
   *
   * @param {Object<string, Object>} structuralClasses
   * @param {boolean} [repaint=true]
   */
  setStructuralClasses(structuralClasses = {}, repaint = true) {
    const safe = (structuralClasses && typeof structuralClasses === 'object') ? structuralClasses : {};
    this.structuralClasses = {
      default: { stroke: '#000000', fill: 'rgba(0, 0, 0, 0.30)', ...(safe.default ?? {}) },
      selected: { ...(safe.selected ?? {}) },
      underEditing: { ...(safe.underEditing ?? {}) },
      ...safe,
    };
    if (repaint) this._repaintClassStyles();
  }

  /**
   * Adds or replaces a single structural class entry.
   *
   * @param {string} classId
   * @param {Object} style
   * @param {boolean} [repaint=true]
   */
  setStructuralClass(classId, style = {}, repaint = true) {
    if (!classId) return;
    this.structuralClasses[classId] = { ...(style ?? {}) };
    if (repaint) this._repaintClassStyles();
  }

  /**
   * Assigns/clears semantic class for an annotation.
    * Passing `null` or empty string clears the semantic class.
   *
   * @param {string} id
   * @param {string|number|null} classId
   * @returns {Annotation|null}
   */
  setAnnotationSemanticClass(id, classId) {
    const resolved = this._resolveSemanticClassId(classId);
    return this.updateAnnotation(id, { semanticClass: resolved });
  }

  /**
   * Assigns/clears structural class for an annotation.
   * Passing `null` or empty string clears the structural class and falls back
    * to semantic class rendering (or manager base defaults when semantic is absent).
   *
   * @param {string} id
   * @param {string|null} classId
   * @returns {Annotation|null}
   */
  setAnnotationStructuralClass(id, classId) {
    const resolved = this._resolveStructuralClassId(classId);
    return this.updateAnnotation(id, { structuralClass: resolved });
  }

  /**
   * Enables/disables annotation label rendering globally.
   *
   * @param {boolean} visible
   * @param {boolean} [repaint=true]
   */
  setLabelsVisible(visible, repaint = true) {
    this.showAnnotationLabels = !!visible;
    if (repaint) this._repaintClassStyles();
  }

  /**
   * Toggles annotation label visibility, or forces a specific visibility.
   *
   * @param {boolean} [force]
   * @param {boolean} [repaint=true]
   * @returns {boolean} The new label visibility state.
   */
  toggleLabelsVisible(force, repaint = true) {
    if (typeof force === 'boolean') this.showAnnotationLabels = force;
    else this.showAnnotationLabels = !this.showAnnotationLabels;
    if (repaint) this._repaintClassStyles();
    return this.showAnnotationLabels;
  }

  /**
   * Returns current global label visibility.
   * @returns {boolean}
   */
  areLabelsVisible() {
    return !!this.showAnnotationLabels;
  }

  /**
   * Updates label rendering style.
   * Pass only the keys you want to override.
   *
   * @param {Object} style
   * @param {boolean} [repaint=true]
   */
  setLabelStyle(style = {}, repaint = true) {
    if (!style || typeof style !== 'object') return;
    this.labelStyle = { ...this.labelStyle, ...style };
    if (repaint) this._repaintClassStyles();
  }

  /**
   * Repaints all annotations based on current class/style registries.
   * @private
   */
  _repaintClassStyles() {
    for (const anno of this.getAnnotations()) {
      const isSelected = this.layer.selected?.has(anno.id) ?? false;
      this._applyStyleToElements(anno, isSelected);
      anno.needsUpdate = true;
    }
    if (this.getAnnotations().length) this.viewer.redraw();
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
    this._pencilEnabled = true;
    this.setMode('create');
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
    // pointer-events: none in three cases:
    //  1. pencil disabled → annotations must be fully transparent to the user;
    //     all clicks/drags must reach the canvas (panzoom, light, …)
    //  2. create mode → PointerManager must see every click/drag for drawing
    // In edit mode with pencil enabled, annotations are clickable for selection.
    svgGroup.style.pointerEvents =
      (!this._pencilEnabled || this._mode === 'create') ? 'none' : '';
  }

  // ─── Internal: style resolution ─────────────────────────────────────────────

  /**
  * Resolves the visual style for `anno` from semantic and structural classes.
   *
   * Fallback order:
  * - semantic class from `anno.semanticClass`
    * - manager-level default fill/stroke options
   *
   * Structural class behavior:
   * - if `anno.structuralClass` is set and exists, it is applied as overlay
   * - else if selected, `structuralClasses.selected` is applied
   * - else if `anno.editing`, `structuralClasses.underEditing` is applied
   *
   * @param {Annotation} anno
   * @param {boolean} [selected=false]
  * @returns {{fill:string, stroke:string, fillOpacity:number, strokeWidth:number, filter:(string|null)}}
   * @private
   */
  _getClassStyle(anno, selected = false) {
    const semanticId = this._resolveSemanticClassId(anno.semanticClass);
    const cls = semanticId ? (this.semanticClasses?.[semanticId] ?? {}) : {};

    let fill        = cls.fill        ?? this.defaultFill        ?? 'rgba(0, 0, 0, 0.30)';
    let stroke      = cls.stroke      ?? this.defaultStroke      ?? '#000000';
    let fillOpacity = cls.fillOpacity ?? this.defaultFillOpacity ?? 1;
    let strokeWidth = cls.strokeWidth ?? this.defaultStrokeWidth ?? 2;
    let filter      = cls.filter      ?? null;

    const structuralClassId = this._resolveStructuralClassId(anno.structuralClass);
    const hasExplicitStructural = structuralClassId != null;
    const selectedStructural = this.structuralClasses?.selected ?? {};
    const editingStructural = this.structuralClasses?.underEditing ?? {};
    const explicitStructural = hasExplicitStructural ? (this.structuralClasses?.[structuralClassId] ?? {}) : {};

    const shouldApplySelected = !!selected && !hasExplicitStructural;
    const shouldApplyEditing = !!anno.editing && !hasExplicitStructural;

    if (shouldApplySelected) {
      fill = cls.fillSelected ?? selectedStructural.fill ?? this.selectionFill ?? fill;
      stroke = cls.strokeSelected ?? selectedStructural.stroke ?? this.selectionStroke ?? stroke;
      fillOpacity = selectedStructural.fillOpacity ?? fillOpacity;
      strokeWidth = selectedStructural.strokeWidth ?? strokeWidth;
      filter = cls.filterSelected ?? selectedStructural.filter ?? filter;
    }

    if (shouldApplyEditing) {
      fill = cls.fillUnderEditing ?? editingStructural.fill ?? fill;
      stroke = cls.strokeUnderEditing ?? editingStructural.stroke ?? stroke;
      fillOpacity = editingStructural.fillOpacity ?? fillOpacity;
      strokeWidth = editingStructural.strokeWidth ?? strokeWidth;
      filter = cls.filterUnderEditing ?? editingStructural.filter ?? filter;
    }

    if (hasExplicitStructural) {
      fill = explicitStructural.fill ?? fill;
      stroke = explicitStructural.stroke ?? stroke;
      fillOpacity = explicitStructural.fillOpacity ?? fillOpacity;
      strokeWidth = explicitStructural.strokeWidth ?? strokeWidth;
      filter = explicitStructural.filter ?? filter;
    }

    // Per-annotation overrides (set via updateAnnotation) take precedence.
    fill = anno.fill ?? fill;
    stroke = anno.stroke ?? stroke;
    fillOpacity = anno.fillOpacity ?? fillOpacity;
    strokeWidth = anno.strokeWidth ?? strokeWidth;
    filter = anno.filter ?? filter;

    // Imported SVG lacks marker inline drop-shadow; match creation-time marker shadow.
    if (!filter) {
      filter = _SHADOW_FILTER;
    }

    return { fill, stroke, fillOpacity, strokeWidth, filter };
  }

  /**
   * Applies the class-derived fill/stroke style directly to the SVG elements of
   * `anno`.  Called automatically on every selection/deselection change.
   *
   * Override `classes[n].fillSelected` / `classes[n].strokeSelected` to customise
   * the highlight colour without touching `onSelect` callbacks.
   *
   * @param {Annotation} anno
   * @param {boolean} [selected=false]
   * @private
   */
  _applyStyleToElements(anno, selected = false) {
    this._ensureDefaultStructuralFilters();
    const style = this._getClassStyle(anno, selected);
    const applyFilter = (el) => {
      // Markers already set inline CSS filter (e.g. drop-shadow). SVG
      // presentation attribute `filter` would lose against inline CSS due to
      // CSS precedence, so we compose everything in `style.filter`.
      if (el.dataset && el.dataset.olBaseFilter === undefined) {
        el.dataset.olBaseFilter = (el.style?.filter ?? '').trim();
      }
      const baseFilter = (el.dataset?.olBaseFilter ?? '').trim();

      if (style.filter) {
        el.style.filter = style.filter;
      } else if (baseFilter) {
        el.style.filter = baseFilter;
      } else {
        el.style.removeProperty('filter');
      }

      // Keep the presentation attribute clear to avoid conflicting sources.
      el.removeAttribute('filter');
    };
    const applyToEl = (el) => {
      if (el.classList?.contains('annotation-disk')) {
        applyFilter(el);
        el.setAttribute('fill', style.fill);
        el.setAttribute('stroke', style.stroke);
        el.setAttribute('opacity', String(style.fillOpacity));
        el.style.cursor = selected ? 'grab' : '';
      } else if (el.classList?.contains('annotation-polyline')) {
        applyFilter(el);
        el.setAttribute('stroke', style.stroke);
        if (anno.data._markerClosed) {
          el.setAttribute('fill', style.fill);
        }
      } else if (el.classList?.contains('annotation-rect')) {
        applyFilter(el);
        el.setAttribute('stroke', style.stroke);
        el.setAttribute('fill', style.fill);
        el.setAttribute('fill-opacity', String(style.fillOpacity));
      } else if (el.classList?.contains('annotation-freehand')) {
        applyFilter(el);
        el.setAttribute('stroke', style.stroke);
      } else if (el.tagName?.toLowerCase() === 'g' && el.getAttribute('id')) {
        // Grouped annotation: recurse into <g id="originalId"> wrappers
        // to reach the actual annotation elements inside.
        for (const child of el.children ?? []) applyToEl(child);
      }
    };
    for (const el of anno.elements ?? []) {
      applyToEl(el);
    }

    if (this.showAnnotationLabels && anno.label?.trim()) {
      delete anno._labelLayoutCacheKey;
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
    this._wireClickHandler();
  }

  /**
   * Installs `layer.onClick` to handle Ctrl/Meta+click multi-selection.
   *
   * When the user clicks an annotation while holding Ctrl (Windows/Linux) or
   * ⌘ (Mac), the annotation is **toggled** in/out of the current selection
   * without clearing other selected annotations.
   *
   * A plain click (no modifier) returns `false` so the default pathway in
   * `LayerSvgAnnotation` runs: clear current selection → select the clicked one.
   *
   * Only active in `'edit'` mode; in any other mode the SVG group has
   * `pointer-events: none` so no click ever reaches an annotation element.
   *
   * @private
   */
  _wireClickHandler() {
    this.layer.onClick = (anno, e) => {
      // Mouse selections are only allowed when the pencil is enabled by the user.
      // Return true to swallow the event (prevent LayerSvgAnnotation's default select).
      if (!this._pencilEnabled || this._mode !== 'edit') return true;
      // Record that the click landed on an annotation so _onSingleTap can
      // distinguish this from a click on the empty canvas background.
      this._lastClickWasOnAnnotation = true;
      if (e?.ctrlKey || e?.metaKey) {
        const nowSelected = !this.layer.selected.has(anno.id);
        this.layer.setSelected(anno, nowSelected);
        return true; // prevent default clear-all + select-one
      }
      return false; // let LayerSvgAnnotation's default single-select run
    };
  }

  // ─── Internal: per-frame annotation update ────────────────────────────────

  /**
   * Stable key for label layout cache invalidation when geometry moves.
   * @param {Annotation} anno
   * @returns {string}
   * @private
   */
  _annotationGeometryLayoutKey(anno) {
    const d = anno.data;
    if (!d) {
      return '';
    }
    if (Array.isArray(d._markerPoints) && d._markerPoints.length > 0) {
      return d._markerPoints.map((p) => `${p.x},${p.y}`).join('|');
    }
    if (d._x != null && d._y != null) {
      return `${d._x},${d._y}`;
    }
    return '';
  }

  /**
   * Called by `layer.annotationUpdate` on every prefetch cycle.
   * Retrieves the correct marker for this annotation and asks it to update its elements.
   * @param {Annotation} anno
   * @param {Object} transform
   * @private
   */
  _onAnnotationUpdate(anno, transform) {
    const markerType = anno.data?._markerType ?? this.activeMarker;
    let style = {};
    try {
      const marker = this._instantiateMarker(markerType, this.markerOptions);
      const selected = this.layer.selected?.has(anno.id) ?? false;
      style = this._getClassStyle(anno, selected);
      marker.updateElements(anno.elements, transform, anno, style);
    } catch {
      // Unknown marker type — silently ignore for robustness
      const selected = this.layer.selected?.has(anno.id) ?? false;
      style = this._getClassStyle(anno, selected);
    }

    const selected = this.layer.selected?.has(anno.id) ?? false;
    this._updateLabelElement(anno, transform, selected);
  }

  /**
   * Synchronises a text element for the annotation label.
   * Maintains screen-space font size and places it on top of the annotation's bounding box.
   * @param {Annotation} anno 
   * @param {Object} transform
   * @param {boolean} [selected=false]
   * @private
   */
  _updateLabelElement(anno, transform, selected = false) {
    const hasLabel = this.showAnnotationLabels && anno.label && anno.label.trim() !== '';
    let labelEl = anno.elements.find(el => el.classList?.contains('annotation-label'));
    let bgEl = anno.elements.find(el => el.classList?.contains('annotation-label-bg'));

    if (hasLabel) {
      if (anno.needsUpdate) {
        delete anno._labelLayoutCacheKey;
      }

      const zoom = transform?.z ?? 1;
      const layoutKey = `${zoom}|${anno.label}|${this._annotationGeometryLayoutKey(anno)}|${selected ? 's' : 'n'}`;
      if (anno._labelLayoutCacheKey === layoutKey) {
        return;
      }
      const cfg = this.labelStyle ?? {};
      if (!bgEl) {
        bgEl = Util.createSVGElement('rect', {
          class: 'annotation-label-bg',
          'pointer-events': 'none',
        });
        if (labelEl) {
          const idx = anno.elements.indexOf(labelEl);
          anno.elements.splice(idx, 0, bgEl);
        } else {
          anno.elements.push(bgEl);
        }
        anno.needsUpdate = true;
      }

      if (!labelEl) {
        labelEl = Util.createSVGElement('text', {
          class: 'annotation-label',
          'text-anchor': 'middle',
          'pointer-events': 'none',
          style: 'user-select: none;',
        });
        anno.elements.push(labelEl);
        anno.needsUpdate = true;
      }

      if (labelEl.textContent !== anno.label) {
        labelEl.textContent = anno.label;
      }

      // Maintain screen-space sizes
      const fontSize = (cfg.fontSizePx ?? 14) / zoom;
      const padding = (cfg.paddingPx ?? 6) / zoom;
      const cornerRadius = (cfg.borderRadiusPx ?? 4) / zoom;
      const bgStrokeWidth = (cfg.backgroundStrokeWidthPx ?? 1) / zoom;
      const textStrokeWidth = (cfg.textStrokeWidthPx ?? 0) / zoom;

      let textFill = cfg.textFill ?? '#ffffff';
      if (selected) {
        textFill = cfg.textFillSelected ?? this._getClassStyle(anno, true).stroke ?? textFill;
      }
      labelEl.setAttribute('fill', textFill);
      labelEl.setAttribute('font-family', String(cfg.fontFamily ?? 'sans-serif'));
      labelEl.setAttribute('font-weight', String(cfg.fontWeight ?? 600));
      labelEl.setAttribute('stroke', cfg.textStroke ?? 'none');
      if (textStrokeWidth > 0) {
        labelEl.setAttribute('stroke-width', String(textStrokeWidth));
      } else {
        labelEl.removeAttribute('stroke-width');
      }

      let backgroundFill = cfg.backgroundFill ?? 'rgba(0, 0, 0, 0.72)';
      if (selected) {
        backgroundFill = cfg.backgroundFillSelected ?? backgroundFill;
      }
      bgEl.setAttribute('fill', backgroundFill);
      bgEl.setAttribute('stroke', cfg.backgroundStroke ?? 'rgba(255, 255, 255, 0.22)');
      if (bgStrokeWidth > 0) {
        bgEl.setAttribute('stroke-width', String(bgStrokeWidth));
      } else {
        bgEl.removeAttribute('stroke-width');
      }

      labelEl.setAttribute('font-size', String(fontSize));
      bgEl.setAttribute('rx', String(cornerRadius));
      bgEl.setAttribute('ry', String(cornerRadius));

      // Attempt to calculate position
      let labelPositioned = false;
      try {
        const nonLabelElements = anno.elements.filter(el => el !== labelEl && el !== bgEl);
        const totalOffsetY = Number(cfg.offsetYPx ?? 8) / zoom;
        let x = 0;
        let anchorTopY = null;

        if (nonLabelElements.length > 0) {
          let minX = Infinity, minY = Infinity, maxX = -Infinity;
          for (const el of nonLabelElements) {
            // Must be in DOM and visible for getBBox to work without throwing
            if (typeof el.getBBox === 'function') {
              try {
                const bbox = el.getBBox();
                // Filter out empty bounding boxes
                if (bbox.width > 0 || bbox.height > 0) {
                  minX = Math.min(minX, bbox.x);
                  minY = Math.min(minY, bbox.y);
                  maxX = Math.max(maxX, bbox.x + bbox.width);
                }
              } catch (e) {
                // Ignore if not in DOM yet
              }
            }
          }
          if (minX !== Infinity) {
            x = (minX + maxX) / 2;
            anchorTopY = minY;
            labelPositioned = true;
          } else if (anno.data?._x !== undefined) {
            x = anno.data._x;
            anchorTopY = anno.data._y;
            labelPositioned = true;
          }
        } else if (anno.data?._x !== undefined) {
          x = anno.data._x;
          anchorTopY = anno.data._y;
          labelPositioned = true;
        }

        // Measure text metrics in local coordinates (baseline at y=0), then
        // place the background so its bottom is exactly `offsetYPx` above shape.
        labelEl.setAttribute('x', '0');
        labelEl.setAttribute('y', '0');

        let textWidth = anno.label.length * (fontSize * 0.6); // Fallback estimate
        let textHeight = fontSize;
        let bboxY = -fontSize * 0.8; // Fallback ascent approximation
        let bboxMeasured = false;

        if (typeof labelEl.getBBox === 'function') {
          try {
            const textBbox = labelEl.getBBox();
            if (textBbox.width > 0 || textBbox.height > 0) {
              textWidth = textBbox.width;
              textHeight = textBbox.height;
              bboxY = textBbox.y;
              bboxMeasured = true;
            }
          } catch (e) { }
        }

        const bgWidth = textWidth + padding * 2;
        const bgHeight = textHeight + padding * 2;
        const targetBottomY = (anchorTopY ?? 0) - totalOffsetY;
        const bgX = x - bgWidth / 2;
        const bgY = targetBottomY - bgHeight;
        const labelY = (bgY + padding) - bboxY;

        labelEl.setAttribute('x', String(x));
        labelEl.setAttribute('y', String(labelY));

        bgEl.setAttribute('x', String(bgX));
        bgEl.setAttribute('y', String(bgY));
        bgEl.setAttribute('width', String(bgWidth));
        bgEl.setAttribute('height', String(bgHeight));

        if (labelPositioned && bboxMeasured) {
          anno._labelLayoutCacheKey = layoutKey;
        }

      } catch (e) {
        // Safe fallback
      }
    } else {
      delete anno._labelLayoutCacheKey;
      if (bgEl) {
        const idx = anno.elements.indexOf(bgEl);
        if (idx !== -1) {
          anno.elements.splice(idx, 1);
          bgEl.remove();
          anno.needsUpdate = true;
        }
      }
      if (labelEl) {
        const idx = anno.elements.indexOf(labelEl);
        if (idx !== -1) {
          anno.elements.splice(idx, 1);
          labelEl.remove();
          anno.needsUpdate = true;
        }
      }
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

  /**
   * Converts an image-space point (x right, y down) to canvas HTML coordinates.
   * @param {{x:number,y:number}} p
   * @returns {{x:number,y:number}|null}
   * @private
   */
  _imageToCanvasHtml(p) {
    if (!this.layer?.layout || !this.layer?.transform || !this.viewer?.camera) return null;
    const bb = this.layer.layout.boundingBox();
    const size = { w: bb.width(), h: bb.height() };
    if (!(size.w > 0 && size.h > 0)) return null;

    const layerPoint = {
      x: Number(p.x) - size.w / 2,
      y: size.h / 2 - Number(p.y),
    };
    if (!Number.isFinite(layerPoint.x) || !Number.isFinite(layerPoint.y)) return null;

    const scenePoint = this.layer.transform.apply(layerPoint.x, layerPoint.y);
    return CoordinateSystem.fromSceneToCanvasHtml(scenePoint, this.viewer.camera, false);
  }

  /**
   * Reads the current rendered framebuffer and builds a compact contour map.
   * The map is cached briefly to keep drag interactions responsive.
   * @returns {{map:Uint8Array,width:number,height:number,canvasW:number,canvasH:number,downsample:number}|null}
   * @private
   */
  _getRenderedContourMap() {
    const canvasApi = this.viewer?.canvas;
    const frame = canvasApi?.readPixelsRGBA?.();
    if (!frame) return null;

    const { data: rgba, width: fbW, height: fbH } = frame;
    if (fbW <= 2 || fbH <= 2) return null;

    const now = performance.now();
    const cache = this._contourMapCache;
    if (cache && cache.fbW === fbW && cache.fbH === fbH && (now - cache.ts) < 120) {
      return cache.value;
    }

    const downsample = Math.max(1, Math.round(Math.min(fbW, fbH) / 512));
    const mapW = Math.max(3, Math.floor(fbW / downsample));
    const mapH = Math.max(3, Math.floor(fbH / downsample));

    const luma = new Float32Array(mapW * mapH);
    for (let y = 0; y < mapH; y++) {
      const srcYTop = Math.min(fbH - 1, y * downsample);
      const srcY = fbH - 1 - srcYTop;
      for (let x = 0; x < mapW; x++) {
        const srcX = Math.min(fbW - 1, x * downsample);
        const idx = (srcY * fbW + srcX) * 4;
        const r = rgba[idx + 0];
        const g = rgba[idx + 1];
        const b = rgba[idx + 2];
        luma[y * mapW + x] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }

    const map = new Uint8Array(mapW * mapH);
    for (let y = 1; y < mapH - 1; y++) {
      for (let x = 1; x < mapW - 1; x++) {
        const i = y * mapW + x;
        const gx = luma[i + 1] - luma[i - 1];
        const gy = luma[i + mapW] - luma[i - mapW];
        const mag = Math.min(255, Math.hypot(gx, gy));
        map[i] = mag;
      }
    }

    const value = {
      map,
      width: mapW,
      height: mapH,
      canvasW: fbW,
      canvasH: fbH,
      downsample,
    };
    this._contourMapCache = { ts: now, fbW, fbH, value };
    return value;
  }

  /**
   * Snaps an image-space point to the nearest strong contour from the rendered frame.
   * @param {{x:number,y:number}} imagePoint
   * @param {{radiusPx:number,strength:number,minGradient:number}} [options]
   * @returns {{x:number,y:number}}
   */
  snapImagePointToRenderedContour(imagePoint, options = {}) {
    const base = {
      x: Number(imagePoint?.x),
      y: Number(imagePoint?.y),
    };
    if (!Number.isFinite(base.x) || !Number.isFinite(base.y)) return imagePoint;

    const contour = this._getRenderedContourMap();
    if (!contour) return base;

    const canvasPoint = this._imageToCanvasHtml(base);
    if (!canvasPoint) return base;

    const rect = this.viewer.canvasElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return base;

    const scaleX = contour.canvasW / rect.width;
    const scaleY = contour.canvasH / rect.height;
    const fbX = canvasPoint.x * scaleX;
    const fbY = canvasPoint.y * scaleY;

    const cx = Math.round(fbX / contour.downsample);
    const cy = Math.round(fbY / contour.downsample);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return base;

    const radPx = Math.max(2, Number(options.radiusPx ?? 14));
    const radMap = Math.max(1, Math.round((radPx * ((scaleX + scaleY) * 0.5)) / contour.downsample));
    const minGradient = Math.max(0, Number(options.minGradient ?? 22));
    const strength = Math.max(0, Math.min(1, Number(options.strength ?? 0.7)));
    const directionWeight = Math.max(0, Number(options.directionWeight ?? 18));

    let previousCanvasPoint = null;
    if (options.previousPoint) {
      previousCanvasPoint = this._imageToCanvasHtml(options.previousPoint);
    }

    let preferredDirection = null;
    if (options.preferredDirection) {
      const dirX = Number(options.preferredDirection.x);
      const dirY = Number(options.preferredDirection.y);
      const dirLen = Math.hypot(dirX, dirY);
      if (dirLen > 1e-6) {
        preferredDirection = { x: dirX / dirLen, y: dirY / dirLen };
      }
    }

    let bestIdx = -1;
    let bestScore = minGradient;
    for (let dy = -radMap; dy <= radMap; dy++) {
      const yy = cy + dy;
      if (yy < 1 || yy >= contour.height - 1) continue;
      for (let dx = -radMap; dx <= radMap; dx++) {
        const xx = cx + dx;
        if (xx < 1 || xx >= contour.width - 1) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 > radMap * radMap) continue;
        const idx = yy * contour.width + xx;
        const grad = contour.map[idx];
        const proximity = 1 - (Math.sqrt(d2) / (radMap + 1));
        let score = grad + (24 * proximity);
        if (previousCanvasPoint && preferredDirection) {
          const candX = (xx * contour.downsample) / scaleX;
          const candY = (yy * contour.downsample) / scaleY;
          const stepX = candX - previousCanvasPoint.x;
          const stepY = candY - previousCanvasPoint.y;
          const stepLen = Math.hypot(stepX, stepY);
          if (stepLen > 1e-6) {
            const align = (stepX * preferredDirection.x + stepY * preferredDirection.y) / stepLen;
            score += directionWeight * align;
          }
        }
        if (score > bestScore) {
          bestScore = score;
          bestIdx = idx;
        }
      }
    }

    if (bestIdx < 0) return base;

    const bestX = (bestIdx % contour.width);
    const bestY = Math.floor(bestIdx / contour.width);
    const snappedCanvas = {
      x: ((bestX * contour.downsample) / scaleX),
      y: ((bestY * contour.downsample) / scaleY),
    };

    const blendedCanvas = {
      x: canvasPoint.x + (snappedCanvas.x - canvasPoint.x) * strength,
      y: canvasPoint.y + (snappedCanvas.y - canvasPoint.y) * strength,
    };

    const bb = this.layer.layout.boundingBox();
    const size = { w: bb.width(), h: bb.height() };
    return CoordinateSystem.fromCanvasHtmlToImage(
      blendedCanvas,
      this.viewer.camera,
      this.layer.transform,
      size,
      false,
    );
  }

  /**
   * Returns a snapshot of the rendered-frame contour map.
   * Useful for diagnostic overlays and parameter tuning in external UIs.
   * @returns {{map:Uint8Array,width:number,height:number,canvasW:number,canvasH:number,downsample:number}|null}
   */
  getRenderedContourMap() {
    const contour = this._getRenderedContourMap();
    if (!contour) return null;
    return {
      map: contour.map.slice(0),
      width: contour.width,
      height: contour.height,
      canvasW: contour.canvasW,
      canvasH: contour.canvasH,
      downsample: contour.downsample,
    };
  }

  // ─── Internal: pointer handlers ──────────────────────────────────────────

  /**
   * Returns true when the event target is a UI element that should always
   * fall through (toolbar, menu, dialog, button).  Also true when the layer
   * has no layout yet (not fully initialised).
   * @private
   */
  _isUiTarget(e) {
    if (!this.layer?.layout) return true;
    const t = e.target;
    return !!(t?.closest?.('.openlime-toolbar') ||
      t?.closest?.('.openlime-layers-menu') ||
      t?.closest?.('.openlime-dialog') ||
      t?.classList?.contains('openlime-button'));
  }

  /**
   * Double-tap — unified entry point to creation:
   *
   * - Any mode, no session, 'sequence' marker → enter create, start drawing session
   * - Any mode, no session, 'drag' marker     → enter create, arm drag (next drag starts rect)
   * - Create mode, session active, 'sequence' → add last vertex + finalise
   *
  * Note: `toggle()` enters `'edit'` mode (not `'create'`).  Sequence/drag
  * drawing can start here on double-click; tap markers are created with a
  * single click once create mode is active.
   * @private
   */
  _onDoubleTap(e) {
    if (!this._pencilEnabled) return;
    if (this._isUiTarget(e)) return;
    e.preventDefault();
    e.stopPropagation();

    const markerMode = this._instantiateMarker(this.activeMarker, this.markerOptions).interactionMode();

    // Session active (sequence mode mid-drawing) → add last point + finalise
    if (this._session && markerMode === 'sequence') {
      const pos = this._eventToImageCoords(e);
      const transform = this.viewer.camera.getCurrentTransform(performance.now());
      this._session.marker.addVertex(pos, transform, this._session.annotation);
      this._session.annotation.needsUpdate = true;
      this._finalizeSession(e);
      return;
    }

    // No active session → enter create mode and start sequence/drag creation.
    if (markerMode === 'tap') return;

    this.setMode('create');
    const pos = this._eventToImageCoords(e);

    if (markerMode === 'sequence') {
      // Polyline/Polygon: double-click places the first vertex
      this._startSession(pos, e);
    }
    // 'drag': create mode is now armed; the next drag gesture will start the session
  }

  /**
   * Pen hold — alternative finalise gesture for tablet stylus users.
   *
    * - Pen + active 'sequence' session → commit the current stylus position as
    *   the last vertex, then finalise without requiring double-tap
   * - Any other pointer type / mode    → ignored
   *
   * @private
   */
  _onHold(e) {
    if (!this._pencilEnabled) return;
    if (this._isUiTarget(e)) return;
    if (e.pointerType !== 'pen') return;

    if (!this._session || this._session.marker.interactionMode() !== 'sequence') return;

    e.preventDefault?.();
    e.stopPropagation?.();

    const pos = this._eventToImageCoords(e);
    const transform = this.viewer.camera.getCurrentTransform(performance.now());
    const points = this._session.annotation?.data?._markerPoints;
    const last = Array.isArray(points) ? points[points.length - 1] : null;
    if (!last || last.x !== pos.x || last.y !== pos.y) {
      this._session.marker.addVertex(pos, transform, this._session.annotation);
      this._session.annotation.needsUpdate = true;
    }

    this._finalizeSession(e);
  }

  /**
   * Single-tap — dual purpose depending on context:
   *
    * - Create mode + no session + 'tap' marker      → instant create
    * - Create mode + no session + 'sequence' marker → start drawing session (first vertex)
   * - Session active (sequence mode) → add a vertex to the current drawing
   * - No session, click on annotation → ensure edit mode is active (selection
   *   was already handled by LayerSvgAnnotation's onpointerdown)
   * - No session, click on empty area → enter edit mode + deselect all
   * @private
   */
  _onSingleTap(e) {
    if (!this._pencilEnabled) return;
    if (this._isUiTarget(e)) return;

    const markerMode = this._instantiateMarker(this.activeMarker, this.markerOptions).interactionMode();

    if (!this._session && this._mode === 'create' && markerMode === 'tap') {
      e.preventDefault?.();
      e.stopPropagation?.();
      const pos = this._eventToImageCoords(e);
      this.createAnnotation(pos);
      return;
    }

    // In create mode, sequence markers start on first single-click.
    if (!this._session && this._mode === 'create' && markerMode === 'sequence') {
      e.preventDefault?.();
      e.stopPropagation?.();
      const pos = this._eventToImageCoords(e);
      this._startSession(pos, e);
      return;
    }

    if (!this._session && this._mode === 'create') {
      return;
    }

    // Mid-drawing: add a vertex (only for sequence/polyline markers)
    if (this._session) {
      if (markerMode !== 'sequence') return;
      e.preventDefault?.();
      e.stopPropagation?.();
      const pos = this._eventToImageCoords(e);
      const transform = this.viewer.camera.getCurrentTransform(performance.now());
      this._session.marker.addVertex(pos, transform, this._session.annotation);
      this._session.annotation.needsUpdate = true;
      this.viewer.redraw();
      return;
    }

    // No session in edit mode: clicking empty area clears the current selection.
    // Determine annotation-hit directly from the current event target to avoid
    // stale state when annotation clicks are handled by LayerSvgAnnotation.
    const wasOnAnnotation = !!(e.target?.closest?.('.openlime-annotation'));
    this._lastClickWasOnAnnotation = false;

    if (this._mode !== 'edit') this.setMode('edit');
    if (!wasOnAnnotation) this.deselectAll();
  }

  /** Hover → rubber-band update for 'sequence' sessions (mouse up + moving). @private */
  _onHover(e) {
    if (!this._pencilEnabled) return;
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
   * Only intercepts in 'create' mode and only for 'drag' or 'sequence' markers;
   * in all other cases the event is left untouched so panzoom/light work normally.
   *
   * - 'drag' marker in create mode     → start drag session (rect/ellipse)
   * - 'sequence' marker in create mode → treat press position as a vertex (drag-click fallback)
   * - everything else                  → pass through (panzoom / light controller)
   * @private
   */
  _onDragStart(e) {
    if (!this._pencilEnabled) return;
    if (this._isUiTarget(e)) return;
    // Only intercept while actively creating an annotation
    if (this._mode !== 'create') return;

    const markerMode = this._instantiateMarker(this.activeMarker, this.markerOptions).interactionMode();
    if (markerMode !== 'drag' && markerMode !== 'sequence') return;

    // Block panzoom/light from receiving this pan
    e.preventDefault?.();

    const pos = this._eventToImageCoords(e);

    if (markerMode === 'drag') {
      this._startSession(pos, e);
    } else {
      // sequence: drag-click fallback — treat as a vertex
      if (!this._session) {
        this._startSession(pos, e);
      } else {
        const transform = this.viewer.camera.getCurrentTransform(performance.now());
        this._session.marker.addVertex(pos, transform, this._session.annotation);
        this._session.annotation.needsUpdate = true;
        this.viewer.redraw();
      }
    }
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

  /** Pan/drag end → finalise 'drag' mode only. 'sequence' finalises on double-tap or pen hold. @private */
  _onDragEnd(e) {
    if (!this._session) return;
    if (this._session.marker.interactionMode() === 'drag') {
      this._finalizeSession(e);
    }
  }

  // ─── Internal: creation session lifecycle ───────────────────────────────────

  /**
   * Starts a new CreationSession for the current active marker.
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
    annotation.semanticClass = null;
    annotation.structuralClass = null;
    annotation.publish = 1;
    annotation.data = {};
    annotation.data._markerType = this.activeMarker;

    if (this.enableState) this._captureState(annotation);

    const transform = this.viewer.camera.getCurrentTransform(performance.now());
    const style = this._getClassStyle(annotation, false);
    marker.startElement(pos, transform, annotation, style);
    annotation.needsUpdate = true;

    if (!this.layer.annotations.includes(annotation)) {
      this.layer.annotations.push(annotation);
    }

    this._session = { annotation, marker };
    this.viewer.redraw();
    this.emit('sessionStart', annotation);
  }

  /**
   * Synchronises vertex-handle visibility, fill/stroke styles, and vertex-drag
   * listeners with the current `layer.selected` Set.
   *
   * ### Multi-selection behaviour
   * - Vertex handles (the dots on a polyline) are **shown for every selected
   *   annotation**, giving clear visual feedback regardless of how many items
   *   are selected.
   * - Vertex-**drag** listeners are attached to exactly **one** annotation at a
   *   time — `_selectedAnnotation` — which is the "active" vertex-drag target.
   *   Priority rules for choosing the active annotation:
   *   1. If `changedAnno` was just *added* to the selection → it becomes active.
   *   2. Else if the previous active is still in the selection → keep it.
   *   3. Else pick the first remaining selected annotation.
   *   4. When the selection is empty, `_selectedAnnotation` becomes `null`.
   *
   * Called on `'selected'` events from the layer and directly by
   * `setSelectedIds` / `deselectAll`.
   *
   * @param {Annotation|null} changedAnno - The annotation whose selection state
   *   just changed (or `null` when deselecting everything).
   * @private
   */
  _updateHandlesVisibility(changedAnno) {
    if (!this.layer?.annotations) return;

    // `layer.selected` is the authoritative source of truth.
    const selectedIds = this.layer.selected; // Set<string>

    // ── singleEditMode: suppress drag listeners when >1 annotation is selected ──
    // Handle *visibility* is still governed by `showVertexHandles` (orthogonal flag).
    if (this.singleEditMode && selectedIds.size > 1) {
      if (this._selectedAnnotation) {
        this._detachVertexDragListeners(this._selectedAnnotation);
        this._selectedAnnotation = null;
      }
      for (const anno of this.layer.annotations) {
        const isSelected = selectedIds.has(anno.id);
        const isInSession = this._session?.annotation === anno;
        const handles = anno.elements?.find(el => el.classList?.contains('annotation-vertex-handles'));
        if (handles) {
          if ((isSelected && this.showVertexHandles) || isInSession) handles.removeAttribute('visibility');
          else handles.setAttribute('visibility', 'hidden');
        }
        this._applyStyleToElements(anno, isSelected);
        anno.needsUpdate = true;
      }
      if (this.layer.annotations.length > 0) this.viewer.redraw();
      return;
    }

    // ── Determine the new vertex-drag active annotation ──────────────────
    const changedIsNowSelected = changedAnno != null && selectedIds.has(changedAnno.id);
    let nextActive;
    if (changedIsNowSelected) {
      // The annotation that just entered the selection becomes the active one.
      nextActive = changedAnno;
    } else if (this._selectedAnnotation && selectedIds.has(this._selectedAnnotation.id)) {
      // The previous active is still selected — keep it.
      nextActive = this._selectedAnnotation;
    } else if (selectedIds.size > 0) {
      // The previous active was removed — fall back to the first remaining id.
      const firstId = selectedIds.values().next().value;
      nextActive = this.layer.annotations.find(a => a.id === firstId) ?? null;
    } else {
      nextActive = null;
    }

    // ── Manage drag-listener attachment ──────────────────────────────────
    // Detach from the old active annotation when it changes.
    if (this._selectedAnnotation && this._selectedAnnotation !== nextActive) {
      this._detachVertexDragListeners(this._selectedAnnotation);
    }

    // ── Update every annotation's visual state ────────────────────────────
    for (const anno of this.layer.annotations) {
      const isSelected = selectedIds.has(anno.id);
      const isInSession = this._session?.annotation === anno;

      // Show vertex handles for ALL selected annotations (when the feature is enabled).
      // Always show handles on the annotation currently being drawn (session active).
      const handles = anno.elements?.find(el => el.classList?.contains('annotation-vertex-handles'));
      if (handles) {
        if ((isSelected && this.showVertexHandles) || isInSession) handles.removeAttribute('visibility');
        else handles.setAttribute('visibility', 'hidden');
      }

      this._applyStyleToElements(anno, isSelected);
      anno.needsUpdate = true;
    }

    // Attach drag listeners to the new active annotation (only if it changed).
    if (nextActive && nextActive !== this._selectedAnnotation) {
      this._attachVertexDragListeners(nextActive);
    }

    this._selectedAnnotation = nextActive;
    if (this.layer.annotations.length > 0) this.viewer.redraw();
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

    // Let the marker decide whether there is enough geometry to commit.
    if (!marker.canFinalize(annotation)) {
      this._cancelSession();
      return;
    }

    this._session = null;

    const transform = this.viewer.camera.getCurrentTransform(performance.now());
    const style = this._getClassStyle(annotation, false);
    const finalElements = marker.finalizeElement(transform, annotation, style);
    annotation.elements = finalElements;
    annotation.needsUpdate = true;
    annotation.syncSvg();
    this.viewer.redraw();
    this.emit('create', annotation);
    if (this._mode === 'create' || marker.shouldStayInCreateModeAfterFinalize(annotation)) this.setMode('create');
    else this.setMode('edit');
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
    if (this._mode === 'create') this.setMode('create');
    else this.setMode('edit');
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
    // ── Disk: drag the circle itself ────────────────────────────────────────
    const diskEl = annotation.elements?.find(el => el.classList?.contains('annotation-disk'));
    if (diskEl && !diskEl._vertexDragHandler) {
      diskEl._vertexDragHandler = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        diskEl.setPointerCapture(e.pointerId);
        this._vertexSession = { annotation, vertexIndex: 0 };
        this.emit('editStart', annotation);

        const onMove = (ev) => {
          if (ev.pointerId !== e.pointerId) return;
          if (!this._vertexSession) { cleanup(); return; }
          const pos = this._eventToImageCoords(ev);
          const transform = this.viewer.camera.getCurrentTransform(performance.now());
          try {
            const marker = this._instantiateMarker('disk', {});
            marker.moveVertex(0, pos, transform, annotation);
          } catch { /* ignore */ }
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
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
        document.addEventListener('pointercancel', onUp);
      };
      diskEl.addEventListener('pointerdown', diskEl._vertexDragHandler);
    }

    // ── Polyline: drag individual vertex dots ───────────────────────────────
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
        this.emit('editStart', annotation);

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
    // Disk
    const diskEl = annotation?.elements?.find(el => el.classList?.contains('annotation-disk'));
    if (diskEl?._vertexDragHandler) {
      diskEl.removeEventListener('pointerdown', diskEl._vertexDragHandler);
      delete diskEl._vertexDragHandler;
    }
    // Polyline vertex dots
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
    const marker = new cls(options);
    marker._manager = this;
    return marker;
  }

  // ─── Grouping / Ungrouping ───────────────────────────────────────────────────

  /**
   * Merges multiple annotations into a single grouped annotation.
   *
   * The new annotation's SVG contains one `<g id="originalId">` per source
   * annotation, preserving the original IDs so {@link ungroupAnnotation} can
   * restore them later.  All original annotations are deleted after grouping.
   *
   * Nested grouping is **not** supported: if any of the supplied IDs refers
   * to an annotation that is itself already a group, the call throws.
   *
   * @param {string[]} ids - IDs of the annotations to group (minimum 2).
   * @returns {Annotation} The newly created grouped annotation.
   * @throws {Error} If fewer than 2 IDs, any ID is not found, or any annotation
   *   is already a group.
   * @fires ManagerSvgAnnotation#group
   * @fires ManagerSvgAnnotation#delete
   */
  groupAnnotations(ids) {
    if (!Array.isArray(ids) || ids.length < 2) {
      throw new Error('groupAnnotations: at least 2 annotation IDs are required.');
    }

    // Resolve and validate all source annotations up front.
    const sources = ids.map(id => {
      const anno = this.getAnnotationById(id);
      if (!anno) throw new Error(`groupAnnotations: annotation '${id}' not found.`);

      return anno;
    });

    // ── Build the grouped SVG ────────────────────────────────────────────
    const svgNS = 'http://www.w3.org/2000/svg';
    const wrapperSvg = document.createElementNS(svgNS, 'svg');
    const serializer = new XMLSerializer();

    // Metadata snapshot for each original (used by ungroupAnnotation).
    const groupedMeta = [];

    for (const anno of sources) {
      // Reset to unselected style before serialising so the grouped SVG
      // does not bake in the "selected" highlight colours.
      this._applyStyleToElements(anno, false);
      anno.syncSvg();

      const g = document.createElementNS(svgNS, 'g');
      g.setAttribute('id', anno.id);

      // Clone each SVG element into the group.
      for (const el of anno.elements ?? []) {
        g.appendChild(el.cloneNode(true));
      }
      wrapperSvg.appendChild(g);

      // Snapshot metadata so ungroup can fully restore each annotation.
      groupedMeta.push({
        id: anno.id,
        label: anno.label,
        description: anno.description,
        semanticClass: anno.semanticClass,
        structuralClass: anno.structuralClass,
        publish: anno.publish,
        data: JSON.parse(JSON.stringify(anno.data ?? {})),
        svg: anno.svg,
      });
    }

    const groupedSvgString = serializer.serializeToString(wrapperSvg);

    // ── Create the group annotation ──────────────────────────────────────
    const groupAnno = this.layer.newAnnotation();
    groupAnno.label = sources.map(a => a.label).filter(Boolean).join(', ') || 'Group';
    groupAnno.description = '';
    groupAnno.semanticClass = this.groupAnnotationClass;
    groupAnno.structuralClass = null;
    groupAnno.publish = sources[0].publish;
    groupAnno.svg = groupedSvgString;
    groupAnno.data._grouped = true;
    groupAnno.data._groupedIds = ids.slice();
    groupAnno.data._groupedMeta = groupedMeta;
    groupAnno.needsUpdate = true;

    // Parse the grouped SVG into elements directly so we can apply the
    // group class style before the first render.  Relying on prefetch would
    // show the source annotations' original colours for one frame.
    const groupParser = new DOMParser();
    const groupDoc = groupParser.parseFromString(groupedSvgString, 'image/svg+xml');
    const groupRoot = groupDoc.documentElement;
    groupAnno.elements = groupRoot.children.length > 0
      ? [...groupRoot.children]
      : [groupRoot];
    groupAnno.ready = true;

    // Apply group class colours so the first render is correct.
    this._applyStyleToElements(groupAnno, false);
    groupAnno.syncSvg();

    if (!this.layer.annotations.includes(groupAnno)) {
      this.layer.annotations.push(groupAnno);
    }

    // ── Delete originals ─────────────────────────────────────────────────
    // Deselect first to avoid stale selection references.
    this.deselectAll();
    for (const id of ids) {
      this.deleteAnnotation(id);
    }

    this.emit('group', { annotation: groupAnno, sourceIds: ids.slice() });
    this.viewer.redraw();
    return groupAnno;
  }

  /**
   * Splits a grouped annotation back into its original individual annotations.
   *
   * Each `<g id="originalId">` inside the group's SVG is extracted and used to
  * recreate an annotation with the original ID, label, semantic class, and custom data
   * that were stored at grouping time.
   *
   * @param {string} id - ID of the grouped annotation to ungroup.
   * @returns {Annotation[]} The restored individual annotations.
   * @throws {Error} If the annotation is not found or is not a group.
   * @fires ManagerSvgAnnotation#ungroup
   * @fires ManagerSvgAnnotation#delete
   */
  ungroupAnnotation(id) {
    const groupAnno = this.getAnnotationById(id);
    if (!groupAnno) {
      throw new Error(`ungroupAnnotation: annotation '${id}' not found.`);
    }
    if (!groupAnno.data?._grouped) {
      throw new Error(`ungroupAnnotation: annotation '${id}' is not a grouped annotation.`);
    }

    const metaMap = new Map(
      (groupAnno.data._groupedMeta ?? []).map(m => [m.id, m])
    );

    // ── Parse the group SVG to extract per-annotation <g> elements ─────
    // Ensure SVG string is current.
    groupAnno.syncSvg();
    const parser = new DOMParser();
    const doc = parser.parseFromString(groupAnno.svg, 'image/svg+xml');
    const root = doc.documentElement;

    const restored = [];

    // Iterate over top-level <g> children whose id matches a stored original.
    for (const gEl of [...root.children]) {
      if (gEl.tagName !== 'g' && gEl.tagName !== 'G') continue;
      const origId = gEl.getAttribute('id');
      if (!origId) continue;

      const meta = metaMap.get(origId) ?? {};

      // Rebuild the annotation's SVG from the <g>'s children.
      const serializer = new XMLSerializer();
      let innerSvg;
      if (gEl.children.length === 1) {
        innerSvg = serializer.serializeToString(gEl.children[0]);
      } else {
        // Wrap multiple children back into a <g> (mirrors Annotation.syncSvg).
        const wrapper = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        for (const child of [...gEl.children]) wrapper.appendChild(child.cloneNode(true));
        innerSvg = serializer.serializeToString(wrapper);
      }

      // Use the original SVG if we have it in the meta snapshot, otherwise
      // fall back to what we just extracted from the group.
      const svgString = meta.svg ?? innerSvg;

      const anno = new Annotation({
        id: origId,
        label: meta.label ?? '',
        description: meta.description ?? '',
        semanticClass: meta.semanticClass ?? groupAnno.semanticClass,
        structuralClass: meta.structuralClass ?? null,
        publish: meta.publish ?? groupAnno.publish,
        data: meta.data ? JSON.parse(JSON.stringify(meta.data)) : {},
        svg: svgString,
        visible: true,
        needsUpdate: true,
      });

      // Parse the SVG directly into elements instead of leaving it to
      // prefetch.  prefetch uses `documentElement.children` which returns
      // an empty list for bare single-element SVGs (e.g. `<circle/>`).
      const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
      const svgRoot = svgDoc.documentElement;
      anno.elements = svgRoot.children.length > 0
        ? [...svgRoot.children]
        : [svgRoot];
      anno.ready = true;

      this.layer.annotations.push(anno);
      restored.push(anno);
    }

    // ── Delete the group annotation ──────────────────────────────────────
    this.deselectAll();
    this.deleteAnnotation(id);

    this.viewer.redraw();
    this.emit('ungroup', { groupId: id, annotations: restored });
    return restored;
  }

  /**
   * Groups all currently selected annotations.
   *
   * Convenience wrapper around {@link groupAnnotations} that reads the current
   * selection from the layer.  Requires at least 2 annotations to be selected.
   *
   * @returns {Annotation} The newly created grouped annotation.
   * @throws {Error} If fewer than 2 annotations are selected.
   */
  groupSelected() {
    const ids = [...(this.layer.selected ?? [])];
    return this.groupAnnotations(ids);
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

/**
 * @event ManagerSvgAnnotation#group
 * @type {{annotation: Annotation, sourceIds: string[]}}
 * @description Fired when multiple annotations are merged into a single group.
 */

/**
 * @event ManagerSvgAnnotation#ungroup
 * @type {{groupId: string, annotations: Annotation[]}}
 * @description Fired when a grouped annotation is split back into individuals.
 */

addSignals(ManagerSvgAnnotation, 'create', 'update', 'editStart', 'delete', 'select', 'selectionChange', 'sessionStart', 'sessionCancel', 'modeChange', 'group', 'ungroup');

// ─── Built-in: RectMarker ─────────────────────────────────────────────────────

/**
 * RectMarker — an axis-aligned rectangle drawn by fixing the first corner
 * (double-click), moving the mouse to preview the shape, then double-clicking
 * again to finalise.
 *
 * **Interaction (sequence mode)**
 * - First double-click: enters create mode and places the first corner (shown as a dot).
 * - Move mouse: rectangle stretches live, second corner dot follows the cursor.
 * - Second double-click (or Enter): finalises the rectangle.
 * - Escape: cancels.
 *
 * Stored geometry keys on `annotation.data`:
 *  - `_markerType`    → `'rect'`
 *  - `_markerCorners` → `[{x,y}, {x,y}]` — two opposite corners in image space
 *
 * @extends Marker
 */
class RectMarker extends Marker {
  /**
   * @param {Object} [options]
   * @param {number} [options.vertexRadius=5] - Screen-px radius for corner handle dots
   */
  constructor(options = {}) {
    super('rect', options);
    this.vertexRadius = options.vertexRadius ?? 5;
  }

  interactionMode() { return 'sequence'; }

  // ── Internal helpers ───────────────────────────────────────────────────

  _modelStroke(transform, style) {
    return (style?.strokeWidth ?? 2) / (transform?.z ?? 1);
  }

  _modelRadius(transform) {
    return (this.vertexRadius ?? 5) / (transform?.z ?? 1);
  }

  /** Updates the SVG <rect> x/y/width/height from the two stored corners. */
  _updateRectGeometry(annotation) {
    const c = annotation.data._markerCorners;
    if (!c) return;
    const x = Math.min(c[0].x, c[1].x);
    const y = Math.min(c[0].y, c[1].y);
    const w = Math.abs(c[1].x - c[0].x);
    const h = Math.abs(c[1].y - c[0].y);
    const rect = annotation.elements?.find(el => el.classList?.contains('annotation-rect'));
    if (rect) {
      rect.setAttribute('x', x);
      rect.setAttribute('y', y);
      rect.setAttribute('width', w);
      rect.setAttribute('height', h);
    }
  }

  /** Rebuilds the four corner dots in the handles group (used after finalise, for edit). */
  _rebuildHandles(annotation, transform) {
    const handles = annotation.elements?.find(el => el.classList?.contains('annotation-vertex-handles'));
    if (!handles) return;
    handles.innerHTML = '';
    const c = annotation.data._markerCorners;
    if (!c) return;
    const x0 = Math.min(c[0].x, c[1].x), y0 = Math.min(c[0].y, c[1].y);
    const x1 = Math.max(c[0].x, c[1].x), y1 = Math.max(c[0].y, c[1].y);
    const pts = [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }];
    const r = this._modelRadius(transform);
    for (const p of pts) {
      handles.appendChild(this.makeDot(p.x, p.y, r, 'nwse-resize'));
    }
  }

  // ── Sequence mode overrides ────────────────────────────────────────────

  startElement(pos, transform, annotation, style = {}) {
    annotation.type = 'rect';
    annotation.data._markerCorners = [{ ...pos }, { ...pos }];
    const sw = this._modelStroke(transform, style);
    const r = this._modelRadius(transform);

    const rect = Util.createSVGElement('rect', {
      x: pos.x, y: pos.y, width: 0, height: 0,
      fill: style.fill ?? '#ff0000',
      'fill-opacity': style.fillOpacity ?? 0.2,
      stroke: style.stroke ?? '#ff0000',
      'stroke-width': sw,
      class: 'annotation-rect',
      style: _SHADOW,
    });

    // Two dots: first corner (anchor) + second corner (follows mouse)
    const handles = Util.createSVGElement('g', {
      class: 'annotation-vertex-handles',
      visibility: 'visible',
    });
    handles.appendChild(this.makeDot(pos.x, pos.y, r, 'crosshair')); // dot[0] — fixed
    handles.appendChild(this.makeDot(pos.x, pos.y, r, 'crosshair')); // dot[1] — rubber

    annotation.elements = [rect, handles];
    return annotation.elements;
  }

  /** Updates the second corner live (rubber-band). */
  _moveSecondCorner(pos, annotation) {
    if (!annotation.data._markerCorners) return;
    annotation.data._markerCorners[1] = { ...pos };
    this._updateRectGeometry(annotation);
    const handles = annotation.elements?.find(el => el.classList?.contains('annotation-vertex-handles'));
    const dot1 = handles?.children[1];
    if (dot1) {
      dot1.setAttribute('cx', pos.x);
      dot1.setAttribute('cy', pos.y);
    }
  }

  addVertex(pos, transform, annotation) {
    // For a rect only two corners are needed; single-click locks the second corner
    // but drawing continues until double-click finalises.
    this._moveSecondCorner(pos, annotation);
  }

  updatePreview(pos, transform, annotation) {
    this._moveSecondCorner(pos, annotation);
  }

  finalizeElement(transform, annotation, style = {}) {
    this._updateRectGeometry(annotation);
    // Replace the two preview dots with proper 4-corner handles for editing
    this._rebuildHandles(annotation, transform);
    const handles = annotation.elements?.find(el => el.classList?.contains('annotation-vertex-handles'));
    if (handles) handles.setAttribute('visibility', 'hidden');
    return annotation.elements;
  }

  canFinalize(annotation) {
    const c = annotation.data._markerCorners;
    if (!c) return false;
    // Require a non-degenerate rectangle
    return c[0].x !== c[1].x || c[0].y !== c[1].y;
  }

  moveVertex(vertexIndex, pos, transform, annotation) {
    const c = annotation.data._markerCorners;
    if (!c) return;
    // Normalised corners (TL / BR) so each handle maps to the right axis.
    let x0 = Math.min(c[0].x, c[1].x), y0 = Math.min(c[0].y, c[1].y);
    let x1 = Math.max(c[0].x, c[1].x), y1 = Math.max(c[0].y, c[1].y);
    if (vertexIndex === 0) { x0 = pos.x; y0 = pos.y; }
    else if (vertexIndex === 1) { x1 = pos.x; y0 = pos.y; }
    else if (vertexIndex === 2) { x1 = pos.x; y1 = pos.y; }
    else if (vertexIndex === 3) { x0 = pos.x; y1 = pos.y; }
    annotation.data._markerCorners = [{ x: x0, y: y0 }, { x: x1, y: y1 }];
    this._updateRectGeometry(annotation);
    this._rebuildHandles(annotation, transform);
  }

  // ── Zoom-responsive sizes ─────────────────────────────────────────────────

  updateElements(elements, transform, annotation, style = {}) {
    const sw = this._modelStroke(transform, style);
    const r = this._modelRadius(transform);
    for (const el of elements) {
      if (el.classList?.contains('annotation-rect')) {
        el.setAttribute('stroke-width', sw);
        el.setAttribute('stroke', style.stroke ?? '#ff0000');
        el.setAttribute('fill', style.fill ?? '#ff0000');
        el.setAttribute('fill-opacity', style.fillOpacity ?? 0.2);
      } else if (el.classList?.contains('annotation-vertex-handles')) {
        for (const dot of el.children) {
          dot.setAttribute('r', r);
          dot.setAttribute('stroke-width', r * 0.4);
        }
      }
    }
  }

  serialize() {
    return { type: this.type, vertexRadius: this.vertexRadius ?? 5 };
  }
}

// ─── Built-in: FreehandMarker ────────────────────────────────────────────────

/**
 * FreehandMarker — draws fluid freehand strokes while dragging.
 *
 * **Interaction (drag mode)**
 * - Press and drag: points are sampled continuously from pointer movement.
 * - Release: stroke is simplified and committed as a polyline.
 * - Escape: cancels.
 *
 * Stored geometry keys on `annotation.data`:
 *  - `_markerType`   → `'freehand'`
 *  - `_markerClosed` → `false` for open strokes, `true` for closed polygons
 *  - `_markerPoints` → `[{x,y}, ...]` sampled image-space points
 *
 * @extends Marker
 */
class FreehandMarker extends Marker {
  /**
   * @param {Object} [options]
   * @param {number} [options.sampleDistance=1.5] - Minimum sampling spacing in screen px
   * @param {number} [options.simplifyTolerance=1.0] - Simplification tolerance in screen px
   * @param {boolean}[options.enableSmoothingFilter=false] - Enable smoothing filter
   * @param {number} [options.smoothAngle=90] - Corner threshold in degrees for smoothing
   * @param {boolean}[options.closed=false] - Close stroke and output polygon
   * @param {boolean}[options.continuousDrawing=true] - Keep create mode after each stroke
   * @param {number} [options.hitTolerance=10] - Extra hit area in screen px
   * @param {boolean}[options.enableContourSnap=false] - Snap sampled points to rendered contours
   * @param {number} [options.contourSnapRadius=14] - Search radius in screen px for contour snap
   * @param {number} [options.contourSnapStrength=0.7] - Blend factor [0..1] towards detected contour
  * @param {number} [options.contourMinGradient=22] - Minimum local gradient magnitude to accept snap
  * @param {number} [options.contourDirectionWeight=18] - Continuity weight that favours forward contour motion.
  * @param {number} [options.onlineSmoothingStrength=0.18] - Light smoothing applied while sampling in [0, 1], only when the legacy smoothing filter is off.
  * @param {boolean}[options.enableFinalRelax=true] - Apply a weak anti-zigzag relax pass before commit, only when the legacy smoothing filter is off.
  * @param {number} [options.finalRelaxStrength=0.12] - Relaxation amount for the final anti-zigzag pass.
  * @param {number} [options.finalRelaxDenseFactor=1.45] - Density multiplier for the final anti-zigzag pass.
  * @param {number} [options.finalRelaxSharpCosThreshold=0.1] - Corner threshold for the final anti-zigzag pass.
   * @param {boolean}[options.autoCloseNearStart=false] - Auto-close as polygon when stroke ends near the first point
   * @param {number} [options.autoCloseDistancePx=10] - Max screen distance from first point to trigger auto-close
   */
  constructor(options = {}) {
    super('freehand', Object.assign({
      sampleDistance: 1.5,
      simplifyTolerance: 1.0,
      enableSmoothingFilter: false,
      smoothAngle: 90,
      closed: false,
      continuousDrawing: true,
      hitTolerance: 10,
      enableContourSnap: false,
      contourSnapRadius: 14,
      contourSnapStrength: 0.7,
      contourMinGradient: 22,
      contourDirectionWeight: 18,
      onlineSmoothingStrength: 0.18,
      enableFinalRelax: true,
      finalRelaxStrength: 0.12,
      finalRelaxDenseFactor: 1.45,
      finalRelaxSharpCosThreshold: 0.1,
      autoCloseNearStart: false,
      autoCloseDistancePx: 10,
    }, options));
  }

  interactionMode() { return 'drag'; }

  static _toPointsAttr(points) {
    return points.map(p => `${p.x},${p.y}`).join(' ');
  }

  _modelStroke(transform, style) {
    return (style?.strokeWidth ?? 2) / (transform?.z ?? 1);
  }

  _modelDistancePx(px, transform) {
    return px / (transform?.z ?? 1);
  }

  _distanceSq(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  _shouldApplyOnlineSmoothing() {
    return !this.enableSmoothingFilter;
  }

  _shouldApplyFinalRelax() {
    return !this.enableSmoothingFilter && !!this.enableFinalRelax;
  }

  _preferredDirection(points) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const last = points[points.length - 1];
    const prev = points[points.length - 2];
    let dx = last.x - prev.x;
    let dy = last.y - prev.y;
    if (points.length >= 3) {
      const prev2 = points[points.length - 3];
      dx += 0.5 * (prev.x - prev2.x);
      dy += 0.5 * (prev.y - prev2.y);
    }
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return null;
    return { x: dx / len, y: dy / len };
  }

  _smoothRecentSamples(points, transform) {
    if (!Array.isArray(points) || points.length < 3) return;
    if (!this._shouldApplyOnlineSmoothing()) return;
    const strength = Math.max(0, Math.min(1, Number(this.onlineSmoothingStrength) || 0.18));
    if (strength <= 0) return;
    const current = points[points.length - 1];
    const middle = points[points.length - 2];
    const prev = points[points.length - 3];
    const denseLimit = this._modelDistancePx((this.sampleDistance ?? 1.5) * 2.4, transform);
    const l1 = Math.hypot(middle.x - prev.x, middle.y - prev.y);
    const l2 = Math.hypot(current.x - middle.x, current.y - middle.y);
    if (l1 > denseLimit || l2 > denseLimit) return;
    middle.x += strength * (0.5 * (prev.x + current.x) - middle.x);
    middle.y += strength * (0.5 * (prev.y + current.y) - middle.y);
  }

  _snapPoint(pos, annotation = null) {
    if (!this.enableContourSnap) return pos;
    const mgr = this._manager;
    if (!mgr?.snapImagePointToRenderedContour) return pos;
    const points = annotation?.data?._markerPoints;
    return mgr.snapImagePointToRenderedContour(pos, {
      radiusPx: this.contourSnapRadius,
      strength: this.contourSnapStrength,
      minGradient: this.contourMinGradient,
      directionWeight: this.contourDirectionWeight,
      previousPoint: Array.isArray(points) && points.length > 0 ? points[points.length - 1] : null,
      preferredDirection: this._preferredDirection(points),
    });
  }

  _appendSample(pos, transform, annotation) {
    const snappedPos = this._snapPoint(pos, annotation);
    const pts = annotation.data._markerPoints;
    if (!pts || pts.length === 0) return;
    const last = pts[pts.length - 1];
    const minD = this._modelDistancePx(this.sampleDistance ?? 1.5, transform);
    const minDSq = minD * minD;
    if (this._distanceSq(last, snappedPos) >= minDSq) {
      pts.push({ x: snappedPos.x, y: snappedPos.y });
      this._smoothRecentSamples(pts, transform);
    }
  }

  _normalizePointArray(points) {
    if (!Array.isArray(points)) return [];
    return points
      .map(p => ({ x: Number(p.x), y: Number(p.y) }))
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
  }

  _buildFilteredPoints(points, transform) {
    const normalized = this._normalizePointArray(points);
    if (normalized.length < 2) return normalized;

    const tol = this._modelDistancePx(this.simplifyTolerance ?? 1.0, transform);
    const reduced = ramerDouglasPeucker(normalized, tol);

    if (!this.enableSmoothingFilter) {
      return reduced.length >= 2 ? reduced : normalized;
    }

    // Reuse EditorSvgAnnotation pipeline: RDP reduction -> smooth.
    const angle = Number(this.smoothAngle ?? 90);
    const smoothed = smooth(reduced, Number.isFinite(angle) ? angle : 90, true);
    const anchors = smoothed
      .map(p => ({ x: Number(p[0]), y: Number(p[1]) }))
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

    if (anchors.length < 2) return reduced.length >= 2 ? reduced : normalized;

    // Remove adjacent duplicates to avoid degenerate segments.
    const dedup = [anchors[0]];
    for (let i = 1; i < anchors.length; i++) {
      const prev = dedup[dedup.length - 1];
      const cur = anchors[i];
      if (prev.x !== cur.x || prev.y !== cur.y) dedup.push(cur);
    }
    return dedup.length >= 2 ? dedup : (reduced.length >= 2 ? reduced : normalized);
  }

  startElement(pos, transform, annotation, style = {}) {
    const startPos = this._snapPoint(pos, annotation);
    annotation.type = this.closed ? 'polygon' : 'polyline';
    annotation.data._markerClosed = !!this.closed;
    annotation.data._markerPoints = [{ x: startPos.x, y: startPos.y }];

    const sw = this._modelStroke(transform, style);
    const pts = FreehandMarker._toPointsAttr(annotation.data._markerPoints);
    const hitSw = this._modelDistancePx(this.hitTolerance ?? 10, transform);

    const stroke = Util.createSVGElement('polyline', {
      points: pts,
      class: 'annotation-freehand',
      stroke: style.stroke ?? '#ff0000',
      'stroke-width': String(sw),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: 'none',
      style: _SHADOW,
    });

    const hit = Util.createSVGElement('polyline', {
      points: pts,
      class: 'annotation-freehand-hit',
      stroke: 'transparent',
      'stroke-width': String(hitSw),
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      fill: 'none',
    });

    annotation.elements = [stroke, hit];
    return annotation.elements;
  }

  updatePreview(pos, transform, annotation) {
    this._appendSample(pos, transform, annotation);
    const pts = annotation.data._markerPoints;
    if (!pts || pts.length === 0) return;
    const attr = FreehandMarker._toPointsAttr(pts);
    const stroke = annotation.elements.find(el => el.classList?.contains('annotation-freehand'));
    const hit = annotation.elements.find(el => el.classList?.contains('annotation-freehand-hit'));
    if (stroke) stroke.setAttribute('points', attr);
    if (hit) hit.setAttribute('points', attr);
  }

  finalizeElement(transform, annotation, style = {}) {
    const pts = annotation.data._markerPoints ?? [];
    let filtered = this._buildFilteredPoints(pts, transform);

    if (!annotation.data._markerClosed && this.autoCloseNearStart && filtered.length >= 3) {
      const first = filtered[0];
      const last = filtered[filtered.length - 1];
      const closeDist = this._modelDistancePx(this.autoCloseDistancePx ?? 10, transform);
      if (this._distanceSq(first, last) <= closeDist * closeDist) {
        annotation.data._markerClosed = true;
        annotation.type = 'polygon';
        // Remove the terminal near-duplicate endpoint so polygon closure is cleaner.
        if (filtered.length > 3) filtered = filtered.slice(0, -1);
      }
    }

    if (this._shouldApplyFinalRelax() && filtered.length >= 3) {
      filtered = relaxDenseZigZagPoints(filtered, {
        closed: !!annotation.data._markerClosed,
        strength: Math.max(0, Math.min(1, Number(this.finalRelaxStrength) || 0.12)),
        denseFactor: Math.max(0.01, Number(this.finalRelaxDenseFactor) || 1.45),
        sharpCosThreshold: Number(this.finalRelaxSharpCosThreshold ?? 0.1),
      });
    }

    annotation.data._markerPoints = filtered;

    const attr = FreehandMarker._toPointsAttr(annotation.data._markerPoints);
    const stroke = annotation.elements.find(el => el.classList?.contains('annotation-freehand'));
    const hit = annotation.elements.find(el => el.classList?.contains('annotation-freehand-hit'));
    if (stroke) {
      stroke.setAttribute('points', attr);
      stroke.setAttribute('stroke', style.stroke ?? stroke.getAttribute('stroke') ?? '#ff0000');
    }
    if (hit) hit.setAttribute('points', attr);

    // Convert to polygons when closed mode is enabled.
    if (annotation.data._markerClosed) {
      if (stroke && stroke.tagName?.toLowerCase() !== 'polygon') {
        const polygon = Util.createSVGElement('polygon', {
          points: attr,
          class: 'annotation-freehand',
          stroke: style.stroke ?? stroke.getAttribute('stroke') ?? '#ff0000',
          'stroke-width': stroke.getAttribute('stroke-width') ?? '2',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          fill: style.fill ?? 'none',
          style: _SHADOW,
        });
        stroke.parentNode?.replaceChild(polygon, stroke);
        const idx = annotation.elements.indexOf(stroke);
        if (idx !== -1) annotation.elements[idx] = polygon;
      }
      if (hit && hit.tagName?.toLowerCase() !== 'polygon') {
        const hitPolygon = Util.createSVGElement('polygon', {
          points: attr,
          class: 'annotation-freehand-hit',
          stroke: 'transparent',
          'stroke-width': hit.getAttribute('stroke-width') ?? '10',
          'stroke-linecap': 'round',
          'stroke-linejoin': 'round',
          fill: 'transparent',
        });
        hit.parentNode?.replaceChild(hitPolygon, hit);
        const hidx = annotation.elements.indexOf(hit);
        if (hidx !== -1) annotation.elements[hidx] = hitPolygon;
      }
    }

    return annotation.elements;
  }

  updateElements(elements, transform, annotation, style = {}) {
    const sw = this._modelStroke(transform, style);
    const hitSw = this._modelDistancePx(this.hitTolerance ?? 10, transform);
    for (const el of elements) {
      if (el.classList?.contains('annotation-freehand')) {
        el.setAttribute('stroke-width', String(sw));
        el.setAttribute('stroke', style.stroke ?? '#ff0000');
      }
      if (el.classList?.contains('annotation-freehand-hit')) {
        el.setAttribute('stroke-width', String(hitSw));
        el.removeAttribute('pointer-events');
      }
    }
  }

  canFinalize(annotation) {
    return (annotation.data?._markerPoints?.length ?? 0) >= 2;
  }

  shouldStayInCreateModeAfterFinalize(annotation) {
    return !!this.continuousDrawing;
  }

  serialize() {
    return {
      type: this.type,
      sampleDistance: this.sampleDistance ?? 1.5,
      simplifyTolerance: this.simplifyTolerance ?? 1.0,
      enableSmoothingFilter: !!this.enableSmoothingFilter,
      smoothAngle: this.smoothAngle ?? 90,
      closed: !!this.closed,
      continuousDrawing: !!this.continuousDrawing,
      hitTolerance: this.hitTolerance ?? 10,
      enableContourSnap: !!this.enableContourSnap,
      contourSnapRadius: this.contourSnapRadius ?? 14,
      contourSnapStrength: this.contourSnapStrength ?? 0.7,
      contourMinGradient: this.contourMinGradient ?? 22,
      contourDirectionWeight: this.contourDirectionWeight ?? 18,
      onlineSmoothingStrength: this.onlineSmoothingStrength ?? 0.18,
      enableFinalRelax: !!this.enableFinalRelax,
      finalRelaxStrength: this.finalRelaxStrength ?? 0.12,
      finalRelaxDenseFactor: this.finalRelaxDenseFactor ?? 1.45,
      finalRelaxSharpCosThreshold: this.finalRelaxSharpCosThreshold ?? 0.1,
      autoCloseNearStart: !!this.autoCloseNearStart,
      autoCloseDistancePx: this.autoCloseDistancePx ?? 10,
    };
  }
}

// Register built-in markers
ManagerSvgAnnotation.registerMarker('disk', DiskMarker);
ManagerSvgAnnotation.registerMarker('polyline', PolylineMarker);
ManagerSvgAnnotation.registerMarker('rect', RectMarker);
ManagerSvgAnnotation.registerMarker('freehand', FreehandMarker);

export { ManagerSvgAnnotation, Marker, DiskMarker, PolylineMarker, RectMarker, FreehandMarker, relaxDenseZigZagPoints };
