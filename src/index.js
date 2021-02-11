import { OpenLIME } from './OpenLIME.js'
import { Raster } from './Raster.js'
import { Layer } from './Layer.js'
import { LayerImage } from './LayerImage.js'
import { LayerCombiner } from './LayerCombiner.js'
import { LayerRTI } from './LayerRTI.js'
import { LayerBRDF } from './LayerBRDF.js'
import { Controller2D } from './Controller2D.js'
import { UIBasic } from './UIBasic.js'

let lime = new OpenLIME('#openlime');

//combinerTest();
//imageTest('image');
//rtiTest('bln');
//brdfTest();
//tomeTest();

testUIBasic();


function testUIBasic() {
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


function rtiTest(dataset) {
	let layer0 = new Layer({ 
		layout: 'image', 
		type:'rti',
		url: 'assets/rti/' + dataset + '/info.json'
	});
	lime.canvas.addLayer('kdmap', layer0); 
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

	let combiner = new LayerCombiner({
		layers: [layer0, layer1]
	});

	lime.canvas.addLayer('kdmap', layer0);
	lime.canvas.addLayer('ksmap', layer1);
	lime.canvas.addLayer('combiner', combiner);
}



/* IMAGE TEST */
function imageTest(layout) {
	if (!layout)
		layout = 'image';

//	let options = { layout: layout, type: 'image', transform: { x: -100, a: 45 } };
	let options = { layout: layout, type: 'image'};
	console.log(options);
	switch (layout) {
		case 'image':
			options.url = 'assets/svbrdf/vis/glossMap.jpg';
			break;

		case 'deepzoom':
			options.url = 'assets/svbrdf/vis/ksMap.dzi';
			break;

		case 'google':
			options.width = 300;
			options.height = 553;
			options.url = 'assets/svbrdf/vis/kdMap';
			break;

		case 'zoomify':
			options.url = 'assets/svbrdf/vis/glossMap/ImageProperties.xml';
			break;
	}
	console.log(options);
	let layer0 = new Layer(options);
	lime.canvas.addLayer('kdmap', layer0);
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
}


lime.draw();
lime.canvas.camera.fit([-500, -500, +500, +500]);
lime.canvas.camera.fit([-500, -500, +500, +500], 1000);

//setTimeout(() => { lime.camera.fit([-150, -276, 150, 277], 200); }, 1000);



