// Check if we're getting live market data
async function checkLiveData() {
    console.log('🔍 Checking live market data...\n');
    
    try {
        // Test quote for GUSDC to GALA
        console.log('1. Testing GUSDC to GALA quote...');
        const quoteResponse = await fetch('http://localhost:3000/api/quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tokenIn: 'GUSDC|Unit|none|none',
                tokenOut: 'GALA|Unit|none|none',
                amountIn: '0.6686'
            })
        });
        
        const quote = await quoteResponse.json();
        console.log('✅ Quote result:', quote);
        
        if (quote.success) {
            const amountOut = Number(quote.amountOut);
            const amountIn = 0.6686;
            const profit = ((amountOut - amountIn) / amountIn) * 100;
            
            console.log(`\n📊 Current Market Analysis:`);
            console.log(`   Input: ${amountIn} GUSDC`);
            console.log(`   Output: ${amountOut.toFixed(4)} GALA`);
            console.log(`   Profit: ${profit.toFixed(2)}%`);
            console.log(`   Price Impact: ${quote.priceImpact}`);
            console.log(`   Fee Tier: ${quote.feeTier}`);
            console.log(`   Source: ${quote.source}`);
            console.log(`   Cached: ${quote.cached}`);
            
            if (profit > 1) {
                console.log(`🎉 Profitable arbitrage detected! (${profit.toFixed(2)}% profit)`);
            } else {
                console.log(`⚠️ Arbitrage not profitable (${profit.toFixed(2)}% profit < 1% threshold)`);
            }
        } else {
            console.log(`❌ Quote failed: ${quote.error}`);
        }
        
        // Test reverse quote (GALA to GUSDC)
        console.log('\n2. Testing GALA to GUSDC quote...');
        const reverseQuoteResponse = await fetch('http://localhost:3000/api/quote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tokenIn: 'GALA|Unit|none|none',
                tokenOut: 'GUSDC|Unit|none|none',
                amountIn: '43.32'
            })
        });
        
        const reverseQuote = await reverseQuoteResponse.json();
        console.log('✅ Reverse quote result:', reverseQuote);
        
        if (reverseQuote.success) {
            const reverseAmountOut = Number(reverseQuote.amountOut);
            const reverseAmountIn = 43.32;
            const reverseProfit = ((reverseAmountOut - reverseAmountIn) / reverseAmountIn) * 100;
            
            console.log(`\n📊 Reverse Market Analysis:`);
            console.log(`   Input: ${reverseAmountIn} GALA`);
            console.log(`   Output: ${reverseAmountOut.toFixed(4)} GUSDC`);
            console.log(`   Profit: ${reverseProfit.toFixed(2)}%`);
        }
        
        // Test current prices
        console.log('\n3. Testing current prices...');
        const pricesResponse = await fetch('http://localhost:3000/api/prices');
        const prices = await pricesResponse.json();
        console.log('✅ Prices result:', prices);
        
        if (prices.success) {
            console.log(`\n📊 Current Token Prices:`);
            Object.entries(prices.data).forEach(([token, price]) => {
                const symbol = token.split('|')[0];
                console.log(`   ${symbol}: $${price.toFixed(4)}`);
            });
        }
        
        // Test balance
        console.log('\n4. Testing current balance...');
        const balanceResponse = await fetch('http://localhost:3000/api/balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                walletAddress: 'eth|089018e67E35BeAAb3F7c28cb0d64dBA04D9268F'
            })
        });
        
        const balance = await balanceResponse.json();
        console.log('✅ Balance result:', balance);
        
        if (balance.success) {
            console.log(`\n📊 Current Balances:`);
            balance.balances.forEach(token => {
                console.log(`   ${token.symbol}: ${token.balance}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

// Run test
checkLiveData().catch(console.error);



