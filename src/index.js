import { Viewer } from './Viewer.js'
import { Layer } from './Layer.js'
import { LayoutTiles } from './LayoutTiles.js'
import { LayerImage } from './LayerImage.js'
import { LayerDstretch } from './LayerDstretch.js'
import { LayerCombiner } from './LayerCombiner.js'
import { ShaderCombiner } from './ShaderCombiner.js'
import { ControllerPanZoom } from './ControllerPanZoom.js'
import { UIBasic } from './UIBasic.js'
import { LayerLens } from './LayerLens.js'
import { Skin } from './Skin.js'
import { LayerAnnotation } from './LayerAnnotation.js'
import { LayerSvgAnnotation } from './LayerSvgAnnotation.js'
import { EditorSvgAnnotation } from './EditorSvgAnnotation.js'
import { LayerRTI } from './LayerRTI.js'
import { LayerNeuralRTI } from './LayerNeuralRTI.js'

let lime = new Viewer('.openlime', { background: 'black', canvas: { preserveDrawingBuffer: true} });

//dstretchTest();
//combinerTest();
//imageTest('google'); // image google deepzoom deepzoom1px zoomify iiif tarzoon itarzoom
//flipTest();
//brdfTest();
//rtiTest('rbf');
//tomeTest();
//testUIBasic();

//testUISvg();
//lensTest();
//testSVGAnnotations();

//testMedicalAnnotations();

//testAnnotationEditor();

testNeural();

function testNeural() {
	
	let layer0 = new Layer({
		type: 'neural',
		url: 'assets/neural/Nor_A1/info.json',
		layout: 'deepzoom',
		zindex: 0,
	});
	lime.canvas.addLayer('neural', layer0);
	let ui = new UIBasic(lime);
}


function dstretchTest() {
	console.log("Dstretching");

	let dstretch = new Layer({
		type: 'dstretch',
		layout: 'image',
		url: 'assets/dstretch/coin/plane_0.jpg'
	});

	lime.canvas.addLayer('dstretch', dstretch);
	let ui = new UIBasic(lime);
	ui.actions.light.active = true;
}

function testAnnotationEditor() {
	let layer0 = new Layer({ 
		label: 'Coin 10',
		layout: 'image', 
		type:'rti',
		url: 'assets/rti/hsh/info.json',
		normals: false
	});
	lime.canvas.addLayer('hsh', layer0);
	
	let layer1 = new LayerSvgAnnotation({ 
		label: 'Annotations',
		viewBox: "0 0 256 256",
		style:` 
			.openlime-annotation { pointer-events:all; opacity: 0.7; }
			.openlime-annotation:hover { cursor:pointer; opacity: 1.0; }
			
			:focus { fill:yellow; }
			polyline, path { fill:none; stroke-width:1; stroke:#800; vector-effect:non-scaling-stroke; pointer-events:all; }
			polyline, path:hover { cursor:pointer; stroke:#f00; }

			rect { fill:rgba(255, 0, 0, 0.2); stroke:rgba(127, 0, 0, 0.7); vector-effect:non-scaling-stroke;}
			circle { fill:rgba(255, 0, 0, 0.2); stroke:#800; stroke-width:1px; vector-effect:non-scaling-stroke; }
			circle.point { stroke-width:10px }
			.selected { fill:#ffaaaa; stroke:$ff0000 }
		`,
		infoTemplate: (annotation) => { return `
			<h3>${annotation.class}</h3>
			<p>${annotation.description}</p>
			
		`; },
		annotations: 'assets/medical/PH1101-1.json',
		editable: true,

	}); 
	lime.canvas.addLayer('anno', layer1); //here the overlayelement created and attached to layer1
	Skin.setUrl('skin/skin.svg');

	let editor = new EditorSvgAnnotation(lime, layer1, { lime: lime });
	editor.classes = {
		'': { color: '#000', label: '' },
		'class1': { color: '#770', label: '' },
		'class2': { color: '#707', label: '' },
		'class3': { color: '#777', label: '' },
		'class4': { color: '#070', label: '' },
		'class5': { color: '#007', label: '' },
		'class6': { color: '#077', label: '' },
	};
	
	let ui = new UIBasic(lime);
	lime.camera.maxFixedZoom = 4;
	ui.actions.help.display = true;
	ui.actions.help.html = "Help text could be here.";
	ui.actions.snapshot.display = true;


	editor.createCallback = (annotation) => { console.log("Created annotation: ", annotation); return true; };
	editor.deleteCallback = (annotation) => { console.log("Deleted annotation: ", annotation); return true; };
	editor.updateCallback = (annotation) => { console.log("Updated annotation: ", annotation); return true; };

	editor.multiple = true;
	
}

