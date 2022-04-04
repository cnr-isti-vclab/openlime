/*
 * The singleton class **Cache** implements a cache for faster retrieval of the tiles required by layers.
 * @class Cache
 */
/** @ignore */
class _Cache {
	/**
	 * Instantiates a Cache object. Tiles to be fetched are stored in an ordered `queue` in {Layer}.
	 * @param {Object} [options] An object literal to define cache parameters.
	 * @param {number} options.capacity=536870912 The total cache capacity (in bytes).
	 * @param {number} options.maxRequest=6 Max number of concurrent HTTP requests. Most common browsers allow six connections per domain.
	 */
	constructor(options) {
		Object.assign(this, {
			capacity: 512*(1<<20),  //256 MB total capacity available
			size: 0,                //amount of GPU ram used

			maxRequest: 6,          //max number of concurrent HTTP requests
			requested: 0,
			maxPrefetch: 8*(1<<20), //max amount of prefetched tiles.
			prefetched: 0           //amount of currently prefetched GPU ram.
		});

		Object.assign(this, options);
		this.layers = [];   //map on layer.
	}

	/**
	 * Determines which tiles of a given `layer` are candidates to be downloaded.
	 * Cleans up the cache and schedules the web data fetch. 
	 * @param {Layer} layer A layer.
	 */
	setCandidates(layer) {
		if(!this.layers.includes(layer))
			this.layers.push(layer);
		setTimeout(() => { this.update(); }, 0); //ensure all the queues are set before updating.
	}

	/** @ignore */
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

	/* Finds the best tile to be downloaded */
	/** @ignore */
	findBestCandidate() {
		let best = null;
		for(let layer of this.layers) {
			if(!layer.queue.length)
				continue;
			let tile = layer.queue.shift();
			if(!best ||
				tile.time > best.tile.time  + 1.0 ||  //old requests ignored
				tile.priority > best.tile.priority)
				best = { layer, tile }
		}
		return best;
	}

	/* Finds the worst tile to be dropped */
	/** @ignore */
	findWorstTile() {
		let worst = null;
		for(let layer of this.layers) {
			for(let tile of layer.tiles.values()) {
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

	/** @ignore */
	loadTile(layer, tile) {
		this.requested++;
		(async () =>  { layer.loadTile(tile, (size) => { this.size += size; this.requested--; this.update(); } ); })();
	}

	/** @ignore */
	dropTile(layer, tile) {
		this.size -= tile.size;
		layer.dropTile(tile);
	}


	/**
	 * Flushes all tiles for a `layer`.
	 * @param {Layer} layer A layer.
 	 */
	flushLayer(layer) {
		if(!this.layers.includes(layer))
			return;
		for(let tile of layer.tiles.values())
			this.dropTile(layer, tile);
	}
}

/**
 * Instantiates a Cache object. Tiles to be fetched are stored in an ordered `queue` in {Layer}.
 * @classdesc The singleton class **Cache** implements a cache for faster retrieval of the tiles required by layers.
 * @class Cache
 * @param {Object} [options] An object literal to define cache parameters.
 * @param {number} options.capacity=536870912 The total cache capacity (in bytes).
 * @param {number} options.maxRequest=6 Max number of concurrent HTTP requests. Most common browsers allow six connections per domain.
 */
let Cache = new _Cache;

/**
 * Flushes all tiles for a `layer`.
 * @function flushLayer
 * @memberof Cache
 * @instance
 * @param {Layer} layer A layer.
 */

/**
 * Determines which tiles of a given `layer` are candidates to be downloaded.
 * Cleans up the cache and schedules the web data fetch.
 * @function setCandidates
 * @memberof Cache
 * @instance
 * @param {Layer} layer A layer.
 */


export { Cache }
