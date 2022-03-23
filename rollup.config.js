import { terser } from "rollup-plugin-terser"
import multi from '@rollup/plugin-multi-entry'

function header() {
	return {

		renderChunk(code) {
			return "//license \n" + code;
		}
	};

}

const core = [
	'./src/Canvas.js', 
	'./src/Camera.js',
	'./src/Transform.js',
	'./src/Layer.js',
	'./src/LayerImage.js',
	'./src/LayerCombiner.js',
	'./src/Layout.js',
	'./src/Raster.js',
	'./src/Shader.js',
	'./src/ShaderCombiner.js',
	'./src/Controller.js',
	'./src/Controller2D.js',
	'./src/ControllerPanZoom.js',
	'./src/PointerManager.js',
	'./src/Viewer.js',
];

const ui = [
	'./src/Skin.js',
	'./src/UIBasic.js'
];

const lens = [
	'./src/LayerLens.js',
	'./src/ControllerLens.js',
	'./src/ControllerFocusContext.js'
];

const rti = [
	'./src/LayerRTI.js'
];

const brdf = [
	'./src/LayerBRDF.js'
];

const annotation = [
	'./src/LayerAnnotation.js',
	'./src/LayerSvgAnnotation.js',
	'./src/EditorSvgAnnotation.js'
];

export default [
	{
		input: {
			include: [...core, ...ui, ...rti, ...brdf, ...lens, ...annotation],		
		},
		output: [{
			format: 'umd',
			name: 'OpenLIME',
			file: 'dist/js/openlime.min.js',
			plugins: [terser()],
			globals: {}
		},
		{
			format: 'umd',
			name: 'OpenLIME',
			file: 'dist/js/openlime.js',
			globals: {}
		}],
		plugins: [multi()]
	}
];