function testMedicalAnnotations() {
	let layer0 = new Layer({
		type: 'image',
		url: 'https://ome-digipath-demo.crs4.it/ome_seadragon/deepzoom/get/7.dzi',
		layout: 'deepzoom1px',
		zindex: 0,
	});

	let layer1 = new LayerSvgAnnotation({ 
		layout: layer0.layout,
		style:` 
			.openlime-annotation { pointer-events:all; opacity: 0.7; }
			.openlime-annotation:hover { cursor:pointer; opacity: 1.0; }
			
			path { fill:none; stroke-width:1; stroke:#800; vector-effect:non-scaling-stroke; pointer-events:all; }
			path:hover { cursor:pointer; stroke:#f00; }

			rect { fill:rgba(255, 0, 0, 0.2); stroke:rgba(127, 0, 0, 0.7); vector-effect:non-scaling-stroke;}
			circle { fill:rgba(255, 0, 0, 0.2); stroke:#800; stroke-width:1px; vector-effect:non-scaling-stroke; }

			.selected { fill:#ffaaaa; stroke:$ff0000 }
		`,
		infoTemplate: (annotation) => { return `
			<h3>${annotation.class}</h3>
			<p>${annotation.description}</p>
			
		`; },
		annotations: 'assets/medical/PH1101-1.json',
		editable: true,

	}); 

	lime.canvas.addLayer('img', layer0);
	lime.canvas.addLayer('anno', layer1);
	let ui = new UIBasic(lime);
	ui.panzoom.zoomAmount = 2.0;
}

	
function testSVGAnnotations() {
	let layer0 = new Layer({
		type: 'image',
		url: 'assets/svbrdf/vis/kdMap.jpg',
		layout: 'image',
		zindex: 0,
		transform: { x: 0, y: 0, z: 1.2, a: 0 },
	});

	let layer1 = new LayerAnnotation({ 
		layout: layer0.layout,
		svgURL: 'assets/svbrdf/vis/annotations.svg',
		style:` 
			.openlime-annotation { pointer-events:all; opacity: 0.7; }
			.openlime-annotation:hover { cursor:pointer; opacity: 1.0; }
		`,
		annotations: { aura: {}, sun: {} },
		transform: { x: 0, y: 0, z: 1.2, a: 0 },
	}); 

	lime.canvas.addLayer('img', layer0);
	lime.canvas.addLayer('anno', layer1);
	let ui = new UIBasic(lime);
	// const { home, fullscreen, rotate } = ui.actions;
	// ui.actions = { home, fullscreen, rotate };
	// ui.actions.zoomin = { title: "Zoom in", task: (event) => { lime.camera.deltaZoom(1000, 2, 0, 0); } }; //actions can be modified just after ui creation (not later!)
}

function testUIBasic() {
	tomeTest();
	let ui = new UIBasic(lime, { skin: null });
}


function testUISvg() {
	tomeTest();
	let ui = new UIBasic(lime);
}


function tomeTest() {
	let layer0 = new Layer({ 
		layout: 'deepzoom', 
		type:'rti',
		url: 'assets/rti/tome/info.json'
	});
	lime.canvas.addLayer('tome', layer0); 
	layer0.setLight([0.4, 0.4], 2000);
	setTimeout(() => { 
		layer0.setLight([-1, 0], 2000); 
	}, 2000); 
}


function flipTest() {
	let layer0 = new Layer({ 
		layout: 'image', 
		type:'rti',
		url: 'assets/rti/bln/info.json'
	});
	lime.canvas.addLayer('bln', layer0); 

	let layer1 = new Layer({ 
		layout: 'image', 
		type:'rti',
		url: 'assets/rti/ptm/info.json'
	});
	layer1.visible = false;
	//layer0.transform.x = -1000;
	lime.canvas.addLayer('ptm', layer1); 
	
	let ui = new UIBasic(lime);
	ui.actions.flip = { title: 'Flip', display: true,  task: (event) => { 
		layer0.setVisible(!layer0.visible);
		layer1.setVisible(!layer1.visible);
		lime.redraw();
	}
	};
	ui.actions.light.active = true;
	lime.camera.maxFixedZoom = 1;
	
	//ui.actions.light.display = true;
	//const { home, fullscreen, rotate } = ui.actions;
	//ui.actions = { home, fullscreen, rotate };
	
//	setTimeout(() => { layer0.shader.setLight([0.4, 0.4, Math.sqrt(0.68)], ); lime.canvas.emit('update'); }, 2000);
}


