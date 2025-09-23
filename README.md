# 🤖 GalaSwap Trading Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![GalaChain](https://img.shields.io/badge/GalaChain-SDK-blue.svg)](https://gala.com/)

A sophisticated automated trading bot for the GalaChain ecosystem, featuring real on-chain trading, persistent data storage, and multiple trading modes.

## 🚀 Features

### ⚡ **Real Trading**
- **On-Chain Swaps**: Execute real transactions using GalaChain SDK
- **Multi-Token Support**: Trade GALA, GUSDC, FILM, GOSMI, ETIME, GTON, GMUSIC
- **Slippage Protection**: Configurable slippage tolerance
- **Transaction Monitoring**: Real-time status tracking

### 🎯 **Trading Modes**
- **🛡️ Conservative**: Safe, steady trading with lower risk
- **🔒 Trade Cap**: Small testing trades (5-25 GALA)
- **🏆 Competition**: High-frequency trading for all tokens

### 📊 **Advanced Analytics**
- **📈 Market Analysis**: Real-time triangle arbitrage opportunities
- **🎯 Trading Signals**: Dynamic RSI, MACD, Bollinger Bands analysis
- **📊 Trade Statistics**: Historical performance tracking with localStorage
- **⚡ Performance & Risk**: Mode-specific metrics that update dynamically

### 💾 **Persistent Storage**
- **Trading Statistics**: Total trades, P&L, win rate, best/worst trades
- **Portfolio Tracking**: Real-time portfolio value and balances
- **Configuration**: Bot settings saved across sessions
- **Transaction History**: Complete record of successful trades

### 💰 **Smart Pricing**
- **USD Conversion**: All prices displayed in USD
- **Stablecoin Support**: GUSDC pegged to $1.00 USD
- **Dynamic Pricing**: Real-time GALA/USD conversion
- **Fallback System**: Robust pricing for unavailable pairs

## 🆕 Latest Updates (v9.1.9)

### ✨ **Major UI Improvements**
- **📈 Market Analysis**: Now displays real triangle arbitrage opportunities instead of static data
- **🎯 Trading Signals**: Dynamic technical analysis with RSI, MACD, and Bollinger Bands for all tokens
- **📊 Trade Statistics**: Fixed localStorage integration to properly display historical trading data
- **⚡ Performance & Risk**: Dynamic metrics that update automatically when switching trading modes

### 🔧 **Technical Enhancements**
- **Enhanced Server API**: Added POST endpoints for prices and balances
- **Improved Error Handling**: Better debugging and error recovery
- **Real-time Data Integration**: Portfolio calculations now use live price data
- **Mode-specific Configurations**: Risk metrics adapt to Conservative/Trade Cap/Competition modes

### 📚 **Documentation**
- Added comprehensive documentation for all improvements
- Detailed implementation guides for new features
- Enhanced troubleshooting and setup instructions

## 📸 Screenshot

### Trading Bot Interface
![Trading Bot Interface](https://raw.githubusercontent.com/Zavn20/Galaswap-trading-bot/main/image.webp)
*Clean, intuitive interface with real-time data and trading controls*

## 🛠️ Installation

### Prerequisites
- Node.js v18+ (for built-in fetch support)
- Modern web browser with localStorage support
- GalaChain wallet with private key

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/Zavn20/Galaswap-trading-bot.git
   cd Galaswap-trading-bot
   ```

2. **Install dependencies**
   ```bash
   npm install @gala-chain/gswap-sdk
   ```

3. **Start the server**
   ```bash
   node real-trading-server.js
   ```

4. **Open the interface**
   ```bash
   start galaswap-trading-bot.html
   # or open galaswap-trading-bot.html in your browser
   ```

5. **Configure your wallet**
   - Enter your GalaChain wallet address
   - Provide your private key for transaction signing
   - Select your preferred trading mode

## 📖 Usage

### Basic Trading

1. **Connect Wallet**: Enter your wallet address and private key
2. **Select Mode**: Choose Conservative, Trade Cap, or Competition mode
3. **Start Bot**: Click "Start Bot" to begin automated trading
4. **Monitor**: Watch real-time updates and trading statistics

### Trading Modes

#### 🛡️ Conservative Mode
- **Risk Level**: Low
- **Trade Size**: Moderate
- **Tokens**: High liquidity pairs only
- **Best For**: Beginners, risk-averse traders

#### 🔒 Trade Cap Mode
- **Risk Level**: Medium
- **Trade Size**: Small (5-25 GALA)
- **Tokens**: All supported tokens
- **Best For**: Testing, learning, small-scale trading

#### 🏆 Competition Mode
- **Risk Level**: High
- **Trade Size**: Dynamic
- **Tokens**: All tokens including low liquidity
- **Best For**: Experienced traders, high-frequency trading

### Configuration

The bot automatically saves your configuration including:
- Trading mode preferences
- Wallet connection status
- Trading statistics
- Portfolio data

## 🔧 API Reference

### Server Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Server status and SDK connection |
| `/api/prices` | POST | Real-time token prices in USD |
| `/api/quote` | POST | Trading quotes with slippage protection |
| `/api/swap` | POST | Execute real on-chain swaps |
| `/api/balance` | POST | Wallet balance information |

### Example API Usage

```javascript
// Get token prices
const response = await fetch('http://localhost:3000/api/prices', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokens: ['GALA|Unit|none|none', 'GUSDC|Unit|none|none']
  })
});

const prices = await response.json();
console.log(prices.data); // [0.017101, 1.00] - GALA and GUSDC prices in USD
```

## 📊 Trading Statistics

The bot tracks comprehensive metrics:

- **Total Trades**: Complete trade count
- **Total Profit/Loss**: Cumulative P&L in USD
- **Success Rate**: Win/loss ratio
- **Best/Worst Trades**: Performance extremes
- **Trading Volume**: Total volume traded
- **Session Data**: Start time and duration

## 🔒 Security

### Wallet Security
- Private keys are handled securely
- No keys are transmitted to external servers
- Local storage encryption for sensitive data

### Trading Security
- Slippage protection prevents excessive price impact
- Input validation and sanitization
- Rate limiting prevents excessive API calls
- Comprehensive error handling

## 🚨 Risk Disclaimer

**⚠️ IMPORTANT**: This bot executes real trades with real money. Always:

- Test with small amounts first
- Understand the risks involved
- Monitor your trades actively
- Never invest more than you can afford to lose
- Keep your private keys secure

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/Zavn20/Galaswap-trading-bot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Zavn20/Galaswap-trading-bot/discussions)
- **Documentation**: [Wiki](https://github.com/Zavn20/Galaswap-trading-bot/wiki)

## 🙏 Acknowledgments

- [GalaChain](https://gala.com/) for the blockchain infrastructure
- [@gala-chain/gswap-sdk](https://www.npmjs.com/package/@gala-chain/gswap-sdk) for the trading SDK
- The GalaChain community for support and feedback

## 📈 Roadmap

### Upcoming Features
- [ ] Multi-wallet support
- [ ] Advanced analytics dashboard
- [ ] Custom trading strategies
- [ ] Mobile application
- [ ] API integration with external services

### Technical Improvements
- [ ] Database integration for persistent storage
- [ ] Microservices architecture
- [ ] Real-time push notifications
- [ ] Historical backtesting capabilities

---

**⭐ If you find this project helpful, please give it a star!**

*Built with ❤️ for the GalaChain ecosystem*