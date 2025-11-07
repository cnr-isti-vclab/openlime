import { Layer } from './Layer.js'
import { Raster } from './Raster.js'
import { ShaderRSC } from './ShaderRSC.js'
import { Transform } from './Transform.js'
import { Util } from './Util.js'


/**
 * @typedef {Object} LayerRSCOptions
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
class LayerRSC extends Layer {
	/**
	 * Creates a new LayerRTI instance
	 * @param {LayerRSCOptions} options - Configuration options
	 * @throws {Error} If rasters options is not empty
	 * @throws {Error} If url is not provided
	 */
	constructor(options) {
		super(options);

		if (Object.keys(this.rasters).length != 0)
			throw "Rasters options should be empty!";

		if (!this.url)
			throw "Url option is required";

		this.shaders['rsc'] = new ShaderRSC({ normals: this.normals });
		this.setShader('rsc');

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

			const json = await Util.loadJSON(url);
			console.log(json);

			// Update layout image format and pixelSize if provided in info.json
			//this.layout.suffix = json.format;
			//if (json.pixelSizeInMM) this.pixelSize = json.pixelSizeInMM;


			const basename = Util.basename(json.base_path);
			const basepath = Util.dirname(url);

			const avgpath = basepath + "/" + basename + "_avg.png";
			const dictpath = basepath + "/" + basename + "_dict.png";
			const idx00path = basepath + "/" + basename + "_idx_00.png ";
			const idx01path = basepath + "/" + basename + "_idx_01.png ";
			const coef00path = basepath + "/" + basename + "_coef_00.png ";
			const coef01path = basepath + "/" + basename + "_coef_01.png ";

			console.log("AVG PATH: ", avgpath);
			console.log("DICT PATH: ", dictpath);
			console.log("IDX00 PATH: ", idx00path);
			console.log("IDX01 PATH: ", idx01path);
			console.log("COEF00 PATH: ", coef00path);
			console.log("COEF01 PATH: ", coef01path);

			this.shader.init(dictpath, json);
			console.log("SHADER", this.shader);
			const urls = [];
			this.rasters = [];

			// AVG 
			urls.push(avgpath);
			const raster_avg = new Raster({ format: 'vec4', isLinear: true });
			this.rasters.push(raster_avg);

			// IDX00
			urls.push(idx00path);
			const raster_idx00 = new Raster({ format: 'vec4', isLinear: true });
			this.rasters.push(raster_idx00);

			// IDX01
			urls.push(idx01path);
			const raster_idx01 = new Raster({ format: 'vec4', isLinear: true });
			this.rasters.push(raster_idx01);

			// COEF00
			urls.push(coef00path);
			const raster_coef00 = new Raster({ format: 'vec4', isLinear: true });
			this.rasters.push(raster_coef00);

			// COEF01
			urls.push(coef01path);
			const raster_coef01 = new Raster({ format: 'vec4', isLinear: true });
			this.rasters.push(raster_coef01);

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
Layer.prototype.types['rsc'] = (options) => { return new LayerRSC(options); }

export { LayerRSC }
