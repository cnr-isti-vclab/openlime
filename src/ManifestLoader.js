/**
 * OpenLIME Manifest Loader (Truly Optimized)
 * Actually uses Canvas's native JSON layer creation capability
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
      
      const manifest = await this.fetchJson(manifestUrl);
      
      console.log('✅ Manifest loaded successfully:', manifest);
      return this.createViewer(manifest);
    } catch (error) {
      console.error('❌ Error loading manifest:', error);
      throw error;
    }
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
   * Creates a viewer from a manifest object
   * @param {Object} manifest - Manifest configuration object  
   * @param {string} [baseUrl] - Base URL for resolving relative paths in manifest
   * @returns {OpenLIME.Viewer} - Created viewer instance
   */
  static createViewer(manifest, baseUrl = '') {
    this._baseUrl = baseUrl;
    
    if (!manifest.version) {
      console.warn('⚠️ Manifest missing version field');
    }

    console.log(`🚀 Creating viewer from manifest v${manifest.version || 'unknown'}`);

    // 1. Prepare viewer options
    const viewerOptions = { ...manifest.viewer };
    const cameraConfig = viewerOptions.camera;
    const container = viewerOptions.container;
    delete viewerOptions.camera;
    delete viewerOptions.container;

    // 2. Process layers and resolve URLs
    const processedLayers = this.preprocessLayers(manifest.layers || {});
    
    // 3. Separate simple vs dependent vs complex layers
    const { simpleLayers, dependentLayers, complexLayers } = this.categorizeLayersForCreation(processedLayers);

    // 4. Create empty viewer, then add layers manually to avoid Canvas constructor conflicts
    console.log(`📦 Creating empty viewer, will add ${Object.keys(simpleLayers).length + Object.keys(dependentLayers).length + Object.keys(complexLayers).length} layers manually`);
    
    const viewer = new OpenLIME.Viewer(container, viewerOptions);
    
    console.log(`✅ Empty viewer created, canvas layers:`, Object.keys(viewer.canvas.layers));
    
    // Add simple layers manually using OpenLIME's type system (avoids Canvas constructor conflicts)
    for (const [id, config] of Object.entries(simpleLayers)) {
        console.log(`🔨 Adding simple layer '${id}' (${config.type || 'image'})`);
        try {
            const layer = new OpenLIME.Layer(config);
            viewer.addLayer(id, layer);
            console.log(`✅ Added simple layer '${id}': ${layer.constructor.name}`);
        } catch (error) {
            console.error(`❌ Failed to create simple layer '${id}':`, error);
            throw error;
        }
    }
    
    console.log(`📦 Simple layers complete. Canvas now has:`, Object.keys(viewer.canvas.layers));

    // Add dependent layers (layerSource) after their source layers exist
    for (const [id, config] of Object.entries(dependentLayers)) {
        console.log(`🔗 Adding dependent layer '${id}' (${config.type || 'image'})`);
        try {
            // Use derive() for layerSource
            const layerConfig = { ...config };
            if (config.layerSource) {
                const sourceLayer = viewer.canvas.layers[config.layerSource];
                if (sourceLayer) {
                    delete layerConfig.layerSource;
                    const layer = sourceLayer.derive(layerConfig);
                    viewer.addLayer(id, layer);
                    console.log(`✅ Added derived layer '${id}': ${layer.constructor.name}`);
                } else {
                    console.warn(`⚠️ layerSource not found: ${config.layerSource}`);
                    console.log(`   Available layers:`, Object.keys(viewer.canvas.layers));
                    // Fallback to creating normally
                    const layer = new OpenLIME.Layer(layerConfig);
                    viewer.addLayer(id, layer);
                    console.log(`✅ Added fallback layer '${id}': ${layer.constructor.name}`);
                }
            } else {
                // Should not happen
                const layer = new OpenLIME.Layer(layerConfig);
                viewer.addLayer(id, layer);
                console.log(`✅ Added dependent layer '${id}': ${layer.constructor.name}`);
            }
        } catch (error) {
            console.error(`❌ Failed to create dependent layer '${id}':`, error);
            throw error;
        }
    }
    
    console.log(`🔗 Dependent layers complete. Canvas now has:`, Object.keys(viewer.canvas.layers));
    
    // 5. Configure camera
    if (cameraConfig) {
      this.configureCamera(viewer.camera, cameraConfig);
    }

    // 6. Add complex layers that need dependency resolution  
    this.addComplexLayers(viewer, complexLayers, manifest.shaders);
    
    // 8. Set up controllers, UI, connections, events, plugins
    this.setupControllers(viewer, manifest.controllers || []);
    
    if (manifest.ui) {
      this.setupUI(viewer, manifest.ui);
    }
    
    if (manifest.connections) {
      this.setupConnections(viewer, manifest.connections);
    }
    
    if (manifest.events) {
      this.setupEvents(viewer, manifest.events);
    }
    
    if (manifest.plugins) {
      this.loadPlugins(manifest.plugins, viewer);
    }

    console.log(`🏁 Final viewer with ${Object.keys(viewer.canvas.layers).length} total layers:`, 
                Object.keys(viewer.canvas.layers));
    
    return viewer;
  }

  /**
   * Preprocess layers to resolve relative URLs
   */
  static preprocessLayers(layers) {
    console.log('🔄 Preprocessing layers...');
    const processedLayers = {};
    
    for (const [id, config] of Object.entries(layers)) {
      processedLayers[id] = { ...config };
      
      // Resolve relative URLs
      if (config.url) {
        const originalUrl = config.url;
        processedLayers[id].url = this.resolveUrl(config.url);
        console.log(`🔗 Resolved URL for '${id}': ${originalUrl} → ${processedLayers[id].url}`);
      }
    }
    
    return processedLayers;
  }

  /**
   * Categorize layers for Canvas auto-creation vs manual creation
   */
  static categorizeLayersForCreation(layers) {
    const simpleLayers = {};
    const dependentLayers = {};
    const complexLayers = {};
    
    for (const [id, config] of Object.entries(layers)) {
      // Complex layers that need dependency resolution
      if (config.type === 'lens' || config.type === 'combiner') {
        complexLayers[id] = config;
        console.log(`🔧 Marked '${id}' as complex (${config.type}) - will create manually`);
      }
      // Layers with layerSource dependency  
      else if (config.layerSource) {
        dependentLayers[id] = config;
        console.log(`🔗 Marked '${id}' as dependent (layerSource: ${config.layerSource}) - will create after source`);
      }
      else {
        // Simple layers that can be created first
        simpleLayers[id] = config;
        console.log(`📦 Marked '${id}' as simple (${config.type || 'image'}) - Canvas will auto-create`);
      }
    }
    
    return { simpleLayers, dependentLayers, complexLayers };
  }

  /**
   * Add simple layers manually using OpenLIME's native type system
   */
  static addSimpleLayers(viewer, simpleLayers) {
    if (Object.keys(simpleLayers).length === 0) {
      console.log('📦 No simple layers to add');
      return;
    }

    console.log(`🏭 Adding ${Object.keys(simpleLayers).length} simple layers manually...`);
    
    for (const [id, config] of Object.entries(simpleLayers)) {
      try {
        console.log(`🔨 Creating simple layer '${id}' (${config.type || 'image'})`);
        
        // Use OpenLIME's native Layer constructor with type system
        const layer = new OpenLIME.Layer(config);
        viewer.addLayer(id, layer);
        
        console.log(`✅ Added simple layer '${id}': ${layer.constructor.name}`);
      } catch (error) {
        console.error(`❌ Failed to create simple layer '${id}':`, error);
        throw error;
      }
    }
    
    console.log(`📦 Simple layers complete. Canvas now has:`, Object.keys(viewer.canvas.layers));
  }

  /**
   * Add complex layers that require dependency resolution
   */
  static addComplexLayers(viewer, complexLayers, shaders = {}) {
    if (Object.keys(complexLayers).length === 0) {
      console.log('📦 No complex layers to add');
      return;
    }

    console.log(`🔧 Adding ${Object.keys(complexLayers).length} complex layers...`);
    
    for (const [id, config] of Object.entries(complexLayers)) {
      let layer = null;
      
      if (config.type === 'lens') {
        layer = this.createLensLayer(config, viewer);
      } else if (config.type === 'combiner') {
        layer = this.createCombinerLayer(config, viewer, shaders);
      }
      
      if (layer) {
        viewer.addLayer(id, layer);
        console.log(`✅ Added complex ${config.type} layer: ${id}`);
      }
    }
  }

  /**
   * Create lens layer with resolved dependencies
   */
  static createLensLayer(config, viewer) {
    console.log('🔍 Creating lens layer...');
    const referencedLayers = [];
    
    if (config.layers && Array.isArray(config.layers)) {
      for (const layerId of config.layers) {
        const layer = viewer.canvas.layers[layerId];
        if (layer) {
          referencedLayers.push(layer);
          console.log(`📎 Resolved lens dependency: ${layerId}`);
        } else {
          console.warn(`⚠️ Lens layer reference not found: ${layerId}`);
          console.log(`   Available layers:`, Object.keys(viewer.canvas.layers));
        }
      }
    }
    
    console.log(`🔍 Creating lens with ${referencedLayers.length} referenced layers`);
    
    // Use native Layer creation with resolved dependencies
    return new OpenLIME.Layer({
      type: "lens",
      layers: referencedLayers,
      camera: viewer.camera,
      radius: config.options?.radius || 200,
      border: config.options?.border || 10,
      visible: config.visible !== false,
      ...config.options
    });
  }

  /**
   * Create combiner layer with resolved dependencies
   */
  static createCombinerLayer(config, viewer, shaders = {}) {
    console.log('⚡ Creating combiner layer...');
    const referencedLayers = [];
    
    if (config.layers && Array.isArray(config.layers)) {
      for (const layerId of config.layers) {
        const layer = viewer.canvas.layers[layerId];
        if (layer) {
          referencedLayers.push(layer);
          console.log(`📎 Resolved combiner dependency: ${layerId}`);
        } else {
          console.warn(`⚠️ Combiner layer reference not found: ${layerId}`);
          console.log(`   Available layers:`, Object.keys(viewer.canvas.layers));
        }
      }
    }
    
    console.log(`⚡ Creating combiner with ${referencedLayers.length} referenced layers`);
    
    // Use native Layer creation with resolved dependencies
    const combinerLayer = new OpenLIME.Layer({
      type: 'combiner',
      layers: referencedLayers,
      visible: config.visible !== false,
      ...config.options
    });
    
    // Apply shader if specified
    if (config.shader && shaders[config.shader]) {
      const shader = this.createShader(shaders[config.shader]);
      combinerLayer.shaders = { 'standard': shader };
      combinerLayer.setShader('standard');
      console.log(`🎨 Applied shader ${config.shader} to combiner`);
    }
    
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
        
      default:
        console.warn(`Unknown shader type: ${config.type}`);
        return null;
    }
  }

  /**
   * Fetch JSON using OpenLIME patterns with proper error handling
   */
  static async fetchJson(url) {
    try {
      const resolvedUrl = this.resolveUrl(url);
      console.log(`🌐 Fetching JSON from: ${resolvedUrl}`);
      
      let response;
      if (typeof OpenLIME !== 'undefined' && OpenLIME.fetchJson) {
        return await OpenLIME.fetchJson(resolvedUrl);
      } else if (typeof OpenLIME !== 'undefined' && OpenLIME.fetch) {
        response = await OpenLIME.fetch(resolvedUrl);
      } else {
        response = await fetch(resolvedUrl);
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const text = await response.text();
      return JSON.parse(text);
      
    } catch (error) {
      const errorMsg = `Failed to fetch JSON from ${url}: ${error.message}`;
      console.error('❌', errorMsg);
      
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
   */
  static resolveUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')) {
      return url;
    }
    
    if (!this._baseUrl) {
      return new URL(url, window.location.href).href;
    }
    
    return new URL(url, this._baseUrl).href;
  }

  /**
   * Configure camera properties
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
   * Set up controllers (simplified - most are auto-handled by OpenLIME)
   */
  static setupControllers(viewer, controllers) {
    console.log('🎮 Setting up controllers...');
    for (const controllerConfig of controllers) {
      if (controllerConfig.type === 'focusContext') {
        const lensLayer = viewer.canvas.layers[controllerConfig.target];
        if (lensLayer) {
          const controller = new OpenLIME.ControllerFocusContext({
            lensLayer: lensLayer,
            camera: viewer.camera,
            canvas: viewer.canvas,
            ...controllerConfig.options
          });
          
          viewer.pointerManager.onEvent(controller);
          lensLayer.controllers.push(controller);
          
          console.log('🎮 ControllerFocusContext created and attached');
        } else {
          console.warn(`⚠️ focusContext target layer not found: ${controllerConfig.target}`);
        }
      }
      // Other controllers are typically auto-managed by OpenLIME
    }
  }

  /**
   * Set up UI configuration
   */
  static setupUI(viewer, uiConfig) {
    console.log('🎨 Setting up UI...');
    
    if (uiConfig.skin?.url) {
      const skinUrl = this.resolveUrl(uiConfig.skin.url);
      console.log(`🎨 Loading skin from: ${skinUrl}`);
      OpenLIME.Skin.setUrl(skinUrl);
    }
    
    const ui = new OpenLIME.UIBasic(viewer, {
      autofit: uiConfig.autofit
    });
    
    console.log('🎨 UI created:', ui);
    
    if (uiConfig.actions) {
      for (const [actionName, actionConfig] of Object.entries(uiConfig.actions)) {
        if (ui.actions[actionName]) {
          Object.assign(ui.actions[actionName], actionConfig);
          console.log(`🎨 Configured UI action: ${actionName}`, actionConfig);
        }
      }
    }
    
    if (uiConfig.attribution) {
      ui.attribution = uiConfig.attribution;
    }
    
    if (uiConfig.pixelSize) {
      ui.pixelSize = uiConfig.pixelSize;
    }
    
    return ui;
  }

  /**
   * Set up connections (simplified placeholder)
   */
  static setupConnections(viewer, connections) {
    console.log('🔗 Setting up connections:', connections);
    // Connections logic here
  }

  /**
   * Set up events (simplified placeholder) 
   */
  static setupEvents(viewer, events) {
    console.log('📡 Setting up events:', events);
    // Events logic here
  }

  /**
   * Load plugins (simplified placeholder)
   */
  static async loadPlugins(plugins, viewer) {
    console.log('🔌 Loading plugins:', plugins);
    // Plugins logic here
  }

  /**
   * Validate manifest structure
   */
  static validateManifest(manifest) {
    const errors = [];
    const warnings = [];
    
    if (!manifest.version) {
      warnings.push('Missing version field');
    }
    
    if (!manifest.viewer?.container) {
      errors.push('Missing viewer.container');
    }
    
    if (!manifest.layers || Object.keys(manifest.layers).length === 0) {
      errors.push('No layers defined');
    }
    
    // Validate layer dependencies
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
    
    return { errors, warnings };
  }
}

// Register in OpenLIME namespace if available
if (typeof OpenLIME !== 'undefined') {
  OpenLIME.ManifestLoader = ManifestLoader;
}

export { ManifestLoader };
