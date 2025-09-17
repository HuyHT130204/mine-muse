// Script to test on-chain data fetching

import fetch from 'node-fetch';

async function testOnChainData() {
  try {
    console.log('📊 Testing on-chain data fetching...');
    
    const response = await fetch('http://localhost:3000/api/onchain-data');
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ On-chain data fetched successfully!');
      console.log('\n📈 Data Summary:');
      console.log(`Bitcoin Price: $${result.data.bitcoinPrice?.toLocaleString() || 'N/A'}`);
      console.log(`Difficulty: ${result.data.difficulty?.toLocaleString() || 'N/A'}`);
      console.log(`Hash Rate: ${result.data.hashrate ? `${(result.data.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}`);
      console.log(`Block Reward: ${result.data.blockReward || 'N/A'} BTC`);
      console.log(`Daily Revenue: $${result.data.minerRevenue?.daily?.toLocaleString() || 'N/A'}`);
      console.log(`Pending Txs: ${result.data.mempoolStats?.pendingTxs?.toLocaleString() || 'N/A'}`);
      console.log(`Timestamp: ${result.data.timestamp}`);
    } else {
      console.error('❌ On-chain data fetching failed:', result.message);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOnChainData();
