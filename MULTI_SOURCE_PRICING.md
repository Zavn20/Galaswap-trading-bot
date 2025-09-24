# Multi-Source Price Integration System

## Overview

The GalaSwap Trading Bot now integrates multiple price data sources to provide the most accurate and reliable pricing information. This system compares prices from CoinGecko, CoinMarketCap, and GalaChain APIs to ensure optimal trading decisions.

## Features

### 🌐 Multiple Price Sources
- **CoinGecko**: Real-time market prices (no API key required)
- **CoinMarketCap**: Professional market data (API key required)
- **GalaChain**: On-chain DEX prices (real-time liquidity)

### 📊 Intelligent Price Comparison
- **Variance Analysis**: Calculates price differences between sources
- **Smart Selection**: Chooses the best price based on variance and reliability
- **Fallback Logic**: Gracefully handles source failures
- **Rate Limiting**: Respects API limits for each source

### ⚡ Performance Optimizations
- **Caching**: 30-second cache for price data
- **Parallel Fetching**: Simultaneous requests to all sources
- **Error Handling**: Robust fallback mechanisms
- **Health Monitoring**: Real-time source status tracking

## Configuration

### Basic Setup
The system works out of the box with CoinGecko and GalaChain enabled by default.

### CoinMarketCap Integration
To enable CoinMarketCap pricing:

1. Get an API key from [CoinMarketCap](https://coinmarketcap.com/api/)
2. Set the environment variable:
   ```bash
   export CMC_API_KEY=your_api_key_here
   ```
3. Or create `price-config.local.js`:
   ```javascript
   module.exports = {
       coinmarketcap: {
           apiKey: 'your_api_key_here',
           enabled: true
       }
   };
   ```

### Custom Configuration
Create `price-config.local.js` to customize:

```javascript
module.exports = {
    coinmarketcap: {
        apiKey: 'your_api_key',
        enabled: true
    },
    coingecko: {
        enabled: true
    },
    galachain: {
        enabled: true
    },
    rateLimits: {
        coingecko: 50,      // requests per minute
        coinmarketcap: 30,  // requests per minute
        galachain: 100      // requests per minute
    },
    comparison: {
        maxVariancePercent: 10,     // Max acceptable variance
        preferExternalSources: true, // Prefer CoinGecko/CMC over GalaChain
        fallbackToAverage: true     // Use average when variance is low
    }
};
```

## API Endpoints

### `/api/prices/comprehensive`
Returns detailed price comparison data:
```json
{
  "success": true,
  "data": {
    "sources": [...],
    "comparison": {...},
    "finalPrices": {...},
    "summary": {
      "totalTokens": 8,
      "sourcesUsed": 2,
      "averageVariance": 5.2
    }
  }
}
```

### `/api/prices`
Returns optimized final prices (backward compatible):
```json
{
  "success": true,
  "data": {
    "GALA|Unit|none|none": 0.015933,
    "GUSDC|Unit|none|none": 0.999831,
    ...
  },
  "source": "multi-source-optimized"
}
```

### `/api/health`
Returns system health including price source status:
```json
{
  "priceSources": {
    "coingecko": {
      "status": "healthy",
      "enabled": true,
      "lastRequest": 1758725046765
    },
    "coinmarketcap": {
      "status": "disabled",
      "enabled": false
    },
    "galachain": {
      "status": "healthy",
      "enabled": true
    }
  }
}
```

## Price Selection Logic

### Low Variance (< 10%)
- Uses average of all sources for maximum accuracy
- Indicates stable market conditions

### High Variance (> 10%)
- Prefers external sources (CoinGecko/CoinMarketCap) over on-chain prices
- External sources reflect broader market sentiment
- On-chain prices may have liquidity constraints

### Source Priority
1. **CoinMarketCap** (if API key provided)
2. **CoinGecko** (reliable, no API key needed)
3. **GalaChain** (on-chain, real liquidity)

## Frontend Integration

### New Price Sources Tab
- View detailed price comparisons
- Monitor source health status
- Analyze price variance
- Track recommended prices

### Enhanced Market Analysis
- More accurate triangle arbitrage calculations
- Better profit/loss estimations
- Improved trading decisions

## Benefits

### 🎯 Accuracy
- Cross-validation of prices from multiple sources
- Reduced impact of single-source errors
- Better market representation

### 🛡️ Reliability
- Automatic fallback to available sources
- Graceful handling of API failures
- Continuous operation even with source issues

### 📈 Performance
- Intelligent caching reduces API calls
- Parallel fetching minimizes latency
- Rate limiting prevents API blocks

### 🔍 Transparency
- Full visibility into price sources
- Variance analysis for decision making
- Health monitoring for system reliability

## Monitoring

### Health Checks
Monitor source health via `/api/health`:
- Source availability
- Last request timestamps
- Rate limit status
- API key validation

### Logging
The system provides detailed logging:
- Price fetch attempts
- Source comparisons
- Variance calculations
- Error handling

### Metrics
Track system performance:
- Cache hit rates
- API response times
- Source reliability
- Price accuracy

## Troubleshooting

### Common Issues

1. **CoinMarketCap Disabled**
   - Check API key configuration
   - Verify API key validity
   - Check rate limits

2. **High Variance Warnings**
   - Normal for volatile tokens
   - Check source health status
   - Verify network connectivity

3. **Source Failures**
   - System automatically falls back
   - Check individual source health
   - Verify API endpoints

### Debug Mode
Enable detailed logging by checking browser console for:
- Price fetch attempts
- Source comparisons
- Variance calculations
- Error messages

## Future Enhancements

- Additional price sources (Binance, Coinbase)
- Machine learning price prediction
- Historical price analysis
- Advanced arbitrage detection
- Real-time price alerts



