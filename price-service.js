const NodeCache = require('node-cache');

// Try to load local configuration, fallback to defaults
let config;
try {
    config = require('./price-config.local.js');
} catch (error) {
    config = require('./price-config.js');
}

class PriceService {
    constructor() {
        this.cache = new NodeCache({ stdTTL: config.cache.price });
        this.priceSources = {
            coingecko: {
                name: 'CoinGecko',
                baseUrl: 'https://api.coingecko.com/api/v3',
                rateLimit: config.rateLimits.coingecko,
                lastRequest: 0,
                enabled: config.coingecko.enabled
            },
            coinmarketcap: {
                name: 'CoinMarketCap',
                baseUrl: 'https://pro-api.coinmarketcap.com/v1',
                rateLimit: config.rateLimits.coinmarketcap,
                lastRequest: 0,
                apiKey: config.coinmarketcap.apiKey,
                enabled: config.coinmarketcap.enabled && !!config.coinmarketcap.apiKey
            },
            galachain: {
                name: 'GalaChain',
                baseUrl: 'https://bundle-backend-prod1.defi.gala.com',
                rateLimit: config.rateLimits.galachain,
                lastRequest: 0,
                enabled: config.galachain.enabled
            }
        };
        
        // Token mapping for different APIs
        this.tokenMappings = {
            'GALA|Unit|none|none': {
                coingecko: 'gala',
                coinmarketcap: 'GALA',
                symbol: 'GALA',
                bridged: false // Native GALA token
            },
            'GUSDC|Unit|none|none': {
                coingecko: 'usd-coin',
                coinmarketcap: 'USDC',
                symbol: 'GUSDC',
                bridged: false // USDC is the same asset
            },
            'GUSDT|Unit|none|none': {
                coingecko: 'tether',
                coinmarketcap: 'USDT',
                symbol: 'GUSDT',
                bridged: false // USDT is the same asset
            },
            'ETIME|Unit|none|none': {
                coingecko: null, // Disabled - bridged token
                coinmarketcap: null, // Disabled - bridged token
                symbol: 'ETIME',
                bridged: true // Bridged Ethereum token on GalaChain
            },
            'GTON|Unit|none|none': {
                coingecko: null, // Disabled - bridged token
                coinmarketcap: null, // Disabled - bridged token
                symbol: 'GTON',
                bridged: true // Bridged TON token on GalaChain
            },
            'GOSMI|Unit|none|none': {
                coingecko: null, // Disabled - bridged token
                coinmarketcap: null, // Disabled - bridged token
                symbol: 'GOSMI',
                bridged: true // Bridged Osmosis token on GalaChain
            },
            'FILM|Unit|none|none': {
                coingecko: 'gala-film', // Correct CoinGecko ID for Gala Film
                coinmarketcap: 'FILM', // CoinMarketCap symbol for Gala Film
                symbol: 'FILM',
                bridged: false // Native GalaChain FILM token (Gala Film)
            },
            'GMUSIC|Unit|none|none': {
                coingecko: 'gala-music', // Correct CoinGecko ID for Gala Music
                coinmarketcap: null, // Not yet confirmed on CoinMarketCap
                symbol: 'GMUSIC',
                bridged: false // Native GalaChain token (Gala Music)
            }
        };
    }

    // Rate limiting helper
    canMakeRequest(source) {
        const now = Date.now();
        const sourceConfig = this.priceSources[source];
        const timeSinceLastRequest = now - sourceConfig.lastRequest;
        const minInterval = (60 * 1000) / sourceConfig.rateLimit; // Convert to milliseconds
        
        return timeSinceLastRequest >= minInterval;
    }

    // Update last request time
    updateLastRequest(source) {
        this.priceSources[source].lastRequest = Date.now();
    }

