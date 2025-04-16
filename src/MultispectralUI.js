/**
 * MultispectralUI - User interface components for multispectral visualization
 * 
 * Provides interactive controls for manipulating visualization parameters in
 * the LayerMultispectral class. Features include preset selection, single band
 * visualization controls, and adaptive UI positioning.
 * 
 * The UI can be configured as a floating panel or embedded within an existing
 * container element, adapting automatically to the available space.
 */
class MultispectralUI {
  /**
   * Creates a new MultispectralUI instance
   * 
   * @param {LayerMultispectral} layer - Multispectral layer to control
   * @param {Object} [options] - UI configuration options
   * @param {string} [options.containerId] - ID of container element for UI (optional)
   * @param {boolean} [options.showPresets=true] - Whether to show preset selection controls
   * @param {boolean} [options.showSingleBand=true] - Whether to show single band control panel
   * @param {boolean} [options.floatingPanel=true] - Whether to create a floating panel UI
   */
  constructor(layer, options = {}) {
    this.layer = layer;

    // Default options
    this.options = {
      containerId: null,
      showPresets: true,
      showSingleBand: true,
      floatingPanel: true,
      ...options
    };

    // UI state
    this.uiElements = {};

    // Initialize when layer is ready
    if (layer.status === 'ready') {
      this.initialize();
    } else {
      layer.addEvent('ready', () => this.initialize());
    }
  }

  /**
   * Initializes the UI components
   * 
   * Sets up the container element, creates UI controls, and configures
   * event handling based on the provided options.
   * 
   * @private
   */
  initialize() {
    // Get container element
    let container;
    let targetContainer;

    if (this.options.containerId) {
      // Use existing container if ID provided
      container = document.getElementById(this.options.containerId);
      targetContainer = container;
      if (!container) {
        console.error(`Container element with ID '${this.options.containerId}' not found`);
        return;
      }
    } else if (this.options.floatingPanel) {
      // Create floating panel if no container specified
      // Find OpenLIME container to use as a relative parent
      let openlimeContainer;

      // Try to get viewer's container from the layer
      if (this.layer.viewer && this.layer.viewer.containerElement) {
        openlimeContainer = this.layer.viewer.containerElement;
      } else {
        // Fallback to looking for .openlime class
        openlimeContainer = document.querySelector('.openlime');

        if (!openlimeContainer) {
          console.warn('OpenLIME container not found, using body as fallback');
          openlimeContainer = document.body;
        }
      }

      // Make the parent container positioned if it's not already
      if (getComputedStyle(openlimeContainer).position === 'static') {
        openlimeContainer.style.position = 'relative';
      }

      // Create floating container
      container = document.createElement('div');
      container.className = 'ms-controls';
      container.style.position = 'absolute';
      container.style.top = '10px';
      container.style.right = '10px';
      container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      container.style.padding = '10px';
      container.style.borderRadius = '5px';
      container.style.color = 'white';
      container.style.zIndex = '1000';
      container.style.width = '250px';
      container.style.maxHeight = '80vh';
      container.style.overflowY = 'auto';
      container.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.3)';
      container.style.fontFamily = 'Arial, sans-serif';

      // Append to OpenLIME container instead of document.body
      openlimeContainer.appendChild(container);
      targetContainer = openlimeContainer;
    } else {
      console.error('No container specified and floating panel disabled');
      return;
    }

    this.container = container;
    this.targetContainer = targetContainer;

    // Create UI components
    this.createHeader();

    if (this.options.showPresets) {
      this.createPresetSelector();
    }

    if (this.options.showSingleBand) {
      this.createSingleBandControls();
    }

