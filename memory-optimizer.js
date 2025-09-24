/**
 * MemoryOptimizer - Memory Management and Data Compression System
 * Optimizes localStorage usage and prevents memory leaks
 */

class MemoryOptimizer {
    constructor() {
        this.compressionEnabled = true;
        this.maxStorageSize = 5 * 1024 * 1024; // 5MB limit
        this.cleanupThreshold = 0.8; // Cleanup when 80% full
        this.stats = {
            compressed: 0,
            decompressed: 0,
            saved: 0,
            cleaned: 0
        };
        
        console.log('🧠 MemoryOptimizer initialized');
    }

    /**
     * Compress data using simple compression
     * @param {any} data - Data to compress
     * @returns {string} Compressed data
     */
    compress(data) {
        try {
            const jsonString = JSON.stringify(data);
            
            // Simple compression: remove whitespace and use shorter keys
            const compressed = jsonString
                .replace(/\s+/g, ' ') // Replace multiple spaces with single space
                .replace(/"/g, "'") // Replace double quotes with single quotes
                .replace(/:\s*/g, ':') // Remove spaces after colons
                .replace(/,\s*/g, ',') // Remove spaces after commas
                .replace(/{\s*/g, '{') // Remove spaces after opening braces
                .replace(/\s*}/g, '}') // Remove spaces before closing braces
                .replace(/\[\s*/g, '[') // Remove spaces after opening brackets
                .replace(/\s*]/g, ']'); // Remove spaces before closing brackets
            
            this.stats.compressed++;
            const saved = jsonString.length - compressed.length;
            this.stats.saved += saved;
            
            console.log(`🧠 Compressed data: ${jsonString.length} → ${compressed.length} bytes (${saved} bytes saved)`);
            return compressed;
        } catch (error) {
            console.error('❌ Compression error:', error);
            return JSON.stringify(data);
        }
    }

    /**
     * Decompress data
     * @param {string} compressedData - Compressed data
     * @returns {any} Decompressed data
     */
    decompress(compressedData) {
        try {
            this.stats.decompressed++;
            return JSON.parse(compressedData);
        } catch (error) {
            console.error('❌ Decompression error:', error);
            return null;
        }
    }

    /**
     * Store data with compression
     * @param {string} key - Storage key
     * @param {any} data - Data to store
     * @param {boolean} compress - Whether to compress
     */
    setItem(key, data, compress = this.compressionEnabled) {
        try {
            const dataToStore = compress ? this.compress(data) : JSON.stringify(data);
            
            // Check storage size
            if (this.getStorageSize() + dataToStore.length > this.maxStorageSize) {
                this.cleanup();
            }
            
            localStorage.setItem(key, dataToStore);
            console.log(`🧠 Stored ${key}: ${dataToStore.length} bytes`);
        } catch (error) {
            console.error(`❌ Storage error for ${key}:`, error);
            // Try without compression if compression failed
            if (compress) {
                this.setItem(key, data, false);
            }
        }
    }

    /**
     * Retrieve data with decompression
     * @param {string} key - Storage key
     * @param {boolean} decompress - Whether to decompress
     * @returns {any} Retrieved data
     */
    getItem(key, decompress = this.compressionEnabled) {
        try {
            const storedData = localStorage.getItem(key);
            if (!storedData) return null;
            
            if (decompress) {
                return this.decompress(storedData);
            } else {
                return JSON.parse(storedData);
            }
        } catch (error) {
            console.error(`❌ Retrieval error for ${key}:`, error);
            return null;
        }
    }

    /**
     * Remove item from storage
     * @param {string} key - Storage key
     */
    removeItem(key) {
        try {
            localStorage.removeItem(key);
            console.log(`🧠 Removed ${key}`);
        } catch (error) {
            console.error(`❌ Removal error for ${key}:`, error);
        }
    }

    /**
     * Get current storage size
     * @returns {number} Storage size in bytes
     */
    getStorageSize() {
        let totalSize = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                totalSize += localStorage[key].length + key.length;
            }
        }
        return totalSize;
    }

    /**
     * Get storage usage statistics
     * @returns {Object} Storage statistics
     */
    getStorageStats() {
        const totalSize = this.getStorageSize();
        const maxSize = this.maxStorageSize;
        const usagePercent = (totalSize / maxSize * 100).toFixed(2);
        
        return {
            totalSize: this.formatBytes(totalSize),
            maxSize: this.formatBytes(maxSize),
            usagePercent: `${usagePercent}%`,
            items: Object.keys(localStorage).length,
            isNearLimit: totalSize > maxSize * this.cleanupThreshold
        };
    }

    /**
     * Cleanup old or large data
     */
    cleanup() {
        console.log('🧹 Starting storage cleanup...');
        
        const keys = Object.keys(localStorage);
        const items = keys.map(key => ({
            key: key,
            size: localStorage[key].length + key.length,
            timestamp: this.getItemTimestamp(key)
        }));
        
        // Sort by size (largest first) and timestamp (oldest first)
        items.sort((a, b) => {
            if (a.size !== b.size) return b.size - a.size;
            return a.timestamp - b.timestamp;
        });
        
        // Remove largest/oldest items until we're under threshold
        const targetSize = this.maxStorageSize * this.cleanupThreshold;
        let currentSize = this.getStorageSize();
        let removedCount = 0;
        
        for (const item of items) {
            if (currentSize <= targetSize) break;
            
            this.removeItem(item.key);
            currentSize -= item.size;
            removedCount++;
            this.stats.cleaned++;
        }
        
        console.log(`🧹 Cleanup completed: removed ${removedCount} items`);
    }

    /**
     * Get item timestamp from data
     * @param {string} key - Storage key
     * @returns {number} Timestamp
     */
    getItemTimestamp(key) {
        try {
            const data = this.getItem(key, false);
            return data?.timestamp || data?.lastUpdated || 0;
        } catch {
            return 0;
        }
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get memory optimization statistics
     * @returns {Object} Optimization statistics
     */
    getStats() {
        return {
            ...this.stats,
            storage: this.getStorageStats(),
            compressionEnabled: this.compressionEnabled,
            compressionRatio: this.stats.compressed > 0 
                ? (this.stats.saved / (this.stats.saved + this.stats.compressed) * 100).toFixed(2) + '%'
                : '0%'
        };
    }

    /**
     * Monitor memory usage
     * @returns {Object} Memory usage information
     */
    monitorMemory() {
        if (performance.memory) {
            return {
                used: this.formatBytes(performance.memory.usedJSHeapSize),
                total: this.formatBytes(performance.memory.totalJSHeapSize),
                limit: this.formatBytes(performance.memory.jsHeapSizeLimit),
                usagePercent: ((performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100).toFixed(2) + '%'
            };
        } else {
            return {
                used: 'N/A',
                total: 'N/A',
                limit: 'N/A',
                usagePercent: 'N/A'
            };
        }
    }

    /**
     * Force garbage collection (if available)
     */
    forceGC() {
        if (window.gc) {
            window.gc();
            console.log('🗑️ Forced garbage collection');
        } else {
            console.log('⚠️ Garbage collection not available');
        }
    }

    /**
     * Destroy optimizer and cleanup
     */
    destroy() {
        this.cleanup();
        console.log('🧠 MemoryOptimizer destroyed');
    }
}

// Global memory optimizer instance
window.memoryOptimizer = new MemoryOptimizer();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MemoryOptimizer;
}

console.log('✅ MemoryOptimizer loaded and ready');

