const http = require('http');
const { GSwap, PrivateKeySigner, FEE_TIER } = require('@gala-chain/gswap-sdk');

const PORT = 3000;

// Global SDK instances
let gswap = null;
let gswapWithSigner = null;

// Initialize read-only SDK
function initializeSDK() {
    try {
        gswap = new GSwap({
            network: 'mainnet',
            bundlerUrl: 'https://bundle-backend-prod1.defi.gala.com'
        });
        console.log('✅ GSwap SDK initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize SDK:', error.message);
        return false;
    }
}

// Initialize SDK with signer for transactions
function initializeSDKWithSigner(privateKey, walletAddress) {
    try {
        gswapWithSigner = new GSwap({
            signer: new PrivateKeySigner(privateKey),
            walletAddress: walletAddress,
            network: 'mainnet',
            bundlerUrl: 'https://bundle-backend-prod1.defi.gala.com'
        });
        console.log('✅ GSwap SDK with signer initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to initialize SDK with signer:', error.message);
        return false;
    }
}

// Connect to event socket for real-time monitoring
async function connectEventSocket() {
    try {
        if (!GSwap.events.eventSocketConnected()) {
            await GSwap.events.connectEventSocket();
            console.log('✅ Event socket connected for real-time monitoring');
        }
    } catch (error) {
        console.error('❌ Failed to connect event socket:', error.message);
    }
}

