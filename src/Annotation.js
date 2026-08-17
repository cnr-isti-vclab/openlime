import { BoundingBox } from './BoundingBox.js'

/**
 * Represents an annotation that can be drawn as an overlay on a canvas.
 * An annotation is a decorative element (text, graphics, glyph) that provides
 * additional context or information for interpreting underlying drawings.
 * 
 * Each annotation includes:
 * - A unique identifier
 * - Optional metadata (description, category, code, label)
 * - Visual representation (SVG, image, or element collection)
 * - Spatial information (region or bounding box)
 * - Style and state properties
 * 
 * Annotations can be serialized to/from JSON-LD format for interoperability
 * with Web Annotation standards.
 */
class Annotation {
  /**
   * Creates a new Annotation instance.
   * @param {Object} [options] - Configuration options for the annotation.
   * @param {string} [options.id] - Unique identifier for the annotation. Auto-generated if not provided.
   * @param {string} [options.label=''] - Display label for the annotation.
   * @param {string} [options.description] - HTML text containing a comprehensive description.
   * @param {string} [options.class] - Category or classification of the annotation.
   * @param {string} [options.target] - Target element or area this annotation refers to.
   * @param {string} [options.svg] - SVG content for the annotation.
   * @param {Object} [options.type] - Semantic type of the annotation.
   * @param {Object} [options.data={}] - Additional custom data for the annotation.
   * @param {boolean} [options.visible=true] - Visibility state of the annotation.
   * @param {Object} [options.state] - State variables for the annotation.
   * @param {boolean} [options.ready=false] - Indicates if SVG conversion is complete.
   * @param {boolean} [options.needsUpdate=true] - Indicates if annotation needs updating.
   * @param {boolean} [options.editing=false] - Indicates if annotation is being edited.
   */
  constructor(options = {}) {
    const legacyClass = options.class ?? null;
    const semanticClass = options.semanticClass ?? legacyClass;
    // Set default properties
    this.id = options.id ?? Annotation.generateUUID();
    this.label = options.label ?? '';
    this.description = options.description ?? null;
    this.class = legacyClass ?? semanticClass;
    this.semanticClass = semanticClass;
    this.structuralClass = options.structuralClass ?? null;
    this.target = options.target ?? null;
    this.svg = options.svg ?? null;
    this.type = options.type ?? '';
    this.data = options.data ?? {};
    this.visible = options.visible ?? true;
    this.state = options.state ?? null;
    this.ready = options.ready ?? false;
    this.needsUpdate = options.needsUpdate ?? true;
    this.editing = options.editing ?? false;
    this.publish = options.publish ?? 1; 
    // Initialize elements array
    this.elements = Array.isArray(options.elements) ? options.elements : [];
  }

