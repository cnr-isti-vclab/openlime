/**
 * #Type
 * Supported image layout types including both single-resolution and multi-resolution formats.
 * - image: Standard web image formats (jpg, png, gif, etc.)
 * - deepzoom: Microsoft Deep Zoom format with root tile > 1px
 * - deepzoom1px: Microsoft Deep Zoom format with 1px root tile
 * - google: Google Maps tiling scheme
 * - zoomify: Zoomify tiling format
 * - iiif: International Image Interoperability Framework
 * - iip: Internet Imaging Protocol
 * - tarzoom: OpenLIME custom format (single TAR of DeepZoom pyramid)
 * - itarzoom: OpenLIME custom interleaved TAR format
 */
export type Layout = 'image' | 'deepzoom' | 'deepzoom1px' | 'google' | 'zoomify' | 'iiif' | 'iip' | 'tarzoom' | 'itarzoom';
/**
 * #Format
 * Defines the color format for image data storage in textures and renderbuffers.
 */
export type Raster = ('vec3' | 'vec4' | 'float');
/**
 * #Format
 * Defines the 16-bit format for image data storage in textures.
 */
export type Raster16Bit = ('r16f' | 'rg16f' | 'rgb16f' | 'rgba16f' | 'r16ui' | 'rg16ui' | 'rgb16ui' | 'rgba16ui' | 'r16i' | 'rg16i' | 'rgb16i' | 'rgba16i' | 'depth16');
/**
 * ~Sampler
 * A reference to a 2D texture used in the shader.
 */
export type Shader = {
    /**
     * - Unique identifier for the sampler
     */
    id: number;
    /**
     * - Sampler variable name in shader program (e.g., "kd" for diffuse texture)
     */
    name: string;
    /**
     * - Display label for UI/menus
     */
    label: string;
    /**
     * - Array of raster definitions
     */
    samplers: Array<any>;
    /**
     * - Raster type (e.g., 'color', 'normal')
     */
    type: string;
    /**
     * - Whether sampler should be bound in prepareGL
     */
    bind?: boolean;
    /**
     * - Whether sampler should load from raster
     */
    load?: boolean;
    /**
     * - Shader uniform variables
     */
    uniforms: Array<any>;
    /**
     * - Whether uniform needs GPU update
     */
    needsUpdate: boolean;
    /**
     * - Uniform value or array of values
     */
    value: number;
};
/**
 * ~Operation
 * A shader operation that combines two textures.
 */
export type ShaderCombiner = {
    /**
     * - Assigns first texture as output (cout = c1)
     */
    first: string;
    /**
     * - Assigns second texture as output (cout = c2)
     */
    second: string;
    /**
     * - Calculates average of textures (cout = (c1 + c2)/2.0)
     */
    mean: string;
    /**
     * - Calculates difference between textures (cout = c2.rgb - c1.rgb)
     */
    diff: string;
};
/**
 * ~Mode
 * A shader filter mode configuration
 */
export type ShaderFilter = {
    /**
     * - Unique identifier for the mode
     */
    id: string;
    /**
     * - Whether the mode is active
     */
    enable: boolean;
    /**
     * - GLSL source code for the mode
     */
    src: string;
};
/**
 * ~Options
 * Configuration options for colormap filter
 */
export type ShaderFilterColormap = {
    /**
     * - Input value range [min, max] for mapping
     */
    inDomain?: number[];
    /**
     * - RGB channel weights for grayscale conversion
     */
    channelWeights?: number[];
    /**
     * - Number of discrete steps in the colormap texture
     */
    maxSteps?: number;
};
/**
 * ~Options
 * Configuration options for vector field visualization
 */
export type ShaderFilterVector = {
    /**
     * - Input value range [min, max] for magnitude mapping
     */
    inDomain?: number[];
    /**
     * - Number of discrete steps in the colormap texture
     */
    maxSteps?: number;
    /**
     * - RGBA color for arrows when using 'col' mode
     */
    arrowColor?: number[];
};
/**
 * ~Options
 * Configuration options for glyph-based vector field visualization
 */
export type ShaderFilterVectorGlyph = {
    /**
     * - Input value range [min, max] for magnitude mapping
     */
    inDomain?: number[];
    /**
     * - Number of discrete steps in the colormap texture
     */
    maxSteps?: number;
    /**
     * - RGBA color for glyphs when using 'col' mode
     */
    glyphColor?: number[];
    /**
     * - Horizontal spacing between glyphs in the sprite sheet
     */
    glyphsStride?: number;
    /**
     * - Dimensions of the glyph sprite sheet [width, height]
     */
    glyphsSize?: number[];
};
/**
 * ~NetworkConfig
 * Configuration for neural network weights and parameters
 */
export type ShaderNeural = {
    /**
     * - Number of neurons per layer (padded to multiple of 4)
     */
    n: number;
    /**
     * - Number of input channels (padded to multiple of 4)
     */
    c: number;
    /**
     * - Color space for processing ('rgb'|'xyz'|etc)
     */
    colorspace: string;
    /**
     * - Number of coefficient planes
     */
    nplanes: number;
    /**
     * - Dequantization scale factor
     */
    scale: number;
    /**
     * - Dequantization bias
     */
    bias: number;
};
/**
 * ~Basis
 * Configuration data for basis functions
 */
export type ShaderRTI = {
    /**
     * - PCA basis for rbf and bln modes
     */
    basis?: Float32Array;
    /**
     * - Light directions for rbf interpolation
     */
    lights?: number[][];
    /**
     * - RBF interpolation parameter
     */
    sigma?: number;
    /**
     * - PCA dimension space
     */
    ndimensions?: number;
};
export type SignalHandler = {
    /**
     * - Map of event names to arrays of callback functions
     */
    signals: {
        [x: string]: Function[];
    };
    /**
     * - List of all registered signal names
     */
    allSignals: string[];
};
/**
 * Callback for position updates.
 */
export type updatePosition = (x: number, y: number) => any;
/**
 * A [x, y, xc, yc] point.
 */
export type BezierPoint = {
    /**
     * 0 The x-coordinate.
     */
    "": number;
};
/**
 * A tuple of [x, y] representing a 2D point.
 */
export type APoint = Array<number>;
/**
 * Object representation of a 2D point
 */
export type Point = {
    /**
     * - X coordinate
     */
    x: number;
    /**
     * - Y coordinate
     */
    y: number;
};
export type TransformParameters = {
    /**
     * - X translation component
     */
    x?: number;
    /**
     * - Y translation component
     */
    y?: number;
    /**
     * - Rotation angle in degrees
     */
    a?: number;
    /**
     * - Scale factor
     */
    z?: number;
    /**
     * - Timestamp for animations
     */
    t?: number;
};
/**
 * Animation easing function type
 */
export type EasingFunction = 'linear' | 'ease-out' | 'ease-in-out';
export type TileProperties = {
    /**
     * - Unique identifier for the tile
     */
    index: number;
    /**
     * - Bounding box coordinates [minX, minY, maxX, maxY]
     */
    bbox: number[];
    /**
     * - Zoom level in the pyramid (for tiled layouts)
     */
    level: number;
    /**
     * - Horizontal grid position
     */
    x: number;
    /**
     * - Vertical grid position
     */
    y: number;
    /**
     * - Tile width (for image layouts)
     */
    w: number;
    /**
     * - Tile height (for image layouts)
     */
    h: number;
    /**
     * - Starting byte position in dataset (for tar-based formats)
     */
    start: number;
    /**
     * - Ending byte position in dataset (for tar-based formats)
     */
    end: number;
    /**
     * - Array of WebGL textures (one per channel)
     */
    tex: WebGLTexture[];
    /**
     * - Count of pending channel data requests
     */
    missing: number;
    /**
     * - Creation timestamp for cache management
     */
    time: number;
    /**
     * - Loading priority for cache management
     */
    priority: number;
    /**
     * - Total size in bytes for cache management
     */
    size: number;
};
export type TileObj = {
    /**
     * - Zoom level in the image pyramid
     */
    level: number;
    /**
     * - Horizontal position in tile grid
     */
    x: number;
    /**
     * - Vertical position in tile grid
     */
    y: number;
    /**
     * - Unique tile identifier
     */
    index: number;
    /**
     * - Starting byte position in dataset (for tar formats)
     */
    start?: number;
    /**
     * - Ending byte position in dataset (for tar formats)
     */
    end?: number;
    /**
     * - Number of pending channel data requests
     */
    missing: number;
    /**
     * - Array of textures (one per channel)
     */
    tex: WebGLTexture[];
    /**
     * - Tile creation timestamp for cache management
     */
    time: number;
    /**
     * - Loading priority for cache management
     */
    priority: number;
    /**
     * - Total tile size in bytes
     */
    size: number;
};
export type LayoutType = 'image' | 'deepzoom' | 'deepzoom1px' | 'google' | 'zoomify' | 'iiif' | 'tarzoom' | 'itarzoom';
export type LayoutOptions = {
    /**
     * - Image width (required for google layout)
     */
    width?: number;
    /**
     * - Image height (required for google layout)
     */
    height?: number;
    /**
     * - Tile file extension
     */
    suffix?: string;
    /**
     * - Available subdomains for URL templates
     */
    subdomains?: string;
};
export type LayerOptions = {
    /**
     * - Layout/format of input raster images
     */
    layout?: string | Layout;
    /**
     * - Identifier for specific derived layer class
     */
    type?: string;
    /**
     * - Unique layer identifier
     */
    id?: string;
    /**
     * - Display label for UI (defaults to id)
     */
    label?: string;
    /**
     * - Transform from layer to canvas coordinates
     */
    transform?: Transform;
    /**
     * - Whether layer should be rendered
     */
    visible?: boolean;
    /**
     * - Stack order for rendering (higher = on top)
     */
    zindex?: number;
    /**
     * - Whether layer renders in overlay mode
     */
    overlay?: boolean;
    /**
     * - Tile prefetch threshold in tile units
     */
    prefetchBorder?: number;
    /**
     * - Texture resolution selection bias (0=highest, 1=lowest)
     */
    mipmapBias?: number;
    /**
     * - Map of available shaders
     */
    shaders?: {
        [x: string]: Shader;
    };
    /**
     * - Array of active UI controllers
     */
    controllers?: Controller[];
    /**
     * - Layer to share tiles with
     */
    sourceLayer?: Layer;
    /**
     * - Physical size of a pixel in mm
     */
    pixelSize?: number;
};
/**
 * Defines a rectangular viewing region inside a canvas area.
 */
export type Viewport = {
    /**
     * - X-coordinate of the lower-left corner
     */
    x: number;
    /**
     * - Y-coordinate of the lower-left corner
     */
    y: number;
    /**
     * - Width of the viewport
     */
    dx: number;
    /**
     * - Height of the viewport
     */
    dy: number;
    /**
     * - Total canvas width
     */
    w: number;
    /**
     * - Total canvas height
     */
    h: number;
};
export type LayerImageOptions = {
    /**
     * - URL of the image to display (required)
     */
    url: string;
    /**
     * - Layout format for image display
     */
    layout?: string | Layout;
    /**
     * - Image data format for WebGL processing
     */
    format?: string;
    /**
     * - Must be 'image' when using Layer factory
     */
    type?: string;
};
export type LayerCombinerOptions = {
    /**
     * - Array of layers to be combined (required)
     */
    layers: Layer[];
    /**
     * - Map of available shaders
     */
    shaders?: {
        [x: string]: Shader;
    };
    /**
     * - Must be 'combiner' when using Layer factory
     */
    type?: string;
    /**
     * - Whether the combined output is visible
     */
    visible?: boolean;
};
export type LayerAnnotationOptions = {
    /**
     * - CSS styles for annotation rendering
     */
    style?: string;
    /**
     * - URL of JSON annotation data or array of annotations
     */
    annotations?: string | Annotation[];
    /**
     * - Whether annotations render as overlay
     */
    overlay?: boolean;
    /**
     * - Set of selected annotation IDs
     */
    selected?: Set<string>;
    /**
     * - UI entry for annotations list
     */
    annotationsListEntry?: any;
};
export type LayerAnnotationImageOptions = {
    /**
     * - URL to the annotations JSON file
     */
    url?: string;
    /**
     * - Base path for annotation image files
     */
    path?: string;
    /**
     * - Raster format for image data
     */
    format?: string;
};
export type LayerMaskedImageOptions = {
    /**
     * - URL of the masked image to display (required)
     */
    url: string;
    /**
     * - Image data format
     */
    format?: string;
    /**
     * - Must be 'maskedimage' when using Layer factory
     */
    type?: string;
};
/**
 * Configuration options for Viewer initialization
 */
export type ViewerOptions = {
    /**
     * - CSS background style
     */
    background?: string;
    /**
     * - Auto-fit camera to scene
     */
    autofit?: boolean;
    /**
     * - Canvas configuration options
     */
    canvas?: any;
    /**
     * - Custom camera instance
     */
    camera?: Camera;
};
export type ShaderMultispectralOptions = {
    /**
     * - Initial rendering mode ('rgb' or 'single_band')
     */
    mode?: string;
    /**
     * - Enable debug output in console
     */
    debug?: boolean;
    /**
     * - Array of wavelengths in nanometers
     */
    wavelength?: number[];
};
export type LayerMultispectralOptions = {
    /**
     * - URL to multispectral info.json file (required)
     */
    url: string;
    /**
     * - Layout type: 'image', 'deepzoom', 'google', 'iiif', 'zoomify', 'tarzoom', 'itarzoom'
     */
    layout: string;
    /**
     * - Initial visualization mode ('rgb' or 'single_band')
     */
    defaultMode?: string;
    /**
     * - IIP server URL (for IIP layout)
     */
    server?: string;
    /**
     * - Whether to use linear color space for rasters (recommended for scientific accuracy)
     */
    linearRaster?: boolean;
    /**
     * - Path to presets JSON file or presets object containing CTW configurations
     */
    presets: string | any;
};
export type DataLoaderCallback = Function;
export type LayerHDROptions = {
    /**
     * - URL of the image to display (required)
     */
    url: string;
    /**
     * - Layout format for image display
     */
    layout?: string | Layout;
    /**
     * - Image data format for WebGL processing
     */
    format?: string;
    /**
     * - Enable debug output
     */
    debug?: boolean;
};
/**
 * A UI icon element from the skin file
 */
export type SkinIcon = {
    /**
     * - CSS class name (must start with 'openlime-')
     */
    class: string;
    /**
     * - SVG DOM element
     */
    element: SVGElement;
};
/**
 * Action configuration for toolbar buttons
 */
export type UIAction = {
    /**
     * - Display title for the action
     */
    title: string;
    /**
     * - Whether to show in toolbar
     */
    display: boolean;
    /**
     * - Keyboard shortcut key
     */
    key?: string;
    /**
     * - Callback function for action
     */
    task: Function;
    /**
     * - Custom SVG icon path or content
     */
    icon?: string;
    /**
     * - HTML content for help dialog
     */
    html?: string;
};
/**
 * Menu configuration item
 */
export type MenuEntry = {
    /**
     * - Large title text
     */
    title?: string;
    /**
     * - Section header text
     */
    section?: string;
    /**
     * - Raw HTML content
     */
    html?: string;
    /**
     * - Button text
     */
    button?: string;
    /**
     * - Button group identifier
     */
    group?: string;
    /**
     * - Associated layer ID
     */
    layer?: string;
    /**
     * - Layer visualization mode
     */
    mode?: string;
    /**
     * - Click handler
     */
    onclick?: Function;
    /**
     * - Input handler for sliders
     */
    oninput?: Function;
    /**
     * - Nested menu entries
     */
    list?: MenuEntry[];
};
export type LayerRTIOptions = {
    /**
     * - URL to RTI info.json file (required)
     */
    url: string;
    /**
     * - Layout type: 'image', 'deepzoom', 'google', 'iiif', 'zoomify', 'tarzoom', 'itarzoom'
     */
    layout: string;
    /**
     * - Whether to load normal maps
     */
    normals?: boolean;
    /**
     * - IIP server URL (for IIP layout)
     */
    server?: string;
    /**
     * - Global rotation offset
     */
    worldRotation?: number;
};
export type LayerNeuralRTIOptions = {
    /**
     * - URL to the Neural RTI configuration JSON
     */
    url: string;
    /**
     * - Layout system for image loading
     */
    layout: Layout;
    /**
     * - Speed of quality convergence
     */
    convergenceSpeed?: number;
    /**
     * - Maximum number of tiles to process
     */
    maxTiles?: number;
    /**
     * - Color space for processing
     */
    colorspace?: string;
};
export type LayerBRDFOptions = {
    /**
     * - Required channels for BRDF rendering
     */
    channels: {
        kd: string;
        ks: string;
        normals: string;
        gloss: string;
    };
    /**
     * - Color space definitions for material properties
     */
    colorspaces?: {
        kd?: ('linear' | 'srgb');
        ks?: ('linear' | 'srgb');
    };
    /**
     * - Overall brightness adjustment
     */
    brightness?: number;
    /**
     * - Gamma correction value
     */
    gamma?: number;
    /**
     * - Range for glossiness/roughness
     */
    alphaLimits?: number[];
    /**
     * - RGB color for monochrome rendering
     */
    monochromeMaterial?: number[];
    /**
     * - Ambient light coefficient
     */
    kAmbient?: number;
};
/**
 * ~Uniforms
 * Uniform definitions for lens shader
 */
export type ShaderLens = {
    /**
     * - Lens parameters [centerX, centerY, radius, borderWidth]
     */
    u_lens: number[];
    /**
     * - Viewport dimensions [width, height]
     */
    u_width_height: number[];
    /**
     * - RGBA border color [r, g, b, a]
     */
    u_border_color: number[];
    /**
     * - Whether to show lens border
     */
    u_border_enable: boolean;
};
export type LayerLensOptions = {
    /**
     * - Whether the lens renders as an overlay
     */
    overlay?: boolean;
    /**
     * - Initial lens radius in pixels
     */
    radius?: number;
    /**
     * - RGBA border color
     */
    borderColor?: number[];
    /**
     * - Border width in pixels
     */
    borderWidth?: number;
    /**
     * - Whether to show lens border
     */
    borderEnable?: boolean;
    /**
     * - Dashboard UI component for lens control
     */
    dashboard?: any;
    /**
     * - Camera instance (required)
     */
    camera: Camera;
};
export type Focus = {
    /**
     * - Lens center position in dataset coordinates
     */
    position: {
        x: number;
        y: number;
    };
    /**
     * - Lens radius in dataset units
     */
    radius: number;
};
export type TextToSpeechOptions = {
    /**
     * - Language code for speech synthesis (e.g., 'en-US', 'it-IT')
     */
    language?: string;
    /**
     * - Speech rate (0.1 to 10)
     */
    rate?: number;
    /**
     * - Speech volume (0 to 1)
     */
    volume?: number;
    /**
     * - Whether to remove HTML tags and format text
     */
    cleanText?: boolean;
    /**
     * - Index of preferred voice (-1 for auto-selection)
     */
    voiceSelected?: number;
};
export type AnnoClass = {
    /**
     * - CSS color for SVG elements (lines, text, outlines)
     */
    stroke: string;
    /**
     * - Display name for the class
     */
    label: string;
};
export type AnnoClasses = {
    [x: string]: AnnoClass;
};
export type LayerSvgAnnotationOptions = {
    /**
     * - Annotation class definitions with styles
     */
    classes: AnnoClasses;
    /**
     * - Callback for annotation click events (param: selected annotation)
     */
    onClick?: Function;
    /**
     * - Whether to use Shadow DOM for SVG elements
     */
    shadow?: boolean;
    /**
     * - Container for SVG overlay
     */
    overlayElement?: HTMLElement;
    /**
     * - Additional CSS styles for annotations
     */
    style?: string;
    /**
     * - Custom update function for annotations
     */
    annotationUpdate?: Function;
};
/**
 * Class representing an audio player with playback control capabilities.
 * Supports playing, pausing, resuming, and stopping audio files with volume control
 * and playback speed adjustment.
 */
export class AudioPlayer {
    audio: HTMLAudioElement;
    isPlaying: boolean;
    isPaused: boolean;
    isMuted: boolean;
    previousVolume: number;
    playStartTime: number;
    playDuration: number;
    /**
     * Plays an audio file with optional playback speed adjustment.
     * If audio is paused, it will resume playback instead of starting a new file.
     *
     * @param {string} audioFile - The path or URL to the audio file.
     * @param {number} [speed=1.0] - Playback speed multiplier (1.0 is normal speed).
     * @returns {Promise<void>} Resolves when the audio playback completes.
     */
    play(audioFile: string, speed?: number): Promise<void>;
    /**
     * Pauses the currently playing audio.
     * Updates play duration when pausing.
     */
    pause(): void;
    /**
     * Resumes playback of a paused audio file.
     *
     * @returns {Promise<void>} Resolves when the resumed audio playback completes.
     */
    continue(): Promise<void>;
    /**
     * Stops the current audio playback and resets all player states.
     * Removes event listeners and updates final play duration.
     */
    stop(): void;
    /**
     * Updates the total play duration based on the current session.
     * Called internally when playback is paused, stopped, or ends.
     * @private
     */
    private updatePlayDuration;
    /**
     * Returns the total play duration in milliseconds.
     *
     * @returns {number} Total play duration in milliseconds.
     */
    getPlayDuration(): number;
    /**
     * Sets the audio volume level.
     *
     * @param {number} volume - Volume level between 0.0 and 1.0.
     */
    setVolume(volume: number): void;
    /**
     * Creates a delay in the execution flow.
     *
     * @param {number} ms - Number of milliseconds to wait.
     * @returns {Promise<void>} Resolves after the specified delay.
     */
    silence(ms: number): Promise<void>;
    /**
     * Set the mute state of the audio player.
     * Stores the previous volume level when muting and restores it when unmuting.
     * @param {boolean} b Whether to mute the audio playback
     */
    setMute(b: boolean): void;
    /**
     * Emits an event of the specified type
     * @param {string} type - The event type to emit
     */
    emit(type: string): void;
}
/**
 * Represents an axis-aligned rectangular bounding box that can be wrapped tightly around geometric elements.
 * The box is defined by two opposite vertices (low and high corners) and provides a comprehensive set of
 * utility methods for manipulating and analyzing bounding boxes.
 */
export class BoundingBox {
    /**
     * Creates a new BoundingBox instance.
     * @param {Object} [options] - Configuration options for the bounding box
     * @param {number} [options.xLow=1e20] - X coordinate of the lower corner
     * @param {number} [options.yLow=1e20] - Y coordinate of the lower corner
     * @param {number} [options.xHigh=-1e20] - X coordinate of the upper corner
     * @param {number} [options.yHigh=-1e20] - Y coordinate of the upper corner
     */
    constructor(options?: {
        xLow?: number;
        yLow?: number;
        xHigh?: number;
        yHigh?: number;
    });
    /**
     * Initializes the bounding box from an array of coordinates.
     * @param {number[]} x - Array containing coordinates in order [xLow, yLow, xHigh, yHigh]
     */
    fromArray(x: number[]): void;
    xLow: any;
    yLow: any;
    xHigh: any;
    yHigh: any;
    /**
     * Resets the bounding box to an empty state by setting coordinates to extreme values.
     */
    toEmpty(): void;
    /**
     * Checks if the bounding box is empty (has no valid area).
     * A box is considered empty if its low corner coordinates are greater than its high corner coordinates.
     * @returns {boolean} True if the box is empty, false otherwise
     */
    isEmpty(): boolean;
    /**
     * Converts the bounding box coordinates to an array.
     * @returns {number[]} Array of coordinates in order [xLow, yLow, xHigh, yHigh]
     */
    toArray(): number[];
    /**
      * Creates a space-separated string representation of the bounding box coordinates.
      * @returns {string} String in format "xLow yLow xHigh yHigh"
      */
    toString(): string;
    /**
     * Enlarges this bounding box to include another bounding box.
     * If this box is empty, it will adopt the dimensions of the input box.
     * If the input box is null, no changes are made.
     * @param {BoundingBox|null} box - The bounding box to merge with this one
     */
    mergeBox(box: BoundingBox | null): void;
    /**
     * Enlarges this bounding box to include a point.
     * @param {{x: number, y: number}} p - The point to include in the bounding box
     */
    mergePoint(p: {
        x: number;
        y: number;
    }): void;
    /**
     * Moves the bounding box by the specified displacement.
     * @param {number} dx - Displacement along the x-axis
     * @param {number} dy - Displacement along the y-axis
     */
    shift(dx: number, dy: number): void;
    /**
     * Quantizes the bounding box coordinates by dividing by a specified value and rounding down.
     * This creates a grid-aligned bounding box.
     * @param {number} side - The value to divide coordinates by
     */
    quantize(side: number): void;
    /**
     * Calculates the width of the bounding box.
     * @returns {number} The difference between xHigh and xLow
     */
    width(): number;
    /**
     * Calculates the height of the bounding box.
     * @returns {number} The difference between yHigh and yLow
     */
    height(): number;
    /**
     * Calculates the area of the bounding box.
     * @returns {number} The area (width × height)
     */
    area(): number;
    /**
     * Calculates the center point of the bounding box.
     * @returns {{x: number, y: number}} The coordinates of the center point
     */
    center(): {
        x: number;
        y: number;
    };
    /**
     * Gets the coordinates of a specific corner of the bounding box.
     * @param {number} i - Corner index (0: bottom-left, 1: bottom-right, 2: top-left, 3: top-right)
     * @returns {{x: number, y: number}} The coordinates of the specified corner
     */
    corner(i: number): {
        x: number;
        y: number;
    };
    /**
     * Checks if this bounding box intersects with another bounding box.
     * @param {BoundingBox} box - The other bounding box to check intersection with
     * @returns {boolean} True if the boxes intersect, false otherwise
     */
    intersects(box: BoundingBox): boolean;
    /**
     * Calculates the intersection of this bounding box with another box.
     * @param {BoundingBox} box - The other bounding box
     * @returns {BoundingBox|null} A new bounding box representing the intersection, or null if there is no intersection
     */
    intersection(box: BoundingBox): BoundingBox | null;
    /**
     * Creates a clone of this bounding box.
     * @returns {BoundingBox} A new BoundingBox instance with the same coordinates
     */
    clone(): BoundingBox;
    /**
     * Checks if a point is contained within this bounding box.
     * A point is considered inside if its coordinates are greater than or equal to
     * the low corner and less than or equal to the high corner.
     *
     * @param {{x: number, y: number}} p - The point to check
     * @param {number} [epsilon=0] - Optional tolerance value for boundary checks
     * @returns {boolean} True if the point is inside the box, false otherwise
     *
     * @example
     * // Check if a point is inside a box
     * const box = new BoundingBox({xLow: 0, yLow: 0, xHigh: 10, yHigh: 10});
     * const point = {x: 5, y: 5};
     * const isInside = box.containsPoint(point); // true
     *
     * // Using epsilon tolerance for boundary cases
     * const boundaryPoint = {x: 10.001, y: 10};
     * const isInsideWithTolerance = box.containsPoint(boundaryPoint, 0.01); // true
     */
    containsPoint(p: {
        x: number;
        y: number;
    }, epsilon?: number): boolean;
    /**
     * Prints the bounding box coordinates to the console in a formatted string.
     * Output format: "BOX=xLow, yLow, xHigh, yHigh" with values rounded to 2 decimal places
     */
    print(): void;
}
/**
 * Defines a rectangular viewing region inside a canvas area.
 * @typedef {Object} Viewport
 * @property {number} x - X-coordinate of the lower-left corner
 * @property {number} y - Y-coordinate of the lower-left corner
 * @property {number} dx - Width of the viewport
 * @property {number} dy - Height of the viewport
 * @property {number} w - Total canvas width
 * @property {number} h - Total canvas height
 */
/**
 * Camera class that manages viewport parameters and camera transformations.
 * Acts as a container for parameters needed to define the viewport and camera position,
 * supporting smooth animations between positions using source and target transforms.
 *
 * The camera maintains two Transform objects:
 * - source: represents current position
 * - target: represents destination position
 *
 * Animation between positions is handled automatically by the OpenLIME system
 * unless manually interrupted by user input.
 */
export class Camera {
    /**
     * Creates a new Camera instance.
     * @param {Object} [options] - Configuration options
     * @param {boolean} [options.bounded=true] - Whether to limit camera translation to scene boundaries
     * @param {number} [options.maxFixedZoom=2] - Maximum allowed pixel size
     * @param {number} [options.minScreenFraction=1] - Minimum portion of screen to show when zoomed in
     * @param {Transform} [options.target] - Initial target transform
     * @fires Camera#update
     */
    constructor(options?: {
        bounded?: boolean;
        maxFixedZoom?: number;
        minScreenFraction?: number;
        target?: Transform;
    });
    target: Transform;
    source: Transform;
    easing: string;
    /**
     * Creates a deep copy of the camera instance.
     * @returns {Camera} A new Camera instance with copied properties
     */
    copy(): Camera;
    /**
    * Updates the viewport while maintaining the camera position as close as possible to the previous one.
    * @param {Viewport} view - The new viewport in CSS coordinates
    */
    setViewport(view: Viewport): void;
    viewport: Viewport;
    /**
     * Returns the current viewport in device coordinates (accounting for device pixel ratio).
     * @returns {Viewport} The current viewport scaled for device pixels
     */
    glViewport(): Viewport;
    /**
     * Sets the camera target parameters for a new position.
     * @param {number} dt - Animation duration in milliseconds
     * @param {number} x - X component of translation
     * @param {number} y - Y component of translation
     * @param {number} z - Zoom factor
     * @param {number} a - Rotation angle in degrees
     * @param {string} [easing] - Easing function name for animation
     * @fires Camera#update
     */
    setPosition(dt: number, x: number, y: number, z: number, a: number, easing?: string): void;
    /**
     * Pans the camera by a specified amount in canvas coordinates.
     * @param {number} dt - Animation duration in milliseconds
     * @param {number} dx - Horizontal displacement
     * @param {number} dy - Vertical displacement
     */
    pan(dt: number, dx: number, dy: number): void;
    /**
     * Zooms the camera to a specific point in canvas coordinates.
     * @param {number} dt - Animation duration in milliseconds
     * @param {number} z - Target zoom level
     * @param {number} [x=0] - X coordinate to zoom towards
     * @param {number} [y=0] - Y coordinate to zoom towards
     */
    zoom(dt: number, z: number, x?: number, y?: number): void;
    /**
     * Rotates the camera around its z-axis.
     * @param {number} dt - Animation duration in milliseconds
     * @param {number} a - Rotation angle in degrees
     */
    rotate(dt: number, a: number): void;
    /**
     * Applies a relative zoom change at a specific point.
     * @param {number} dt - Animation duration in milliseconds
     * @param {number} dz - Relative zoom change factor
     * @param {number} [x=0] - X coordinate to zoom around
     * @param {number} [y=0] - Y coordinate to zoom around
     */
    deltaZoom(dt: number, dz: number, x?: number, y?: number): void;
    /**
     * Gets the camera transform at a specific time.
     * @param {number} time - Current time in milliseconds (from performance.now())
     * @returns {Transform} The interpolated transform at the specified time with isComplete flag
     */
    getCurrentTransform(time: number): Transform;
    /**
    * Checks if the camera animation has completed.
    * @param {Transform} currentTransform - The current transform (optional, will be calculated if not provided)
    * @returns {boolean} True if the camera has reached its target position
    */
    hasReachedTarget(currentTransform: Transform): boolean;
    /**
     * Gets the camera transform at a specific time in device coordinates.
     * @param {number} time - Current time in milliseconds (from performance.now())
     * @returns {Transform} The interpolated transform scaled for device pixels
     */
    getGlCurrentTransform(time: number): Transform;
    /**
     * Adjusts the camera to frame a specified bounding box.
     * @param {BoundingBox} box - The box to frame in canvas coordinates
     * @param {number} [dt=0] - Animation duration in milliseconds
     */
    fit(box: BoundingBox, dt?: number): void;
    /**
     * Resets the camera to show the entire scene.
     * @param {number} dt - Animation duration in milliseconds
     */
    fitCameraBox(dt: number): void;
    /**
     * Updates the camera's boundary constraints and zoom limits.
     * @private
     * @param {BoundingBox} box - New bounding box for constraints
     * @param {number} minScale - Minimum scale factor
     */
    private updateBounds;
    boundingBox: BoundingBox;
    minZoom: number;
    maxZoom: any;
}
/**
 * Canvas class that manages WebGL context, layers, and scene rendering.
 * Handles layer management, WebGL context creation/restoration, and render timing.
 */
export class Canvas {
    /**
     * Creates a new Canvas instance with WebGL context and overlay support.
     * @param {HTMLCanvasElement|string} canvas - Canvas DOM element or selector
     * @param {HTMLElement|string} overlay - Overlay DOM element or selector for decorations (annotations, glyphs)
     * @param {Camera} camera - Scene camera instance
     * @param {Object} [options] - Configuration options
     * @param {Object} [options.layers] - Layer configurations mapping layer IDs to Layer instances
     * @param {boolean} [options.preserveDrawingBuffer=false] - Whether to preserve WebGL buffers until manually cleared
     * @param {number} [options.targetfps=30] - Target frames per second for rendering
     * @param {boolean} [options.srgb=true] - Whether to enable sRGB color space or display-P3 for the output framebuffer
     * @param {boolean} [options.stencil=false] - Whether to enable stencil buffer support
     * @param {boolean} [options.useOffscreenFramebuffer=true] - Whether to use offscreen framebuffer for rendering
     * @fires Canvas#update
     * @fires Canvas#updateSize
     * @fires Canvas#ready
     */
    constructor(canvas: HTMLCanvasElement | string, overlay: HTMLElement | string, camera: Camera, options?: {
        layers?: any;
        preserveDrawingBuffer?: boolean;
        targetfps?: number;
        srgb?: boolean;
        stencil?: boolean;
        useOffscreenFramebuffer?: boolean;
    });
    /**
     * Records render timing information and updates FPS statistics.
     * @param {number} elapsed - Time elapsed since last frame in milliseconds
     * @private
     */
    private addRenderTiming;
    overBudget: number;
    fps: number;
    /**
     * Initializes WebGL context and sets up event listeners.
     * @param {HTMLCanvasElement|string} canvas - Canvas element or selector
     * @param {HTMLElement|string} overlay - Overlay element or selector
     * @throws {Error} If canvas or overlay elements cannot be found or initialized
     * @private
     */
    private init;
    canvasElement: string | HTMLCanvasElement;
    overlayElement: string | HTMLElement;
    gl: any;
    hasFloatRender: boolean;
    hasLinearFloat: boolean;
    /**
     * Sets up the offscreen framebuffer for rendering
     * @private
     */
    private setupOffscreenFramebuffer;
    offscreenFramebuffer: any;
    offscreenTexture: any;
    offscreenRenderbuffer: any;
    useOffscreenFramebuffer: boolean;
    /**
     * Resizes the offscreen framebuffer when canvas size changes
     * @private
     */
    private resizeOffscreenFramebuffer;
    /**
     * Gets the currently active framebuffer.
     * Use this when you need to save the state before changing framebuffers.
     * @returns {WebGLFramebuffer} The currently active framebuffer
     */
    getActiveFramebuffer(): WebGLFramebuffer;
    /**
     * Sets the active framebuffer.
     * Use this to restore a previously saved state.
     * @param {WebGLFramebuffer} framebuffer - The framebuffer to activate
     */
    setActiveFramebuffer(framebuffer: WebGLFramebuffer): void;
    _renderingToOffscreen: boolean;
    /**
    * Updates the state of the canvas and its components.
    * @param {Object} state - State object containing updates
    * @param {Object} [state.camera] - Camera state updates
    * @param {Object} [state.layers] - Layer state updates
    * @param {number} dt - Animation duration in milliseconds
    * @param {string} [easing='linear'] - Easing function for animations
    */
    setState(state: {
        camera?: any;
        layers?: any;
    }, dt: number, easing?: string): void;
    /**
    * Retrieves current state of the canvas and its components.
    * @param {Object} [stateMask=null] - Optional mask to filter returned state properties
    * @returns {Object} Current state object
    */
    getState(stateMask?: any): any;
    /**
     * Restores WebGL context after loss.
     * Reinitializes shaders and textures for all layers.
     * @private
     */
    private restoreWebGL;
    /**
     * Adds a layer to the canvas.
     * @param {string} id - Unique identifier for the layer
     * @param {Layer} layer - Layer instance to add
     * @fires Canvas#update
     * @fires Canvas#ready
     * @throws {Error} If layer ID already exists
     */
    addLayer(id: string, layer: Layer): void;
    ready: boolean;
    /**
     * Removes a layer from the canvas.
     * @param {Layer} layer - Layer instance to remove
     * @example
     * const layer = new Layer(options);
     * canvas.addLayer('map', layer);
     * // ... later ...
     * canvas.removeLayer(layer);
     */
    removeLayer(layer: Layer): void;
    updateSize(): void;
    /**
     * Enables or disables split viewport mode and sets which layers appear on each side
     * @param {boolean} enabled - Whether split viewport mode is enabled
     * @param {string[]} leftLayerIds - Array of layer IDs to show on left side
     * @param {string[]} rightLayerIds - Array of layer IDs to show on right side
     * @fires Canvas#update
     */
    setSplitViewport(enabled: boolean, leftLayerIds?: string[], rightLayerIds?: string[]): void;
    splitViewport: boolean;
    leftLayers: string[];
    rightLayers: string[];
    /**
     * Renders a frame at the specified time.
     * @param {number} time - Current time in milliseconds
     * @returns {boolean} True if all animations are complete
     * @private
     */
    private draw;
    /**
     * Draws the offscreen framebuffer texture to the canvas
     * @private
     */
    private drawOffscreenToCanvas;
    _fullscreenQuadProgram: WebGLProgram;
    _positionLocation: any;
    _texCoordLocation: any;
    _textureLocation: any;
    _quadPositionBuffer: any;
    _quadTexCoordBuffer: any;
    _quadVAO: any;
    /**
     * Helper method to create a shader
     * @param {WebGL2RenderingContext} gl - WebGL context
     * @param {number} type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
     * @param {string} source - Shader source code
     * @returns {WebGLShader} Compiled shader
     * @private
     */
    private _createShader;
    /**
     * Helper method to create a shader program
     * @param {WebGL2RenderingContext} gl - WebGL context
     * @param {WebGLShader} vertexShader - Vertex shader
     * @param {WebGLShader} fragmentShader - Fragment shader
     * @returns {WebGLProgram} Linked shader program
     * @private
     */
    private _createProgram;
    /**
     * Schedules tile downloads based on current view.
     * @param {Object} [transform] - Optional transform override, defaults to current camera transform
     * @private
     */
    private prefetch;
    /**
     * Cleanup resources when canvas is no longer needed
     */
    dispose(): void;
}
/**
 * Represents a color in RGBA format with values normalized between 0 and 1.
 */