    // Update positioning on window resize
    this.setupResizeHandler();
  }

  /**
   * Sets up window resize event handler to update panel positioning
   * 
   * Ensures the UI panel remains properly positioned and sized when
   * the window or container is resized.
   * 
   * @private
   */
  setupResizeHandler() {
    // Only needed for floating panel
    if (!this.options.floatingPanel || !this.container) return;

    // Store initial container dimensions
    this.initialContainerRect = this.targetContainer.getBoundingClientRect();

    // Define resize handler
    this.resizeHandler = () => {
      // Handle potential edge case where container/targetContainer is removed from DOM
      if (!document.contains(this.container) || !document.contains(this.targetContainer)) {
        window.removeEventListener('resize', this.resizeHandler);
        return;
      }

      // Ensure the panel stays visible on resize
      const containerRect = this.targetContainer.getBoundingClientRect();
      const panelRect = this.container.getBoundingClientRect();

      // If the container width gets too small, adjust the panel width
      if (containerRect.width < 300) {
        this.container.style.width = Math.max(containerRect.width * 0.8, 150) + 'px';
      } else {
        // Reset to default width
        this.container.style.width = '250px';
      }

      // Ensure the panel is fully visible
      const rightEdgeOffset = panelRect.right - containerRect.right;
      if (rightEdgeOffset > 0) {
        // Panel extends beyond right edge, adjust position
        const currentRight = parseInt(this.container.style.right) || 10;
        this.container.style.right = (currentRight + rightEdgeOffset + 10) + 'px';
      }
    };

    // Add resize listener
    window.addEventListener('resize', this.resizeHandler);

    // Initial call to handle any existing size issues
    this.resizeHandler();
  }

  /**
   * Creates header UI element with title and band information
   * 
   * Displays the title and key information about the multispectral
   * dataset including band count and wavelength range.
   * 
   * @private
   */
  createHeader() {
    const headerDiv = document.createElement('div');
    headerDiv.style.marginBottom = '10px';

    const title = document.createElement('h3');
    title.textContent = 'Multispectral Controls';
    title.style.margin = '0 0 5px 0';
    title.style.fontSize = '16px';
    title.style.fontWeight = 'bold';

    headerDiv.appendChild(title);

    const bandInfo = document.createElement('div');
    bandInfo.textContent = `${this.layer.getBandCount()} bands: ${Math.min(...this.layer.getWavelengths())}nm - ${Math.max(...this.layer.getWavelengths())}nm`;
    bandInfo.style.fontSize = '12px';
    bandInfo.style.color = '#ccc';

    headerDiv.appendChild(bandInfo);
    this.container.appendChild(headerDiv);
  }

  /**
   * Creates preset selector UI element
   * 
   * Provides a dropdown menu for selecting predefined Color Twist Weight
   * configurations from the available presets.
   * 
   * @private
   */
  createPresetSelector() {
    const presetDiv = document.createElement('div');
    presetDiv.style.marginBottom = '15px';

    const label = document.createElement('label');
    label.textContent = 'Analysis Presets';
    label.style.display = 'block';
    label.style.marginBottom = '5px';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';

    presetDiv.appendChild(label);

    const presetSelector = document.createElement('select');
    presetSelector.style.width = '100%';
    presetSelector.style.padding = '5px';
    presetSelector.style.backgroundColor = '#333';
    presetSelector.style.color = 'white';
    presetSelector.style.border = '1px solid #555';
    presetSelector.style.borderRadius = '3px';

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select Preset --';
    presetSelector.appendChild(defaultOption);

    // Add presets from layer
    const presets = this.layer.getAvailablePresets();
    presets.forEach(preset => {
      const option = document.createElement('option');
      option.value = preset;

      // Format preset name for display (camelCase to Title Case)
      const formattedName = preset
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, str => str.toUpperCase());

      option.textContent = formattedName;
      presetSelector.appendChild(option);
    });

    // Add apply button for preset selection
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply';
    applyButton.style.width = '100%';
    applyButton.style.marginTop = '5px';
    applyButton.style.padding = '5px';
    applyButton.style.backgroundColor = '#555';
    applyButton.style.color = 'white';
    applyButton.style.border = 'none';
    applyButton.style.borderRadius = '3px';
    applyButton.style.cursor = 'pointer';

    // Function to apply the selected preset
    const applySelectedPreset = () => {
      const selectedPreset = presetSelector.value;
      if (selectedPreset) {
        this.layer.applyPreset(selectedPreset);

        // Set the layer mode to 'rgb' for preset visualization
        if (this.layer.getMode() !== 'rgb') {
          this.layer.setMode('rgb');
        }
      }
    };

    // // Still keep the change event for convenience
    // presetSelector.addEventListener('change', () => {
    //   applySelectedPreset();
    // });

    // Add click handler for the apply button
    applyButton.addEventListener('click', () => {
      applySelectedPreset();
    });

    presetDiv.appendChild(presetSelector);
    presetDiv.appendChild(applyButton);
    this.container.appendChild(presetDiv);

    this.uiElements.presetSelector = presetSelector;
  }

  /**
   * Creates single band visualization controls
   * 
   * Provides controls for selecting a specific spectral band and
   * output channel for single-band visualization.
   * 
   * @private
   */
  createSingleBandControls() {
    const singleBandDiv = document.createElement('div');
    singleBandDiv.style.marginBottom = '15px';

    const label = document.createElement('label');
    label.textContent = 'Single Band View';
    label.style.display = 'block';
    label.style.marginBottom = '5px';
    label.style.fontSize = '14px';
    label.style.fontWeight = 'bold';

    singleBandDiv.appendChild(label);

    // Create wavelength selector
    const wavelengthDiv = document.createElement('div');
    wavelengthDiv.style.display = 'flex';
    wavelengthDiv.style.alignItems = 'center';
    wavelengthDiv.style.marginBottom = '5px';

    const wavelengthLabel = document.createElement('span');
    wavelengthLabel.textContent = 'Wavelength:';
    wavelengthLabel.style.width = '80px';
    wavelengthLabel.style.fontSize = '12px';

    const wavelengthSelector = document.createElement('select');
    wavelengthSelector.style.flex = '1';
    wavelengthSelector.style.padding = '3px';
    wavelengthSelector.style.backgroundColor = '#333';
    wavelengthSelector.style.color = 'white';
    wavelengthSelector.style.border = '1px solid #555';
    wavelengthSelector.style.borderRadius = '3px';

    // Populate wavelength options
    const wavelengths = this.layer.getWavelengths();
    wavelengths.forEach((wavelength, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = `${wavelength}nm`;
      wavelengthSelector.appendChild(option);
    });

    wavelengthDiv.appendChild(wavelengthLabel);
    wavelengthDiv.appendChild(wavelengthSelector);
    singleBandDiv.appendChild(wavelengthDiv);

    // Create output channel selector
    const channelDiv = document.createElement('div');
    channelDiv.style.display = 'flex';
    channelDiv.style.alignItems = 'center';

    const channelLabel = document.createElement('span');
    channelLabel.textContent = 'Output Channel:';
    channelLabel.style.width = '80px';
    channelLabel.style.fontSize = '12px';

    const channelSelector = document.createElement('select');
    channelSelector.style.flex = '1';
    channelSelector.style.padding = '3px';
    channelSelector.style.backgroundColor = '#333';
    channelSelector.style.color = 'white';
    channelSelector.style.border = '1px solid #555';
    channelSelector.style.borderRadius = '3px';

    // Add channel options
    const channels = [
      { value: 0, label: 'Gray' },
      { value: 1, label: 'Red' },
      { value: 2, label: 'Green' },
      { value: 3, label: 'Blue' }
    ];

    channels.forEach(channel => {
      const option = document.createElement('option');
      option.value = channel.value;
      option.textContent = channel.label;
      channelSelector.appendChild(option);
    });

    channelDiv.appendChild(channelLabel);
    channelDiv.appendChild(channelSelector);
    singleBandDiv.appendChild(channelDiv);

    // Apply button
    const applyButton = document.createElement('button');
    applyButton.textContent = 'Apply';
    applyButton.style.width = '100%';
    applyButton.style.marginTop = '5px';
    applyButton.style.padding = '5px';
    applyButton.style.backgroundColor = '#555';
    applyButton.style.color = 'white';
    applyButton.style.border = 'none';
    applyButton.style.borderRadius = '3px';
    applyButton.style.cursor = 'pointer';

    applyButton.addEventListener('click', () => {
      const bandIndex = parseInt(wavelengthSelector.value);
      const channelIndex = parseInt(channelSelector.value);
      this.layer.setSingleBand(bandIndex, channelIndex);

      // Update mode selector if it exists
      if (this.uiElements.modeSelector) {
        this.uiElements.modeSelector.value = 'single_band';
      }
    });

    singleBandDiv.appendChild(applyButton);
    this.container.appendChild(singleBandDiv);

    this.uiElements.wavelengthSelector = wavelengthSelector;
    this.uiElements.channelSelector = channelSelector;
  }

  /**
   * Destroys UI and removes elements from DOM
   * 
   * Cleans up all created UI elements and event listeners.
   * Call this method before removing the layer to prevent memory leaks.
   */
  destroy() {
    // Remove resize event listener
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    // Remove container from DOM if it's a floating panel
    if (this.container && this.options.floatingPanel && this.targetContainer) {
      this.targetContainer.removeChild(this.container);
    }

    this.uiElements = {};
    this.container = null;
    this.targetContainer = null;
  }
}

export { MultispectralUI };