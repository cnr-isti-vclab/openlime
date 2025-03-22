/**
 * Cache manager for efficient tile management and retrieval in layers.
 * Implements a singleton pattern for centralized cache control across the application.
 * Handles tile loading, prefetching, and memory management with rate limiting capabilities.
 * 
 * @class
 */
class Cache {
	/** @type {Cache} Private static instance for singleton pattern */
	static #instance;
	
	/** @type {Array} Private array of layers being managed */
	#layers = [];
	
	/** @type {number} Total cache capacity in bytes */
	#capacity;
	
	/** @type {number} Current amount of GPU RAM used */
	#size = 0;
	
	/** @type {number} Current number of active HTTP requests */
	#requested = 0;
	
	/** @type {number} Maximum concurrent HTTP requests */
	#maxRequest;
	
	/** @type {number} Maximum requests per second (0 for unlimited) */
	#maxRequestsRate;
	
	/** @type {number|null} Timeout for rate limiting */
	#requestRateTimeout = null;
	
	/** @type {number} Timestamp of last request for rate limiting */
	#lastRequestTimestamp;
	
	/** @type {number} Maximum size of prefetched tiles in bytes */
	#maxPrefetch;
	
	/** @type {number} Current amount of prefetched GPU RAM */
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
			// Return existing instance if available (singleton pattern)
			if (Cache.#instance) {
					return Cache.#instance;
			}
			
			// Default configuration values
			const defaults = {
					capacity: 512 * (1 << 20),   // 512 MB total capacity
					maxRequest: 6,               // Max concurrent HTTP requests
					maxRequestsRate: 0,          // Max requests per second (0 = no limit)
					maxPrefetch: 8 * (1 << 20),  // 8 MB max prefetch size
			};
			
			// Apply options over defaults
			const config = {...defaults, ...options};
			
			// Initialize properties
			this.#capacity = config.capacity;
			this.#maxRequest = config.maxRequest;
			this.#maxRequestsRate = config.maxRequestsRate;
			this.#maxPrefetch = config.maxPrefetch;
			this.#lastRequestTimestamp = performance.now();
			
			// Store instance reference
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
					// Update existing instance configuration if needed
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
	 * @public
	 */
	setCandidates(layer) {
			if (!this.#layers.includes(layer)) {
					this.#layers.push(layer);
			}
			// Use Promise for consistent microtask scheduling
			Promise.resolve().then(() => this.update());
	}
	
	/**
	 * Checks if the cache is currently rate limited based on request count and timing.
	 * @returns {boolean} True if rate limited, false otherwise
	 * @private
	 */
	#isRateLimited() {
			// Check if we've hit the concurrent request limit
			if (this.#requested >= this.#maxRequest) {
					return true;
			}
			
			// If no rate limiting is configured, allow requests
			if (this.#maxRequestsRate === 0) {
					return false;
			}
			
			// Calculate time since last request
			const now = performance.now();
			const period = 1000 / this.#maxRequestsRate;
			const timeSinceLastRequest = now - this.#lastRequestTimestamp;
			
			// Allow request if enough time has passed
			if (timeSinceLastRequest > period) {
					return false;
			}
			
			// Set up timeout to check again later if not already scheduled
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
	 * @private
	 */
	update() {
			// Check rate limiting first
			if (this.#isRateLimited()) {
					return;
			}
			
			// Find best candidate to download
			const best = this.#findBestCandidate();
			if (!best) {
					return;
			}
			
			// Make room in cache if needed
			while (this.#size > this.#capacity) {
					const worst = this.#findWorstTile();
					if (!worst) {
							console.warn("Cache management issue: No tiles available for removal");
							break;
					}
					
					// Don't remove if the worst tile is newer than what we want to add
					if (worst.tile.time < best.tile.time) {
							this.#dropTile(worst.layer, worst.tile);
					} else {
							return; // No room for new tile without removing newer content
					}
			}
			
			// Remove the candidate from queue and load it
			best.layer.queue.shift();
			this.#lastRequestTimestamp = performance.now();
			this.#loadTile(best.layer, best.tile);
	}
	
	/**
	 * Identifies the highest priority tile that should be downloaded next.
	 * @returns {Object|null} Object containing the best candidate layer and tile, or null if none found
	 * @private
	 */
	#findBestCandidate() {
			let best = null;
			
			for (const layer of this.#layers) {
					// Remove already loaded tiles from queue
					while (layer.queue.length > 0 && layer.tiles.has(layer.queue[0].index)) {
							layer.queue.shift();
					}
					
					if (!layer.queue.length) {
							continue;
					}
					
					const tile = layer.queue[0];
					
					// Prefer newer or higher priority tiles
					if (!best || 
							tile.time > best.tile.time + 1.0 ||  
							tile.priority > best.tile.priority) {
							best = { layer, tile };
					}
			}
			
			return best;
	}
	
	/**
	 * Identifies the lowest priority tile that should be removed from cache if space is needed.
	 * @returns {Object|null} Object containing the worst candidate layer and tile, or null if none found
	 * @private
	 */
	#findWorstTile() {
			let worst = null;
			
			for (const layer of this.#layers) {
					for (const tile of layer.tiles.values()) {
							// Skip incomplete tiles
							if (tile.missing !== 0) {
									continue;
							}
							
							// Prefer older or lower priority tiles for removal
							if (!worst ||
									tile.time < worst.tile.time ||
									(tile.time === worst.tile.time && tile.priority < worst.tile.priority)) {
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
	 * @private
	 */
	#loadTile(layer, tile) {
			this.#requested++;
			
			// Use async/await for better readability
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
	 * @private
	 */
	#dropTile(layer, tile) {
			this.#size -= tile.size;
			layer.dropTile(tile);
	}
	
	/**
	 * Removes all tiles associated with a specific layer from the cache.
	 * @param {Layer} layer - The layer whose tiles should be flushed
	 * @public
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
	 * @public
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

// Export the class
export { Cache };