export class Color {
    static clamp: (num: any, min?: number, max?: number) => number;
    static hex(c: any): any;
    static normalizedRGBA(c: any): number;
    static rgbToHex(r: any, g: any, b: any): string;
    static rgbToHexa(r: any, g: any, b: any, a: any): string;
    /**
     * Creates a new Color instance.
     * @param {number|string} r - Red component [0.0, 1.0] or color string ('#RGB', '#RGBA', '#RRGGBB', '#RRGGBBAA', 'rgb()', 'rgba()')
     * @param {number} [g] - Green component [0.0, 1.0]
     * @param {number} [b] - Blue component [0.0, 1.0]
     * @param {number} [a] - Alpha component [0.0, 1.0]
     * @throws {Error} If string value is not a valid color format
     */
    constructor(r: number | string, g?: number, b?: number, a?: number);
    r: number;
    g: number;
    b: number;
    a: number;
    /**
     * Gets color components as an array.
     * @returns {number[]} Array of [r, g, b, a] values
     */
    value(): number[];
    /**
     * Converts color to RGB values [0, 255].
     * @returns {number[]} Array of [r, g, b] values
     */
    toRGB(): number[];
    /**
     * Converts color to hexadecimal string.
     * @returns {string} Color in '#RRGGBB' format
     */
    toHex(): string;
    /**
     * Converts color to hexadecimal string with alpha.
     * @returns {string} Color in '#RRGGBBAA' format
     */
    toHexa(): string;
    /**
     * Converts color to RGBA values [0-255].
     * @returns {number[]} Array of [r, g, b, a] values
     */
    toRGBA(): number[];
}
/**
 * Creates a colormap for mapping numerical values to colors.
 * Supports linear, spline, and bar interpolation between colors.
 */
export class Colormap {
    static clamp: (num: any, min: any, max: any) => number;
    /**
     * Creates a new Colormap instance.
     * @param {Color[]} [colors=[black, white]] - Array of colors to interpolate between
     * @param {Object} [options] - Configuration options
     * @param {number[]} [options.domain=[0,1]] - Domain range for mapping
     * @param {Color} [options.lowColor] - Color for values below domain (defaults to first color)
     * @param {Color} [options.highColor] - Color for values above domain (defaults to last color)
     * @param {string} [options.description=''] - Description of the colormap
     * @param {('linear'|'spline'|'bar')} [options.type='linear'] - Interpolation type
     * @throws {Error} If colors/domain format is invalid
     */
    constructor(colors?: Color[], options?: {
        domain?: number[];
        lowColor?: Color;
        highColor?: Color;
        description?: string;
        type?: ('linear' | 'spline' | 'bar');
    });
    lowColor: Color;
    highColor: Color;
    xarr: any[];
    rarr: number[];
    garr: number[];
    barr: number[];
    aarr: number[];
    rspline: Spline;
    gspline: Spline;
    bspline: Spline;
    aspline: Spline;
    /**
     * Gets the domain range of the colormap.
     * @returns {number[]} Array containing [min, max] of domain
     */
    rangeDomain(): number[];
    /**
     * Gets color for a value using bar interpolation.
     * @param {number} x - Value to get color for
     * @returns {Color} Corresponding color
     * @private
     */
    private bar;
    /**
     * Gets color for a value using linear interpolation.
     * @param {number} x - Value to get color for
     * @returns {Color} Corresponding color
     * @private
     */
    private linear;
    /**
     * Gets color for a value using spline interpolation.
     * @param {number} x - Value to get color for
     * @returns {Color} Corresponding color
     * @private
     */
    private spline;
    /**
     * Gets color for a value using configured interpolation type.
     * @param {number} x - Value to get color for
     * @returns {Color} Corresponding color
     * @throws {Error} If interpolation type is invalid
     */
    at(x: number): Color;
    /**
     * Samples the colormap into a buffer.
     * @param {number} maxSteps - Number of samples to generate
     * @returns {{min: number, max: number, buffer: Uint8Array}} Sample data and buffer
     */
    sample(maxSteps: number): {
        min: number;
        max: number;
        buffer: Uint8Array;
    };
}
/**
 * Creates a visual legend for a colormap.
 */
export class ColormapLegend {
    /**
     * Creates a new ColormapLegend instance.
     * @param {Object} viewer - Viewer instance to attach legend to
     * @param {Colormap} colorscale - Colormap to create legend for
     * @param {Object} [options] - Configuration options
     * @param {number} [options.nticks=6] - Number of ticks/divisions in legend
     * @param {number} [options.legendWidth=25] - Width of legend as percentage
     * @param {string} [options.textColor='#fff'] - Color of text labels
     * @param {string} [options.class='openlime-legend'] - CSS class for legend container
     */
    constructor(viewer: any, colorscale: Colormap, options?: {
        nticks?: number;
        legendWidth?: number;
        textColor?: string;
        class?: string;
    });
    viewer: any;
    colorscale: Colormap;
    container: Element;
    scale: HTMLDivElement;
    /**
     * Creates legend for linear interpolation.
     * @private
     */
    private legendLinear;
    /**
     * Creates legend for bar interpolation.
     * @private
     */
    private legendBar;
}
/**
 * Base class that handles user interaction via device events (mouse/touch events).
 * Provides an abstract user interface to define interaction actions such as panning, pinching, tapping, etc...
 * The actions are implemented by pre-defined callback functions:
 * * `panStart(e)` intercepts the initial pan event (movement of the mouse after pressing a mouse button or moving a finger).
 * The event is captured calling `e.preventDefault()`.
 * * `panMove(e)` receives and handles the pan event.
 * * `panEnd(e)` intercepts the final pan event (the user releases the left mouse button or removes his finger from the screen).
 * * `pinchStart(e1, e2)` intercepts the initial pinch event (a continuous gesture that tracks the positions between the first two fingers that touch the screen).
 * The event is captured calling `e1.preventDefault()`.
 * * `pinchMove(e1,e2)` receives and handles the pinch event.
 * * `pinchEnd(e1,e2)` intercepts the final pinch event (the user removes one of their two fingers from the screen).
 * * `mouseWheel(e)` receives and handles the mouse wheel event (the user rotates the mouse wheel button).
 * * `fingerSingleTap(e)` receives and handles the single-tap event (the user presses a mouse button quickly or touches the screen shortly with a finger).
 * * `fingerDoubleTap(e)` receives and handles the double-tap event (the user quickly presses a mouse button twice or shortly touches the screen with a finger twice).
 *
 * `e.preventDefault()` will capture the event and wont be propagated to other controllers.
 *
 * This class only describes user interactions by implementing actions or callbacks. A **Controller** works in concert with a **PointerManager** object
 * that emits events and links them to actions.
 *
 * @abstract
 * @example
 * // Create a pan-zoom controller and associate it with the viewer's pointer manager
 * const panzoom = new OpenLIME.ControllerPanZoom(viewer.camera, {
 *     priority: -1000,
 *     activeModifiers: [0, 1]
 * });
 * viewer.pointerManager.onEvent(panzoom);
 */
export class Controller {
    /**
     * Creates a new Controller instance.
     * @param {Object} [options] - Configuration options
     * @param {boolean} [options.active=true] - Whether the controller is initially active
     * @param {boolean} [options.debug=false] - Enable debug logging
     * @param {number} [options.panDelay=50] - Inertial value for panning movements in milliseconds
     * @param {number} [options.zoomDelay=200] - Delay for smoothing zoom events in milliseconds
     * @param {number} [options.priority=0] - Controllers with higher priority are invoked first
     * @param {number[]} [options.activeModifiers=[0]] - Array of modifier states that activate this controller
     */
    constructor(options?: {
        active?: boolean;
        debug?: boolean;
        panDelay?: number;
        zoomDelay?: number;
        priority?: number;
        activeModifiers?: number[];
    });
    /**
     * Gets the modifier state from an event.
     * @param {Event} e - The event to check
     * @returns {number} Modifier state bitmask where:
     * - 0 = No modifiers
     * - 1 = Ctrl key
     * - 2 = Shift key
     * - 4 = Alt key
     * Multiple modifiers combine their values (e.g., Ctrl+Shift = 3)
     */
    modifierState(e: Event): number;
    /**
     * Captures all events, preventing them from reaching other controllers.
     * @private
     */
    private captureEvents;
    capture: boolean;
    /**
     * Releases event capture, allowing events to reach other controllers.
     * @private
     */
    private releaseEvents;
    /**
     * Handles the start of a pan gesture.
     * @virtual
     * @param {Event} e - The pan start event
     * @description Called when user starts panning (mouse down or finger touch).
     * Call e.preventDefault() to capture the event.
     */
    panStart(e: Event): void;
    /**
     * Handles pan movement.
     * @virtual
     * @param {Event} e - The pan move event
     * @description Called continuously during panning.
     */
    panMove(e: Event): void;
    /**
     * Handles the end of a pan gesture.
     * @virtual
     * @param {Event} e - The pan end event
     * @description Called when panning ends (mouse up or finger lift).
     */
    panEnd(e: Event): void;
    /**
     * Handles the start of a pinch gesture.
     * @virtual
     * @param {Event} e1 - First finger event
     * @param {Event} e2 - Second finger event
     * @description Called when user starts a two-finger pinch.
     * Call e1.preventDefault() to capture the event.
     */
    pinchStart(e1: Event, e2: Event): void;
    /**
     * Handles pinch movement.
     * @virtual
     * @param {Event} e1 - First finger event
     * @param {Event} e2 - Second finger event
     * @description Called continuously during pinching.
     */
    pinchMove(e1: Event, e2: Event): void;
    /**
     * Handles the end of a pinch gesture.
     * @virtual
     * @param {Event} e1 - First finger event
     * @param {Event} e2 - Second finger event
     * @description Called when pinch ends (finger lift).
     */
    pinchEnd(e1: Event, e2: Event): void;
    /**
     * Handles mouse wheel events.
     * @virtual
     * @param {WheelEvent} e - The wheel event
     * @description Called when user rotates mouse wheel.
     */
    mouseWheel(e: WheelEvent): void;
    /**
     * Handles single tap/click events.
     * @virtual
     * @param {Event} e - The tap event
     * @description Called for quick mouse press or short finger touch.
     */
    fingerSingleTap(e: Event): void;
    /**
     * Handles double tap/click events.
     * @virtual
     * @param {Event} e - The double tap event
     * @description Called for quick double mouse press or double finger touch.
     */
    fingerDoubleTap(e: Event): void;
}
/**
 * Controller for handling 2D position updates based on pan and tap events.
 * Extends the base Controller to track a 2D position (x, y) of the device pointer.
 *
 * Supports two coordinate systems:
 * - Absolute: Coordinates mapped to [-1, 1] with origin at bottom-left of canvas
 * - Relative: Coordinates based on distance from initial pan position, scaled by speed
 *
 * @extends Controller
 */
export class Controller2D extends Controller {
    /**
     * Creates a new Controller2D instance.
     * @param {updatePosition} callback - Function called when position is updated
     * @param {Object} [options] - Configuration options
     * @param {boolean} [options.relative=false] - Whether to use relative coordinate system
     * @param {number} [options.speed=2.0] - Scaling factor for relative coordinates
     * @param {BoundingBox} [options.box] - Bounding box for coordinate constraints
     * @param {updatePosition} [options.onPanStart] - Callback for pan start event
     * @param {updatePosition} [options.onPanEnd] - Callback for pan end event
     * @param {boolean} [options.active=true] - Whether the controller is active
     * @param {number[]} [options.activeModifiers=[0]] - Array of active modifier states
     */
    constructor(callback: updatePosition, options?: {
        relative?: boolean;
        speed?: number;
        box?: BoundingBox;
        onPanStart?: updatePosition;
        onPanEnd?: updatePosition;
        active?: boolean;
        activeModifiers?: number[];
    });
    callback: updatePosition;
    box: BoundingBox;
    panning: boolean;
    /**
     * Updates the stored position for relative coordinate system.
     * This is a convenience method typically used within callbacks.
     * @param {number} x - New X coordinate in range [-1, 1]
     * @param {number} y - New Y coordinate in range [-1, 1]
     */
    setPosition(x: number, y: number): void;
    current_x: any;
    current_y: any;
    /**
     * Maps canvas pixel coordinates to normalized coordinates [-1, 1].
     * @param {MouseEvent|TouchEvent} e - Mouse or touch event
     * @returns {number[]} Array containing [x, y] in normalized coordinates
     * @private
     */
    private project;
    /**
     * Converts event coordinates to the appropriate coordinate system (absolute or relative).
     * @param {MouseEvent|TouchEvent} e - Mouse or touch event
     * @returns {number[]} Array containing [x, y] in the chosen coordinate system
     * @private
     */
    private rangeCoords;
    /**
     * Handles start of pan gesture.
     * @param {MouseEvent|TouchEvent} e - Pan start event
     * @override
     */
    override panStart(e: MouseEvent | TouchEvent): void;
    start_x: number;
    start_y: number;
    /**
     * Handles pan movement.
     * @param {MouseEvent|TouchEvent} e - Pan move event
     * @returns {boolean} False if not currently panning
     * @override
     */
    override panMove(e: MouseEvent | TouchEvent): boolean;
    /**
     * Handles end of pan gesture.
     * @param {MouseEvent|TouchEvent} e - Pan end event
     * @returns {boolean} False if not currently panning
     * @override
     */
    override panEnd(e: MouseEvent | TouchEvent): boolean;
    /**
     * Handles single tap/click events.
     * Only processes events in absolute coordinate mode.
     * @param {MouseEvent|TouchEvent} e - Tap event
     * @override
     */
    override fingerSingleTap(e: MouseEvent | TouchEvent): void;
}
/**
 * Controller for handling Focus+Context visualization interactions.
 * Manages lens-based focus region and context region interactions including
 * panning, zooming, and lens radius adjustments.
 * @fires ControllerFocusContext#panStart - Emitted when a pan operation begins, with timestamp
 * @fires ControllerFocusContext#panEnd - Emitted when a pan operation ends, with timestamp
 * @fires ControllerFocusContext#pinchStart - Emitted when a pinch operation begins, with timestamp
 * @fires ControllerFocusContext#pinchEnd - Emitted when a pinch operation ends, with timestamp
 * @extends ControllerLens
 */
export class ControllerFocusContext extends ControllerLens {
    /**
     * Helper method to trigger updates.
     * @param {Object} param - Object containing update method
     * @private
     */
    private static callUpdate;
    /**
     * Creates a new ControllerFocusContext instance.
     * @param {Object} options - Configuration options
     * @param {number} [options.updateTimeInterval=50] - Time interval for position updates in ms
     * @param {number} [options.updateDelay=100] - Delay for position updates in ms
     * @param {number} [options.zoomDelay=150] - Delay for zoom animations in ms
     * @param {number} [options.zoomAmount=1.5] - Scale factor for zoom operations
     * @param {number} [options.priority=-100] - Controller priority
     * @param {boolean} [options.enableDirectContextControl=true] - Enable direct manipulation of context region
     * @param {Layer} options.lensLayer - Layer to use for lens visualization
     * @param {Camera} options.camera - Camera instance to control
     * @param {Canvas} options.canvas - Canvas instance to monitor
     * @throws {Error} If required options (lensLayer, camera, canvas) are missing
     */
    constructor(options: {
        updateTimeInterval?: number;
        updateDelay?: number;
        zoomDelay?: number;
        zoomAmount?: number;
        priority?: number;
        enableDirectContextControl?: boolean;
        lensLayer: Layer;
        camera: Camera;
        canvas: Canvas;
    });
    maxDatasetSize: number;
    minDatasetSize: number;
    imageSize: {
        w: number;
        h: number;
    };
    FocusContextEnabled: boolean;
    centerToClickOffset: {
        x: number;
        y: number;
    };
    previousClickPos: {
        x: number;
        y: number;
    };
    currentClickPos: {
        x: number;
        y: number;
    };
    insideLens: {
        inside: boolean;
        border: boolean;
    };
    panningCamera: boolean;
    initialTransform: any;
    initialPinchDistance: number;
    initialPinchRadius: number;
    initialPinchPos: {
        x: number;
        y: number;
    };
    timeOut: NodeJS.Timeout;
    /**
     * Starts zoom operation when clicking on lens border.
     * @param {PointerEvent} pe - Pointer event
     */
    zoomStart(pe: PointerEvent): void;
    /**
     * Handles zoom movement when dragging lens border.
     * @param {PointerEvent} pe - Pointer event
     */
    zoomMove(pe: PointerEvent): void;
    /**
     * Updates zoom during continuous operation.
     * @private
     */
    private zoomUpdate;
    /**
     * Handles mouse wheel events to simulate a pinch event.
     * @param {WheelEvent} e - Wheel event
     * @override
     */
    override mouseWheel(e: WheelEvent): void;
    /**
     * Updates lens radius and adjusts camera to maintain Focus+Context condition.
     * @param {number} dz - Scale factor for radius adjustment
     */
    updateRadiusAndScale(dz: number): void;
    /**
     * Updates camera scale around a specific point.
     * @param {number} x - X coordinate of zoom center
     * @param {number} y - Y coordinate of zoom center
     * @param {number} dz - Scale factor
     * @private
     */
    private updateScale;
    /**
     * Handles end of pan operation.
     * @override
     */
    override panEnd(): void;
    /**
     * Updates lens and camera positions based on current interaction.
     * @private
     */
    private update;
    /**
     * Calculates movement delta since last interaction.
     * @returns {{x: number, y: number}} Position delta
     * @private
     */
    private lastInteractionDelta;
    /**
     * Sets the dimensions of the dataset (image) being visualized.
     * @param {number} width - Dataset width
     * @param {number} height - Dataset height
     * @private
     */
    private setDatasetDimensions;
    /**
     * Initializes lens position and size.
     */
    initLens(): void;
}
/**
 * Controller for handling lens-based interactions.
 * Manages user interactions with a lens overlay including panning, zooming,
 * and lens radius adjustments through mouse/touch events.
 * @extends Controller
 */
export class ControllerLens extends Controller {
    /**
     * Creates a new ControllerLens instance.
     * @param {Object} options - Configuration options
     * @param {Object} options.lensLayer - Layer used for lens visualization
     * @param {Camera} options.camera - Camera instance to control
     * @param {boolean} [options.useGL=false] - Whether to use WebGL coordinates
     * @param {boolean} [options.active=true] - Whether the controller is initially active
     * @throws {Error} If required options (lensLayer, camera) are missing
     */
    constructor(options: {
        lensLayer: any;
        camera: Camera;
        useGL?: boolean;
        active?: boolean;
    });
    panning: boolean;
    zooming: boolean;
    initialDistance: number;
    startPos: {
        x: number;
        y: number;
    };
    oldCursorPos: {
        x: number;
        y: number;
    };
    useGL: boolean;
    /**
     * Handles start of pan operation.
     * @param {PointerEvent} e - Pan start event
     * @override
     */
    override panStart(e: PointerEvent): void;
    /**
     * Handles pan movement.
     * @param {PointerEvent} e - Pan move event
     * @override
     */
    override panMove(e: PointerEvent): void;
    /**
     * Handles end of pan operation.
     * @param {PointerEvent} e - Pan end event
     * @override
     */
    override panEnd(e: PointerEvent): void;
    /**
     * Handles start of pinch operation.
     * @param {PointerEvent} e1 - First finger event
     * @param {PointerEvent} e2 - Second finger event
     * @override
     */
    override pinchStart(e1: PointerEvent, e2: PointerEvent): void;
    initialRadius: any;
    /**
     * Handles pinch movement.
     * @param {PointerEvent} e1 - First finger event
     * @param {PointerEvent} e2 - Second finger event
     * @override
     */
    override pinchMove(e1: PointerEvent, e2: PointerEvent): void;
    /**
     * Handles end of pinch operation.
     * @param {PointerEvent} e - End event
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} scale - Final scale value
     * @override
     */
    override pinchEnd(e: PointerEvent, x: number, y: number, scale: number): void;
    /**
     * Handles mouse wheel events.
     * @param {WheelEvent} e - Wheel event
     * @returns {boolean} True if event was handled
     * @override
     */
    override mouseWheel(e: WheelEvent): boolean;
    /**
     * Initiates zoom operation when clicking on lens border.
     * @param {Object} pe - Pixel position in canvas coordinates
     * @param {number} pe.offsetX - X offset from canvas left
     * @param {number} pe.offsetY - Y offset from canvas top
     */
    zoomStart(pe: {
        offsetX: number;
        offsetY: number;
    }): void;
    deltaR: number;
    /**
     * Updates zoom when dragging lens border.
     * @param {Object} pe - Pixel position in canvas coordinates
     * @param {number} pe.offsetX - X offset from canvas left
     * @param {number} pe.offsetY - Y offset from canvas top
     */
    zoomMove(pe: {
        offsetX: number;
        offsetY: number;
    }): void;
    /**
     * Ends zoom operation.
     */
    zoomEnd(): void;
    /**
     * Gets current focus state.
     * @returns {{position: {x: number, y: number}, radius: number}} Focus state object
     */
    getFocus(): {
        position: {
            x: number;
            y: number;
        };
        radius: number;
    };
    /**
     * Checks if a point is inside the lens.
     * @param {Object} p - Point to check in scene coordinates
     * @param {number} p.x - X coordinate
     * @param {number} p.y - Y coordinate
     * @returns {{inside: boolean, border: boolean}} Whether point is inside lens and/or on border
     */
    isInsideLens(p: {
        x: number;
        y: number;
    }): {
        inside: boolean;
        border: boolean;
    };
    /**
     * Converts position from canvas HTML coordinates to viewport coordinates.
     * @param {PointerEvent} e - event
     * @returns {{x: number, y: number}} Position in viewport coordinates (origin at bottom-left, y up)
     */
    getPixelPosition(e: PointerEvent): {
        x: number;
        y: number;
    };
    /**
     * Converts position from canvas HTML coordinates to scene coordinates.
     * @param {PointerEvent} e - event
     * @returns {{x: number, y: number}} Position in scene coordinates (origin at center, y up)
     */
    getScenePosition(e: PointerEvent): {
        x: number;
        y: number;
    };
    /**
     * Calculates distance between two points.
     * @param {PointerEvent} e1 - event
     * @param {PointerEvent} e2 - event
     * @returns {number} Distance between points
     * @private
     */
    private distance;
}
/**
 * ControllerPanZoom handles pan, zoom, and interaction events in a canvas element to manipulate camera parameters.
 * It supports multiple interaction methods including:
 * - Mouse drag for panning
 * - Mouse wheel for zooming
 * - Touch gestures (pinch to zoom)
 * - Double tap to zoom
 *
 * The controller maintains state for ongoing pan and zoom operations and can be configured
 * to use different coordinate systems (HTML or GL) for calculations.
 *
 * @extends Controller
 * @fires ControllerPanZoom#nowheel - Emitted when a wheel event is received but ctrl key is required and not pressed
 */
export class ControllerPanZoom extends Controller {
    /**
     * Creates a new ControllerPanZoom instance.
     * @param {Camera} camera - The camera object to control
     * @param {Object} [options] - Configuration options
     * @param {number} [options.zoomAmount=1.2] - The zoom multiplier for wheel/double-tap events
     * @param {boolean} [options.controlZoom=false] - If true, requires Ctrl key to be pressed for zoom operations
     * @param {boolean} [options.useGLcoords=false] - If true, uses WebGL coordinate system instead of HTML
     * @param {number} [options.panDelay] - Delay for pan animations
     * @param {number} [options.zoomDelay] - Delay for zoom animations
     */
    constructor(camera: Camera, options?: {
        zoomAmount?: number;
        controlZoom?: boolean;
        useGLcoords?: boolean;
        panDelay?: number;
        zoomDelay?: number;
    });
    camera: Camera;
    zoomAmount: number;
    controlZoom: boolean;
    panning: boolean;
    initialTransform: Transform;
    startMouse: {
        x: any;
        y: number;
    };
    zooming: boolean;
    initialDistance: number;
    useGLcoords: boolean;
    /**
     * Handles the start of a pan operation
     * @private
     * @param {PointerEvent} e - The pointer event that initiated the pan
     */
    private panStart;
    /**
     * Updates camera position during a pan operation
     * @private
     * @param {PointerEvent} e - The pointer event with new coordinates
     */
    private panMove;
    /**
     * Ends the current pan operation
     * @private
     * @param {PointerEvent} e - The pointer event that ended the pan
     */
    private panEnd;
    /**
     * Calculates the Euclidean distance between two points
     * @private
     * @param {Object} e1 - First point with x, y coordinates
     * @param {Object} e2 - Second point with x, y coordinates
     * @returns {number} The distance between the points
     */
    private distance;
    /**
     * Initializes a pinch zoom operation
     * @private
     * @param {TouchEvent} e1 - First touch point
     * @param {TouchEvent} e2 - Second touch point
     */
    private pinchStart;
    /**
     * Updates zoom level during a pinch operation
     * @private
     * @param {TouchEvent} e1 - First touch point
     * @param {TouchEvent} e2 - Second touch point
     */
    private pinchMove;
    /**
     * Ends the current pinch zoom operation
     * @private
     * @param {TouchEvent} e - The touch event that ended the pinch
     * @param {number} x - The x coordinate of the pinch center
     * @param {number} y - The y coordinate of the pinch center
     * @param {number} scale - The final scale factor
     */
    private pinchEnd;
    /**
     * Handles double tap events for zooming
     * @private
     * @param {PointerEvent} e - The pointer event representing the double tap
     */
    private fingerDoubleTap;
}
/**
 * Contain functions to pass between different coordinate system.
 * Here described the coordinate system in sequence
 * - CanvasHTML: Html coordinates: 0,0 left,top to width height at bottom right (y Down)
 * - CanvasContext: Same as Html, but scaled by devicePixelRatio (y Down) (required for WebGL, not for SVG)
 * - Viewport: 0,0 left,bottom to (width,height) at top right (y Up)
 * - Center: 0,0 at viewport center (y Up)
 * - Scene: 0,0 at dataset center (y Up). The dataset is placed here through the camera transform
 * - Layer: 0,0 at Layer center (y Up). Layer is placed over the dataset by the layer transform
 * - Image: 0,0 at left,top (y Down)
 * - Layout: 0,0 at left,top (y Down). Depends on layout
 */
export class CoordinateSystem {
    /**
     * Transform point from Viewport to CanvasHTML
     * @param {*} p point in Viewport: 0,0 at left,bottom
     * @param {Camera} camera Camera which contains viewport information
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns  point in CanvasHtml: 0,0 left,top
     */
    static fromViewportToCanvasHtml(p: any, camera: Camera, useGL: bool): {
        x: any;
        y: number;
    };
    /**
     * Transform point from CanvasHTML to GLViewport
     * @param {*} p point in CanvasHtml: 0,0 left,top y Down
     * @param {Camera} camera Camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns  point in GLViewport: 0,0 left,bottom, scaled by devicePixelRatio
     */
    static fromCanvasHtmlToViewport(p: any, camera: Camera, useGL: bool): {
        x: any;
        y: number;
    };
    /**
     * Transform a point from Viewport to Layer coordinates
     * @param {*} p point {x,y} in Viewport (0,0 left,bottom, y Up)
     * @param {Camera} camera camera
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns point in Layer coordinates (0, 0 at layer center, y Up)
     */
    static fromViewportToLayer(p: any, camera: Camera, layerT: Transform, useGL: bool): Point;
    /**
     * Transform a point from Layer to Viewport coordinates
     * @param {*} p point {x,y} Layer (0,0 at Layer center y Up)
     * @param {Camera} camera
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns point in viewport coordinates (0,0 at left,bottom y Up)
     */
    static fromLayerToViewport(p: any, camera: Camera, layerT: Transform, useGL: bool): Point;
    /**
     * Transform a point from Layer to Center
     * @param {*} p point {x,y} in Layer coordinates (0,0 at Layer center)
     * @param {Camera} camera camera
     * @param {Transform} layerT layer transform
     * @returns point in Center (0, 0 at glViewport center) coordinates.
     */
    static fromLayerToCenter(p: any, camera: Camera, layerT: Transform, useGL: any): Point;
    /**
     * Transform a point from Layer to Image coordinates
     * @param {*} p point {x, y} Layer coordinates (0,0 at Layer center)
     * @param {*} layerSize {w, h} Size in pixel of the Layer
     * @returns  Point in Image coordinates (0,0 at left,top, y Down)
     */
    static fromLayerToImage(p: any, layerSize: any): {
        x: any;
        y: number;
    };
    /**
     * Transform a point from CanvasHtml to Scene
     * @param {*} p point {x, y} in CanvasHtml (0,0 left,top, y Down)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Point in Scene coordinates (0,0 at scene center, y Up)
     */
    static fromCanvasHtmlToScene(p: any, camera: Camera, useGL: bool): Point;
    /**
     * Transform a point from Scene to CanvasHtml
     * @param {*} p point {x, y} Scene coordinates (0,0 at scene center, y Up)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Point in CanvasHtml (0,0 left,top, y Down)
     */
    static fromSceneToCanvasHtml(p: any, camera: Camera, useGL: bool): {
        x: any;
        y: number;
    };
    /**
     * Transform a point from Scene to Viewport
     * @param {*} p point {x, y} Scene coordinates (0,0 at scene center, y Up)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Point in Viewport (0,0 left,bottom, y Up)
     */
    static fromSceneToViewport(p: any, camera: Camera, useGL: bool): any;
    /**
     * Transform a point from Scene to Viewport, using given transform and viewport
     * @param {*} p point {x, y} Scene coordinates (0,0 at scene center, y Up)
     * @param {Transform} cameraT camera transform
     * @param {*} viewport viewport {x,y,dx,dy,w,h}
     * @returns Point in Viewport (0,0 left,bottom, y Up)
     */
    static fromSceneToViewportNoCamera(p: any, cameraT: Transform, viewport: any): Point;
    /**
     * Transform a point from Viewport to Scene.
     * @param {*} p point {x, y} Viewport coordinates (0,0 at left,bottom, y Up)
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Point in Viewport (0,0 at scene center, y Up)
     */
    static fromViewportToScene(p: any, camera: Camera, useGL: bool): Point;
    /**
     * Transform a point from Viewport to Scene, using given transform and viewport
     * @param {*} p point {x, y} Viewport coordinates (0,0 at left,bottom, y Up)
     * @param {Transform} cameraT camera transform
     * @param {*} viewport viewport {x,y,dx,dy,w,h}
     * @returns Point in Viewport (0,0 at scene center, y Up)
     */
    static fromViewportToSceneNoCamera(p: any, cameraT: Transform, viewport: any): Point;
    /**
     * Transform a point from CanvasHtml to Image
     * @param {*} p  point {x, y} in CanvasHtml (0,0 left,top, y Down)
     * @param {Camera} camera camera
     * @param {Transform} layerT layer transform
     * @param {*} layerSize  {w, h} Size in pixel of the Layer
     * @param {bool} useGL if true apply devPixelRatio scale. Keep it false when working with SVG
     * @returns Point in Image space (0,0 left,top of the image, y Down)
     */
    static fromCanvasHtmlToImage(p: any, camera: Camera, layerT: Transform, layerSize: any, useGL: bool): Point;
    /**
     * Transform a box from Viewport to Image coordinates
     * @param {BoundingBox} box in Viewport coordinates (0,0 at left,bottom, y Up)
     * @param {Transform} cameraT camera Transform
     * @param {*} viewport {x,y,dx,dy,w,h}
     * @param {Transform} layerT layer transform
     * @param {*} layerSize {w,h} layer pixel size
     * @returns box in Image coordinates (0,0 left,top, y Dowm)
     */
    static fromViewportBoxToImageBox(box: BoundingBox, cameraT: Transform, viewport: any, layerT: Transform, layerSize: any): BoundingBox;
    /**
     * Transform a box from Layer to Scene
     * @param {BoundingBox} box  box in Layer coordinates (0,0 at layer center)
     * @param {Transform} layerT layer transform
     * @returns box in Scene coordinates (0,0 at scene center)
     */
    static fromLayerBoxToSceneBox(box: BoundingBox, layerT: Transform): BoundingBox;
    /**
     * Transform a box from Scene to Layer
     * @param {BoundingBox} box  box in Layer coordinates (0,0 at layer center)
     * @param {Transform} layerT layer transform
     * @returns box in Scene coordinates (0,0 at scene center)
     */
    static fromSceneBoxToLayerBox(box: BoundingBox, layerT: Transform): BoundingBox;
    /**
     * Transform a box from Layer to Viewport coordinates
     * @param {BoundingBox} box box in Layer coordinates (0,0 at Layer center y Up)
     * @param {Camera} camera
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Box in Viewport coordinates (0,0 at left, bottom y Up)
     */
    static fromLayerBoxToViewportBox(box: BoundingBox, camera: Camera, layerT: Transform, useGL: bool): BoundingBox;
    /**
     * Transform a box from Layer to Viewport coordinates
     * @param {BoundingBox} box box in Layer coordinates (0,0 at Layer center y Up)
     * @param {Camera} camera
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns Box in Viewport coordinates (0,0 at left, bottom y Up)
     */
    static fromViewportBoxToLayerBox(box: BoundingBox, camera: Camera, layerT: Transform, useGL: bool): BoundingBox;
    /**
     * Get a transform to go from viewport 0,0 at left, bottom y Up, to Center 0,0 at viewport center
     * @param {Camera} camera camera
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns transform from Viewport to Center
     */
    static getFromViewportToCenterTransform(camera: Camera, useGL: bool): Transform;
    /**
     * Get a transform to go from viewport 0,0 at left, bottom y Up, to Center 0,0 at viewport center
     * from explicit viewport param. (Not using camera parameter here)
     * @param {*} viewport viewport
     * @returns transform from Viewport to Center
     */
    static getFromViewportToCenterTransformNoCamera(viewport: any): Transform;
    /**
     * Return transform with y reflected wrt origin (y=-y)
     * @param {Transform} t
     * @returns {Transform} transform, with y reflected (around 0)
     */
    static reflectY(t: Transform): Transform;
    /**
     * Get a transform to go from Layer (0,0 at Layer center y Up) to Viewport (0,0 at left,bottom y Up)
     * @param {Camera} camera
     * @param {Transform} layerT layer transform
     * @param {bool} useGL True to work with WebGL, false for SVG. When true, it uses devPixelRatio scale
     * @returns transform from Layer to Viewport
     */
    static getFromLayerToViewportTransform(camera: Camera, layerT: Transform, useGL: bool): Transform;
    /**
     * Get a transform to go from Layer (0,0 at Layer center y Up) to Viewport (0,0 at left,bottom y Up)
     * @param {Transform} CameraT camera transform
     * @param {viewport} viewport {x,y,dx,dy,w,h} viewport
     * @param {Transform} layerT layer transform
     * @returns transform from Layer to Viewport
     */
    static getFromLayerToViewportTransformNoCamera(cameraT: any, viewport: any, layerT: Transform): Transform;
    /**
     * Scale x applying f scale factor
     * @param {*} p Point to be scaled
     * @param {Number} f Scale factor
     * @returns Point in CanvasContext (Scaled by devicePixelRation)
     */
    static scale(p: any, f: number): {
        x: number;
        y: number;
    };
    /**
     * Invert y with respect to viewport.h
     * @param {*} p Point to be transformed
     * @param {*} viewport current viewport
     * @returns Point with y inverted with respect to viewport.h
     */
    static invertY(p: any, viewport: any): {
        x: any;
        y: number;
    };
    /**
     * Return the camera viewport: scaled by devicePixelRatio if useGL is true.
     * @param {bool} useGL True to work with WebGL, false for SVG. When true viewport scaled by devPixelRatio
     * @returns Viewport
     */
    static getViewport(camera: any, useGL: bool): any;
    static getCurrentTransform(camera: any, useGL: any): any;
}
/**
 * Draggable class that enables HTML elements to be moved within a parent container.
 *
 * This class creates a draggable container with a handle and attaches the specified
 * element to it. The element can then be dragged around its parent container using
 * the handle, providing an interactive UI element for repositioning content.
 *
 * Features:
 * - Flexible positioning using top/bottom and left/right coordinates
 * - Customizable handle size, color, and appearance
 * - Maintains position relative to parent container edges on window resize
 * - Touch-enabled with pointer events support for multi-device compatibility
 * - Smooth drag animations with visual feedback during movement
 * - Boundary constraints within the parent container
 *
 * @example
 * // Create a draggable element at the bottom-right corner
 * const element = document.getElementById('my-element');
 * const parent = document.querySelector('.parent-container');
 * const draggable = new Draggable(element, parent, {
 *   bottom: 20,
 *   right: 20,
 *   handleColor: 'rgba(100, 150, 200, 0.7)'
 * });
 */