  /**
   * Generates a UUID (Universally Unique Identifier) for annotation instances.
   * @returns {string} A newly generated UUID.
   * @private
   */
  static generateUUID() {
    // Use modern approach for UUID generation
    return 'a' + ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

  /**
   * Calculates and returns the bounding box of the annotation based on its elements or region.
   * The coordinates are always relative to the top-left corner of the canvas.
   * @returns {BoundingBox} The calculated bounding box of the annotation.
   */
  getBBoxFromElements() {
    // If no elements exist, use region or return empty bounding box
    if (!this.elements.length) {
      if (this.region == null) {
        return new BoundingBox();
      }
      
      const r = this.region;
      return new BoundingBox({ 
        xLow: r.x, 
        yLow: r.y, 
        xHigh: r.x + r.w, 
        yHigh: r.y + r.h 
      });
    }
    
    // Calculate bounding box from elements
    const firstBBox = this.elements[0].getBBox();
    let x = firstBBox.x;
    let y = firstBBox.y;
    let width = firstBBox.width;
    let height = firstBBox.height;
    
    // Expand bounding box to encompass all elements
    for (let i = 1; i < this.elements.length; i++) {
      const { x: sx, y: sy, width: swidth, height: sheight } = this.elements[i].getBBox();
      
      x = Math.min(x, sx);
      y = Math.min(y, sy); // Fixed: comparing y with sy instead of x with sy
      
      const xMax = Math.max(x + width, sx + swidth);
      const yMax = Math.max(y + height, sy + sheight);
      
      width = xMax - x;
      height = yMax - y;
    }
    
    return new BoundingBox({ 
      xLow: x, 
      yLow: y, 
      xHigh: x + width, 
      yHigh: y + height // Fixed: using height instead of width 
    });
  }

  /**
   * Serializes all SVG DOM elements into `this.svg` as a single SVG string.
   * Wraps multiple elements in a `<g>` group; single element is serialized directly.
   * Call this after modifying `elements` to keep `svg` in sync for export/other viewers.
   * @returns {string|null} The serialized SVG string, or null if no elements.
   */
  syncSvg() {
    if (!this.elements.length) return null;
    const serializer = new XMLSerializer();
    let svgStr;
    if (this.elements.length === 1) {
      svgStr = serializer.serializeToString(this.elements[0]);
    } else {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      for (const el of this.elements) g.appendChild(el.cloneNode(true));
      svgStr = serializer.serializeToString(g);
    }
    this.svg = svgStr;
    // Mark ready so prefetch does not re-parse svg back into elements
    // (elements are already live DOM nodes; re-parsing would lose them)
    this.ready = true;
    return svgStr;
  }

  /**
   * @param {Object} entry - The JSON-LD object representing an annotation.
   * @returns {Annotation} A new Annotation instance.
   * @throws {Error} If the entry is not a valid JSON-LD annotation or contains unsupported selectors.
   */
  static fromJsonLd(entry) {
    if (entry.type !== 'Annotation') {
      throw new Error("Not a valid JSON-LD annotation");
    }
    
    const options = { id: entry.id };

    // Map JSON-LD properties to annotation properties
    const propertyMap = { 
      'identifying': 'code', 
      'classifying': 'class', 
      'describing': 'description' 
    };
    
    if (Array.isArray(entry.body)) {
      for (const item of entry.body) {
        const field = propertyMap[item.purpose];
        if (field) {
          options[field] = item.value;
          if (field === 'class' && options.semanticClass == null) {
            options.semanticClass = item.value;
          }
        }
      }
    }

    if (entry.class != null && options.class == null) {
      options.class = entry.class;
    }
    if (entry.semanticClass != null) {
      options.semanticClass = entry.semanticClass;
    }
    if (entry.structuralClass != null) {
      options.structuralClass = entry.structuralClass;
    }
    
    // Process target selector if present
    const selector = entry.target?.selector;
    if (selector) {
      switch (selector.type) {
        case 'SvgSelector':
          options.svg = selector.value;
          options.elements = [];
          break;
        default:
          throw new Error(`Unsupported selector: ${selector.type}`);
      }
    }
    
    return new Annotation(options);
  }

  /**
   * Converts the annotation to a JSON-LD format object.
   * @returns {Object} A JSON-LD representation of the annotation.
   */
  toJsonLd() {
    const body = [];
    
    // Add properties to body if they exist
    if (this.code !== null) {
      body.push({ 
        type: 'TextualBody', 
        value: this.code, 
        purpose: 'identifying' // Fixed: correct spelling
      });
    }
    
    const semanticClass = this.semanticClass ?? this.class;
    if (semanticClass !== null) {
      body.push({ 
        type: 'TextualBody', 
        value: semanticClass, 
        purpose: 'classifying' 
      });
    }
    
    if (this.description !== null) {
      body.push({ 
        type: 'TextualBody', 
        value: this.description, 
        purpose: 'describing' 
      });
    }

    // Create the base JSON-LD object
    const jsonLd = {
      "@context": "http://www.w3.org/ns/anno.jsonld",
      id: this.id,
      type: "Annotation",
      body: body,
      class: this.class ?? semanticClass ?? null,
      semanticClass: semanticClass ?? null,
      structuralClass: this.structuralClass ?? null,
      target: { selector: {} }
    };
    
    // Add target information if available
    if (this.target) {
      jsonLd.target.selector.source = this.target;
    }

    // Add SVG representation if elements exist
    if (this.elements.length > 0) {
      this.syncSvg();
      jsonLd.target.selector.type = 'SvgSelector';
      jsonLd.target.selector.value = this.svg;
    } else if (this.svg) {
      // Use existing SVG if available
      jsonLd.target.selector.type = 'SvgSelector';
      jsonLd.target.selector.value = this.svg;
    }
    
    return jsonLd;
  }
}

export { Annotation }
