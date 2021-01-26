import { OpenLIME} from './OpenLIME.js'
import { Raster } from './Raster.js'
import { Layer } from './Layer.js'
import { ImageLayer } from './ImageLayer.js'

let lime = new OpenLIME('#openlime');

let raster = new Raster('assets/svbrdf/normalMap.dzi', { layout: 'deepzoom', 'ready': runDeepzoomTest, type: 'rgb', attribute:'normals' } );


function runDeepzoomTest(event) {
	let url = raster.getTileURL(2, 0, 0);
	console.log(url);
}

let layer = new Layer({ type:'image', url: 'prova/', layout: 'image', zindex:0 });
let layer1 = new Layer({ type:'image', url: 'prova/', layout: 'image', zindex:1 });
console.log(lime.canvas);
lime.canvas.layers['test'] = layer;
lime.canvas.layers['test1'] = layer1;

lime.draw();


