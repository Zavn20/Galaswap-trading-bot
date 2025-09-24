/**
 * DOMBatcher - DOM Update Batching System
 * Batches DOM updates to improve performance and prevent layout thrashing
 */

class DOMBatcher {
    constructor() {
        this.updateQueue = [];
        this.isProcessing = false;
        this.batchSize = 10; // Process up to 10 updates per batch
        this.processingInterval = null;
        this.stats = {
            batched: 0,
            processed: 0,
            skipped: 0,
            errors: 0
        };
        
        // Start processing queue
        this.startProcessing();
        
        console.log('🎨 DOMBatcher initialized');
    }

    /**
     * Queue a DOM update
     * @param {Function} updateFunction - Function that performs DOM update
     * @param {string} id - Unique identifier for the update
     * @param {number} priority - Priority (higher = more important)
     */
    queueUpdate(updateFunction, id = null, priority = 0) {
        if (typeof updateFunction !== 'function') {
            console.error('❌ DOMBatcher: updateFunction must be a function');
            return;
        }

        const update = {
            id: id || `update_${Date.now()}_${Math.random()}`,
            function: updateFunction,
            priority: priority,
            timestamp: Date.now()
        };

        // Remove existing update with same ID
        this.updateQueue = this.updateQueue.filter(u => u.id !== id);

        // Add to queue
        this.updateQueue.push(update);
        
        // Sort by priority (higher priority first)
        this.updateQueue.sort((a, b) => b.priority - a.priority);
        
        this.stats.batched++;
        console.log(`🎨 Queued DOM update: ${update.id} (priority: ${priority})`);
    }

    /**
     * Process the update queue
     */
    processQueue() {
        if (this.isProcessing || this.updateQueue.length === 0) {
            return;
        }

        this.isProcessing = true;
        const startTime = performance.now();
        
        try {
            // Process up to batchSize updates
            const updatesToProcess = this.updateQueue.splice(0, this.batchSize);
            
            updatesToProcess.forEach(update => {
                try {
                    update.function();
                    this.stats.processed++;
                    console.log(`🎨 Processed DOM update: ${update.id}`);
                } catch (error) {
                    console.error(`❌ DOM update error for ${update.id}:`, error);
                    this.stats.errors++;
                }
            });

            const processingTime = performance.now() - startTime;
            console.log(`🎨 Processed ${updatesToProcess.length} DOM updates in ${processingTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ DOMBatcher processing error:', error);
            this.stats.errors++;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Start processing the queue
     */
    startProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
        }

        // Process queue every 16ms (60 FPS)
        this.processingInterval = setInterval(() => {
            this.processQueue();
        }, 16);
        
        console.log('🎨 DOMBatcher processing started');
    }

    /**
     * Stop processing the queue
     */
    stopProcessing() {
        if (this.processingInterval) {
            clearInterval(this.processingInterval);
            this.processingInterval = null;
        }
        
        // Process remaining updates
        this.processQueue();
        
        console.log('🎨 DOMBatcher processing stopped');
    }

    /**
     * Force immediate processing of all queued updates
     */
    flush() {
        console.log('🎨 Flushing DOM update queue...');
        
        while (this.updateQueue.length > 0) {
            this.processQueue();
        }
        
        console.log('🎨 DOM update queue flushed');
    }

    /**
     * Clear all queued updates
     */
    clear() {
        const clearedCount = this.updateQueue.length;
        this.updateQueue = [];
        this.stats.skipped += clearedCount;
        
        console.log(`🎨 Cleared ${clearedCount} queued DOM updates`);
    }

    /**
     * Get queue statistics
     * @returns {Object} Queue statistics
     */
    getStats() {
        return {
            ...this.stats,
            queueLength: this.updateQueue.length,
            isProcessing: this.isProcessing,
            batchSize: this.batchSize,
            queuedUpdates: this.updateQueue.map(u => ({
                id: u.id,
                priority: u.priority,
                age: Date.now() - u.timestamp
            }))
        };
    }

    /**
     * Create a batched version of a function
     * @param {Function} func - Function to batch
     * @param {string} id - Unique identifier
     * @param {number} priority - Priority level
     * @returns {Function} Batched function
     */
    createBatchedFunction(func, id, priority = 0) {
        return (...args) => {
            this.queueUpdate(() => func(...args), id, priority);
        };
    }

    /**
     * Batch multiple DOM updates together
     * @param {Array} updates - Array of update objects
     * @param {number} priority - Priority for the batch
     */
    batchUpdates(updates, priority = 0) {
        const batchId = `batch_${Date.now()}`;
        
        this.queueUpdate(() => {
            updates.forEach(update => {
                try {
                    if (typeof update === 'function') {
                        update();
                    } else if (update.function && typeof update.function === 'function') {
                        update.function();
                    }
                } catch (error) {
                    console.error(`❌ Batch update error:`, error);
                }
            });
        }, batchId, priority);
        
        console.log(`🎨 Batched ${updates.length} DOM updates: ${batchId}`);
    }

    /**
     * Optimize DOM updates by grouping similar operations
     * @param {Array} elements - Elements to update
     * @param {Function} updateFunction - Function to apply to each element
     * @param {string} batchId - Batch identifier
     */
    batchElementUpdates(elements, updateFunction, batchId = null) {
        if (!Array.isArray(elements) || elements.length === 0) {
            return;
        }

        const id = batchId || `element_batch_${Date.now()}`;
        
        this.queueUpdate(() => {
            elements.forEach(element => {
                try {
                    updateFunction(element);
                } catch (error) {
                    console.error(`❌ Element update error:`, error);
                }
            });
        }, id, 1);
        
        console.log(`🎨 Batched ${elements.length} element updates: ${id}`);
    }

    /**
     * Destroy the DOM batcher
     */
    destroy() {
        this.stopProcessing();
        this.clear();
        console.log('🎨 DOMBatcher destroyed');
    }
}

// Global DOM batcher instance
window.domBatcher = new DOMBatcher();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DOMBatcher;
}

console.log('✅ DOMBatcher loaded and ready');

