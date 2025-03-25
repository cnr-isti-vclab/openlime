/**
 * Cache manager for efficient tile management and retrieval in layers.
 * Implements a singleton pattern for centralized cache control across the application.
 * Handles tile loading, prefetching, and memory management with rate limiting capabilities.
 * 
 * @class
 */
class Cache {
	/**
	 * Private static instance for singleton pattern
	 * @type {Cache}
	 */
	static #instance;

	/**
	 * List of layers being managed
	 * @type {Array}
	 */
	#layers = [];

	/**
	 * Total cache capacity in bytes
	 * @type {number}
	 */
	#capacity;

	/**
	 * Current amount of GPU RAM used
	 * @type {number}
	 */
	#size = 0;

	/**
	 * Current number of active HTTP requests
	 * @type {number}
	 */
	#requested = 0;

	/**
	 * Maximum concurrent HTTP requests
	 * @type {number}
	 */
	#maxRequest;

	/**
	 * Maximum requests per second (0 for unlimited)
	 * @type {number}
	 */
	#maxRequestsRate;

	/**
	 * Timeout for rate limiting
	 * @type {number|null}
	 */
	#requestRateTimeout = null;

	/**
	 * Timestamp of last request for rate limiting
	 * @type {number}
	 */
	#lastRequestTimestamp;

	/**
	 * Maximum size of prefetched tiles in bytes
	 * @type {number}
	 */
	#maxPrefetch;

	/**
	 * Current amount of prefetched GPU RAM
	 * @type {number}
	 */
	#prefetched = 0;

	/**
	 * Creates or returns the existing Cache instance.
	 * @param {Object} [options] - Configuration options for the cache
	 * @param {number} [options.capacity=536870912] - Total cache capacity in bytes (default: 512MB)
	 * @param {number} [options.maxRequest=6] - Maximum concurrent HTTP requests
	 * @param {number} [options.maxRequestsRate=0] - Maximum requests per second (0 for unlimited)
	 * @param {number} [options.maxPrefetch=8388608] - Maximum prefetch size in bytes (default: 8MB)
	 * @returns {Cache} The singleton Cache instance
	 */
	constructor(options = {}) {
		if (Cache.#instance) {
			return Cache.#instance;
		}

		const defaults = {
			capacity: 512 * (1 << 20),
			maxRequest: 6,
			maxRequestsRate: 0,
			maxPrefetch: 8 * (1 << 20),
		};

		const config = { ...defaults, ...options };

		this.#capacity = config.capacity;
		this.#maxRequest = config.maxRequest;
		this.#maxRequestsRate = config.maxRequestsRate;
		this.#maxPrefetch = config.maxPrefetch;
		this.#lastRequestTimestamp = performance.now();

		Cache.#instance = this;
	}

	/**
	 * Gets the singleton instance with optional configuration update.
	 * @param {Object} [options] - Configuration options to update
	 * @returns {Cache} The singleton Cache instance
	 * @static
	 */
	static getInstance(options) {
		if (!Cache.#instance) {
			new Cache(options);
		} else if (options) {
			const instance = Cache.#instance;
			if (options.capacity !== undefined) instance.#capacity = options.capacity;
			if (options.maxRequest !== undefined) instance.#maxRequest = options.maxRequest;
			if (options.maxRequestsRate !== undefined) instance.#maxRequestsRate = options.maxRequestsRate;
			if (options.maxPrefetch !== undefined) instance.#maxPrefetch = options.maxPrefetch;
		}
		return Cache.#instance;
	}

	/**
	 * Registers a layer's tiles as candidates for downloading and initiates the update process.
	 * @param {Layer} layer - The layer whose tiles should be considered for caching
	 */
	setCandidates(layer) {
		if (!this.#layers.includes(layer)) {
			this.#layers.push(layer);
		}
		Promise.resolve().then(() => this.update());
	}

	/**
	 * Checks if the cache is currently rate limited based on request count and timing.
	 * @returns {boolean} True if rate limited, false otherwise
	 */
	#isRateLimited() {
		if (this.#requested >= this.#maxRequest) {
			return true;
		}

