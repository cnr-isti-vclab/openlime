/* Cache holds the images and the tile textures.
 *  Each tile has a priority 0 and above means it is visible, 
 * negative depends on how far from the border and how more zoomed you need to go.
*/

class _Cache {
	constructor(options) {
		Object.assign(this, {
			capacity: 10*(1<<20),  //256 MB total capacity available
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
		if(this.requested > this.maxRequest)
			return;

		let best = this.findBestCandidate();
		if(!best) return;
		while(this.size > this.capacity) { //we need to make room.
			let worst = this.findWorstTile();
			if(!worst) {
				console.log("BIG problem in the cache");
				break;
			}
			if(worst.tile.time < best.tile.time)
				this.dropTile(worst.layer, worst.tile)
			else
				return; 
		}
		this.loadTile(best.layer, best.tile);
	}

	findBestCandidate() {
		let best = null;
		let candidates = [];
		for(let layer of this.layers) {
			if(!layer.queue.length)
				continue;
			let tile = layer.queue.shift();
			if(!best ||
				tile.time > best.tile.time ||
				(tile.time == best.tile.time && tile.priority > best.tile.priority))
				best = { layer, tile }
		}
		return best;
	}

	findWorstTile() {
		let worst = null;
		for(let layer of this.layers) {
			for(let tile of layer.tiles) {
				//TODO might be some are present when switching shaders.
				if(tile.missing != 0) continue;
				if(!worst || 
				   tile.time < worst.tile.time || 
				   (tile.time == worst.tile.time && tile.priority < worst.tile.priority)) {
					worst = {layer, tile};
				}
			}
		}
		return worst;
	}

/* 
 */
	loadTile(layer, tile) {
		this.requested++;
		layer.loadTile(tile, (size) => { this.size += size; this.requested--; this.update(); } );
	}
/*
 */
	dropTile(layer, tile) {
		for(let i = 0; i < tile.tex.length; i++) {
			if(tile.tex[i]) {
				layer.gl.deleteTexture(tile.tex[i]);
				tile.tex[i] = null;
				tile.missing++;
			}
		}
		this.size -= tile.size;
		tile.size = 0;
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
