/* Cache holds the images and the tile textures.
 *  Each tile has a priority 0 and above means it is visible, 
 * negative depends on how far from the border and how more zoomed you need to go.
*/

class _Cache {
	constructor(options) {
		Object.assign(this, {
			capacity: 256*(1<<20),  //256 MB total capacity available
			size: 0,                //amount of GPU ram used

			maxRequest: 4,          //max number of concurrent HTTP requests
			requested: 0,
			maxPrefetch: 8*(1<<20), //max amount of prefetched tiles.
			prefetched: 0           //amount of currently prefetched GPU ram.
		});

		Object.assign(this, options);
		this.layers = [];   //map on layer.
	}

/*  Queue is an ordered array of tiles needed by a layer.
 */
	setCandidates(layer) {
		if(!this.layers.includes(layer))
			this.layers.push(layer);
		setTimeout(() => { this.update(); }, 0); //ensure all the queues are set before updating.
	}

/* Look for best tile to load and schedule load from the web.
 */
	update() {
		if(this.requested > this.maxRequested)
			return;

		let best = this.findBestCandidate();
		if(!best) return;
		while(this.size > this.capacity) { //we need to make room.
			let worst = this.findWorstTile();
			if(!worst) {
				console.log("BIG problem in the cache");
				break;
			}
			if(worst.time < best.time)
				dropTile(worst.layer, worst.tile)
			else
				return; 
		}
		this.loadTile(best.layer, best.tile);
	}

	findBestCandidate() {
		let candidates = [];
		for(let layer of this.layers) {
			if(layer.queue.length)
				candidates.push({layer:layer, tile:layer.queue.shift()});
		}
		if(!candidates.length) return null;
		return candidates.reduce((a, b) => { 
			if(a.tile.time == b.tile.time) 
				return a.tile.priority > b.tile.priority ? a : b;
			return a.tile.time > b.tile.time ? a : b;
		});
	}

	findWorstTile() {
		let candidates = [];
		for(let layer of this.layers) {
			let worst = this.layers.tiles.reduce((a, b) => {
				if(a.time == b.time) 
					return a.priority < b.priority ? a : b;
				return a.time < b.time ? a : b;
			});
			candidates.push({layer:layer, tile:worst});
		}
		if(!candidates.length) return null;

		return candidates.reduce((a, b) => { 
			if(a.tile.time == b.tile.time) 
				return a.tile.priority < b.tile.priority ? a : b;
			return a.tile.time < b.tile.time ? a : b;
		});
	}

/* 
 */
	loadTile(layer, tile) {
		this.requested++;
		layer.loadTile(tile, (size) => { this.size += size; this.requested--; this.update(); } );
	}
/*
 */
	dropTile(tile) {
		console.log("Dropping tile: ", tile);
	}
/* Flush all memory
 */
	flush() {
	}

/* Flush all tiles for a layer.
 */
	flush(layer) {
	}

/* 
 */
}

let Cache = new _Cache;
export { Cache }
