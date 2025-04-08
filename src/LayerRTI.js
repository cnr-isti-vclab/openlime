import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderRTI } from './ShaderRTI.js'
import { Transform } from './Transform.js'

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
class LayerRTI extends Layer {
	/**
	 * Creates a new LayerRTI instance
	 * @param {LayerRTIOptions} options - Configuration options
	 * @throws {Error} If rasters options is not empty
	 * @throws {Error} If url is not provided
	 */
	constructor(options) {
		super(options);

		if (Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if (!this.url)
			throw "Url option is required";

		this.shaders['rti'] = new ShaderRTI({ normals: this.normals });
		this.setShader('rti');

		this.addControl('light', [0, 0]);
		this.worldRotation = 0; //if the canvas or ethe layer rotate, light direction neeeds to be rotated too.

		this.loadJson(this.url);
	}

	/**
	 * Constructs URL for image plane resources based on layout type
	 * @param {string} url - Base URL
	 * @param {string} plane - Plane identifier
	 * @returns {string} Complete URL for the resource
	 * @private
	 */
	imageUrl(url, plane) {
		let path = this.url.substring(0, this.url.lastIndexOf('/') + 1);
		switch (this.layout.type) {
			case 'image': return path + plane + '.jpg'; break;
			case 'google': return path + plane; break;
			case 'deepzoom': return path + plane + '.dzi'; break;
			case 'tarzoom': return path + plane + '.tzi'; break;
			case 'itarzoom': return path + 'planes.tzi'; break;
			case 'zoomify': return path + plane + '/ImageProperties.xml'; break;
			case 'iip': return url; break;
			case 'iiif': throw Error("Unimplemented");
			default: throw Error("Unknown layout: " + layout.type);
		}
	}

	/**
	 * Sets the light direction with optional animation
	 * @param {number[]} light - Light direction vector [x, y]
	 * @param {number} [dt] - Animation duration in milliseconds
	 */
	setLight(light, dt) {
		this.setControl('light', light, dt);
	}

	/**
	 * Loads and processes RTI configuration
	 * @param {string} url - URL to info.json
	 * @private
	 * @async
	 */
	loadJson(url) {
		(async () => {
			let infoUrl = url;

			// Need to handle embedded RTI info.json when using IIP and TIFF image stacks
			if (this.layout.type == "iip") infoUrl = (this.server ? this.server + '?FIF=' : '') + url + "&obj=description";

			var response = await fetch(infoUrl);
			if (!response.ok) {
				this.status = "Failed loading " + infoUrl + ": " + response.statusText;
				return;
			}
			let json = await response.json();

			// Update layout image format and pixelSize if provided in info.json
			this.layout.suffix = json.format;
			if (json.pixelSizeInMM) this.pixelSize = json.pixelSizeInMM;

			this.shader.init(json);
			let urls = [];
			for (let p = 0; p < this.shader.njpegs; p++) {
				let imageUrl = this.layout.imageUrl(url, 'plane_' + p);
				urls.push(imageUrl);
				let raster = new Raster({ format: 'vec3', isLinear: true });
				this.rasters.push(raster);
			}
			if (this.normals) { // ITARZOOM must include normals and currently has a limitation: loads the entire tile
				let imageUrl = this.layout.imageUrl(url, 'normals');
				urls.push(imageUrl);
				let raster = new Raster({ format: 'vec3', isLinear: true });
				this.rasters.push(raster);
			}
			this.layout.setUrls(urls);

		})().catch(e => { console.log(e); this.status = e; });
	}

	/**
	 * Updates light direction based on control state
	 * Handles world rotation transformations
	 * @returns {boolean} Whether interpolation is complete
	 * @override
	 * @private
	 */
	interpolateControls() {
		let done = super.interpolateControls();
		if (!done) {
			let light = this.controls['light'].current.value;
			//this.shader.setLight(light);
			let rotated = Transform.rotate(light[0], light[1], this.worldRotation * Math.PI);
			this.shader.setLight([rotated.x, rotated.y]);
		}
		return done;
	}

	/**
	 * Renders the RTI visualization
	 * Updates world rotation and manages drawing
	 * @param {Transform} transform - Current view transform
	 * @param {Object} viewport - Current viewport
	 * @returns {boolean} Whether render completed successfully
	 * @override
	 * @private
	 */
	draw(transform, viewport) {
		this.worldRotation = transform.a + this.transform.a;
		return super.draw(transform, viewport);
	}
}

/**
 * Register this layer type with the Layer factory
 * @type {Function}
 * @private
 */
Layer.prototype.types['rti'] = (options) => { return new LayerRTI(options); }

export { LayerRTI }
