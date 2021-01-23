import { OpenLIME} from './OpenLIME.js'
import { Raster } from './Raster.js'

let lime = new OpenLIME('#openlime');

let raster = new Raster('normal', 'assets/svbrdf/normalMap.dzi', { layout: 'deepzoom', 'ready': runDeepzoomTest } );


function runDeepzoomTest(event) {
	let url = raster.getTileURL(2, 0, 0);
	console.log(url);
}

console.log('raster loaded');


lime.draw();
