// On-chain data collection for Bitcoin mining content

import axios from 'axios';
import { OnChainData, ContentTopic, ComprehensiveData } from './types';
import { CONFIG } from './config';

export class OnChainDataCollector {
  private bitcoinRpcUrl = CONFIG.DATA_SOURCES.BITCOIN_RPC.BASE_URL;
  private mempoolUrl = CONFIG.DATA_SOURCES.MEMPOOL_SPACE.BASE_URL;
  private chainlinkUrl = CONFIG.DATA_SOURCES.CHAINLINK.BASE_URL;
  private glassnodeUrl = CONFIG.DATA_SOURCES.GLASSNODE.BASE_URL;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTimeout = 60000; // 1 minute cache

  private getCachedData(key: string): { price: number } | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data as { price: number };
    }
    return null;
  }

  private setCachedData(key: string, data: { price: number }): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async collectBitcoinData(): Promise<OnChainData> {
    try {
      console.log('🔍 Collecting real on-chain Bitcoin data...');
      
      // Collect data from multiple sources in parallel
      const [
        priceData,
        mempoolData,
        blockData,
        difficultyData,
        hashrateData,
        minerRevenueData
      ] = await Promise.all([
        this.getBitcoinPrice(),
        this.getMempoolStats(),
        this.getLatestBlockData(),
        this.getDifficultyData(),
        this.getHashrateData(),
        this.getMinerRevenue()
      ]);

      // Final safeguard: if hashrate is not a positive finite number, derive from difficulty
      let hashrateFinal = hashrateData.hashrate;
      if (!Number.isFinite(hashrateFinal) || hashrateFinal <= 0) {
        try {
          const avgBlockTime = blockData.blockStats.avgBlockTime || 600;
          const derived = difficultyData.difficulty * Math.pow(2, 32) / avgBlockTime;
          if (Number.isFinite(derived) && derived > 0) {
            hashrateFinal = derived;
          }
        } catch {}
      }

      const result = {
        bitcoinPrice: priceData.price,
        difficulty: difficultyData.difficulty,
        hashrate: hashrateFinal,
        blockReward: blockData.blockReward,
        transactionFees: blockData.transactionFees,
        mempoolStats: mempoolData,
        minerRevenue: minerRevenueData,
        blockStats: blockData.blockStats,
        timestamp: new Date().toISOString(),
        source: 'on-chain'
      };

      console.log('✅ Real on-chain data collected successfully', {
        price: result.bitcoinPrice,
        difficulty: result.difficulty,
        hashrate_Hs: result.hashrate,
        hashrate_EHs: Number.isFinite(result.hashrate) && result.hashrate > 0 ? result.hashrate / 1e18 : 0,
      });
      return result;
    } catch (error) {
      console.error('❌ Error collecting on-chain data:', error);
      console.log('🔄 Falling back to mock data for demo purposes');
      return this.getMockBitcoinData();
    }
  }

  private getMockBitcoinData(): OnChainData {
    return {
      bitcoinPrice: 0,
      difficulty: 0,
      hashrate: 0,
      blockReward: 0,
      transactionFees: 0,
      mempoolStats: {
        pendingTxs: 0,
        avgFeeRate: 0,
        congestionLevel: 'low'
      },
      minerRevenue: {
        daily: 0,
        monthly: 0,
        yearly: 0
      },
      blockStats: {
        avgBlockTime: 0,
        avgBlockSize: 0,
        totalBlocks: 0
      },
      timestamp: new Date().toISOString(),
      source: 'empty'
    };
  }

  private async getBitcoinPrice(): Promise<{ price: number }> {
    // Check cache first
    const cached = this.getCachedData('bitcoin_price');
    if (cached) {
      return cached;
    }

    try {
      // Try CoinGecko first (most reliable)
      const coingeckoResponse = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
        { timeout: 10000 }
      );
      
      if (coingeckoResponse.data?.bitcoin?.usd) {
        const priceData = { price: coingeckoResponse.data.bitcoin.usd };
        this.setCachedData('bitcoin_price', priceData);
        return priceData;
      }

      // Fallback to alternative API
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      const alternativeResponse = await axios.get(
        'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
        { timeout: 10000 }
      );
      
      if (alternativeResponse.data?.data?.rates?.USD) {
        const priceData = { price: parseFloat(alternativeResponse.data.data.rates.USD) };
        this.setCachedData('bitcoin_price', priceData);
        return priceData;
      }

      throw new Error('No price data available');
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error);
      // Return cached price if available, otherwise fallback to mock
      const cached = this.getCachedData('bitcoin_price');
      if (cached) {
        return cached;
      }
      return { price: 0 }; // Empty data
    }
  }

  private async getMempoolStats(): Promise<{
    pendingTxs: number;
    avgFeeRate: number;
    congestionLevel: string;
  }> {
    try {
      const [mempoolResponse, feeResponse] = await Promise.all([
        axios.get(`${this.mempoolUrl}/mempool`, { timeout: 10000 }),
        axios.get(`${this.mempoolUrl}/v1/fees/recommended`, { timeout: 10000 })
      ]);

      const pendingTxs = mempoolResponse.data.count || 0;
      const avgFeeRate = feeResponse.data.fastestFee || 0;
      
      let congestionLevel = 'low';
      if (pendingTxs > 10000) congestionLevel = 'high';
      else if (pendingTxs > 5000) congestionLevel = 'medium';

      return {
        pendingTxs,
        avgFeeRate,
        congestionLevel
      };
    } catch (error) {
      console.error('Error fetching mempool stats:', error);
      // Return empty data
      return {
        pendingTxs: 0,
        avgFeeRate: 0,
        congestionLevel: 'low'
      };
    }
  }

  private async getLatestBlockData(): Promise<{
    blockReward: number;
    transactionFees: number;
    blockStats: {
      avgBlockTime: number;
      avgBlockSize: number;
      totalBlocks: number;
    };
  }> {
    try {
      // Get latest block height
      const latestBlockResponse = await axios.get(
        `${this.bitcoinRpcUrl}/blocks/tip/height`,
        { timeout: 10000 }
      );

      const latestHeight = latestBlockResponse.data;
      
      // Get block hash from height (Blockstream: /block-height/{height} returns hash)
      let blockHash: string;
      try {
        const blockHashResponse = await axios.get(
          `${this.bitcoinRpcUrl}/block-height/${latestHeight}`,
          { timeout: 10000 }
        );
        blockHash = blockHashResponse.data;
      } catch {
        // Graceful 404 handling: if not found, step back one block
        const fallbackHeight = latestHeight - 1;
        const fallbackResp = await axios.get(
          `${this.bitcoinRpcUrl}/block-height/${fallbackHeight}`,
          { timeout: 10000 }
        );
        blockHash = fallbackResp.data;
      }
      
      // Get block data
      const blockData = await axios.get(
        `${this.bitcoinRpcUrl}/block/${blockHash}`,
        { timeout: 10000 }
      );

      // Compute current block subsidy based on halving schedule (every 210,000 blocks)
      const halvingInterval = 210000;
      const halvings = Math.floor(latestHeight / halvingInterval);
      const initialSubsidy = 50; // BTC
      const blockReward = Number((initialSubsidy / Math.pow(2, Math.max(0, halvings))).toFixed(8));
      const transactionFees = blockData.data.fee || 0;
      
      // Calculate average block time (simplified)
      const avgBlockTime = 600; // 10 minutes target
      const avgBlockSize = blockData.data.size || 0;
      const totalBlocks = latestHeight;

      return {
        blockReward,
        transactionFees,
        blockStats: {
          avgBlockTime,
          avgBlockSize,
          totalBlocks
        }
      };
    } catch (error) {
      console.error('Error fetching block data:', error);
      // Return empty data
      return {
        blockReward: 0,
        transactionFees: 0,
        blockStats: {
          avgBlockTime: 0,
          avgBlockSize: 0,
          totalBlocks: 0
        }
      };
    }
  }

  private async getDifficultyData(): Promise<{ difficulty: number }> {
    try {
      // Primary source: Blockstream API (block difficulty)
      const heightResponse = await axios.get(
        `${this.bitcoinRpcUrl}/blocks/tip/height`,
        { timeout: 10000 }
      );
      const latestHeight = heightResponse.data;

      let blockHash: string;
      try {
        const blockHashResponse = await axios.get(
          `${this.bitcoinRpcUrl}/block-height/${latestHeight}`,
          { timeout: 10000 }
        );
        blockHash = blockHashResponse.data;
      } catch {
        const fallbackHeight = latestHeight - 1;
        const fallbackResp = await axios.get(
          `${this.bitcoinRpcUrl}/block-height/${fallbackHeight}`,
          { timeout: 10000 }
        );
        blockHash = fallbackResp.data;
      }

      const blockData = await axios.get(
        `${this.bitcoinRpcUrl}/block/${blockHash}`,
        { timeout: 10000 }
      );
      if (blockData.data?.difficulty) {
        return { difficulty: blockData.data.difficulty };
      }

      // Fallback 1: mempool.space difficulty-adjustment endpoint
      const diffAdj = await axios.get(
        `${this.mempoolUrl}/v1/difficulty-adjustment`,
        { timeout: 10000 }
      );
      if (diffAdj.data?.difficulty) {
        return { difficulty: diffAdj.data.difficulty };
      }

      // Return empty data
      return { difficulty: 0 };
    } catch {
      console.warn('Primary difficulty lookup failed, trying mempool.space fallback...');
      try {
        const diffAdj = await axios.get(
          `${this.mempoolUrl}/v1/difficulty-adjustment`,
          { timeout: 10000 }
        );
        if (diffAdj.data?.difficulty) {
          return { difficulty: diffAdj.data.difficulty };
        }
      } catch (fallbackError) {
        console.error('Error fetching difficulty data (all sources):', fallbackError);
      }
      return { difficulty: 0 };
    }
  }

  private async getHashrateData(): Promise<{ hashrate: number }> {
    try {
      let value: number | undefined;
      try {
        const ms = await axios.get('https://minerstat.com/coin/BTC/network-hashrate', {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; MineMuseBot/1.0; +https://example.com)'
          }
        });
        const html: string = typeof ms.data === 'string' ? ms.data : String(ms.data ?? '');
        const m1 = html.match(/network\s+hashrate[^\d]*([\d,.]+)\s*E\s*H\s*\/\s*s/i);
        const m2 = !m1 ? html.match(/([\d,.]+)\s*E\s*H\s*\/\s*s[^<]*Network\s+hashrate/i) : null;
        const chosen = (m1 && m1[1]) || (m2 && m2[1]) || null;
        if (chosen) {
          const eh = Number(chosen.replace(/[,\s]/g, ''));
          if (Number.isFinite(eh)) value = eh * 1e18; // EH/s → H/s
        }
      } catch {}

      // 2) Fallback: mempool 3d (values commonly in EH/s)
      if (!Number.isFinite(value as number)) {
        try {
          const response = await axios.get(
            `${this.mempoolUrl}/v1/mining/hashrate/3d`,
            { timeout: 10000 }
          );
          const hashrateData = response.data;
          const latest = Array.isArray(hashrateData) && hashrateData.length > 0 ? hashrateData[hashrateData.length - 1] : null;
          let valueRaw: unknown = null;
          if (latest && typeof latest === 'object') {
            const obj = latest as Record<string, unknown>;
            valueRaw = obj.hashrate ?? obj.avgHashrate ?? obj.v ?? obj.value ?? null;
          }
          let parsed = typeof valueRaw === 'number' ? valueRaw : Number(valueRaw);
          if (Number.isFinite(parsed)) {
            if (parsed < 1e9) parsed = parsed * 1e18; // EH/s -> H/s
            value = parsed;
          }
        } catch {}
      }

      // 3) Fallback: mempool 1y
      if (!Number.isFinite(value as number)) {
        try {
          const response = await axios.get(
            `${this.mempoolUrl}/v1/mining/hashrate/1y`,
            { timeout: 10000 }
          );
          const hashrateData = response.data;
          const latest = Array.isArray(hashrateData) && hashrateData.length > 0 ? hashrateData[hashrateData.length - 1] : null;
          let valueRaw: unknown = null;
          if (latest && typeof latest === 'object') {
            const obj = latest as Record<string, unknown>;
            valueRaw = obj.hashrate ?? obj.avgHashrate ?? obj.v ?? obj.value ?? null;
          }
          let parsed = typeof valueRaw === 'number' ? valueRaw : Number(valueRaw);
          if (Number.isFinite(parsed)) {
            if (parsed < 1e9) parsed = parsed * 1e18; // EH/s -> H/s
            value = parsed;
          }
        } catch {}
      }

      // 4) Fallback: blockchain.com GH/s → H/s
      if (!Number.isFinite(value as number)) {
        try {
          const bc = await axios.get(
            'https://api.blockchain.info/charts/hash-rate?timespan=3days&format=json',
            { timeout: 10000 }
          );
          const values = bc.data?.values;
          if (Array.isArray(values) && values.length) {
            const last = values[values.length - 1];
            const ghps = typeof last?.y === 'number' ? last.y : Number(last?.y);
            if (Number.isFinite(ghps)) value = ghps * 1e9;
          }
        } catch {}
      }

      // Fallback 3: Minerstat page HTML scraping (EH/s)
      if (!Number.isFinite(value)) {
        try {
          const ms = await axios.get('https://minerstat.com/coin/BTC/network-hashrate', {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; MineMuseBot/1.0; +https://example.com)'
            }
          });
          const html: string = typeof ms.data === 'string' ? ms.data : String(ms.data ?? '');
          const match = html.match(/network\s+hashrate[^\d]*([\d,.]+)\s*E\s*H\s*\/\s*s/i) || html.match(/\-\s*([\d,.]+)\s*E\s*H\s*\/\s*s/i);
          if (match && match[1]) {
            const eh = Number(match[1].replace(/[,\s]/g, ''));
            if (Number.isFinite(eh)) {
              value = eh * 1e18; // convert EH/s → H/s
            }
          }
        } catch {}
      }

      if (!Number.isFinite(value as number)) {
        throw new Error('No numeric hashrate in response');
      }

      return { hashrate: value as number };
    } catch (error) {
      console.error('Error fetching hashrate data:', error);
      // Final fallback: derive from difficulty and average block time
      try {
        const [{ difficulty }, derivedBlock] = await Promise.all([
          this.getDifficultyData(),
          this.getLatestBlockData(),
        ]);
        const avgBlockTime = derivedBlock.blockStats.avgBlockTime || 600; // seconds
        // Hashrate (H/s) ≈ difficulty * 2^32 / average_block_time
        const hashrateDerived = difficulty * Math.pow(2, 32) / avgBlockTime;
        if (Number.isFinite(hashrateDerived) && hashrateDerived > 0) {
          return { hashrate: hashrateDerived };
        }
      } catch (fallbackErr) {
        console.error('Hashrate derivation fallback failed:', fallbackErr);
      }
      // If everything fails, return empty data
      console.warn('All hashrate sources failed, using empty data');
      return { hashrate: 0 };
    }
  }

  private async getMinerRevenue(): Promise<{
    daily: number;
    monthly: number;
    yearly: number;
  }> {
    try {
      // Calculate based on current block reward (derived from latest height) and current price
      const priceData = await this.getBitcoinPrice();
      let blockReward = 3.125;
      try {
        const tip = await axios.get(`${this.mempoolUrl}/blocks/tip/height`, { timeout: 8000 });
        const latestHeight = Number(tip.data || 0);
        if (Number.isFinite(latestHeight) && latestHeight > 0) {
          const halvings = Math.floor(latestHeight / 210000);
          const initialSubsidy = 50;
          blockReward = initialSubsidy / Math.pow(2, Math.max(0, halvings));
        }
      } catch {}
      const blocksPerDay = 144; // 24 * 60 / 10
      const blocksPerMonth = blocksPerDay * 30;
      const blocksPerYear = blocksPerDay * 365;

      const dailyRevenue = blockReward * blocksPerDay * priceData.price;
      const monthlyRevenue = blockReward * blocksPerMonth * priceData.price;
      const yearlyRevenue = blockReward * blocksPerYear * priceData.price;

      return {
        daily: dailyRevenue,
        monthly: monthlyRevenue,
        yearly: yearlyRevenue
      };
    } catch (error) {
      console.error('Error calculating miner revenue:', error);
      // Return empty data
      return {
        daily: 0,
        monthly: 0,
        yearly: 0
      };
    }
  }

  async generateContentTopics(onChainData: OnChainData): Promise<ContentTopic[]> {
    const topics: ContentTopic[] = [];

    // Create empty comprehensive data to force Claude to search
    const emptyComprehensiveData: ComprehensiveData = {
      onChain: onChainData,
      sustainability: {
        carbonFootprint: {
          bitcoinNetwork: 0,
          renewableEnergyPercentage: 0,
          cleanEnergyMining: 0
        },
        energyConsumption: {
          totalNetworkConsumption: 0,
          renewableEnergyUsage: 0,
          gridStabilization: {
            frequencyRegulation: 0,
            demandResponse: 0
          }
        },
        dataCenterMetrics: {
          pue: 0,
          carbonIntensity: 0,
          renewableEnergyRatio: 0
        },
        miningEconomics: {
          electricityCosts: {
            globalAverage: 0,
            renewableEnergyCost: 0,
            traditionalEnergyCost: 0
          },
          profitabilityMetrics: {
            breakEvenPrice: 0,
            profitMargin: 0,
            roi: 0
          }
        },
        timestamp: new Date().toISOString(),
        source: 'empty'
      },
      trends: {
        socialMediaTrends: {
          twitter: {
            hashtags: [],
            sentiment: 'neutral' as const,
            engagement: 0,
            reach: 0
          },
          reddit: {
            subreddits: [],
            sentiment: 'neutral' as const,
            upvotes: 0
          },
          linkedin: {
            posts: 0,
            sentiment: 'neutral' as const,
            engagement: 0
          },
          youtube: {
            videos: 0,
            views: 0,
            sentiment: 'neutral' as const
          }
        },
        searchTrends: {
          google: {
            keywords: [],
            searchVolume: [],
            relatedQueries: []
          },
          youtube: {
            trendingVideos: [],
            viewCounts: []
          }
        },
        newsSentiment: {
          headlines: [],
          sentiment: 'neutral' as const,
          sources: []
        },
        institutionalAdoption: {
          corporateTreasury: 0,
          etfFlows: 0,
          regulatoryUpdates: []
        },
        timestamp: new Date().toISOString(),
        source: 'empty'
      },
      timestamp: new Date().toISOString()
    };

    // Always generate 5 topics based on current on-chain data
    topics.push({
      id: `difficulty-${Date.now()}`,
      title: 'Bitcoin Mining Difficulty Analysis',
      description: `Current difficulty: ${onChainData.difficulty?.toLocaleString() || 'N/A'}`,
      comprehensiveData: emptyComprehensiveData,
      keywords: ['difficulty', 'mining', 'adjustment', 'hashrate'],
      difficulty: 'intermediate',
      category: 'technical',
      focusAreas: ['mining-difficulty', 'network-security']
    });

    topics.push({
      id: `price-impact-${Date.now()}`,
      title: 'Bitcoin Price Impact on Mining Profitability',
      description: `Current price: $${onChainData.bitcoinPrice?.toLocaleString() || 'N/A'}`,
      comprehensiveData: emptyComprehensiveData,
      keywords: ['price', 'profitability', 'mining', 'economics'],
      difficulty: 'beginner',
      category: 'economic',
      focusAreas: ['mining-economics', 'price-analysis']
    });

    topics.push({
      id: `mempool-${Date.now()}`,
      title: 'Mempool Congestion and Transaction Fees',
      description: `Pending transactions: ${onChainData.mempoolStats?.pendingTxs?.toLocaleString() || 'N/A'}`,
      comprehensiveData: emptyComprehensiveData,
      keywords: ['mempool', 'fees', 'congestion', 'transactions'],
      difficulty: 'advanced',
      category: 'technical',
      focusAreas: ['network-congestion', 'transaction-fees']
    });

    topics.push({
      id: `revenue-${Date.now()}`,
      title: 'Daily Mining Revenue Analysis',
      description: `Daily revenue: $${onChainData.minerRevenue?.daily?.toLocaleString() || 'N/A'}`,
      comprehensiveData: emptyComprehensiveData,
      keywords: ['revenue', 'mining', 'daily', 'profitability'],
      difficulty: 'intermediate',
      category: 'economic',
      focusAreas: ['mining-revenue', 'profitability']
    });

    topics.push({
      id: `hashrate-${Date.now()}`,
      title: 'Network Hash Rate Trends',
      description: `Current hashrate: ${onChainData.hashrate ? `${(onChainData.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}`,
      comprehensiveData: emptyComprehensiveData,
      keywords: ['hashrate', 'network', 'security', 'mining'],
      difficulty: 'intermediate',
      category: 'technical',
      focusAreas: ['network-hashrate', 'mining-security']
    });

    return topics.slice(0, CONFIG.CONTENT.MAX_TOPICS_PER_RUN);
  }
}
  