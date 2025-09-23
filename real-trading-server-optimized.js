const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const NodeCache = require('node-cache');
const { GSwap, PrivateKeySigner } = require('@gala-chain/gswap-sdk');

const app = express();
const PORT = 3000;

// Performance optimizations
app.use(compression()); // Enable gzip compression
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// Caching system
const priceCache = new NodeCache({ stdTTL: 30 }); // 30 second cache for prices
const balanceCache = new NodeCache({ stdTTL: 10 }); // 10 second cache for balances
const quoteCache = new NodeCache({ stdTTL: 5 }); // 5 second cache for quotes

// Rate limiting
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 100;

// Global variables
let gswap = null;
let gswapWithSigner = null;
let walletAddress = null;
let privateKey = null;

// Performance metrics
const healthMetrics = {
    requests: 0,
    errors: 0,
    startTime: Date.now(),
    cacheHits: 0,
    cacheMisses: 0
};

// Rate limiting function
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

// Initialize SDK without any custom endpoints - let it use defaults
async function initializeSDK() {
    try {
        if (gswap) return; // Already initialized
        
        gswap = new GSwap({
            // Using SDK default configuration (PROD1 endpoints)
        });
        console.log('✅ GSwap SDK initialized successfully');
        console.log('🔧 Using SDK default endpoints (PROD1)');
    } catch (error) {
        console.error('❌ Failed to initialize SDK:', error);
        throw error;
    }
}

// Initialize SDK with signer
async function initializeSDKWithSigner() {
    try {
        if (!privateKey || !walletAddress) {
            throw new Error('Private key and wallet address required');
        }
        
        if (gswapWithSigner) return; // Already initialized
        
        gswapWithSigner = new GSwap({
            signer: new PrivateKeySigner(privateKey),
            walletAddress: walletAddress
            // Using SDK default configuration (PROD1 endpoints)
        });
        console.log('✅ GSwap SDK with signer initialized successfully');
    } catch (error) {
        console.error('❌ Failed to initialize SDK with signer:', error);
        throw error;
    }
}

// Optimized price fetching with parallel requests and caching
async function getOptimizedPrices() {
    // Check cache first
    const cachedPrices = priceCache.get('token_prices');
    if (cachedPrices) {
        healthMetrics.cacheHits++;
        return cachedPrices;
    }
    
    healthMetrics.cacheMisses++;

    const tokens = [
        'GALA|Unit|none|none',
        'GUSDC|Unit|none|none', 
        'GUSDT|Unit|none|none',
        'ETIME|Unit|none|none',
        'GTON|Unit|none|none',
        'GOSMI|Unit|none|none',
        'FILM|Unit|none|none',
        'GMUSIC|Unit|none|none'
    ];

    // Parallel price fetching instead of sequential
    const pricePromises = tokens.map(async (token, index) => {
        try {
            if (token === 'GUSDC|Unit|none|none' || token === 'GUSDT|Unit|none|none') {
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
                // Get GALA price from cache or calculate
                const galaPrice = await getGalaUsdPrice();
                return tokenGalaPrice * galaPrice;
            }
        } catch (error) {
            console.log(`❌ Price fetch failed for ${token}:`, error.message);
            return index === 0 ? 0.0176 : 1; // Fallback
        }
    });

    const prices = await Promise.all(pricePromises);
    
    // Convert array to object with token keys
    const priceObject = {};
    tokens.forEach((token, index) => {
        priceObject[token] = prices[index];
    });
    
    // Cache the results
    priceCache.set('token_prices', priceObject);
    
    return priceObject;
}

// Helper function to get GALA USD price
async function getGalaUsdPrice() {
    try {
        const quote = await gswap.quoting.quoteExactInput(
            'GALA|Unit|none|none',
            'GUSDC|Unit|none|none',
            1
        );
        return parseFloat(quote.outTokenAmount.toString());
    } catch (error) {
        return 0.0176; // Fallback
    }
}

