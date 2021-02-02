import { OpenLIME} from './OpenLIME.js'
import { Raster } from './Raster.js'
import { Layer } from './Layer.js'
import { LayerImage } from './LayerImage.js'
import { LayerCombiner } from './LayerCombiner.js'

let lime = new OpenLIME('#openlime');



//combinerTest();
imageTest('deepzoom');



/* COMBINER TEST */
function combinerTest() {

	let layer0 = new Layer({ 
		type:'image',
		url: 'assets/svbrdf/vis/kdMap.jpg',
		layout: 'image',
		zindex:0,
		transform: {x:100, y:0, z:1, a:0 },
		visible:false
	});

	let layer1 = new Layer({ 
		type:'image',
		url: 'assets/svbrdf/vis/ksMap.jpg',
		layout: 'image',
		zindex:0,
		transform: {x:0, y:0, z:1, a:0 },
		visible:false
	});

	let combiner = new LayerCombiner({
		layers: [layer0, layer1 ]
	});
	lime.canvas.addLayer('kdmap', layer0);
	lime.canvas.addLayer('ksmap', layer1);
	lime.canvas.addLayer('combiner', combiner);
}



/* IMAGE TEST */
function imageTest(layout) {
	if(!layout)
		layout = 'image';

	let options = { layout: layout, type:'image', transform: { x: -100, a:45 } };
	console.log(options);
	switch(layout) {
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
		type:'brdf',
		channels: {
			'kd':      'assets/svbrdf/vis/kdMap.jpg',
			'ks':      'assets/svbrdf/vis/ksMap.jpg',
			'normals': 'assets/svbrdf/normalMap_rotated.jpg',
			'gloss':   'assets/svbrdf/vis/glossMap.jpg'
		},
		layout: 'image',
	}); 

	lime.canvas.addLayer('brdf', brdf);
}


lime.draw();
lime.canvas.camera.fit([-500, -500, +500, +500]);
lime.canvas.camera.fit([-500, -500, +500, +500], 1000);

setTimeout(() => { lime.fit([-150, -276, 150, 277], 200); }, 1000);



