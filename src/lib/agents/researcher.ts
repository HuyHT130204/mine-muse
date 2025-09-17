// Researcher Agent - Collects on-chain data and generates content topics

import { OnChainDataCollector } from '../onchain-data';
import { ResearchResult, ContentTopic, OnChainData } from '../types';
import { CONFIG } from '../config';

export class ResearcherAgent {
  private dataCollector: OnChainDataCollector;

  constructor() {
    this.dataCollector = new OnChainDataCollector();
  }

  async research(): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Researcher Agent: Starting data collection...');
      
      // Collect on-chain data
      const onChainData = await this.dataCollector.collectBitcoinData();
      console.log('✅ On-chain data collected successfully');

      // Generate content topics based on the data
      const topics = await this.dataCollector.generateContentTopics(onChainData);
      console.log(`✅ Generated ${topics.length} content topics`);

      // Validate data quality
      const validationResult = this.validateDataQuality(onChainData);
      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          topics,
          onChainData
        },
        metadata: {
          processingTime,
          source: 'on-chain'
        }
      };

    } catch (error) {
      console.error('❌ Researcher Agent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          processingTime: Date.now() - startTime,
          source: 'on-chain'
        }
      };
    }
  }

  private validateDataQuality(data: OnChainData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if essential data is present
    if (!data.bitcoinPrice || data.bitcoinPrice <= 0) {
      errors.push('Invalid Bitcoin price data');
    }

    if (!data.difficulty || data.difficulty <= 0) {
      errors.push('Invalid difficulty data');
    }

    if (data.hashrate === undefined || data.hashrate < 0) {
      errors.push('Invalid hashrate data');
    }

    if (!data.timestamp) {
      errors.push('Missing timestamp');
    }

    // Check data freshness (should be within last 24 hours)
    const dataAge = Date.now() - new Date(data.timestamp).getTime();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    
    if (dataAge > maxAge) {
      errors.push('Data is too old (older than 24 hours)');
    }

    // Check for reasonable data ranges
    if (data.bitcoinPrice < 1000 || data.bitcoinPrice > 200000) {
      errors.push('Bitcoin price outside reasonable range');
    }

    if (data.difficulty < 1e12 || data.difficulty > 1e15) {
      errors.push('Difficulty outside reasonable range');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async getTopicSuggestions(onChainData: OnChainData): Promise<ContentTopic[]> {
    const suggestions: ContentTopic[] = [];

    // Analyze data patterns to suggest topics
    const priceChange = this.calculatePriceChange(onChainData);
    const difficultyChange = this.calculateDifficultyChange(onChainData);
    const hashrateChange = this.calculateHashrateChange(onChainData);

    // Price-based topics
    if (Math.abs(priceChange) > 5) {
      suggestions.push({
        id: `price-analysis-${Date.now()}`,
        title: `Bitcoin Price ${priceChange > 0 ? 'Surge' : 'Drop'} Impact on Mining`,
        description: `Bitcoin price ${priceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(priceChange).toFixed(1)}%`,
        onChainData,
        keywords: ['price', 'mining', 'profitability', 'volatility'],
        difficulty: 'beginner',
        category: 'economic'
      });
    }

    // Difficulty-based topics
    if (Math.abs(difficultyChange) > 10) {
      suggestions.push({
        id: `difficulty-analysis-${Date.now()}`,
        title: 'Mining Difficulty Adjustment Analysis',
        description: `Difficulty ${difficultyChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(difficultyChange).toFixed(1)}%`,
        onChainData,
        keywords: ['difficulty', 'adjustment', 'mining', 'hashrate'],
        difficulty: 'intermediate',
        category: 'technical'
      });
    }

    // Hashrate-based topics
    if (Math.abs(hashrateChange) > 15) {
      suggestions.push({
        id: `hashrate-analysis-${Date.now()}`,
        title: 'Network Hash Rate Trend Analysis',
        description: `Network hashrate ${hashrateChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(hashrateChange).toFixed(1)}%`,
        onChainData,
        keywords: ['hashrate', 'network', 'security', 'mining'],
        difficulty: 'intermediate',
        category: 'technical'
      });
    }

    // Mempool congestion topics
    if (onChainData.mempoolStats.congestionLevel === 'high') {
      suggestions.push({
        id: `mempool-congestion-${Date.now()}`,
        title: 'High Mempool Congestion: Impact on Mining',
        description: `${onChainData.mempoolStats.pendingTxs.toLocaleString()} pending transactions`,
        onChainData,
        keywords: ['mempool', 'congestion', 'fees', 'transactions'],
        difficulty: 'advanced',
        category: 'technical'
      });
    }

    // Revenue analysis topics
    if (onChainData.minerRevenue.daily > 0) {
      suggestions.push({
        id: `revenue-analysis-${Date.now()}`,
        title: 'Daily Mining Revenue Breakdown',
        description: `Daily revenue: $${onChainData.minerRevenue.daily.toLocaleString()}`,
        onChainData,
        keywords: ['revenue', 'mining', 'daily', 'profitability'],
        difficulty: 'intermediate',
        category: 'economic'
      });
    }

    return suggestions.slice(0, CONFIG.CONTENT.MAX_TOPICS_PER_RUN);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private calculatePriceChange(_data: OnChainData): number {
    // This would typically compare with historical data
    // For now, return a mock calculation
    return Math.random() * 20 - 10; // -10% to +10%
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private calculateDifficultyChange(_data: OnChainData): number {
    // This would typically compare with previous difficulty
    // For now, return a mock calculation
    return Math.random() * 30 - 15; // -15% to +15%
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  private calculateHashrateChange(_data: OnChainData): number {
    // This would typically compare with previous hashrate
    // For now, return a mock calculation
    return Math.random() * 40 - 20; // -20% to +20%
  }
}
