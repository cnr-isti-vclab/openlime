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
	'./src/Util.js',
	'./src/Canvas.js', 
	'./src/Camera.js',
	'./src/Transform.js',
	'./src/Colormap.js',
	'./src/Layer.js',
	'./src/LayerImage.js',
	'./src/LayerCombiner.js',
	'./src/LayerAnnotationImage.js',
	'./src/LayerMaskedImage.js',
	'./src/Tile.js',
	'./src/Layout.js',
	'./src/LayoutTiles.js',
	'./src/LayoutTileImages.js',
	'./src/Raster.js',
	'./src/ShaderFilter.js',
	'./src/ShaderFilterColormap.js',
	'./src/ShaderFilterVector.js',
	'./src/ShaderFilterVectorGlyph.js',
	'./src/Shader.js',
	'./src/ShaderCombiner.js',
	'./src/Controller.js',
	'./src/Controller2D.js',
	'./src/ControllerPanZoom.js',
	'./src/PointerManager.js',
	'./src/Viewer.js',
	'./src/CoordinateSystem.js',
	'./src/BoundingBox.js',
];

const ui = [
	'./src/Skin.js',
	'./src/UIBasic.js',
	'./src/Ruler.js',
	'./src/ScaleBar.js',
	'./src/Draggable.js',
	'./src/LightSphereController.js'

];

const lens = [
	'./src/LayerLens.js',
	'./src/ControllerLens.js',
	'./src/FocusContext.js',
	'./src/ControllerFocusContext.js',
	'./src/LensDashboard.js',
	'./src/LensDashboardNavigator.js',
	'./src/LensDashboardNavigatorRadial.js',
];

const rti = [
	'./src/LayerRTI.js',
	'./src/ShaderRTI.js',
	'./src/LayerNeuralRTI.js',
	'./src/ShaderNeural.js'
];

const brdf = [
	'./src/LayerBRDF.js',
	'./src/ShaderBRDF.js'
];

const annotation = [
	'./src/AudioPlayer.js',
	'./src/TextToSpeechPlayer.js',
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
