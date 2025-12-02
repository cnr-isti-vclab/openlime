// src/types/openlime.d.ts

/** Layout identifier used by OpenLIME Layout/Layer classes. */
export type LayoutType =
  | 'image'
  | 'deepzoom'
  | 'deepzoom1px'
  | 'google'
  | 'zoomify'
  | 'iiif'
  | 'tarzoom'
  | 'itarzoom'
  | string;

/** Viewport configuration used by Viewer/Canvas. */
export interface Viewport {
  x: number;
  y: number;
  dx: number;
  dy: number;
  w: number;
  h: number;
}

/** Layout options for multiresolution/image layouts. */
export interface LayoutOptions {
  width?: number;
  height?: number;
  suffix?: string;
  subdomains?: string[];
}

/**
 * Viewer configuration options.
 */
export interface ViewerOptions {
  /** CSS background style applied to the container element. */
  background?: string;
  /** Whether to auto-fit camera when layers are ready (default: true). */
  autofit?: boolean;
  /** Canvas configuration object passed to Canvas constructor. */
  canvas?: any;
  /** Optional custom camera instance. */
  camera?: Camera;
  /**
   * Idle timeout in seconds for PointerManager / idle events.
   */
  idleTime?: number;
}

/**
 * Base layer configuration.
 * Combina il vecchio LayerConfig con le opzioni attuali dei Layer in ./src/Layer*.js
 */
export interface LayerOptions {
  /**
   * Layout identifier or Layout instance.
   * Common values: 'image', 'deepzoom', 'iiif', 'google', ecc.
   */
  layout?: LayoutType | Layout;
  /** Layer type string (e.g. 'image', 'rti', 'lens', 'brdf', 'dstretch', ecc.). */
  type?: string;
  /** Unique layer identifier within the viewer. */
  id?: string;
  /** Display label used in UI / menus (default: id). */
  label?: string;
  /** Transform from layer space to scene/canvas coordinates. */
  transform?: Transform;
  /** Whether layer should be rendered. */
  visible?: boolean;
  /** Rendering Z-order (higher value is drawn on top). */
  zindex?: number;
  /** If true, layer is drawn in overlay mode (not affecting camera fit). */
  overlay?: boolean;
  /**
   * Prefetch border in tile units.
   * Controls how many neighbouring tiles are prefetched around the visible area.
   */
  prefetchBorder?: number;
  /**
   * Texture resolution selection bias (0 = prefer highest resolution,
   * 1 = prefer lowest).
   */
  mipmapBias?: number;
  /**
   * Map of available shaders for this layer.
   * Keys are shader IDs, values are Shader instances.
   */
  shaders?: { [id: string]: Shader };
  /**
   * URL or base URL for image/tiles, depending on the layout.
   */
  url?: string;
  /**
   * Optional list of controllers attached to this layer.
   */
  controllers?: Controller[];
  /**
   * Reference layer used as source for some derived layers (e.g. lens, overlays).
   */
  sourceLayer?: Layer;
  /**
   * Real-world pixel size (e.g. mm/pixel) used by ruler / scale bar tools.
   */
  pixelSize?: number;
  /**
   * Whether RTI/PTM normals are precomputed and stored alongside data.
   * Viene passato negli esempi: new Layer({ type:'rti', normals:false, ... })
   */
  normals?: boolean;
}

/** Backward-compat alias used in older code. */
export interface LayerConfig extends LayerOptions {}

/**
 * Action definition for UIBasic toolbar/menu.
 */
export interface UIAction {
  /** Display title for the action. */
  title: string;
  /**
   * Whether this action is visible in the toolbar/menu.
   * Può essere 'auto' nei defaults (es. light: { display: 'auto', ... }).
   */
  display: boolean | 'auto';
  /** Optional keyboard shortcut key. */
  key?: string;
  /** Callback function executed when the action is triggered. */
  task: (event?: Event) => void;
  /** Optional custom SVG icon path or inline SVG content. */
  icon?: string;
  /** Optional HTML content for help dialog / tooltip. */
  html?: string;
  /**
   * Flag usato dagli esempi: ui.actions.light.active = true;
   * Non è strettamente richiesto dal core, ma lo dichiariamo per evitare errori TS.
   */
  active?: boolean;
}

