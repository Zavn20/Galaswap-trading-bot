// Price Service Configuration
// Copy this file to price-config.local.js and add your API keys

module.exports = {
    // CoinMarketCap API Configuration
    // Get your API key from: https://coinmarketcap.com/api/
    coinmarketcap: {
        apiKey: process.env.CMC_API_KEY || null, // Set this in your environment or here
        enabled: true
    },
    
    // CoinGecko Configuration (no API key required for basic usage)
    coingecko: {
        enabled: true
    },
    
    // GalaChain Configuration
    galachain: {
        enabled: true
    },
    
    // Rate limits (requests per minute)
    rateLimits: {
        coingecko: 50,
        coinmarketcap: 30,
        galachain: 100
    },
    
    // Cache TTL in seconds
    cache: {
        price: 30,
        balance: 15,
        quote: 10
    },
    
    // Price comparison settings
    comparison: {
        maxVariancePercent: 10, // Maximum acceptable variance between sources
        preferExternalSources: true, // Prefer CoinGecko/CoinMarketCap over GalaChain
        fallbackToAverage: true // Use average when variance is acceptable
    }
};



