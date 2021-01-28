
/**
 * @param {string|Object} url URL of the image or the tiled config file, 
 * @param {string} type select one among: <image, {@link https://www.microimages.com/documentation/TechGuides/78googleMapsStruc.pdf google}, {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN deepzoom}, {@link http://www.zoomify.com/ZIFFileFormatSpecification.htm zoomify}, {@link https://iipimage.sourceforge.io/ iip}, {@link https://iiif.io/api/image/3.0/ iiif}>
 */
class Layout {
	constructor(url, type) {
		Object.assign(this, {
			type: type,
			width:1,
			height: 1,
			tilesize: 256,
			overlap: 0, 
			nlevels: 1,        //level 0 is the top, single tile level.
			ntiles: 1,         //tot number of tiles
			suffix: 'jpg',
			qbox: [],          //array of bounding box in tiles, one for mipmap 
			bbox: [],          //array of bounding box in pixels (w, h)

			signals: { ready: [] },          //callbacks when the layout is ready.
			status: null
		});

		if(typeof(url) == 'string') {
			this.url = url;
			let callback = () => {
				this.ntiles = this.initBoxes();
				this.status = 'ready';
				this.emit('ready');
			}

			switch(this.type) {
				case 'image':    this.initImage(callback); break;
				case 'google':   this.initGoogle(callback); break;
				case 'deepzoom': this.initDeepzoom(callback); break;
			}
			return;
		}

		if(typeof(url) == 'object')
			Object.assign(this, url);
	}

	addEvent(event, callback) {
		this.signals[event].push(callback);
	}

	emit(event) {
		for(let r of this.signals[event])
			r(this);
	}

	boundingBox() {
		return [-width/2, -height/2, width/2, height/2];
	}

/**
 *  Each tile is assigned an unique number.
 */

	index(level, x, y) {
		var startindex = 0;
		for(var i = this.nlevels-1; i > level; i--) {
			startindex += this.qbox[i][2]*this.qbox[i][3];
		}
		return startindex + y*this.qbox[level][2] + x;
	}

/*
 * Compute all the bounding boxes (this.bbox and this.qbox).
 * @return number of tiles in the dataset
*/

	initBoxes() {
		this.qbox = []; //by level (0 is the bottom)
		this.bbox = [];
		var w = this.width;
		var h = this.height;

		if(this.type == 'image') {
			this.qbox[0] = [0, 0, 1, 1];
			this.bbox[0] = [0, 0, w, h];
			return 1;
		}

		var count = 0;
		for(var level = this.nlevels - 1; level >= 0; level--) {
			var ilevel = this.nlevels -1 - level;
			this.qbox[ilevel] = [0, 0, 0, 0];
			this.bbox[ilevel] = [0, 0, w, h];
			for(var y = 0; y*this.tilesize < h; y++) {
				this.qbox[ilevel][3] = y+1;
				for(var x = 0; x*this.tilesize < w; x ++) {
					count++;
					this.qbox[ilevel][2] = x+1;
				}
			}
			w >>>= 1;
			h >>>= 1;
		}
		return count;
	}


/** Return the coordinates of the tile (in [0, 0, w h] image coordinate system) and the texture coords associated. 
 *
 */
	tileCoords(level, x, y) {
		let w = this.width;
		let h = this.height;
		var tcoords = new Float32Array([0, 0,     0, 1,     1, 1,     1, 0]);

		if(this.type == "image") {
			return { 
				coords: new Float32Array([-w/2, -h/2, 0,  -w/2, h/2, 0,  w/2, h/2, 0,  w/2, -h/2, 0]),
//				coords: new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]),
				tcoords: tcoords 
			};
		}

		let coords = new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]);


		let side =  this.tilesize*(1<<(level)); //tile size in imagespace
		let tx = side;
		let ty = side;

		if(this.layout != "google") {  //google does not clip border tiles
			if(side*(x+1) > this.width) {
				tx = (this.width  - side*x);
			}
			if(side*(y+1) > this.height) {
				ty = (this.height - side*y);
			}
		}

		var lx  = this.qbox[level][2]-1; //last tile x pos, if so no overlap.
		var ly  = this.qbox[level][3]-1;

		var over = this.overlap;
		if(over) {
			let dtx = over / (tx/(1<<level) + (x==0?0:over) + (x==lx?0:over));
			let dty = over / (ty/(1<<level) + (y==0?0:over) + (y==ly?0:over));

			tcoords[0] = tcoords[2] = (x==0? 0: dtx);
			tcoords[1] = tcoords[7] = (y==0? 0: dty);
			tcoords[4] = tcoords[6] = (x==lx? 1: 1 - dtx);
			tcoords[3] = tcoords[5] = (y==ly? 1: 1 - dty);
		}
		for(let i = 0; i < coords.length; i+= 3) {
			coords[i]   = coords[i]  *tx + size*x - this.width/2;
			coords[i+1] = coords[i+1]*ty + size*y + this.height/2;
		}

		return { coords: coords, tcoords: tcoords }
	}