		if (this.#maxRequestsRate === 0) {
			return false;
		}

		const now = performance.now();
		const period = 1000 / this.#maxRequestsRate;
		const timeSinceLastRequest = now - this.#lastRequestTimestamp;

		if (timeSinceLastRequest > period) {
			return false;
		}

		if (!this.#requestRateTimeout) {
			this.#requestRateTimeout = setTimeout(() => {
				this.#requestRateTimeout = null;
				this.update();
			}, period - timeSinceLastRequest + 10);
		}

		return true;
	}

	/**
	 * Updates the cache state by processing the download queue while respecting capacity and rate limits.
	 */
	update() {
		if (this.#isRateLimited()) {
			return;
		}

		const best = this.#findBestCandidate();
		if (!best) {
			return;
		}

		while (this.#size > this.#capacity) {
			const worst = this.#findWorstTile();
			if (!worst) {
				console.warn("Cache management issue: No tiles available for removal");
				break;
			}

			if (worst.tile.time < best.tile.time) {
				this.#dropTile(worst.layer, worst.tile);
			} else {
				return;
			}
		}

		best.layer.queue.shift();
		this.#lastRequestTimestamp = performance.now();
		this.#loadTile(best.layer, best.tile);
	}

	/**
	 * Identifies the highest priority tile that should be downloaded next.
	 * @returns {Object|null} Object containing the best candidate layer and tile, or null if none found
	 */
	#findBestCandidate() {
		let best = null;

		for (const layer of this.#layers) {
			while (layer.queue.length > 0 && layer.tiles.has(layer.queue[0].index)) {
				layer.queue.shift();
			}

			if (!layer.queue.length) {
				continue;
			}

			const tile = layer.queue[0];

			if (!best || tile.time > best.tile.time + 1.0 || tile.priority > best.tile.priority) {
				best = { layer, tile };
			}
		}

		return best;
	}

	/**
	 * Identifies the lowest priority tile that should be removed from cache if space is needed.
	 * @returns {Object|null} Object containing the worst candidate layer and tile, or null if none found
	 */
	#findWorstTile() {
		let worst = null;

		for (const layer of this.#layers) {
			for (const tile of layer.tiles.values()) {
				if (tile.missing !== 0) {
					continue;
				}

				if (!worst || tile.time < worst.tile.time || (tile.time === worst.tile.time && tile.priority < worst.tile.priority)) {
					worst = { layer, tile };
				}
			}
		}

		return worst;
	}

	/**
	 * Initiates the loading of a tile for a specific layer.
	 * @param {Layer} layer - The layer the tile belongs to
	 * @param {Object} tile - The tile to be loaded
	 */
	#loadTile(layer, tile) {
		this.#requested++;

		(async () => {
			try {
				await layer.loadTile(tile, (size) => {
					this.#size += size;
					this.#requested--;
					this.update();
				});
			} catch (error) {
				console.error("Error loading tile:", error);
				this.#requested--;
				this.update();
			}
		})();
	}

	/**
	 * Removes a tile from the cache and updates the cache size.
	 * @param {Layer} layer - The layer the tile belongs to
	 * @param {Object} tile - The tile to be removed
	 */
	#dropTile(layer, tile) {
		this.#size -= tile.size;
		layer.dropTile(tile);
	}

	/**
	 * Removes all tiles associated with a specific layer from the cache.
	 * @param {Layer} layer - The layer whose tiles should be flushed
	 */
	flushLayer(layer) {
		if (!this.#layers.includes(layer)) {
			return;
		}

		for (const tile of layer.tiles.values()) {
			this.#dropTile(layer, tile);
		}
	}

	/**
	 * Gets current cache statistics.
	 * @returns {Object} Current cache statistics
	 */
	getStats() {
		return {
			capacity: this.#capacity,
			used: this.#size,
			usedPercentage: (this.#size / this.#capacity) * 100,
			activeRequests: this.#requested,
			layers: this.#layers.length
		};
	}
}

export { Cache };