export class Draggable {
    /**
     * Creates a new Draggable instance.
     *
     * @param {HTMLElement} element - The element to be made draggable
     * @param {HTMLElement|string} parent - The parent element where the draggable container will be appended.
     *                                     Can be either an HTMLElement or a CSS selector string
     * @param {Object} [options={}] - Configuration options for the draggable element
     * @param {number|null} [options.top=null] - The initial top position in pixels. Mutually exclusive with bottom
     * @param {number|null} [options.bottom=20] - The initial bottom position in pixels. Mutually exclusive with top
     * @param {number|null} [options.left=null] - The initial left position in pixels. Mutually exclusive with right
     * @param {number|null} [options.right=20] - The initial right position in pixels. Mutually exclusive with left
     * @param {number} [options.handleSize=10] - The size of the drag handle in pixels
     * @param {number} [options.handleGap=5] - The gap between the handle and the draggable content in pixels
     * @param {number} [options.zindex=200] - The z-index of the draggable container
     * @param {string} [options.handleColor='#f0f0f0b3'] - The background color of the handle (supports rgba)
     * @param {number} [options.dragOpacity=0.6] - Opacity of the element while being dragged (between 0 and 1)
     */
    constructor(element: HTMLElement, parent: HTMLElement | string, options?: {
        top?: number | null;
        bottom?: number | null;
        left?: number | null;
        right?: number | null;
        handleSize?: number;
        handleGap?: number;
        zindex?: number;
        handleColor?: string;
        dragOpacity?: number;
    });
    options: {
        top: any;
        bottom: number;
        left: any;
        right: number;
        handleSize: number;
        handleGap: number;
        zindex: number;
        handleColor: string;
        dragOpacity: number;
    };
    element: HTMLElement;
    parent: Element;
    /**
     * Disables the context menu globally if not already disabled.
     * @private
     */
    private setupContextMenu;
    /**
     * Creates the draggable container and handle elements.
     * @private
     */
    private createElements;
    container: HTMLDivElement;
    handle: HTMLDivElement;
    /**
     * Sets up event listeners for window resize.
     * @private
     */
    private setupResizeHandler;
    /**
     * Sets up the drag event listeners for the handle.
     * Manages pointer events for drag operations.
     * @private
     */
    private setupDragEvents;
    /**
     * Appends an HTML element to the draggable container and updates its position.
     * @param {HTMLElement} element - The element to append to the draggable container
     * @returns {Draggable} This instance for method chaining
     */
    appendChild(element: HTMLElement): Draggable;
    /**
     * Updates the position of the draggable container based on its current options and parent dimensions.
     * This method is called automatically on window resize and when elements are appended.
     * @returns {Draggable} This instance for method chaining
     */
    updatePosition(): Draggable;
    /**
     * Shows the draggable element if it's hidden.
     * @returns {Draggable} This instance for method chaining
     */
    show(): Draggable;
    /**
     * Hides the draggable element.
     * @returns {Draggable} This instance for method chaining
     */
    hide(): Draggable;
    /**
     * Changes the handle color.
     * @param {string} color - New color for the handle (hex, rgb, rgba)
     * @returns {Draggable} This instance for method chaining
     */
    setHandleColor(color: string): Draggable;
}
/**
 * EditorSvgAnnotation enables creation and editing of SVG annotations in OpenLIME.
 * Optimized version with simplified erase tool functionality.
 */
export class EditorSvgAnnotation {
    constructor(viewer: any, layer: any, options: any);
    layer: any;
    /**
     * Finds the SVG element under the pointer for erase tool
     * @param {Event} e - The event object
     * @private
     */
    private _findElementUnderPointer;
    /**
     * Calculates the correct pin size based on current zoom level
     * @returns {number} Pin size in pixels
     * @private
     */
    private getCurrentPinSize;
    /**
     * Updates pin sizes in an annotation based on transform
     * @param {Object} anno - Annotation object
     * @param {Object} transform - Current transform
     * @private
     */
    private updateAnnotationPins;
    /**
     * Creates a new annotation with correct initial state
     * @returns {void}
     */
    createAnnotation(): void;
    toggleEditWidget(): void;
    updateEditWidget(): void;
    showEditWidget(anno: any): void;
    annotation: any;
    hideEditWidget(): void;
    createEditWidget(): Promise<void>;
    editWidget: ChildNode;
    _setupFormEventListeners(edit: any): void;
    setAnnotationCurrentState(anno: any): void;
    saveAnnotation(): void;
    deleteSelected(): void;
    deleteAnnotation(id: any): void;
    exportAnnotations(): void;
    setActiveTool(e: any): void;
    setTool(tool: any): void;
    tool: any;
    factory: any;
    undo(): void;
    redo(): void;
    saveCurrent(): void;
    annoToData(anno: any): {
        elements: any;
    };
    dataToAnno(data: any, anno: any): void;
    keyUp(e: any): void;
    panStart(e: any): void;
    panning: boolean;
    panMove(e: any): boolean;
    panEnd(e: any): boolean;
    fingerHover(e: any): void;
    fingerSingleTap(e: any): void;
    fingerDoubleTap(e: any): void;
    mapToSvg(e: any): Point;
}
/**
 * @typedef {Object} Viewport
 * @property {number} x - Viewport x position
 * @property {number} y - Viewport y position
 * @property {number} dx - Viewport horizontal offset
 * @property {number} dy - Viewport vertical offset
 * @property {number} w - Viewport width
 * @property {number} h - Viewport height
 */
/**
 * @typedef {Object} Focus
 * @property {Object} position - Lens center position in dataset coordinates
 * @property {number} position.x - X coordinate
 * @property {number} position.y - Y coordinate
 * @property {number} radius - Lens radius in dataset units
 */
/**
 * FocusContext manages the focus+context visualization technique for lens-based interaction.
 * It handles the distribution of user interactions between lens movement (focus) and camera
 * movement (context) to maintain optimal viewing conditions.
 *
 * Key responsibilities:
 * - Maintains proper spacing between lens and viewport boundaries
 * - Distributes pan and zoom operations between lens and camera
 * - Ensures lens stays within valid viewport bounds
 * - Adapts camera transform to accommodate lens position
 * - Manages lens radius constraints
 */
export class FocusContext {
    /**
     * Distributes a pan operation between lens movement and camera transform to maintain focus+context
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object to be updated
     * @param {Transform} context - The camera transform to be updated
     * @param {Object} delta - Pan amount in dataset pixels
     * @param {number} delta.x - Horizontal pan amount
     * @param {number} delta.y - Vertical pan amount
     * @param {Object} imageSize - Dataset dimensions
     * @param {number} imageSize.w - Dataset width
     * @param {number} imageSize.h - Dataset height
     */
    static pan(viewport: Viewport, focus: Focus, context: Transform, delta: {
        x: number;
        y: number;
    }, imageSize: {
        w: number;
        h: number;
    }): void;
    /**
     * Distributes a scale operation between lens radius and camera zoom to maintain focus+context
     * @param {Camera} camera - The camera object containing viewport and zoom constraints
     * @param {Focus} focus - The lens object to be updated
     * @param {Transform} context - The camera transform to be updated
     * @param {number} dz - Scale factor to be applied (multiplier)
     */
    static scale(camera: Camera, focus: Focus, context: Transform, dz: number): void;
    /**
     * Adjusts the camera transform to ensure focus+context conditions are met for a given lens
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The camera transform to be updated
     * @param {number} desiredScale - Target scale for the camera transform
     */
    static adaptContext(viewport: Viewport, focus: Focus, context: Transform, desiredScale: number): void;
    /**
     * Adjusts camera scale to ensure projected lens fits within viewport bounds
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The camera transform to be updated
     * @private
     */
    private static adaptContextScale;
    /**
     * Adjusts camera position to maintain proper focus+context conditions
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The camera transform to be updated
     * @private
     */
    private static adaptContextPosition;
    /**
     * Calculates focus+context distribution factors for pan operations
     * @param {Viewport} viewport - The current viewport
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The current camera transform
     * @param {Object} panDir - Pan direction vector
     * @param {number} panDir.x - Horizontal direction (-1 to 1)
     * @param {number} panDir.y - Vertical direction (-1 to 1)
     * @returns {Object} Distribution factors for x and y directions (0.5 to 1)
     * @private
     */
    private static getAmountOfFocusContext;
    /**
     * Calculates minimum required distance between lens center and viewport boundary
     * @param {Focus} focus - The lens object
     * @param {Transform} context - The camera transform
     * @returns {number} Minimum distance in canvas pixels
     * @private
     */
    private static getCanvasBorder;
    /**
     * Creates a viewport box shrunk by specified padding
     * @param {Viewport} viewport - The current viewport
     * @param {number} delta - Padding amount in pixels
     * @returns {Object} Box with xLow, yLow, xHigh, yHigh coordinates
     * @private
     */
    private static getShrinkedBox;
    /**
     * Calculates acceptable lens radius range for current viewport
     * @param {Viewport} viewport - The current viewport
     * @returns {Object} Range object with min and max radius values in pixels
     * @private
     */
    private static getRadiusRangeCanvas;
    /**
     * Implements smoothstep interpolation between two values
     * @param {number} x - Input value
     * @param {number} x0 - Lower bound
     * @param {number} x1 - Upper bound
     * @returns {number} Smoothly interpolated value between 0 and 1
     * @private
     */
    private static smoothstep;
}
/**
 * GeoreferenceManager for working with geographic coordinates in OpenLIME
 * Handles conversions between geographic coordinates (EPSG:4326/WGS84) and
 * Web Mercator (EPSG:3857) and managing map navigation.
 */
export class GeoreferenceManager {
    /**
     * Creates a new GeoreferenceManager
     * @param {Object} viewer - OpenLIME Viewer instance
     * @param {Object} layer - Layer containing the geographic image
     */
    constructor(viewer: any, layer: any);
    viewer: any;
    camera: any;
    layer: any;
    earthRadius: number;
    imageSize: number;
    minZoom: number;
    maxZoom: number;
    /**
     * Configures the viewer with geographic navigation methods
     * @private
     */
    private setupViewer;
    /**
     * Converts WGS84 (EPSG:4326) coordinates to Web Mercator (EPSG:3857)
     * @param {number} lat - Latitude in degrees
     * @param {number} lon - Longitude in degrees
     * @returns {Object} Point in Web Mercator coordinates {x, y}
     */
    geoToWebMercator(lat: number, lon: number): any;
    /**
     * Converts Web Mercator (EPSG:3857) coordinates to WGS84 (EPSG:4326)
     * @param {number} x - X coordinate in Web Mercator
     * @param {number} y - Y coordinate in Web Mercator
     * @returns {Object} Geographic coordinates {lat, lon} in degrees
     */
    webMercatorToGeo(x: number, y: number): any;
    /**
     * Converts Web Mercator coordinates to Scene coordinates
     * @param {number} x - X coordinate in Web Mercator
     * @param {number} y - Y coordinate in Web Mercator
     * @returns {Object} Scene coordinates {x, y}
     */
    webMercatorToScene(x: number, y: number): any;
    /**
     * Converts scene coordinates to Web Mercator
     * @param {number} x - X coordinate in scene space
     * @param {number} y - Y coordinate in scene space
     * @returns {Object} Web Mercator coordinates {x, y}
     */
    sceneToWebMercator(x: number, y: number): any;
    /**
     * Converts WGS84 coordinates to scene coordinates
     * @param {number} lat - Latitude in degrees
     * @param {number} lon - Longitude in degrees
     * @returns {Object} Scene coordinates {x, y}
     */
    geoToScene(lat: number, lon: number): any;
    /**
     * Converts scene coordinates to WGS84 (EPSG:4326) coordinates
     * @param {number} x - X coordinate in scene space
     * @param {number} y - Y coordinate in scene space
     * @returns {Object} Geographic coordinates {lat, lon} in degrees
     */
    sceneToGeo(x: number, y: number): any;
    /**
     * Converts canvas HTML coordinates to WGS84 coordinates
     * @param {number} x - X coordinate in canvas
     * @param {number} y - Y coordinate in canvas
     * @returns {Object} Geographic coordinates {lat, lon} in degrees
     */
    canvasToGeo(x: number, y: number): any;
    /**
     * Navigate to a geographic position with animation
     * @param {number} lat - Latitude in degrees
     * @param {number} lon - Longitude in degrees
     * @param {number} [zoom] - Zoom level (optional)
     * @param {number} [duration=250] - Animation duration in ms
     * @param {string} [easing='linear'] - Easing function
     */
    flyTo(lat: number, lon: number, zoom?: number, duration?: number, easing?: string): void;
    /**
     * Gets the current geographic position and zoom
     * @returns {Object} Current position {lat, lon, zoom}
     */
    getCurrentPosition(): any;
}
export class HSH {
    static minElevation: number;
    static lightWeights(v: any): Float32Array;
}
/**
 * @typedef {Object} LayerOptions
 * @property {string|Layout} [layout='image'] - Layout/format of input raster images
 * @property {string} [type] - Identifier for specific derived layer class
 * @property {string} [id] - Unique layer identifier
 * @property {string} [label] - Display label for UI (defaults to id)
 * @property {Transform} [transform] - Transform from layer to canvas coordinates
 * @property {boolean} [visible=true] - Whether layer should be rendered
 * @property {number} [zindex=0] - Stack order for rendering (higher = on top)
 * @property {boolean} [overlay=false] - Whether layer renders in overlay mode
 * @property {number} [prefetchBorder=1] - Tile prefetch threshold in tile units
 * @property {number} [mipmapBias=0.4] - Texture resolution selection bias (0=highest, 1=lowest)
 * @property {Object.<string, Shader>} [shaders] - Map of available shaders
 * @property {Controller[]} [controllers] - Array of active UI controllers
 * @property {Layer} [sourceLayer] - Layer to share tiles with
 * @property {number} [pixelSize=0.0] - Physical size of a pixel in mm
 */
/**
 * Layer is the core class for rendering content in OpenLIME.
 * It manages raster data display, tile loading, and shader-based rendering.
 *
 * Features:
 * - Tile-based rendering with level-of-detail
 * - Shader-based visualization effects
 * - Automatic tile prefetching and caching
 * - Coordinate system transformations
 * - Animation and interpolation of shader parameters
 * - Support for multiple visualization modes
 * - Integration with layout systems for different data formats
 *
 * Layers can be used directly or serve as a base class for specialized layer types.
 * The class uses a registration system where derived classes register themselves,
 * allowing instantiation through the 'type' option.
 *
 * @fires Layer#ready - Fired when layer is initialized
 * @fires Layer#update - Fired when redraw is needed
 * @fires Layer#loaded - Fired when all tiles are loaded
 * @fires Layer#updateSize - Fired when layer size changes
 *
 * @example
 * ```javascript
 * // Create a basic image layer
 * const layer = new OpenLIME.Layer({
 *   layout: 'deepzoom',
 *   type: 'image',
 *   url: 'path/to/image.dzi',
 *   label: 'Main Image'
 * });
 *
 * // Add to viewer
 * viewer.addLayer('main', layer);
 *
 * // Listen for events
 * layer.addEvent('ready', () => {
 *   console.log('Layer initialized');
 * });
 * ```
 */
export class Layer {
    /**
     * Computes minimum scale across layers
     * @param {Object.<string, Layer>} layers - Map of layers
     * @param {boolean} discardHidden - Whether to ignore hidden layers
     * @returns {number} Minimum scale value
     * @static
     */
    static computeLayersMinScale(layers: {
        [x: string]: Layer;
    }, discardHidden: boolean): number;
    /**
     * Computes a bounding box encompassing all layers
     * @param {Object} layers - Collection of layers
     * @param {boolean} [discardHidden=false] - Whether to exclude hidden layers
     * @returns {BoundingBox|null} Bounding box encompassing all layers, or null if no valid layers
     * @static
     */
    static computeLayersBBox(layers: any, discardHidden?: boolean): BoundingBox | null;
    /**
    * Creates a Layer. Additionally, an object literal with Layer `options` can be specified.
    * Signals are triggered when:
    * ready: the size and layout of the layer is known
    * update: some new tile is available, or some visualization parameters has changed
    * loaded: is fired when all the images needed have been downloaded
    * @param {Object} [options]
    * @param {(string|Layout)} options.layout='image' The layout (the format of the input raster images).
    * @param {string} options.type A string identifier to select the specific derived layer class to instantiate.
    * @param {string} options.id The layer unique identifier.
    * @param {string} options.label A string with a more comprehensive definition of the layer. If it exists, it is used in the UI layer menu, otherwise the `id` value is taken.
    * @param {Transform} options.transform The relative coords from layer to canvas.
    * @param {bool} options.visible=true Whether to render the layer.
    * @param {number} options.zindex Stack ordering value for the rendering of layers (higher zindex on top).
    * @param {bool} options.overlay=false  Whether the layer must be rendered in overlay mode.
    * @param {number} options.prefetchBorder=1 The threshold (in tile units) around the current camera position for which to prefetch tiles.
    * @param {number} options.mipmapBias=0.2 Determine which texture is used when scale is not a power of 2. 0: use always the highest resulution, 1 the lowest, 0.5 switch halfway.
    * @param {Object} options.shaders A map (shadersId, shader) of the shaders usable for the layer rendering. See @link {Shader}.
    * @param {Controller[]} options.controllers An array of UI device controllers active on the layer.
    * @param {Layer} options.sourceLayer The layer from which to take the tiles (in order to avoid tile duplication).
    * @param {boolean} [options.debug=false] - Enable debug output
    */
    constructor(options?: {
        layout: (string | Layout);
        type: string;
        id: string;
        label: string;
        transform: Transform;
        visible: bool;
        zindex: number;
        overlay: bool;
        prefetchBorder: number;
        mipmapBias: number;
        shaders: any;
    });
    /**
     * Creates a new Layer that shares tiles with this layer but uses a different shader.
     * This method allows efficient creation of derivative layers that share the same source textures,
     * which is useful for applying different visual effects to the same image data without duplicating resources.
     *
     * @param {Object} [options={}] - Options for the new layer
     * @param {Object} [options.shaders] - Map of shaders for the new layer
     * @param {string} [options.defaultShader] - ID of shader to set as active
     * @param {string} [options.label] - Label for the new layer (defaults to original label)
     * @param {number} [options.zindex] - Z-index for the new layer (defaults to original + 1)
     * @param {boolean} [options.visible] - Layer visibility (defaults to same as original)
     * @param {Transform} [options.transform] - Custom transform (defaults to copy of original)
     * @param {number} [options.mipmapBias] - Custom mipmap bias (defaults to original value)
     * @param {number} [options.pixelSize] - Custom pixel size (defaults to original value)
     * @param {boolean} [options.debug] - Debug mode flag (defaults to original value)
     * @returns {Layer} A new layer sharing textures with this one
     *
     * @example
     * ```javascript
     * // Create a derived layer with edge detection shader
     * const enhancedShader = new OpenLIME.ShaderEdgeDetection();
     * const derivedLayer = originalLayer.derive({
     *     label: 'Edge Detection',
     *     shaders: { 'edge': enhancedShader },
     *     defaultShader: 'edge',
     *     zindex: 10
     * });
     * viewer.addLayer('edges', derivedLayer);
     * ```
     * or
     * ```javascript
     * const enhancedShader = new OpenLIME.ShaderEdgeDetection();
     * const derivedLayer = layer.derive({
     *     label: 'Enhanced Image'
     * });
     * derivedLayer.addShader('enhanced', enhancedShader);
     * derivedLayer.setShader('enhanced');
     * viewer.addLayer('Enhanced Image', derivedLayer);
     * ```
     */
    derive(options?: {
        shaders?: any;
        defaultShader?: string;
        label?: string;
        zindex?: number;
        visible?: boolean;
        transform?: Transform;
        mipmapBias?: number;
        pixelSize?: number;
        debug?: boolean;
    }): Layer;
    /** @ignore */
    init(options: any): void;
    tiles: any;
    transform: any;
    /**
     * Sets the layer's viewport
     * @param {Object} view - Viewport specification
     * @param {number} view.x - X position
     * @param {number} view.y - Y position
     * @param {number} view.dx - Width
     * @param {number} view.dy - Height
     * @fires Layer#update
     */
    setViewport(view: {
        x: number;
        y: number;
        dx: number;
        dy: number;
    }): void;
    viewport: {
        x: number;
        y: number;
        dx: number;
        dy: number;
    };
    /**
     * Adds a shader to the layer's available shaders
     * @param {string} id - Unique identifier for the shader
     * @param {Shader} shader - Shader instance to add
     * @throws {Error} If shader with the same id already exists
     * @returns {Layer} This layer instance for method chaining
     *
     * @example
     * ```javascript
     * const customShader = new OpenLIME.Shader({...});
     * layer.addShader('custom', customShader);
     * layer.setShader('custom');
     * ```
     */
    addShader(id: string, shader: Shader): Layer;
    /**
     * Removes a shader from the layer's available shaders
     * @param {string} id - Identifier of the shader to remove
     * @throws {Error} If shader with the specified id doesn't exist
     * @returns {Layer} This layer instance for method chaining
     *
     * @example
     * ```javascript
     * // Remove a shader that's no longer needed
     * layer.removeShader('oldEffect');
     * ```
     */
    removeShader(id: string): Layer;
    shader: any;
    /**
     * Adds a filter to the current shader
     * @param {Object} filter - Filter specification
     * @throws {Error} If no shader is set
     */
    addShaderFilter(f: any): void;
    /**
     * Removes a filter from the current shader
     * @param {Object} name - Filter name
     * @throws {Error} If no shader is set
     */
    removeShaderFilter(name: any): void;
    /**
     * Removes all filters from the current shader
     * @param {Object} name - Filter name
     * @throws {Error} If no shader is set
     */
    clearShaderFilters(): void;
    /**
     * Sets the layer state with optional animation
     * @param {Object} state - State object with controls and mode
     * @param {number} [dt] - Animation duration in ms
     * @param {string} [easing='linear'] - Easing function ('linear'|'ease-out'|'ease-in-out')
     */
    setState(state: any, dt?: number, easing?: string): void;
    /**
     * Gets the current layer state
     * @param {Object} [stateMask] - Optional mask to filter returned state properties
     * @returns {Object} Current state object
     */
    getState(stateMask?: any): any;
    /** @ignore */
    setLayout(layout: any): void;
    /**
    * The event is fired when a layer is initialized.
    * @event Layer#ready
    */
    /**
    * The event is fired if a redraw is needed.
    * @event Layer#update
    */
    layout: any;
    status: string;
    /**
     * Sets the layer's transform
     * @param {Transform} tx - New transform
     * @fires Layer#updateSize
     */
    setTransform(tx: Transform): void;
    /**
     * Sets the active shader
     * @param {string} id - Shader identifier from registered shaders
     * @throws {Error} If shader ID is not found
     * @fires Layer#update
     */
    setShader(id: string): void;
    /**
     * Gets the current shader visualization mode
     * @returns {string|null} Current mode or null if no shader
     */
    getMode(): string | null;
    /**
     * Gets available shader modes
     * @returns {string[]} Array of available modes
     */
    getModes(): string[];
    /**
     * Sets shader visualization mode
     * @param {string} mode - Mode to set
     * @fires Layer#update
     */
    setMode(mode: string): void;
    /**
     * Sets layer visibility
     * @param {boolean} visible - Whether layer should be visible
     * @fires Layer#update
     */
    setVisible(visible: boolean): void;
    visible: boolean;
    previouslyNeeded: boolean;
    /**
     * Sets layer rendering order
     * @param {number} zindex - Stack order value
     * @fires Layer#update
     */
    setZindex(zindex: number): void;
    zindex: number;
    /**
     * Gets layer scale
     * @returns {number} Current scale value
     */
    scale(): number;
    /**
     * Gets pixel size in millimeters
     * @returns {number} Size of one pixel in mm
     */
    pixelSizePerMM(): number;
    /**
     * Gets layer bounding box in scene coordinates
     * @returns {BoundingBox} Bounding box
     */
    boundingBox(): BoundingBox;
    /**
     * Gets the shader parameter control corresponding to `name`
     * @param {*} name The name of the control.
     * return {*} The control
     */
    getControl(name: any): any;
    /**
     * Adds a shader parameter control
     * @param {string} name - Control identifier
     * @param {*} value - Initial value
     * @throws {Error} If control already exists
     */
    addControl(name: string, value: any): void;
    /**
     * Sets a shader control value with optional animation
     * @param {string} name - Control identifier
     * @param {*} value - New value
     * @param {number} [dt] - Animation duration in ms
     * @param {string} [easing='linear'] - Easing function
     * @fires Layer#update
     */
    setControl(name: string, value: any, dt?: number, easing?: string): void;
    /**
     * Updates control interpolation
     * @returns {boolean} Whether all interpolations are complete
     */
    interpolateControls(): boolean;
    /** @ignore */
    interpolateControl(control: any, time: any): any;
    /** @ignore */
    dropTile(tile: any): void;
    /**
     * Clears layer resources and resets state
     * @private
     */
    private clear;
    ibuffer: any;
    vbuffer: any;
    queue: any;
    /** @ignore */
    draw(transform: any, viewport: any): boolean;
    /** @ignore */
    drawTile(tile: any, index: any): void;
    getTileByteOffset(index: any): number;
    /** @ignore */
    /** @ignore */
    updateTileBuffers(coords: any, tcoords: any): void;
    /** @ignore */
    updateAllTileBuffers(tiles: any): void;
    /** @ignore */
    setupTiles(): void;
    /** @ignore */
    prepareWebGL(): void;
    tbuffer: any;
    /** @ignore */
    sameNeeded(a: any, b: any): boolean;
    /**
     * Initiates tile prefetching based on viewport
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport
     * @private
     */
    private prefetch;
    /**
     * Loads and processes a single image tile with optimized resource management.
     * Implements request batching, concurrent loading, and proper error handling.
     *
     * @async
     * @param {Object} tile - Tile specification object
     * @param {string} tile.index - Unique tile identifier
     * @param {string} tile.url - Base URL for tile resource
     * @param {number} [tile.start] - Start byte for partial content (for tarzoom)
     * @param {number} [tile.end] - End byte for partial content (for tarzoom)
     * @param {Object[]} [tile.offsets] - Byte offsets for interleaved formats
     * @param {Function} callback - Completion callback(error, size)
     * @returns {Promise<void>}
     * @throws {Error} If tile is already in processing queue
     */
    loadTile(tile: {
        index: string;
        url: string;
        start?: number;
        end?: number;
        offsets?: any[];
    }, callback: Function): Promise<void>;
    /**
    * Loads an interleaved tile format (itarzoom) where all textures are in one file
    *
    * @private
    * @async
    * @param {Object} tile - Tile specification object
    * @param {Function} callback - Completion callback
    * @returns {Promise<void>}
    */
    private _loadInterleaved;
    /**
    * Loads textures in parallel for regular tile formats
    *
    * @private
    * @async
    * @param {Object} tile - Tile specification object
    * @param {Function} callback - Completion callback
    * @returns {Promise<void>}
    */
    private _loadParallel;
    /**
    * Determines the number of bytes per pixel for a given sampler
    *
    * @private
    * @param {number} samplerId - Sampler identifier
    * @returns {number} Bytes per pixel
    */
    private getPixelSize;
    /**
     * Gets pixel values for a specific pixel location
     * Works with both single images and tiled formats
     *
     * @param {number} x - X coordinate in image space (0,0 at top-left)
     * @param {number} y - Y coordinate in image space (0,0 at top-left)
     * @returns {Array<Uint8Array>} Array containing RGBA values for each raster at the specified pixel
     */
    getPixelValues(x: number, y: number): Array<Uint8Array>;
    types: {};
}
export namespace Layer { }
/**
 * @typedef {Object} LayerAnnotationOptions
 * @property {string} [style] - CSS styles for annotation rendering
 * @property {string|Annotation[]} [annotations=[]] - URL of JSON annotation data or array of annotations
 * @property {boolean} [overlay=true] - Whether annotations render as overlay
 * @property {Set<string>} [selected=new Set()] - Set of selected annotation IDs
 * @property {Object} [annotationsListEntry=null] - UI entry for annotations list
 * @extends LayerOptions
 */
/**
 * LayerAnnotation provides functionality for displaying and managing annotations overlaid on other layers.
 * It supports both local and remote annotation data, selection management, and UI integration.
 *
 * Features:
 * - Display of text, graphics, and glyph annotations
 * - Remote annotation loading via JSON/HTTP
 * - Selection management
 * - Visibility toggling per annotation
 * - UI integration with annotation list
 * - Annotation event handling
 *
 * The layer automatically handles:
 * - Annotation data loading and parsing
 * - UI synchronization
 * - Visibility states
 * - Selection states
 * - Event propagation
 *
 * @extends Layer
 * @fires LayerAnnotation#selected - Fired when annotation selection changes, with selected annotation as parameter
 * @fires LayerAnnotation#loaded - Fired when annotations are loaded
 * @fires Layer#update - Inherited from Layer, fired when redraw needed
 * @fires Layer#ready - Inherited from Layer, fired when layer is ready
 *
 * @example
 * ```javascript
 * // Create annotation layer from remote JSON
 * const annoLayer = new OpenLIME.LayerAnnotation({
 *   annotations: 'https://example.com/annotations.json',
 *   style: '.annotation { color: red; }',
 *   overlay: true
 * });
 *
 * // Listen for selection changes
 * annoLayer.addEvent('selected', (annotation) => {
 *   console.log('Selected annotation:', annotation.label);
 * });
 *
 * // Add to viewer
 * viewer.addLayer('annotations', annoLayer);
 * ```
 */
export class LayerAnnotation extends Layer {
    /**
     * Instantiates a LayerAnnotation object.
     * @param {Object} [options] An object literal with options that inherits from {@link Layer}.
     * @param {string} options.style Properties to style annotations.
         * @param {(string|Array)} options.annotations The URL of the annotation data (JSON file or HTTP GET Request to an annotation server) or an array of annotations.
     */
    constructor(options?: {
        style: string;
        annotations: (string | any[]);
    });
    /**
     * Helper method to get idx from annotation data
     * @param {Annotation} annotation - The annotation object
     * @returns {number|string|null} The idx value from data.idx
     * @private
     */
    private getAnnotationIdx;
    /**
     * Helper method to set idx in annotation data
     * @param {Annotation} annotation - The annotation object
     * @param {number|string} idx - The idx value to set
     * @private
     */
    private setAnnotationIdx;
    /**
     * Loads annotations from a URL
     * @param {string} url - URL to fetch annotations from (JSON format)
     * @fires LayerAnnotation#loaded
     * @fires Layer#update
     * @fires Layer#ready
     * @private
     * @async
     */
    private loadAnnotations;
    annotations: any;
    /**
 * Creates a new annotation and adds it to the layer
 * @param {Annotation} [annotation] - Optional pre-configured annotation
 * @returns {Annotation} The newly created annotation
 * @private
 */
    private newAnnotation;
    /**
     * Creates the UI entry for the annotations list
     * @returns {Object} Configuration object for annotations list UI
     * @private
     */
    private annotationsEntry;
    annotationsListEntry: {
        html: string;
        list: any[];
        classes: string;
        status: () => string;
        oncreate: () => void;
    };
    /**
 * Creates the complete annotations list UI as a dropdown menu with precise positioning
 * @private
 */
    private createAnnotationsList;
    /**
     * Creates a single annotation entry for the UI
     * @param {Annotation} annotation - The annotation to create an entry for
     * @returns {string} HTML string for the annotation entry
     * @private
     */
    private createAnnotationEntry;
    /**
     * Retrieves an annotation by its ID
     * @param {string} id - Annotation identifier
     * @returns {Annotation|null} The found annotation or null if not found
     */
    getAnnotationById(id: string): Annotation | null;
    /**
     * Retrieves an annotation by its index
     * @param {number|string} idx - Annotation index
     * @returns {Annotation|null} The found annotation or null if not found
     */
    getAnnotationByIdx(idx: number | string): Annotation | null;
    /**
     * Clears all annotation selections
     * @private
     */
    private clearSelected;
    /**
     * Updates the dropdown selection when annotation is selected programmatically
     * @param {Annotation} anno - The annotation to select/deselect
     * @param {boolean} [on=true] - Whether to select (true) or deselect (false)
     * @fires LayerAnnotation#selected
     */
    setSelected(anno: Annotation, on?: boolean): void;
}
/**
 * @typedef {Object} LayerAnnotationImageOptions
 * @property {string} [url] - URL to the annotations JSON file
 * @property {string} [path] - Base path for annotation image files
 * @property {string} [format='vec4'] - Raster format for image data
 * @extends LayerAnnotationOptions
 */
/**
 * LayerAnnotationImage extends LayerAnnotation to provide support for image-based annotations.
 * Each annotation corresponds to a single tile in the layer, with customizable visibility
 * and shader-based rendering.
 *
 * Features:
 * - Image-based annotation rendering
 * - Per-annotation visibility control
 * - Custom shader support for image processing
 * - Automatic texture management
 * - WebGL/WebGL2 compatibility
 * - Multi-format raster support
 *
 * The class handles:
 * - Image loading and caching
 * - Texture creation and binding
 * - Shader setup and compilation
 * - Tile visibility management
 * - WebGL state management
 *
 * @extends LayerAnnotation
 *
 * @example
 * ```javascript
 * // Create image annotation layer
 * const imageAnnoLayer = new OpenLIME.LayerAnnotationImage({
 *   url: 'annotations.json',
 *   path: './annotation-images/',
 *   format: 'vec4'
 * });
 *
 * // Configure visibility
 * imageAnnoLayer.setAllTilesVisible(true);
 * imageAnnoLayer.setTileVisible(0, false); // Hide first annotation
 *
 * // Add to viewer
 * viewer.addLayer('imageAnnotations', imageAnnoLayer);
 * ```
 */
export class LayerAnnotationImage extends LayerAnnotation {
    /**
 * Creates a new LayerAnnotationImage instance
 * @param {LayerAnnotationImageOptions} options - Configuration options
 * @throws {Error} If path is not specified (warns in console)
 */
    constructor(options: LayerAnnotationImageOptions);
    /**
     * Gets the number of annotations in the layer
     * @returns {number} Number of annotations
     */
    length(): number;
    /**
     * Sets visibility for a specific annotation/tile
     * @param {number} index - Index of the annotation
     * @param {boolean} visible - Whether the annotation should be visible
     */
    setTileVisible(index: number, visible: boolean): void;
    /**
     * Sets visibility for all annotations/tiles
     * @param {boolean} visible - Whether all annotations should be visible
     */
    setAllTilesVisible(visible: boolean): void;
    /**
     * Renders a specific tile/annotation
     * @param {Object} tile - Tile object containing texture information
     * @param {number} index - Index of the tile
     * @throws {Error} If tile is missing textures
     * @private
     */
    private drawTile;
    /**
     * Configures the shader for rendering annotations
     * @param {string} rasterFormat - Format of the raster data ('vec4', etc)
     * @private
     */
    private setupShader;
    shaders: {
        standard: Shader;
    };
}
/**
 * @typedef {Object} LayerBRDFOptions
 * @property {Object} channels - Required channels for BRDF rendering
 * @property {string} channels.kd - URL to diffuse color map (required)
 * @property {string} channels.ks - URL to specular color map (optional)
 * @property {string} channels.normals - URL to normal map (required)
 * @property {string} channels.gloss - URL to glossiness/roughness map (optional)
 * @property {Object} [colorspaces] - Color space definitions for material properties
 * @property {('linear'|'srgb')} [colorspaces.kd='linear'] - Color space for diffuse map
 * @property {('linear'|'srgb')} [colorspaces.ks='linear'] - Color space for specular map
 * @property {number} [brightness=1.0] - Overall brightness adjustment
 * @property {number} [gamma=2.2] - Gamma correction value
 * @property {number[]} [alphaLimits=[0.01, 0.5]] - Range for glossiness/roughness
 * @property {number[]} [monochromeMaterial=[0.80, 0.79, 0.75]] - RGB color for monochrome rendering
 * @property {number} [kAmbient=0.1] - Ambient light coefficient
 * @extends LayerOptions
 */
/**
 * LayerBRDF implements real-time BRDF (Bidirectional Reflectance Distribution Function) rendering.
 *
 * The BRDF model describes how light reflects off a surface, taking into account:
 * - Diffuse reflection (rough, matte surfaces)
 * - Specular reflection (mirror-like reflections)
 * - Surface normals (microscopic surface orientation)
 * - Glossiness/roughness (surface micro-structure)
 *
 * Features:
 * - Real-time light direction control
 * - Multiple material channels support
 * - Customizable material properties
 * - Interactive lighting model
 * - Gamma correction
 * - Ambient light component
 *
 * Technical implementation:
 * - Uses normal mapping for surface detail
 * - Supports both linear and sRGB color spaces
 * - Implements spherical light projection
 * - Handles multi-channel textures
 * - GPU-accelerated rendering
 *
 * @extends Layer
 *
 * @example
 * ```javascript
 * // Create BRDF layer with all channels
 * const brdfLayer = new OpenLIME.LayerBRDF({
 *   channels: {
 *     kd: 'diffuse.jpg',
 *     ks: 'specular.jpg',
 *     normals: 'normals.jpg',
 *     gloss: 'gloss.jpg'
 *   },
 *   colorspaces: {
 *     kd: 'srgb',
 *     ks: 'linear'
 *   },
 *   brightness: 1.2,
 *   gamma: 2.2
 * });
 *
 * // Update light direction
 * brdfLayer.setLight([0.5, 0.5], 500, 'ease-out');
 * ```
 */