/**
 * Given a viewport and a transform computes the tiles needed for each level.
 * @param {array} viewport array with left, bottom, width, height
 * @param {border} border is radius (in tiles units) of prefetch
 * @returns {object} with level: the optimal level in the pyramid, pyramid: array of bounding boxes in tile units.
 */
	neededBox(viewport, transform, border) {
		if(this.layout == "image")
			return { level:0, box: [[0, 0, 1, 1]] };

		var minlevel = Math.max(0, Math.min(Math.floor(Math.log2(transform.z) + this.mipmapbias), this.nlevels-1));


		var pyramid = [];
		for(var level = this.nlevels-1; level >= minlevel; level--) {
			var bbox = this.getIBox(viewport, transform); //thats the reverse.
			var side = this.tilesize*Math.pow(2, level);

			//quantized bbox
			var qbox = [
				Math.floor((bbox[0])/side),
				Math.floor((bbox[1])/side),
				Math.floor((bbox[2]-1)/side) + 1,
				Math.floor((bbox[3]-1)/side) + 1];

			//clamp!
			qbox[0] = Math.max(qbox[0]-border, this.qbox[level][0]);
			qbox[1] = Math.max(qbox[1]-border, this.qbox[level][1]);
			qbox[2] = Math.min(qbox[2]+border, this.qbox[level][2]);
			qbox[3] = Math.min(qbox[3]+border, this.qbox[level][3]);
			pyramid[level] = qbox;
		}
		return { level:minlevel, pyramid: pyramid };
	}



	getTileURL(url, level, x, y) {
		throw Error("Layout not defined or ready.");
	}



	initImage() {
	}

/*
 * Witdh and height can be recovered once the image is downloaded.
*/
	initImage(callback) {
		this.nlevels = 1;
		this.tilesize = 0;
		this.getTileURL = (url, x, y, level) => { return url; }
		callback();
	}

/**
 *  url points to the folder (without /)
 *  width and height must be defined
 */
	initGoogle(callback) {
		if(!this.width || !this.height)
			throw "Google rasters require to specify width and height";

		this.tilesize = 256;
		this.overlap = 0;

		let max = Math.max(this.width, this.height)/this.tilesize;
		this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

		this.getTileURL = (url, x, y, level) => {
			var ilevel = parseInt(this.nlevels - 1 - level);
			return url + "/" + ilevel + "/" + y + "/" + x + '.' + this.suffix;
		};
		callback();
	}


/**
 * Expects the url to point to .dzi config file
 */
	initDeepzoom(callback) {
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let text = await response.text();
			let xml = (new window.DOMParser()).parseFromString(text, "text/xml");

			let doc = xml.documentElement;
			this.suffix = doc.getAttribute('Format');
			this.tilesize = doc.getAttribute('TileSize');
			this.overlap = doc.getAttribute('Overlap');

			let size = doc.querySelector('Size');
			this.width = size.getAttribute('Width');
			this.height = size.getAttribute('Height');

			let max = Math.max(this.width, this.height)/this.tilesize;
			this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

			this.url = this.url.substr(0, this.url.lastIndexOf(".")) + '_files/';

			this.getTileURL = (url, x, y, level) => {
				url = url.substr(0, url.lastIndexOf(".")) + '_files/';
				let ilevel = parseInt(this.nlevels - 1 - level);
				return url + ilevel + '/' + x + '_' + y + '.' + this.suffix;
			}; 

			callback();

		})().catch(e => { console.log(e); this.status = e; });
	}


/**
 * Expects the url to point to ImageProperties.xml file.
 */
	initZoomify() {
		this.overlap = 0;
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let text = await response.text();

			let tmp = response.split('"');
			this.tilesize = parseInt(tmp[11]);

			let max = Math.max(this.width, this.height)/this.tilesize;
			this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

			this.url = this.url.substr(0, this.url.lastIndexOf("/"));

			this.getTileURL = (url, x, y, level) => {
				let ilevel = parseInt(this.nlevels - 1 - level);
				let index = this.index(level, x, y)>>>0;
				let group = index >> 8;
				url = url.substr(0, url.lastIndexOf("/"));
				return this.url + "/TileGroup" + group + "/" + ilevel + "-" + x + "-" + y + "." + this.suffix;
			};

			callback();

		})().catch(e => { console.log(e); this.status = e; });
	}
}

export { Layout }
