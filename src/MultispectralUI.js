/**
 * Provides user interface components for interacting with multispectral visualization.
 * Integrates with LayerMultispectral to provide interactive control of visualization parameters.
 */
class MultispectralUI {
  /**
   * Creates a new MultispectralUI instance
   * @param {LayerMultispectral} layer - Multispectral layer to control
   * @param {Object} [options] - UI configuration options
   * @param {string} [options.containerId] - ID of container element for UI
   * @param {boolean} [options.showPresets=true] - Whether to show preset controls
   * @param {boolean} [options.showSingleBand=true] - Whether to show single band controls
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
   * Initializes the UI
   * @private
   */
  initialize() {
    // Get container element
    let container;
    if (this.options.containerId) {
      container = document.getElementById(this.options.containerId);
      if (!container) {
        console.error(`Container element with ID '${this.options.containerId}' not found`);
        return;
      }
    } else if (this.options.floatingPanel) {
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

      document.body.appendChild(container);
    } else {
      console.error('No container specified and floating panel disabled');
      return;
    }

    this.container = container;

    // Create UI components
    this.createHeader();

    if (this.options.showPresets) {
      this.createPresetSelector();
    }

    if (this.options.showSingleBand) {
      this.createSingleBandControls();
    }
  }

  /**
   * Creates header UI element
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

    // Handle selection change
    presetSelector.addEventListener('change', () => {
      const selectedPreset = presetSelector.value;
      if (selectedPreset) {
        this.layer.applyPreset(selectedPreset);
      }
    });

    presetDiv.appendChild(presetSelector);
    this.container.appendChild(presetDiv);

    this.uiElements.presetSelector = presetSelector;
  }

  /**
   * Creates single band visualization controls
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
   * Destroys UI and removes from DOM
   */
  destroy() {
    if (this.container && this.options.floatingPanel) {
      document.body.removeChild(this.container);
    }

    this.uiElements = {};
    this.container = null;
  }
}

export { MultispectralUI };