export class LayerBRDF extends Layer {
    /**
     * Projects a 2D point onto a sphere surface
     * Used for converting 2D mouse/touch input to 3D light direction
     * @param {number[]} p - 2D point [x, y] in range [-1, 1]
     * @returns {number[]} 3D normalized vector [x, y, z] on sphere surface
     * @static
     */
    static projectToSphere(p: number[]): number[];
    /**
     * Projects a 2D point onto a flattened sphere using SGI trackball algorithm.
     * This provides more intuitive light control by avoiding acceleration near edges.
     * Based on SIGGRAPH 1988 paper on SGI trackball implementation.
     *
     * @param {number[]} p - 2D point [x, y] in range [-1, 1]
     * @returns {number[]} 3D normalized vector [x, y, z] on flattened sphere
     * @static
     */
    static projectToFlattenedSphere(p: number[]): number[];
    /**
     * Creates a new LayerBRDF instance
     * @param {LayerBRDFOptions} options - Configuration options
     * @throws {Error} If required channels (kd, normals) are not provided
     * @throws {Error} If rasters option is not empty
     */
    constructor(options: LayerBRDFOptions);
    /**
     * Sets the light direction with optional animation
     * @param {number[]} light - 2D vector [x, y] representing light direction
     * @param {number} [dt] - Animation duration in milliseconds
     * @param {string} [easing='linear'] - Animation easing function
     */
    setLight(light: number[], dt?: number, easing?: string): void;
}
/**
 * @typedef {Object} LayerCombinerOptions
 * @property {Layer[]} layers - Array of layers to be combined (required)
 * @property {Object.<string, Shader>} [shaders] - Map of available shaders
 * @property {string} [type='combiner'] - Must be 'combiner' when using Layer factory
 * @property {boolean} [visible=true] - Whether the combined output is visible
 * @extends LayerOptions
 */
/**
 * LayerCombiner provides functionality to combine multiple layers using framebuffer operations
 * and custom shaders. It enables complex visual effects by compositing layers in real-time
 * using GPU-accelerated rendering.
 *
 * Features:
 * - Real-time layer composition
 * - Custom shader-based effects
 * - Framebuffer management
 * - Dynamic texture allocation
 * - Resolution-independent rendering
 * - GPU-accelerated compositing
 *
 * Use Cases:
 * - Layer blending and mixing
 * - Image comparison tools
 * - Lens effects (see {@link LayerLens})
 * - Custom visual effects
 * - Multi-layer compositing
 *
 * Technical Details:
 * - Creates framebuffers for each input layer
 * - Manages WebGL textures and resources
 * - Supports dynamic viewport resizing
 * - Handles shader-based composition
 * - Maintains proper resource cleanup
 *
 * @extends Layer
 *
 * @example
 * ```javascript
 * // Create two base layers
 * const baseLayer = new OpenLIME.Layer({
 *   type: 'image',
 *   url: 'base.jpg'
 * });
 *
 * const overlayLayer = new OpenLIME.Layer({
 *   type: 'image',
 *   url: 'overlay.jpg'
 * });
 *
 * // Create combiner with custom shader
 * const combiner = new OpenLIME.Layer({
 *   type: 'combiner',
 *   layers: [baseLayer, overlayLayer],
 *   visible: true
 * });
 *
 * // Set up blend shader
 * const shader = new OpenLIME.ShaderCombiner();
 * shader.mode = 'blend';
 * combiner.shaders = { 'standard': shader };
 * combiner.setShader('standard');
 *
 * // Add to viewer
 * viewer.addLayer('combined', combiner);
 * ```
 */
export class LayerCombiner extends Layer {
    /**
     * Creates a new LayerCombiner instance.
     *
     * @param {LayerCombinerOptions} options - Configuration options
     * @throws {Error} If rasters option is not empty (rasters should be defined in source layers)
     */
    constructor(options: LayerCombinerOptions);
    textures: any[];
    framebuffers: any[];
    /**
     * Cleans up WebGL resources by deleting framebuffers and textures.
     * Should be called before recreating buffers or when the layer is destroyed.
     * Prevents memory leaks by properly releasing GPU resources.
     * @private
     */
    private deleteFramebuffers;
    /**
     * Renders the combined layers using framebuffer operations.
     * Handles framebuffer creation, layer rendering, and final composition.
     *
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport parameters
     * @param {number} viewport.x - Viewport X position
     * @param {number} viewport.y - Viewport Y position
     * @param {number} viewport.dx - Viewport width
     * @param {number} viewport.dy - Viewport height
     * @param {number} viewport.w - Total width
     * @param {number} viewport.h - Total height
     * @throws {Error} If shader is not specified
     * @private
     */
    private draw;
    /**
     * Creates framebuffers and textures for layer composition.
     * Initializes WebGL resources for each input layer.
     * @private
     */
    private createFramebuffers;
}
/**
 * @typedef {Object} LayerHDROptions
 * @property {string} url - URL of the image to display (required)
 * @property {string|Layout} [layout='image'] - Layout format for image display
 * @property {string} [format='rgba16f'] - Image data format for WebGL processing
 * @property {boolean} [debug=false] - Enable debug output
 * @extends LayerOptions
 */
/**
 * LayerHDR provides advanced HDR image rendering capabilities in OpenLIME.
 * It is designed for high dynamic range (HDR) image processing and rendering,
 * leveraging WebGL shaders and tone mapping techniques.
 *
 * Features:
 * - HDR tone mapping with configurable white point
 * - WebGL-based rendering with 16-bit precision
 * - Automatic raster data management
 * - Shader-based processing for HDR compression
 *
 * Technical Details:
 * - Uses WebGL textures for HDR image data
 * - Supports 16-bit float formats (e.g., rgba16f)
 * - Integrates with OpenLIME layout system
 * - Provides multiple tone mapping options: Reinhard, ACES, and Exposure
 *
 * @extends Layer
 *
 * @example
 * ```javascript
 * const hdrLayer = new OpenLIME.LayerHDR({
 *   url: 'hdr-image.hdr',
 *   format: 'rgba16f'
 * });
 * viewer.addLayer('hdr', hdrLayer);
 * ```
 */
export class LayerHDR extends Layer {
    /**
     * Creates a new LayerHDR instance.
     *
     * @param {LayerHDROptions} options - Configuration options for the HDR layer
     */
    constructor(options: LayerHDROptions);
    shaders: {
        hdr: ShaderHDR;
    };
    /**
     * Sets the white point for HDR tone mapping.
     *
     * @param {number} v - The new white point value
     * @param {number} [delayms=1] - Delay in milliseconds for the transition
     * @param {string} [easing='linear'] - Easing function for the transition
     */
    setWhitePoint(v: number, delayms?: number, easing?: string): void;
    /**
     * Gets the current white point value.
     *
     * @returns {number} The current white point value
     */
    getWhitePoint(): number;
    /**
     * Sets the shadow lift value for HDR tone mapping.
     *
     * @param {number} v - The new shadow lift value
     * @param {number} [delayms=1] - Delay in milliseconds for the transition
     * @param {string} [easing='linear'] - Easing function for the transition
     */
    setShadowLift(v: number, delayms?: number, easing?: string): void;
    /**
     * Gets the current shadow lift value.
     *
     * @returns {number} The current shadow lift value
     */
    getShadowLift(): number;
    /**
     * Sets the ACES contrast parameter for ACES tone mapping.
     *
     * @param {number} v - The new ACES contrast value
     * @param {number} [delayms=1] - Delay in milliseconds for the transition
     * @param {string} [easing='linear'] - Easing function for the transition
     */
    setAcesContrast(v: number, delayms?: number, easing?: string): void;
    /**
     * Gets the current ACES contrast value.
     *
     * @returns {number} The current ACES contrast value
     */
    getAcesContrast(): number;
    /**
     * Sets the exposure value for exposure-based tone mapping.
     *
     * @param {number} v - The new exposure value
     * @param {number} [delayms=1] - Delay in milliseconds for the transition
     * @param {string} [easing='linear'] - Easing function for the transition
     */
    setExposure(v: number, delayms?: number, easing?: string): void;
    /**
     * Gets the current exposure value.
     *
     * @returns {number} The current exposure value
     */
    getExposure(): number;
    /**
     * Sets the highlight compression value for HDR tone mapping.
     *
     * @param {number} v - The new highlight compression value
     * @param {number} [delayms=1] - Delay in milliseconds for the transition
     * @param {string} [easing='linear'] - Easing function for the transition
     */
    setHighlightCompression(v: number, delayms?: number, easing?: string): void;
    /**
     * Gets the current highlight compression value.
     *
     * @returns {number} The current highlight compression value
     */
    getHighlightCompression(): number;
    /**
     * Retrieves statistical information about the raster data.
     *
     * @returns {Object} An object containing statistical information (e.g., maxValue, avgLuminance)
     */
    getStatInfo(): any;
}
/**
 * @typedef {Object} LayerImageOptions
 * @property {string} url - URL of the image to display (required)
 * @property {string|Layout} [layout='image'] - Layout format for image display
 * @property {string} [format='vec4'] - Image data format for WebGL processing
 * @property {string} [type='image'] - Must be 'image' when using Layer factory
 * @extends LayerOptions
 */
/**
 * LayerImage provides fundamental image rendering capabilities in OpenLIME.
 * It serves as both a standalone layer for basic image display and a foundation
 * for more complex image-based layers.
 *
 * Features:
 * - Single image rendering
 * - WebGL-based display
 * - Automatic format handling
 * - Layout system integration
 * - Shader-based processing
 *
 * Technical Details:
 * - Uses WebGL textures for image data
 * - Supports various color formats (vec3, vec4)
 * - Integrates with OpenLIME layout system
 * - Manages raster data automatically
 * - Provides standard RGB shader by default
 *
 * @extends Layer
 *
 * @example
 * ```javascript
 * // Direct instantiation
 * const imageLayer = new OpenLIME.LayerImage({
 *   url: 'image.jpg',
 *   layout: 'image',
 *   format: 'vec4'
 * });
 * viewer.addLayer('main', imageLayer);
 *
 * // Using Layer factory
 * const factoryLayer = new OpenLIME.Layer({
 *   type: 'image',
 *   url: 'image.jpg',
 *   layout: 'image'
 * });
 * viewer.addLayer('factory', factoryLayer);
 * ```
 */
export class LayerImage extends Layer {
    /**
     * Creates a new LayerImage instance
     * @param {LayerImageOptions} options - Configuration options
     * @throws {Error} If rasters options is not empty (should be auto-configured)
     * @throws {Error} If no URL is provided and layout has no URLs
     */
    constructor(options: LayerImageOptions);
    shaders: {
        standard: Shader;
    };
}
/**
 * @typedef {Object} LayerLensOptions
 * @property {boolean} [overlay=true] - Whether the lens renders as an overlay
 * @property {number} [radius=100] - Initial lens radius in pixels
 * @property {number[]} [borderColor=[0.078, 0.078, 0.078, 1]] - RGBA border color
 * @property {number} [borderWidth=12] - Border width in pixels
 * @property {boolean} [borderEnable=false] - Whether to show lens border
 * @property {Object} [dashboard=null] - Dashboard UI component for lens control
 * @property {Camera} camera - Camera instance (required)
 * @extends LayerCombinerOptions
 */
/**
 * LayerLens implements a magnifying lens effect that can display content from one or two layers.
 * It provides an interactive lens that can be moved and resized, showing different layer content
 * inside and outside the lens area.
 *
 * Features:
 * - Interactive lens positioning and sizing
 * - Support for base and overlay layers
 * - Animated transitions
 * - Customizable border appearance
 * - Dashboard UI integration
 * - Optimized viewport rendering
 *
 * Technical Details:
 * - Uses framebuffer composition for layer blending
 * - Implements viewport optimization for performance
 * - Handles coordinate transformations between systems
 * - Supports animated parameter changes
 * - Manages WebGL resources efficiently
 *
 * @extends LayerCombiner
 *
 * @example
 * ```javascript
 * // Create lens with base layer
 * const lens = new OpenLIME.LayerLens({
 *   camera: viewer.camera,
 *   radius: 150,
 *   borderEnable: true,
 *   borderColor: [0, 0, 0, 1]
 * });
 *
 * // Set layers
 * lens.setBaseLayer(baseLayer);
 * lens.setOverlayLayer(overlayLayer);
 *
 * // Animate lens position
 * lens.setCenter(500, 500, 1000, 'ease-out');
 *
 * // Add to viewer
 * viewer.addLayer('lens', lens);
 * ```
 */
export class LayerLens extends LayerCombiner {
    /**
     * Creates a new LayerLens instance
     * @param {LayerLensOptions} options - Configuration options
     * @throws {Error} If camera is not provided
     */
    constructor(options: LayerLensOptions);
    oldRadius: number;
    oldCenter: number[];
    useGL: boolean;
    /**
     * Removes the overlay layer, returning to single layer mode
     */
    removeOverlayLayer(): void;
    /**
     * Sets the base layer (shown inside lens)
     * @param {Layer} layer - Base layer instance
     * @fires Layer#update
     */
    setBaseLayer(l: any): void;
    /**
     * Sets the overlay layer (shown outside lens)
     * @param {Layer} layer - Overlay layer instance
     */
    setOverlayLayer(l: any): void;
    /**
     * Sets the overlay layer (shown inside lens)
     * @param {Layer} layer - Overlay layer instance
     */
    regenerateFrameBuffers(): void;
    /**
     * Sets lens radius with optional animation
     * @param {number} radius - New radius in pixels
     * @param {number} [delayms=100] - Animation duration
     * @param {string} [easing='linear'] - Animation easing function
     */
    setRadius(r: any, delayms?: number, easing?: string): void;
    /**
     * Gets current lens radius
     * @returns {number} Current radius in pixels
     */
    getRadius(): number;
    /**
     * Sets lens center position with optional animation
     * @param {number} x - X coordinate in scene space
     * @param {number} y - Y coordinate in scene space
     * @param {number} [delayms=100] - Animation duration
     * @param {string} [easing='linear'] - Animation easing function
     */
    setCenter(x: number, y: number, delayms?: number, easing?: string): void;
    /**
     * Gets current lens center position
     * @returns {{x: number, y: number}} Center position in scene coordinates
     */
    getCurrentCenter(): {
        x: number;
        y: number;
    };
    /**
     * Gets target lens position for ongoing animation
     * @returns {{x: number, y: number}} Target position in scene coordinates
     */
    getTargetCenter(): {
        x: number;
        y: number;
    };
    /**
     * Gets current border color
     * @returns {number[]} RGBA color array
     */
    getBorderColor(): number[];
    /**
     * Gets current border width
     * @returns {number} Border width in pixels
     */
    getBorderWidth(): number;
    /**
     * Renders the lens effect
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport
     * @returns {boolean} Whether all animations are complete
     * @override
     * @private
     */
    private override draw;
    /**
     * Calculates viewport region affected by lens
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport
     * @returns {Object} Viewport specification for lens region
     * @private
     */
    private getLensViewport;
    /**
     * Calculates viewport region for overlay layer
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport
     * @returns {Object|null} Viewport specification for overlay or null
     * @private
     */
    private getOverlayLayerViewport;
    /**
     * Combines two viewport regions
     * @param {Object} v0 - First viewport
     * @param {Object} v1 - Second viewport
     * @returns {Object} Combined viewport encompassing both regions
     * @private
     */
    private joinViewports;
    /**
     * Converts lens parameters to viewport coordinates
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport
     * @returns {number[]} [centerX, centerY, radius, borderWidth] in viewport coordinates
     * @private
     */
    private getLensInViewportCoords;
}
/**
 * @typedef {Object} LayerMaskedImageOptions
 * @property {string} url - URL of the masked image to display (required)
 * @property {string} [format='vec4'] - Image data format
 * @property {string} [type='maskedimage'] - Must be 'maskedimage' when using Layer factory
 * @extends LayerOptions
 */
/**
 * LayerMaskedImage provides specialized handling for masked scalar images with bilinear interpolation.
 * It implements custom texture sampling and masking operations through WebGL shaders.
 *
 * Features:
 * - Custom scalar image handling
 * - Bilinear interpolation with masking
 * - WebGL shader-based processing
 * - Support for both WebGL 1 and 2
 * - Nearest-neighbor texture filtering
 * - Masked value visualization
 *
 * Technical Details:
 * - Uses LUMINANCE format for single-channel data
 * - Implements custom bilinear sampling in shader
 * - Handles mask values through alpha channel
 * - Supports value rescaling (255.0/254.0 scale with -1.0/254.0 bias)
 * - Uses custom texture parameters for proper sampling
 *
 * Shader Implementation:
 * - Performs bilinear interpolation in shader
 * - Handles masked values (0 = masked)
 * - Implements value rescaling
 * - Provides visualization of masked areas (in red)
 * - Uses texelFetch for precise sampling
 *
 * @extends Layer
 *
 * @example
 * ```javascript
 * // Create masked image layer
 * const maskedLayer = new OpenLIME.Layer({
 *   type: 'maskedimage',
 *   url: 'masked-data.png',
 *   format: 'vec4'
 * });
 *
 * // Add to viewer
 * viewer.addLayer('masked', maskedLayer);
 * ```
 */
export class LayerMaskedImage extends Layer {
    /**
     * Creates a new LayerMaskedImage instance
     * @param {LayerMaskedImageOptions} options - Configuration options
     * @throws {Error} If rasters options is not empty
     * @throws {Error} If url is not provided and layout has no URLs
     */
    constructor(options: LayerMaskedImageOptions);
    shaders: {
        scalarimage: Shader;
    };
    /**
     * Renders the masked image
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport
     * @returns {boolean} Whether render completed successfully
     * @override
     * @private
     */
    private override draw;
    /**
     * Custom texture loader for masked images
     * Sets up proper texture parameters for scalar data
     *
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
     * @param {HTMLImageElement} img - Source image
     * @returns {WebGLTexture} Created texture
     * @private
     */
    /**
 * Loads a texture supporting WebGL 2.0+
 * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - The WebGL context
 * @param {HTMLImageElement} img - The image to load as a texture
 * @returns {WebGLTexture} - The created texture
 */
    loadTexture(gl: WebGLRenderingContext | WebGL2RenderingContext, img: HTMLImageElement): WebGLTexture;
}
/**
 * @typedef {Object} LayerMultispectralOptions
 * @property {string} url - URL to multispectral info.json file (required)
 * @property {string} layout - Layout type: 'image', 'deepzoom', 'google', 'iiif', 'zoomify', 'tarzoom', 'itarzoom'
 * @property {string} [defaultMode='single_band'] - Initial visualization mode ('rgb' or 'single_band')
 * @property {string} [server] - IIP server URL (for IIP layout)
 * @property {boolean} [linearRaster=true] - Whether to use linear color space for rasters (recommended for scientific accuracy)
 * @property {string|Object} presets - Path to presets JSON file or presets object containing CTW configurations
 * @extends LayerOptions
 */
/**
 * LayerMultispectral - Advanced multispectral imagery visualization layer
 *
 * This layer provides specialized handling of multispectral image data with configurable
 * visualization modes and interactive spectral analysis capabilities through Color Twist
 * Weights (CTW). It supports scientific visualization workflows for remote sensing, art analysis,
 * medical imaging, and other multispectral applications.
 *
 * Features:
 * - Multiple visualization modes (RGB, single band)
 * - UBO-optimized Color Twist Weights implementation for real-time spectral transformations
 * - Preset system for common visualization configurations (false color, etc.)
 * - Support for multiple image layouts and tiling schemes
 * - Compatible with both single images and tile-based formats (DeepZoom, etc.)
 *
 * Technical implementation:
 * - Uses WebGL2 features for efficient processing
 * - Implements shader-based visualization pipeline
 * - Supports multiple image layouts and tiling schemes
 *
 * @extends Layer
 *
 * @example
 * // Create multispectral layer with deepzoom layout
 * const msLayer = new OpenLIME.Layer({
 *   type: 'multispectral',
 *   url: 'path/to/info.json',
 *   layout: 'deepzoom',
 *   defaultMode: 'rgb',
 *   presets: 'path/to/presets.json'
 * });
 *
 * // Add to viewer
 * viewer.addLayer('ms', msLayer);
 *
 * // Apply a preset CTW
 * msLayer.applyPreset('falseColor');
 */
export class LayerMultispectral extends Layer {
    /**
     * Creates a new LayerMultispectral instance
     * @param {LayerMultispectralOptions} options - Configuration options
     * @throws {Error} If rasters options is not empty (rasters are created automatically)
     * @throws {Error} If url to info.json is not provided
     * @throws {Error} If presets option is not provided
     */
    constructor(options: LayerMultispectralOptions);
    linearRaster: boolean;
    defaultMode: string;
    _currentCTW: {
        red: any;
        green: any;
        blue: any;
    };
    /**
     * Gets info
     *
     * @returns {Object|null} Object with info on multispectral dataset or null if not found
     */
    info(): any | null;
    /**
     * Constructs URL for image resources based on layout type
     *
     * Handles different image layout conventions including deepzoom, google maps tiles,
     * zoomify, and specialized formats like tarzoom.
     *
     * @param {string} url - Base URL
     * @param {string} filename - Base filename without extension
     * @returns {string} Complete URL for the resource
     * @private
     */
    private imageUrl;
    /**
     * Loads and processes multispectral configuration
     *
     * Fetches the info.json file containing wavelength, basename, and other
     * configuration parameters, then sets up the rasters and shader accordingly.
     *
     * @param {string} url - URL to info.json
     * @private
     * @async
     */
    private loadInfo;
    pixelSize: any;
    width: any;
    height: any;
    /**
     * Loads preset definitions for Color Twist Weights
     *
     * Can load presets from a URL or use directly provided preset object.
     * Presets define predefined CTW configurations for common visualization needs.
     *
     * @private
     * @async
     */
    private loadPresets;
    presets: any;
    /**
     * Initializes default CTW based on default mode
     *
     * Creates initial CTW arrays with zeros and applies default
     * visualization settings.
     *
     * @private
     */
    private initDefault;
    /**
     * Sets single band visualization
     *
     * Displays a single spectral band on a specific output channel.
     *
     * @param {number} bandIndex - Index of band to visualize
     * @param {number} [channel=0] - Output channel (0=all/gray, 1=R, 2=G, 3=B)
     */
    setSingleBand(bandIndex: number, channel?: number): void;
    /**
     * Sets Color Twist Weights coefficients manually
     *
     * CTW coefficients define how spectral bands are combined to create
     * RGB visualization. Each array contains weights for each spectral band.
     *
     * @param {Float32Array} redCTW - Red channel coefficients
     * @param {Float32Array} greenCTW - Green channel coefficients
     * @param {Float32Array} blueCTW - Blue channel coefficients
     * @throws {Error} If arrays have incorrect length
     */
    setCTW(redCTW: Float32Array, greenCTW: Float32Array, blueCTW: Float32Array): void;
    /**
     * Gets a preset CTW configuration by name
     *
     * Retrieves the preset's red, green, and blue CTW arrays from
     * the presets collection.
     *
     * @param {string} presetName - Name of the preset
     * @returns {Object|null} Object with red, green, blue arrays or null if not found
     */
    getPreset(presetName: string): any | null;
    /**
     * Applies a preset CTW from the presets library
     *
     * Loads and applies a predefined set of CTW coefficients for
     * specialized visualization (e.g., false color, vegetation analysis).
     *
     * @param {string} presetName - Name of the preset
     * @throws {Error} If preset doesn't exist
     */
    applyPreset(presetName: string): void;
    /**
     * Gets the wavelength array for spectral bands
     *
     * Returns the wavelength values (in nm) for each spectral band.
     *
     * @returns {number[]} Array of wavelengths
     */
    getWavelengths(): number[];
    /**
     * Gets the number of spectral bands
     *
     * Returns the count of spectral planes in the multispectral dataset.
     *
     * @returns {number} Number of bands
     */
    getBandCount(): number;
    /**
     * Gets available presets
     *
     * Returns the names of all available preset CTW configurations.
     *
     * @returns {string[]} Array of preset names
     */
    getAvailablePresets(): string[];
    /**
     * Gets spectrum data for a specific pixel
     *
     * For tiled formats, this method finds the appropriate tiles
     * and reads the spectral values.
     *
     * @param {number} x - X coordinate in image space
     * @param {number} y - Y coordinate in image space
     * @returns {number[]} Array of spectral values (0-100)
     */
    getSpectrum(x: number, y: number): number[];
    /**
     * Gets spectrum data for a specific pixel
     *
     * Uses the improved getPixelValues method from the base Layer class
     * to obtain spectral values across all bands.
     *
     * @param {number} x - X coordinate in image space
     * @param {number} y - Y coordinate in image space
     * @returns {number[]} Array of spectral values (0-100)
     */
    getSpectrum(x: number, y: number): number[];
    /**
     * Checks if current layout is a tiled format
     * @private
     * @returns {boolean} True if using a tiled format
     */
    private isTiledFormat;
}
/**
 * @typedef {Object} LayerNeuralRTIOptions
 * @property {string} url - URL to the Neural RTI configuration JSON
 * @property {Layout} layout - Layout system for image loading
 * @property {number} [convergenceSpeed=1.2] - Speed of quality convergence
 * @property {number} [maxTiles=40] - Maximum number of tiles to process
 * @property {string} [colorspace='rgb'] - Color space for processing
 * @extends LayerOptions
 */
/**
 * LayerNeuralRTI implements real-time Neural Reflectance Transformation Imaging.
 * This layer uses a neural network to perform real-time relighting of images,
 * offering improved quality and performance compared to traditional RTI approaches.
 *
 * Features:
 * - Neural network-based relighting
 * - Adaptive quality scaling
 * - Frame rate optimization
 * - Progressive refinement
 * - Multi-plane texture support
 * - WebGL acceleration
 *
 * Technical Details:
 * - Uses 3-layer neural network
 * - Supports multiple color spaces
 * - Implements adaptive tile processing
 * - Handles dynamic quality adjustment
 * - Manages frame buffer operations
 * - Coordinates light transformations
 *
 * Performance Optimizations:
 * - Dynamic resolution scaling
 * - FPS-based quality adjustment
 * - Progressive refinement system
 * - Tile caching
 * - Batch processing
 *
 * @extends Layer
 *
    * @example
 * ```javascript
 * // Create Neural RTI layer
 * const neuralRTI = new OpenLIME.Layer({
 *   type: 'neural',
 *   url: 'config.json',
 *   layout: 'deepzoom',
 *   convergenceSpeed: 1.2,
 *   maxTiles: 40
 * });
 *
 * // Add to viewer
 * viewer.addLayer('rti', neuralRTI);
 *
 * // Change light direction
 * neuralRTI.setLight([0.5, 0.3], 1000);
 * ```
 */
export class LayerNeuralRTI extends Layer {
    /**
     * Creates a new LayerNeuralRTI instance
     * @param {LayerNeuralRTIOptions} options - Configuration options
     */
    constructor(options: LayerNeuralRTIOptions);
    currentRelightFraction: number;
    maxTiles: number;
    relighted: boolean;
    convergenceSpeed: number;
    worldRotation: number;
    activeFramebuffer: any;
    imageShader: Shader;
    neuralShader: ShaderNeural;
    shaders: {
        standard: Shader;
        neural: ShaderNeural;
    };
    /**
     * Sets light direction with optional animation
     * @param {number[]} light - Light direction vector [x, y]
     * @param {number} [dt] - Animation duration in milliseconds
     */
    setLight(light: number[], dt?: number): void;
    /** @ignore */
    loadTile(tile: any, callback: any): void;
    /**
     * Loads neural network configuration and weights
     * @param {string} url - URL to configuration JSON
     * @private
     * @async
     */
    private loadNeural;
    /**
     * Initializes neural network parameters
     * @param {string} json_url - URL to configuration
     * @private
     * @async
     */
    private initialize;
    max: any;
    min: any;
    width: any;
    height: any;
    networkParameters: {};
    /** @ignore */
    setCoords(): void;
    coords_buffer: any;
    texCoords_buffer: any;
    /** @ignore */
    loadJSON(info_file: any): Promise<any>;
    /**
     * Renders the Neural RTI visualization
     * Handles quality adaptation and progressive refinement
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport
     * @returns {boolean} Whether render completed
     * @override
     * @private
     */
    private override draw;
    refineTimeout: NodeJS.Timeout;
    refine: boolean;
    relightFraction: any;
    totTiles: number;
    totPixels: number;
    /**
     * Prepares WebGL resources for relighting
     * @param {number[]} viewport - Viewport parameters
     * @param {number} w - Width for processing
     * @param {number} h - Height for processing
     * @private
     */
    private preRelight;
    framebuffer: any;
    backupViewport: number[];
    /**
     * Finalizes the relighting pass and restores rendering state
     *
     * This method performs cleanup after relighting operations by:
     * 1. Unbinding the framebuffer to return to normal rendering
     * 2. Restoring the original viewport dimensions
     *
     * Technical details:
     * - Restores WebGL rendering state
     * - Returns framebuffer binding to default
     * - Resets viewport to original dimensions
     * - Must be called after all tiles have been processed
     *
     * @private
     * @see preRelight - Called at start of relighting process
     * @see relightTile - Called for each tile during relighting
     */
    private postRelight;
    /**
     * Processes individual tile using neural network
     * @param {Object} tile - Tile to process
     * @param {number} w - Processing width
     * @param {number} h - Processing height
     * @param {boolean} sizeChanged - Whether tile size changed
     * @private
     */
    private relightTile;
}
/**
 * @typedef {Object} LayerRTIOptions
 * @property {string} url - URL to RTI info.json file (required)
 * @property {string} layout - Layout type: 'image', 'deepzoom', 'google', 'iiif', 'zoomify', 'tarzoom', 'itarzoom'
 * @property {boolean} [normals=false] - Whether to load normal maps
 * @property {string} [server] - IIP server URL (for IIP layout)
 * @property {number} [worldRotation=0] - Global rotation offset
 * @extends LayerOptions
 */
/**
 * LayerRTI implements Reflectance Transformation Imaging (RTI) visualization.
 *
 * RTI is an imaging technique that captures surface reflectance data to enable
 * interactive relighting of an object from different directions. The layer handles
 * the 'relight' data format, which consists of:
 *
 * - info.json: Contains RTI parameters and configuration
 * - plane_*.jpg: Series of coefficient images
 * - normals.jpg: Optional normal map (when using normals=true)
 *
 * Features:
 * - Interactive relighting
 * - Multiple layout support
 * - Normal map integration
 * - Light direction control
 * - Animation support
 * - World rotation handling
 *
 * Technical Details:
 * - Uses coefficient-based relighting
 * - Supports multiple image planes
 * - Handles various tiling schemes
 * - Manages WebGL resources
 * - Coordinates light transformations
 *
 * Data Format Support:
 * - Relight JSON configuration
 * - Multiple layout systems
 * - JPEG coefficient planes
 * - Optional normal maps
 * - IIP image protocol
 *
 * @extends Layer
 *
 * @example
 * ```javascript
 * // Create RTI layer with deepzoom layout
 * const rtiLayer = new OpenLIME.Layer({
 *   type: 'rti',
 *   url: 'path/to/info.json',
 *   layout: 'deepzoom',
 *   normals: true
 * });
 *
 * // Add to viewer
 * viewer.addLayer('rti', rtiLayer);
 *
 * // Change light direction with animation
 * rtiLayer.setLight([0.5, 0.5], 1000);
 * ```
 *
 * @see {@link https://github.com/cnr-isti-vclab/relight|Relight on GitHub}
 */
export class LayerRTI extends Layer {
    /**
     * Creates a new LayerRTI instance
     * @param {LayerRTIOptions} options - Configuration options
     * @throws {Error} If rasters options is not empty
     * @throws {Error} If url is not provided
     */
    constructor(options: LayerRTIOptions);
    worldRotation: number;
    /**
     * Constructs URL for image plane resources based on layout type
     * @param {string} url - Base URL
     * @param {string} plane - Plane identifier
     * @returns {string} Complete URL for the resource
     * @private
     */
    private imageUrl;
    /**
     * Sets the light direction with optional animation
     * @param {number[]} light - Light direction vector [x, y]
     * @param {number} [dt] - Animation duration in milliseconds
     */
    setLight(light: number[], dt?: number): void;
    /**
     * Loads and processes RTI configuration
     * @param {string} url - URL to info.json
     * @private
     * @async
     */
    private loadJson;
    pixelSize: any;
    /**
     * Renders the RTI visualization
     * Updates world rotation and manages drawing
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport
     * @returns {boolean} Whether render completed successfully
     * @override
     * @private
     */
    private override draw;
}
/**
* @typedef {Object} AnnoClass
* @property {string} stroke - CSS color for SVG elements (lines, text, outlines)
* @property {string} label - Display name for the class
*/
/**
* @typedef {Object.<string, AnnoClass>} AnnoClasses
* @description Map of class names to their visual properties
*/
/**
* @typedef {Object} LayerSvgAnnotationOptions
* @property {AnnoClasses} classes - Annotation class definitions with styles
* @property {Function} [onClick] - Callback for annotation click events (param: selected annotation)
* @property {boolean} [shadow=true] - Whether to use Shadow DOM for SVG elements
* @property {HTMLElement} [overlayElement] - Container for SVG overlay
* @property {string} [style] - Additional CSS styles for annotations
* @property {Function} [annotationUpdate] - Custom update function for annotations
* @extends LayerAnnotationOptions
*/
/**
* LayerSvgAnnotation provides SVG-based annotation capabilities in OpenLIME.
* It renders SVG elements directly on the canvas overlay, outside the WebGL context,
* enabling rich vector graphics annotations with interactive features.
*
* Features:
* - SVG-based vector annotations
* - Custom styling per annotation class
* - Interactive selection
* - Shadow DOM isolation
* - Dynamic SVG transformation
* - Event handling
* - Custom update callbacks
*
* Technical Details:
* - Uses SVG overlay for rendering
* - Handles coordinate system transformations
* - Manages DOM element lifecycle
* - Supports custom class styling
* - Implements visibility management
* - Provides selection mechanisms
*
* @extends LayerAnnotation
*
* @example
* ```javascript
* // Create SVG annotation layer with custom classes
* const annotationLayer = new OpenLIME.Layer({
*   type: 'svg_annotations',
*   classes: {
*     'highlight': { stroke: '#ff0', label: 'Highlight' },
*     'comment': { stroke: '#0f0', label: 'Comment' }
*   },
*   onClick: (annotation) => {
*     console.log('Clicked:', annotation.label);
*   },
*   shadow: true
* });
*
* // Add to viewer
* viewer.addLayer('annotations', annotationLayer);
* ```
*/
export class LayerSvgAnnotation extends LayerAnnotation {
    /**
     * Creates a new LayerSvgAnnotation instance
     * @param {LayerSvgAnnotationOptions} [options] - Configuration options
     */
    constructor(options?: LayerSvgAnnotationOptions);
    /**
     * Creates the SVG overlay element and initializes the shadow DOM if enabled
     * @private
     */
    private createOverlaySVGElement;
    svgElement: SVGSVGElement;
    svgGroup: SVGGElement;
    /**
     * Renders the SVG annotations
     * Updates SVG viewBox and transformation to match current view
     * @param {Transform} transform - Current view transform
     * @param {Object} viewport - Current viewport
     * @returns {boolean} Whether render completed successfully
     * @override
     */
    override draw(transform: Transform, viewport: any): boolean;
    /**
     * Calculates SVG group transform string
     * @param {Transform} transform - Current view transform
     * @param {boolean} [inverse=false] - Whether to return inverse transform
     * @returns {string} SVG transform attribute value
     */
    getSvgGroupTransform(transform: Transform, inverse?: boolean): string;
    /**
     * Prepares annotations for rendering
     * Handles SVG element creation and updates
     * @param {Transform} transform - Current view transform
     * @private
     */
    private prefetch;
}
/**
 * @typedef {Object} TileObj
 * @property {number} level - Zoom level in the image pyramid
 * @property {number} x - Horizontal position in tile grid
 * @property {number} y - Vertical position in tile grid
 * @property {number} index - Unique tile identifier
 * @property {number} [start] - Starting byte position in dataset (for tar formats)
 * @property {number} [end] - Ending byte position in dataset (for tar formats)
 * @property {number} missing - Number of pending channel data requests
 * @property {WebGLTexture[]} tex - Array of textures (one per channel)
 * @property {number} time - Tile creation timestamp for cache management
 * @property {number} priority - Loading priority for cache management
 * @property {number} size - Total tile size in bytes
 */
/**
 * @typedef {'image'|'deepzoom'|'deepzoom1px'|'google'|'zoomify'|'iiif'|'tarzoom'|'itarzoom'} LayoutType
 * @description Supported image format types:
 * - image: Single-resolution web images (jpg, png, etc.)
 * - deepzoom: Microsoft Deep Zoom with root tile > 1px
 * - deepzoom1px: Microsoft Deep Zoom with 1px root tile
 * - google: Google Maps tiling scheme
 * - zoomify: Zoomify format
 * - iiif: International Image Interoperability Framework
 * - tarzoom: OpenLIME tar-based tiling
 * - itarzoom: OpenLIME indexed tar-based tiling
 */
