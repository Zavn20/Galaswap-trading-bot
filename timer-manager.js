/**
 * TimerManager - Centralized Timer Management System
 * Prevents memory leaks by managing all timers in the application
 */

class TimerManager {
    constructor() {
        this.timers = new Map();
        this.intervals = new Map();
        this.timeouts = new Map();
        this.isDestroyed = false;
        
        // Performance monitoring
        this.stats = {
            totalTimers: 0,
            activeTimers: 0,
            destroyedTimers: 0,
            memoryLeaks: 0
        };
        
        console.log('⏰ TimerManager initialized');
    }

    /**
     * Create a managed setTimeout
     * @param {string} id - Unique identifier for the timer
     * @param {Function} callback - Function to execute
     * @param {number} delay - Delay in milliseconds
     * @param {...any} args - Arguments to pass to callback
     * @returns {string} Timer ID
     */
    setTimeout(id, callback, delay, ...args) {
        if (this.isDestroyed) {
            console.warn('⚠️ TimerManager is destroyed, ignoring setTimeout request');
            return null;
        }

        // Clear existing timer with same ID
        this.clearTimeout(id);

        const timerId = setTimeout(() => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`❌ Timer ${id} callback error:`, error);
            } finally {
                this.timeouts.delete(id);
                this.stats.activeTimers = this.timeouts.size + this.intervals.size;
            }
        }, delay);

        this.timeouts.set(id, timerId);
        this.stats.totalTimers++;
        this.stats.activeTimers = this.timeouts.size + this.intervals.size;

        console.log(`⏰ Created timeout: ${id} (${delay}ms)`);
        return id;
    }

    /**
     * Create a managed setInterval
     * @param {string} id - Unique identifier for the timer
     * @param {Function} callback - Function to execute
     * @param {number} interval - Interval in milliseconds
     * @param {...any} args - Arguments to pass to callback
     * @returns {string} Timer ID
     */
    setInterval(id, callback, interval, ...args) {
        if (this.isDestroyed) {
            console.warn('⚠️ TimerManager is destroyed, ignoring setInterval request');
            return null;
        }

        // Clear existing interval with same ID
        this.clearInterval(id);

        const intervalId = setInterval(() => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`❌ Interval ${id} callback error:`, error);
            }
        }, interval);

        this.intervals.set(id, intervalId);
        this.stats.totalTimers++;
        this.stats.activeTimers = this.timeouts.size + this.intervals.size;

        console.log(`⏰ Created interval: ${id} (${interval}ms)`);
        return id;
    }

    /**
     * Clear a timeout by ID
     * @param {string} id - Timer ID to clear
     */
    clearTimeout(id) {
        if (this.timeouts.has(id)) {
            clearTimeout(this.timeouts.get(id));
            this.timeouts.delete(id);
            this.stats.destroyedTimers++;
            this.stats.activeTimers = this.timeouts.size + this.intervals.size;
            console.log(`⏰ Cleared timeout: ${id}`);
        }
    }

    /**
     * Check if a timeout exists
     * @param {string} id - Timer ID to check
     * @returns {boolean} True if timeout exists
     */
    hasTimeout(id) {
        return this.timeouts.has(id);
    }

    /**
     * Clear an interval by ID
     * @param {string} id - Interval ID to clear
     */
    clearInterval(id) {
        if (this.intervals.has(id)) {
            clearInterval(this.intervals.get(id));
            this.intervals.delete(id);
            this.stats.destroyedTimers++;
            this.stats.activeTimers = this.timeouts.size + this.intervals.size;
            console.log(`⏰ Cleared interval: ${id}`);
        }
    }

    /**
     * Clear all timers
     */
    clearAll() {
        console.log('🧹 Clearing all timers...');
        
        // Clear all timeouts
        this.timeouts.forEach((timerId, id) => {
            clearTimeout(timerId);
            console.log(`⏰ Cleared timeout: ${id}`);
        });
        this.timeouts.clear();

        // Clear all intervals
        this.intervals.forEach((intervalId, id) => {
            clearInterval(intervalId);
            console.log(`⏰ Cleared interval: ${id}`);
        });
        this.intervals.clear();

        this.stats.activeTimers = 0;
        console.log('✅ All timers cleared');
    }

    /**
     * Get timer statistics
     * @returns {Object} Timer statistics
     */
    getStats() {
        return {
            ...this.stats,
            activeTimeouts: this.timeouts.size,
            activeIntervals: this.intervals.size,
            timeoutIds: Array.from(this.timeouts.keys()),
            intervalIds: Array.from(this.intervals.keys())
        };
    }

    /**
     * Check for potential memory leaks
     * @returns {Object} Memory leak analysis
     */
    checkMemoryLeaks() {
        const stats = this.getStats();
        const potentialLeaks = [];

        // Check for too many active timers
        if (stats.activeTimers > 20) {
            potentialLeaks.push({
                type: 'excessive_timers',
                message: `Too many active timers: ${stats.activeTimers}`,
                severity: 'high'
            });
        }

        // Check for long-running intervals
        this.intervals.forEach((intervalId, id) => {
            if (id.includes('long_running') || id.includes('continuous')) {
                potentialLeaks.push({
                    type: 'long_running_interval',
                    message: `Long-running interval detected: ${id}`,
                    severity: 'medium'
                });
            }
        });

        return {
            hasLeaks: potentialLeaks.length > 0,
            leaks: potentialLeaks,
            stats: stats
        };
    }

    /**
     * Destroy the timer manager and clear all timers
     */
    destroy() {
        console.log('💥 Destroying TimerManager...');
        this.clearAll();
        this.isDestroyed = true;
        this.timers.clear();
        console.log('✅ TimerManager destroyed');
    }

    /**
     * Create a debounced function
     * @param {string} id - Unique identifier
     * @param {Function} func - Function to debounce
     * @param {number} delay - Debounce delay
     * @returns {Function} Debounced function
     */
    debounce(id, func, delay) {
        return (...args) => {
            this.clearTimeout(id);
            this.setTimeout(id, () => func(...args), delay);
        };
    }

    /**
     * Create a throttled function
     * @param {string} id - Unique identifier
     * @param {Function} func - Function to throttle
     * @param {number} delay - Throttle delay
     * @returns {Function} Throttled function
     */
    throttle(id, func, delay) {
        let lastCall = 0;
        return (...args) => {
            const now = Date.now();
            if (now - lastCall >= delay) {
                lastCall = now;
                func(...args);
            }
        };
    }
}

// Global timer manager instance
window.timerManager = new TimerManager();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimerManager;
}

console.log('✅ TimerManager loaded and ready');

