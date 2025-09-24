/**
 * ErrorRecovery - Sophisticated Error Recovery System
 * Handles network timeouts, SDK failures, and automatic retry mechanisms
 */

class ErrorRecovery {
    constructor() {
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000, // 1 second
            maxDelay: 10000, // 10 seconds
            backoffMultiplier: 2
        };
        
        this.circuitBreaker = {
            failureThreshold: 5,
            recoveryTimeout: 30000, // 30 seconds
            state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
            failureCount: 0,
            lastFailureTime: 0
        };
        
        this.stats = {
            retries: 0,
            successes: 0,
            failures: 0,
            circuitBreakerTrips: 0
        };
        
        console.log('🛡️ ErrorRecovery initialized');
    }

    /**
     * Execute function with retry logic
     * @param {Function} fn - Function to execute
     * @param {Object} options - Retry options
     * @returns {Promise} Result of function execution
     */
    async executeWithRetry(fn, options = {}) {
        const config = { ...this.retryConfig, ...options };
        let lastError;
        
        for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
            try {
                // Check circuit breaker
                if (this.circuitBreaker.state === 'OPEN') {
                    if (Date.now() - this.circuitBreaker.lastFailureTime < this.circuitBreaker.recoveryTimeout) {
                        throw new Error('Circuit breaker is OPEN - service unavailable');
                    } else {
                        this.circuitBreaker.state = 'HALF_OPEN';
                        console.log('🔄 Circuit breaker moved to HALF_OPEN');
                    }
                }
                
                const result = await fn();
                
                // Success - reset circuit breaker
                this.onSuccess();
                this.stats.successes++;
                
                return result;
                
            } catch (error) {
                lastError = error;
                this.onFailure();
                
                if (attempt === config.maxRetries) {
                    this.stats.failures++;
                    console.error(`❌ All retry attempts failed for ${fn.name || 'function'}:`, error);
                    throw error;
                }
                
                // Calculate delay with exponential backoff
                const delay = Math.min(
                    config.baseDelay * Math.pow(config.backoffMultiplier, attempt),
                    config.maxDelay
                );
                
                this.stats.retries++;
                console.log(`🔄 Retry ${attempt + 1}/${config.maxRetries} for ${fn.name || 'function'} in ${delay}ms`);
                
                await this.delay(delay);
            }
        }
        
        throw lastError;
    }

    /**
     * Handle successful operation
     */
    onSuccess() {
        if (this.circuitBreaker.state === 'HALF_OPEN') {
            this.circuitBreaker.state = 'CLOSED';
            this.circuitBreaker.failureCount = 0;
            console.log('✅ Circuit breaker moved to CLOSED');
        }
    }

    /**
     * Handle failed operation
     */
    onFailure() {
        this.circuitBreaker.failureCount++;
        this.circuitBreaker.lastFailureTime = Date.now();
        
        if (this.circuitBreaker.failureCount >= this.circuitBreaker.failureThreshold) {
            this.circuitBreaker.state = 'OPEN';
            this.circuitBreakerTrips++;
            console.log('🚨 Circuit breaker OPENED - too many failures');
        }
    }

    /**
     * Delay execution
     * @param {number} ms - Milliseconds to delay
     * @returns {Promise} Promise that resolves after delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Execute API call with retry and timeout
     * @param {string} url - API endpoint
     * @param {Object} options - Fetch options
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise} API response
     */
    async fetchWithRetry(url, options = {}, timeout = 10000) {
        return this.executeWithRetry(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            try {
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response;
                
            } catch (error) {
                clearTimeout(timeoutId);
                
                if (error.name === 'AbortError') {
                    throw new Error(`Request timeout after ${timeout}ms`);
                }
                
                throw error;
            }
        }, {
            maxRetries: 2,
            baseDelay: 2000
        });
    }

    /**
     * Execute SDK operation with retry
     * @param {Function} sdkOperation - SDK operation to execute
     * @param {string} operationName - Name of the operation
     * @returns {Promise} Operation result
     */
    async executeSDKOperation(sdkOperation, operationName = 'SDK Operation') {
        return this.executeWithRetry(async () => {
            try {
                return await sdkOperation();
            } catch (error) {
                // Handle specific SDK errors
                if (error.message.includes('timeout')) {
                    throw new Error(`${operationName} timeout - please check network connection`);
                } else if (error.message.includes('insufficient')) {
                    throw new Error(`${operationName} failed - insufficient balance or liquidity`);
                } else if (error.message.includes('revert')) {
                    throw new Error(`${operationName} reverted - check token allowances`);
                } else if (error.message.includes('network')) {
                    throw new Error(`${operationName} network error - please try again`);
                } else {
                    throw new Error(`${operationName} failed: ${error.message}`);
                }
            }
        }, {
            maxRetries: 3,
            baseDelay: 3000
        });
    }

    /**
     * Handle trading operation with recovery
     * @param {Function} tradingOperation - Trading operation
     * @param {string} operationType - Type of trading operation
     * @returns {Promise} Trading result
     */
    async executeTradingOperation(tradingOperation, operationType = 'Trading') {
        return this.executeWithRetry(async () => {
            try {
                return await tradingOperation();
            } catch (error) {
                // Handle trading-specific errors
                if (error.message.includes('slippage')) {
                    throw new Error(`${operationType} failed - slippage too high, try again`);
                } else if (error.message.includes('gas')) {
                    throw new Error(`${operationType} failed - insufficient gas, check balance`);
                } else if (error.message.includes('nonce')) {
                    throw new Error(`${operationType} failed - nonce error, retrying...`);
                } else {
                    throw new Error(`${operationType} failed: ${error.message}`);
                }
            }
        }, {
            maxRetries: 2,
            baseDelay: 5000
        });
    }

    /**
     * Get circuit breaker status
     * @returns {Object} Circuit breaker status
     */
    getCircuitBreakerStatus() {
        return {
            state: this.circuitBreaker.state,
            failureCount: this.circuitBreaker.failureCount,
            lastFailureTime: this.circuitBreaker.lastFailureTime,
            isOpen: this.circuitBreaker.state === 'OPEN',
            timeUntilRecovery: this.circuitBreaker.state === 'OPEN' 
                ? Math.max(0, this.circuitBreaker.recoveryTimeout - (Date.now() - this.circuitBreaker.lastFailureTime))
                : 0
        };
    }

    /**
     * Get error recovery statistics
     * @returns {Object} Recovery statistics
     */
    getStats() {
        return {
            ...this.stats,
            circuitBreaker: this.getCircuitBreakerStatus(),
            retryConfig: this.retryConfig
        };
    }

    /**
     * Reset circuit breaker
     */
    resetCircuitBreaker() {
        this.circuitBreaker.state = 'CLOSED';
        this.circuitBreaker.failureCount = 0;
        this.circuitBreaker.lastFailureTime = 0;
        console.log('🔄 Circuit breaker reset');
    }

    /**
     * Configure retry settings
     * @param {Object} config - New retry configuration
     */
    configureRetry(config) {
        this.retryConfig = { ...this.retryConfig, ...config };
        console.log('⚙️ Retry configuration updated:', this.retryConfig);
    }

    /**
     * Configure circuit breaker
     * @param {Object} config - New circuit breaker configuration
     */
    configureCircuitBreaker(config) {
        this.circuitBreaker = { ...this.circuitBreaker, ...config };
        console.log('⚙️ Circuit breaker configuration updated:', this.circuitBreaker);
    }

    /**
     * Health check for all systems
     * @returns {Object} Health status
     */
    async healthCheck() {
        const health = {
            timestamp: Date.now(),
            circuitBreaker: this.getCircuitBreakerStatus(),
            stats: this.getStats(),
            status: 'healthy'
        };
        
        // Determine overall health
        if (this.circuitBreaker.state === 'OPEN') {
            health.status = 'degraded';
        } else if (this.stats.failures > this.stats.successes) {
            health.status = 'warning';
        }
        
        return health;
    }

    /**
     * Destroy error recovery system
     */
    destroy() {
        this.resetCircuitBreaker();
        console.log('🛡️ ErrorRecovery destroyed');
    }
}

// Global error recovery instance
window.errorRecovery = new ErrorRecovery();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorRecovery;
}

console.log('✅ ErrorRecovery loaded and ready');