/**
 * @typedef {Object} LayoutOptions
 * @property {number} [width] - Image width (required for google layout)
 * @property {number} [height] - Image height (required for google layout)
 * @property {string} [suffix='jpg'] - Tile file extension
 * @property {string} [subdomains='abc'] - Available subdomains for URL templates
 */
/**
 * @event Layout#ready
 * @description FIXME Fired when a layout is ready to be drawn (the single-resolution image is downloaded or the multi-resolution structure has been initialized)
 */
/**
 * @event Layout#updateSize
 * @description Fired when layout dimensions change
 */
/**
 * Layout manages image formats and tiling schemes in OpenLIME.
 *
 * This class is responsible for:
 * - Managing different image formats
 * - Handling tiling schemes
 * - Coordinating tile loading
 * - Converting between coordinate systems
 * - Managing tile priorities
 *
 * Format Support:
 * 1. Single-resolution images:
 * - Direct URL to image file
 * - Supports all standard web formats (jpg, png, etc)
 *
 * 2. Tiled formats:
 * - DeepZoom (Microsoft): Uses .dzi config file
 * - Google Maps: Direct directory structure
 * - Zoomify: Uses ImageProperties.xml
 * - IIIF: Standard server interface
 * - TarZoom: OpenLIME's optimized format
 *
 * @fires Layout#ready
 * @fires Layout#updateSize
 *
 * @example
 * ```javascript
 * // Single image
 * const imageLayout = new Layout('image.jpg', 'image');
 *
 * // Deep Zoom
 * const dzLayout = new Layout('tiles.dzi', 'deepzoom');
 *
 * // Google Maps format
 * const googleLayout = new Layout('tiles/', 'google', {
 *   width: 2000,
 *   height: 1500
 * });
 * ```
 */
export class Layout {
    /**
     * Creates a new Layout instance
     * @param {string} url - URL to image or configuration file
     * @param {LayoutType} type - Type of image layout
     * @param {LayoutOptions} [options] - Additional configuration
     * @throws {Error} If layout type is unknown or module not loaded
     */
    constructor(url: string, type: LayoutType, options?: LayoutOptions);
    /**
     * Gets tile dimensions
     * @returns {number[]} [width, height] of tiles
     */
    getTileSize(): number[];
    /**
     * Sets default layout properties
     * @param {LayoutType} type - Layout type
     * @private
     */
    private setDefaults;
    /**
     * Initializes layout configuration
     * @param {string} url - Resource URL
     * @param {LayoutType} type - Layout type
     * @param {LayoutOptions} options - Configuration options
     * @private
     */
    private init;
    /**
     * Sets URLs for layout resources
     * @param {string[]} urls - Array of resource URLs
     * @fires Layout#ready
     * @private
     */
    private setUrls;
    urls: string[];
    /**
     * Gets URL for specific tile
     * @param {number} id - Channel identifier
     * @param {TileObj} tile - Tile object
     * @returns {string} Tile URL
     * @abstract
     */
    getTileURL(id: number, tile: TileObj): string;
    status: string;
    /**
     * Constructs URL for specific image plane
     * @param {string} url - Base URL
     * @param {string} plane - Plane identifier
     * @returns {string} Complete URL
     */
    imageUrl(url: string, plane: string): string;
    /**
     * Gets layout bounds
     * @returns {BoundingBox} Layout boundaries
     */
    boundingBox(): BoundingBox;
    /**
     * Calculates tile coordinates
     * @param {TileObj} tile - Tile to calculate coordinates for
     * @returns {{coords: Float32Array, tcoords: Float32Array}} Image and texture coordinates
     */
    tileCoords(tile: TileObj): {
        coords: Float32Array;
        tcoords: Float32Array;
    };
    /**
     * Creates new tile instance
     * @param {number} index - Tile identifier
     * @returns {TileObj} New tile object
     * @private
     */
    private newTile;
    /**
     * Determines required tiles for rendering
     * @param {Object} viewport - Current viewport
     * @param {Object} transform - Current transform
     * @param {Object} layerTransform - Layer transform
     * @param {number} border - Border size
     * @param {number} bias - Mipmap bias
     * @param {Map<number, TileObj>} tiles - Existing tiles
     * @param {number} [maxtiles=8] - Maximum tiles to return
     * @returns {TileObj[]} Array of needed tiles
     */
    needed(viewport: any, transform: any, layerTransform: any, border: number, bias: number, tiles: Map<number, TileObj>, maxtiles?: number): TileObj[];
    /**
     * Gets tiles available for rendering
     * @param {Object} viewport - Current viewport
     * @param {Object} transform - Current transform
     * @param {Object} layerTransform - Layer transform
     * @param {number} border - Border size
     * @param {number} bias - Mipmap bias
     * @param {Map<number, TileObj>} tiles - Existing tiles
     * @returns {Object.<number, TileObj>} Map of available tiles
     */
    available(viewport: any, transform: any, layerTransform: any, border: number, bias: number, tiles: Map<number, TileObj>): {
        [x: number]: TileObj;
    };
    /**
     * Calculates viewport bounding box
     * @param {Object} viewport - Viewport parameters
     * @param {Object} transform - Current transform
     * @param {Object} layerT - Layer transform
     * @returns {BoundingBox} Viewport bounds in image space
     */
    getViewportBox(viewport: any, transform: any, layerT: any): BoundingBox;
    /**
     * Collection of layout type factories
     * @type {Object}
     */
    types: any;
}
export namespace Layout { }
/**
 * LayoutTileImages class manages collections of image tiles with associated regions.
 * Each tile represents an independent image with its own position and dimensions in the layout space.
 * Tiles can be individually shown or hidden and are loaded from annotation files or external descriptors.
 * @extends Layout
 */
export class LayoutTileImages extends Layout {
    /**
     * Creates a new LayoutTileImages instance.
     * @param {string|null} url - URL to the annotation file containing tile descriptors, or null if descriptors will be set later
     * @param {string} type - The layout type (should be 'tile_images')
     * @param {Object} [options] - Configuration options inherited from Layout
     */
    constructor(url: string | null, type: string, options?: any);
    tileDescriptors: any[];
    box: BoundingBox;
    /**
     * Loads tile descriptors from an annotation file.
     * @private
     * @async
     * @param {string} url - URL of the annotation file
     * @fires Layout#ready - When descriptors are loaded and processed
     * @fires Layout#updateSize - When bounding box is computed
     */
    private loadDescriptors;
    /**
     * Computes the bounding box containing all tile regions.
     * Updates the layout's box property to encompass all tile regions.
     * @private
     */
    private computeBoundingBox;
    /**
     * Sets the base path for tile URLs based on the annotation file location.
     * @private
     * @param {string} url - URL of the annotation file
     */
    private setPathFromUrl;
    path: string;
    /**
     * Sets tile descriptors programmatically instead of loading from a file.
     * @param {Annotation[]} tileDescriptors - Array of tile descriptors
     * @fires Layout#ready
     */
    setTileDescriptors(tileDescriptors: Annotation[]): void;
    /**
     * Sets visibility for a specific tile.
     * @param {number} index - Index of the tile
     * @param {boolean} visible - Visibility state to set
     */
    setTileVisible(index: number, visible: boolean): void;
    /**
     * Sets visibility for all tiles.
     * @param {boolean} visible - Visibility state to set for all tiles
     */
    setAllTilesVisible(visible: boolean): void;
    /**
     * Maps tile coordinates to a linear index.
     * In this layout, x directly maps to the index as tiles are stored in a flat list.
     * @param {number} level - Zoom level (unused in this layout)
     * @param {number} x - X coordinate (used as index)
     * @param {number} y - Y coordinate (unused in this layout)
     * @returns {number} Linear index of the tile
     */
    index(level: number, x: number, y: number): number;
    /**
     * Gets coordinates for a tile in both image space and texture space.
     * @param Obj} tile - The tile to get coordinates for
     * @returns {Object} Coordinate data
     * @returns {Float32Array} .coords - Image space coordinates [x,y,z, x,y,z, x,y,z, x,y,z]
     * @returns {Float32Array} .tcoords - Texture coordinates [u,v, u,v, u,v, u,v]
     */
    tileCoords(tile: any): any;
    /**
     * Determines which tiles are needed for the current view.
     * @param {Viewport} viewport - Current viewport
     * @param {Transform} transform - Current transform
     * @param {Transform} layerTransform - Layer-specific transform
     * @param {number} border - Border size in viewport units
     * @param {number} bias - Resolution bias (unused in this layout)
     * @param {Map<number,Tile>} tiles - Currently available tiles
     * @param {number} [maxtiles=8] - Maximum number of tiles to return
     * @returns {TileObj[]} Array of needed tiles sorted by distance to viewport center
     */
    needed(viewport: Viewport, transform: Transform, layerTransform: Transform, border: number, bias: number, tiles: Map<number, Tile>, maxtiles?: number): TileObj[];
    /**
     * Gets tiles currently available for rendering.
     * @param {Viewport} viewport - Current viewport
     * @param {Transform} transform - Current transform
     * @param {Transform} layerTransform - Layer-specific transform
     * @param {number} border - Border size in viewport units
     * @param {number} bias - Resolution bias (unused in this layout)
     * @param {Map<number,Tile>} tiles - Available tiles
     * @returns {Object.<number,Tile>} Map of tile index to tile object for visible, loaded tiles
     */
    available(viewport: Viewport, transform: Transform, layerTransform: Transform, border: number, bias: number, tiles: Map<number, Tile>): {
        [x: number]: Tile;
    };
    /**
     * Checks if a tile's region intersects with a given box.
     * @private
     * @param {BoundingBox} box - Box to check intersection with
     * @param {number} index - Index of the tile to check
     * @param {boolean} [flipY=true] - Whether to flip Y coordinates for texture coordinate space
     * @returns {boolean} True if the tile intersects the box
     */
    private intersects;
    /**
     * Gets the total number of tiles in the layout.
     * @returns {number} Number of tile descriptors
     */
    tileCount(): number;
}
/**
 * @typedef {'image'|'deepzoom'|'deepzoom1px'|'google'|'zoomify'|'iiif'|'iip'|'tarzoom'|'itarzoom'} Layout#Type
 * Supported image layout types including both single-resolution and multi-resolution formats.
 * - image: Standard web image formats (jpg, png, gif, etc.)
 * - deepzoom: Microsoft Deep Zoom format with root tile > 1px
 * - deepzoom1px: Microsoft Deep Zoom format with 1px root tile
 * - google: Google Maps tiling scheme
 * - zoomify: Zoomify tiling format
 * - iiif: International Image Interoperability Framework
 * - iip: Internet Imaging Protocol
 * - tarzoom: OpenLIME custom format (single TAR of DeepZoom pyramid)
 * - itarzoom: OpenLIME custom interleaved TAR format
 */
/**
 * The Layout class is responsible for specifying the data formats (images) managed by OpenLIME.
 * All web single-resolution image types (*jpg*, *png*, *gif*, etc...) are supported as well as the most common
 * tiled image formats (*deepzoom*, *zoomify*, *IIIF*, *google maps*), which are suitable for large images.
 * #### Single-resolution images
 * The URL is the address of the file (for instance, 'https://my.example/image.jpg').
 * #### Tiled images
 * They can be specified in a variety of ways depending on the format chosen.
 * * **deepzoom** - The root tile of the image pyramid has a size > 1px (typical value is 254px). It is defined by the URL of the *.dzi* file
 * (for instance, 'https://my.example/image.dzi'). See: {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN DeepZoom}
 * * **deepzoom1px** - The root tile of the image pyramid has a size = 1px. It is defined by the URL of the *.dzi* file
 * (for instance, 'https://my.example/image.dzi'). See: {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN DeepZoom}
 * * **google** - The URL points directly to the directory containing the pyramid of images (for instance, 'https://my.example/image').
 * The standard does not require any configuration file, so it is mandatory to indicate in the `options` the
 * width and height in pixels of the original image. See: {@link https://www.microimages.com/documentation/TechGuides/78googleMapsStruc.pdf Google Maps}
 * * **zoomify** - The URL indicates the location of Zoomify configuration file (for instance, 'https://my.example/image/ImageProperties.xml').
 * See: {@link http://www.zoomify.com/ZIFFileFormatSpecification.htm Zoomify}
 * * **iip** - The server parameter (optional) indicates the URL of the IIPImage endpoint (for example '/fcgi-bin/iipsrv.fcgi').
 * The URL parameter indicates either just the name of the path and image file (for instance 'image.tif') if the server parameter has been set or the full IIP URL if not
 * (for instance '/fcgi-bin/iipsrv.fcgi?FIF=image.tif' or 'https://you.server//fcgi-bin/iipsrv.fcgi?FIF=image.tif' if image is hosted elsewhere)
 * See: {@link https://iipimage.sourceforge.io/ IIPImage Server}
 * * **iiif** - According to the standard, the URL is the address of a IIIF server (for instance, 'https://myiiifserver.example/').
 * See: {@link https://iiif.io/api/image/3.0/ IIIF }
 * * **tarzoom** and **itarzoom** - This is a custom format of the OpenLIME framework. It can be described as the TAR of a DeepZoom (all the DeepZoom image pyramid is stored in a single file).
 * It takes advantage of the fact that current web servers are able to handle partial-content HTTP requests. Tarzoom facilitates
 * the work of the server, which is not penalised by having to manage a file system with many small files. The URL is the address of the *.tzi* file
 * (for instance, 'https://my.example/image.tzi'). Warning: tarzoom|itarzoom may not work on older web servers.
 *
 * @extends Layout
 *
 * @example
 * ```javascript
 * // DeepZoom layout
 * const dzLayout = new LayoutTiles('image.dzi', 'deepzoom', {
 *   cachelevels: 8
 * });
 *
 * // Google Maps layout
 * const googleLayout = new LayoutTiles('tiles/', 'google', {
 *   width: 4096,
 *   height: 3072,
 *   suffix: 'png'
 * });
 *
 * // IIIF layout
 * const iiifLayout = new LayoutTiles('https://server/image', 'iiif');
 * ```
 *
 * @fires Layout#ready - When layout initialization is complete
 * @fires Layout#updateSize - When layout dimensions change
*/
export class LayoutTiles extends Layout {
    /**
     * Creates a new LayoutTiles instance.
     * @param {string} url - URL to the image or tile configuration
     * @param {Layout#Type} type - The type of image layout
     * @param {Object} [options] - Configuration options
     * @param {number} [options.width] - Width of original image (required for 'google' type)
     * @param {number} [options.height] - Height of original image (required for 'google' type)
     * @param {string} [options.suffix='jpg'] - Tile file extension
     * @param {string} [options.subdomains='abc'] - Available subdomains for Google URL template
     * @param {number} [options.cachelevels=10] - Number of levels above current to cache
     * @param {string} [options.server] - IIP server URL (for IIP type only)
     * @fires Layout#ready
     * @fires Layout#updateSize
     */
    constructor(url: string, type: any, options?: {
        width?: number;
        height?: number;
        suffix?: string;
        subdomains?: string;
        cachelevels?: number;
        server?: string;
    });
    /**
     * Sets default values for the layout.
     * @private
     * @param {Layout#Type} type - The layout type
     */
    private setDefaults;
    /**
     * Configures URLs and initializes the layout based on type.
     * @private
     * @param {string[]} urls - Array of URLs to configure
     * @fires Layout#ready
     * @fires Layout#updateSize
     */
    private setUrls;
    /**
     * Generates unique index for a tile based on its position and level.
     * @param {number} level - Zoom level
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Unique tile index
     */
    index(level: number, x: number, y: number): number;
    /**
     * Converts tile index back to level, x, y coordinates.
     * @param {number} index - Tile index
     * @returns {Object} Position object containing level, x, y
     */
    reverseIndex(index: number): any;
    /**
     * Initializes bounding boxes for all pyramid levels.
     * @private
     * @fires Layout#updateSize
     * @returns {number} Total number of tiles
     */
    private initBoxes;
    /**
    * The event is fired when a layout size is modified (and the scene extension must be recomputed at canvas level).
    * @event Layout#updateSize
    */
    qbox: any[];
    bbox: any[];
    /**
     * Gets coordinates for a tile in both image space and texture space.
     * @param {TileObj} tile - The tile to get coordinates for
     * @returns {Object} Coordinate data
     * @returns {Float32Array} .coords - Image space coordinates [x,y,z, x,y,z, x,y,z, x,y,z]
     * @returns {Float32Array} .tcoords - Texture coordinates [u,v, u,v, u,v, u,v]
     */
    tileCoords(tile: TileObj): any;
    /**
     * Determines which tiles are needed for the current view.
     * @param {Viewport} viewport - Current viewport
     * @param {Transform} transform - Current transform
     * @param {Transform} layerTransform - Layer-specific transform
     * @param {number} border - Border size in tile units for prefetching
     * @param {number} bias - Resolution bias (0-1, affects mipmap level selection)
     * @param {Map<number,Tile>} tiles - Currently available tiles
     * @param {number} [maxtiles=8] - Maximum number of tiles to return
     * @returns {TileObj[]} Array of needed tiles sorted by priority
     */
    needed(viewport: Viewport, transform: Transform, layerTransform: Transform, border: number, bias: number, tiles: Map<number, Tile>, maxtiles?: number): TileObj[];
    /**
     * Gets tiles currently available for rendering.
     * @param {Viewport} viewport - Current viewport
     * @param {Transform} transform - Current transform
     * @param {Transform} layerTransform - Layer-specific transform
     * @param {number} border - Border size in tile units
     * @param {number} bias - Resolution bias
     * @param {Map<number,Tile>} tiles - Available tiles
     * @returns {Object.<number,Tile>} Map of tile index to tile object with additional 'complete' property
     */
    available(viewport: Viewport, transform: Transform, layerTransform: Transform, border: number, bias: number, tiles: Map<number, Tile>): {
        [x: number]: Tile;
    };
    /**
     * Computes required tiles at each pyramid level for the current view.
     * @param {Viewport} viewport - Current viewport
     * @param {Transform} transform - Current transform
     * @param {Transform} layerTransform - Layer-specific transform
     * @param {number} border - Border size in tile units for prefetching
     * @param {number} bias - Resolution bias (0-1)
     * @returns {Object} Tile requirements
     * @returns {number} .level - Optimal pyramid level
     * @returns {BoundingBox[]} .pyramid - Array of tile bounding boxes per level
     */
    neededBox(viewport: Viewport, transform: Transform, layerTransform: Transform, border: number, bias: number): any;
    /**
     * Initializes Google Maps layout.
     * @private
     * @async
     * @throws {Error} If width or height not specified
     */
    private initGoogle;
    tilesize: any;
    overlap: number;
    nlevels: any;
    /**
     * Initializes DeepZoom layout.
     * @private
     * @async
     * @param {boolean} onepixel - Whether using 1px root tile variant
     * @throws {Error} If unable to fetch or parse DZI file
     */
    private initDeepzoom;
    suffix: string;
    width: any;
    height: any;
    skiplevels: number;
    /**
     * Initializes Tarzoom layout.
     * @private
     * @async
     * @throws {Error} If unable to fetch or parse TZI file
     */
    private initTarzoom;
    tarzoom: any[];
    /**
     * Initializes Tarzoom layout.
     * @private
     * @async
     * @throws {Error} If unable to fetch or parse TZI file
     */
    private initITarzoom;
    url: string;
    /**
     * Initializes Zoomify layout.
     * @private
     * @async
     * @throws {Error} If unable to fetch or parse ImageProperties.xml
     */
    private initZoomify;
    /**
     * Initializes IIIF layout.
     * @private
     * @async
     * @throws {Error} If unable to fetch or parse info.json
     */
    private initIIIF;
    /**
     * Initializes IIP layout.
     * @private
     * @async
     * @throws {Error} If unable to fetch or parse server response
     */
    private initIIP;
}
/**
 * Callback function fired by a 'click' event on a lens dashboard element.
 * @function taskCallback
 * @param {Event} e The DOM event.
 */
/**
 * LensDashboard class creates an interactive container for a lens interface.
 * It provides:
 * - A square HTML container that moves with the lens
 * - SVG-based circular lens border with drag interaction for resizing
 * - Masking capabilities for controlling content visibility inside/outside the lens
 * - Ability to add HTML elements positioned relative to the lens
 */
export class LensDashboard {
    /**
     * Creates a new LensDashboard instance.
     * @param {Viewer} viewer - The OpenLIME viewer instance
     * @param {Object} [options] - Configuration options
     * @param {number} [options.containerSpace=80] - Extra space around the lens for dashboard elements (in pixels)
     * @param {number[]} [options.borderColor=[0.078, 0.078, 0.078, 1]] - RGBA color for lens border
     * @param {number} [options.borderWidth=12] - Width of the lens border (in pixels)
     * @param {LayerSvgAnnotation} [options.layerSvgAnnotation=null] - Associated SVG annotation layer
     */
    constructor(viewer: Viewer, options?: {
        containerSpace?: number;
        borderColor?: number[];
        borderWidth?: number;
        layerSvgAnnotation?: LayerSvgAnnotation;
    });
    lensLayer: any;
    viewer: Viewer;
    elements: any[];
    container: HTMLDivElement;
    lensElm: SVGElement;
    lensBox: {
        x: number;
        y: number;
        r: number;
        w: number;
        h: number;
    };
    svgElement: any;
    svgMaskId: string;
    svgMaskUrl: string;
    noupdate: boolean;
    /**
     * Sets up interactive lens border resizing.
     * Creates event listeners for pointer events to allow users to drag the lens border to resize.
     * @private
     * @param {SVGElement} circle - The SVG circle element representing the lens border
     */
    private setupCircleInteraction;
    isCircleSelected: boolean;
    /**
     * Toggles the visibility of the dashboard UI elements.
     * Uses CSS classes to show/hide the interface.
     */
    toggle(): void;
    /**
     * Associates a LayerSvgAnnotation with the dashboard.
     * This enables proper masking of SVG annotations within the lens area.
     * @param {LayerSvgAnnotation} layer - The SVG annotation layer to associate
     */
    setLayerSvgAnnotation(layer: LayerSvgAnnotation): void;
    layerSvgAnnotation: LayerSvgAnnotation;
    /**
     * Creates SVG masking elements for the lens.
     * Sets up a composite mask consisting of:
     * - A full-viewport rectangle for the background
     * - A circle for the lens area
     * The mask controls visibility of content inside vs outside the lens.
     * @private
     */
    private createSvgLensMask;
    svgMask: SVGElement;
    svgGroup: SVGElement;
    outMask: SVGElement;
    inMask: SVGElement;
    /**
     * Sets up the SVG container element for the lens.
     * Will either:
     * - Use the SVG element from an associated annotation layer
     * - Find an existing SVG element in the shadow DOM
     * - Create a new SVG element if needed
     * @private
     */
    private setupSvgElement;
    /**
     * Applies the lens mask to an SVG element.
     * Elements with the mask will only be visible within the lens area
     * (or outside, depending on mask configuration).
     * @param {SVGElement} svg - The SVG element to mask
     */
    setMaskOnSvgLayer(svg: SVGElement): void;
    /**
     * Removes the lens mask from an SVG element.
     * Returns the element to its normal, unmasked rendering.
     * @param {SVGElement} svg - The SVG element to unmask
     */
    removeMaskFromSvgLayer(svg: SVGElement): void;
    /**
     * Adds an HTML element to the dashboard container.
     * The element should use absolute positioning relative to the container.
     * Example:
     * ```javascript
     * const button = document.createElement('button');
     * button.style = 'position: absolute; left: 10px; top: 10px;';
     * lensDashboard.append(button);
     * ```
     * @param {HTMLElement} elm - The HTML element to add
     */
    append(elm: HTMLElement): void;
    /**
     * Sets the rendering mode for the lens area.
     * Controls whether content inside the lens is shown or hidden.
     * @param {RenderingMode} mode - The rendering mode to use
     */
    setLensRenderingMode(mode: RenderingMode): void;
    /**
     * Sets the rendering mode for the background (area outside the lens).
     * Controls whether content outside the lens is shown or hidden.
     * @param {RenderingMode} mode - The rendering mode to use
     */
    setBackgroundRenderingMode(mode: RenderingMode): void;
    /**
     * Updates the dashboard position and size.
     * Called internally when the lens moves or resizes.
     * @private
     * @param {number} x - Center X coordinate in scene space
     * @param {number} y - Center Y coordinate in scene space
     * @param {number} r - Lens radius in scene space
     */
    private update;
    /**
     * Updates the SVG mask position and size.
     * Called internally by update() to keep the mask aligned with the lens.
     * @private
     * @param {Transform} cameraT - Current camera transform
     * @param {Object} center - Lens center in canvas coordinates
     * @param {number} center.x - Center X coordinate
     * @param {number} center.y - Center Y coordinate
     * @param {number} radius - Lens radius in canvas coordinates
     */
    private updateMask;
}
/**
 * LensDashboardNavigator class creates an interactive lens dashboard with navigation controls.
 * Provides:
 * - Camera movement control
 * - Light direction control
 * - Annotation switching and navigation
 * - Toolbar UI elements positioned around the lens
 * @extends LensDashboard
 */
export class LensDashboardNavigator extends LensDashboard {
    /**
     * Creates a new LensDashboardNavigator instance.
     * @param {Viewer} viewer - The OpenLIME viewer instance
     * @param {Object} [options] - Configuration options
     * @param {number} [options.toolboxHeight=22] - Height of the toolbox UI elements in pixels
     * @param {number} [options.toolboxGap=5] - Gap (in px) between left and roght toolboxes
     * @param {number} [options.angleToolbar=30] - Angle of toolbar position in degrees
     * @param {Object} [options.actions] - Configuration for toolbar actions
     * @param {Object} [options.actions.camera] - Camera control action
     * @param {string} options.actions.camera.label - Action identifier
     * @param {Function} options.actions.camera.task - Callback for camera action
     * @param {Object} [options.actions.light] - Light control action
     * @param {string} options.actions.light.label - Action identifier
     * @param {Function} options.actions.light.task - Callback for light action
     * @param {Object} [options.actions.annoswitch] - Annotation toggle action
     * @param {string} options.actions.annoswitch.label - Action identifier
     * @param {string} options.actions.annoswitch.type - Action type ('toggle')
     * @param {string} options.actions.annoswitch.toggleClass - CSS class for toggle element
     * @param {Function} options.actions.annoswitch.task - Callback for annotation toggle
     * @param {Object} [options.actions.prev] - Previous annotation action
     * @param {string} options.actions.prev.label - Action identifier
     * @param {Function} options.actions.prev.task - Callback for previous action
     * @param {Object} [options.actions.down] - Download annotation action
     * @param {string} options.actions.down.label - Action identifier
     * @param {Function} options.actions.down.task - Callback for download action
     * @param {Object} [options.actions.next] - Next annotation action
     * @param {string} options.actions.next.label - Action identifier
     * @param {Function} options.actions.next.task - Callback for next action
     * @param {Function} [options.updateCb] - Callback fired during lens updates
     * @param {Function} [options.updateEndCb] - Callback fired when lens movement ends
     */
    constructor(viewer: Viewer, options?: {
        toolboxHeight?: number;
        toolboxGap?: number;
        angleToolbar?: number;
        actions?: {
            camera?: {
                label: string;
                task: Function;
            };
            light?: {
                label: string;
                task: Function;
            };
            annoswitch?: {
                label: string;
                type: string;
                toggleClass: string;
                task: Function;
            };
            prev?: {
                label: string;
                task: Function;
            };
            down?: {
                label: string;
                task: Function;
            };
            next?: {
                label: string;
                task: Function;
            };
        };
        updateCb?: Function;
        updateEndCb?: Function;
    });
    moving: boolean;
    delay: number;
    timeout: NodeJS.Timeout;
    angleToolbar: number;
    toolbox1: HTMLDivElement;
    toolbox2: HTMLDivElement;
    tools1: HTMLDivElement;
    tools2: HTMLDivElement;
    /**
     * Retrieves an action configuration by its label.
     * @param {string} label - The action label to find
     * @returns {Object|null} The action configuration object or null if not found
     * @private
     */
    private getAction;
    /**
     * Enables or disables a specific action button.
     * @param {string} label - The action label to modify
     * @param {boolean} [enable=true] - Whether to enable or disable the action
     */
    setActionEnabled(label: string, enable?: boolean): void;
    /**
     * Toggles between camera and light control modes.
     * When light control is active, modifies controller behavior for light direction adjustment.
     * @private
     */
    private toggleLightController;
}
/**
 * LensDashboardNavigatorRadial class creates a circular lens dashboard with radially arranged controls.
 * Provides:
 * - Circular arrangement of controls around the lens
 * - Grouped tool positioning
 * - Animated visibility transitions
 * - Background arc for visual grouping
 * @extends LensDashboard
 */
export class LensDashboardNavigatorRadial extends LensDashboard {
    /**
     * Converts degrees to radians.
     * @private
     * @param {number} angle - Angle in degrees
     * @returns {number} Angle in radians
     */
    private static degToRadians;
    /**
     * Converts polar coordinates to cartesian coordinates.
     * @private
     * @param {number} centerX - Center X coordinate
     * @param {number} centerY - Center Y coordinate
     * @param {number} radius - Radius
     * @param {number} angleInDegrees - Angle in degrees
     * @returns {Object} Cartesian coordinates {x, y}
     */
    private static polarToCartesian;
    /**
     * Generates SVG arc path description.
     * @private
     * @param {number} x - Center X coordinate
     * @param {number} y - Center Y coordinate
     * @param {number} radius - Inner radius
     * @param {number} border - Border width
     * @param {number} startAngle - Start angle in degrees
     * @param {number} endAngle - End angle in degrees
     * @returns {string} SVG path description
     */
    private static describeArc;
    /**
     * Creates a new LensDashboardNavigatorRadial instance.
     * @param {Viewer} viewer - The OpenLIME viewer instance
     * @param {Object} [options] - Configuration options
     * @param {number} [options.toolSize=34] - Size of tool buttons in pixels
     * @param {number} [options.toolPadding=0] - Padding between tool buttons
     * @param {number[]} [options.group=[-65, 0]] - Angle positions for tool groups in degrees
     * @param {Object} [options.actions] - Configuration for toolbar actions
     * @param {Object} [options.actions.camera] - Camera control action
     * @param {string} options.actions.camera.label - Action identifier
     * @param {number} options.actions.camera.group - Group index for positioning
     * @param {number} options.actions.camera.angle - Angle offset within group
     * @param {Function} options.actions.camera.task - Callback for camera action
     * @param {Object} [options.actions.light] - Light control action (same properties as camera)
     * @param {Object} [options.actions.annoswitch] - Annotation toggle action
     * @param {string} options.actions.annoswitch.type - Action type ('toggle')
     * @param {string} options.actions.annoswitch.toggleClass - CSS class for toggle element
     * @param {Object} [options.actions.prev] - Previous annotation action (same properties as camera)
     * @param {Object} [options.actions.down] - Download annotation action (same properties as camera)
     * @param {Object} [options.actions.next] - Next annotation action (same properties as camera)
     * @param {Function} [options.updateCb] - Callback fired during lens updates
     * @param {Function} [options.updateEndCb] - Callback fired when lens movement ends
     */
    constructor(viewer: Viewer, options?: {
        toolSize?: number;
        toolPadding?: number;
        group?: number[];
        actions?: {
            camera?: {
                label: string;
                group: number;
                angle: number;
                task: Function;
            };
            light?: any;
            annoswitch?: {
                type: string;
                toggleClass: string;
            };
            prev?: any;
            down?: any;
            next?: any;
        };
        updateCb?: Function;
        updateEndCb?: Function;
    });
    moving: boolean;
    delay: number;
    timeout: NodeJS.Timeout;
    toolboxBkgSize: number;
    toolboxBkgPadding: number;
    toolboxBkg: Object;
    /**
     * Initializes the dashboard after construction.
     * Allows modification of actions and layers before initialization.
     * @private
     */
    private init;
    /**
     * Updates the background arc element.
     * @private
     * @param {number} r - Radius
     * @param {number} sizew - Width
     * @param {number} sizeh - Height
     */
    private setToolboxBkg;
    /**
     * Adds an action button to the dashboard.
     * @private
     * @param {Object} action - Action configuration
     */
    private addAction;
    /**
     * Retrieves an action configuration by its label.
     * @param {string} label - The action label to find
     * @returns {Object|null} The action configuration object or null if not found
     */
    getAction(label: string): any | null;
    /**
     * Enables or disables a specific action button.
     * @param {string} label - The action label to modify
     * @param {boolean} [enable=true] - Whether to enable or disable the action
     */
    setActionEnabled(label: string, enable?: boolean): void;
    /**
     * Toggles between camera and light control modes.
     * @private
     */
    private toggleLightController;
    /**
     * Sets visibility of toggle elements.
     * @private
     * @param {boolean} visible - Whether toggle elements should be visible
     */
    private setToggleClassVisibility;
    /**
     * Updates tool element positions in the radial layout.
     * @private
     * @param {number} radius - Current lens radius
     * @param {number} sizew - Container width
     * @param {number} sizeh - Container height
     */
    private setToolboxElm;
    first: boolean;
}
/**
 * LightSphereController creates an interactive sphere UI for light direction control.
 * Features:
 * - Circular interface with gradient background
 * - Pointer-based interaction for light direction
 * - Configurable size, position, and colors
 * - Minimum theta angle constraint
 * - Visual feedback with gradient and marker
 */
