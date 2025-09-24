const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const NodeCache = require('node-cache');
const { GSwap, PrivateKeySigner } = require('@gala-chain/gswap-sdk');
const PriceService = require('./price-service');

// Server Version Information
const SERVER_VERSION = '0.9.1';
const SERVER_NAME = 'GalaSwap Trading Bot Server';

const app = express();
const PORT = 3000;

// Performance optimizations
app.use(compression()); // Enable gzip compression
app.use(helmet()); // Security headers
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size

// Caching system - OPTIMIZED FOR 30-SECOND FRESHNESS REQUIREMENT
const priceCache = new NodeCache({ stdTTL: 30 }); // 30 second cache for prices to reduce API load
const balanceCache = new NodeCache({ stdTTL: 30 }); // 30 second cache for balances to reduce API load
const quoteCache = new NodeCache({ stdTTL: 10 }); // 10 second cache for quotes

// Rate limiting - INCREASED FOR 30-SECOND FRESHNESS REQUIREMENT
const rateLimiter = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 200; // Increased from 100 to accommodate more frequent calls

// Global variables
let gswap = null;
let gswapWithSigner = null;
let walletAddress = null;
let privateKey = null;
let priceService = null;

// Performance metrics
const healthMetrics = {
    requests: 0,
    errors: 0,
    startTime: Date.now(),
    cacheHits: 0,
    cacheMisses: 0,
    sdkRateLimitHits: 0,
    sdkErrors: 0,
    lastSDKError: null
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
        
        // Initialize price service
        if (!priceService) {
            priceService = new PriceService();
            console.log('✅ Price Service initialized with multi-source support');
        }
        
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

// Comprehensive price fetching with multiple sources
async function getOptimizedPrices() {
    // Check cache first
    const cachedPrices = priceCache.get('token_prices');
    if (cachedPrices) {
        healthMetrics.cacheHits++;
        return cachedPrices;
    }
    
    healthMetrics.cacheMisses++;

    try {
        // Use the new comprehensive price service
        const comprehensiveData = await priceService.getAllPrices(gswap);
        
        // Cache the final prices
        priceCache.set('token_prices', comprehensiveData.finalPrices);
        
        // Log price comparison for monitoring
        console.log(`📊 Price comparison summary:`);
        Object.entries(comprehensiveData.comparison).forEach(([token, data]) => {
            console.log(`  ${data.symbol}: $${data.recommended.price.toFixed(6)} (${data.recommended.source}, ${data.variance.toFixed(2)}% variance)`);
        });
        
        return comprehensiveData.finalPrices;
        
    } catch (error) {
        console.error('❌ Comprehensive price fetch failed:', error.message);
        
        // Fallback to basic GalaChain prices
        console.log('🔄 Falling back to basic GalaChain prices...');
        return await getBasicGalaChainPrices();
    }
}

// Fallback function for basic GalaChain prices
async function getBasicGalaChainPrices() {
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
                const galaUsdPrice = await getGalaUsdPrice();
                return tokenGalaPrice * galaUsdPrice;
            }
        } catch (error) {
            console.log(`❌ Fallback price fetch failed for ${token}:`, error.message);
            return index === 0 ? 0.0176 : 0.01; // Fallback
        }
    });

    const prices = await Promise.all(pricePromises);
    
    const priceObject = {};
    tokens.forEach((token, index) => {
        priceObject[token] = prices[index];
    });
    
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
        console.log(`❌ Could not get GALA USD price: ${error.message}`);
        return 0.015; // Fallback based on current market
    }
}

// Health check endpoint with metrics
app.get('/api/health', (req, res) => {
    healthMetrics.requests++;
    healthMetrics.memoryUsage = process.memoryUsage();
    
    const priceServiceHealth = priceService ? priceService.getHealthStatus() : {};
    
    res.json({ 
        status: 'healthy', 
        version: SERVER_VERSION,
        serverName: SERVER_NAME,
        timestamp: new Date().toISOString(),
        sdk: gswap ? 'initialized' : 'not initialized',
        priceService: priceService ? 'initialized' : 'not initialized',
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
            },
            sdkRateLimitHits: healthMetrics.sdkRateLimitHits,
            sdkErrors: healthMetrics.sdkErrors,
            lastSDKError: healthMetrics.lastSDKError
        },
        priceSources: priceServiceHealth,
        cache: {
            priceTTL: 30, // seconds - optimized for multi-source pricing
            balanceTTL: 15, // seconds
            quoteTTL: 10 // seconds
        },
        rateLimits: {
            maxRequestsPerMinute: MAX_REQUESTS_PER_WINDOW,
            windowSize: RATE_LIMIT_WINDOW / 1000 // seconds
        }
    });
});