    // Fetch prices from CoinGecko
    async fetchCoinGeckoPrices() {
        try {
            if (!this.priceSources.coingecko.enabled) {
                throw new Error('CoinGecko disabled');
            }
            
            if (!this.canMakeRequest('coingecko')) {
                throw new Error('Rate limited');
            }

            const tokenIds = Object.values(this.tokenMappings)
                .map(mapping => mapping.coingecko)
                .filter(Boolean)
                .join(',');

            const url = `${this.priceSources.coingecko.baseUrl}/simple/price?ids=${tokenIds}&vs_currencies=usd`;
            
            console.log(`🔍 Fetching CoinGecko prices for: ${tokenIds}`);
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }

            const data = await response.json();
            this.updateLastRequest('coingecko');

            // Convert CoinGecko response to our format
            const prices = {};
            Object.entries(this.tokenMappings).forEach(([tokenKey, mapping]) => {
                if (mapping.coingecko && data[mapping.coingecko]) {
                    prices[tokenKey] = data[mapping.coingecko].usd;
                }
            });

            console.log(`✅ CoinGecko prices fetched:`, prices);
            return { source: 'coingecko', prices, timestamp: Date.now() };

        } catch (error) {
            console.error(`❌ CoinGecko fetch failed:`, error.message);
            return { source: 'coingecko', prices: {}, error: error.message };
        }
    }

    // Fetch prices from CoinMarketCap
    async fetchCoinMarketCapPrices() {
        try {
            if (!this.priceSources.coinmarketcap.enabled) {
                throw new Error('CoinMarketCap disabled');
            }
            
            if (!this.canMakeRequest('coinmarketcap')) {
                throw new Error('Rate limited');
            }

            if (!this.priceSources.coinmarketcap.apiKey) {
                throw new Error('CoinMarketCap API key not configured');
            }

            const symbols = Object.values(this.tokenMappings)
                .map(mapping => mapping.coinmarketcap)
                .filter(Boolean)
                .join(',');

            const url = `${this.priceSources.coinmarketcap.baseUrl}/cryptocurrency/quotes/latest?symbol=${symbols}`;
            
            console.log(`🔍 Fetching CoinMarketCap prices for: ${symbols}`);
            
            const response = await fetch(url, {
                headers: {
                    'X-CMC_PRO_API_KEY': this.priceSources.coinmarketcap.apiKey,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`CoinMarketCap API error: ${response.status}`);
            }

            const data = await response.json();
            this.updateLastRequest('coinmarketcap');

            // Convert CoinMarketCap response to our format
            const prices = {};
            Object.entries(this.tokenMappings).forEach(([tokenKey, mapping]) => {
                if (mapping.coinmarketcap && data.data && data.data[mapping.coinmarketcap]) {
                    prices[tokenKey] = data.data[mapping.coinmarketcap].quote.USD.price;
                }
            });

            console.log(`✅ CoinMarketCap prices fetched:`, prices);
            return { source: 'coinmarketcap', prices, timestamp: Date.now() };

        } catch (error) {
            console.error(`❌ CoinMarketCap fetch failed:`, error.message);
            return { source: 'coinmarketcap', prices: {}, error: error.message };
        }
    }

    // Fetch prices from GalaChain (existing logic)
    async fetchGalaChainPrices(gswap) {
        try {
            if (!this.priceSources.galachain.enabled) {
                throw new Error('GalaChain disabled');
            }
            
            if (!this.canMakeRequest('galachain')) {
                throw new Error('Rate limited');
            }

            console.log(`🔍 Fetching GalaChain prices...`);
            
            const tokens = Object.keys(this.tokenMappings);
            const prices = {};

            // Parallel price fetching
            const pricePromises = tokens.map(async (token) => {
                try {
                    if (token === 'GUSDC|Unit|none|none' || token === 'GUSDT|Unit|none|none') {
                        return { token, price: 1.00 }; // Stablecoin
                    } else if (token === 'GALA|Unit|none|none') {
                        const quote = await gswap.quoting.quoteExactInput(
                            'GALA|Unit|none|none',
                            'GUSDC|Unit|none|none',
                            1
                        );
                        return { token, price: parseFloat(quote.outTokenAmount.toString()) };
                    } else {
                        // For other tokens, get price in GALA terms then convert to USD
                        const quote = await gswap.quoting.quoteExactInput(
                            token,
                            'GALA|Unit|none|none',
                            1
                        );
                        const tokenGalaPrice = parseFloat(quote.outTokenAmount.toString());
                        // Get GALA price in USD
                        const galaUsdPrice = await this.getGalaUsdPrice(gswap);
                        return { token, price: tokenGalaPrice * galaUsdPrice };
                    }
                } catch (error) {
                    console.log(`❌ GalaChain price fetch failed for ${token}:`, error.message);
                    return { token, price: 0.01 }; // Fallback
                }
            });

            const results = await Promise.all(pricePromises);
            results.forEach(({ token, price }) => {
                prices[token] = price;
            });

            this.updateLastRequest('galachain');
            console.log(`✅ GalaChain prices fetched:`, prices);
            return { source: 'galachain', prices, timestamp: Date.now() };

        } catch (error) {
            console.error(`❌ GalaChain fetch failed:`, error.message);
            return { source: 'galachain', prices: {}, error: error.message };
        }
    }

    // Helper to get GALA USD price
    async getGalaUsdPrice(gswap) {
        try {
            const quote = await gswap.quoting.quoteExactInput(
                'GALA|Unit|none|none',
                'GUSDC|Unit|none|none',
                1
            );
            return parseFloat(quote.outTokenAmount.toString());
        } catch (error) {
            console.log(`❌ Could not get GALA USD price: ${error.message}`);
            return 0.015; // Fallback
        }
    }

    // Compare prices from different sources
    comparePrices(priceData) {
        const comparison = {};
        const tokens = Object.keys(this.tokenMappings);

        tokens.forEach(token => {
            const prices = {};
            const symbol = this.tokenMappings[token].symbol;

            // Collect prices from all sources
            priceData.forEach(source => {
                if (source.prices[token] && source.prices[token] > 0) {
                    prices[source.source] = source.prices[token];
                }
            });

            if (Object.keys(prices).length > 0) {
                const values = Object.values(prices);
                const avgPrice = values.reduce((sum, price) => sum + price, 0) / values.length;
                const maxPrice = Math.max(...values);
                const minPrice = Math.min(...values);
                const variance = ((maxPrice - minPrice) / avgPrice) * 100;

                comparison[token] = {
                    symbol,
                    prices,
                    average: avgPrice,
                    max: maxPrice,
                    min: minPrice,
                    variance: variance,
                    recommended: this.selectBestPrice(prices, avgPrice, variance)
                };
            }
        });

        return comparison;
    }

    // Select the best price based on variance and reliability
    selectBestPrice(prices, average, variance) {
        // If variance is low, use average if configured
        if (variance < config.comparison.maxVariancePercent && config.comparison.fallbackToAverage) {
            return { source: 'average', price: average };
        }

        // Determine source priority based on configuration
        const sourcePriority = config.comparison.preferExternalSources 
            ? ['coinmarketcap', 'coingecko', 'galachain']
            : ['galachain', 'coinmarketcap', 'coingecko'];
        
        for (const source of sourcePriority) {
            if (prices[source] && this.priceSources[source].enabled) {
                return { source, price: prices[source] };
            }
        }

        // Fallback to average
        return { source: 'average', price: average };
    }

    // Get comprehensive price data from all sources
    async getAllPrices(gswap) {
        const cacheKey = 'comprehensive_prices';
        const cached = this.cache.get(cacheKey);
        if (cached) {
            console.log(`📊 Using cached comprehensive prices`);
            return cached;
        }

        console.log(`🔍 Fetching comprehensive prices from all sources...`);

        // Fetch from enabled sources in parallel
        const pricePromises = [];
        
        if (this.priceSources.coingecko.enabled) {
            pricePromises.push(this.fetchCoinGeckoPrices());
        }
        
        if (this.priceSources.coinmarketcap.enabled) {
            pricePromises.push(this.fetchCoinMarketCapPrices());
        }
        
        if (this.priceSources.galachain.enabled) {
            pricePromises.push(this.fetchGalaChainPrices(gswap));
        }

        const priceData = await Promise.all(pricePromises);
        
        // Compare and analyze prices
        const comparison = this.comparePrices(priceData);
        
        // Generate final price recommendations
        const finalPrices = {};
        Object.entries(comparison).forEach(([token, data]) => {
            finalPrices[token] = data.recommended.price;
        });

        const result = {
            sources: priceData,
            comparison,
            finalPrices,
            timestamp: Date.now(),
            summary: {
                totalTokens: Object.keys(finalPrices).length,
                sourcesUsed: priceData.filter(source => Object.keys(source.prices).length > 0).length,
                averageVariance: Object.values(comparison).reduce((sum, data) => sum + data.variance, 0) / Object.keys(comparison).length
            }
        };

        // Cache the result
        this.cache.set(cacheKey, result);
        
        console.log(`✅ Comprehensive prices fetched and analyzed`);
        console.log(`📊 Summary: ${result.summary.totalTokens} tokens, ${result.summary.sourcesUsed} sources, ${result.summary.averageVariance.toFixed(2)}% avg variance`);
        
        return result;
    }

    // Get health status of all price sources
    getHealthStatus() {
        const now = Date.now();
        const health = {};

        Object.entries(this.priceSources).forEach(([source, sourceConfig]) => {
            const timeSinceLastRequest = now - sourceConfig.lastRequest;
            const isHealthy = timeSinceLastRequest < 300000; // 5 minutes

            health[source] = {
                name: sourceConfig.name,
                enabled: sourceConfig.enabled,
                lastRequest: sourceConfig.lastRequest,
                timeSinceLastRequest,
                isHealthy: sourceConfig.enabled && isHealthy,
                rateLimit: sourceConfig.rateLimit,
                hasApiKey: source === 'coinmarketcap' ? !!sourceConfig.apiKey : true,
                status: sourceConfig.enabled ? (isHealthy ? 'healthy' : 'unhealthy') : 'disabled'
            };
        });

        return health;
    }
}

module.exports = PriceService;
