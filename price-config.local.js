const baseConfig = require('./price-config.js');

module.exports = {
    ...baseConfig,
    // CoinMarketCap API Configuration
    coinmarketcap: {
        ...baseConfig.coinmarketcap,
        apiKey: '9097f388-79fc-4d0f-8920-9a2b4c6a03f7',
        enabled: true
    }
};