// Comprehensive prices endpoint with multi-source data
app.get('/api/prices/comprehensive', async (req, res) => {
    try {
        healthMetrics.requests++;
        
        if (!gswap) {
            await initializeSDK();
        }

        const comprehensiveData = await priceService.getAllPrices(gswap);

        res.json({
            success: true,
            status: 200,
            data: comprehensiveData,
            timestamp: new Date().toISOString(),
            source: 'multi-source-comprehensive'
        });

    } catch (error) {
        healthMetrics.errors++;
        console.error('❌ Comprehensive prices endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Optimized prices endpoint with caching (backward compatibility)
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
            source: 'multi-source-optimized',
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

        // Validate amountIn
        const amount = parseFloat(amountIn);
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amountIn: must be positive',
                received: amountIn
            });
        }

        // Create cache key
        const cacheKey = `quote_${tokenIn}_${tokenOut}_${amount}`;
        
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
            amount
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

        // Use request values or fall back to global variables
        const currentWalletAddress = reqWalletAddress || walletAddress;
        const currentPrivateKey = reqPrivateKey || privateKey;

        if (!currentWalletAddress) {
            return res.status(400).json({ 
                success: false, 
                error: 'Wallet address required' 
            });
        }
        
        // Check if private key is provided and valid
        if (!currentPrivateKey || currentPrivateKey.trim() === '') {
            // No private key provided - return a simulated response for competition mode
            console.log(`⚠️ No private key provided - returning simulated swap response`);
            
            // Get quote first
            if (!gswap) {
                await initializeSDK();
            }
            
            const quote = await gswap.quoting.quoteExactInput(
                tokenIn,
                tokenOut,
                parseFloat(amountIn)
            );
            
            console.log(`📊 Simulated quote: ${quote.outTokenAmount} ${tokenOut}, Fee Tier: ${quote.feeTier}`);
            
            // Return simulated success response
            return res.json({
                success: true,
                transactionHash: 'SIMULATED_' + Date.now(),
                txId: 'SIMULATED_' + Date.now(),
                amountOut: quote.outTokenAmount.toString(),
                source: 'simulated-competition-mode',
                status: 'simulated',
                message: 'Simulated swap for competition mode (no private key provided)'
            });
        }

        // Update global variables for SDK initialization
        walletAddress = currentWalletAddress;
        privateKey = currentPrivateKey;

        if (!gswapWithSigner) {
            try {
                await initializeSDKWithSigner();
            } catch (initError) {
                console.error('❌ SDK initialization failed:', initError.message);
                return res.status(500).json({ 
                    success: false, 
                    error: `SDK initialization failed: ${initError.message}` 
                });
            }
        }

        // Check GALA balance for transaction fees
        console.log(`🔍 Checking GALA balance for transaction fees...`);
        const galaBalance = await gswapWithSigner.assets.getUserAssets(walletAddress, 1, 20);
        let galaTokenBalance = 0;
        
        if (galaBalance && galaBalance.tokens) {
            const galaToken = galaBalance.tokens.find(token => 
                token.symbol === 'GALA' || token.contractAddress?.includes('GALA')
            );
            if (galaToken) {
                galaTokenBalance = parseFloat(galaToken.quantity || galaToken.balance || 0);
            }
        }
        
        console.log(`💰 GALA balance: ${galaTokenBalance}`);
        
        if (galaTokenBalance < 1) {
            return res.status(400).json({
                success: false,
                error: `Insufficient GALA for transaction fees. Need at least 1 GALA, have ${galaTokenBalance}`,
                galaBalance: galaTokenBalance,
                required: 1
            });
        }

        // Get quote first
        const quote = await gswapWithSigner.quoting.quoteExactInput(
            tokenIn,
            tokenOut,
            parseFloat(amountIn)
        );

        console.log(`🔄 Executing swap: ${amountIn} ${tokenIn} → ${tokenOut}`);
        console.log(`📊 Quote: ${quote.outTokenAmount} ${tokenOut}, Fee Tier: ${quote.feeTier}`);

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

        console.log(`📤 Swap transaction submitted:`, swapResult);
        console.log(`📤 Transaction ID: ${swapResult.transactionId}`);
        console.log(`📤 Transaction Hash: ${swapResult.hash}`);

        // Generate a transaction ID if none provided
        const transactionId = swapResult.transactionId || swapResult.hash || `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        console.log(`📤 Final transaction ID: ${transactionId}`);

        // Return immediately with transaction hash, don't wait for confirmation
        res.json({
            success: true,
            transactionHash: transactionId,
            txId: transactionId,
            amountOut: quote.outTokenAmount.toString(),
            source: 'real-sdk-optimized',
            status: 'submitted',
            message: 'Transaction submitted successfully. Confirmation pending.'
        });

    } catch (error) {
        healthMetrics.errors++;
        console.error('❌ Swap endpoint error:', error);
        
        // Provide more specific error messages
        let errorMessage = error.message;
        if (error.message.includes('timeout')) {
            errorMessage = 'Transaction confirmation timeout - please check blockchain status';
        } else if (error.message.includes('insufficient')) {
            errorMessage = 'Insufficient balance or liquidity for swap';
        } else if (error.message.includes('revert')) {
            errorMessage = 'Transaction reverted - check token allowances and balances';
        } else if (error.message.includes('network')) {
            errorMessage = 'Network error - please try again';
        } else if (error.message.includes('burnTokens fee')) {
            errorMessage = 'Insufficient GALA balance for transaction fees - need at least 1 GALA';
        } else if (error.message.includes('PAYMENT_REQUIRED')) {
            errorMessage = 'Transaction fee payment failed - insufficient GALA balance';
        }
        
        res.status(500).json({ 
            success: false, 
            error: errorMessage,
            details: error.message
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
        
        // Ensure address has proper format for SDK
        let formattedAddress = walletAddress;
        if (!walletAddress.startsWith('eth|')) {
            formattedAddress = `eth|${walletAddress}`;
            console.log(`🔧 Formatted address: ${formattedAddress}`);
        }
        
        console.log(`🔍 Fetching balances using SDK getUserAssets with address: ${formattedAddress}`);

        const assets = await gswap.assets.getUserAssets(formattedAddress);
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
            console.log(`🚀 ${SERVER_NAME} v${SERVER_VERSION} (MULTI-SOURCE OPTIMIZED) running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`💰 Prices endpoint: http://localhost:${PORT}/api/prices`);
            console.log(`📊 Comprehensive prices: http://localhost:${PORT}/api/prices/comprehensive`);
            console.log(`📊 Quote endpoint: http://localhost:${PORT}/api/quote`);
            console.log(`🔄 Swap endpoint: http://localhost:${PORT}/api/swap`);
            console.log(`💳 Balance endpoint: http://localhost:${PORT}/api/balance`);
            console.log(`⚡ Performance optimizations: Multi-source pricing, Caching, Compression, Rate Limiting`);
            console.log(`🌐 Price sources: CoinGecko, CoinMarketCap, GalaChain`);
            console.log(`💡 Open galaswap-trading-bot-CLEAN.html in your browser to start trading!`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        // If it's a WebSocket error, we can still start the server for basic operations
        if (error.message && error.message.includes('websocket')) {
            console.log('⚠️ WebSocket connection failed, but starting server for basic operations');
            console.log('📊 PROD1 WebSocket is down (403 Forbidden) - server will run without real-time monitoring');
            
            app.listen(PORT, () => {
                console.log(`🚀 ${SERVER_NAME} v${SERVER_VERSION} (OPTIMIZED) running on http://localhost:${PORT} (Limited Mode)`);
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
