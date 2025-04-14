import { CoordinateSystem } from "./CoordinateSystem.js";

/**
 * GeoreferenceManager for working with geographic coordinates in OpenLIME
 * Handles conversions between geographic coordinates (EPSG:4326/WGS84) and 
 * Web Mercator (EPSG:3857) and managing map navigation.
 */
class GeoreferenceManager {
  /**
   * Creates a new GeoreferenceManager
   * @param {Object} viewer - OpenLIME Viewer instance
   * @param {Object} layer - Layer containing the geographic image
   */
  constructor(viewer, layer) {
    if (!viewer || !layer) {
      throw new Error('Viewer and layer are required');
    }

    this.viewer = viewer;
    this.camera = viewer.camera;
    this.layer = layer;
    this.earthRadius = 6378137; // Earth radius in meters (WGS84)
    this.imageSize = Math.max(this.layer.width, this.layer.height);
    
    // Define zoom constraints
    this.minZoom = 0;  // Minimum zoom level
    this.maxZoom = 19; // Maximum zoom level (from OSM)

    // Set up camera position methods
    this.setupViewer();
  }

  /**
   * Configures the viewer with geographic navigation methods
   * @private
   */
  setupViewer() {
    // Add method to navigate to geographic coordinates
    this.camera.setGeoPosition = (lat, lon, zoom) => {
      const sceneCoord = this.geoToScene(lat, lon);
      
      // Constrain zoom to valid range
      const constrainedZoom = Math.min(this.maxZoom, Math.max(this.minZoom, zoom));
      const z = constrainedZoom !== undefined ? 1 / Math.pow(2, constrainedZoom) : this.camera.getCurrentTransform(performance.now()).z;

      // Notice we need to negate the coordinates and scale by z
      this.camera.setPosition(250, -sceneCoord.x * z, -sceneCoord.y * z, z, 0);
    };

    // Add method to get current geographic position
    this.camera.getGeoPosition = () => {
      const transform = this.camera.getCurrentTransform(performance.now());

      // Need to negate and unscale coordinates before converting to geo
      const geo = this.sceneToGeo(-transform.x / transform.z, -transform.y / transform.z);
      
      // Calculate zoom level and ensure it's within valid range
      const rawZoom = Math.log2(1 / transform.z);
      const constrainedZoom = Math.min(this.maxZoom, Math.max(this.minZoom, rawZoom));

      return {
        lat: geo.lat,
        lon: geo.lon,
        zoom: constrainedZoom
      };
    };
  }

  /**
   * Converts WGS84 (EPSG:4326) coordinates to Web Mercator (EPSG:3857)
   * @param {number} lat - Latitude in degrees
   * @param {number} lon - Longitude in degrees
   * @returns {Object} Point in Web Mercator coordinates {x, y}
   */
  geoToWebMercator(lat, lon) {
    // Clamp latitude to avoid singularity at poles
    lat = Math.max(Math.min(lat, 85.051129), -85.051129);

    // Convert latitude and longitude to radians
    const latRad = lat * Math.PI / 180;
    const lonRad = lon * Math.PI / 180;

    // Calculate Web Mercator coordinates
    const x = this.earthRadius * lonRad;
    const y = this.earthRadius * Math.log(Math.tan(Math.PI / 4 + latRad / 2));

    return { x, y };
  }

  /**
   * Converts Web Mercator (EPSG:3857) coordinates to WGS84 (EPSG:4326)
   * @param {number} x - X coordinate in Web Mercator
   * @param {number} y - Y coordinate in Web Mercator
   * @returns {Object} Geographic coordinates {lat, lon} in degrees
   */
  webMercatorToGeo(x, y) {
    // Convert Web Mercator coordinates to latitude and longitude
    const lonRad = x / this.earthRadius;
    const latRad = 2 * Math.atan(Math.exp(y / this.earthRadius)) - Math.PI / 2;

    // Convert radians to degrees
    const lon = lonRad * 180 / Math.PI;
    const lat = latRad * 180 / Math.PI;

    return { lat, lon };
  }

