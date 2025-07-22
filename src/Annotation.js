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
   * @param {number} [options.idx] - Index or position of the annotation.
   * @param {string} [options.code] - A code identifier for the annotation.
   * @param {string} [options.label=''] - Display label for the annotation.
   * @param {string} [options.description] - HTML text containing a comprehensive description.
   * @param {string} [options.class] - Category or classification of the annotation.
   * @param {string} [options.target] - Target element or area this annotation refers to.
   * @param {string} [options.svg] - SVG content for the annotation.
   * @param {Object} [options.image] - Image data associated with the annotation.
   * @param {Object} [options.region] - Region coordinates {x, y, w, h} for the annotation.
   * @param {Object} [options.data={}] - Additional custom data for the annotation.
   * @param {Object} [options.style] - Style configuration for rendering.
   * @param {BoundingBox} [options.bbox] - Bounding box of the annotation.
   * @param {boolean} [options.visible=true] - Visibility state of the annotation.
   * @param {Object} [options.state] - State variables for the annotation.
   * @param {boolean} [options.ready=false] - Indicates if SVG conversion is complete.
   * @param {boolean} [options.needsUpdate=true] - Indicates if annotation needs updating.
   * @param {boolean} [options.editing=false] - Indicates if annotation is being edited.
   */
  constructor(options = {}) {
    // Set default properties
    this.id = options.id ?? Annotation.generateUUID();
    this.idx = options.idx ?? null;
    this.code = options.code ?? null;
    this.label = options.label ?? '';
    this.description = options.description ?? null;
    this.class = options.class ?? null;
    this.target = options.target ?? null;
    this.svg = options.svg ?? null;
    this.image = options.image ?? null;
    this.region = options.region ?? null;
    this.data = options.data ?? {};
    this.style = options.style ?? null;
    this.bbox = options.bbox ?? null;
    this.visible = options.visible ?? true;
    this.state = options.state ?? null;
    this.ready = options.ready ?? false;
    this.needsUpdate = options.needsUpdate ?? true;
    this.editing = options.editing ?? false;
    
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
   * Creates an Annotation instance from a JSON-LD format object.
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
        }
      }
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
    
    if (this.class !== null) {
      body.push({ 
        type: 'TextualBody', 
        value: this.class, 
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
      target: { selector: {} }
    };
    
    // Add target information if available
    if (this.target) {
      jsonLd.target.selector.source = this.target;
    }

    // Add SVG representation if elements exist
    if (this.elements.length > 0) {
      // Get the first element or combine them if needed
      const element = this.elements[0]; // Simplified for now
      if (element) {
        const serializer = new XMLSerializer();
        jsonLd.target.selector.type = 'SvgSelector';
        jsonLd.target.selector.value = serializer.serializeToString(element);
      }
    } else if (this.svg) {
      // Use existing SVG if available
      jsonLd.target.selector.type = 'SvgSelector';
      jsonLd.target.selector.value = this.svg;
    }
    
    return jsonLd;
  }
}

export { Annotation }