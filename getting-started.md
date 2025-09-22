# Getting Started with GalaSwap Trading Bot

This guide will help you get up and running with the GalaSwap Trading Bot in just a few minutes.

## 🎯 What You'll Learn

By the end of this guide, you'll know how to:
- Set up the trading bot
- Connect your wallet
- Choose a trading mode
- Start automated trading
- Monitor your performance

## 📋 Prerequisites

Before you begin, make sure you have:

### Required Software
- **Node.js v18+**: Download from [nodejs.org](https://nodejs.org/)
- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge
- **Code Editor** (optional): VS Code, Sublime Text, or any text editor

### Required Accounts
- **GalaChain Wallet**: With some GALA tokens for trading
- **Private Key**: For your GalaChain wallet

## 🚀 Installation

### Step 1: Download the Bot

```bash
# Clone the repository
git clone https://github.com/yourusername/galaswap-trading-bot.git
cd galaswap-trading-bot

# Or download as ZIP and extract
```

### Step 2: Install Dependencies

```bash
# Install the GalaChain SDK
npm install @gala-chain/gswap-sdk
```

### Step 3: Start the Server

```bash
# Start the backend server
node real-trading-server.js
```

You should see output like:
```
🚀 GalaSwap Trading Bot Server with REAL SDK running on http://localhost:3000
✅ GSwap SDK initialized successfully
✅ Event socket connected for real-time monitoring
```

### Step 4: Open the Interface

Open `galaswap-trading-bot.html` in your web browser. You can:
- Double-click the file
- Or open it from your browser's File menu

## 🔧 Initial Configuration

### Step 1: Connect Your Wallet

1. **Enter Wallet Address**: Your GalaChain wallet address (e.g., `eth|0x...`)
2. **Enter Private Key**: Your wallet's private key (keep this secure!)
3. **Click "Connect Wallet"**

### Step 2: Choose Trading Mode

Select one of three trading modes:

#### 🛡️ Conservative Mode
- **Best for**: Beginners, risk-averse traders
- **Risk**: Low
- **Trade Size**: Moderate
- **Tokens**: High liquidity pairs only

#### 🔒 Trade Cap Mode
- **Best for**: Testing, learning
- **Risk**: Medium
- **Trade Size**: Small (5-25 GALA)
- **Tokens**: All supported tokens

#### 🏆 Competition Mode
- **Best for**: Experienced traders
- **Risk**: High
- **Trade Size**: Dynamic
- **Tokens**: All tokens including low liquidity

### Step 3: Configure Settings

Adjust these settings as needed:

- **Slippage Tolerance**: Default 0.5% (recommended)
- **Trading Frequency**: How often to scan for opportunities
- **Position Sizing**: Maximum trade size

## 🎮 Starting Your First Trade

### Step 1: Start the Bot

1. Click the **"Start Bot"** button
2. Watch the status indicator turn green
3. Monitor the console for activity

### Step 2: Monitor Activity

You'll see real-time updates:
- **Price Updates**: Current token prices in USD
- **Trade Signals**: Buy/sell opportunities
- **Trade Execution**: Confirmed transactions
- **Statistics**: Running totals and performance

### Step 3: Review Results

Check the **Statistics** tab for:
- Total trades executed
- Profit/loss in USD
- Success rate
- Best/worst trades

## 📊 Understanding the Interface

### Main Dashboard
- **Status Indicator**: Shows if bot is running
- **Current Mode**: Displays active trading mode
- **Portfolio Value**: Total value in USD
- **Active Trades**: Currently executing trades

### Trading Log
- **Real-time Updates**: Live trading activity
- **Trade Details**: Amounts, prices, transaction hashes
- **Status Messages**: Success, errors, warnings

### Statistics Panel
- **Performance Metrics**: Comprehensive trading stats
- **Portfolio Tracking**: Token balances and values
- **Session Data**: Start time, duration, activity

## 🔍 Monitoring Your Trades

### Real-Time Updates
The bot provides live updates on:
- Token price changes
- Trading opportunities
- Trade execution status
- Portfolio value changes

### Transaction History
All successful trades are recorded with:
- Transaction hash (for blockchain verification)
- Trade details (amounts, tokens, prices)
- Timestamp
- Profit/loss calculation

### Performance Tracking
Monitor your bot's performance:
- **Win Rate**: Percentage of profitable trades
- **Total P&L**: Cumulative profit/loss in USD
- **Best Trade**: Highest single trade profit
- **Trading Volume**: Total value traded

## ⚠️ Important Safety Tips

### Start Small
- Begin with small trade amounts
- Test the bot thoroughly before increasing size
- Monitor all trades carefully

### Secure Your Keys
- Never share your private key
- Keep backups in secure locations
- Use a dedicated trading wallet

### Monitor Actively
- Check the bot regularly
- Watch for unusual activity
- Be ready to stop trading if needed

## 🆘 Troubleshooting

### Common Issues

**Bot won't start**
- Check that Node.js is installed
- Ensure the server is running
- Verify browser compatibility

**No trades executing**
- Check wallet connection
- Verify sufficient balance
- Review trading mode settings

**Prices not updating**
- Check server connection
- Refresh the page
- Verify network connectivity

### Getting Help

If you encounter issues:
1. Check the [Troubleshooting Guide](troubleshooting.md)
2. Review the [FAQ](faq.md)
3. Open an issue on GitHub
4. Join community discussions

## 🎉 Next Steps

Now that you're up and running:

1. **Explore Trading Modes**: Try different modes to find your preference
2. **Monitor Performance**: Track your bot's success over time
3. **Adjust Settings**: Fine-tune parameters based on results
4. **Join Community**: Connect with other traders and developers

## 📚 Additional Resources

- [Configuration Guide](configuration.md): Detailed setup options
- [Trading Modes](trading-modes.md): In-depth mode explanations
- [API Reference](api-reference.md): Technical documentation
- [Security Guide](security.md): Best practices for safe trading

---

*Ready to start trading? Let's go! 🚀*
