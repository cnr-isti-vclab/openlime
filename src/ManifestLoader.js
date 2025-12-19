/**
 * OpenLIME Manifest Loader
 * Converts JSON manifest into functional OpenLIME viewer instances
 * Supports loading manifest from URLs using OpenLIME fetch utilities
 */
class ManifestLoader {
  
  /**
   * Loads and creates a viewer from a manifest URL
   * @param {string} manifestUrl - URL to the manifest JSON file
   * @returns {Promise<OpenLIME.Viewer>} - Created viewer instance
   */
  static async load(manifestUrl) {
    try {
      console.log(`📥 Loading manifest from: ${manifestUrl}`);
      
      // Use OpenLIME's fetch utility pattern if available, otherwise fallback
      const manifest = await this.fetchJson(manifestUrl);
      
      console.log('✅ Manifest loaded successfully:', manifest);
      return this.createViewer(manifest);
    } catch (error) {
      console.error('❌ Error loading manifest:', error);
      throw error;
    }
  }

  /**
   * Creates a viewer directly from a manifest object
   * @param {Object} manifest - Manifest configuration object  
   * @param {string} [baseUrl] - Base URL for resolving relative paths in manifest
   * @returns {OpenLIME.Viewer} - Created viewer instance
   */
  static createViewer(manifest, baseUrl = '') {
    // Store base URL for resolving relative paths
    this._baseUrl = baseUrl;
    
    // Validate manifest version
    if (!manifest.version) {
      console.warn('⚠️ Manifest missing version field');
    }

    console.log(`🚀 Creating viewer from manifest v${manifest.version || 'unknown'}`);

    // 1. Create the main viewer with only basic options
    const viewerOptions = { ...manifest.viewer };
    
    // Extract and separate camera config and container
    const cameraConfig = viewerOptions.camera;
    const container = viewerOptions.container;
    delete viewerOptions.camera;
    delete viewerOptions.container;
    
    // Create viewer with basic options only
    const viewer = new OpenLIME.Viewer(container, viewerOptions);
    
    // 2. Configure camera after viewer creation
    if (cameraConfig) {
      this.configureCamera(viewer.camera, cameraConfig);
    }
    
    // Store layer references for later use
    const layerReferences = {};
    const complexLayers = {}; // For layers that need other layers (lens, combiner, etc.)
    
    // 3. Create and add layers in two phases:
    //    Phase 1: Create all basic layers first (image, rti, ptm, etc.)
    for (const [id, config] of Object.entries(manifest.layers)) {
      if (config.type === 'lens' || config.type === 'combiner') {
        complexLayers[id] = config; // Store complex layers for later
      } else {
        const layer = this.createLayer(config, manifest.shaders, viewer);
        viewer.addLayer(id, layer);
        layerReferences[id] = layer;
        console.log(`✅ Created ${config.type} layer: ${id}`);
      }
    }
    
    //    Phase 2: Create complex layers after all referenced layers exist
    for (const [id, config] of Object.entries(complexLayers)) {
      const layer = this.createComplexLayer(config, layerReferences, viewer, manifest.shaders);
      viewer.addLayer(id, layer);
      layerReferences[id] = layer;
      console.log(`✅ Created ${config.type} layer: ${id}`);
    }
    
    // 4. Set up controllers
    this.setupControllers(viewer, manifest.controllers || [], layerReferences);
    
    // 5. Configure UI
    if (manifest.ui) {
      this.setupUI(viewer, manifest.ui);
    }
    
    // 6. Set up connections (lens, synchronization, etc.)
    if (manifest.connections) {
      this.setupConnections(viewer, manifest.connections, layerReferences);
    }
    
    // 7. Configure events
    if (manifest.events) {
      this.setupEvents(viewer, manifest.events, layerReferences);
    }
    
    // 8. Load plugins
    if (manifest.plugins) {
      this.loadPlugins(manifest.plugins, viewer);
    }
    
    return viewer;
  }

