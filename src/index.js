import { OpenLIME} from './OpenLIME.js'
import { Raster } from './Raster.js'
import { Layer } from './Layer.js'
import { LayerImage } from './LayerImage.js'
import { LayerCombiner } from './LayerCombiner.js'

let lime = new OpenLIME('#openlime');

//let raster = new Raster('assets/svbrdf/normalMap.dzi', { layout: 'deepzoom', 'ready': runDeepzoomTest, type: 'rgb', attribute:'normals' } );

let layer = new Layer({ 
	type:'image',
	url: 'assets/svbrdf/vis/ksMap.jpg',
	layout: 'image',
	zindex:0,
	transform: {x:0, y:0, z:1, a:0 },
	visible:false
});

let layer1 = new Layer({ 
	type:'image',
	url: 'assets/svbrdf/vis/kdMap.jpg',
	layout: 'image',
	zindex:0,
	transform: {x:0, y:0, z:1, a:0 },
	visible:false
});

let combiner = new LayerCombiner({
	layers: [layer, layer1 ]
});

//let layer1 = new Layer({ type:'image', url: 'prova/', layout: 'image', zindex:1 });
lime.canvas.addLayer('icon', layer);
lime.canvas.addLayer('lime', layer1);
lime.canvas.addLayer('combiner', combiner);



lime.draw();
lime.canvas.camera.fit([100, 100, 500, 500]);

setTimeout(() => { lime.fit([-150, -276, 150, 277], 100); }, 1000);
//setTimeout(() => { lime.fit([0, 0, 200, 200], 2000); }, 2000);


