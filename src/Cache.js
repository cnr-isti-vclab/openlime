/**
 * Implements a singleton cache system for efficient tile management and retrieval in layers.
 * Handles tile loading, prefetching, and memory management with rate limiting capabilities.
 * @private
 */
class _Cache {
	/**
	 * Creates a new Cache instance.
	 * @param {Object} [options] - Configuration options for the cache
	 * @param {number} [options.capacity=536870912] - Total cache capacity in bytes (default: 512MB)
	 * @param {number} [options.maxRequest=6] - Maximum concurrent HTTP requests
	 * @param {number} [options.maxRequestsRate=0] - Maximum requests per second (0 for unlimited)
	 * @param {number} [options.maxPrefetch=8388608] - Maximum prefetch size in bytes (default: 8MB)
	 */
	constructor(options) {
		Object.assign(this, {
			capacity: 512 * (1 << 20),  //256 MB total capacity available
			size: 0,                //amount of GPU ram used

			maxRequest: 6,          //max number of concurrent HTTP requests
			requested: 0,
			maxRequestsRate: 0,     //max number of requests per second, 0 means no rate.
			requestRateTimeout: null, //calls update when a new slot is available due to request rate.
			lastRequestTimestamp: performance.now(),           //holdls last requests timestamps.
			maxPrefetch: 8 * (1 << 20), //max amount of prefetched tiles.
			prefetched: 0           //amount of currently prefetched GPU ram.
		});

		Object.assign(this, options);
		this.layers = [];   //map on layer.
	}

	/**
	 * Registers a layer's tiles as candidates for downloading and initiates the update process.
	 * @param {Layer} layer - The layer whose tiles should be considered for caching
	 */
	setCandidates(layer) {
		if (!this.layers.includes(layer))
			this.layers.push(layer);
		setTimeout(() => { this.update(); }, 0); //ensure all the queues are set before updating.
	}

	/**
		 * Checks if the cache is currently rate limited based on request count and timing.
	 * @private
		 * @returns {boolean} True if rate limited, false otherwise
		 */
	rateLimited() {
		if (this.requested > this.maxRequest)
			return true;

		if (this.maxRequestsRate == 0)
			return false;

		let now = performance.now();
		let period = 1000 / this.maxRequestsRate;
		let diff = now - this.lastRequestTimestamp;
		if (diff > period)
			return false;


		if (!this.requestRateTimeout) {
			this.requestRateTimeout = setTimeout(() => {
				this.requestRateTimeout = null;
				this.update();
			}, period - diff + 10);
		}
		return true;
	}

	/**
	 * Updates the cache state by processing the download queue while respecting capacity and rate limits.
	 * @private
	 */
	update() {
		if (this.rateLimited())
			return;


		let best = this.findBestCandidate();
		if (!best) return;
		while (this.size > this.capacity) { //we need to make room.
			let worst = this.findWorstTile();
			if (!worst) {
				console.log("BIG problem in the cache");
				break;
			}
			if (worst.tile.time < best.tile.time)
				this.dropTile(worst.layer, worst.tile)
			else
				return;
		}
		console.assert(best != best.layer.queue[0]);
		best.layer.queue.shift();
		this.lastRequestTimestamp = performance.now();
		this.loadTile(best.layer, best.tile);
	}

	/**
	 * Identifies the highest priority tile that should be downloaded next.
	 * @private
	 * @returns {Object|null} Object containing the best candidate layer and tile, or null if none found
	 */
	findBestCandidate() {
		let best = null;
		for (let layer of this.layers) {
			while (layer.queue.length > 0 && layer.tiles.has(layer.queue[0].index)) {
				layer.queue.shift();
			}
			if (!layer.queue.length)
				continue;
			let tile = layer.queue[0];
			if (!best ||
				tile.time > best.tile.time + 1.0 ||  //old requests ignored
				tile.priority > best.tile.priority)
				best = { layer, tile }
		}
		return best;
	}

	/**
	 * Identifies the lowest priority tile that should be removed from cache if space is needed.
	 * @private
	 * @returns {Object|null} Object containing the worst candidate layer and tile, or null if none found
	 */
	findWorstTile() {
		let worst = null;
		for (let layer of this.layers) {
			for (let tile of layer.tiles.values()) {
				//TODO might be some are present when switching shaders.
				if (tile.missing != 0) continue;
				if (!worst ||
					tile.time < worst.tile.time ||
					(tile.time == worst.tile.time && tile.priority < worst.tile.priority)) {
					worst = { layer, tile };
				}
			}
		}
		return worst;
	}

	/**
	 * Initiates the loading of a tile for a specific layer.
	 * @private
	 * @param {Layer} layer - The layer the tile belongs to
	 * @param {Object} tile - The tile to be loaded
	 */
	loadTile(layer, tile) {
		this.requested++;
		(async () => { layer.loadTile(tile, (size) => { this.size += size; this.requested--; this.update(); }); })();
	}

	/**
	 * Removes a tile from the cache and updates the cache size.
	 * @private
	 * @param {Layer} layer - The layer the tile belongs to
	 * @param {Object} tile - The tile to be removed
	 */
	dropTile(layer, tile) {
		this.size -= tile.size;
		layer.dropTile(tile);
	}

	/**
	 * Removes all tiles associated with a specific layer from the cache.
	 * @param {Layer} layer - The layer whose tiles should be flushed
	 */
	flushLayer(layer) {
		if (!this.layers.includes(layer))
			return;
		for (let tile of layer.tiles.values())
			this.dropTile(layer, tile);
	}
}

/**
 * Singleton cache instance for managing tile loading and caching across layers.
 * Provides efficient tile retrieval and memory management with configurable capacity
 * and request rate limiting.
 * 
 * @namespace
 * @property {number} capacity - Total cache capacity in bytes (default: 512MB)
 * @property {number} size - Current amount of GPU RAM used
 * @property {number} maxRequest - Maximum concurrent HTTP requests (default: 6)
 * @property {number} requested - Current number of active requests
 * @property {number} maxRequestsRate - Maximum requests per second (0 for unlimited)
 * @property {number} maxPrefetch - Maximum size of prefetched tiles in bytes
 * @property {number} prefetched - Current amount of prefetched GPU RAM
 * @property {Layer[]} layers - Array of layers being managed by the cache
 */
const Cache = new _Cache;

export { Cache }
