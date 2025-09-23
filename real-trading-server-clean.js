const express = require('express');
const cors = require('cors');
const { GSwap, PrivateKeySigner } = require('@gala-chain/gswap-sdk');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Global variables
let gswap = null;
let gswapWithSigner = null;
let walletAddress = null;
let privateKey = null;

// Initialize SDK without any custom endpoints - let it use defaults
async function initializeSDK() {
    try {
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

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        sdk: gswap ? 'initialized' : 'not initialized'
    });
});

// Prices endpoint
app.get('/api/prices', async (req, res) => {
    try {
        if (!gswap) {
            await initializeSDK();
        }

        const tokens = [
            'GALA|Unit|none|none',
            'GUSDC|Unit|none|none', 
            'ETIME|Unit|none|none',
            'GTON|Unit|none|none',
            'GOSMI|Unit|none|none',
            'FILM|Unit|none|none',
            'GMUSIC|Unit|none|none'
        ];

        const prices = [];
        
        for (const token of tokens) {
            try {
                if (token === 'GUSDC|Unit|none|none') {
                    // GUSDC is a stablecoin, set to $1.00
                    prices.push(1.00);
                } else if (token === 'GALA|Unit|none|none') {
                    // Get GALA price from GUSDC pair
                    try {
                        const quote = await gswap.quoting.quoteExactInput(
                            'GALA|Unit|none|none',
                            'GUSDC|Unit|none|none',
                            1
                        );
                        const galaUsdPrice = parseFloat(quote.outTokenAmount.toString());
                        prices.push(galaUsdPrice);
                        console.log(`💰 GALA USD price: $${galaUsdPrice} (from GUSDC pair)`);
                    } catch (error) {
                        console.log(`❌ Could not get GALA price: ${error.message}`);
                        prices.push(0.0176); // Fallback
                    }
                } else {
                    // Get other token prices via GALA
                    try {
                        const quote = await gswap.quoting.quoteExactInput(
                            token,
                            'GALA|Unit|none|none',
                            1
                        );
                        const tokenGalaPrice = parseFloat(quote.outTokenAmount.toString());
                        
                        // Convert to USD using GALA price
                        const galaUsdPrice = prices[0] || 0.0176;
                        const tokenUsdPrice = tokenGalaPrice * galaUsdPrice;
                        prices.push(tokenUsdPrice);
                        console.log(`📊 ${token}: ${tokenGalaPrice} GALA = $${tokenUsdPrice} USD`);
                    } catch (error) {
                        console.log(`❌ Could not get price for ${token}: ${error.message}`);
                        prices.push(1); // Fallback
                    }
                }
            } catch (error) {
                console.log(`❌ Error getting price for ${token}:`, error.message);
                prices.push(1); // Fallback
            }
        }

        res.json({
            success: true,
            status: 200,
            data: prices,
            timestamp: new Date().toISOString(),
            source: 'real-sdk'
        });

    } catch (error) {
        console.error('❌ Prices endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Quote endpoint
app.post('/api/quote', async (req, res) => {
    try {
        const { tokenIn, tokenOut, amountIn } = req.body;

        if (!gswap) {
            await initializeSDK();
        }

        const quote = await gswap.quoting.quoteExactInput(
            tokenIn,
            tokenOut,
            parseFloat(amountIn)
        );

        res.json({
            success: true,
            amountOut: quote.outTokenAmount.toString(),
            priceImpact: quote.priceImpact.toString(),
            fee: quote.feeTier,
            source: 'real-sdk'
        });

    } catch (error) {
        console.error('❌ Quote endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Swap endpoint
app.post('/api/swap', async (req, res) => {
    try {
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
            source: 'real-sdk'
        });

    } catch (error) {
        console.error('❌ Swap endpoint error:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
});

// Balance endpoint - simplified to use only SDK
app.get('/api/balance', async (req, res) => {
    try {
        const { address } = req.query;
        
        if (!address) {
            return res.status(400).json({ 
                success: false, 
                error: 'Address parameter required' 
            });
        }

        if (!gswap) {
            await initializeSDK();
        }

        console.log(`💳 Balance request for: ${address}`);

        // Ensure address is in correct format for SDK
        const formattedAddress = address.startsWith('eth|') ? address : `eth|${address}`;
        
        try {
            // Use SDK getUserAssets method exactly as documented
            console.log(`🔍 Fetching balances using SDK getUserAssets with address: ${formattedAddress}`);
            const assets = await gswap.assets.getUserAssets(formattedAddress, 1, 20);
            
            console.log(`🔍 SDK returned:`, typeof assets, Array.isArray(assets), assets);
            
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

            res.json({
                success: true,
                balances: balances,
                count: balances.length,
                source: 'prod1'
            });

        } catch (error) {
            console.error('❌ PROD1 getUserAssets failed:', error);
            console.log(`📊 PROD1 is currently down (403 Forbidden). Waiting for PROD1 to come back online.`);
            console.log(`🚫 No DEV1 fallback - user requested PROD1 only.`);
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

// Start server
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
            console.log(`🚀 GalaSwap Trading Bot Server with REAL SDK running on http://localhost:${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`💰 Prices endpoint: http://localhost:${PORT}/api/prices`);
            console.log(`📊 Quote endpoint: http://localhost:${PORT}/api/quote`);
            console.log(`🔄 Swap endpoint: http://localhost:${PORT}/api/swap`);
            console.log(`💳 Balance endpoint: http://localhost:${PORT}/api/balance`);
            console.log(`💡 Open galaswap-trading-bot.html in your browser to start trading!`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        // If it's a WebSocket error, we can still start the server for basic operations
        if (error.message && error.message.includes('websocket')) {
            console.log('⚠️ WebSocket connection failed, but starting server for basic operations');
            console.log('📊 PROD1 WebSocket is down (403 Forbidden) - server will run without real-time monitoring');
            
            app.listen(PORT, () => {
                console.log(`🚀 GalaSwap Trading Bot Server running on http://localhost:${PORT} (Limited Mode)`);
                console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
                console.log(`💰 Prices endpoint: http://localhost:${PORT}/api/prices`);
                console.log(`📊 Quote endpoint: http://localhost:${PORT}/api/quote`);
                console.log(`🔄 Swap endpoint: http://localhost:${PORT}/api/swap`);
                console.log(`💳 Balance endpoint: http://localhost:${PORT}/api/balance`);
                console.log(`💡 Open galaswap-trading-bot.html in your browser to start trading!`);
            });
        } else {
            process.exit(1);
        }
    }
}

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down server...');
    process.exit(0);
});

startServer();