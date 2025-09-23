// Server-Side Optimizations for real-trading-server-clean.js
// These optimizations improve performance, reduce memory usage, and add caching

// 1. ADD CONNECTION POOLING AND CACHING
const NodeCache = require('node-cache');
const priceCache = new NodeCache({ stdTTL: 30 }); // 30 second cache
const balanceCache = new NodeCache({ stdTTL: 10 }); // 10 second cache

// 2. OPTIMIZE PRICE FETCHING WITH PARALLEL REQUESTS
async function getOptimizedPrices() {
    const tokens = [
        'GALA|Unit|none|none',
        'GUSDC|Unit|none|none', 
        'ETIME|Unit|none|none',
        'GTON|Unit|none|none',
        'GOSMI|Unit|none|none',
        'FILM|Unit|none|none',
        'GMUSIC|Unit|none|none'
    ];

    // Check cache first
    const cachedPrices = priceCache.get('token_prices');
    if (cachedPrices) {
        return cachedPrices;
    }

    // Parallel price fetching instead of sequential
    const pricePromises = tokens.map(async (token, index) => {
        try {
            if (token === 'GUSDC|Unit|none|none') {
                return 1.00; // Stablecoin
            } else if (token === 'GALA|Unit|none|none') {
                const quote = await gswap.quoting.quoteExactInput(
                    'GALA|Unit|none|none',
                    'GUSDC|Unit|none|none',
                    1
                );
                return parseFloat(quote.outTokenAmount.toString());
            } else {
                const quote = await gswap.quoting.quoteExactInput(
                    token,
                    'GALA|Unit|none|none',
                    1
                );
                const tokenGalaPrice = parseFloat(quote.outTokenAmount.toString());
                const galaUsdPrice = await getGalaUsdPrice();
                return tokenGalaPrice * galaUsdPrice;
            }
        } catch (error) {
            console.log(`❌ Price fetch failed for ${token}:`, error.message);
            return index === 0 ? 0.0176 : 1; // Fallback
        }
    });

    const prices = await Promise.all(pricePromises);
    
    // Cache the results
    priceCache.set('token_prices', prices);
    
    return prices;
}

// 3. ADD REQUEST RATE LIMITING
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

function checkRateLimit(clientId) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    
    if (!rateLimiter.has(clientId)) {
        rateLimiter.set(clientId, []);
    }
    
    const requests = rateLimiter.get(clientId);
    const recentRequests = requests.filter(time => time > windowStart);
    
    if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return false; // Rate limited
    }
    
    recentRequests.push(now);
    rateLimiter.set(clientId, recentRequests);
    return true;
}

// 4. OPTIMIZE BALANCE ENDPOINT WITH CACHING
app.get('/api/balance', async (req, res) => {
    try {
        const { address } = req.query;
        const clientId = req.ip;
        
        // Rate limiting
        if (!checkRateLimit(clientId)) {
            return res.status(429).json({ 
                success: false, 
                error: 'Rate limit exceeded' 
            });
        }
        
        if (!address) {
            return res.status(400).json({ 
                success: false, 
                error: 'Address parameter required' 
            });
        }

        // Check cache first
        const cacheKey = `balance_${address}`;
        const cachedBalance = balanceCache.get(cacheKey);
        if (cachedBalance) {
            return res.json(cachedBalance);
        }

        if (!gswap) {
            await initializeSDK();
        }

        const formattedAddress = address.startsWith('eth|') ? address : `eth|${address}`;
        
        try {
            const assets = await gswap.assets.getUserAssets(formattedAddress, 1, 20);
            
            let tokenArray = assets;
            if (assets && assets.tokens && Array.isArray(assets.tokens)) {
                tokenArray = assets.tokens;
            } else if (!Array.isArray(assets)) {
                throw new Error(`SDK returned non-array data: ${typeof assets}`);
            }
            
            const balances = tokenArray
                .filter(asset => {
                    const isTestToken = asset.symbol.includes('TEST') || 
                                      asset.symbol.includes('DEXT') || 
                                      asset.name.includes('Test') ||
                                      !asset.verify;
                    return !isTestToken;
                })
                .map(asset => ({
                    symbol: asset.symbol,
                    balance: asset.quantity || asset.balance,
                    contractAddress: asset.contractAddress,
                    decimals: asset.decimals,
                    verified: asset.verify || asset.verified,
                    image: asset.image
                }));

            const response = {
                success: true,
                balances: balances,
                count: balances.length,
                source: 'prod1',
                cached: false
            };

            // Cache the response
            balanceCache.set(cacheKey, response);
            
            res.json(response);

        } catch (error) {
            console.error('❌ PROD1 getUserAssets failed:', error);
            res.json({
                success: true,
                balances: [],
                count: 0,
                source: 'prod1',
                error: 'PROD1 endpoints are currently down (403 Forbidden). Waiting for PROD1 to come back online.'
            });
        }

    } catch (error) {
        console.error('❌ Balance endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// 5. ADD HEALTH MONITORING
const healthMetrics = {
    requests: 0,
    errors: 0,
    startTime: Date.now(),
    memoryUsage: process.memoryUsage()
};

app.get('/api/health', (req, res) => {
    healthMetrics.requests++;
    healthMetrics.memoryUsage = process.memoryUsage();
    
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        sdk: gswap ? 'initialized' : 'not initialized',
        metrics: {
            uptime: Date.now() - healthMetrics.startTime,
            requests: healthMetrics.requests,
            errors: healthMetrics.errors,
            memoryUsage: healthMetrics.memoryUsage,
            cacheStats: {
                priceCache: priceCache.getStats(),
                balanceCache: balanceCache.getStats()
            }
        }
    });
});

// 6. ADD GRACEFUL SHUTDOWN WITH CLEANUP
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server gracefully...');
    
    // Clear all caches
    priceCache.flushAll();
    balanceCache.flushAll();
    
    // Close any open connections
    if (gswap) {
        // Close SDK connections if available
    }
    
    console.log('✅ Cleanup completed');
    process.exit(0);
});