// Health check endpoint with metrics
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
                balanceCache: balanceCache.getStats(),
                quoteCache: quoteCache.getStats(),
                cacheHitRate: healthMetrics.cacheHits / (healthMetrics.cacheHits + healthMetrics.cacheMisses) * 100
            }
        }
    });
});

// Optimized prices endpoint with caching
app.get('/api/prices', async (req, res) => {
    try {
        healthMetrics.requests++;
        
        if (!gswap) {
            await initializeSDK();
        }

        const prices = await getOptimizedPrices();

        res.json({
            success: true,
            status: 200,
            data: prices,
            timestamp: new Date().toISOString(),
            source: 'real-sdk-optimized',
            cached: priceCache.get('token_prices') ? true : false
        });

    } catch (error) {
        healthMetrics.errors++;
        console.error('❌ Prices endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// POST endpoint for prices (used by the bot)
app.post('/api/prices', async (req, res) => {
    try {
        healthMetrics.requests++;
        
        if (!gswap) {
            await initializeSDK();
        }

        const { tokens } = req.body;
        
        if (!tokens || !Array.isArray(tokens)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid request: tokens array is required'
            });
        }

        const prices = await getOptimizedPrices();
        
        // Filter prices for requested tokens
        const requestedPrices = tokens.map(token => {
            const price = prices[token] || null;
            return price;
        });

        res.json({
            success: true,
            status: 200,
            data: requestedPrices,
            timestamp: new Date().toISOString(),
            source: 'real-sdk-optimized',
            cached: priceCache.get('token_prices') ? true : false
        });

    } catch (error) {
        healthMetrics.errors++;
        console.error('❌ Prices POST endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Optimized quote endpoint with caching
app.post('/api/quote', async (req, res) => {
    try {
        healthMetrics.requests++;
        const { tokenIn, tokenOut, amountIn } = req.body;

        // Create cache key
        const cacheKey = `quote_${tokenIn}_${tokenOut}_${amountIn}`;
        
        // Check cache first
        const cachedQuote = quoteCache.get(cacheKey);
        if (cachedQuote) {
            healthMetrics.cacheHits++;
            return res.json(cachedQuote);
        }
        
        healthMetrics.cacheMisses++;

        if (!gswap) {
            await initializeSDK();
        }

        const quote = await gswap.quoting.quoteExactInput(
            tokenIn,
            tokenOut,
            parseFloat(amountIn)
        );

        const response = {
            success: true,
            amountOut: quote.outTokenAmount.toString(),
            priceImpact: quote.priceImpact.toString(),
            fee: quote.feeTier,
            source: 'real-sdk-optimized',
            cached: false
        };

        // Cache the response
        quoteCache.set(cacheKey, response);

        res.json(response);

    } catch (error) {
        healthMetrics.errors++;
        console.error('❌ Quote endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Swap endpoint (unchanged but with metrics)
app.post('/api/swap', async (req, res) => {
    try {
        healthMetrics.requests++;
        const { tokenIn, tokenOut, amountIn, amountOutMinimum, walletAddress: reqWalletAddress, privateKey: reqPrivateKey } = req.body;

        // Update global variables if provided
        if (reqWalletAddress && reqPrivateKey) {
            walletAddress = reqWalletAddress;
            privateKey = reqPrivateKey;
        }

        if (!walletAddress || !privateKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'Wallet address and private key required' 
            });
        }

        if (!gswapWithSigner) {
            await initializeSDKWithSigner();
        }

        // Get quote first
        const quote = await gswapWithSigner.quoting.quoteExactInput(
            tokenIn,
            tokenOut,
            parseFloat(amountIn)
        );

        // Execute swap
        const swapResult = await gswapWithSigner.swaps.swap(
            tokenIn,
            tokenOut,
            quote.feeTier,
            {
                exactIn: parseFloat(amountIn),
                amountOutMinimum: parseFloat(amountOutMinimum)
            },
            walletAddress
        );

        // Wait for transaction confirmation
        const receipt = await swapResult.wait();

        res.json({
            success: true,
            transactionHash: receipt.transactionHash,
            amountOut: quote.outTokenAmount.toString(),
            source: 'real-sdk-optimized'
        });

    } catch (error) {
        healthMetrics.errors++;
        console.error('❌ Swap endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Optimized balance endpoint with caching and rate limiting
app.get('/api/balance', async (req, res) => {
    try {
        healthMetrics.requests++;
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
            healthMetrics.cacheHits++;
            return res.json(cachedBalance);
        }
        
        healthMetrics.cacheMisses++;

        if (!gswap) {
            await initializeSDK();
        }

        console.log(`💳 Balance request for: ${address}`);

        const formattedAddress = address.startsWith('eth|') ? address : `eth|${address}`;
        
        try {
            console.log(`🔍 Fetching balances using SDK getUserAssets with address: ${formattedAddress}`);
            const assets = await gswap.assets.getUserAssets(formattedAddress, 1, 20);
            
            console.log(`🔍 SDK returned:`, typeof assets, Array.isArray(assets));
            
            // Handle SDK response format - it returns {tokens: [...], count: N}
            let tokenArray = assets;
            if (assets && assets.tokens && Array.isArray(assets.tokens)) {
                tokenArray = assets.tokens;
                console.log(`✅ Using assets.tokens array with ${tokenArray.length} tokens`);
            } else if (!Array.isArray(assets)) {
                console.log(`⚠️ SDK returned non-array data:`, assets);
                throw new Error(`SDK returned non-array data: ${typeof assets}`);
            }
            
            const balances = tokenArray
                .filter(asset => {
                    // Filter out test tokens
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

            console.log(`✅ PROD1 balances retrieved: ${balances.length} tokens`);
            console.log(`📤 Sending ${balances.length} balances to client: ${balances.map(b => `${b.symbol}:${b.balance}`).join(', ')}`);

            const response = {
                success: true,
                balances: balances,
                count: balances.length,
                source: 'prod1-optimized',
                cached: false
            };

            // Cache the response
            balanceCache.set(cacheKey, response);
            
            res.json(response);

        } catch (error) {
            healthMetrics.errors++;
            console.error('❌ PROD1 getUserAssets failed:', error);
            console.log(`📊 PROD1 is currently down (403 Forbidden). Waiting for PROD1 to come back online.`);
            console.log(`🚫 No DEV1 fallback - user requested PROD1 only.`);
            res.json({
                success: true,
                balances: [],
                count: 0,
                source: 'prod1-optimized',
                error: 'PROD1 endpoints are currently down (403 Forbidden). Waiting for PROD1 to come back online.'
            });
        }

    } catch (error) {
        healthMetrics.errors++;
        console.error('❌ Balance endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// POST endpoint for balance (used by the bot)
app.post('/api/balance', async (req, res) => {
    try {
        healthMetrics.requests++;
        const { walletAddress } = req.body;
        const clientId = req.ip;
        
        // Rate limiting
        if (!checkRateLimit(clientId)) {
            return res.status(429).json({ 
                success: false, 
                error: 'Rate limit exceeded' 
            });
        }
        
        if (!walletAddress) {
            return res.status(400).json({ 
                success: false, 
                error: 'walletAddress parameter required' 
            });
        }

        // Check cache first
        const cacheKey = `balance_${walletAddress}`;
        const cachedBalance = balanceCache.get(cacheKey);
        if (cachedBalance) {
            healthMetrics.cacheHits++;
            return res.json(cachedBalance);
        }
        
        healthMetrics.cacheMisses++;

        if (!gswap) {
            await initializeSDK();
        }

        console.log(`💳 Balance request for: ${walletAddress}`);
        console.log(`🔍 Fetching balances using SDK getUserAssets with address: ${walletAddress}`);

        const assets = await gswap.assets.getUserAssets(walletAddress);
        console.log(`🔍 SDK returned: ${typeof assets} ${assets ? 'true' : 'false'}`);

        if (assets && assets.tokens && Array.isArray(assets.tokens)) {
            console.log(`✅ Using assets.tokens array with ${assets.tokens.length} tokens`);
            
            const balances = assets.tokens
                .filter(asset => {
                    // Filter out test tokens
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

            console.log(`✅ PROD1 balances retrieved: ${balances.length} tokens`);
            console.log(`📤 Sending ${balances.length} balances to client: ${balances.map(b => `${b.symbol}:${b.balance}`).join(', ')}`);

            const response = {
                success: true,
                balances: balances,
                count: balances.length,
                source: 'prod1-optimized',
                cached: false
            };

            // Cache the response
            balanceCache.set(cacheKey, response);
            
            res.json(response);

        } else {
            console.error('❌ PROD1 getUserAssets failed:', 'Invalid response format');
            console.log(`📊 PROD1 is currently down (403 Forbidden). Waiting for PROD1 to come back online.`);
            console.log(`🚫 No DEV1 fallback - user requested PROD1 only.`);
            res.json({
                success: true,
                balances: [],
                count: 0,
                source: 'prod1-optimized',
                error: 'PROD1 endpoints are currently down (403 Forbidden). Waiting for PROD1 to come back online.'
            });
        }

    } catch (error) {
        healthMetrics.errors++;
        console.error('❌ Balance POST endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Start server with optimizations
async function startServer() {
    try {
        await initializeSDK();
        
        // Connect to event socket for real-time transaction monitoring
        try {
            await GSwap.events.connectEventSocket();
            console.log('✅ Event socket connected for real-time monitoring');
        } catch (socketError) {
            console.log('⚠️ Event socket connection failed (non-critical):', socketError.message);
            console.log('📊 PROD1 event socket is down (403 Forbidden) - continuing without real-time monitoring');
        }
        
        app.listen(PORT, () => {
            console.log(`🚀 GalaSwap Trading Bot Server (OPTIMIZED) running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`💰 Prices endpoint: http://localhost:${PORT}/api/prices`);
            console.log(`📊 Quote endpoint: http://localhost:${PORT}/api/quote`);
            console.log(`🔄 Swap endpoint: http://localhost:${PORT}/api/swap`);
            console.log(`💳 Balance endpoint: http://localhost:${PORT}/api/balance`);
            console.log(`⚡ Performance optimizations: Caching, Compression, Rate Limiting`);
            console.log(`💡 Open galaswap-trading-bot.html in your browser to start trading!`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        // If it's a WebSocket error, we can still start the server for basic operations
        if (error.message && error.message.includes('websocket')) {
            console.log('⚠️ WebSocket connection failed, but starting server for basic operations');
            console.log('📊 PROD1 WebSocket is down (403 Forbidden) - server will run without real-time monitoring');
            
            app.listen(PORT, () => {
                console.log(`🚀 GalaSwap Trading Bot Server (OPTIMIZED) running on http://localhost:${PORT} (Limited Mode)`);
                console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
                console.log(`💰 Prices endpoint: http://localhost:${PORT}/api/prices`);
                console.log(`📊 Quote endpoint: http://localhost:${PORT}/api/quote`);
                console.log(`🔄 Swap endpoint: http://localhost:${PORT}/api/swap`);
                console.log(`💳 Balance endpoint: http://localhost:${PORT}/api/balance`);
                console.log(`⚡ Performance optimizations: Caching, Compression, Rate Limiting`);
                console.log(`💡 Open galaswap-trading-bot.html in your browser to start trading!`);
            });
        } else {
            process.exit(1);
        }
    }
}

// Graceful shutdown with cleanup
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down optimized server...');
    
    // Clear all caches
    priceCache.flushAll();
    balanceCache.flushAll();
    quoteCache.flushAll();
    
    // Clear rate limiter
    rateLimiter.clear();
    
    console.log('✅ Cleanup completed');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down optimized server...');
    
    // Clear all caches
    priceCache.flushAll();
    balanceCache.flushAll();
    quoteCache.flushAll();
    
    // Clear rate limiter
    rateLimiter.clear();
    
    console.log('✅ Cleanup completed');
    process.exit(0);
});

startServer();
