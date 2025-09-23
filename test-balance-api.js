const { GSwap, PrivateKeySigner, FEE_TIER } = require('@gala-chain/gswap-sdk');

async function testBalanceAPI() {
    try {
        console.log('🔍 Testing GalaChain SDK balance API...');
        
        // Initialize SDK
        const gswap = new GSwap({
            network: 'mainnet',
            bundlerUrl: 'https://bundle-backend-prod1.defi.gala.com'
        });
        
        console.log('✅ SDK initialized');
        
        // Test different wallet address formats
        const walletAddresses = [
            '089018e67E35BeAAb3F7c28cb0d64dBA04D9268F',
            '0x089018e67E35BeAAb3F7c28cb0d64dBA04D9268F',
            'eth|089018e67E35BeAAb3F7c28cb0d64dBA04D9268F'
        ];
        
        for (const address of walletAddresses) {
            try {
                console.log(`\n🔍 Testing address format: ${address}`);
                const assets = await gswap.assets.getUserAssets(address, 1, 100);
                console.log(`✅ Success with ${address}:`, assets);
                break;
            } catch (error) {
                console.log(`❌ Failed with ${address}: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testBalanceAPI();
