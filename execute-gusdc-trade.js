// Manual GUSDC to GALA trade execution
const fetch = require('node-fetch');

async function executeGUSDCTrade() {
    console.log('🚀 Executing GUSDC → GALA Trade');
    console.log('=' .repeat(40));
    console.log('📊 Trade Details:');
    console.log('   From: 0.668568 GUSDC');
    console.log('   To: ~7,536 GALA (estimated)');
    console.log('   Type: 100% of GUSDC balance');
    console.log('');
    
    try {
        // Execute the swap
        console.log('🔄 Executing swap...');
        const swapResponse = await fetch('http://localhost:3000/api/swap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tokenIn: 'GUSDC|Unit|none|none',
                tokenOut: 'GALA|Unit|none|none',
                amountIn: '0.668568',
                walletAddress: 'eth|089018e67E35BeAAb3F7c28cb0d64dBA04D9268F'
                // Note: Private key should be set in the frontend, not here for security
            })
        });
        
        if (!swapResponse.ok) {
            const errorText = await swapResponse.text();
            console.log(`❌ Swap failed: ${swapResponse.status}`);
            console.log(`Error: ${errorText}`);
            console.log('');
            console.log('💡 This is expected - the private key needs to be set in the frontend.');
            console.log('   Please use the web interface at galaswap-trading-bot.html');
            return;
        }
        
        const swapData = await swapResponse.json();
        console.log(`✅ Trade executed successfully!`);
        console.log(`🔗 Transaction Hash: ${swapData.transactionHash}`);
        console.log(`💰 Received: ${swapData.amountOut} GALA`);
        
    } catch (error) {
        console.error('❌ Trade execution failed:', error.message);
        console.log('');
        console.log('💡 To execute this trade:');
        console.log('   1. Open galaswap-trading-bot.html in your browser');
        console.log('   2. Make sure your wallet is connected');
        console.log('   3. The bot will automatically detect and execute this trade');
    }
}

executeGUSDCTrade();