export class LightSphereController {
    /**
     * Creates a new LightSphereController instance.
     * @param {HTMLElement|string} parent - Parent element or selector where the controller will be mounted
     * @param {Object} [options] - Configuration options
     * @param {number} [options.width=128] - Width of the controller in pixels
     * @param {number} [options.height=128] - Height of the controller in pixels
     * @param {number} [options.top=60] - Top position offset in pixels
     * @param {number} [options.right=0] - Right position offset in pixels
     * @param {number} [options.thetaMin=0] - Minimum theta angle in degrees (constrains interaction radius)
     * @param {string} [options.colorSpot='#ffffff'] - Color of the central spot in the gradient
     * @param {string} [options.colorBkg='#0000ff'] - Color of the outer edge of the gradient
     * @param {string} [options.colorMark='#ff0000'] - Color of the position marker
     */
    constructor(parent: HTMLElement | string, options?: {
        width?: number;
        height?: number;
        top?: number;
        right?: number;
        thetaMin?: number;
        colorSpot?: string;
        colorBkg?: string;
        colorMark?: string;
    });
    parent: Element;
    layers: any[];
    lightDir: number[];
    containerElement: HTMLDivElement;
    dlCanvas: HTMLCanvasElement;
    dlCanvasCtx: CanvasRenderingContext2D;
    dlGradient: string;
    r: number;
    thetaMinRad: number;
    rmax: number;
    pointerDown: boolean;
    /**
     * Adds a layer to be controlled by this light sphere.
     * The layer must support light control operations.
     * @param {Layer} layer - Layer to be controlled
     */
    addLayer(l: any): void;
    /**
     * Makes the controller visible.
     * @returns {string} The visibility style value
     */
    show(): string;
    /**
     * Hides the controller.
     * @returns {string} The visibility style value
     */
    hide(): string;
    /**
     * Computes the radial gradient based on current light direction.
     * Creates a gradient that provides visual feedback about the light position.
     * @private
     */
    private computeGradient;
    /**
     * Handles interaction to update light direction.
     * Converts pointer position to light direction vector while respecting constraints.
     * @private
     * @param {number} x - X coordinate in canvas space
     * @param {number} y - Y coordinate in canvas space
     */
    private interactLightDir;
    /**
     * Draws the light direction selector UI.
     * Renders:
     * - Circular background with gradient
     * - Position marker at current light direction
     * @private
     * @param {number} x - X coordinate for position marker
     * @param {number} y - Y coordinate for position marker
     */
    private drawLightSelector;
}
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
export class MultispectralUI {
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
    constructor(layer: LayerMultispectral, options?: {
        containerId?: string;
        showPresets?: boolean;
        showSingleBand?: boolean;
        floatingPanel?: boolean;
    });
    layer: LayerMultispectral;
    options: {
        containerId: string;
        showPresets: boolean;
        showSingleBand: boolean;
        floatingPanel: boolean;
    };
    uiElements: {};
    /**
     * Initializes the UI components
     *
     * Sets up the container element, creates UI controls, and configures
     * event handling based on the provided options.
     *
     * @private
     */
    private initialize;
    container: HTMLElement;
    targetContainer: any;
    /**
     * Sets up window resize event handler to update panel positioning
     *
     * Ensures the UI panel remains properly positioned and sized when
     * the window or container is resized.
     *
     * @private
     */
    private setupResizeHandler;
    initialContainerRect: any;
    resizeHandler: any;
    /**
     * Creates header UI element with title and band information
     *
     * Displays the title and key information about the multispectral
     * dataset including band count and wavelength range.
     *
     * @private
     */
    private createHeader;
    /**
     * Creates preset selector UI element
     *
     * Provides a dropdown menu for selecting predefined Color Twist Weight
     * configurations from the available presets.
     *
     * @private
     */
    private createPresetSelector;
    /**
     * Creates single band visualization controls
     *
     * Provides controls for selecting a specific spectral band and
     * output channel for single-band visualization.
     *
     * @private
     */
    private createSingleBandControls;
    /**
     * Destroys UI and removes elements from DOM
     *
     * Cleans up all created UI elements and event listeners.
     * Call this method before removing the layer to prevent memory leaks.
     */
    destroy(): void;
}
/**
 * The `PointerManager` class serves as a central event manager that interprets raw pointer events
 * (like mouse clicks, touch gestures, or stylus inputs) into higher-level gestures. It abstracts
 * away the complexity of handling multiple input types and transforms them into common gestures
 * like taps, holds, panning (drag), and pinch-to-zoom, which are common in modern user interfaces.
 *
 * Key mechanisms:
 *
 * 1. **Event Handling and Gesture Recognition**:
 *    - `PointerManager` listens for low-level pointer events (such as `pointerdown`, `pointermove`,
 *      and `pointerup`) and converts them into higher-level gestures.
 *    - For example, a quick touch and release is interpreted as a "tap," while a sustained touch
 *      (greater than 600ms) is recognized as a "hold."
 *    - It handles both mouse and touch events uniformly, making it ideal for web applications that
 *      need to support diverse input devices (mouse, trackpad, touch screens).
 *
 * 2. **Multi-pointer Support**:
 *    - `PointerManager` supports multiple pointers simultaneously, making it capable of recognizing
 *      complex gestures involving more than one finger or pointer, such as pinch-to-zoom.
 *    - For multi-pointer gestures, it tracks each pointer's position and movement separately,
 *      allowing precise gesture handling.
 *
 * 3. **Idle Detection**:
 *    - The class includes idle detection mechanisms, which can trigger actions or events when no
 *      pointer activity is detected for a specified period. This can be useful for implementing
 *      user inactivity warnings or pausing certain interactive elements when the user is idle.
 *
 * 4. **Callback-based Gesture Management**:
 *    - The core of the `PointerManager` class revolves around registering and triggering callbacks
 *      for different gestures. Callbacks are provided by the user of this class for events like
 *      pan (`onPan`), pinch (`onPinch`), and others.
 *    - The class ensures that once a gesture starts, it monitors and triggers the appropriate
 *      callbacks, such as `panStart`, `panMove`, and `panEnd`, depending on the detected gesture.
 *
 * 5. **Buffer Management**:
 *    - The `PointerManager` class also includes a buffer system for managing and storing recent
 *      events, allowing the developer to enqueue, push, pop, or shift pointer data as needed.
 *      This can be helpful for applications that need to track the history of pointer events
 *      for gesture recognition or undo functionality.
 *
 * 6. **Error Handling**:
 *    - The class includes error handling to ensure that all required gesture handlers are defined
 *      by the user. For example, it will throw an error if any essential callback functions for
 *      pan or pinch gestures are missing, ensuring robust gesture management.
 *
 * Typical usage involves:
 * - Registering gesture handlers (e.g., for taps, panning, pinching).
 * - The class then monitors all pointer events and triggers the corresponding gesture callbacks
 *   when appropriate.
 *
 * Example:
 * ```js
 * const manager = new PointerManager();
 * manager.onPan({
 *   panStart: (e) => console.log('Pan started', e),
 *   panMove: (e) => console.log('Panning', e),
 *   panEnd: (e) => console.log('Pan ended', e),
 *   priority: 1
 * });
 * manager.onPinch({
 *   pinchStart: (e) => console.log('Pinch started', e),
 *   pinchMove: (e) => console.log('Pinching', e),
 *   pinchEnd: (e) => console.log('Pinch ended', e),
 *   priority: 1
 * });
 * ```
 *
 * In this example, `PointerManager` registers handlers for pan and pinch gestures, automatically
 * converting pointer events into the desired interactions. By abstracting the raw pointer events,
 * `PointerManager` allows developers to focus on handling higher-level gestures without worrying
 * about the underlying complexity.
* @fires PointerManager#fingerHover - Triggered when a pointer moves over a target.
* @fires PointerManager#fingerSingleTap - Triggered on a quick touch or click.
* @fires PointerManager#fingerDoubleTap - Triggered on two quick touches or clicks.
* @fires PointerManager#fingerHold - Triggered when a touch or click is held for more than 600ms.
* @fires PointerManager#mouseWheel - Triggered when the mouse wheel is rotated.
* @fires PointerManager#panStart - Triggered when a pan (drag) gesture begins.
* @fires PointerManager#panMove - Triggered during a pan gesture.
* @fires PointerManager#panEnd - Triggered when a pan gesture ends.
* @fires PointerManager#pinchStart - Triggered when a pinch gesture begins.
* @fires PointerManager#pinchMove - Triggered during a pinch gesture.
* @fires PointerManager#pinchEnd - Triggered when a pinch gesture ends.
*
*/
export class PointerManager {
    /**
     * Constant for targeting all pointers.
     * @type {number}
     * @readonly
     */
    static readonly get ANYPOINTER(): number;
    /**
     * Splits a string into an array based on whitespace.
     *
     * @param {string} str - The input string to split.
     * @returns {Array<string>} An array of strings split by whitespace.
     * @private
     */
    private static splitStr;
    /**
     * Calculates device pixels per millimeter.
     * @returns {number} Pixels per millimeter for current display
     * @private
     */
    private static getPixelsPerMM;
    /**
     * Creates a new PointerManager instance.
     * @param {HTMLElement} target - DOM element to attach event listeners to
     * @param {Object} [options] - Configuration options
     * @param {number} [options.pinchMaxInterval=100] - Maximum time (ms) between touches to trigger pinch
     * @param {number} [options.idleTime=60] - Seconds of inactivity before idle event
     */
    constructor(target: HTMLElement, options?: {
        pinchMaxInterval?: number;
        idleTime?: number;
    });
    target: HTMLElement;
    idleTimeout: NodeJS.Timeout;
    idling: boolean;
    currentPointers: any[];
    eventObservers: Map<any, any>;
    ppmm: number;
    /**
     * Registers event handlers.
     * @param {string} eventTypes - Space-separated list of event types
     * @param {Object|Function} obj - Handler object or function
     * @param {number} [idx=ANYPOINTER] - Pointer index to target, or ANYPOINTER for all
     * @returns {Object} Handler object
     */
    on(eventTypes: string, obj: any | Function, idx?: number): any;
    /**
     * Unregisters event handlers.
     * @param {string} eventTypes - Space-separated list of event types
     * @param {Object|Function} callback - Handler to remove
     * @param {number} [idx=ANYPOINTER] - Pointer index to target
     */
    off(eventTypes: string, callback: any | Function, idx?: number): void;
    /**
     * Registers a complete event handler with multiple callbacks.
     * @param {Object} handler - Handler object
     * @param {number} handler.priority - Handler priority (higher = earlier execution)
     * @param {Function} [handler.fingerHover] - Hover callback
     * @param {Function} [handler.fingerSingleTap] - Single tap callback
     * @param {Function} [handler.fingerDoubleTap] - Double tap callback
     * @param {Function} [handler.fingerHold] - Hold callback
     * @param {Function} [handler.mouseWheel] - Mouse wheel callback
     * @param {Function} [handler.panStart] - Pan start callback
     * @param {Function} [handler.panMove] - Pan move callback
     * @param {Function} [handler.panEnd] - Pan end callback
     * @param {Function} [handler.pinchStart] - Pinch start callback
     * @param {Function} [handler.pinchMove] - Pinch move callback
     * @param {Function} [handler.pinchEnd] - Pinch end callback
     * @throws {Error} If handler lacks priority or required callbacks
     */
    onEvent(handler: {
        priority: number;
        fingerHover?: Function;
        fingerSingleTap?: Function;
        fingerDoubleTap?: Function;
        fingerHold?: Function;
        mouseWheel?: Function;
        panStart?: Function;
        panMove?: Function;
        panEnd?: Function;
        pinchStart?: Function;
        pinchMove?: Function;
        pinchEnd?: Function;
    }): void;
    /**
     * Registers callbacks for pan gestures (start, move, and end).
     *
     * @param {Object} handler - The handler object containing pan gesture callbacks.
     * @param {function} handler.panStart - Callback function executed when the pan gesture starts.
     * @param {function} handler.panMove - Callback function executed during the pan gesture movement.
     * @param {function} handler.panEnd - Callback function executed when the pan gesture ends.
     * @throws {Error} Throws an error if any required callback functions (`panStart`, `panMove`, `panEnd`) are missing.
     */
    onPan(handler: {
        panStart: Function;
        panMove: Function;
        panEnd: Function;
    }): void;
    /**
     * Registers callbacks for pinch gestures (start, move, and end).
     *
     * @param {Object} handler - The handler object containing pinch gesture callbacks.
     * @param {function} handler.pinchStart - Callback function executed when the pinch gesture starts.
     * @param {function} handler.pinchMove - Callback function executed during the pinch gesture movement.
     * @param {function} handler.pinchEnd - Callback function executed when the pinch gesture ends.
     * @throws {Error} Throws an error if any required callback functions (`pinchStart`, `pinchMove`, `pinchEnd`) are missing.
     */
    onPinch(handler: {
        pinchStart: Function;
        pinchMove: Function;
        pinchEnd: Function;
    }): void;
    broadcastOn(eventType: any, obj: any): void;
    broadcastOff(eventTypes: any, obj: any): void;
    broadcast(e: any): void;
    addCurrPointer(cp: any): number;
    removeCurrPointer(index: any): void;
    startIdle(): void;
    handleEvent(e: any): void;
}
/**
* @typedef {('vec3'|'vec4'|'float')} Raster#Format
* Defines the color format for image data storage in textures and renderbuffers.
* @property {'vec3'} vec3 - RGB format (3 components without alpha)
* @property {'vec4'} vec4 - RGBA format (4 components with alpha)
* @property {'float'} float - Single-channel format for coefficient data
*/
/**
* Raster class handles image loading and texture creation for OpenLIME.
* Provides functionality for:
* - Loading images from URLs or blobs
* - Converting images to WebGL textures
* - Handling different color formats
* - Supporting partial content requests
* - Managing CORS requests
* - Creating mipmaps for large textures
*/
export class Raster {
    /**
     * Creates a new Raster instance.
     * @param {Object} [options] - Configuration options
     * @param {Raster#Format} [options.format='vec3'] - Color format for image data:
     *   - 'vec3' for RGB images
     *   - 'vec4' for RGBA images
     *   - 'float' for coefficient data
     */
    constructor(options?: any);
    _texture: WebGLTexture;
    /**
     * Loads an image tile and converts it to a WebGL texture.
     * Supports both full and partial content requests.
     * @async
     * @param {Object} tile - The tile to load
     * @param {string} tile.url - URL of the image
     * @param {number} [tile.start] - Start byte for partial requests
     * @param {number} [tile.end] - End byte for partial requests
     * @param {WebGLRenderingContext} gl - The WebGL rendering context
     * @returns {Promise<Array>} Promise resolving to [texture, size]:
     *   - texture: WebGLTexture object
     *   - size: Size of the image in bytes (width * height * components)
     * @throws {Error} If server doesn't support partial content requests when required
     */
    loadImage(tile: {
        url: string;
        start?: number;
        end?: number;
    }, gl: WebGLRenderingContext): Promise<any[]>;
    /**
     * Converts a Blob to an Image or ImageBitmap.
     * Handles browser-specific differences in image orientation.
     * @private
     * @async
     * @param {Blob} blob - Image data as Blob
     * @param {WebGLRenderingContext} gl - The WebGL rendering context
     * @returns {Promise<HTMLImageElement|ImageBitmap>} Promise resolving to the image
     */
    private blobToImage;
    /**
     * Creates a WebGL texture from an image.
     * Handles different color formats and automatically creates mipmaps for large textures.
     * @private
     * @param {WebGLRenderingContext} gl - The WebGL rendering context
     * @param {HTMLImageElement|ImageBitmap} img - The source image
     * @returns {WebGLTexture} The created texture
     *
     * @property {number} width - Width of the loaded image (set after loading)
     * @property {number} height - Height of the loaded image (set after loading)
     */
    private loadTexture;
    width: number;
    height: number;
}
/**
* @typedef {('r16f'|'rg16f'|'rgb16f'|'rgba16f'|'r16ui'|'rg16ui'|'rgb16ui'|'rgba16ui'|'r16i'|'rg16i'|'rgb16i'|'rgba16i'|'depth16')} Raster16Bit#Format
* Defines the 16-bit format for image data storage in textures.
* @property {'r16f'} r16f - Single-channel 16-bit floating point format
* @property {'rg16f'} rg16f - Two-channel 16-bit floating point format
* @property {'rgb16f'} rgb16f - Three-channel 16-bit floating point format
* @property {'rgba16f'} rgba16f - Four-channel 16-bit floating point format
* @property {'r16ui'} r16ui - Single-channel 16-bit unsigned integer format
* @property {'rg16ui'} rg16ui - Two-channel 16-bit unsigned integer format
* @property {'rgb16ui'} rgb16ui - Three-channel 16-bit unsigned integer format
* @property {'rgba16ui'} rgba16ui - Four-channel 16-bit unsigned integer format
* @property {'r16i'} r16i - Single-channel 16-bit signed integer format
* @property {'rg16i'} rg16i - Two-channel 16-bit signed integer format
* @property {'rgb16i'} rgb16i - Three-channel 16-bit signed integer format
* @property {'rgba16i'} rgba16i - Four-channel 16-bit signed integer format
* @property {'depth16'} depth16 - 16-bit depth texture format
*/
/**
* @typedef {Function} DataLoaderCallback
* @param {Object} tile - The tile information object
* @param {WebGL2RenderingContext} gl - The WebGL2 rendering context
* @param {Object} options - Additional options for the data loader
* @returns {Promise<Object>} The loaded data object with properties:
*   - data: TypedArray or Image data
*   - width: Width of the image
*   - height: Height of the image
*   - channels: Number of channels in the data
*/
/**
* Raster16Bit class extends Raster to handle 16-bit textures with WebGL 2.0.
* Provides functionality for:
* - Loading 16-bit images from URLs or blobs via custom data loaders
* - Converting data to appropriate WebGL 2.0 texture formats
* - Supporting various 16-bit formats (float, int, uint)
* - Creating appropriate texture parameters for 16-bit data
* - Support for custom data loaders for specialized formats
*/
export class Raster16Bit extends Raster {
    /**
     * Gets the number of components for the current format
     * @private
     * @returns {number} Number of components (1, 2, 3, or 4)
     */
    private _getComponentCount;
    /**
     * Loads a 16-bit image tile and converts it to a WebGL texture.
     * Overrides parent method to handle 16-bit specific formats.
     * @async
     * @param {Object} tile - The tile to load
     * @param {string} tile.url - URL of the image
     * @param {number} [tile.start] - Start byte for partial requests
     * @param {number} [tile.end] - End byte for partial requests
     * @param {WebGL2RenderingContext} gl - The WebGL2 rendering context
     * @returns {Promise<Array>} Promise resolving to [texture, size]:
     *   - texture: WebGLTexture object
     *   - size: Size of the image in bytes (width * height * components * bytesPerComponent)
     * @throws {Error} If context is not WebGL2
     */
    loadImage(tile: {
        url: string;
        start?: number;
        end?: number;
    }, gl: WebGL2RenderingContext): Promise<any[]>;
    getStatInfo(): any;
    /**
     * Creates a WebGL2 texture from raw data.
     * @private
     * @param {WebGL2RenderingContext} gl - The WebGL2 rendering context
     * @param {TypedArray} data - The raw pixel data
     * @param {number} width - Width of the image
     * @param {number} height - Height of the image
     * @param {number} channels - Number of channels in the data
     * @returns {WebGLTexture} The created texture
     */
    private _createTextureFromData;
    /**
     * Get format parameters for WebGL texture creation based on format and channels.
     * @private
     * @param {WebGL2RenderingContext} gl - The WebGL2 rendering context
     * @param {number} channels - Number of channels in the data
     * @returns {Object} Object with internalFormat, format, and type properties
     */
    private _getFormatParameters;
    /**
   * Checks if the specified format is supported by the browser.
   * Also verifies that required WebGL extensions are available.
   * @private
   * @param {string} format - The format to check
   * @returns {boolean} True if the format is supported, false otherwise
   */
    private _isFormatSupported;
}
/**
 * * Defines rendering modes for lens and background areas.
 */
export type RenderingMode = string;
export namespace RenderingMode {
    let draw: string;
    let hide: string;
}
/**
 * @fileoverview
 * Ruler module provides measurement functionality for the OpenLIME viewer.
 * Allows users to measure distances in the scene with an interactive ruler tool.
 * Extends the Units class to handle unit conversions and formatting.
 *
 * Ruler class creates an interactive measurement tool for the OpenLIME viewer.
 * Features:
 * - Interactive distance measurement
 * - SVG-based visualization
 * - Scale-aware display
 * - Multiple measurement history
 * - Touch and mouse support
 *
 * @extends Units
 */
export class Ruler extends Units {
    /**
     * Creates a new Ruler instance.
     * @param {Viewer} viewer - The OpenLIME viewer instance
     * @param {number} pixelSize - Size of a pixel in real-world units
     * @param {Object} [options] - Configuration options
     * @param {boolean} [options.enabled=false] - Whether the ruler is initially enabled
     * @param {number} [options.priority=100] - Event handling priority
     * @param {number} [options.fontSize=18] - Font size for measurements in pixels
     * @param {number} [options.markerSize=8] - Size of measurement markers in pixels
     * @param {string} [options.cursor='crosshair'] - Cursor style when ruler is active
     */
    constructor(viewer: Viewer, pixelSize: number, options?: {
        enabled?: boolean;
        priority?: number;
        fontSize?: number;
        markerSize?: number;
        cursor?: string;
    });
    /**
     * Activates the ruler tool.
     * Creates SVG elements if needed and sets up event listeners.
     * Changes cursor to indicate tool is active.
     */
    start(): void;
    enabled: boolean;
    previousCursor: any;
    svg: SVGElement;
    svgGroup: SVGGElement;
    /**
     * Deactivates the ruler tool.
     * Restores original cursor and clears current measurement.
     */
    end(): void;
    /**
     * Clears all measurements.
     * Removes all SVG elements and resets measurement history.
     */
    clear(): void;
    measure: any;
    history: any[];
    /**
     * Updates the visual representation of all measurements.
     * Handles camera transformations and viewport changes.
     * @private
     */
    private update;
    /**
     * Creates a marker SVG element.
     * @private
     * @param {number} x - X coordinate in scene space
     * @param {number} y - Y coordinate in scene space
     * @returns {SVGElement} The created marker element
     */
    private createMarker;
    /**
     * Updates a marker's position and size.
     * @private
     * @param {SVGElement} marker - The marker to update
     * @param {number} x - X coordinate in scene space
     * @param {number} y - Y coordinate in scene space
     * @param {number} size - Marker size in pixels
     */
    private updateMarker;
    /**
     * Updates measurement text display.
     * Handles text positioning and scaling based on camera transform.
     * @private
     * @param {Object} measure - The measurement object to update
     * @param {number} fontsize - Font size in pixels
     */
    private updateText;
    /**
     * Creates a new measurement.
     * Sets up SVG elements for line, markers, and text.
     * @private
     * @param {number} x - Initial X coordinate
     * @param {number} y - Initial Y coordinate
     * @returns {Object} Measurement object containing all SVG elements and coordinates
     */
    private createMeasure;
    /**
     * Updates a measurement's visual elements.
     * @private
     * @param {Object} measure - The measurement to update
     * @param {Transform} transform - Current camera transform
     */
    private updateMeasure;
    /**
     * Handles single tap/click events.
     * Creates or completes measurements.
     * @private
     * @param {Event} e - The pointer event
     * @returns {boolean} Whether the event was handled
     */
    private fingerSingleTap;
    /**
     * Handles hover/move events.
     * Updates the current measurement endpoint.
     * @private
     * @param {Event} e - The pointer event
     * @returns {boolean} Whether the event was handled
     */
    private fingerHover;
}
/**
 * ScaleBar class creates a visual scale bar that updates with viewer zoom level.
 * Features:
 * - Automatic scale adjustment based on zoom
 * - Smart unit selection
 * - SVG-based visualization
 * - Configurable size and appearance
 * @extends Units
 */
export class ScaleBar extends Units {
    /**
     * Creates a new ScaleBar instance.
     * @param {number} pixelSize - Size of a pixel in real-world units (in mm)
     * @param {Viewer} viewer - The OpenLIME viewer instance
     * @param {Object} [options] - Configuration options
     * @param {number} [options.width=200] - Width of the scale bar in pixels
     * @param {number} [options.fontSize=24] - Font size for scale text in pixels
     * @param {number} [options.precision=0] - Number of decimal places for scale values
     *
     * @property {SVGElement} svg - Main SVG container element
     * @property {SVGElement} line - Scale bar line element
     * @property {SVGElement} text - Scale text element
     * @property {number} lastScaleZoom - Last zoom level where scale was updated
     */
    constructor(pixelSize: number, viewer: Viewer, options?: {
        width?: number;
        fontSize?: number;
        precision?: number;
    });
    svg: SVGElement;
    line: SVGElement;
    text: SVGElement;
    /**
     * Updates the scale bar based on current zoom level.
     * Called automatically on viewer draw events.
     * @private
     */
    private updateScale;
    lastScaleZoom: any;
    /**
     * Calculates the best scale length and label value for current zoom.
     * Tries to find a "nice" round number that fits within the given constraints.
     * @private
     * @param {number} min - Minimum desired length in pixels
     * @param {number} max - Maximum desired length in pixels
     * @param {number} pixelSize - Size of a pixel in real-world units
     * @param {number} zoom - Current zoom level
     * @returns {Object} Scale information
     * @returns {number} .length - Length of scale bar in pixels
     * @returns {number} .label - Value to display (in real-world units)
     */
    private bestLength;
}
/**
* @typedef {Object} Shader~Sampler
* A reference to a 2D texture used in the shader.
* @property {number} id - Unique identifier for the sampler
* @property {string} name - Sampler variable name in shader program (e.g., "kd" for diffuse texture)
* @property {string} label - Display label for UI/menus
* @property {Array<Object>} samplers - Array of raster definitions
* @property {number} samplers[].id - Raster identifier
* @property {string} samplers[].type - Raster type (e.g., 'color', 'normal')
* @property {boolean} [samplers[].bind=true] - Whether sampler should be bound in prepareGL
* @property {boolean} [samplers[].load=true] - Whether sampler should load from raster
* @property {Array<Object>} uniforms - Shader uniform variables
* @property {string} uniforms[].type - Data type ('vec4'|'vec3'|'vec2'|'float'|'int')
* @property {boolean} uniforms[].needsUpdate - Whether uniform needs GPU update
* @property {number} uniforms[].value - Uniform value or array of values
*/
/**
 * Shader module provides WebGL shader program management for OpenLIME.
 * Supports WebGL 2.0/3.0 GLSL specifications.
 *
 * Shader class manages WebGL shader programs.
 * Features:
 * - GLSL/ES 3.0 support
 * - Automatic uniform management
 * - Multiple shader modes
 * - Filter pipeline
 */
export class Shader {
    /**
     * Creates a new Shader instance.
     * @param {Object} [options] - Configuration options
     * @param {Array<Shader~Sampler>} [options.samplers=[]] - Texture sampler definitions
     * @param {Object.<string,Object>} [options.uniforms={}] - Shader uniform variables
     * @param {string} [options.label=null] - Display label for the shader
     * @param {Array<string>} [options.modes=[]] - Available shader modes
     * @param {boolean} [options.debug=false] - Enable debug output
     * @param {boolean} [options.isLinear=false] - Whether the shader works in linear color space
     * @param {boolean} [options.isSrgbSimplified=true] - Use simplified gamma 2.2 conversion instead of IEC standard
     * @fires Shader#update
     */
    constructor(options?: any);
    filters: any[];
    /**
     * Clears all filters from the shader pipeline.
     * @fires Shader#update
     */
    clearFilters(): void;
    needsUpdate: boolean;
    /**
     * Adds a filter to the shader pipeline.
     * @param {Object} filter - Filter to add
     * @fires Shader#update
     */
    addFilter(f: any): void;
    /**
     * Removes a filter from the pipeline by name.
     * @param {string} name - Name of filter to remove
     * @fires Shader#update
     */
    removeFilter(name: string): void;
    /**
     * Sets the current shader mode.
     * @param {string} mode - Mode identifier (must be in options.modes)
     * @throws {Error} If mode is not recognized
     */
    setMode(mode: string): void;
    mode: string;
    /**
     * Restores WebGL state after context loss.
     * @param {WebGL2RenderingContext} gl - WebGL2 context
     * @private
     */
    private restoreWebGL;
    /**
     * Sets tile dimensions for shader calculations.
     * @param {number[]} size - [width, height] of tile in pixels
     * @fires Shader#update
     */
    setTileSize(sz: any): void;
    tileSize: any;
    /**
     * Sets a uniform variable value.
     * @param {string} name - Uniform variable name
     * @param {number|boolean|Array} value - Value to set
     * @throws {Error} If uniform doesn't exist
     * @fires Shader#update
     */
    setUniform(name: string, value: number | boolean | any[]): void;
    /**
     * Builds complete fragment shader source with all necessary components.
     * Includes GLSL version, precision statements, conversion functions,
     * and incorporates filters.
     * @param {WebGL2RenderingContext} gl - WebGL2 context
     * @returns {string} Complete fragment shader source code
     * @private
     */
    private completeFragShaderSrc;
    /**
     * Creates the WebGL shader program.
     * @param {WebGL2RenderingContext} gl - WebGL2 context
     * @private
     * @throws {Error} If shader compilation or linking fails
     */
    private createProgram;
    coordattrib: number;
    texattrib: number;
    matrixlocation: WebGLUniformLocation;
    program: WebGLProgram;
    /**
     * Gets a uniform variable by name.
     * Searches both shader uniforms and filter uniforms.
     * @param {string} name - Uniform variable name
     * @returns {Object|undefined} Uniform object if found
     */
    getUniform(name: string): any | undefined;
    /**
     * Returns all uniform variables associated with the shader and its filters.
     * Combines uniforms from both the base shader and all active filters into a single object.
     * @returns {Object.<string, Object>} Combined uniform variables
     */
    allUniforms(): {
        [x: string]: any;
    };
    /**
     * Updates all uniform values in the GPU.
     * @param {WebGL2RenderingContext} gl - WebGL2 context
     * @private
     */
    private updateUniforms;
    /**
     * Gets vertex shader source code.
     * Default implementation provides basic vertex transformation and texture coordinate passing.
     * @param {WebGL2RenderingContext} gl - WebGL2 context
     * @returns {string} Vertex shader source code
     */
    vertShaderSrc(gl: WebGL2RenderingContext): string;
    /**
     * Gets fragment shader source code.
     * Must be overridden in derived classes for custom shading.
     * @returns {string} Fragment shader source code
     * @virtual
     */
    fragShaderSrc(): string;
}
/**
 * ShaderAnisotropicDiffusion extends the base Shader class to implement
 * a Perona-Malik anisotropic diffusion filter to enhance inscriptions
 * on metal surfaces based on normal maps.
 *
 * This filter preserves and enhances edges while smoothing other areas,
 * making it ideal for revealing inscriptions on uneven surfaces.
 */
export class ShaderAnisotropicDiffusion extends Shader {
    /**
     * Creates a new Anisotropic Diffusion Shader instance.
     * @param {Object} [options] - Configuration options passed to parent Shader
     * @param {number} [options.kappa=15.0] - Diffusion conductance parameter
     * @param {number} [options.iterations=3] - Number of diffusion iterations
     * @param {number} [options.lambda=0.25] - Diffusion rate (0.0-0.25 for stability)
     * @param {number} [options.normalStrength=1.0] - Normal contribution strength
     */
    constructor(options?: {
        kappa?: number;
        iterations?: number;
        lambda?: number;
        normalStrength?: number;
    });
    /**
     * Override fragment shader source to implement anisotropic diffusion.
     * This version is compatible with WebGL 2.0+.
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} Fragment shader source code
     */
    fragShaderSrc(gl: WebGLRenderingContext): string;
    /**
     * Sets the kappa parameter which controls edge sensitivity.
     * Higher values preserve fewer edges.
     * @param {number} value - Kappa value (typically 5-50)
     */
    setKappa(value: number): void;
    /**
     * Sets the number of diffusion iterations.
     * More iterations produce smoother results but take longer to compute.
     * @param {number} value - Number of iterations (typically 1-10)
     */
    setIterations(value: number): void;
    /**
     * Sets the lambda parameter which controls diffusion rate.
     * Should be between 0.0 and 0.25 for numerical stability.
     * @param {number} value - Lambda value (0.0-0.25)
     */
    setLambda(value: number): void;
    /**
     * Sets the normal strength parameter which controls how much
     * the normal map information influences the final result.
     * @param {number} value - Normal strength multiplier
     */
    setNormalStrength(value: number): void;
}
/**
 * A shader class implementing various BRDF (Bidirectional Reflectance Distribution Function) rendering modes.
 * Extends the base Shader class to provide specialized material rendering capabilities.
 *
 * Shader Features:
 * - Implements the Ward BRDF model for physically-based rendering
 * - Supports both directional and spot lights
 * - Handles normal mapping for more detailed surface rendering
 * - Supports different color spaces (linear and sRGB) for input textures
 * - Multiple visualization modes for material analysis (diffuse, specular, normals, monochrome, etc.)
 * - Configurable surface roughness range for varying material appearance
 * - Ambient light contribution to simulate indirect light
 *
 * Required Textures:
 * - uTexKd: Diffuse color texture (optional)
 * - uTexKs: Specular color texture (optional)
 * - uTexNormals: Normal map for surface detail
 * - uTexGloss: Glossiness map (optional)
 *
 * @example
 * // Create a basic BRDF shader with default settings
 * const shader = new ShaderBRDF({});
 *
 * @example
 * // Create a BRDF shader with custom settings
 * const shader = new ShaderBRDF({
 *   mode: 'color',
 *   colorspaces: { kd: 'sRGB', ks: 'linear' },
 *   brightness: 1.2,
 *   gamma: 2.2,
 *   alphaLimits: [0.05, 0.4],
 *   kAmbient: 0.03
 * });
 *
 * @extends Shader
 */
export class ShaderBRDF extends Shader {
    /**
     * Creates a new ShaderBRDF instance.
     * @param {Object} [options={}] - Configuration options for the shader.
     * @param {string} [options.mode='color'] - Rendering mode to use:
     *   - 'color': Full BRDF rendering using Ward model with ambient light
     *   - 'diffuse': Shows only diffuse component (kd)
     *   - 'specular': Shows only specular component (ks * spec * NdotL)
     *   - 'normals': Visualizes surface normals
     *   - 'monochrome': Renders using a single material color with diffuse lighting
     * @param {Object} [options.colorspaces] - Color space configurations.
     * @param {string} [options.colorspaces.kd='sRGB'] - Color space for diffuse texture ('linear' or 'sRGB').
     * @param {string} [options.colorspaces.ks='linear'] - Color space for specular texture ('linear' or 'sRGB').
     * @param {number} [options.brightness=1.0] - Overall brightness multiplier.
     * @param {number} [options.gamma=2.2] - Gamma correction value.
     * @param {number[]} [options.alphaLimits=[0.01, 0.5]] - Range for surface roughness [min, max].
     * @param {number[]} [options.monochromeMaterial=[0.80, 0.79, 0.75]] - RGB color for monochrome mode.
     * @param {number} [options.kAmbient=0.02] - Ambient light coefficient.
     *
     */
    constructor(options?: {
        mode?: string;
        colorspaces?: {
            kd?: string;
            ks?: string;
        };
        brightness?: number;
        gamma?: number;
        alphaLimits?: number[];
        monochromeMaterial?: number[];
        kAmbient?: number;
    });
    modes: string[];
    uniforms: {
        uLightInfo: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number[];
        };
        uAlphaLimits: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number[];
        };
        uBrightnessGamma: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number[];
        };
        uInputColorSpaceKd: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number;
        };
        uInputColorSpaceKs: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number;
        };
        uMonochromeMaterial: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number[];
        };
        uKAmbient: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number;
        };
    };
    innerCode: string;
    /**
     * Sets the light properties for the shader.
     *
     * @param {number[]} light - 4D vector containing light information
     * @param {number} light[0] - X coordinate of light position/direction
     * @param {number} light[1] - Y coordinate of light position/direction
     * @param {number} light[2] - Z coordinate of light position/direction
     * @param {number} light[3] - Light type flag (0 for directional, 1 for spot)
     */
    setLight(light: number[]): void;
    /**
     * Generates the fragment shader source code based on current configuration.
     *
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - The WebGL context
     * @returns {string} The complete fragment shader source code
     * @private
     */
    private fragShaderSrc;
}
/**
 * @typedef {Object} ShaderCombiner~Operation
 * A shader operation that combines two textures.
 * @property {string} first - Assigns first texture as output (cout = c1)
 * @property {string} second - Assigns second texture as output (cout = c2)
 * @property {string} mean - Calculates average of textures (cout = (c1 + c2)/2.0)
 * @property {string} diff - Calculates difference between textures (cout = c2.rgb - c1.rgb)
 */
/**
 * Fired when shader combination mode changes.
 * @event ShaderCombiner#update
 * @type {Object}
 * @property {string} mode - New combination mode
 * @property {string} previousMode - Previous combination mode
 */
/**
 * ShaderCombiner module provides texture combination operations for OpenLIME.
 * Supports WebGL 2.0+ GLSL specifications with automatic version detection.
 *
 * ShaderCombiner class manages the combination of two input textures using various operations.
 * Features:
 * - Multiple combination modes (first, second, mean, diff)
 * - Automatic texture sampling
 * - WebGL 2.0+
 * - Alpha channel preservation
 *
 * @extends Shader
 */
export class ShaderCombiner extends Shader {
    /**
     * Creates a new ShaderCombiner instance.
     * @param {Object} [options] - Configuration options
     * @param {string} [options.mode='mean'] - Combination mode to use
     * @param {Array<Object>} [options.samplers] - Texture sampler definitions (inherited from Shader)
     * @param {Object} [options.uniforms] - Shader uniform variables (inherited from Shader)
     * @param {string} [options.label] - Display label for the shader (inherited from Shader)
     * @param {boolean} [options.debug] - Enable debug output (inherited from Shader)
     * @fires Shader#update
     */
    constructor(options?: {
        mode?: string;
        samplers?: Array<any>;
        uniforms?: any;
        label?: string;
        debug?: boolean;
    });
    samplers: {
        id: number;
        name: string;
        type: string;
    }[];
    modes: string[];
    operations: {
        first: string;
        second: string;
        mean: string;
        diff: string;
    };
    /**
     * Gets fragment shader source code.
     * Implements texture combination operations.
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} Fragment shader source code
     * @private
     */
    private fragShaderSrc;
    /**
     * Gets vertex shader source code.
     * Provides basic vertex transformation and texture coordinate passing.
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} Vertex shader source code
     * @private
     */
    private vertShaderSrc;
}
/**
 * ShaderEdgeDetection extends the base Shader class to implement
 * a Sobel edge detection filter on input textures.
 *
 * The shader detects edges by calculating gradients in both
 * horizontal and vertical directions using Sobel operators.
 */
export class ShaderEdgeDetection extends Shader {
    /**
     * Creates a new EdgeDetectionShader instance.
     * @param {Object} [options] - Configuration options passed to parent Shader
     * @param {number} [options.threshold=0.1] - Edge detection threshold (0.0-1.0)
     * @param {boolean} [options.colorEdges=false] - Whether to preserve edge colors
     */
    constructor(options?: {
        threshold?: number;
        colorEdges?: boolean;
    });
    /**
     * Override fragment shader source to implement edge detection.
     * This version is compatible with WebGL 2.0+.
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} Fragment shader source code
     */
    fragShaderSrc(gl: WebGLRenderingContext): string;
    /**
     * Sets the edge detection threshold.
     * @param {number} value - Threshold value (0.0-1.0)
     */
    setThreshold(value: number): void;
    /**
     * Toggles colored edges mode.
     * @param {boolean} enabled - Whether to preserve edge colors
     */
    setColorEdges(enabled: boolean): void;
}
/**
 * @typedef {Object} ShaderFilter~Mode
 * A shader filter mode configuration
 * @property {string} id - Unique identifier for the mode
 * @property {boolean} enable - Whether the mode is active
 * @property {string} src - GLSL source code for the mode
 */
/**
 * @typedef {Object} ShaderFilter~Sampler
 * A texture sampler used by the filter
 * @property {string} name - Unique name for the sampler
 * @property {WebGLTexture} [texture] - Associated WebGL texture
 * @property {WebGLUniformLocation} [location] - GPU location for the sampler
 */
/**
 *
 * Base class for WebGL shader filters in OpenLIME.
 * Provides infrastructure for creating modular shader effects that can be chained together.
 *
 * Features:
 * - Modular filter architecture
 * - Automatic uniform management
 * - Dynamic mode switching
 * - Texture sampling support
 * - GLSL code generation
 * - Unique naming conventions
 *
 * Technical Implementation:
 * - Generates unique names for uniforms and samplers
 * - Manages WebGL resource lifecycle
 * - Supports multiple filter modes
 * - Handles shader program integration
 */