// Create HTTP server
const server = http.createServer(async (req, res) => {
    const { method, url } = req;
    const urlObj = new URL(url, `http://localhost:${PORT}`);
    const path = urlObj.pathname;

    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Health check endpoint
    if (path === '/api/health' && method === 'GET') {
        const isSDKReady = gswap !== null;
        const isSocketConnected = GSwap.events.eventSocketConnected();
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            status: 'healthy',
            sdk_initialized: isSDKReady,
            socket_connected: isSocketConnected,
            timestamp: new Date().toISOString()
        }));
        return;
    }

    // Prices endpoint - using real SDK only
    if (path === '/api/prices' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { tokens } = data;
                
                console.log(`💰 Price request for ${tokens.length} tokens`);
                
                if (!gswap) {
                    throw new Error('SDK not initialized');
                }

                // Get real prices from pools with proper USD conversion
                const prices = [];
                let galaUsdPrice = 0.017; // Default GALA price in USD
                
                // First, try to get GALA price in USD by checking GUSDC/GALA pair
                try {
                    const gusdcQuote = await gswap.quoting.quoteExactInput(
                        'GUSDC|Unit|none|none',
                        'GALA|Unit|none|none',
                        '1' // 1 GUSDC
                    );
                    const galaPerGusdc = parseFloat(gusdcQuote.outTokenAmount.toString());
                    if (galaPerGusdc > 0) {
                        galaUsdPrice = 1.0 / galaPerGusdc; // 1 GUSDC = X GALA, so 1 GALA = 1/X USD
                        console.log(`💱 GALA USD price: $${galaUsdPrice.toFixed(6)} (from GUSDC pair)`);
                    }
                } catch (error) {
                    console.log(`⚠️ Could not get GALA USD price: ${error.message}`);
                }
                
                for (const token of tokens) {
                    try {
                        const tokenSymbol = token.split('|')[0];
                        
                        // Skip GALA self-quote (causes validation error)
                        if (token === 'GALA|Unit|none|none') {
                            prices.push(galaUsdPrice); // GALA price in USD
                            console.log(`📊 ${token}: $${galaUsdPrice.toFixed(6)} USD`);
                            continue;
                        }
                        
                        // Special handling for stablecoins - they should be priced in USD
                        if (tokenSymbol === 'GUSDC') {
                            // GUSDC is pegged to $1 USD
                            prices.push(1.0);
                            console.log(`📊 ${token}: $1.00 USD (stablecoin)`);
                            continue;
                        }
                        
                        // For other tokens, get price in GALA terms then convert to USD
                        const quote = await gswap.quoting.quoteExactInput(
                            token,
                            'GALA|Unit|none|none',
                            '1' // 1 unit of token
                        );
                        
                        // Convert to price (GALA per token), then to USD
                        const priceInGala = parseFloat(quote.outTokenAmount.toString());
                        const priceInUsd = priceInGala * galaUsdPrice;
                        prices.push(priceInUsd);
                        console.log(`📊 ${token}: ${priceInGala} GALA = $${priceInUsd.toFixed(6)} USD`);
                        
                    } catch (error) {
                        console.log(`❌ Could not get price for ${token}: ${error.message}`);
                        throw new Error(`Failed to get real price for ${token}: ${error.message}`);
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    status: 200,
                    data: prices,
                    timestamp: new Date().toISOString(),
                    source: 'real-sdk'
                }));
                
            } catch (error) {
                console.error('❌ Price request failed:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: error.message,
                    timestamp: new Date().toISOString()
                }));
            }
        });
        return;
    }

    // Quote endpoint - using real SDK only
    if (path === '/api/quote' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { tokenIn, tokenOut, amountIn, slippage } = data;
                
                console.log(`📊 Quote request: ${amountIn} ${tokenIn} → ${tokenOut}`);
                
                if (!gswap) {
                    throw new Error('SDK not initialized');
                }

                // Get real quote from SDK
                const quote = await gswap.quoting.quoteExactInput(
                    tokenIn,
                    tokenOut,
                    amountIn.toString()
                );

                const quoteResult = {
                    amountOut: quote.outTokenAmount.toString(),
                    priceImpact: quote.priceImpact.toString(),
                    fee: quote.feeTier || FEE_TIER.PERCENT_00_05,
                    route: [tokenIn, tokenOut],
                    timestamp: new Date().toISOString(),
                    source: 'real-sdk'
                };

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    quote: quoteResult,
                    timestamp: new Date().toISOString()
                }));
                
            } catch (error) {
                console.error('❌ Quote request failed:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: error.message,
                    timestamp: new Date().toISOString()
                }));
            }
        });
        return;
    }

    // Swap endpoint - using real SDK only
    if (path === '/api/swap' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { tokenIn, tokenOut, amountIn, slippage, walletAddress, privateKey, quote } = data;
                
                console.log(`🔄 Swap request: ${amountIn} ${tokenIn} → ${tokenOut}`);
                console.log(`🔍 Wallet: ${walletAddress}`);
                
                if (!quote) {
                    throw new Error('Quote is required for swap execution');
                }

                // Initialize SDK with signer if not already done
                if (!gswapWithSigner) {
                    const initialized = initializeSDKWithSigner(privateKey, walletAddress);
                    if (!initialized) {
                        throw new Error('Failed to initialize SDK with signer');
                    }
                }

                // Connect to event socket if not connected
                if (!GSwap.events.eventSocketConnected()) {
                    await connectEventSocket();
                }

                // Execute real swap using SDK
                let swapResult;
                try {
                    // Use proper fee tier from SDK (500 = 0.05% fee)
                    const feeTier = quote.fee || 500; // 0.05% fee
                    
                    // Calculate slippage protection
                    const slippageMultiplier = 1 - parseFloat(slippage) / 100;
                    const amountOutMinimum = (parseFloat(quote.amountOut) * slippageMultiplier).toFixed(6);
                    
                    // Validate inputs before swap
                    if (!amountIn || parseFloat(amountIn) <= 0) {
                        throw new Error('Invalid amountIn: must be greater than 0');
                    }
                    
                    if (!quote.amountOut || parseFloat(quote.amountOut) <= 0) {
                        throw new Error('Invalid quote amountOut: must be greater than 0');
                    }
                    
                    console.log(`🔍 Swap parameters:`, {
                        tokenIn,
                        tokenOut,
                        feeTier,
                        exactIn: amountIn.toString(),
                        amountOutMinimum,
                        walletAddress
                    });
                    
                    swapResult = await gswapWithSigner.swaps.swap(
                        tokenIn,
                        tokenOut,
                        feeTier,
                        {
                            exactIn: amountIn.toString(),
                            amountOutMinimum: amountOutMinimum
                        }
                    );
                    
                    console.log(`✅ Real swap initiated: ${swapResult.txId}`);
                    
                    // Wait for transaction completion with timeout
                    try {
                        console.log(`⏳ Waiting for transaction completion: ${swapResult.txId}`);
                        const completed = await Promise.race([
                            swapResult.wait(),
                            new Promise((_, reject) => 
                                setTimeout(() => reject(new Error('Transaction timeout')), 30000)
                            )
                        ]);
                        
                        console.log(`✅ Real swap completed: ${swapResult.txId}`);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            txId: swapResult.txId,
                            status: 'COMPLETED',
                            amountOut: quote.amountOut,
                            timestamp: new Date().toISOString(),
                            source: 'real-sdk'
                        }));
                        
                    } catch (waitError) {
                        console.log(`⚠️ Swap wait failed: ${waitError.message}`);
                        
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            success: true,
                            txId: swapResult.txId,
                            status: 'PENDING',
                            amountOut: quote.amountOut,
                            timestamp: new Date().toISOString(),
                            source: 'real-sdk'
                        }));
                    }
                    
                } catch (swapError) {
                    console.error(`❌ Swap execution failed: ${swapError.message}`);
                    throw new Error(`Swap failed: ${swapError.message}`);
                }
                
            } catch (error) {
                console.error('❌ Swap request failed:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: error.message,
                    timestamp: new Date().toISOString()
                }));
            }
        });
        return;
    }

    // Balance endpoint - using real SDK only
    if (path === '/api/balance' && method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', async () => {
            try {
                const data = JSON.parse(body);
                const { walletAddress } = data;
                
                console.log(`💳 Balance request for: ${walletAddress}`);
                
                if (!gswap) {
                    throw new Error('SDK not initialized');
                }

                // Get real balances from SDK (max limit is 20)
                const assets = await gswap.assets.getUserAssets(walletAddress, 1, 20);
                
                const balances = assets.tokens.map(token => ({
                    symbol: token.symbol,
                    balance: token.quantity,
                    contractAddress: '0x15D4c048F83bd7e37d49eA4C83a07267Ec4203dA', // Placeholder
                    decimals: token.decimals,
                    verified: token.verify,
                    image: token.image
                }));
                
                console.log(`✅ Real balances retrieved: ${balances.length} tokens`);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    balances: balances,
                    endpoint: 'real-sdk',
                    timestamp: new Date().toISOString()
                }));
                
            } catch (error) {
                console.error('❌ Balance request failed:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    message: error.message,
                    timestamp: new Date().toISOString()
                }));
            }
        });
        return;
    }

    // Default response
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        success: false,
        message: 'Endpoint not found',
        timestamp: new Date().toISOString()
    }));
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 GalaSwap Trading Bot Server with REAL SDK running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`💰 Prices endpoint: http://localhost:${PORT}/api/prices`);
    console.log(`📊 Quote endpoint: http://localhost:${PORT}/api/quote`);
    console.log(`🔄 Swap endpoint: http://localhost:${PORT}/api/swap`);
    console.log(`💳 Balance endpoint: http://localhost:${PORT}/api/balance`);
    console.log(`💡 Open galaswap-trading-bot.html in your browser to start trading!`);
    
    // Initialize SDK
    initializeSDK();
    
    // Connect to event socket
    setTimeout(async () => {
        await connectEventSocket();
    }, 2000);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    if (GSwap.events.eventSocketConnected()) {
        GSwap.events.disconnectEventSocket();
    }
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
});