  /**
   * Fetch JSON using OpenLIME patterns with proper error handling
   * @param {string} url - URL to fetch
   * @returns {Promise<Object>} - Parsed JSON object
   */
  static async fetchJson(url) {
    try {
      // Resolve relative URL if needed
      const resolvedUrl = this.resolveUrl(url);
      
      console.log(`🌐 Fetching JSON from: ${resolvedUrl}`);
      
      // Use OpenLIME fetch utility if available, otherwise standard fetch
      let response;
      if (typeof OpenLIME !== 'undefined' && OpenLIME.fetchJson) {
        // Use OpenLIME's fetch utility if available
        return await OpenLIME.fetchJson(resolvedUrl);
      } else if (typeof OpenLIME !== 'undefined' && OpenLIME.fetch) {
        // Use OpenLIME's general fetch utility
        response = await OpenLIME.fetch(resolvedUrl);
      } else {
        // Fallback to standard fetch with OpenLIME-style error handling
        response = await fetch(resolvedUrl);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn(`⚠️ Expected JSON content-type, got: ${contentType}`);
      }
      
      const text = await response.text();
      if (!text.trim()) {
        throw new Error('Response body is empty');
      }
      
      try {
        return JSON.parse(text);
      } catch (parseError) {
        throw new Error(`JSON parse error: ${parseError.message}`);
      }
      
    } catch (error) {
      // Enhanced error reporting following OpenLIME patterns
      const errorMsg = `Failed to fetch JSON from ${url}: ${error.message}`;
      console.error('❌', errorMsg, error);
      
      // Provide helpful debugging information
      if (error.message.includes('CORS')) {
        console.error('💡 CORS issue detected. Make sure the server allows cross-origin requests.');
      } else if (error.message.includes('404')) {
        console.error('💡 File not found. Check the URL path and file location.');
      } else if (error.message.includes('parse')) {
        console.error('💡 Invalid JSON format. Check the manifest file syntax.');
      }
      
      throw new Error(errorMsg);
    }
  }

  /**
   * Resolve URL relative to base URL or current location
   * @param {string} url - URL to resolve
   * @returns {string} - Resolved absolute URL
   */
  static resolveUrl(url) {
    // If already absolute URL, return as-is
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return url;
    }
    
    // If no base URL set, resolve relative to current location
    if (!this._baseUrl) {
      return new URL(url, window.location.href).href;
    }
    
