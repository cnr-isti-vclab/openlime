
/**
 * @param {string|Object} url URL of the image or the tiled config file, 
 * @param {string} type select one among: <image, {@link https://www.microimages.com/documentation/TechGuides/78googleMapsStruc.pdf google}, {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN deepzoom}, {@link http://www.zoomify.com/ZIFFileFormatSpecification.htm zoomify}, {@link https://iipimage.sourceforge.io/ iip}, {@link https://iiif.io/api/image/3.0/ iiif}>
 */
class Layout {
	constructor(url, type, options) {
		Object.assign(this, {
			type: type,
			width: null,
			height: null,
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
		if(options)
			Object.assign(this, options);

		if(typeof(url) == 'string') {
			this.url = url;
			let callback = () => {
				this.ntiles = this.initBoxes();
				this.status = 'ready';
				this.emit('ready');
			}

			switch(this.type) {
				case 'image':    this.initImage(this.width, this.height); break;
				case 'google':   this.initGoogle(callback); break;
				case 'deepzoom': this.initDeepzoom(callback); break;
				case 'zoomify': this.initZoomify(callback); break;
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

	isReady() {
		return this.status == 'ready' && this.width && this.height;
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
		//careful: here y is inverted due to textures not being flipped on load (Firefox fault!).
		var tcoords = new Float32Array([0, 1,     0, 0,     1, 0,     1, 1]);

		if(this.type == "image") {
			return { 
				coords: new Float32Array([-w/2, -h/2, 0,  -w/2, h/2, 0,  w/2, h/2, 0,  w/2, -h/2, 0]),
				tcoords: tcoords 
			};
		}

		let coords = new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]);


		let side =  this.tilesize*(1<<(level)); //tile size in imagespace
		let tx = side;
		let ty = side;

		if(side*(x+1) > this.width) {
			tx = (this.width  - side*x);
			if(this.type == 'google')
				tcoords[4] = tcoords[6] = tx/side;
		}
		if(side*(y+1) > this.height) {
			ty = (this.height - side*y);
			if(this.type == 'google')
				tcoords[1] = tcoords[7] = ty/side;
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
		if(this.type == 'google') {
			//flip Y in coords
			let tmp = tcoords[1];
			tcoords[1] = tcoords[7] = tcoords[3];
			tcoords[3] = tcoords[5] = tmp;
		}
		for(let i = 0; i < coords.length; i+= 3) {
			coords[i]   =  coords[i]  *tx + side*x - this.width/2;
			coords[i+1] = -coords[i+1]*ty - side*y + this.height/2;
		}

		return { coords: coords, tcoords: tcoords }
	}


/**
 * Given a viewport and a transform computes the tiles needed for each level.
 * @param {array} viewport array with left, bottom, width, height
 * @param {border} border is radius (in tiles units) of prefetch
 * @returns {object} with level: the optimal level in the pyramid, pyramid: array of bounding boxes in tile units.
 */
	neededBox(viewport, transform, border, bias) {
		if(this.type == "image")
			return { level:0, pyramid: [[0, 0, 1, 1]] };

		//here we are computing with inverse levels; level 0 is the bottom!
		let minlevel = Math.max(0, Math.min(Math.floor(-Math.log2(transform.z) + bias), this.nlevels-1));

		//
		let bbox = transform.getInverseBox(viewport);
		//find box in image coordinates where (0, 0) is in the upper left corner.
		bbox[0] += this.width/2;
		bbox[2] += this.width/2;
		bbox[1] += this.height/2;
		bbox[3] += this.height/2;

		let pyramid = [];
		for(let level = this.nlevels-1; level >= minlevel; level--) {
			let side = this.tilesize*Math.pow(2, level);

			//quantized bbox
			let qbox = [
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



/*
 * Witdh and height can be recovered once the image is downloaded.
*/
	initImage(width, height) {
		this.getTileURL = (url, x, y, level) => { return url; }
		this.nlevels = 1;
		this.tilesize = 0;

		if(width && height) {
			this.width = width;
			this.height = height;
			this.ntiles = this.initBoxes();

			this.status = 'ready';
			this.emit('ready');
		}
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
	initZoomify(callback) {
		this.overlap = 0;
		(async () => {
			var response = await fetch(this.url);
			if(!response.ok) {
				this.status = "Failed loading " + this.url + ": " + response.statusText;
				return;
			}
			let text = await response.text();
			let xml = (new window.DOMParser()).parseFromString(text, "text/xml");
			let doc = xml.documentElement;
			this.tilesize = parseInt(doc.getAttribute('TILESIZE'));
			this.width = parseInt(doc.getAttribute('WIDTH'));
			this.height = parseInt(doc.getAttribute('HEIGHT'));
			if(!this.tilesize || !this.height || !this.width)
				throw "Missing parameter files for zoomify!";

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