/** Collection of named actions used by UIBasic. */
export interface UIActions {
  [name: string]: UIAction;
}

/**
 * Configuration options for the standard UIBasic interface.
 * (default options in UIBasic.js includono showScale, showLightDirections, ecc.)
 */
export interface UIBasicOptions {
  /** Configurable UI actions collection. */
  actions?: UIActions;
  /** Menu configuration object (array o struttura custom). */
  menu?: any;
  /** Pixel size for scale/measurement tools. */
  pixelSize?: number;
  /** Attribution HTML string rendered in the UI. */
  attribution?: string;
  /** Automatically fit camera to content on start. */
  autoFit?: boolean;
  /** Show scale bar. */
  showScale?: boolean;
  /** Unit string for scale bar (es. 'mm'). */
  unit?: string;
  /** External light controller instance, se già creato. */
  lightcontroller?: any;
  /**
   * Show training light directions (es. markers nel light controller).
   * → quello che usi tu: { showLightDirections: true }
   */
  showLightDirections?: boolean;
  /** Enable tooltips over toolbar icons. */
  enableTooltip?: boolean;
  /**
   * Messaggio mostrato quando lo zoom con wheel richiede CTRL.
   * Può essere null o stringa.
   */
  controlZoomMessage?: string | null;
}

/** Class entry used by SVG annotation layers. */
export interface AnnotationClass {
  stroke: string;
  label: string;
}

/** Map of annotation classes by ID/name. */
export interface AnnotationClassMap {
  [id: string]: AnnotationClass;
}

/**
 * Options for LayerSvgAnnotation.
 */
export interface LayerSvgAnnotationOptions extends LayerOptions {
  classes: AnnotationClassMap;
  onClick?: (annotation: any) => void;
  shadow?: boolean;
  overlayElement?: HTMLElement;
  style?: string;
  annotationUpdate?: (annotation: any, transform: Transform) => void;
}

/**
 * Options for RTI layers (LayerRTI) – subset of runtime options.
 */
export interface LayerRTIOptions extends LayerOptions {
  url: string;
  layout: LayoutType | Layout;
  normals?: boolean;
  server?: string;
  worldRotation?: number;
}

/** Options for neural RTI / relighting layers. */
export interface LayerNeuralRTIOptions extends LayerOptions {
  url: string;
  layout: LayoutType | Layout;
  modelUrl?: string;
  gpu?: boolean;
}

/** Options for RSC/relighting sparse-coding layers (LayerRSC). */
export interface LayerRSCOptions extends LayerOptions {
  url: string;
  layout: LayoutType | Layout;
  rscConfigUrl?: string;
  worldRotation?: number;
}

/** Options for DStretch-like enhancement layer (LayerDstretch). */
export interface LayerDstretchOptions extends LayerOptions {
  url: string;
}

/** Options for HDR tonemapping layers. */
export interface LayerHDROptions extends LayerOptions {
  mode?: string;
  exposure?: number;
  autoWhitePoint?: boolean;
  dataLoader?: (tile: any, gl: WebGLRenderingContext, options?: any) => Promise<any>;
  dataLoaderOptions?: any;
}

/** Options for BRDF layers (LayerBRDF). */
export interface LayerBRDFOptions extends LayerOptions {
  channels?: string[];
  colorspaces?: string[];
  brightness?: number;
  gamma?: number;
  alphaLimits?: [number, number];
  monochromeMaterial?: boolean;
  kAmbient?: number;
}

/** Options for the LightSphereController widget. */
export interface LightSphereControllerOptions {
  container?: HTMLElement | string;
  width?: number;
  height?: number;
  top?: number;
  right?: number;
  thetaMin?: number;
  colorSpot?: string;
  colorBkg?: string;
  colorMark?: string;
  enableLightSnap?: boolean;
}