export class ShaderFilter {
    /**
     * Creates a new shader filter
     * @param {Object} [options] - Filter configuration
     * @param {ShaderFilter~Mode} [options.modes={}] - Available filter modes
     * @param {Object} [options.uniforms={}] - Filter uniform variables
     * @param {Array<ShaderFilter~Sampler>} [options.samplers=[]] - Texture samplers
     */
    constructor(options?: any);
    name: string;
    uniforms: {};
    samplers: any[];
    needsUpdate: boolean;
    shader: any;
    modes: {};
    /**
     * Sets the active mode for the filter
     * @param {string} mode - Mode category to modify
     * @param {string} id - Specific mode ID to enable
     * @throws {Error} If shader not registered or mode doesn't exist
     */
    setMode(mode: string, id: string): void;
    /**
     * Prepares filter resources for rendering
     * @param {WebGLRenderingContext} gl - WebGL context
     * @private
     */
    private prepare;
    /**
     * Generates mode-specific GLSL code
     * @returns {string} GLSL declarations for enabled modes
     * @private
     */
    private fragModeSrc;
    /**
     * Sets a uniform variable value
     * @param {string} name - Base name of uniform variable
     * @param {number|boolean|Array} value - Value to set
     * @throws {Error} If shader not registered
     */
    setUniform(name: string, value: number | boolean | any[]): void;
    /**
     * Generates sampler declarations
     * @returns {string} GLSL sampler declarations
     * @private
     */
    private fragSamplerSrc;
    /**
     * Generates uniform variable declarations
     * @returns {string} GLSL uniform declarations
     * @private
     */
    private fragUniformSrc;
    /**
     * Generates filter-specific GLSL function
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string|null} GLSL function definition
     * @virtual
     */
    fragDataSrc(gl: WebGLRenderingContext): string | null;
    /**
     * @returns {string} Generated function name for the filter
     * @private
     */
    private functionName;
    /**
     * @param {string} name - Base sampler name
     * @returns {string} Unique sampler identifier
     * @private
     */
    private samplerName;
    /**
     * @param {string} name - Base uniform name
     * @returns {string} Unique uniform identifier
     * @private
     */
    private uniformName;
    /**
     * @param {string} name - Base mode name
     * @returns {string} Unique mode identifier
     * @private
     */
    private modeName;
    /**
     * Finds a sampler by name
     * @param {string} name - Base sampler name
     * @returns {ShaderFilter~Sampler|undefined} Found sampler or undefined
     */
    getSampler(name: string): ShaderFilter;
}
/**
 *
 * @extends ShaderFilter
 * Filter that adjusts the brightness of rendered content
 */
export class ShaderFilterBrightness extends ShaderFilter {
    /**
     * Creates a brightness filter
     * @param {Object} [options] - Filter options
     * @param {number} [options.brightness=1.0] - Brightness value (0.0-2.0, where 1.0 is normal brightness)
     */
    constructor(options?: {
        brightness?: number;
    });
    fragDataSrc(gl: any): string;
    /**
     * Sets the brightness level
     * @param {number} value - Brightness value (0.0-2.0)
     */
    setBrightness(value: number): void;
    /**
     * Switches between brightness adjustment methods
     * @param {string} method - Either 'linear' or 'preserve_saturation'
     */
    setBrightnessMethod(method: string): void;
}
/**
 * @typedef {Object} ShaderFilterColormap~Options
 * Configuration options for colormap filter
 * @property {number[]} [inDomain=[]] - Input value range [min, max] for mapping
 * @property {number[]} [channelWeights=[1/3, 1/3, 1/3]] - RGB channel weights for grayscale conversion
 * @property {number} [maxSteps=256] - Number of discrete steps in the colormap texture
 */
/**
 *
 * @extends ShaderFilter
 * ShaderFilterColormap implements color mapping and visualization techniques.
 * Maps input RGB values to a specified colormap using customizable transfer functions.
 *
 * Features:
 * - Custom colormap support
 * - Configurable input domain mapping
 * - Channel-weighted grayscale conversion
 * - Interpolated or discrete color mapping
 * - Out-of-range color handling
 * - GPU-accelerated processing
 *
 * Technical Implementation:
 * - Uses 1D texture for colormap lookup
 * - Supports linear and nearest-neighbor interpolation
 * - Handles domain scaling and bias
 * - Configurable channel weight mixing
 * - WebGL 2.0+
 */
export class ShaderFilterColormap extends ShaderFilter {
    /**
     * Creates a new colormap filter
     * @param {ColorScale} colorscale - Colorscale object defining the mapping
     * @param {ShaderFilterColormap~Options} [options] - Configuration options
     * @param {number[]} [options.inDomain=[]] - Input domain range [min, max]
     * @param {number[]} [options.channelWeights=[1/3, 1/3, 1/3]] - RGB channel weights
     * @param {number} [options.maxSteps=256] - Colormap resolution
     * @throws {Error} If inDomain is invalid (length !== 2 or min >= max)
     *
     * @example
     * ```javascript
     * // Create with custom domain and weights
     * const filter = new ShaderFilterColormap(colorscale, {
     *     inDomain: [0, 100],
     *     channelWeights: [0.2126, 0.7152, 0.0722], // Perceptual weights
     *     maxSteps: 512
     * });
     * ```
     */
    constructor(colorscale: ColorScale, options: any);
    colorscale: ColorScale;
    inDomain: any;
    samplers: {
        name: string;
    }[];
    /**
     * Creates the colormap texture in WebGL.
     * Samples colorscale at specified resolution,
     * creates 1D RGBA texture, configures texture filtering,
     * and associates texture with sampler.
     *
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {Promise<void>}
     * @private
     */
    private createTextures;
}
/**
 *
 * @extends ShaderFilter
 * Filter that converts colors to grayscale with adjustable weights
 */
export class ShaderFilterGrayscale extends ShaderFilter {
    /**
     * Creates a grayscale filter
     * @param {Object} [options] - Filter options
     * @param {number[]} [options.weights=[0.2126, 0.7152, 0.0722]] - RGB channel weights for luminance calculation
     */
    constructor(options?: {
        weights?: number[];
    });
    fragDataSrc(gl: any): string;
    /**
     * Switches between grayscale calculation methods
     * @param {string} method - Either 'luminance' or 'average'
     */
    setGrayscaleMethod(method: string): void;
}
/**
 *
 * @extends ShaderFilter
 * Filter that modifies the opacity of rendered content
 */
export class ShaderFilterOpacity extends ShaderFilter {
    /**
     * Creates an opacity filter
     * @param {number} opacity - Initial opacity value [0-1]
     * @param {Object} [options] - Additional filter options
     */
    constructor(opacity: number, options?: any);
    fragDataSrc(gl: any): string;
}
/**
 *
 * @extends ShaderFilter
 * Test filter that replaces transparent pixels with a specified color
 */
export class ShaderFilterTest extends ShaderFilter {
    /**
     * Creates a test filter
     * @param {Object} [options] - Filter options
     * @param {number[]} [options.nodata_col=[1,1,0,1]] - Color for transparent pixels
     */
    constructor(options?: {
        nodata_col?: number[];
    });
    fragDataSrc(gl: any): string;
}
/**
 * @typedef {Object} ShaderFilterVector~Options
 * Configuration options for vector field visualization
 * @property {number[]} [inDomain=[]] - Input value range [min, max] for magnitude mapping
 * @property {number} [maxSteps=256] - Number of discrete steps in the colormap texture
 * @property {number[]} [arrowColor=[0.0, 0.0, 0.0, 1.0]] - RGBA color for arrows when using 'col' mode
 */
/**
 * @typedef {Object} ShaderFilterVector~Modes
 * Available visualization modes
 * @property {string} normalize - Arrow normalization ('on'|'off')
 * @property {string} arrow - Arrow coloring mode ('mag'|'col')
 * @property {string} field - Background field visualization ('none'|'mag')
 */
/**
 *
 * ShaderFilterVector implements 2D vector field visualization techniques.
 * Based on techniques from "2D vector field visualization by Morgan McGuire"
 * and enhanced by Matthias Reitinger.
 *
 * Features:
 * - Arrow-based vector field visualization
 * - Magnitude-based or custom arrow coloring
 * - Optional vector normalization
 * - Background field visualization
 * - Customizable arrow appearance
 * - Smooth interpolation
 *
 * Technical Implementation:
 * - Tile-based arrow rendering
 * - Signed distance field for arrow shapes
 * - Dynamic magnitude scaling
 * - Colormap-based magnitude visualization
 * - WebGL 2.0+
 *
 * Example usage:
 * ```javascript
 * // Basic usage with default options
 * const vectorField = new ShaderFilterVector(myColorScale);
 * shader.addFilter(vectorField);
 *
 * // Configure visualization modes
 * vectorField.setMode('normalize', 'on');  // Normalize arrow lengths
 * vectorField.setMode('arrow', 'col');     // Use custom arrow color
 * vectorField.setMode('field', 'mag');     // Show magnitude field
 * ```
 *
 * Advanced usage with custom configuration:
 * ```javascript
 * const vectorField = new ShaderFilterVector(colorscale, {
 *     inDomain: [-10, 10],         // Vector magnitude range
 *     maxSteps: 512,               // Higher colormap resolution
 *     arrowColor: [1, 0, 0, 1]     // Red arrows
 * });
 *
 * // Add to shader pipeline
 * shader.addFilter(vectorField);
 * ```
 *
 * GLSL Implementation Details
 *
 * Key Components:
 * 1. Arrow Generation:
 *    - Tile-based positioning
 *    - Shaft and head construction
 *    - Size and direction control
 *
 * 2. Distance Functions:
 *    - line3(): Distance to line segment
 *    - line(): Signed distance to line
 *    - arrow(): Complete arrow shape
 *
 * 3. Color Processing:
 *    - Vector magnitude computation
 *    - Colormap lookup
 *    - Mode-based blending
 *
 * Constants:
 * - ARROW_TILE_SIZE: Spacing between arrows (16.0)
 * - ISQRT2: 1/sqrt(2) for magnitude normalization
 *
 * Uniforms:
 * - {vec4} arrow_color - Custom arrow color
 * - {vec4} low_color - Color for values below range
 * - {vec4} high_color - Color for values above range
 * - {float} scale - Magnitude scaling factor
 * - {float} bias - Magnitude offset
 * - {sampler2D} colormap - Magnitude colormap texture
 *
 * @extends ShaderFilter
 */
export class ShaderFilterVector extends ShaderFilter {
    /**
     * Creates a new vector field visualization filter
     * @param {ColorScale} colorscale - Colorscale for magnitude mapping
     * @param {ShaderFilterVector~Options} [options] - Configuration options
     * @throws {Error} If inDomain is invalid (length !== 2 or min >= max)
     *
     * @example
     * ```javascript
     * // Create with default options
     * const filter = new ShaderFilterVector(colorscale, {
     *     inDomain: [0, 1],
     *     maxSteps: 256,
     *     arrowColor: [0, 0, 0, 1]
     * });
     * ```
     */
    constructor(colorscale: ColorScale, options: any);
    colorscale: ColorScale;
    inDomain: any;
    modes: {
        normalize: {
            id: string;
            enable: boolean;
            src: string;
        }[];
        arrow: {
            id: string;
            enable: boolean;
            src: string;
        }[];
        field: {
            id: string;
            enable: boolean;
            src: string;
        }[];
    };
    samplers: {
        name: string;
    }[];
    /**
     * Creates the colormap texture for magnitude visualization.
     * Samples colorscale at specified resolution, creates 1D RGBA texture,
     * configures appropriate texture filtering, and links texture with sampler.
     *
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {Promise<void>}
     * @private
     */
    private createTextures;
}
/**
 * @typedef {Object} ShaderFilterVectorGlyph~Options
 * Configuration options for glyph-based vector field visualization
 * @property {number[]} [inDomain=[]] - Input value range [min, max] for magnitude mapping
 * @property {number} [maxSteps=256] - Number of discrete steps in the colormap texture
 * @property {number[]} [glyphColor=[0.0, 0.0, 0.0, 1.0]] - RGBA color for glyphs when using 'col' mode
 * @property {number} [glyphsStride=80] - Horizontal spacing between glyphs in the sprite sheet
 * @property {number[]} [glyphsSize=[304, 64]] - Dimensions of the glyph sprite sheet [width, height]
 */
/**
 * @typedef {Object} ShaderFilterVectorGlyph~Modes
 * Available visualization modes
 * @property {string} normalize - Glyph size normalization ('on'|'off')
 * @property {string} glyph - Glyph coloring mode ('mag'|'col')
 * @property {string} field - Background field visualization ('none'|'mag')
 */
/**
 * ShaderFilterVectorGlyph implements sprite-based vector field visualization.
 * Uses pre-rendered glyphs from an SVG sprite sheet for high-quality vector field representation.
 *
 * @class
 * @extends ShaderFilter
 * @classdesc A shader filter that implements sprite-based vector field visualization.
 *
 * Features:
 * - SVG glyph-based vector field visualization
 * - Magnitude-dependent glyph selection
 * - Custom glyph coloring
 * - Optional vector normalization
 * - Background field visualization
 * - Smooth rotation and scaling
 *
 * Technical Implementation:
 * - Sprite sheet-based glyph rendering
 * - Dynamic glyph rotation and scaling
 * - Automatic magnitude mapping
 * - Alpha-based glyph composition
 * - WebGL texture management
 *
 * GLSL Implementation Constants:
 * - GLYPH_TILE_SIZE: Spacing between glyphs (16.0)
 * - ISQRT2: 1/sqrt(2) for magnitude normalization
 *
 *
 */
export class ShaderFilterVectorGlyph extends ShaderFilter {
    /**
     * Creates a new glyph-based vector field visualization filter
     * @param {ColorScale} colorscale - Colorscale for magnitude mapping
     * @param {string} glyphsUrl - URL to SVG sprite sheet containing glyphs
     * @param {ShaderFilterVectorGlyph~Options} [options] - Configuration options
     * @throws {Error} If inDomain is invalid or glyphsUrl is empty
     *
     * @example
     * ```javascript
     * // Create with custom options
     * const filter = new ShaderFilterVectorGlyph(colorscale, 'glyphs.svg', {
     *     inDomain: [0, 1],
     *     glyphsSize: [304, 64],
     *     glyphsStride: 80,
     *     glyphColor: [0, 0, 0, 1]
     * });
     * ```
     */
    constructor(colorscale: ColorScale, glyphsUrl: string, options: any);
    glyphsUrl: string;
    colorscale: ColorScale;
    inDomain: any;
    modes: {
        normalize: {
            id: string;
            enable: boolean;
            src: string;
        }[];
        glyph: {
            id: string;
            enable: boolean;
            src: string;
        }[];
        field: {
            id: string;
            enable: boolean;
            src: string;
        }[];
    };
    samplers: {
        name: string;
    }[];
    /**
     * Creates textures for glyphs and colormap.
     *
     * Implementation details:
     * 1. Glyph Texture:
     *    - Rasterizes SVG to image buffer
     *    - Creates and configures texture
     *    - Sets up linear filtering
     *
     * 2. Colormap Texture:
     *    - Samples colorscale
     *    - Creates 1D RGBA texture
     *    - Configures appropriate filtering
     *
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {Promise<void>}
     * @private
     */
    private createTextures;
}
/**
 *
 * @extends ShaderFilter
 * Filter that applies gamma correction to colors
 */
export class ShaderGammaFilter extends ShaderFilter {
    /**
     * Creates a gamma correction filter
     * @param {Object} [options] - Filter options
     * @param {number} [options.gamma=2.2] - Gamma correction value
     */
    constructor(options?: {
        gamma?: number;
    });
    fragDataSrc(gl: any): string;
}
/**
 * ShaderHDR provides enhanced HDR tone mapping capabilities.
 * It extends the base Shader class to include tone mapping operations
 * and additional uniforms for HDR rendering.
 *
 * Features:
 * - Multiple tone mapping operators: Reinhard, ACES, and Exposure
 * - Configurable parameters for each operator
 * - Linear space processing
 *
 * @extends Shader
 */
export class ShaderHDR extends Shader {
    /**
     * Creates a new enhanced ShaderHDR instance.
     *
     * @param {Object} options - Shader configuration options
     * @param {boolean} [options.isLinear=true] - Whether the shader operates in linear space
     * @param {string[]} [options.modes=['reinhard', 'aces', 'exposure']] - Available tone mapping modes
     * @param {string} [options.mode='reinhard'] - Default tone mapping mode
     * @param {Object[]} [options.samplers] - Texture samplers for the shader
     */
    constructor(options: {
        isLinear?: boolean;
        modes?: string[];
        mode?: string;
        samplers?: any[];
    });
    modes: string[];
    uniforms: {
        whitePoint: {
            type: string;
            needsUpdate: boolean;
            value: number;
        };
        shadowLift: {
            type: string;
            needsUpdate: boolean;
            value: number;
        };
        acesContrast: {
            type: string;
            needsUpdate: boolean;
            value: number;
        };
        exposure: {
            type: string;
            needsUpdate: boolean;
            value: number;
        };
        highlightCompression: {
            type: string;
            needsUpdate: boolean;
            value: number;
        };
    };
    /**
     * Tone mapping operations available in the shader.
     * @type {Object.<string, string>}
     */
    toneMapOperations: {
        [x: string]: string;
    };
    samplers: {
        id: number;
        name: string;
        type: string;
    }[];
    /**
     * Sets the white point uniform for the shader.
     *
     * @param {number} whitePoint - The new value for the white point
     */
    setWhitePoint(whitePoint: number): void;
    /**
     * Sets the shadow lift parameter for the shader.
     *
     * @param {number} shadowLift - The new value for shadow lift
     */
    setShadowLift(shadowLift: number): void;
    /**
     * Sets the ACES contrast parameter for the shader.
     *
     * @param {number} acesContrast - The new value for ACES contrast
     */
    setAcesContrast(acesContrast: number): void;
    /**
     * Sets the exposure parameter for the shader.
     *
     * @param {number} exposure - The new value for the exposure
     */
    setExposure(exposure: number): void;
    /**
     * Sets the highlight compression parameter for the shader.
     *
     * @param {number} highlightCompression - The new value for highlight compression
     */
    setHighlightCompression(highlightCompression: number): void;
}
/**
 * @typedef {Object} ShaderMultispectralOptions
 * @property {string} [mode='rgb'] - Initial rendering mode ('rgb' or 'single_band')
 * @property {boolean} [debug=false] - Enable debug output in console
 * @property {number[]} [wavelength] - Array of wavelengths in nanometers
 */
/**
 * ShaderMultispectral - WebGL2 shader implementation for multispectral visualization
 *
 * This shader handles the real-time rendering of multispectral imagery with
 * various visualization modes and Color Twist Weight (CTW) transformations.
 * It leverages WebGL2 features such as Uniform Buffer Objects (UBO) for
 * efficient handling of CTW coefficients and texture() for consistent texture sampling.
 *
 * Features:
 * - Multiple rendering modes (RGB, single band)
 * - UBO-based Color Twist Weights for spectral transformations
 * - Optimized memory access by skipping zero-weight bands
 * - Support for up to 33 spectral bands (11 RGB textures)
 * - Compatible with both single images and tile-based formats (DeepZoom, etc.)
 *
 * Technical implementation:
 * - Efficient std140 UBO layout for CTW coefficients
 * - Loop unrolling for faster rendering
 * - Optimized band access with constant indices
 *
 * @extends Shader
 */
export class ShaderMultispectral extends Shader {
    /**
     * Creates a new multispectral shader
     *
     * @param {ShaderMultispectralOptions} [options] - Configuration options
     */
    constructor(options?: ShaderMultispectralOptions);
    uniforms: {
        selectedBand: {
            type: string;
            needsUpdate: boolean;
            value: number;
        };
        bandOutputChannel: {
            type: string;
            needsUpdate: boolean;
            value: number;
        };
    };
    /**
     * Initializes shader with multispectral configuration
     *
     * Sets up wavelength information, calculates the number of required textures,
     * and configures samplers for each texture.
     *
     * @param {Object} info - Multispectral configuration object from info.json
     */
    init(info: any): void;
    wavelength: any;
    nplanes: any;
    nimg: number;
    samplers: any[];
    /**
     * Sets up Uniform Buffer Object for Color Twist Weights
     *
     * Creates and configures a UBO for efficient handling of CTW coefficients.
     * Uses WebGL2's std140 layout for optimal performance.
     *
     * @param {WebGL2RenderingContext} gl - WebGL2 context
     * @param {Float32Array} redCTW - Red channel CTW coefficients
     * @param {Float32Array} greenCTW - Green channel CTW coefficients
     * @param {Float32Array} blueCTW - Blue channel CTW coefficients
     */
    setupCTW(gl: WebGL2RenderingContext, redCTW: Float32Array, greenCTW: Float32Array, blueCTW: Float32Array): void;
    blockIndex: number;
    uboBuffer: WebGLBuffer;
    _currentCTW: {
        red: Float32Array;
        green: Float32Array;
        blue: Float32Array;
    };
    /**
     * Sets single band visualization
     *
     * Configures the shader to display a specific spectral band
     * on a chosen output channel.
     *
     * @param {number} bandIndex - Index of band to view
     * @param {number} outputChannel - Output channel (0=all/gray, 1=R, 2=G, 3=B)
     * @throws {Error} If band index is out of range
     */
    setSingleBand(bandIndex: number, outputChannel?: number): void;
    /**
     * Sets texture dimensions for calculations
     *
     * No longer needed since we're using normalized coordinates
     * @deprecated Use normalized texture coordinates instead
     */
    setTextureSize(size: any): void;
}
/**
 * @typedef {Object} ShaderNeural~NetworkConfig
 * Configuration for neural network weights and parameters
 * @property {number} n - Number of neurons per layer (padded to multiple of 4)
 * @property {number} c - Number of input channels (padded to multiple of 4)
 * @property {string} colorspace - Color space for processing ('rgb'|'xyz'|etc)
 * @property {number} nplanes - Number of coefficient planes
 * @property {number} scale - Dequantization scale factor
 * @property {number} bias - Dequantization bias
 */
/**
 * ShaderNeural implements a WebGL-based neural network for real-time image relighting.
 * Used in conjunction with LayerNeuralRTI for Neural Reflectance Transformation Imaging.
 *
 * Features:
 * - Three-layer neural network architecture
 * - Real-time image relighting
 * - Multiple texture plane support
 * - Configurable network parameters
 * - ELU activation function
 * - WebGL acceleration
 * - Automatic color space conversion
 *
 * Technical Implementation:
 * - Forward pass computation in fragment shader
 * - Vectorized operations for performance
 * - Dynamic shader generation based on network size
 * - Multi-texture sampling
 * - Weight matrix management
 * - Dequantization support
 *
/**
 * Neural Network Architecture Details
 *
 * The network consists of three layers:
 * 1. Input Layer:
 *    - Accepts coefficient planes and light direction
 *    - Applies dequantization and normalization
 *
 * 2. Hidden Layers:
 *    - Two fully connected layers
 *    - ELU activation function
 *    - Vectorized operations for efficiency
 *
 * 3. Output Layer:
 *    - Produces final RGB/XYZ color
 *    - Linear activation
 *
 * Implementation Notes:
 * - All matrices are packed into vec4 for efficient GPU processing
 * - Network dimensions are padded to multiples of 4
 * - Uses texture sampling for coefficient input
 * - Implements forward pass only
 *
 *
 * Example usage with LayerNeuralRTI:
 * ```javascript
 * // Create neural shader
 * const shader = new ShaderNeural({
 *     mode: 'light',
 *     nplanes: 9
 * });
 *
 * // Configure network
 * shader.setShaderInfo(samples, 9, 52, 12, 'rgb');
 *
 * // Update weights
 * shader.setUniform('layer1_weights', weights1);
 * shader.setUniform('layer1_biases', biases1);
 * // ... set other layers
 *
 * // Set light direction
 * shader.setLight([0.5, 0.3]);
 * ```
 *
 * Fragment Shader Implementation
 *
 * Key Components:
 * 1. Input Processing:
 *    - Texture sampling
 *    - Dequantization
 *    - Light direction incorporation
 *
 * 2. Network Computation:
 *    - Vectorized matrix multiplication
 *    - ELU activation function
 *    - Layer-wise processing
 *
 * 3. Output Processing:
 *    - Color space conversion
 *    - Final color computation
 *
 * Uniforms:
 * - {sampler2D} u_texture_[1-3] - Coefficient plane textures
 * - {vec2} lights - Light direction vector
 * - {vec4[]} layer[1-3]_weights - Layer weight matrices
 * - {vec4[]} layer[1-3]_biases - Layer bias vectors
 * - {vec3} min - Minimum values for dequantization
 * - {vec3} max - Maximum values for dequantization
 *
 * @extends Shader
 */
export class ShaderNeural extends Shader {
    /**
     * Creates a new neural network shader
     * @param {Object} [options] - Configuration options
     * @param {string[]} [options.modes=['light']] - Available modes
     * @param {string} [options.mode='light'] - Initial mode
     * @param {number} [options.nplanes=null] - Number of coefficient planes
     * @param {number} [options.scale=null] - Dequantization scale factor
     * @param {number} [options.bias=null] - Dequantization bias
     */
    constructor(options?: {
        modes?: string[];
        mode?: string;
        nplanes?: number;
        scale?: number;
        bias?: number;
    });
    samplers: {
        id: number;
        name: string;
        type: string;
    }[];
    uniforms: {
        lights: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number[];
        };
        min: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number[];
        };
        max: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number[];
        };
        layer1_weights: {
            type: string;
            needsUpdate: boolean;
            size: number;
        };
        layer1_biases: {
            type: string;
            needsUpdate: boolean;
            size: number;
        };
        layer2_weights: {
            type: string;
            needsUpdate: boolean;
            size: number;
        };
        layer2_biases: {
            type: string;
            needsUpdate: boolean;
            size: number;
        };
        layer3_weights: {
            type: string;
            needsUpdate: boolean;
            size: number;
        };
        layer3_biases: {
            type: string;
            needsUpdate: boolean;
            size: number;
        };
    };
    /**
     * Creates WebGL program and retrieves attribute locations
     * @param {WebGLRenderingContext} gl - WebGL context
     * @override
     * @private
     */
    private override createProgram;
    position_location: number;
    texcoord_location: number;
    /**
     * Sets the light direction for relighting
     * @param {number[]} light - Light direction vector [x, y]
     */
    setLight(light: number[]): void;
    /**
     * Initializes default weights
     */
    init(): void;
    /**
     * Configures shader for specific network architecture
     * @param {number[]} samples - Input samples
     * @param {number} planes - Number of coefficient planes
     * @param {number} n - Neurons per layer
     * @param {number} c - Input channels
     * @param {string} colorspace - Color space for processing
     */
    setShaderInfo(samples: number[], planes: number, n: number, c: number, colorspace: string): void;
    samples: number[];
    planes: number;
    n: number;
    c: number;
    colorspace: string;
    /**
     * Generates vertex shader source code
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} Vertex shader source
     * @private
     */
    private vertShaderSrc;
    /**
     * Generates fragment shader source code implementing neural network
     * @param {WebGLRenderingContext} gl - WebGL context
     * @returns {string} Fragment shader source
     * @private
     */
    private fragShaderSrc;
}
/**
 * @typedef {Object} ShaderRTI~Basis
 * Configuration data for basis functions
 * @property {Float32Array} [basis] - PCA basis for rbf and bln modes
 * @property {number[][]} [lights] - Light directions for rbf interpolation
 * @property {number} [sigma] - RBF interpolation parameter
 * @property {number} [ndimensions] - PCA dimension space
 */
/**
 * @typedef {Object} ShaderRTI~Options
 * Configuration options for RTI shader
 * @property {string} [mode='normal'] - Initial rendering mode
 * @property {string} [type] - Basis type: 'ptm'|'hsh'|'sh'|'rbf'|'bln'
 * @property {string} [colorspace] - Color space: 'lrgb'|'rgb'|'mrgb'|'mycc'
 * @property {number} [nplanes] - Number of coefficient planes
 * @property {number[]} [yccplanes] - Number of planes for YCC components
 * @property {Object} [material] - Material parameters for dequantization
 */
/**
 * ShaderRTI implements various Reflectance Transformation Imaging techniques.
 * Works in conjunction with LayerRTI for interactive relighting of cultural heritage objects.
 *
 * Supported Basis Types:
 * - PTM (Polynomial Texture Maps)
 * - HSH (Hemispherical Harmonics)
 * - SH (Spherical Harmonics)
 * - RBF (Radial Basis Functions)
 * - BLN (Bilinear Interpolation)
 *
 * Features:
 * - Multiple rendering modes (light, normals, diffuse, specular)
 * - Various color space support
 * - Automatic basis selection
 * - Real-time coefficient interpolation
 * - Normal map visualization
 * - Material property control
 *
 * Technical Implementation:
 * - Efficient GPU-based relighting
 * - Dynamic shader generation
 * - Coefficient plane management
 * - Light vector transformation
 * - Color space conversion
 *
 * @extends Shader
 */
export class ShaderRTI extends Shader {
    /**
     * Creates a new RTI shader
     * @param {ShaderRTI~Options} [options] - Configuration options
     *
     * @example
     * ```javascript
     * // Create PTM shader
     * const shader = new ShaderRTI({
     *     type: 'ptm',
     *     colorspace: 'rgb',
     *     mode: 'light'
     * });
     * ```
     */
    constructor(options: any);
    updateUniforms(gl: any): void;
    /**
     * Updates light direction for relighting
     * @param {number[]} light - Light vector [x, y], automatically normalized
     * @throws {Error} If shader is not initialized
     */
    setLight(light: number[]): void;
    /**
     * Sets specular exponent for specular enhancement mode
     * @param {number} value - Specular exponent
     */
    setSpecularExp(value: number): void;
    /**
     * Initializes shader with RTI configuration
     * @param {Object} relight - RTI configuration data
     * @param {string} relight.type - Basis type
     * @param {string} relight.colorspace - Color space
     * @param {Object} relight.material - Material parameters
     * @param {number[]} relight.basis - Optional PCA basis
     */
    init(relight: {
        type: string;
        colorspace: string;
        material: any;
        basis: number[];
    }): void;
    nplanes: number;
    yccplanes: number[];
    planes: any[];
    njpegs: number;
    material: any;
    ndimensions: number;
    type: string;
    scale: any;
    bias: any;
    uniforms: {
        light: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number[];
        };
        specular_exp: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: number;
        };
        bias: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: any;
        };
        scale: {
            type: string;
            needsUpdate: boolean;
            size: number;
            value: any;
        };
        base: {
            type: string;
            needsUpdate: boolean;
            size: number;
        };
        base1: {
            type: string;
            needsUpdate: boolean;
            size: number;
        };
        base2: {
            type: string;
            needsUpdate: boolean;
            size: number;
        };
    };
    /**
     * Computes basis-specific light weights
     * @param {number[]} light - Light direction vector
     * @param {string} basename - Uniform name for weights
     * @param {number} [time] - Animation time
     * @private
     */
    private lightWeights;
    baseLightOffset(p: any, l: any, k: any): any;
    basePixelOffset(p: any, x: any, y: any, k: any): any;
    loadBasis(data: any): void;
    basis: Float32Array;
    fragShaderSrc(gl: any): string;
}
/**
 * @typedef {Object} SkinIcon
 * A UI icon element from the skin file
 * @property {string} class - CSS class name (must start with 'openlime-')
 * @property {SVGElement} element - SVG DOM element
 */
/**
 * Manages SVG-based user interface elements (skin) for OpenLIME.
 *
 * The Skin system provides a centralized way to manage and customize UI elements
 * through an SVG-based theming system. Each UI component (buttons, menus, toolbars,
 * dialogs) sources its visual elements from a single SVG file.
 *
 * Design Requirements:
 * - SVG elements must have class names prefixed with 'openlime-'
 * - Icons should be properly viewboxed for scaling
 * - SVG should use relative paths for resources
 *
 * Technical Features:
 * - Async SVG loading
 * - DOM-based SVG manipulation
 * - Element cloning support
 * - Automatic viewbox computation
 * - Padding management
 * - Transform handling
 *
 *
 * Default Configuration
 *
 * - {string} url - Default skin URL ('skin/skin.svg')
 * - {number} pad - Icon padding in SVG units (5)
 *
 * File Structure Requirements:
 * ```xml
 * <svg>
 *   <!-- Icons should use openlime- prefix -->
 *   <g class="openlime-home">...</g>
 *   <g class="openlime-zoom">...</g>
 *   <g class="openlime-menu">...</g>
 * </svg>
 * ```
 *
 * Common Icon Classes:
 * - openlime-home: Home/reset view
 * - openlime-zoom: Zoom controls
 * - openlime-menu: Menu button
 * - openlime-close: Close button
 * - openlime-next: Next/forward
 * - openlime-prev: Previous/back
 *
 * Usage Notes:
 * - Always use async/await with icon methods
 * - Icons are cloned to allow multiple instances
 * - SVG is loaded once and cached
 * - Padding is applied uniformly
 * - ViewBox is computed automatically
 *
 *
 * @static
 */
export class Skin {
    /**
     * Default skin URL
     * @type {string}
     * @default 'skin/skin.svg'
     */
    static url: string;
    /**
     * Icon padding in SVG units
     * @type {number}
     * @default 5
     */
    static pad: number;
    /**
     * Cached SVG element
     * @type {SVGElement|null}
     * @private
     */
    private static svg;
    /**
     * Sets the URL for the skin SVG file
     * @param {string} u - Path to SVG file containing UI elements
     *
     * @example
     * ```javascript
     * // Set custom skin location
     * Skin.setUrl('/assets/custom-skin.svg');
     * ```
     */
    static setUrl(u: string): void;
    /**
     * Loads and parses the skin SVG file
     * Creates a DOM-based SVG element for future use
     *
     * @throws {Error} If SVG file fails to load
     * @returns {Promise<void>}
     *
     * @example
     * ```javascript
     * await Skin.loadSvg();
     * // SVG is now loaded and ready for use
     * ```
     */
    static loadSvg(): Promise<void>;
    /**
     * Retrieves a specific element from the skin by CSS selector
     * Automatically loads the SVG if not already loaded
     *
     * @param {string} selector - CSS selector for the desired element
     * @returns {Promise<SVGElement>} Cloned SVG element
     * @throws {Error} Implicitly if element not found
     *
     * @example
     * ```javascript
     * // Get home icon
     * const homeIcon = await Skin.getElement('.openlime-home');
     *
     * // Get menu button
     * const menuBtn = await Skin.getElement('.openlime-menu');
     * ```
     */
    static getElement(selector: string): Promise<SVGElement>;
    /**
     * Appends an SVG icon to a container element
     * Handles both string selectors and SVG elements
     * Automatically manages viewBox and transformations
     *
     * @param {HTMLElement} container - Target DOM element to append icon to
     * @param {string|SVGElement} icon - Icon selector or SVG element
     * @returns {Promise<SVGElement>} Processed and appended SVG element
     *
     * Processing steps:
     * 1. Loads icon (from selector or element)
     * 2. Creates SVG wrapper if needed
     * 3. Computes and sets viewBox
     * 4. Applies padding
     * 5. Handles transformations
     * 6. Appends to container
     *
     * @example
     * ```javascript
     * // Append by selector
     * const icon1 = await Skin.appendIcon(
     *     document.querySelector('.toolbar'),
     *     '.openlime-zoom'
     * );
     *
     * // Append existing SVG
     * const icon2 = await Skin.appendIcon(
     *     container,
     *     existingSvgElement
     * );
     * ```
     */
    static appendIcon(container: HTMLElement, icon: string | SVGElement): Promise<SVGElement>;
}
/**
 * @typedef {Object} TextToSpeechOptions
 * @property {string} [language='it-IT'] - Language code for speech synthesis (e.g., 'en-US', 'it-IT')
 * @property {number} [rate=1.0] - Speech rate (0.1 to 10)
 * @property {number} [volume=1.0] - Speech volume (0 to 1)
 * @property {boolean} [cleanText=true] - Whether to remove HTML tags and format text
 * @property {number} [voiceSelected=-1] - Index of preferred voice (-1 for auto-selection)
 */
/**
 *
 * TextToSpeechPlayer provides text-to-speech functionality with extensive control options.
 * Handles voice selection, speech synthesis, text cleaning, and playback control.
 *
 * Features:
 * - Multiple language support
 * - Automatic voice selection
 * - Text cleaning and formatting
 * - Playback controls (pause, resume, stop)
 * - Volume control with mute option
 * - Offline capability detection
 * - Chrome speech bug workarounds
 * - Page visibility handling
 *
 * Browser Compatibility:
 * - Uses Web Speech API
 * - Implements Chrome-specific fixes
 * - Handles browser tab switching
 * - Manages page unload events
 *
 *
 * Implementation Details
 *
 * Chrome Bug Workarounds:
 * - Implements periodic pause/resume to prevent Chrome from stopping
 * - Uses timeout to prevent indefinite speech
 * - Handles voice loading race conditions
 *
 * State Management:
 * ```javascript
 * {
 *     isSpeaking: boolean,    // Current speech state
 *     isPaused: boolean,      // Pause state
 *     voice: SpeechSynthesisVoice, // Selected voice
 *     isOfflineCapable: boolean,   // Offline support
 *     volume: number,         // Current volume
 *     previousVolume: number  // Pre-mute volume
 * }
 * ```
 *
 * Event Handling:
 * - beforeunload: Stops speech on page close
 * - visibilitychange: Handles tab switching
 * - voiceschanged: Manages voice loading
 * - utterance events: Tracks speech progress
 */
