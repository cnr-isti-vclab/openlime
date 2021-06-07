import { OpenLIME } from './OpenLIME.js'
import { Raster } from './Raster.js'
import { Layer } from './Layer.js'
import { ImageLayer } from './ImageLayer.js'
import { CombinerLayer } from './CombinerLayer.js'
import { RTILayer } from './RTILayer.js'
import { BRDFLayer } from './BRDFLayer.js'
import { Controller2D } from './Controller2D.js'
import { ControllerPanZoom } from './ControllerPanZoom.js'
import {ControllerLens} from './ControllerLens.js'
import { UIBasic } from './UIBasic.js'
import { LensLayer } from './LensLayer.js'
import { Lens } from './Lens.js'
import { AnnotationLayer } from './AnnotationLayer.js'

let lime = new OpenLIME('#openlime', { background: 'black' });

//combinerTest();
//imageTest('deepzoom');
//flipTest();
//brdfTest();
//rtiTest('rbf');
//tomeTest();
//testUIBasic();

//testUISvg();
//lensTest();
//testSVGAnnotations();

testMedicalAnnotations();

function testMedicalAnnotations() {
	let layer0 = new Layer({
		type: 'image',
		url: 'https://ome-digipath-demo.crs4.it/ome_seadragon/deepzoom/get/7.dzi',
		layout: 'deepzoom1px',
		zindex: 0,
	});

	let layer1 = new AnnotationLayer({ 
		viewBox: "0 0 47962 53040",
		style:` 
			.openlime-annotation { pointer-events:all; opacity: 0.7; }
			.openlime-annotation:hover { cursor:pointer; opacity: 1.0; }
			path { fill:none; stroke-width:1; stroke:#800; vector-effect:non-scaling-stroke; pointer-events:all; }
			path:hover { cursor:pointer; stroke:#f00; }

			rect { fill:rgba(255, 0, 0, 0.2); stroke:rgba(127, 0, 0, 0.7); vector-effect:non-scaling-stroke;}
			circle { fill:red; stroke:#800; stroke-width:1px; vector-effect:non-scaling-stroke; }

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
}

	
function testSVGAnnotations() {
	let layer0 = new Layer({
		type: 'image',
		url: 'assets/svbrdf/vis/kdMap.jpg',
		layout: 'image',
		zindex: 0,
		transform: { x: 0, y: 0, z: 1.2, a: 0 },
	});

	let layer1 = new AnnotationLayer({ 
		viewBox: "0 0 300 553",
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
	const { home, fullscreen, rotate } = ui.actions;
	ui.actions = { home, fullscreen, rotate };
	ui.actions.zoomin = { title: "Zoom in", task: (event) => { lime.camera.deltaZoom(1000, 2, 0, 0); } }; //actions can be modified just after ui creation (not later!)
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
		layout: 'image', 
		type:'rti',
		url: 'assets/rti/hsh/info.json',
		normals: true
	});
	//layer0.transform.x = -200;
	lime.canvas.addLayer('hsh', layer0); 


	/*let layer1 = new Layer({ 
		layout: 'image', 
		type:'rti',
		url: 'assets/rti/ptm/info.json'
	});
	layer1.transform.x = +200;
	lime.canvas.addLayer('ptm', layer1);  */



	let ui = new UIBasic(lime);
	lime.camera.maxFixedZoom = 1;
	ui.menu[0].section = "Prova";
	ui.menu.push({ html: "<p>Prova</p>" });
	ui.scale = 0.002;
	//ui.actions.light.display = true;
	//const { home, fullscreen, rotate } = ui.actions;
	//ui.actions = { home, fullscreen, rotate };
	
//	setTimeout(() => { layer0.shader.setLight([0.4, 0.4, Math.sqrt(0.68)], ); lime.canvas.emit('update'); }, 2000);
}


/* COMBINER TEST */
function combinerTest() {

	let layer0 = new Layer({
		type: 'image',
		url: 'assets/svbrdf/vis/kdMap.jpg',
		layout: 'image',
		zindex: 0,
		transform: { x: 100, y: 0, z: 1, a: 0 },
		visible: false
	});

	let layer1 = new Layer({
		type: 'image',
		url: 'assets/svbrdf/vis/ksMap.jpg',
		layout: 'image',
		zindex: 0,
		transform: { x: 0, y: 0, z: 1, a: 0 },
		visible: false
	});

	let combiner = new CombinerLayer({
		layers: [layer0, layer1]
	});

	lime.canvas.addLayer('kdmap', layer0);
	lime.canvas.addLayer('ksmap', layer1);
	lime.canvas.addLayer('combiner', combiner);
}

/* COMBINER TEST */
function lensTest() {

	let layer0 = new Layer({
		type: 'image',
		url: 'assets/svbrdf/vis/kdMap.jpg',
		layout: 'image',
		zindex: 0,
		transform: { x: 0, y: 0, z: 0.5, a: 0 },
		visible: false
	});

	let lensLayer = new LensLayer({
		layers: [layer0],
		camera: lime.camera,
		x:0, 
		y:0,
		radius:150,
		border:10
	});

	let controllerLens = new ControllerLens({lensLayer: lensLayer,
											camera: lime.camera,
											hover: true,
											priority: 0});
	lime.pointerManager.onEvent(controllerLens); 
	lensLayer.controllers.push(controllerLens);


	
	// let ui = new UIBasic(lime);
	// const { home, fullscreen, rotate } = ui.actions;
	// ui.actions = { home, fullscreen, rotate };

	let panzoom = new ControllerPanZoom(lime.camera, { priority: -1000 });
	lime.pointerManager.onEvent(panzoom); //register wheel, doubleclick, pan and pinch

	lime.canvas.addLayer('kdmap', layer0);
	lime.canvas.addLayer('lens', lensLayer);
}




/* IMAGE TEST */
function imageTest(layout) {
	if (!layout)
		layout = 'deepzoom';

//	let options = { layout: layout, type: 'image', transform: { x: -100, a: 45 } };
	let options = { layout: layout, type: 'image'};
	console.log(options);
	switch (layout) {
		case 'image':
			options.url = 'assets/svbrdf/vis/glossMap.jpg';
			break;

		case 'deepzoom':
			options.url = 'https://ome-digipath-demo.crs4.it/ome_seadragon/deepzoom/get/7.dzi'; //'assets/svbrdf/vis/ksMap.dzi';
			break;

		case 'google':
			options.width = 300;
			options.height = 553;
			options.url = 'assets/svbrdf/vis/kdMap';
			break;

		case 'zoomify':
			options.url = 'assets/svbrdf/vis/glossMap/ImageProperties.xml';
			break;

		case 'iiif':
			options.url = 'https://merovingio.c2rmf.cnrs.fr/fcgi-bin/iipsrv.fcgi?IIIF=PIA03883.pyr.tif/info.json';
			break;
	}
	let layer0 = new Layer(options);
	lime.canvas.addLayer('kdmap', layer0);
	let ui = new UIBasic(lime);
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