/** Options for LensDashboard. */
export interface LensDashboardOptions {
  containerSpace?: number;
  borderColor?: [number, number, number, number];
  borderWidth?: number;
  layerSvgAnnotation?: LayerSvgAnnotation | null;
}

/* ------------------------------------------------------------------ */
/*  Core classes (minimal/stubbed signatures)                         */
/* ------------------------------------------------------------------ */

export class Transform {
  x: number;
  y: number;
  z: number;
  a: number;
  t: number;

  constructor(x?: number, y?: number, z?: number, a?: number, t?: number);

  getMatrix(zx?: number, zy?: number): number[];
  sceneToViewportCoords(viewport: Viewport, p: [number, number]): [number, number];
  viewportToSceneCoords(viewport: Viewport, p: [number, number]): [number, number];
  print(str?: string, precision?: number): void;

  [key: string]: any;
}

export class BoundingBox {
  xLow: number;
  yLow: number;
  xHigh: number;
  yHigh: number;

  constructor(opts?: Partial<BoundingBox>);

  [key: string]: any;
}

export class Layout {
  type: LayoutType;
  width: number;
  height: number;
  suffix: string;
  urls: string[];

  constructor(url: string, type?: LayoutType, options?: LayoutOptions);

  getTileSize(): [number, number];
  boundingBox(): BoundingBox;
  setUrls(urls: string[]): void;

  [key: string]: any;
}

export class Shader {
  label?: string;
  njpegs?: number;
  needsUpdate?: boolean;

  constructor(options?: any);

  setLight?(v: number[]): void;
  init?(config: any): void;
  updateRotationMatrix?(euler: [number, number, number]): void;

  [key: string]: any;
}

export class ShaderFilter {
  name: string;
  shader: Shader | null;
  samplers: any[];
  uniforms: { [key: string]: any };
  modes: { [key: string]: any[] };
  needsUpdate: boolean;

  constructor(options?: any);

  setMode(mode: string, id: string): void;

  [key: string]: any;
}

export class ShaderFilterColormap extends ShaderFilter {}
export class ShaderDstretch extends Shader {}
export class ShaderCombiner extends Shader {}
export class ShaderLens extends Shader {}
export class ShaderRTI extends Shader {}

export class Raster {
  width: number;
  height: number;

  constructor(options?: any);

  [key: string]: any;
}

export class Raster16Bit extends Raster {}

export class Camera {
  transform: Transform;

  constructor();

  fitCameraBox(margin?: number): void;
  setViewport(viewport: Viewport): void;

  [key: string]: any;
}

export class Canvas {
  element: HTMLCanvasElement;
  overlayElement: HTMLElement;
  camera: Camera;
  layers: { [id: string]: Layer };

  constructor(
    canvas: HTMLCanvasElement,
    overlay: HTMLElement,
    camera: Camera,
    options?: any
  );

  addEvent(name: string, handler: (...args: any[]) => void): void;
  removeEvent(name: string, handler: (...args: any[]) => void): void;
  resize(width?: number, height?: number): void;

  [key: string]: any;
}

export class Viewer {
  background: string | null;
  autofit: boolean;
  canvas: Canvas;
  camera: Camera;
  idleTime: number;
  containerElement: HTMLElement;
  canvasElement: HTMLCanvasElement;
  overlayElement: HTMLElement;
  pointerManager: PointerManager;
  controllers: Controller[];

  constructor(div: HTMLElement | string, options?: ViewerOptions);

  addLayer(id: string, layer: Layer): void;
  getLayer(id: string): Layer | undefined;
  removeLayer(id: string | Layer): void;
  redraw(): void;
  resize(width?: number, height?: number): void;
  addEvent(name: string, handler: (...args: any[]) => void): void;
  removeEvent(name: string, handler: (...args: any[]) => void): void;

  [key: string]: any;
}

export class Controller {
  viewer?: Viewer;

  constructor(viewer?: Viewer);

  [key: string]: any;
}

export class Controller2D extends Controller {}
export class ControllerPanZoom extends Controller2D {}
export class ControllerLens extends Controller2D {}

