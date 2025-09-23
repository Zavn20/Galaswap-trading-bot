const { GSwap } = require('@gala-chain/gswap-sdk');

async function testBalanceAPI() {
    try {
        console.log('🔍 Testing GalaChain SDK balance API...');
        
        // Initialize SDK
        const gswap = new GSwap({
            network: 'mainnet',
            bundlerUrl: 'https://bundle-backend-prod1.defi.gala.com'
        });
        
        console.log('✅ SDK initialized');
        
        // Test the exact wallet address format from the reference
        const walletAddress = 'eth|089018e67E35BeAAb3F7c28cb0d64dBA04D9268F';
        
        try {
            console.log(`🔍 Testing wallet address: ${walletAddress}`);
            const assets = await gswap.assets.getUserAssets(walletAddress, 1, 100);
            console.log(`✅ Success! Found ${assets.count} tokens:`);
            
            assets.tokens.forEach((token, index) => {
                console.log(`${index + 1}. ${token.symbol}: ${token.quantity} (${token.decimals} decimals)`);
                console.log(`   Verified: ${token.verify}, Image: ${token.image}`);
            });
            
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
            console.log(`❌ Error details:`, error);
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testBalanceAPI();