function rtiTest(dataset) {

	let layer0 = new Layer({ 
		label: '4',
		layout: 'deepzoom',
		type:'rti',
		url: 'assets/rti/hsh/info.json',
		normals: false
	});
	lime.canvas.addLayer('coin', layer0);

	// let layer0 = new Layer({ 
	// 	layout: 'image', 
	// 	type:'rti',
	// 	url: 'assets/rti/hsh/info.json',
	// 	normals: true
	// });
	// //layer0.transform.x = -200;
	// lime.canvas.addLayer('hsh', layer0); 


	/*let layer1 = new Layer({ 
		layout: 'image', 
		type:'rti',
		url: 'assets/rti/ptm/info.json'
	});
	layer1.transform.x = +200;
	lime.canvas.addLayer('ptm', layer1);  */



	let ui = new UIBasic(lime);
	lime.camera.maxFixedZoom = 4;
	ui.menu[0].section = "Prova";
	ui.menu.push({ html: "<p>Prova</p>" });
	ui.scale = 0.002;
	// ui.actions.light.display = true;
	//const { home, fullscreen, rotate } = ui.actions;
	//ui.actions = { home, fullscreen, rotate };
	ui.actions.rotate.display = true;
	
//	setTimeout(() => { layer0.shader.setLight([0.4, 0.4, Math.sqrt(0.68)], ); lime.canvas.emit('update'); }, 2000);
}


/* COMBINER TEST */
function combinerTest() {

	let layer0 = new Layer({
		type: 'image',
		url: './assets/lighthouse/image/lighthouse-kdmap.jpg',
		layout: 'image',
		zindex: 0,
		transform: { x: 100, y: 0, z: 1, a: 0 },
		visible: false
	});

	let layer1 = new Layer({
		type: 'image',
		url: './assets/lighthouse/image/lighthouse-nomap.jpg',
		layout: 'image',
		zindex: 0,
		transform: { x: 0, y: 0, z: 1, a: 0 },
		visible: false
	});

	let combiner = new LayerCombiner({
		layers: [layer0, layer1]
	});

	let shader = new ShaderCombiner();
	shader.mode = 'diff';

	combiner.shaders = {'standard': shader };
	combiner.setShader('standard'); 

	let panzoom = new ControllerPanZoom(lime.camera, { priority: -1000 });
	lime.pointerManager.onEvent(panzoom); //register wheel, doubleclick, pan and pinch

	lime.canvas.addLayer('kdmap', layer0);
	lime.canvas.addLayer('ksmap', layer1);
	lime.canvas.addLayer('combiner', combiner);

	let ui = new UIBasic(lime);
	ui.actions.snapshot.display = true;
}

/* COMBINER TEST */
function lensTest() {

	// let layer0 = new Layer({
	// 	type: 'brdf',
	// 	channels: {
	// 		'kd': 'assets/nivola_mural_cropped_brdf/nivola_mural_cropped_kd.tzi',
	// 		'ks': 'assets/nivola_mural_cropped_brdf/nivola_mural_cropped_ks.tzi',
	// 		'normals': 'assets/nivola_mural_cropped_brdf/nivola_mural_cropped_n.tzi',
	// 		'gloss': 'assets/nivola_mural_cropped_brdf/nivola_mural_cropped_gm.tzi'
	// 	},
	// 	colorspaces: {
	// 		'kd': 'linear',
	// 		'ks': 'linear'
	// 	},
	// 	layout: 'tarzoom',
		
	// 	transform: { x: 0, y: 0, z: 1, a: 0 },
	// });

	let layer0 = new Layer({
		type: 'image',
		url: 'assets/svbrdf/vis/kdMap.jpg',
		layout: 'image',
		zindex: 0,
		transform: { x: 0, y: 0, z: 1, a: 0 },
		visible: false
	});

	let lensLayer = new LayerLens({
		layers: [layer0],
		camera: lime.camera,
		radius:50,
		border:10
	});

	lime.camera.bounded = false;
	const controllerLens = new OpenLIME.ControllerLens({
		lensLayer: lensLayer,
		camera: lime.camera,
		hover: true,
		priority: 0
	});

	lime.pointerManager.onEvent(controllerLens); 
	lensLayer.controllers.push(controllerLens);

	let cameraCtrl = new ControllerPanZoom(lime.camera, { priority: -1000 });
	lime.camera.setPosition(1000,0,0,1,0);
	lime.pointerManager.onEvent(cameraCtrl); //register wheel, doubleclick, pan and pinch
	lime.camera.maxFixedZoom = 4;

	lime.canvas.addLayer('kdmap', layer0);
	lime.canvas.addLayer('lens', lensLayer);
	//let ui = new UIBasic(lime);

}