export class LightSphereController {
  lightDir: [number, number];
  lightDirs: number[][];
  enableLightSnap: boolean;
  containerElement: HTMLElement;

  constructor(
    container: HTMLElement | string,
    options?: LightSphereControllerOptions
  );

  addLayer(layer: Layer): void;
  show(): void;
  hide(): void;

  [key: string]: any;
}

export class PointerManager {
  constructor(element: HTMLElement, options?: { idleTime?: number });

  addListener(type: string, handler: (ev: PointerEvent) => void): void;
  removeListener(type: string, handler: (ev: PointerEvent) => void): void;

  [key: string]: any;
}

export class Layer {
  id: string;
  type: string;
  layout: Layout;
  url?: string;
  visible: boolean;
  overlay: boolean;
  zindex: number;
  transform: Transform;
  pixelSize?: number;
  shaders: { [id: string]: Shader };
  shader?: Shader;
  controllers: Controller[];
  viewer?: Viewer;
  status?: string;

  constructor(options?: LayerOptions);

  setShader(id: string): void;
  addControl(name: string, value: any): void;
  setControl(name: string, value: any, dt?: number): void;
  getControl(name: string): any;
  draw(transform: Transform, viewport: Viewport): boolean;
  addEvent(name: string, handler: (...args: any[]) => void): void;
  removeEvent(name: string, handler: (...args: any[]) => void): void;
  emit(name: string, ...args: any[]): void;

  [key: string]: any;
}

export class LayerImage extends Layer {
  constructor(options: LayerOptions);
}

export class LayerRTI extends Layer {
  constructor(options: LayerRTIOptions);
}

export class LayerNeuralRTI extends Layer {
  constructor(options: LayerNeuralRTIOptions);
}

export class LayerRSC extends Layer {
  constructor(options: LayerRSCOptions);
}

export class LayerDstretch extends LayerImage {
  constructor(options: LayerDstretchOptions);
}

export class LayerHDR extends Layer {
  constructor(options: LayerHDROptions);
}

export class LayerBRDF extends Layer {
  constructor(options: LayerBRDFOptions);
}

export class LayerAnnotation extends Layer {
  [key: string]: any;
}

export class LayerSvgAnnotation extends LayerAnnotation {
  constructor(options: LayerSvgAnnotationOptions);
}

export class LayerLens extends Layer {
  constructor(options: LayerOptions);
}

export class LayerMaskedImage extends Layer {
  [key: string]: any;
}

export class LayerCombiner extends Layer {
  [key: string]: any;
}

export class LayerMultispectral extends Layer {
  [key: string]: any;
}

export class LensDashboard {
  constructor(viewer: Viewer, options?: LensDashboardOptions);

  toggle(): void;
  setLensLayer(layer: LayerLens): void;

  [key: string]: any;
}

export class LensDashboardNavigator extends LensDashboard {
  [key: string]: any;
}

export class UIBasic {
  actions: UIActions;

  constructor(viewer: Viewer, options?: UIBasicOptions);

  [key: string]: any;
}

export class Skin {
  static setUrl(url: string): void;

  [key: string]: any;
}

export class Util {
  static createSVGElement(tag: string, attrs?: { [key: string]: any }): SVGElement;
  static loadSvg(url: string): Promise<SVGElement>;
  static getExt(url: string): string;

  [key: string]: any;
}

export class MultispectralUI {
  constructor(layer: LayerMultispectral, options?: any);

  [key: string]: any;
}

export class GeoreferenceManager {
  constructor(options?: any);

  [key: string]: any;
}

/**
 * HSH utility class – usata negli shaders RTI/PTM.
 * Negli esempi viene usata come OpenLIME.HSH.minElevation = ...
 */
export class HSH {
  static minElevation: number;
  /**
   * @param v light direction as [x, y, z]
   * @returns Float32Array with HSH basis weights
   */
  static lightWeights(v: number[]): Float32Array;
}

/** Library semantic version (taken from package.json at build time). */
export const version: string;
