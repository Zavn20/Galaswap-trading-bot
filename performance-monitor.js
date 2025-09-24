/**
 * PerformanceMonitor - Real-time Performance Metrics Dashboard
 * Monitors and displays performance metrics for the trading bot
 */

class PerformanceMonitor {
    constructor() {
        this.metrics = {
            memory: { current: 0, peak: 0, trend: [] },
            timers: { active: 0, total: 0, leaks: 0 },
            api: { requests: 0, cacheHits: 0, errors: 0 },
            dom: { updates: 0, batched: 0, errors: 0 },
            trading: { trades: 0, opportunities: 0, errors: 0 }
        };
        
        this.updateInterval = null;
        this.dashboardElement = null;
        this.isVisible = false;
        
        this.createDashboard();
        this.startMonitoring();
        
        console.log('📊 PerformanceMonitor initialized');
    }

    /**
     * Create the performance dashboard UI
     */
    createDashboard() {
        // Create dashboard container
        this.dashboardElement = document.createElement('div');
        this.dashboardElement.id = 'performance-dashboard';
        this.dashboardElement.style.cssText = `
            position: fixed;
            top: 10px;
            right: 10px;
            width: 300px;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #00ff00;
            z-index: 10000;
            display: none;
            max-height: 80vh;
            overflow-y: auto;
        `;

        // Create dashboard content
        this.dashboardElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; color: #00ff00;">📊 Performance Monitor</h3>
                <button id="close-dashboard" style="background: #ff4444; color: white; border: none; border-radius: 3px; padding: 2px 6px; cursor: pointer;">×</button>
            </div>
            
            <div id="performance-metrics">
                <div class="metric-section">
                    <h4 style="color: #ffff00; margin: 5px 0;">🧠 Memory Usage</h4>
                    <div id="memory-info">Loading...</div>
                </div>
                
                <div class="metric-section">
                    <h4 style="color: #ffff00; margin: 5px 0;">⏰ Timer Status</h4>
                    <div id="timer-info">Loading...</div>
                </div>
                
                <div class="metric-section">
                    <h4 style="color: #ffff00; margin: 5px 0;">🌐 API Performance</h4>
                    <div id="api-info">Loading...</div>
                </div>
                
                <div class="metric-section">
                    <h4 style="color: #ffff00; margin: 5px 0;">🎨 DOM Updates</h4>
                    <div id="dom-info">Loading...</div>
                </div>
                
                <div class="metric-section">
                    <h4 style="color: #ffff00; margin: 5px 0;">💰 Trading Stats</h4>
                    <div id="trading-info">Loading...</div>
                </div>
            </div>
            
            <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #333;">
                <button id="force-gc" style="background: #4444ff; color: white; border: none; border-radius: 3px; padding: 5px 10px; cursor: pointer; margin-right: 5px;">🗑️ Force GC</button>
                <button id="clear-cache" style="background: #ff8800; color: white; border: none; border-radius: 3px; padding: 5px 10px; cursor: pointer;">🧹 Clear Cache</button>
            </div>
        `;

        // Add to page
        if (document.body) {
            document.body.appendChild(this.dashboardElement);
        } else {
            console.warn('⚠️ Performance monitor: document.body not available yet');
            // Wait for DOM to be ready
            document.addEventListener('DOMContentLoaded', () => {
                if (document.body) {
                    document.body.appendChild(this.dashboardElement);
                }
            });
        }

        // Add event listeners (with null checks)
        const closeBtn = document.getElementById('close-dashboard');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        const gcBtn = document.getElementById('force-gc');
        if (gcBtn) {
            gcBtn.addEventListener('click', () => {
                if (window.memoryOptimizer) {
                    window.memoryOptimizer.forceGC();
                }
            });
        }

        const cacheBtn = document.getElementById('clear-cache');
        if (cacheBtn) {
            cacheBtn.addEventListener('click', () => {
                if (window.apiCache) {
                    window.apiCache.clear();
                }
            });
        }
    }

    /**
     * Start monitoring performance metrics
     */
    startMonitoring() {
        this.updateInterval = setInterval(() => {
            this.updateMetrics();
            this.updateDashboard();
        }, 1000); // Update every second
        
        console.log('📊 Performance monitoring started');
    }

    /**
     * Update performance metrics
     */
    updateMetrics() {
        // Memory metrics
        if (performance.memory) {
            const currentMemory = performance.memory.usedJSHeapSize;
            this.metrics.memory.current = currentMemory;
            this.metrics.memory.peak = Math.max(this.metrics.memory.peak, currentMemory);
            this.metrics.memory.trend.push(currentMemory);
            
            // Keep only last 60 data points (1 minute)
            if (this.metrics.memory.trend.length > 60) {
                this.metrics.memory.trend.shift();
            }
        }

        // Timer metrics
        if (window.timerManager) {
            const timerStats = window.timerManager.getStats();
            this.metrics.timers.active = timerStats.activeTimers;
            this.metrics.timers.total = timerStats.totalTimers;
            this.metrics.timers.leaks = timerStats.activeTimers > 20 ? 1 : 0;
        }

        // API metrics
        if (window.apiCache) {
            const apiStats = window.apiCache.getStats();
            this.metrics.api.requests = apiStats.hits + apiStats.misses;
            this.metrics.api.cacheHits = apiStats.hits;
            this.metrics.api.errors = 0; // Would need to track API errors
        }

        // DOM metrics
        if (window.domBatcher) {
            const domStats = window.domBatcher.getStats();
            this.metrics.dom.updates = domStats.processed;
            this.metrics.dom.batched = domStats.batched;
            this.metrics.dom.errors = domStats.errors;
        }

        // Trading metrics (would need to integrate with trading system)
        this.metrics.trading.trades = window.totalTrades || 0;
        this.metrics.trading.opportunities = 0; // Would need to track
        this.metrics.trading.errors = 0; // Would need to track
    }

    /**
     * Update the dashboard display
     */
    updateDashboard() {
        if (!this.dashboardElement || !this.isVisible) return;

        // Memory info
        const memoryInfo = document.getElementById('memory-info');
        if (memoryInfo) {
            const currentMB = (this.metrics.memory.current / 1024 / 1024).toFixed(2);
            const peakMB = (this.metrics.memory.peak / 1024 / 1024).toFixed(2);
            const trend = this.getMemoryTrend();
            
            memoryInfo.innerHTML = `
                <div>Current: ${currentMB} MB</div>
                <div>Peak: ${peakMB} MB</div>
                <div>Trend: ${trend}</div>
                <div>Status: ${this.getMemoryStatus()}</div>
            `;
        }

        // Timer info
        const timerInfo = document.getElementById('timer-info');
        if (timerInfo) {
            timerInfo.innerHTML = `
                <div>Active: ${this.metrics.timers.active}</div>
                <div>Total: ${this.metrics.timers.total}</div>
                <div>Status: ${this.getTimerStatus()}</div>
            `;
        }

        // API info
        const apiInfo = document.getElementById('api-info');
        if (apiInfo && window.apiCache) {
            const apiStats = window.apiCache.getStats();
            apiInfo.innerHTML = `
                <div>Requests: ${apiStats.hits + apiStats.misses}</div>
                <div>Cache Hits: ${apiStats.hits}</div>
                <div>Hit Rate: ${apiStats.hitRate}</div>
                <div>Memory: ${apiStats.memoryUsage}</div>
            `;
        }

        // DOM info
        const domInfo = document.getElementById('dom-info');
        if (domInfo && window.domBatcher) {
            const domStats = window.domBatcher.getStats();
            domInfo.innerHTML = `
                <div>Updates: ${domStats.processed}</div>
                <div>Batched: ${domStats.batched}</div>
                <div>Queue: ${domStats.queueLength}</div>
                <div>Errors: ${domStats.errors}</div>
            `;
        }

        // Trading info
        const tradingInfo = document.getElementById('trading-info');
        if (tradingInfo) {
            tradingInfo.innerHTML = `
                <div>Trades: ${this.metrics.trading.trades}</div>
                <div>Opportunities: ${this.metrics.trading.opportunities}</div>
                <div>Errors: ${this.metrics.trading.errors}</div>
                <div>Status: ${window.botRunning ? 'Running' : 'Stopped'}</div>
            `;
        }
    }

    /**
     * Get memory trend indicator
     * @returns {string} Trend indicator
     */
    getMemoryTrend() {
        const trend = this.metrics.memory.trend;
        if (trend.length < 2) return '📊';
        
        const recent = trend.slice(-5);
        const older = trend.slice(-10, -5);
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        if (recentAvg > olderAvg * 1.1) return '📈 Rising';
        if (recentAvg < olderAvg * 0.9) return '📉 Falling';
        return '➡️ Stable';
    }

    /**
     * Get memory status
     * @returns {string} Memory status
     */
    getMemoryStatus() {
        const currentMB = this.metrics.memory.current / 1024 / 1024;
        
        if (currentMB < 50) return '🟢 Good';
        if (currentMB < 100) return '🟡 Warning';
        return '🔴 Critical';
    }

    /**
     * Get timer status
     * @returns {string} Timer status
     */
    getTimerStatus() {
        if (this.metrics.timers.active < 10) return '🟢 Good';
        if (this.metrics.timers.active < 20) return '🟡 Warning';
        return '🔴 Too Many';
    }

    /**
     * Show the dashboard
     */
    show() {
        if (this.dashboardElement) {
            this.dashboardElement.style.display = 'block';
            this.isVisible = true;
            console.log('📊 Performance dashboard shown');
        }
    }

    /**
     * Hide the dashboard
     */
    hide() {
        if (this.dashboardElement) {
            this.dashboardElement.style.display = 'none';
            this.isVisible = false;
            console.log('📊 Performance dashboard hidden');
        }
    }

    /**
     * Toggle dashboard visibility
     */
    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    /**
     * Get performance summary
     * @returns {Object} Performance summary
     */
    getSummary() {
        return {
            memory: {
                current: this.formatBytes(this.metrics.memory.current),
                peak: this.formatBytes(this.metrics.memory.peak),
                status: this.getMemoryStatus()
            },
            timers: {
                active: this.metrics.timers.active,
                status: this.getTimerStatus()
            },
            api: window.apiCache ? window.apiCache.getStats() : null,
            dom: window.domBatcher ? window.domBatcher.getStats() : null,
            trading: this.metrics.trading
        };
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
     * Destroy the performance monitor
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.dashboardElement) {
            this.dashboardElement.remove();
        }
        
        console.log('📊 PerformanceMonitor destroyed');
    }
}

// Global performance monitor instance
window.performanceMonitor = new PerformanceMonitor();

// Add keyboard shortcut to toggle dashboard (Ctrl+Shift+P)
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        window.performanceMonitor.toggle();
    }
});

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}

console.log('✅ PerformanceMonitor loaded and ready');
console.log('💡 Press Ctrl+Shift+P to toggle performance dashboard');
