// API route for fetching on-chain data

import { NextRequest, NextResponse } from 'next/server';
import { OnChainDataCollector } from '@/lib/onchain-data';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    console.log('📊 API: Fetching on-chain data...');
    
    const dataCollector = new OnChainDataCollector();
    const onChainData = await dataCollector.collectBitcoinData();
    console.log('📤 API returning on-chain data summary', {
      price: onChainData.bitcoinPrice,
      difficulty: onChainData.difficulty,
      hashrate_Hs: onChainData.hashrate,
      hashrate_EHs: Number.isFinite(onChainData.hashrate) && onChainData.hashrate > 0 ? onChainData.hashrate / 1e18 : 0,
      source: onChainData.source,
      timestamp: onChainData.timestamp,
    });
    
    console.log('✅ On-chain data fetched successfully');
    
    return NextResponse.json({
      success: true,
      data: onChainData,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch on-chain data',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