/* IMAGE TEST */
function imageTest(layout) {
	if (!layout)
		layout = 'deepzoom';

//	let options = { layout: layout, type: 'image', transform: { x: -100, a: 45 } };
	let options = { layout: layout, type: 'image'};
	console.log("OPTIONS: ", options);
	switch (layout) {
		case 'image':
			options.url = 'assets/lime/image/lime.jpg';
//			options.url = 'http://dev.isti.cnr.it/iipsrv/iipsrv.fcgi?IIIF=/home/ponchio/Sync/html/cenobium/sites/monreale/tif/N1ShNWNW.tif/2048,0,1952,2048/244.875,256/0/default.jpg';
			break;

			case 'deepzoom1px':
				options.url = 'assets/lime/deepzoom1px/lime.dzi';
			break;	
			case 'deepzoom':
				//options.url = 'https://ome-digipath-demo.crs4.it/ome_seadragon/deepzoom/get/7.dzi'; //'assets/svbrdf/vis/ksMap.dzi';
				//options.url = 'https://openseadragon.github.io/example-images/highsmith/highsmith.dzi'; //'assets/svbrdf/vis/ksMap.dzi';
			break;

		// case 'google':
		// 	options.width = 3184;
        //     options.height = 2024;
        //     options.url = 'assets/lime/google/lime';
		// 	break;

		case 'google':
			const l=19;
			options.width = Math.pow(2, l+8);
			options.height = Math.pow(2, l+8);
			options.mipmapBias = 0.4;
			options.url= 'http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
			//options.url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
			break;

		case 'zoomify':
			options.url = 'assets/lime/zoomify/lime/ImageProperties.xml';
			break;

		case 'iiif':
			//options.url = 'https://merovingio.c2rmf.cnrs.fr/fcgi-bin/iipsrv.fcgi?IIIF=PIA03883.pyr.tif/info.json';
			//options.url = 'https://merovingio.c2rmf.cnrs.fr/fcgi-bin/iipsrv.fcgi?IIIF=HD3/HD3_pyr_000_090.tif/info.json';
			options.url = 'http://dev.isti.cnr.it/iipsrv/iipsrv.fcgi?IIIF=/home/ponchio/Sync/html/cenobium/sites/monreale/tif/N1ShNWNW.tif/info.json';
			break;

		case 'tarzoom':
			options.url = 'assets/lime/tarzoom/lime.tzi';
			break;

		case 'itarzoom':
			//options.url = 'assets/rti/hsh/planes.tzi';
			break;
		
	}
	let layer0 = new Layer(options);
	lime.canvas.addLayer('kdmap', layer0);

	let ui = new UIBasic(lime);

	setTimeout(() => { 
		console.log(layer0);
		lime.removeLayer('kdmap');
	}, 3000);
	setTimeout(() => {
		console.log(layer0);
		lime.addLayer('kdmap', layer0);
	}, 6000);

}


/* BRDF TEST */
function brdfTest() {
	let brdf = new Layer({
		type: 'brdf',
		channels: {
			'kd': 'assets/svbrdf/vis/kdMap.jpg',
			'ks': 'assets/svbrdf/vis/ksMap.jpg',
			'normals': 'assets/svbrdf/normalMap.jpg',
			'gloss': 'assets/svbrdf/vis/glossMap.jpg'
		},
		colorspaces: {
			'kd': 'linear',
			'ks': 'linear'
		},
		layout: 'image',
	});

	lime.canvas.addLayer('brdf', brdf);
	let ui = new UIBasic(lime);

}


lime.draw();

//setTimeout(() => { lime.camera.fit([-150, -276, 150, 277], 200); }, 1000);



