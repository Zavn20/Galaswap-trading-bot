// Enhanced Statistics Collection using GalaChain SDK
// This file contains improved functions for all statistics categories

// 📈 Market Data Collection
class MarketDataCollector {
    constructor() {
        this.priceHistory = {};
        this.volumeHistory = {};
        this.marketCap = {};
        this.lastUpdate = {};
    }

    // Get real-time price data using SDK
    async getRealTimePrices(tokens) {
        try {
            const response = await fetch('http://localhost:3000/api/prices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokens })
            });

            if (!response.ok) {
                throw new Error(`Price API failed: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(`Price API error: ${data.message}`);
            }

            // Store price data with timestamp
            const timestamp = new Date().toISOString();
            tokens.forEach((token, index) => {
                const price = parseFloat(data.data[index]);
                if (price > 0) {
                    this.updatePriceHistory(token, price, timestamp);
                }
            });

            return data.data;
        } catch (error) {
            console.error('Market data collection failed:', error);
            throw error;
        }
    }

    // Update price history for analysis
    updatePriceHistory(token, price, timestamp) {
        if (!this.priceHistory[token]) {
            this.priceHistory[token] = [];
        }
        
        this.priceHistory[token].push({
            price: price,
            timestamp: timestamp,
            volume: 0 // Will be updated when available
        });

        // Keep only last 100 data points for performance
        if (this.priceHistory[token].length > 100) {
            this.priceHistory[token] = this.priceHistory[token].slice(-100);
        }
    }

    // Calculate price change percentage
    getPriceChange(token, period = 5) {
        const history = this.priceHistory[token];
        if (!history || history.length < period) {
            return { change: 0, changePercent: 0 };
        }

        const current = history[history.length - 1].price;
        const previous = history[history.length - period].price;
        const change = current - previous;
        const changePercent = (change / previous) * 100;

        return { change, changePercent };
    }
}

// 📊 Market Analysis Engine
class MarketAnalysisEngine {
    constructor(marketData) {
        this.marketData = marketData;
        this.indicators = {};
    }

    // Calculate RSI (Relative Strength Index)
    calculateRSI(token, period = 14) {
        const history = this.marketData.priceHistory[token];
        if (!history || history.length < period + 1) {
            return 50; // Neutral RSI
        }

        let gains = 0;
        let losses = 0;

        for (let i = history.length - period; i < history.length; i++) {
            const change = history[i].price - history[i - 1].price;
            if (change > 0) {
                gains += change;
            } else {
                losses += Math.abs(change);
            }
        }

        const avgGain = gains / period;
        const avgLoss = losses / period;

        if (avgLoss === 0) return 100;
        
        const rs = avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + rs));
        
        return Math.max(0, Math.min(100, rsi));
    }

    // Calculate Moving Average
    calculateMovingAverage(token, period = 20) {
        const history = this.marketData.priceHistory[token];
        if (!history || history.length < period) {
            return history ? history[history.length - 1].price : 0;
        }

        const recent = history.slice(-period);
        const sum = recent.reduce((acc, point) => acc + point.price, 0);
        return sum / period;
    }

    // Calculate Volatility
    calculateVolatility(token, period = 20) {
        const history = this.marketData.priceHistory[token];
        if (!history || history.length < period) {
            return 0;
        }

        const recent = history.slice(-period);
        const prices = recent.map(p => p.price);
        const mean = prices.reduce((acc, price) => acc + price, 0) / prices.length;
        
        const variance = prices.reduce((acc, price) => {
            return acc + Math.pow(price - mean, 2);
        }, 0) / prices.length;

        return Math.sqrt(variance) / mean; // Coefficient of variation
    }

    // Generate comprehensive market analysis
    analyzeMarket(token) {
        const rsi = this.calculateRSI(token);
        const ma20 = this.calculateMovingAverage(token, 20);
        const ma5 = this.calculateMovingAverage(token, 5);
        const volatility = this.calculateVolatility(token);
        const priceChange = this.marketData.getPriceChange(token, 5);

        const currentPrice = this.marketData.priceHistory[token]?.[this.marketData.priceHistory[token].length - 1]?.price || 0;

        return {
            token,
            currentPrice,
            rsi,
            ma20,
            ma5,
            volatility,
            priceChange: priceChange.changePercent,
            trend: ma5 > ma20 ? 'bullish' : 'bearish',
            momentum: priceChange.changePercent > 2 ? 'strong' : priceChange.changePercent < -2 ? 'weak' : 'neutral',
            risk: volatility > 0.1 ? 'high' : volatility > 0.05 ? 'medium' : 'low'
        };
    }
}

// 🎯 Trading Signals Generator
class TradingSignalsGenerator {
    constructor(marketAnalysis) {
        this.marketAnalysis = marketAnalysis;
        this.signalHistory = [];
    }

    // Generate buy/sell signals based on technical analysis
    generateSignals(token) {
        const analysis = this.marketAnalysis.analyzeMarket(token);
        const signals = [];

        // RSI-based signals
        if (analysis.rsi < 30) {
            signals.push({
                type: 'BUY',
                strength: 'strong',
                reason: `RSI oversold (${analysis.rsi.toFixed(1)})`,
                confidence: 0.8
            });
        } else if (analysis.rsi > 70) {
            signals.push({
                type: 'SELL',
                strength: 'strong',
                reason: `RSI overbought (${analysis.rsi.toFixed(1)})`,
                confidence: 0.8
            });
        }

        // Moving average crossover signals
        if (analysis.ma5 > analysis.ma20 && analysis.trend === 'bullish') {
            signals.push({
                type: 'BUY',
                strength: 'medium',
                reason: 'MA5 > MA20 (bullish crossover)',
                confidence: 0.6
            });
        } else if (analysis.ma5 < analysis.ma20 && analysis.trend === 'bearish') {
            signals.push({
                type: 'SELL',
                strength: 'medium',
                reason: 'MA5 < MA20 (bearish crossover)',
                confidence: 0.6
            });
        }

        // Momentum signals
        if (analysis.momentum === 'strong' && analysis.priceChange > 5) {
            signals.push({
                type: 'BUY',
                strength: 'strong',
                reason: `Strong momentum (+${analysis.priceChange.toFixed(1)}%)`,
                confidence: 0.7
            });
        } else if (analysis.momentum === 'weak' && analysis.priceChange < -5) {
            signals.push({
                type: 'SELL',
                strength: 'strong',
                reason: `Weak momentum (${analysis.priceChange.toFixed(1)}%)`,
                confidence: 0.7
            });
        }

        // Risk-based signals
        if (analysis.risk === 'high' && analysis.volatility > 0.15) {
            signals.push({
                type: 'HOLD',
                strength: 'strong',
                reason: `High volatility (${(analysis.volatility * 100).toFixed(1)}%)`,
                confidence: 0.9
            });
        }

        return {
            token,
            signals,
            analysis,
            timestamp: new Date().toISOString()
        };
    }
}

// 📊 Enhanced Trade Statistics
class TradeStatisticsTracker {
    constructor() {
        this.stats = {
            totalTrades: 0,
            successfulTrades: 0,
            failedTrades: 0,
            totalVolume: 0,
            totalProfit: 0,
            bestTrade: 0,
            worstTrade: 0,
            averageTradeSize: 0,
            winRate: 0,
            profitFactor: 0,
            sharpeRatio: 0,
            maxDrawdown: 0,
            sessionStartTime: new Date().toISOString(),
            lastResetTime: null
        };
        this.tradeHistory = [];
        this.dailyReturns = [];
    }

    // Record a new trade
    recordTrade(tradeData) {
        const trade = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            token: tradeData.token,
            type: tradeData.type, // 'buy' or 'sell'
            amount: tradeData.amount,
            price: tradeData.price,
            value: tradeData.amount * tradeData.price,
            profit: tradeData.profit || 0,
            status: tradeData.status, // 'success', 'failed', 'pending'
            txHash: tradeData.txHash,
            ...tradeData
        };

        this.tradeHistory.push(trade);
        this.updateStatistics();
        this.saveToLocalStorage();
    }

    // Update all statistics
    updateStatistics() {
        const successfulTrades = this.tradeHistory.filter(t => t.status === 'success');
        const failedTrades = this.tradeHistory.filter(t => t.status === 'failed');
        
        this.stats.totalTrades = this.tradeHistory.length;
        this.stats.successfulTrades = successfulTrades.length;
        this.stats.failedTrades = failedTrades.length;
        this.stats.totalVolume = this.tradeHistory.reduce((sum, t) => sum + t.value, 0);
        this.stats.totalProfit = this.tradeHistory.reduce((sum, t) => sum + t.profit, 0);
        
        if (successfulTrades.length > 0) {
            this.stats.bestTrade = Math.max(...successfulTrades.map(t => t.profit));
            this.stats.worstTrade = Math.min(...successfulTrades.map(t => t.profit));
        }
        
        this.stats.averageTradeSize = this.stats.totalVolume / Math.max(1, this.stats.totalTrades);
        this.stats.winRate = (this.stats.successfulTrades / Math.max(1, this.stats.totalTrades)) * 100;
        
        // Calculate profit factor
        const totalWins = successfulTrades.reduce((sum, t) => sum + Math.max(0, t.profit), 0);
        const totalLosses = Math.abs(successfulTrades.reduce((sum, t) => sum + Math.min(0, t.profit), 0));
        this.stats.profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? 999 : 0;
        
        // Calculate daily returns for Sharpe ratio
        this.calculateDailyReturns();
        this.stats.sharpeRatio = this.calculateSharpeRatio();
        this.stats.maxDrawdown = this.calculateMaxDrawdown();
    }

    // Calculate daily returns
    calculateDailyReturns() {
        const daily = {};
        this.tradeHistory.forEach(trade => {
            const date = trade.timestamp.split('T')[0];
            if (!daily[date]) {
                daily[date] = 0;
            }
            daily[date] += trade.profit;
        });
        
        this.dailyReturns = Object.values(daily);
    }

    // Calculate Sharpe ratio
    calculateSharpeRatio() {
        if (this.dailyReturns.length < 2) return 0;
        
        const mean = this.dailyReturns.reduce((sum, r) => sum + r, 0) / this.dailyReturns.length;
        const variance = this.dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / this.dailyReturns.length;
        const stdDev = Math.sqrt(variance);
        
        return stdDev > 0 ? mean / stdDev : 0;
    }

    // Calculate maximum drawdown
    calculateMaxDrawdown() {
        if (this.dailyReturns.length === 0) return 0;
        
        let peak = 0;
        let maxDrawdown = 0;
        let runningTotal = 0;
        
        this.dailyReturns.forEach(return_ => {
            runningTotal += return_;
            if (runningTotal > peak) {
                peak = runningTotal;
            }
            const drawdown = peak - runningTotal;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        });
        
        return maxDrawdown;
    }

    // Save to localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('enhanced_trading_stats', JSON.stringify({
                stats: this.stats,
                tradeHistory: this.tradeHistory.slice(-100) // Keep last 100 trades
            }));
        } catch (error) {
            console.error('Failed to save enhanced trading stats:', error);
        }
    }

    // Load from localStorage
    loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('enhanced_trading_stats');
            if (saved) {
                const data = JSON.parse(saved);
                this.stats = { ...this.stats, ...data.stats };
                this.tradeHistory = data.tradeHistory || [];
            }
        } catch (error) {
            console.error('Failed to load enhanced trading stats:', error);
        }
    }
}

// ⚡ Performance & Risk Metrics
class PerformanceRiskAnalyzer {
    constructor(tradeStats) {
        this.tradeStats = tradeStats;
        this.riskMetrics = {};
    }

    // Calculate comprehensive risk metrics
    calculateRiskMetrics() {
        const stats = this.tradeStats.stats;
        
        return {
            // Performance metrics
            totalReturn: stats.totalProfit,
            returnOnInvestment: stats.totalVolume > 0 ? (stats.totalProfit / stats.totalVolume) * 100 : 0,
            winRate: stats.winRate,
            profitFactor: stats.profitFactor,
            sharpeRatio: stats.sharpeRatio,
            
            // Risk metrics
            maxDrawdown: stats.maxDrawdown,
            maxDrawdownPercent: stats.totalVolume > 0 ? (stats.maxDrawdown / stats.totalVolume) * 100 : 0,
            volatility: this.calculateVolatility(),
            var95: this.calculateVaR(0.95),
            var99: this.calculateVaR(0.99),
            
            // Trade quality metrics
            averageWin: this.calculateAverageWin(),
            averageLoss: this.calculateAverageLoss(),
            largestWin: stats.bestTrade,
            largestLoss: Math.abs(stats.worstTrade),
            
            // Consistency metrics
            consecutiveWins: this.calculateConsecutiveWins(),
            consecutiveLosses: this.calculateConsecutiveLosses(),
            tradeFrequency: this.calculateTradeFrequency()
        };
    }

    // Calculate portfolio volatility
    calculateVolatility() {
        if (this.tradeStats.dailyReturns.length < 2) return 0;
        
        const mean = this.tradeStats.dailyReturns.reduce((sum, r) => sum + r, 0) / this.tradeStats.dailyReturns.length;
        const variance = this.tradeStats.dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / this.tradeStats.dailyReturns.length;
        return Math.sqrt(variance);
    }

    // Calculate Value at Risk
    calculateVaR(confidence) {
        if (this.tradeStats.dailyReturns.length === 0) return 0;
        
        const sorted = [...this.tradeStats.dailyReturns].sort((a, b) => a - b);
        const index = Math.floor((1 - confidence) * sorted.length);
        return Math.abs(sorted[index] || 0);
    }

    // Calculate average win
    calculateAverageWin() {
        const wins = this.tradeStats.tradeHistory.filter(t => t.profit > 0);
        return wins.length > 0 ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length : 0;
    }

    // Calculate average loss
    calculateAverageLoss() {
        const losses = this.tradeStats.tradeHistory.filter(t => t.profit < 0);
        return losses.length > 0 ? Math.abs(losses.reduce((sum, t) => sum + t.profit, 0) / losses.length) : 0;
    }

    // Calculate consecutive wins
    calculateConsecutiveWins() {
        let maxConsecutive = 0;
        let current = 0;
        
        this.tradeStats.tradeHistory.forEach(trade => {
            if (trade.profit > 0) {
                current++;
                maxConsecutive = Math.max(maxConsecutive, current);
            } else {
                current = 0;
            }
        });
        
        return maxConsecutive;
    }

    // Calculate consecutive losses
    calculateConsecutiveLosses() {
        let maxConsecutive = 0;
        let current = 0;
        
        this.tradeStats.tradeHistory.forEach(trade => {
            if (trade.profit < 0) {
                current++;
                maxConsecutive = Math.max(maxConsecutive, current);
            } else {
                current = 0;
            }
        });
        
        return maxConsecutive;
    }

    // Calculate trade frequency (trades per day)
    calculateTradeFrequency() {
        if (this.tradeStats.tradeHistory.length === 0) return 0;
        
        const firstTrade = new Date(this.tradeStats.tradeHistory[0].timestamp);
        const lastTrade = new Date(this.tradeStats.tradeHistory[this.tradeStats.tradeHistory.length - 1].timestamp);
        const days = Math.max(1, (lastTrade - firstTrade) / (1000 * 60 * 60 * 24));
        
        return this.tradeStats.tradeHistory.length / days;
    }
}

// 💰 Enhanced Portfolio Manager
class PortfolioManager {
    constructor() {
        this.balances = {};
        this.portfolioValue = 0;
        this.lastUpdate = null;
    }

    // Get real-time balances using SDK
    async updateBalances(walletAddress) {
        try {
            const response = await fetch('http://localhost:3000/api/balance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress })
            });

            if (!response.ok) {
                throw new Error(`Balance API failed: ${response.status}`);
            }

            const data = await response.json();
            if (!data.success) {
                throw new Error(`Balance API error: ${data.message}`);
            }

            // Update balances
            this.balances = {};
            data.balances.forEach(token => {
                this.balances[token.symbol] = {
                    balance: parseFloat(token.balance),
                    decimals: token.decimals,
                    verified: token.verified,
                    image: token.image,
                    contractAddress: token.contractAddress
                };
            });

            this.lastUpdate = new Date().toISOString();
            return this.balances;
        } catch (error) {
            console.error('Portfolio balance update failed:', error);
            throw error;
        }
    }

    // Calculate portfolio value with real-time prices
    async calculatePortfolioValue(prices) {
        let totalValue = 0;
        let breakdown = {};

        for (const [symbol, tokenData] of Object.entries(this.balances)) {
            const price = prices[symbol] || 0;
            const value = tokenData.balance * price;
            totalValue += value;
            
            if (value > 0.01) { // Only include significant values
                breakdown[symbol] = {
                    balance: tokenData.balance,
                    price: price,
                    value: value,
                    percentage: 0 // Will be calculated after total is known
                };
            }
        }

        // Calculate percentages
        Object.values(breakdown).forEach(token => {
            token.percentage = totalValue > 0 ? (token.value / totalValue) * 100 : 0;
        });

        this.portfolioValue = totalValue;
        return {
            totalValue,
            breakdown,
            lastUpdate: this.lastUpdate
        };
    }

    // Get portfolio allocation
    getPortfolioAllocation() {
        const allocation = {};
        let totalValue = 0;

        Object.values(this.balances).forEach(token => {
            totalValue += token.balance * (token.price || 0);
        });

        Object.entries(this.balances).forEach(([symbol, token]) => {
            const value = token.balance * (token.price || 0);
            allocation[symbol] = {
                value: value,
                percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
            };
        });

        return allocation;
    }
}

// Export all classes for use in main application
window.MarketDataCollector = MarketDataCollector;
window.MarketAnalysisEngine = MarketAnalysisEngine;
window.TradingSignalsGenerator = TradingSignalsGenerator;
window.TradeStatisticsTracker = TradeStatisticsTracker;
window.PerformanceRiskAnalyzer = PerformanceRiskAnalyzer;
window.PortfolioManager = PortfolioManager;
