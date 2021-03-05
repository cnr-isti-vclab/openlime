
/**
 * @param {string|Object} url URL of the image or the tiled config file, 
 * @param {string} type select one among: <image, {@link https://www.microimages.com/documentation/TechGuides/78googleMapsStruc.pdf google}, {@link https://docs.microsoft.com/en-us/previous-versions/windows/silverlight/dotnet-windows-silverlight/cc645077(v=vs.95)?redirectedfrom=MSDN deepzoom}, {@link http://www.zoomify.com/ZIFFileFormatSpecification.htm zoomify}, {@link https://iipimage.sourceforge.io/ iip}, {@link https://iiif.io/api/image/3.0/ iiif}>
 */
class Layout {
	constructor(url, type, options) {
		Object.assign(this, {
			type: type,
			width: 0,
			height: 0,
			tilesize: 256,
			overlap: 0, 
			nlevels: 1,        //level 0 is the top, single tile level.
			tiles: [],
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

			(async () => {
				switch(this.type) {
					case 'image':    await this.initImage(); break;
					case 'google':   await this.initGoogle(); break;
					case 'deepzoom': await this.initDeepzoom(); break;
					case 'zoomify':  await this.initZoomify(); break;
					case 'iiif':     await this.initIIIF(); break;
				}
				this.initBoxes();
				this.status = 'ready';
				this.emit('ready');
				
			})().catch(e => { console.log(e); this.status = e; });
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
		return [-this.width/2, -this.height/2, this.width/2, this.height/2];
	}

/**
 *  Each tile is assigned an unique number.
 */

	index(level, x, y) {
		let startindex = 0;
		for(let i = 0; i < level; i++)
			startindex += this.qbox[i][2]*this.qbox[i][3];
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
			this.tiles.push({index:0, level:0, x:0, y:0});
			return 1;
		}

		let tiles = [];
		var index = 0;
		for(let level = this.nlevels - 1; level >= 0; level--) {
			this.qbox[level] = [0, 0, 0, 0];
			this.bbox[level] = [0, 0, w, h];
			for(let y = 0; y*this.tilesize < h; y++) {
				this.qbox[level][3] = y+1;
				for(let x = 0; x*this.tilesize < w; x ++) {
					this.qbox[level][2] = x+1;
					tiles.push({level:level, x:x, y:y});
				}
			}
			w >>>= 1;
			h >>>= 1;
		}
		this.tiles = [];
		for(let tile of tiles) {
			let index = this.index(tile.level, tile.x, tile.y);
			tile.index = index;
			this.tiles[index] = tile;
		}
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

		let ilevel = this.nlevels - 1 - level;
		let side =  this.tilesize*(1<<(ilevel)); //tile size in imagespace
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
			let dtx = over / (tx/(1<<ilevel) + (x==0?0:over) + (x==lx?0:over));
			let dty = over / (ty/(1<<ilevel) + (y==0?0:over) + (y==ly?0:over));

			tcoords[0] = tcoords[2] = (x==0? 0: dtx);
			tcoords[3] = tcoords[5] = (y==0? 0: dty);
			tcoords[4] = tcoords[6] = (x==lx? 1: 1 - dtx);
			tcoords[1] = tcoords[7] = (y==ly? 1: 1 - dty);
		} 
		//flip Y coordinates 
		//TODO cleanup this mess!
		let tmp = tcoords[1];
		tcoords[1] = tcoords[7] = tcoords[3];
		tcoords[3] = tcoords[5] = tmp;

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
		let iminlevel = Math.max(0, Math.min(Math.floor(-Math.log2(transform.z) + bias), this.nlevels-1));
		let minlevel = this.nlevels-1-iminlevel;
		//
		let bbox = transform.getInverseBox(viewport);
		//find box in image coordinates where (0, 0) is in the upper left corner.
		bbox[0] += this.width/2;
		bbox[2] += this.width/2;
		bbox[1] += this.height/2;
		bbox[3] += this.height/2;

		let pyramid = [];
		for(let level = 0; level <= minlevel; level++) {
			let ilevel = this.nlevels -1 -level;
			let side = this.tilesize*Math.pow(2, ilevel);

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
		return { level: minlevel, pyramid: pyramid };
	}

	getTileURL(url, level, x, y) {
		throw Error("Layout not defined or ready.");
	}



/*
 * Witdh and height can be recovered once the image is downloaded.
*/
	initImage() {
		this.getTileURL = (url, x, y, level) => { return url; }
		this.nlevels = 1;
		this.tilesize = 0;
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
			return url + "/" + level + "/" + y + "/" + x + '.' + this.suffix;
		};
	}


/**
 * Expects the url to point to .dzi config file
 */
	async initDeepzoom() {		
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
			return url + level + '/' + x + '_' + y + '.' + this.suffix;
		}; 
	}


/**
 * Expects the url to point to ImageProperties.xml file.
 */
	async initZoomify() {
		this.overlap = 0;
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
			let index = this.index(level, x, y)>>>0;
			let group = index >> 8;
			url = url.substr(0, url.lastIndexOf("/"));
			return this.url + "/TileGroup" + group + "/" + level + "-" + x + "-" + y + "." + this.suffix;
		};
	}

	async initIIIF() {
		this.overlap = 0;

		var response = await fetch(this.url);
		if(!response.ok) {
			this.status = "Failed loading " + this.url + ": " + response.statusText;
			return;
		}
		let info = await response.json();
		this.width = info.width;
		this.height = info.height;
		this.nlevels = info.tiles[0].scaleFactors.length;
		this.tilesize = info.tiles[0].width;

		this.url = this.url.substr(0, this.url.lastIndexOf("/"));

		this.getTileURL = (url, x, y, level) => {
			let tw = this.tilesize;
			let ilevel = parseInt(this.nlevels - 1 - level);
			let s = Math.pow(2, level);

			//region parameters
			let xr = x * tw * s;
			let yr = y * tw * s;
			let wr = Math.min(tw * s, this.width - xr)
			let hr = Math.min(tw * s, this.height - yr);

			// pixel size parameters /ws,hs/
			let ws = tw
			if (xr + tw*s > this.width)
				ws = (this.width - xr + s - 1) / s  
			let hs = tw
			if (yr + tw*s > this.height)
				hs = (this.height - yr + s - 1) / s

			url = url.substr(0, url.lastIndexOf("/"));
			return `${url}/${xr},${yr},${wr},${hr}/${ws},${hs}/0/default.jpg`;
		};
	}
}

export { Layout }
