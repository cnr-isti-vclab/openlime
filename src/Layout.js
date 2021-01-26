

class Layout {
	constructor(url, type) {
		Object.assign(this, {
			width:0,
			height: 0,
			tilesize: 256,
			overlap: 0, 
			nlevels: 1,        //level 0 is the top, single tile level.
			ntiles: 1,         //tot number of tiles
			suffix: 'jpg',
			qbox: [],          //array of bounding box in tiles, one for mipmap 
			bbox: [],          //array of bounding box in pixels (w, h)

			ready: [],          //callbacks when the layout is ready.
			status: null
		});

		if(typeof(url) == 'string') {

			callback = () => {
				this.ntiles = initBoxes();
				this.status = 'ready';
				this.emit('ready');
			}

			switch(this.layout) {
				case 'image':    this.initImage(callback); break;
				case 'google':   this.initGoogle(callback); break;
				case 'deepzoom': this.initDeepzoom(callback); break;
			}
			return;
		}
		if(typeof(url) == 'object')
			Object.assign(this, url);
	}

	emit: function(event) {
		for(let r of this[event])
			r(this);
	}

	index: function(level, x, y) {
		var startindex = 0;
		for(var i = this.nlevels-1; i > level; i--) {
			startindex += this.qbox[i][2]*this.qbox[i][3];
		}
		return startindex + y*this.qbox[level][2] + x;
	}

/*
 * returns number of tiles.
*/

	initBoxes(): {
		this.qbox = []; //by level (0 is the bottom)
		this.bbox = [];
		var w = this.width;
		var h = this.height;

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

	tileCoords(level, x. y) {
		var coords  = new Float32Array([0, 0, 0,  0, 1, 0,  1, 1, 0,  1, 0, 0]);
		var tcoords = new Float32Array([0, 0,     0, 1,     1, 1,     1, 0]);


		if(t.layout == "image") {
			return { coords: coords, tcoords: tcoords }


		var sx = 2.0/t.canvas.width;
		var sy = 2.0/t.canvas.height;

		var side =  this.tilesize*(1<<(level)); //tile size in imagespace
		var tx = side;
		var ty = side;

		if(this.layout != "google") {  //google does not clip border tiles
			if(side*(x+1) > t.width) {
				tx = (t.width  - side*x);
			}
			if(side*(y+1) > t.height) {
				ty = (t.height - side*y);
			}
		}

		var lx  = this.qbox[level][2]-1; //last tile x pos, if so no overlap.
		var ly  = this.qbox[level][3]-1;

		var over = this.overlap;
		if(over) {
			var dtx = over / (tx/(1<<level) + (x==0?0:over) + (x==lx?0:over));
			var dty = over / (ty/(1<<level) + (y==0?0:over) + (y==ly?0:over));

			tcoords[0] = tcoords[2] = (x==0? 0: dtx);
			tcoords[1] = tcoords[7] = (y==0? 0: dty);
			tcoords[4] = tcoords[6] = (x==lx? 1: 1 - dtx);
			tcoords[3] = tcoords[5] = (y==ly? 1: 1 - dty);
		}
		return { coords: coords, tcoords: tcoords }
	}


	getTileURL(url, level, x, y) {}

	loadImage(url, level, x, y, callback) {

		let path = this.getTileURL(url, level, x, y);
		(async () => {
			var response = await fetch(path);
			if(!response.ok) {
				console.log();
				callback("Failed loading " + path + ": " + response.statusText);
				return;
			}

			let blob = await response.blob();

			if(typeof createImageBitmap != 'undefined') {
				var isFirefox = typeof InstallTrigger !== 'undefined';
				//firefox does not support options for this call, BUT the image is automatically flipped.
				if(isFirefox) {
					createImageBitmap(blob).then(callback);
				} else {
					createImageBitmap(blob, { imageOrientation: 'flipY' }).then(callback);
				}

			} else { //fallback for IOS
				var urlCreator = window.URL || window.webkitURL;
				var img = document.createElement('img');
				img.onerror = function(e) { console.log("Texture loading error!"); };
				img.src = urlCreator.createObjectURL(blob);

				img.onload = function() {
					urlCreator.revokeObjectURL(img.src);
					callback(img);
				}
			}
		})().catch(e => { callback(e); });
	}


	initImage() {
	}

/*
 * witdh and height
*/
	initImage(callback) {
		this.nlevels = 1;
		this.tilesize = 0;
		this.qbox = [[0, 0, 1, 1]];
		this.bbox = [[0, 0, this.width, this.height]];

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

		this.getTileURL = (x, y, level) => {
			var ilevel = parseInt(this.nlevels - 1 - level);
			return this.url + "/" + ilevel + "/" + y + "/" + x + '.' + this.suffix;
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

			this.getTileURL = (x, y, level) => {
				let ilevel = parseInt(this.nlevels - 1 - level);
				return this.url + ilevel + '/' + x + '_' + y + '.' + this.suffix;
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

			let max = Math.max(t.width, t.height)/t.tilesize;
			this.nlevels = Math.ceil(Math.log(max) / Math.LN2) + 1;

			this.url = this.url.substr(0, this.url.lastIndexOf("/"));

			t.getTileURL = (x, y, level) => {
				let ilevel = parseInt(this.nlevels - 1 - level);
				let index = this.index(level, x, y)>>>0;
				let group = index >> 8;
				return this.url + "/TileGroup" + group + "/" + ilevel + "-" + x + "-" + y + "." + this.suffix;
			};

			callback();

		})().catch(e => { console.log(e); this.status = e; });
	}
}

export { Layout }