  /**
   * Converts Web Mercator coordinates to Scene coordinates
   * @param {number} x - X coordinate in Web Mercator
   * @param {number} y - Y coordinate in Web Mercator
   * @returns {Object} Scene coordinates {x, y}
   */
  webMercatorToScene(x, y) {
    // Scale from Web Mercator to the scene coordinate system
    // Map is centered at 0,0 in scene coordinates
    const maxMercator = Math.PI * this.earthRadius;
    const scaleFactor = this.layer.width / (2 * maxMercator);

    return {
      x: x * scaleFactor,
      y: y * scaleFactor
    };
  }

  /**
   * Converts scene coordinates to Web Mercator
   * @param {number} x - X coordinate in scene space
   * @param {number} y - Y coordinate in scene space
   * @returns {Object} Web Mercator coordinates {x, y}
   */
  sceneToWebMercator(x, y) {
    // Scale from scene coordinate system to Web Mercator
    const maxMercator = Math.PI * this.earthRadius;
    const scaleFactor = (2 * maxMercator) / this.layer.width;

    return {
      x: x * scaleFactor,
      y: y * scaleFactor
    };
  }

  /**
   * Converts WGS84 coordinates to scene coordinates
   * @param {number} lat - Latitude in degrees
   * @param {number} lon - Longitude in degrees
   * @returns {Object} Scene coordinates {x, y}
   */
  geoToScene(lat, lon) {
    // Convert from WGS84 to Web Mercator
    const mercator = this.geoToWebMercator(lat, lon);
    // Convert from Web Mercator to scene coordinates
    return this.webMercatorToScene(mercator.x, mercator.y);
  }

  /**
   * Converts scene coordinates to WGS84 (EPSG:4326) coordinates
   * @param {number} x - X coordinate in scene space
   * @param {number} y - Y coordinate in scene space
   * @returns {Object} Geographic coordinates {lat, lon} in degrees
   */
  sceneToGeo(x, y) {
    // Convert from scene coordinates to Web Mercator
    const mercator = this.sceneToWebMercator(x, y);
    // Convert from Web Mercator to WGS84
    return this.webMercatorToGeo(mercator.x, mercator.y);
  }

  /**
   * Converts canvas HTML coordinates to WGS84 coordinates
   * @param {number} x - X coordinate in canvas
   * @param {number} y - Y coordinate in canvas
   * @returns {Object} Geographic coordinates {lat, lon} in degrees
   */
  canvasToGeo(x, y) {
    // Convert canvas coordinates to scene coordinates
    const sceneCoord = CoordinateSystem.fromCanvasHtmlToScene(
      { x, y },
      this.camera,
      true
    );
    // Convert scene coordinates to geographic coordinates
    return this.sceneToGeo(sceneCoord.x, sceneCoord.y);
  }

  /**
   * Navigate to a geographic position with animation
   * @param {number} lat - Latitude in degrees
   * @param {number} lon - Longitude in degrees
   * @param {number} [zoom] - Zoom level (optional)
   * @param {number} [duration=250] - Animation duration in ms
   * @param {string} [easing='linear'] - Easing function
   */
  flyTo(lat, lon, zoom, duration = 500, easing = 'linear') {
    if (!this.viewer || !this.camera) {
      throw new Error('Viewer not initialized');
    }
    const sceneCoord = this.geoToScene(lat, lon);
    
    // Constrain zoom to valid range
    const constrainedZoom = Math.min(this.maxZoom, Math.max(this.minZoom, zoom));
    const z = 1.0 / Math.pow(2, constrainedZoom);

    // Note that we use negative coordinates because the camera transform works that way
    this.camera.setPosition(duration, -sceneCoord.x * z, -sceneCoord.y * z, z, 0, easing);
  }

  /**
   * Gets the current geographic position and zoom
   * @returns {Object} Current position {lat, lon, zoom}
   */
  getCurrentPosition() {
    const transform = this.camera.getCurrentTransform(performance.now());
    const geo = this.sceneToGeo(-transform.x / transform.z, -transform.y / transform.z);
    
    // Calculate zoom level and ensure it's within valid range
    const rawZoom = Math.log2(1 / transform.z);
    const constrainedZoom = Math.min(this.maxZoom, Math.max(this.minZoom, rawZoom));

    return {
      lat: geo.lat,
      lon: geo.lon,
      zoom: constrainedZoom
    };
  }
}

export { GeoreferenceManager }