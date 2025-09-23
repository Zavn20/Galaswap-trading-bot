// Client-Side Optimizations for galaswap-trading-bot.html
// These optimizations reduce memory leaks, improve performance, and optimize DOM operations

// 1. TIMER MANAGEMENT SYSTEM
class TimerManager {
    constructor() {
        this.timers = new Map();
        this.intervals = new Map();
    }

    setTimeout(id, callback, delay) {
        this.clearTimeout(id);
        const timer = setTimeout(callback, delay);
        this.timers.set(id, timer);
        return timer;
    }

    setInterval(id, callback, delay) {
        this.clearInterval(id);
        const interval = setInterval(callback, delay);
        this.intervals.set(id, interval);
        return interval;
    }

    clearTimeout(id) {
        if (this.timers.has(id)) {
            clearTimeout(this.timers.get(id));
            this.timers.delete(id);
        }
    }

    clearInterval(id) {
        if (this.intervals.has(id)) {
            clearInterval(this.intervals.get(id));
            this.intervals.delete(id);
        }
    }

    clearAll() {
        this.timers.forEach(timer => clearTimeout(timer));
        this.intervals.forEach(interval => clearInterval(interval));
        this.timers.clear();
        this.intervals.clear();
    }
}

// Global timer manager
const timerManager = new TimerManager();

// 2. DEBOUNCED FUNCTIONS
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 3. OPTIMIZED DOM OPERATIONS
class DOMOptimizer {
    constructor() {
        this.updateQueue = [];
        this.isProcessing = false;
    }

    queueUpdate(updateFunction) {
        this.updateQueue.push(updateFunction);
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    processQueue() {
        this.isProcessing = true;
        requestAnimationFrame(() => {
            while (this.updateQueue.length > 0) {
                const update = this.updateQueue.shift();
                try {
                    update();
                } catch (error) {
                    console.error('DOM update error:', error);
                }
            }
            this.isProcessing = false;
        });
    }
}

const domOptimizer = new DOMOptimizer();

// 4. OPTIMIZED LOCALSTORAGE WITH COMPRESSION
class StorageManager {
    constructor() {
        this.cache = new Map();
        this.maxCacheSize = 50; // Maximum cached items
    }

    set(key, value, compress = true) {
        try {
            const serialized = JSON.stringify(value);
            const data = compress ? this.compress(serialized) : serialized;
            
            // Cache management
            if (this.cache.size >= this.maxCacheSize) {
                const firstKey = this.cache.keys().next().value;
                this.cache.delete(firstKey);
            }
            
            this.cache.set(key, value);
            localStorage.setItem(key, data);
        } catch (error) {
            console.error('Storage set error:', error);
            // Fallback: try without compression
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (fallbackError) {
                console.error('Storage fallback failed:', fallbackError);
            }
        }
    }

    get(key, decompress = true) {
        try {
            // Check cache first
            if (this.cache.has(key)) {
                return this.cache.get(key);
            }

            const data = localStorage.getItem(key);
            if (!data) return null;

            const decompressed = decompress ? this.decompress(data) : data;
            const parsed = JSON.parse(decompressed);
            
            // Cache the result
            this.cache.set(key, parsed);
            return parsed;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    }

    compress(str) {
        // Simple compression using LZ-string-like algorithm
        // In production, consider using a proper compression library
        return btoa(str); // Base64 encoding as simple compression
    }

    decompress(str) {
        try {
            return atob(str); // Base64 decoding
        } catch (error) {
            return str; // Return original if decompression fails
        }
    }

    clear() {
        this.cache.clear();
        localStorage.clear();
    }
}

const storageManager = new StorageManager();

// 5. OPTIMIZED EVENT LISTENER MANAGEMENT
class EventManager {
    constructor() {
        this.listeners = new Map();
    }

    add(element, event, handler, options = {}) {
        const key = `${element}_${event}`;
        
        // Remove existing listener if any
        this.remove(element, event);
        
        element.addEventListener(event, handler, options);
        this.listeners.set(key, { element, event, handler, options });
    }

    remove(element, event) {
        const key = `${element}_${event}`;
        const listener = this.listeners.get(key);
        
        if (listener) {
            listener.element.removeEventListener(listener.event, listener.handler, listener.options);
            this.listeners.delete(key);
        }
    }