    // Resolve relative to base URL
    return new URL(url, this._baseUrl).href;
  }

  /**
   * Load multiple manifests and merge them
   * @param {string[]} manifestUrls - Array of manifest URLs to load and merge
   * @param {Object} [mergeOptions] - Options for merging manifests
   * @returns {Promise<OpenLIME.Viewer>} - Created viewer instance
   */
  static async loadMultiple(manifestUrls, mergeOptions = {}) {
    try {
      console.log(`📥 Loading ${manifestUrls.length} manifests for merging`);
      
      const manifests = await Promise.all(
        manifestUrls.map(url => this.fetchJson(url))
      );
      
      const mergedManifest = this.mergeManifests(manifests, mergeOptions);
      return this.createViewer(mergedManifest);
      
    } catch (error) {
      console.error('❌ Error loading multiple manifests:', error);
      throw error;
    }
  }

  /**
   * Merge multiple manifest objects
   * @param {Object[]} manifests - Array of manifest objects to merge
   * @param {Object} [options] - Merge options
   * @returns {Object} - Merged manifest
   */
  static mergeManifests(manifests, options = {}) {
    if (manifests.length === 0) {
      throw new Error('No manifests to merge');
    }
    
    if (manifests.length === 1) {
      return manifests[0];
    }
    
    const baseManifest = { ...manifests[0] };
    
    for (let i = 1; i < manifests.length; i++) {
      const manifest = manifests[i];
      
      // Merge layers (combine all layers)
      if (manifest.layers) {
        baseManifest.layers = { ...baseManifest.layers, ...manifest.layers };
      }
      
      // Merge controllers (append to array)
      if (manifest.controllers) {
        baseManifest.controllers = [
          ...(baseManifest.controllers || []),
          ...manifest.controllers
        ];
      }
      
      // Merge connections
      if (manifest.connections) {
        baseManifest.connections = {
          lenses: [
            ...(baseManifest.connections?.lenses || []),
            ...(manifest.connections.lenses || [])
          ],
          synchronization: [
            ...(baseManifest.connections?.synchronization || []),
            ...(manifest.connections.synchronization || [])
          ]
        };
      }
      
      // Merge shaders
      if (manifest.shaders) {
        baseManifest.shaders = { ...baseManifest.shaders, ...manifest.shaders };
      }
      
      // Merge plugins
      if (manifest.plugins) {
        baseManifest.plugins = [
          ...(baseManifest.plugins || []),
          ...manifest.plugins
        ];
      }
    }
    
    console.log(`✅ Merged ${manifests.length} manifests into one`);
    return baseManifest;
  }

  /**
   * Validate a manifest object
   * @param {Object} manifest - Manifest to validate
   * @returns {Object} - Validation result with errors and warnings
   */
  static validateManifest(manifest) {
    const errors = [];
    const warnings = [];
    
    // Required fields
    if (!manifest.version) {
      warnings.push('Missing version field');
    }
    
    if (!manifest.viewer) {
      errors.push('Missing viewer configuration');
    } else {
      if (!manifest.viewer.container) {
        errors.push('Missing viewer.container');
      }
    }
    
    if (!manifest.layers || Object.keys(manifest.layers).length === 0) {
      errors.push('No layers defined');
    }
    
    // Validate layer references
    if (manifest.layers) {
      for (const [layerId, layer] of Object.entries(manifest.layers)) {
        if ((layer.type === 'lens' || layer.type === 'combiner') && layer.layers) {
          for (const refId of layer.layers) {
            if (!manifest.layers[refId]) {
              errors.push(`${layer.type} layer "${layerId}" references non-existent layer "${refId}"`);
            }
          }
        }
      }
    }
    
    // Validate controller targets
    if (manifest.controllers) {
      for (const controller of manifest.controllers) {
        if (controller.target && !manifest.layers[controller.target]) {
          errors.push(`Controller "${controller.type}" targets non-existent layer "${controller.target}"`);
        }
      }
    }
    
    return { errors, warnings };
  }

  /**
   * Configures camera properties
   */
  static configureCamera(camera, config) {
    for (const [key, value] of Object.entries(config)) {
      if (key in camera) {
        camera[key] = value;
      } else {
        console.warn(`⚠️ Unknown camera property: ${key}`);
      }
    }
  }

  /**
   * Creates a regular (non-complex) layer based on configuration
   */
  static createLayer(config, shaders = {}, viewer) {
    const layerConfig = { ...config };
    
    // Resolve relative URLs in layer config
    if (layerConfig.url) {
      layerConfig.url = this.resolveUrl(layerConfig.url);
    }
    
    // Remove manifest-specific properties that aren't part of OpenLIME Layer constructor
    delete layerConfig.shader;
    
    // Create the layer
    const layer = new OpenLIME.Layer(layerConfig);
    
    return layer;
  }

  /**
   * Creates a complex layer (lens, combiner) with resolved layer references
   */
  static createComplexLayer(config, layerReferences, viewer, shaders = {}) {
    switch (config.type) {
      case 'lens':
        return this.createLensLayer(config, layerReferences, viewer);
        
      case 'combiner':
        return this.createCombinerLayer(config, layerReferences, viewer, shaders);
        
      default:
        console.warn(`Unknown complex layer type: ${config.type}`);
        return null;
    }
  }

  /**
   * Creates a lens layer with resolved layer references
   */
  static createLensLayer(config, layerReferences, viewer) {
    // Resolve the layer references
    const referencedLayers = [];
    if (config.layers && Array.isArray(config.layers)) {
      for (const layerId of config.layers) {
        if (layerReferences[layerId]) {
          referencedLayers.push(layerReferences[layerId]);
          console.log(`📎 Resolved layer reference for lens: ${layerId}`);
        } else {
          console.warn(`⚠️ Layer reference not found: ${layerId}`);
        }
      }
    }
    
    if (referencedLayers.length === 0) {
      console.warn('⚠️ Lens layer has no valid layer references');
    }
    
    // Create lens layer with resolved references
    const lensLayer = new OpenLIME.Layer({
      type: "lens",
      layers: referencedLayers,  // Direct layer references, not IDs
      camera: viewer.camera,     // Direct camera reference
      radius: config.options?.radius || 200,
      border: config.options?.border || 10,
      visible: config.visible !== false,
      ...config.options
    });
    
    console.log(`🔍 Created lens layer with ${referencedLayers.length} referenced layers`);
    
    return lensLayer;
  }

  /**
   * Creates a combiner layer with resolved layer references
   */
  static createCombinerLayer(config, layerReferences, viewer, shaders = {}) {
    // Resolve the layer references
    const referencedLayers = [];
    if (config.layers && Array.isArray(config.layers)) {
      for (const layerId of config.layers) {
        if (layerReferences[layerId]) {
          referencedLayers.push(layerReferences[layerId]);
          console.log(`📎 Resolved layer reference for combiner: ${layerId}`);
        } else {
          console.warn(`⚠️ Layer reference not found: ${layerId}`);
        }
      }
    }
    
    if (referencedLayers.length === 0) {
      console.warn('⚠️ Combiner layer has no valid layer references');
    }
    
    // Create combiner layer with resolved references
    const combinerLayer = new OpenLIME.Layer({
      type: 'combiner',
      layers: referencedLayers,  // Direct layer references, not IDs
      visible: config.visible !== false,
      ...config.options
    });
    
    // Handle shader assignment
    if (config.shader && shaders[config.shader]) {
      const shader = this.createShader(shaders[config.shader]);
      combinerLayer.shaders = { 'standard': shader };
      combinerLayer.setShader('standard');
      console.log(`🎨 Applied shader ${config.shader} to combiner`);
    }
    
    console.log(`⚡ Created combiner layer with ${referencedLayers.length} referenced layers`);
    
    return combinerLayer;
  }

  /**
   * Creates a shader based on configuration
   */
  static createShader(config) {
    switch (config.type) {
      case 'combiner':
        const shader = new OpenLIME.ShaderCombiner();
        if (config.mode) {
          shader.mode = config.mode;
        }
        if (config.uniforms) {
          Object.assign(shader.uniforms, config.uniforms);
        }
        return shader;
        
      case 'rti':
        // Handle RTI shaders
        break;
        
      case 'ptm':
        // Handle PTM shaders
        break;
        
      default:
        console.warn(`Unknown shader type: ${config.type}`);
        return null;
    }
  }

  /**
   * Sets up controllers for the viewer
   */
  static setupControllers(viewer, controllers, layerReferences) {
    for (const controllerConfig of controllers) {
      const controller = this.createController(controllerConfig, layerReferences, viewer);
      if (controller) {
        console.log(`🎮 Controller ${controllerConfig.type} created successfully`);
      }
    }
  }

  /**
   * Creates a controller based on configuration
   */
  static createController(config, layerReferences, viewer) {
    switch (config.type) {
      case 'pan':
        // Pan controller is usually auto-added by OpenLIME, skip manual creation
        console.log('🎮 Pan controller: using default OpenLIME pan controller');
        return true;
        
      case 'pinch':
        // Pinch controller is usually auto-added by OpenLIME, skip manual creation  
        console.log('🎮 Pinch controller: using default OpenLIME pinch controller');
        return true;
        
      case 'light':
        const targetLayer = layerReferences[config.target];
        if (targetLayer) {
          // Light controllers are typically auto-created for RTI/PTM layers
          console.log('🎮 Light controller: should be auto-created for RTI/PTM layers');
          return true;
        }
        break;
        
      case 'focusContext':
        // Special handling for lens controller - this is the main custom controller
        const lensLayer = layerReferences[config.target];
        if (lensLayer) {
          const controller = new OpenLIME.ControllerFocusContext({
            lensLayer: lensLayer,
            camera: viewer.camera,
            canvas: viewer.canvas,
            ...config.options
          });
          
          // Add to pointer manager and lens layer controllers as in original
          viewer.pointerManager.onEvent(controller);
          lensLayer.controllers.push(controller);
          
          console.log('🎮 ControllerFocusContext created and attached');
          return controller;
        } else {
          console.warn(`⚠️ Lens layer not found for focusContext controller: ${config.target}`);
        }
        break;
        
      default:
        console.warn(`Unknown controller type: ${config.type}`);
        return null;
    }
  }

  /**
   * Sets up UI based on configuration
   */
  static setupUI(viewer, uiConfig) {
    // Load skin if specified
    if (uiConfig.skin?.url) {
      const skinUrl = this.resolveUrl(uiConfig.skin.url);
      console.log(`🎨 Loading skin from: ${skinUrl}`);
      OpenLIME.Skin.setUrl(skinUrl);
    }
    
    // Create UI based on type
    let ui;
    switch (uiConfig.type) {
      case 'multispectral':
        // This would need the specific layer
        break;
        
      case 'basic':
      default:
        const uiOptions = {};
        if (uiConfig.autofit !== undefined) {
          uiOptions.autofit = uiConfig.autofit;
        }
        ui = new OpenLIME.UIBasic(viewer, uiOptions);
        break;
    }
    
    // Configure actions
    if (ui && uiConfig.actions) {
      for (const [actionName, actionConfig] of Object.entries(uiConfig.actions)) {
        if (ui.actions[actionName]) {
          Object.assign(ui.actions[actionName], actionConfig);
        }
      }
    }
    
    // Set attribution
    if (ui && uiConfig.attribution) {
      ui.attribution = uiConfig.attribution;
    }
    
    // Set pixel size for measurements
    if (ui && uiConfig.pixelSize) {
      ui.pixelSize = uiConfig.pixelSize;
    }
    
    return ui;
  }

  /**
   * Sets up connections between layers
   */
  static setupConnections(viewer, connections, layerReferences) {
    // Handle lens connections
    if (connections.lenses) {
      for (const lensConnection of connections.lenses) {
        this.setupLensConnection(lensConnection, layerReferences, viewer);
      }
    }
    
    // Handle synchronization
    if (connections.synchronization) {
      for (const syncConfig of connections.synchronization) {
        this.setupSynchronization(syncConfig, layerReferences);
      }
    }
  }

  /**
   * Sets up a lens connection
   */
  static setupLensConnection(lensConnection, layerReferences, viewer) {
    const sourceLayer = layerReferences[lensConnection.source];
    const targetLayer = layerReferences[lensConnection.target];
    
    if (!sourceLayer || !targetLayer) {
      console.warn(`Lens connection failed: missing layer ${lensConnection.source} or ${lensConnection.target}`);
      return;
    }
    
    console.log(`🔗 Lens connection established: ${lensConnection.source} -> ${lensConnection.target}`);
  }

  /**
   * Sets up synchronization between layers
   */
  static setupSynchronization(syncConfig, layerReferences) {
    // Implementation would depend on specific synchronization requirements
    // This is a placeholder for the synchronization logic
    console.log('🔗 Setting up synchronization for layers:', syncConfig.layers);
  }

  /**
   * Sets up event handlers
   */
  static setupEvents(viewer, events, layerReferences) {
    // Handle gesture events
    if (events.gestures) {
      for (const [gestureType, gestureConfig] of Object.entries(events.gestures)) {
        if (gestureConfig.enabled !== false) {
          this.setupGestureEvent(viewer, gestureType, gestureConfig);
        }
      }
    }
    
    // Handle custom events
    if (events.custom) {
      for (const eventConfig of events.custom) {
        this.setupCustomEvent(viewer, eventConfig, layerReferences);
      }
    }
  }

  /**
   * Sets up a gesture event
   */
  static setupGestureEvent(viewer, gestureType, gestureConfig) {
    const handler = this.resolveHandler(gestureConfig.handler);
    if (handler) {
      viewer.pointerManager.on(gestureType, {
        [gestureType]: handler,
        priority: gestureConfig.priority || 0
      });
    }
  }

  /**
   * Sets up a custom event
   */
  static setupCustomEvent(viewer, eventConfig, layerReferences) {
    const target = eventConfig.target === 'viewer' ? viewer : layerReferences[eventConfig.target];
    const handler = this.resolveHandler(eventConfig.handler);
    
    if (target && handler) {
      target.addEvent(eventConfig.event, handler);
    }
  }

  /**
   * Resolves handler function from string name or function
   */
  static resolveHandler(handler) {
    if (typeof handler === 'function') {
      return handler;
    } else if (typeof handler === 'string') {
      // Look for the function in global scope or predefined handlers
      if (window[handler]) {
        return window[handler];
      } else {
        console.warn(`Handler function not found: ${handler}`);
        return null;
      }
    }
    return null;
  }

  /**
   * Loads plugins asynchronously
   */
  static async loadPlugins(plugins, viewer) {
    for (const plugin of plugins) {
      try {
        await this.loadPlugin(plugin, viewer);
      } catch (error) {
        console.error(`Failed to load plugin ${plugin.name}:`, error);
      }
    }
  }

  /**
   * Loads a single plugin
   */
  static async loadPlugin(plugin, viewer) {
    if (plugin.url) {
      // Resolve plugin URL
      const pluginUrl = this.resolveUrl(plugin.url);
      console.log(`🔌 Loading plugin: ${plugin.name} from ${pluginUrl}`);
      
      // Dynamically load the plugin script
      const script = document.createElement('script');
      script.src = pluginUrl;
      
      return new Promise((resolve, reject) => {
        script.onload = () => {
          // Plugin loaded, initialize if needed
          if (window[plugin.name]) {
            const pluginInstance = new window[plugin.name](viewer, plugin.config);
            console.log(`✅ Plugin ${plugin.name} loaded and initialized`);
            resolve(pluginInstance);
          } else {
            console.log(`✅ Plugin ${plugin.name} loaded`);
            resolve();
          }
        };
        script.onerror = (error) => {
          console.error(`❌ Failed to load plugin script: ${pluginUrl}`);
          reject(error);
        };
        document.head.appendChild(script);
      });
    }
  }
}

// Register in OpenLIME namespace if available
if (typeof OpenLIME !== 'undefined') {
  OpenLIME.ManifestLoader = ManifestLoader;
}

export { ManifestLoader };