export class TextToSpeechPlayer {
    /**
     * Creates a new TextToSpeechPlayer instance
     * @param {TextToSpeechOptions} [options] - Configuration options
     *
     * @example
     * ```javascript
     * const tts = new TextToSpeechPlayer({
     *     language: 'en-US',
     *     rate: 1.2,
     *     volume: 0.8,
     *     cleanText: true
     * });
     * ```
     */
    constructor(options?: TextToSpeechOptions);
    config: {
        language: string;
        rate: number;
        volume: number;
        cleanText: boolean;
        voiceSelected: number;
    };
    voice: SpeechSynthesisVoice;
    isSpeaking: boolean;
    currentUtterance: SpeechSynthesisUtterance;
    isOfflineCapable: boolean;
    resumeTimer: any;
    timeoutTimer: NodeJS.Timeout;
    isPaused: boolean;
    previousVolume: number;
    intentionalStop: boolean;
    _resolveCurrentSpeech: (value: any) => void;
    /**
     * Initializes the player by loading voices and checking capabilities
     * @returns {Promise<void>}
     * @throws {Error} If voice loading fails or no suitable voices found
     *
     * Initialization steps:
     * 1. Loads available voices
     * 2. Selects appropriate voice
     * 3. Checks offline capability
     * 4. Sets up page listeners
     */
    initialize(): Promise<void>;
    /**
     * Warms up the speech synthesis engine with a silent utterance.
     * This helps with the first-time initialization in some browsers.
     * @private
     */
    private warmUpSpeechSynthesis;
    /**
     * Sets up event listeners for page visibility changes and unload events.
     * @private
     */
    private setupPageListeners;
    /**
     * Activates the TextToSpeechPlayer.
     */
    activate(): void;
    /**
     * Loads and selects appropriate voice for synthesis.
     *
     * @returns {Promise<SpeechSynthesisVoice>}
     * @throws {Error} If no suitable voice is found
     * @private
     */
    private loadVoice;
    /**
     * Checks if the selected voice is capable of offline speech synthesis.
     *
     * @private
     */
    private checkOfflineCapability;
    /**
     * Cleans text by removing HTML tags and formatting.
     *
     * Cleaning steps:
     * 1. Removes 'omissis' class content
     * 2. Converts <br> to spaces
     * 3. Strips HTML tags
     * 4. Removes escape characters
     * 5. Trims whitespace
     *
     * @param {string} text - Text to clean
     * @returns {string} Cleaned text
     * @private
     */
    private cleanTextForSpeech;
    /**
     * Speaks the provided text
     * @param {string} text - Text to be spoken
     * @returns {Promise<void>}
     * @throws {Error} If speech synthesis fails or times out
     *
     * Processing steps:
     * 1. Cancels any ongoing speech
     * 2. Cleans input text if enabled
     * 3. Creates utterance with current settings
     * 4. Handles speech synthesis
     * 5. Manages timeouts and Chrome workarounds
     *
     * @example
     * ```javascript
     * await tts.speakText("Hello, world!");
     * ```
     */
    speakText(text: string): Promise<void>;
    /**
     * Pauses or resumes speech synthesis
     * @param {boolean} enable - True to pause, false to resume
     *
     * @example
     * ```javascript
     * // Pause speech
     * tts.pauseSpeaking(true);
     *
     * // Resume speech
     * tts.pauseSpeaking(false);
     * ```
     */
    pauseSpeaking(enable: boolean): void;
    /**
     * Mutes or unmutes audio output
     * @param {boolean} enable - True to mute, false to unmute
     *
     * @example
     * ```javascript
     * // Mute audio
     * tts.mute(true);
     *
     * // Restore previous volume
     * tts.mute(false);
     * ```
     */
    mute(enable: boolean): void;
    /**
     * Stops current speech synthesis
     * Cleans up resources and resets state
     */
    stopSpeaking(): void;
}
/**
 * @typedef {Object} TileProperties
 * @property {number} index - Unique identifier for the tile
 * @property {number[]} bbox - Bounding box coordinates [minX, minY, maxX, maxY]
 * @property {number} level - Zoom level in the pyramid (for tiled layouts)
 * @property {number} x - Horizontal grid position
 * @property {number} y - Vertical grid position
 * @property {number} w - Tile width (for image layouts)
 * @property {number} h - Tile height (for image layouts)
 * @property {number} start - Starting byte position in dataset (for tar-based formats)
 * @property {number} end - Ending byte position in dataset (for tar-based formats)
 * @property {WebGLTexture[]} tex - Array of WebGL textures (one per channel)
 * @property {number} missing - Count of pending channel data requests
 * @property {number} time - Creation timestamp for cache management
 * @property {number} priority - Loading priority for cache management
 * @property {number} size - Total size in bytes for cache management
 */
/**
 *
 * Represents a single tile in an image tiling system.
 * Tiles are fundamental units used to manage large images through regular grid subdivision.
 * Supports both traditional pyramid tiling and specialized formats like RTI/BRDF.
 *
 * Features:
 * - Multi-channel texture support
 * - Cache management properties
 * - Format-specific byte positioning
 * - Flexible layout compatibility
 * - Priority-based loading
 *
 * Usage Contexts:
 * 1. Tiled Layouts:
 *    - Part of zoom level pyramid
 *    - Grid-based positioning (x, y, level)
 *
 * 2. Image Layouts:
 *    - Direct image subdivision
 *    - Dimensional specification (w, h)
 *
 * 3. Specialized Formats:
 *    - RTI (Reflectance Transformation Imaging)
 *    - BRDF (Bidirectional Reflectance Distribution Function)
 *    - TAR-based formats (tarzoom, itarzoom)
 *
 *
 * Implementation Details
 *
 * Property Categories:
 *
 * 1. Identification:
 * ```javascript
 * {
 *     index: number,    // Unique tile ID
 *     bbox: number[],   // Spatial bounds
 * }
 * ```
 *
 * 2. Positioning:
 * ```javascript
 * {
 *     // Tiled Layout Properties
 *     level: number,    // Zoom level
 *     x: number,        // Grid X
 *     y: number,        // Grid Y
 *
 *     // Image Layout Properties
 *     w: number,        // Width
 *     h: number,        // Height
 * }
 * ```
 *
 * 3. Data Access:
 * ```javascript
 * {
 *     start: number,    // Byte start
 *     end: number,      // Byte end
 *     tex: WebGLTexture[], // Channel textures
 *     missing: number,  // Pending channels
 * }
 * ```
 *
 * 4. Cache Management:
 * ```javascript
 * {
 *     time: number,     // Creation time
 *     priority: number, // Load priority
 *     size: number      // Memory size
 * }
 * ```
 *
 * Format-Specific Considerations:
 *
 * 1. Standard Tiling:
 * - Uses level, x, y for pyramid positioning
 * - Single texture per tile
 *
 * 2. RTI/BRDF:
 * - Multiple textures per tile (channels)
 * - Missing counter tracks channel loading
 *
 * 3. TAR Formats:
 * - Uses start/end for byte positioning
 * - Enables direct data access in archives
 *
 * Cache Management:
 * - time: Used for LRU (Least Recently Used) calculations
 * - priority: Influences loading order
 * - size: Helps manage memory constraints
 */
export class Tile {
}
/**
 * @typedef {Array<number>} APoint
 * A tuple of [x, y] representing a 2D point.
 * @property {number} 0 - X coordinate
 * @property {number} 1 - Y coordinate
 *
 * @example
 * ```javascript
 * const point: APoint = [10, 20]; // [x, y]
 * const x = point[0];  // x coordinate
 * const y = point[1];  // y coordinate
 * ```
 */
/**
 * @typedef {Object} Point
 * Object representation of a 2D point
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 */
/**
 * @typedef {Object} TransformParameters
 * @property {number} [x=0] - X translation component
 * @property {number} [y=0] - Y translation component
 * @property {number} [a=0] - Rotation angle in degrees
 * @property {number} [z=1] - Scale factor
 * @property {number} [t=0] - Timestamp for animations
 */
/**
 * @typedef {'linear'|'ease-out'|'ease-in-out'} EasingFunction
 * Animation easing function type
 */
/**
 *
 * Implements a 2D affine transformation system for coordinate manipulation.
 * Provides a complete set of operations for coordinate system conversions,
 * camera transformations, and animation support.
 *
 * Mathematical Model:
 * Transformation of point P to P' follows the equation:
 *
 * P' = z * R(a) * P + T
 *
 * where:
 * - z: scale factor
 * - R(a): rotation matrix for angle 'a'
 * - T: translation vector (x,y)
 *
 * Key Features:
 * - Full affine transformation support
 * - Camera positioning utilities
 * - Animation interpolation
 * - Viewport projection
 * - Coordinate system conversions
 * - Bounding box transformations
 *
 *
 * Coordinate Systems and Transformations:
 *
 * 1. Scene Space:
 * - Origin at image center
 * - Y-axis points up
 * - Unit scale
 *
 * 2. Viewport Space:
 * - Origin at top-left
 * - Y-axis points down
 * - Pixel units [0..w-1, 0..h-1]
 *
 * 3. WebGL Space:
 * - Origin at center
 * - Y-axis points up
 * - Range [-1..1, -1..1]
 *
 * Transform Pipeline:
 * ```
 * Scene -> Transform -> Viewport -> WebGL
 * ```
 *
 * Animation System:
 * - Time-based interpolation
 * - Multiple easing functions
 * - Smooth transitions
 *
 * Performance Considerations:
 * - Matrix operations optimized for 2D
 * - Cached transformation results
 * - Efficient composition
 */
export class Transform {
    /**
     * Normalizes angle to range [0, 360]
     * @param {number} a - Angle in degrees
     * @returns {number} Normalized angle
     * @static
     */
    static normalizeAngle(a: number): number;
    /**
     * Rotates point (x,y) by angle a around Z axis
     * @param {number} x - X coordinate to rotate
     * @param {number} y - Y coordinate to rotate
     * @param {number} a - Rotation angle in degrees
     * @returns {Point} Rotated point
     * @static
     */
    static rotate(x: number, y: number, a: number): Point;
    /**
     * Interpolates between two transforms
     * @param {Transform} source - Starting transform
     * @param {Transform} target - Ending transform
     * @param {number} time - Current time for interpolation
     * @param {EasingFunction} easing - Easing function type
     * @returns {Transform} Interpolated transform with isComplete property
     * @static
     */
    static interpolate(source: Transform, target: Transform, time: number, easing: EasingFunction): Transform;
    /**
     * Creates a new Transform instance
     * @param {TransformParameters} [options] - Transform configuration
     *
     * @example
     * ```javascript
     * // Create identity transform
     * const t1 = new Transform();
     *
     * // Create custom transform
     * const t2 = new Transform({
     *     x: 100,    // Translate 100 units in x
     *     y: 50,     // Translate 50 units in y
     *     a: 45,     // Rotate 45 degrees
     *     z: 2       // Scale by factor of 2
     * });
     * ```
     */
    constructor(options?: TransformParameters);
    t: number;
    /**
     * Creates a deep copy of the transform
     * @returns {Transform} New transform with identical parameters
     */
    copy(): Transform;
    /**
     * Applies transform to a point (x,y)
     * Performs full affine transformation: scale, rotate, translate
     *
     * @param {number} x - X coordinate to transform
     * @param {number} y - Y coordinate to transform
     * @returns {Point} Transformed point
     *
     * @example
     * ```javascript
     * const transform = new Transform({x: 10, y: 20, a: 45, z: 2});
     * const result = transform.apply(5, 5);
     * // Returns rotated, scaled, and translated point
     * ```
     */
    apply(x: number, y: number): Point;
    /**
     * Computes inverse transformation
     * Creates transform that undoes this transform's effects
     * @returns {Transform} Inverse transform
     */
    inverse(): Transform;
    /**
     * Composes two transforms: this * transform
     * Applies this transform first, then the provided transform
     *
     * @param {Transform} transform - Transform to compose with
     * @returns {Transform} Combined transformation
     *
     * @example
     * ```javascript
     * const t1 = new Transform({x: 10, a: 45});
     * const t2 = new Transform({z: 2});
     * const combined = t1.compose(t2);
     * // Results in rotation, then scale, then translation
     * ```
     */
    compose(transform: Transform): Transform;
    /**
     * Transforms a bounding box through this transform
     * @param {BoundingBox} box - Box to transform
     * @returns {BoundingBox} Transformed bounding box
     */
    transformBox(lbox: any): BoundingBox;
    /**
     * Computes viewport bounds in image space
     * Accounts for coordinate system differences between viewport and image
     *
     * @param {Viewport} viewport - Current viewport
     * @returns {BoundingBox} Bounds in image space
     */
    getInverseBox(viewport: Viewport): BoundingBox;
    /**
     * Checks if the transform has reached its target state for animation
     * @param {number} currentTime - Current time in milliseconds
     * @returns {boolean} True if animation is complete (reached target)
     */
    isAtTarget(currentTime: number): boolean;
    /**
     * Generates WebGL projection matrix
     * Combines transform with viewport for rendering
     *
     * @param {Viewport} viewport - Current viewport
     * @returns {number[]} 4x4 projection matrix in column-major order
     */
    projectionMatrix(viewport: Viewport): number[];
    /**
     * Converts scene coordinates to viewport coordinates
     * @param {Viewport} viewport - Current viewport
     * @param {APoint} p - Point in scene space
     * @returns {APoint} Point in viewport space [0..w-1, 0..h-1]
     */
    sceneToViewportCoords(viewport: Viewport, p: APoint): APoint;
    /**
     * Converts viewport coordinates to scene coordinates
     * @param {Viewport} viewport - Current viewport
     * @param {APoint} p - Point in viewport space [0..w-1, 0..h-1]
     * @returns {APoint} Point in scene space
     */
    viewportToSceneCoords(viewport: Viewport, p: APoint): APoint;
    /**
     * Prints transform parameters for debugging
     * @param {string} [str=""] - Prefix string
     * @param {number} [precision=0] - Decimal precision
     */
    print(str?: string, precision?: number): void;
}
/**
 * @typedef {Object} UIAction
 * Action configuration for toolbar buttons
 * @property {string} title - Display title for the action
 * @property {boolean} display - Whether to show in toolbar
 * @property {string} [key] - Keyboard shortcut key
 * @property {Function} task - Callback function for action
 * @property {string} [icon] - Custom SVG icon path or content
 * @property {string} [html] - HTML content for help dialog
 */
/**
 * @typedef {Object} MenuEntry
 * Menu configuration item
 * @property {string} [title] - Large title text
 * @property {string} [section] - Section header text
 * @property {string} [html] - Raw HTML content
 * @property {string} [button] - Button text
 * @property {string} [group] - Button group identifier
 * @property {string} [layer] - Associated layer ID
 * @property {string} [mode] - Layer visualization mode
 * @property {Function} [onclick] - Click handler
 * @property {Function} [oninput] - Input handler for sliders
 * @property {MenuEntry[]} [list] - Nested menu entries
 */
/**
 *
 * UIBasic implements a complete user interface for OpenLIME viewers.
 * Provides toolbar controls, layer management, and interactive features.
 *
 * Core Features:
 * - Customizable toolbar
 * - Layer management
 * - Light direction control
 * - Camera controls
 * - Keyboard shortcuts
 * - Scale bar
 * - Measurement tools
 *
 * Built-in Actions:
 * - home: Reset camera view
 * - fullscreen: Toggle fullscreen mode
 * - layers: Show/hide layer menu
 * - zoomin/zoomout: Camera zoom controls
 * - rotate: Rotate view
 * - light: Light direction control
 * - ruler: Distance measurement
 * - help: Show help dialog
 * - snapshot: Save view as image
 *
 * Implementation Details
 *
 * Layer Management:
 * - Layers can be toggled individually
 * - Layer visibility affects associated controllers
 * - Overlay layers behave independently
 * - Layer state is reflected in menu UI
 *
 * Mouse/Touch Interaction:
 * - Uses PointerManager for event handling
 * - Supports multi-touch gestures
 * - Handles drag operations for light control
 * - Manages tool state transitions
 *
 * Menu System:
 * - Hierarchical structure
 * - Dynamic updates based on state
 * - Group-based selection
 * - Mode-specific entries
 *
 * Controller Integration:
 * - Light direction controller
 * - Pan/zoom controller
 * - Measurement controller
 * - Priority-based event handling
 *
 * Dialog System:
 * - Modal blocking of underlying UI
 * - Non-modal floating windows
 * - Content injection system
 * - Event-based communication
 *
 * Skin System:
 * - SVG-based icons
 * - Dynamic loading
 * - CSS customization
 * - Responsive layout
 *
 * Keyboard Support:
 * - Configurable shortcuts
 * - Action mapping
 * - Mode-specific keys
 * - Focus handling
 *
 * See the complete example in: {@link https://github.com/cnr-isti-vclab/openlime/tree/main/dist/examples/ui-custom|GitHub ui-custom example}
 */
export class UIBasic {
    /**
     * Creates a new UIBasic instance
     * @param {Viewer} viewer - OpenLIME viewer instance
     * @param {UIBasic~Options} [options] - Configuration options
     *
     * @fires UIBasic#lightdirection
     *
     * @example
     * ```javascript
     * const ui = new UIBasic(viewer, {
     *     // Enable specific actions
     *     actions: {
     *         light: { display: true },
     *         zoomin: { display: true },
     *         layers: { display: true }
     *     },
     *     // Add measurement support
     *     pixelSize: 0.1,
     *     // Add attribution
     *     attribution: "© Example Source"
     * });
     * ```
     */
    constructor(viewer: Viewer, options: any);
    panzoom: ControllerPanZoom;
    lightcontroller: Controller2D;
    /**
     * Shows overlay message
     * @param {string} msg - Message to display
     * @param {number} [duration=2000] - Display duration in ms
     */
    showOverlayMessage(msg: string, duration?: number): void;
    overlayMessage: {
        background: HTMLDivElement;
        timeout: NodeJS.Timeout;
    };
    /**
     * Removes the overlay message
     * @private
     */
    private destroyOverlayMessage;
    /**
     * Retrieves menu entry for a specific layer
     * @param {string} id - Layer identifier
     * @returns {UIBasic~MenuEntry|undefined} Found menu entry or undefined
     * @private
     */
    private getMenuLayerEntry;
    /**
     * Creates SVG elements for light direction indicators
     * @private
     */
    private createLightDirections;
    lightDirections: SVGSVGElement;
    /**
     * Updates light direction indicator positions
     * @param {number} lx - Light X coordinate
     * @param {number} ly - Light Y coordinate
     * @private
     */
    private updateLightDirections;
    /**
     * Toggles visibility of light direction indicators
     * @param {boolean} show - Whether to show indicators
     * @private
     */
    private enableLightDirections;
    /**
     * Initializes UI components
     * Sets up toolbar, menu, and controllers
     * @private
     * @async
     */
    private init;
    scalebar: ScaleBar;
    pixelSize: any;
    /**
     * Handles keyboard down events
     * @param {KeyboardEvent} e - Keyboard event
     * @private
     */
    private keyDown;
    /**
     * Processes keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     * @private
     */
    private keyUp;
    /**
     * Loads and initializes skin SVG elements
     * @returns {Promise<void>}
     * @private
     * @async
     */
    private loadSkin;
    /**
     * Initializes action buttons and their event handlers
     * @private
     */
    private setupActions;
    /**
     * Enables/disables viewer controllers
     * @param {boolean} [on] = Enable/disable all the viewer controllers
     * @private
     */
    private setActiveControllers;
    /**
     * Toggles light direction control mode
     * @param {boolean} [on] - Force specific state
     * @private
     */
    private toggleLightController;
    lightActive: any;
    /**
     * Toggles fullscreen mode
     * Handles browser-specific fullscreen APIs
     * @private
     */
    private toggleFullscreen;
    /**
     * Toggles measurement ruler tool
     * @private
     */
    private toggleRuler;
    ruler: Ruler;
    /**
     * Toggles help dialog
     * @param {UIBasic~Action} help - Help action configuration
     * @param {boolean} [on] - Force specific state
     * @private
     */
    private toggleHelp;
    /**
     * Creates and downloads canvas snapshot
     * @private
     */
    private snapshot;
    /**
     * Creates HTML for menu entry
     * @param {UIBasic~MenuEntry} entry - Menu entry to create
     * @returns {string} Generated HTML
     * @private
     */
    private createEntry;
    /**
    * Attaches event handlers to menu entry elements
    * @param {UIBasic~MenuEntry} entry - Menu entry to process
    * @private
    */
    private addEntryCallbacks;
    /**
    * Updates menu entry state
    * @param {UIBasic~MenuEntry} entry - Menu entry to update
    * @private
    */
    private updateEntry;
    /**
    * Creates main menu structure
    * @private
    */
    private createMenu;
    entry_count: number;
    layerMenu: ChildNode;
    /**
    * Toggles layer menu visibility with animation
    * @private
    */
    private toggleLayers;
    /**
         * Updates all menu entries
         * @private
         */
    private updateMenu;
    /**
     * Sets active layer and updates UI
     * @param {Layer|string} layer_on - Layer or layer ID to activate
     */
    setLayer(layer_on: Layer | string): void;
    /**
     * Adds a UI control for a shader uniform
     * @param {Layer} layer - Layer containing the shader
     * @param {string} originalUniformName - Original name of the uniform in shader or filter
     * @param {string} uiName - Display name for the UI
     * @param {string} uiType - Control type ('checkbox'|'line-edit'|'slider')
     * @param {number} uiMinDisplayed - Minimum displayed value (for slider/line-edit)
     * @param {number} uiMaxDisplayed - Maximum displayed value (for slider/line-edit)
     * @param {number} uiMin - Minimum actual uniform value
     * @param {number} uiMax - Maximum actual uniform value
     * @param {number} uiNStepDisplayed - Number of steps for slider (granularity control)
     * @returns {boolean} Whether the uniform was found and UI created
     */
    addUniformUI(layer: Layer, originalUniformName: string, uiName: string, uiType: string, uiMinDisplayed?: number, uiMaxDisplayed?: number, uiMin?: number, uiMax?: number, uiNStepDisplayed?: number): boolean;
    /**
    * Updates all related controls for a uniform when one is changed
    * @param {Object} layerEntry - Layer menu entry
    * @param {string} uniformName - Name of the uniform
    * @param {*} value - New uniform value
    * @param {string} sourceControlId - ID of the control that triggered the update
    * @private
    */
    private updateRelatedControls;
    /**
    * Updates a uniform value in shader or filter
    * @param {Layer} layer - The layer containing the shader
    * @param {string} name - Uniform name
    * @param {*} value - New value
    * @param {ShaderFilter} [filter] - Optional filter if uniform belongs to a filter
    * @private
    */
    private updateUniformValue;
}
/**
 * A **UIDialog** is a top-level window used for communications with the user. It may be modal or modeless.
 * The content of the dialog can be either an HTML text or a pre-built DOM element.
 * When hidden, a dialog emits a 'closed' event.
 */
export class UIDialog {
    /**
     * Instatiates a UIDialog object.
     * @param {HTMLElement} container The HTMLElement on which the dialog is focused
     * @param {Object} [options] An object literal with UIDialog parameters.
     * @param {bool} options.modal Whether the dialog is modal.
     */
    constructor(container: HTMLElement, options?: {
        modal: bool;
    });
    /**
     * Creates dialog DOM structure
     * @private
     */
    private create;
    element: HTMLDivElement;
    dialog: HTMLDivElement;
    content: HTMLDivElement;
    /**
     * Sets dialog content
     * @param {string|HTMLElement} html - Content to display
     */
    setContent(html: string | HTMLElement): void;
    /**
     * Shows the dialog.
     */
    show(): void;
    visible: any;
    /**
     * Hides the dialog and emits closed event
     * @fires UIDialog#closed
     */
    hide(): void;
    /**
     * Toggles fade effect
     * @param {boolean} on - Whether to enable fade effect
     */
    fade(on: boolean): void;
    /**
     * Toggles dialog visibility
     * @param {boolean} [force] - Force specific state (true = show, false = hide)
     */
    toggle(force?: boolean): void;
}
/**
 * ScaleBar module provides measurement scale visualization and unit conversion functionality.
 * Includes both a base Units class for unit management and a ScaleBar class for visual representation.
 *
 * Units class provides unit conversion and formatting capabilities.
 * Supports various measurement units and automatic unit selection based on scale.
 */
export class Units {
    /**
     * Creates a new Units instance.
     * @param {Object} [options] - Configuration options
     * @param {string[]} [options.units=['km', 'm', 'cm', 'mm', 'µm']] - Available units in order of preference
     * @param {Object.<string, number>} [options.allUnits] - All supported units and their conversion factors to millimeters
     * @param {number} [options.precision=2] - Number of decimal places for formatted values
     */
    constructor(options?: {
        units?: string[];
        allUnits?: {
            [x: string]: number;
        };
        precision?: number;
    });
    units: string[];
    allUnits: {
        µm: number;
        mm: number;
        cm: number;
        m: number;
        km: number;
        in: number;
        ft: number;
    };
    precision: number;
    /**
     * Formats a measurement value with appropriate units.
     * Automatically selects the best unit if none specified.
     * @param {number} d - Value to format (in millimeters)
     * @param {string} [unit] - Specific unit to use for formatting
     * @returns {string} Formatted measurement with units (e.g., "5.00 mm" or "1.00 m")
     *
     * @example
     * const units = new Units();
     * units.format(1500);       // Returns "1.50 m"
     * units.format(1500, 'mm'); // Returns "1500.00 mm"
     */
    format(d: number, unit?: string): string;
}
/**
 * Utility class providing various helper functions for OpenLIME.
 * Includes methods for SVG manipulation, file loading, image processing, and string handling.
 *
 *
 * @static
 */
export class Util {
    /**
     * Pads a number with leading zeros
     * @param {number} num - Number to pad
     * @param {number} size - Desired string length
     * @returns {string} Zero-padded number string
     *
     * @example
     * ```javascript
     * Util.padZeros(42, 5); // Returns "00042"
     * ```
     */
    static padZeros(num: number, size: number): string;
    /**
     * Prints source code with line numbers
     * Useful for shader debugging
     * @param {string} str - Source code to print
     * @private
     */
    private static printSrcCode;
    /**
     * Creates an SVG element with optional attributes
     * @param {string} tag - SVG element tag name
     * @param {Object} [attributes] - Key-value pairs of attributes
     * @returns {SVGElement} Created SVG element
     *
     * @example
     * ```javascript
     * const circle = Util.createSVGElement('circle', {
     *     cx: '50',
     *     cy: '50',
     *     r: '40'
     * });
     * ```
     */
    static createSVGElement(tag: string, attributes?: any): SVGElement;
    /**
     * Parses SVG string into DOM element
     * @param {string} text - SVG content string
     * @returns {SVGElement} Parsed SVG element
     * @throws {Error} If parsing fails
     */
    static SVGFromString(text: string): SVGElement;
    /**
     * Loads SVG file from URL
     * @param {string} url - URL to SVG file
     * @returns {Promise<SVGElement>} Loaded and parsed SVG
     * @throws {Error} If fetch fails or content isn't SVG
     *
     * @example
     * ```javascript
     * const svg = await Util.loadSVG('icons/icon.svg');
     * document.body.appendChild(svg);
     * ```
     */
    static loadSVG(url: string): Promise<SVGElement>;
    /**
     * Loads HTML content from URL
     * @param {string} url - URL to HTML file
     * @returns {Promise<string>} HTML content
     * @throws {Error} If fetch fails
     */
    static loadHTML(url: string): Promise<string>;
    /**
     * Loads and parses JSON from URL
     * @param {string} url - URL to JSON file
     * @returns {Promise<Object>} Parsed JSON data
     * @throws {Error} If fetch or parsing fails
     */
    static loadJSON(url: string): Promise<any>;
    /**
     * Loads image from URL
     * @param {string} url - Image URL
     * @returns {Promise<HTMLImageElement>} Loaded image
     * @throws {Error} If image loading fails
     */
    static loadImage(url: string): Promise<HTMLImageElement>;
    /**
     * Appends loaded image to container
     * @param {HTMLElement} container - Target container
     * @param {string} url - Image URL
     * @param {string} [imgClass] - Optional CSS class
     * @returns {Promise<void>}
     */
    static appendImg(container: HTMLElement, url: string, imgClass?: string): Promise<void>;
    /**
      * Appends multiple images to container
      * @param {HTMLElement} container - Target container
      * @param {string[]} urls - Array of image URLs
      * @param {string} [imgClass] - Optional CSS class
      * @returns {Promise<void>}
      */
    static appendImgs(container: HTMLElement, urls: string[], imgClass?: string): Promise<void>;
    /**
     * Tests if string is valid SVG content
     * @param {string} input - String to test
     * @returns {boolean} True if string is valid SVG
     */
    static isSVGString(input: string): boolean;
    /**
     * Computes Signed Distance Field from image data
     * Implementation based on Felzenszwalb & Huttenlocher algorithm
     *
     * @param {Uint8Array} buffer - Input image data
     * @param {number} w - Image width
     * @param {number} h - Image height
     * @param {number} [cutoff=0.25] - Distance field cutoff
     * @param {number} [radius=8] - Maximum distance to compute
     * @returns {Float32Array|Array} Computed distance field
     *
     * Technical Details:
     * - Uses 2D Euclidean distance transform
     * - Separate inner/outer distance fields
     * - Optimized grid computation
     * - Sub-pixel accuracy
     */
    static computeSDF(buffer: Uint8Array, w: number, h: number, cutoff?: number, radius?: number): Float32Array | any[];
    /**
     * Rasterizes SVG to ImageData
     * @param {string} url - SVG URL
     * @param {number[]} [size=[64,64]] - Output dimensions [width, height]
     * @returns {Promise<ImageData>} Rasterized image data
     *
     * Processing steps:
     * 1. Loads SVG file
     * 2. Sets up canvas context
     * 3. Handles aspect ratio
     * 4. Centers image
     * 5. Renders to ImageData
     *
     * @example
     * ```javascript
     * const imageData = await Util.rasterizeSVG('icon.svg', [128, 128]);
     * context.putImageData(imageData, 0, 0);
     * ```
     */
    static rasterizeSVG(url: string, size?: number[]): Promise<ImageData>;
}
/**
 * @typedef {Object} ViewerOptions
 * Configuration options for Viewer initialization
 * @property {string} [background] - CSS background style
 * @property {boolean} [autofit=true] - Auto-fit camera to scene
 * @property {Object} [canvas={}] - Canvas configuration options
 * @property {Camera} [camera] - Custom camera instance
 */
/**
 * @typedef {Object} Viewport
 * Viewport configuration
 * @property {number} x - Left coordinate
 * @property {number} y - Top coordinate
 * @property {number} dx - Width in pixels
 * @property {number} dy - Height in pixels
 * @property {number} w - Total width
 * @property {number} h - Total height
 */
/**
 * Fired when frame is drawn
 * @event Viewer#draw
 */
/**
 * Fired when viewer is resized
 * @event Viewer#resize
 * @property {Viewport} viewport - New viewport configuration
 */
/**
 *
 * Central class of the OpenLIME framework.
 * Creates and manages the main viewer interface, coordinates components,
 * and handles rendering pipeline.
 *
 * Core Responsibilities:
 * - Canvas management
 * - Layer coordination
 * - Camera control
 * - Event handling
 * - Rendering pipeline
 * - Resource management
 *
 *
 *
 * Component Relationships:
 * ```
 * Viewer
 * ├── Canvas
 * │   └── Layers
 * ├── Camera
 * ├── PointerManager
 * └── Controllers
 * ```
 *
 * Rendering Pipeline:
 * 1. Camera computes current transform
 * 2. Canvas prepares render state
 * 3. Layers render in order
 * 4. Post-processing applied
 * 5. Frame timing recorded
 *
 * Event System:
 * - draw: Emitted after each frame render
 * - resize: Emitted when viewport changes
 *
 * Performance Considerations:
 * - Uses requestAnimationFrame
 * - Tracks frame timing
 * - Handles device pixel ratio
 * - Optimizes redraw requests
 *
 * Resource Management:
 * - Automatic canvas cleanup
 * - Proper event listener removal
 * - ResizeObserver handling
 *
 * @fires Viewer#draw
 * @fires Viewer#resize
 *
 * @example
 * ```javascript
 * // Basic viewer setup
 * const viewer = new OpenLIME.Viewer('#container');
 *
 * // Add image layer
 * const layer = new OpenLIME.Layer({
 *     layout: 'image',
 *     type: 'image',
 *     url: 'image.jpg'
 * });
 * viewer.addLayer('main', layer);
 *
 * // Access components
 * const camera = viewer.camera;
 * const canvas = viewer.canvas;
 * ```
 */
export class Viewer {
    /**
     * Creates a new Viewer instance
     * @param {HTMLElement|string} div - Container element or selector
     * @param {ViewerOptions} [options] - Configuration options
     * @param {number} [options.idleTime=60] - Seconds of inactivity before idle event
     * @throws {Error} If container element not found
     *
     * Component Setup:
     * 1. Creates/configures canvas element
     * 2. Sets up overlay system
     * 3. Initializes camera
     * 4. Creates pointer manager
     * 5. Sets up resize observer
     */
    constructor(div: HTMLElement | string, options?: ViewerOptions);
    containerElement: string | HTMLElement;
    canvasElement: any;
    overlayElement: HTMLDivElement;
    canvas: Canvas;
    pointerManager: PointerManager;
    resizeObserver: ResizeObserver;
    controllers: any[];
    /**
     * Adds a device event controller to the viewer.
     * @param {Controller} controller An OpenLIME controller.
     */
    addController(controller: Controller): void;
    /**
     * Adds layer to viewer
     * @param {string} id - Unique layer identifier
     * @param {Layer} layer - Layer instance
     * @fires Canvas#update
     *
     * @example
     * ```javascript
     * const layer = new OpenLIME.Layer({
     *     type: 'image',
     *     url: 'image.jpg'
     * });
     * viewer.addLayer('background', layer);
     * ```
     */
    addLayer(id: string, layer: Layer): void;
    /**
     * Removes layer from viewer
     * @param {Layer|string} layer - Layer instance or ID
     * @fires Canvas#update
     */
    removeLayer(layer: Layer | string): void;
    /**
     * Handles viewer resizing
     * @param {number} width - New width in CSS pixels
     * @param {number} height - New height in CSS pixels
     * @private
     * @fires Viewer#resize
     */
    private resize;
    /**
     * Schedules next frame for rendering
     * Uses requestAnimationFrame for optimal performance
     */
    redraw(): void;
    animaterequest: number;
    requestTime: number;
    /**
     * Performs actual rendering
     * @param {number} time - Current timestamp
     * @private
     * @fires Viewer#draw
     */
    private draw;
    /**
     * Enables or disables split viewport mode and sets which layers appear on each side
     * @param {boolean} enabled - Whether split viewport mode is enabled
     * @param {string[]} leftLayerIds - Array of layer IDs to show on left side
     * @param {string[]} rightLayerIds - Array of layer IDs to show on right side
     * @fires Canvas#update
     */
    setSplitViewport(enabled: boolean, leftLayerIds?: string[], rightLayerIds?: string[]): void;
}
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
declare class Annotation {
    /**
     * Generates a UUID (Universally Unique Identifier) for annotation instances.
     * @returns {string} A newly generated UUID.
     * @private
     */
    private static generateUUID;
    /**
     * Creates an Annotation instance from a JSON-LD format object.
     * @param {Object} entry - The JSON-LD object representing an annotation.
     * @returns {Annotation} A new Annotation instance.
     * @throws {Error} If the entry is not a valid JSON-LD annotation or contains unsupported selectors.
     */
    static fromJsonLd(entry: any): Annotation;
    /**
     * Creates a new Annotation instance.
     * @param {Object} [options] - Configuration options for the annotation.
     * @param {string} [options.id] - Unique identifier for the annotation. Auto-generated if not provided.
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
    constructor(options?: {
        id?: string;
        code?: string;
        label?: string;
        description?: string;
        class?: string;
        target?: string;
        svg?: string;
        image?: any;
        region?: any;
        data?: any;
        style?: any;
        bbox?: BoundingBox;
        visible?: boolean;
        state?: any;
        ready?: boolean;
        needsUpdate?: boolean;
        editing?: boolean;
    });
    id: string;
    code: string;
    label: string;
    description: string;
    class: string;
    target: string;
    svg: string;
    image: any;
    region: any;
    data: any;
    style: any;
    bbox: BoundingBox;
    visible: boolean;
    state: any;
    ready: boolean;
    needsUpdate: boolean;
    editing: boolean;
    publish: any;
    elements: any;
    /**
     * Calculates and returns the bounding box of the annotation based on its elements or region.
     * The coordinates are always relative to the top-left corner of the canvas.
     * @returns {BoundingBox} The calculated bounding box of the annotation.
     */
    getBBoxFromElements(): BoundingBox;
    /**
     * Converts the annotation to a JSON-LD format object.
     * @returns {Object} A JSON-LD representation of the annotation.
     */
    toJsonLd(): any;
}
/**
 * Represents a cubic spline interpolation for smooth color transitions.
 * @private
 */
declare class Spline {
    static solve(A: any, ks: any): any;
    static zerosMat(r: any, c: any): Float64Array[];
    static swapRows(m: any, k: any, l: any): void;
    /**
     * Creates a new Spline instance.
     * @param {number[]} xs - X coordinates array
     * @param {number[]} ys - Y coordinates array
     */
    constructor(xs: number[], ys: number[]);
    xs: number[];
    ys: number[];
    ks: any;
    getNaturalKs(ks: any): any;
    /**
 * Finds index of the point before the target value using binary search.
 * Inspired by https://stackoverflow.com/a/40850313/4417327
 * @param {number} target - Value to search for
 * @returns {number} Index of the point before target
 * @private
 */
    private getIndexBefore;
    /**
 * Calculates interpolated value at given point.
 * @param {number} x - Point to interpolate at
 * @returns {number} Interpolated value
 */
    at(x: number): number;
}
declare class Point {
    tap(pos: any): boolean;
}
export {};
