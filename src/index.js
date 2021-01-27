import { OpenLIME} from './OpenLIME.js'
import { Raster } from './Raster.js'
import { Layer } from './Layer.js'
import { ImageLayer } from './ImageLayer.js'

let lime = new OpenLIME('#openlime');

//let raster = new Raster('assets/svbrdf/normalMap.dzi', { layout: 'deepzoom', 'ready': runDeepzoomTest, type: 'rgb', attribute:'normals' } );

let layer = new Layer({ type:'image', url: 'assets/svbrdf/vis/kdMap.jpg', layout: 'image', zindex:0 });
//let layer1 = new Layer({ type:'image', url: 'prova/', layout: 'image', zindex:1 });
lime.canvas.addLayer('icon', layer);
//lime.canvas.addLayer('lime', layer1);

lime.draw();


