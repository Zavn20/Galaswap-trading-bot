/**
 * APICache - Client-Side API Caching System
 * Reduces redundant API calls and improves performance
 */

class APICache {
    constructor() {
        this.cache = new Map();
        this.defaultTTL = 30000; // 30 seconds default TTL
        this.maxCacheSize = 100; // Maximum number of cached items
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            size: 0
        };
        
        // Cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000); // Cleanup every minute
        
        console.log('💾 APICache initialized');
    }

    /**
     * Generate cache key from URL and options
     * @param {string} url - API endpoint URL
     * @param {Object} options - Request options
     * @returns {string} Cache key
     */
    generateKey(url, options = {}) {
        const method = options.method || 'GET';
        const body = options.body ? JSON.stringify(options.body) : '';
        return `${method}:${url}:${body}`;
    }

    /**
     * Get cached response
     * @param {string} url - API endpoint URL
     * @param {Object} options - Request options
     * @returns {Object|null} Cached response or null
     */
    get(url, options = {}) {
        const key = this.generateKey(url, options);
        const cached = this.cache.get(key);
        
        if (cached && cached.expires > Date.now()) {
            this.stats.hits++;
            console.log(`💾 Cache HIT: ${key}`);
            return cached.data;
        }
        
        if (cached) {
            // Expired cache entry
            this.cache.delete(key);
            this.stats.deletes++;
        }
        
        this.stats.misses++;
        console.log(`💾 Cache MISS: ${key}`);
        return null;
    }

    /**
     * Set cached response
     * @param {string} url - API endpoint URL
     * @param {Object} options - Request options
     * @param {Object} data - Response data
     * @param {number} ttl - Time to live in milliseconds
     */
    set(url, options = {}, data, ttl = this.defaultTTL) {
        const key = this.generateKey(url, options);
        
        // Check cache size limit
        if (this.cache.size >= this.maxCacheSize) {
            this.evictOldest();
        }
        
        const cacheEntry = {
            data: data,
            expires: Date.now() + ttl,
            created: Date.now(),
            url: url,
            options: options
        };
        
        this.cache.set(key, cacheEntry);
        this.stats.sets++;
        this.stats.size = this.cache.size;
        
        console.log(`💾 Cache SET: ${key} (TTL: ${ttl}ms)`);
    }

    /**
     * Delete cached response
     * @param {string} url - API endpoint URL
     * @param {Object} options - Request options
     */
    delete(url, options = {}) {
        const key = this.generateKey(url, options);
        if (this.cache.delete(key)) {
            this.stats.deletes++;
            this.stats.size = this.cache.size;
            console.log(`💾 Cache DELETE: ${key}`);
        }
    }

    /**
     * Clear all cached data
     */
    clear() {
        const size = this.cache.size;
        this.cache.clear();
        this.stats.deletes += size;
        this.stats.size = 0;
        console.log(`💾 Cache CLEARED: ${size} entries removed`);
    }

    /**
     * Evict oldest cache entry
     */
    evictOldest() {
        let oldestKey = null;
        let oldestTime = Date.now();
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.created < oldestTime) {
                oldestTime = entry.created;
                oldestKey = key;
            }
        }
        
        if (oldestKey) {
            this.cache.delete(oldestKey);
            this.stats.deletes++;
            this.stats.size = this.cache.size;
            console.log(`💾 Cache EVICTED: ${oldestKey}`);
        }
    }

    /**
     * Cleanup expired entries
     */
    cleanup() {
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expires < now) {
                this.cache.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0) {
            this.stats.deletes += cleaned;
            this.stats.size = this.cache.size;
            console.log(`💾 Cache CLEANUP: ${cleaned} expired entries removed`);
        }
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache statistics
     */
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;
            
        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            entries: Array.from(this.cache.keys()),
            memoryUsage: this.estimateMemoryUsage()
        };
    }

    /**
     * Estimate memory usage
     * @returns {string} Estimated memory usage
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        for (const [key, entry] of this.cache.entries()) {
            totalSize += key.length;
            totalSize += JSON.stringify(entry.data).length;
        }
        
        if (totalSize < 1024) {
            return `${totalSize} bytes`;
        } else if (totalSize < 1024 * 1024) {
            return `${(totalSize / 1024).toFixed(2)} KB`;
        } else {
            return `${(totalSize / (1024 * 1024)).toFixed(2)} MB`;
        }
    }

    /**
     * Enhanced fetch with caching
     * @param {string} url - API endpoint URL
     * @param {Object} options - Request options
     * @param {number} ttl - Cache TTL in milliseconds
     * @returns {Promise} Fetch response
     */
    async fetch(url, options = {}, ttl = this.defaultTTL) {
        // Check cache first
        const cached = this.get(url, options);
        if (cached) {
            return {
                ok: true,
                status: 200,
                json: () => Promise.resolve(cached),
                cached: true
            };
        }

        try {
            // Make actual API call
            const response = await fetch(url, options);
            
            if (response.ok) {
                const data = await response.json();
                
                // Cache successful responses
                this.set(url, options, data, ttl);
                
                return {
                    ok: response.ok,
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    json: () => Promise.resolve(data),
                    cached: false
                };
            } else {
                // Don't cache error responses
                return response;
            }
        } catch (error) {
            console.error(`❌ API fetch error for ${url}:`, error);
            throw error;
        }
    }

    /**
     * Destroy cache and cleanup
     */
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
        }
        this.clear();
        console.log('💾 APICache destroyed');
    }
}

// Global API cache instance
window.apiCache = new APICache();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = APICache;
}

console.log('✅ APICache loaded and ready');