    removeAll() {
        this.listeners.forEach(({ element, event, handler, options }) => {
            element.removeEventListener(event, handler, options);
        });
        this.listeners.clear();
    }
}

const eventManager = new EventManager();

// 6. OPTIMIZED API CALLS WITH CACHING
class APICache {
    constructor() {
        this.cache = new Map();
        this.maxAge = 30000; // 30 seconds
    }

    async get(url, options = {}) {
        const key = `${url}_${JSON.stringify(options)}`;
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.maxAge) {
            return cached.data;
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();
            
            this.cache.set(key, {
                data,
                timestamp: Date.now()
            });
            
            return data;
        } catch (error) {
            console.error('API call failed:', error);
            throw error;
        }
    }

    clear() {
        this.cache.clear();
    }
}

const apiCache = new APICache();

// 7. MEMORY LEAK PREVENTION
class MemoryManager {
    constructor() {
        this.observers = [];
        this.callbacks = [];
    }

    addObserver(observer) {
        this.observers.push(observer);
    }

    addCallback(callback) {
        this.callbacks.push(callback);
    }

    cleanup() {
        // Cleanup observers
        this.observers.forEach(observer => {
            if (observer.disconnect) {
                observer.disconnect();
            }
        });
        this.observers = [];

        // Cleanup callbacks
        this.callbacks.forEach(callback => {
            if (typeof callback === 'function') {
                callback();
            }
        });
        this.callbacks = [];

        // Clear all timers
        timerManager.clearAll();

        // Clear event listeners
        eventManager.removeAll();

        // Clear caches
        apiCache.clear();
        storageManager.cache.clear();
    }
}

const memoryManager = new MemoryManager();

// 8. OPTIMIZED BALANCE UPDATE SYSTEM
class BalanceUpdateManager {
    constructor() {
        this.isUpdating = false;
        this.updateQueue = [];
        this.lastUpdate = 0;
        this.updateInterval = 30000; // 30 seconds
    }

    async updateBalances() {
        if (this.isUpdating) {
            return; // Prevent concurrent updates
        }

        const now = Date.now();
        if (now - this.lastUpdate < this.updateInterval) {
            return; // Rate limiting
        }

        this.isUpdating = true;
        this.lastUpdate = now;

        try {
            // Use cached API call
            const data = await apiCache.get('http://localhost:3000/api/balance?address=eth%7C' + walletAddress);
            
            if (data && data.success) {
                // Update balances efficiently
                domOptimizer.queueUpdate(() => {
                    this.processBalanceUpdate(data.balances);
                });
            }
        } catch (error) {
            console.error('Balance update failed:', error);
        } finally {
            this.isUpdating = false;
        }
    }

    processBalanceUpdate(balances) {
        // Efficient balance processing
        balances.forEach(balance => {
            if (!balance.symbol.includes('TEST') && !balance.symbol.includes('DEXT')) {
                tokenBalances[balance.symbol] = parseFloat(balance.balance);
            }
        });

        // Update UI efficiently
        updateBalanceDisplay();
        updateStatus();
    }
}

const balanceUpdateManager = new BalanceUpdateManager();

// 9. CLEANUP ON PAGE UNLOAD
window.addEventListener('beforeunload', () => {
    memoryManager.cleanup();
});

// 10. USAGE EXAMPLES FOR EXISTING CODE

// Replace existing setTimeout calls:
// OLD: setTimeout(() => { updateBalanceDisplay(); }, 100);
// NEW: timerManager.setTimeout('balance_update', () => { updateBalanceDisplay(); }, 100);

// Replace existing setInterval calls:
// OLD: setInterval(() => { scanForOpportunities(); }, 5000);
// NEW: timerManager.setInterval('opportunity_scan', () => { scanForOpportunities(); }, 5000);

// Replace localStorage operations:
// OLD: localStorage.setItem('key', JSON.stringify(data));
// NEW: storageManager.set('key', data);

// OLD: JSON.parse(localStorage.getItem('key'));
// NEW: storageManager.get('key');

// Replace DOM updates:
// OLD: updateBalanceDisplay();
// NEW: domOptimizer.queueUpdate(() => updateBalanceDisplay());

// Replace API calls:
// OLD: fetch('http://localhost:3000/api/prices').then(r => r.json())
// NEW: apiCache.get('http://localhost:3000/api/prices')
