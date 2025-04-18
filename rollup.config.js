const { terser } = require("rollup-plugin-terser");
const multi = require("@rollup/plugin-multi-entry");
const json = require("@rollup/plugin-json");
const pkg = require("./package.json");

function header() {
	const banner = [
    '// ##########################################',
    '// OpenLIME - Open Layered IMage Explorer',
    '// Author: CNR ISTI - Visual Computing Lab',
		'// Author: CRS4 Visual and Data-intensive Computing Group',
    `// ${pkg.name} v${pkg.version} - ${pkg.license} License`,
    `// Documentation: ${pkg.homepage}`,
		`// Repository: ${pkg.repository.url}`,
    '// ##########################################'
  ].join('\n');
	return {
		renderChunk(code) {
			return banner + "\n" + code;
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
	'./src/Raster16Bit.js',
	'./src/ShaderFilter.js',
	'./src/ShaderFilterColormap.js',
	'./src/ShaderFilterVector.js',
	'./src/ShaderFilterVectorGlyph.js',
	'./src/Shader.js',
	'./src/ShaderCombiner.js',
	'./src/ShaderEdgeDetection.js',
	'./src/ShaderAnisotropicDiffusion.js',
	'./src/Controller.js',
	'./src/Controller2D.js',
	'./src/ControllerPanZoom.js',
	'./src/PointerManager.js',
	'./src/Viewer.js',
	'./src/CoordinateSystem.js',
	'./src/BoundingBox.js',
	'./src/GeoreferenceManager.js',
	'./src/LayerMultispectral.js',
	'./src/ShaderMultispectral.js',
	'./src/MultispectralUI.js',
	'./src/LayerHDR.js',
	'./src/LayoutHDR.js',
	'./src/ShaderHDR.js'
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

const allModules = [...core, ...ui, ...rti, ...brdf, ...lens, ...annotation];

module.exports = [
	{
		input: {
			include: allModules,
		},
		output: [
			{
				format: 'umd',
				name: 'OpenLIME',
				file: 'dist/js/openlime.min.js',
				plugins: [terser(), header()],
				globals: {}
			},
			{
				format: 'umd',
				name: 'OpenLIME',
				file: 'dist/js/openlime.js',
				plugins: [header()],
				globals: {}
			},
			{
				format: 'es',
				file: 'dist/js/openlime.esm.js',
				plugins: [header()]
			},
			{
				format: 'cjs',
				file: 'dist/js/openlime.cjs.js',
				plugins: [header()]
			}
		],
		plugins: [multi(), json()]
	}
];
