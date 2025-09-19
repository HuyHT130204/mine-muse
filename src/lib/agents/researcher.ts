// Researcher Agent - Collects comprehensive data and generates content topics

import { ComprehensiveDataCollector } from '../comprehensive-data-collector';
import { ResearchResult, ContentTopic, ComprehensiveData } from '../types';
import { CONFIG } from '../config';

export class ResearcherAgent {
  private dataCollector: ComprehensiveDataCollector;

  constructor() {
    this.dataCollector = new ComprehensiveDataCollector();
  }

  async research(): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔍 Researcher Agent: Starting comprehensive data collection...');
      
      // Collect comprehensive data
      const comprehensiveData = await this.dataCollector.collectComprehensiveData();
      console.log('✅ Comprehensive data collected successfully');

      // Generate base topics + suggestions
      const baseTopics = await this.dataCollector.generateComprehensiveTopics(comprehensiveData);
      const suggestions = await this.getTopicSuggestions(comprehensiveData);
      const merged: ContentTopic[] = [];
      const seen = new Set<string>();
      for (const t of [...baseTopics, ...suggestions]) {
        const key = t.title.toLowerCase();
        if (!seen.has(key)) { seen.add(key); merged.push(t); }
      }
      // Ensure we always have CONFIG.CONTENT.MAX_TOPICS_PER_RUN items by generating variants
      const target = CONFIG.CONTENT.MAX_TOPICS_PER_RUN;
      const angleBoosters = [
        ['cost-optimization','break-even','opex'],
        ['sustainability','pue','renewables'],
        ['grid-services','demand-response','curtailment'],
        ['hardware','asic-efficiency','cooling'],
        ['policy','regulation','treasury'],
        ['markets','etf-flows','adoption'],
        ['data-centers','waste-heat','heat-reuse'],
        ['risk','resilience','quantum-era'],
        ['operations','uptime','orchestration'],
        ['finance','hedging','power-pricing']
      ];
      let idx = 0;
      while (merged.length < target) {
        const base = merged[idx % merged.length];
        const angles = angleBoosters[idx % angleBoosters.length];
        const variant: ContentTopic = {
          ...base,
          id: `${base.id}-v${idx}`,
          title: `${base.title} — ${angles[0].replace(/\b\w/g, c => c.toUpperCase())} Angle` ,
          keywords: Array.from(new Set([...base.keywords, ...angles])),
          focusAreas: Array.from(new Set([...base.focusAreas, ...angles]))
        };
        merged.push(variant);
        idx++;
      }

      // Even distribution across 10 buckets (2 topics/bucket)
      const buckets: Record<string, string[]> = {
        'sustainable-data-centers': ['data-centers','pue','cooling','waste-heat','heat-reuse'],
        'mining-profitability': ['profitability','break-even','markets','revenue','roi'],
        'data-cpu-costs': ['cost-optimization','opex','cpu-costs','power-pricing'],
        'hpc-carbon-footprint': ['carbon-footprint','carbon','emissions','green-computing'],
        'crypto-clean-energy': ['clean-energy','renewables','grid-stabilization','curtailment'],
        'quantum-era': ['quantum-computing','quantum-era','crypto-agility','future-proofing'],
        'stabilizing-grids': ['grid-stabilization','frequency-regulation','demand-response'],
        'avoid-non-sustainable-costs': ['cost-avoidance','sustainable-practices','environmental-benefits'],
        'ethical-ai-low-emissions': ['ethical-ai','low-emissions','sustainable-computing'],
        'treasury-asset': ['treasury-asset','corporate-adoption','institutional-investment','etf-flows']
      };
      const perBucket = Math.max(1, Math.floor(target / Object.keys(buckets).length)); // 2 if target=20
      const selected: ContentTopic[] = [];
      for (const [bucket, tags] of Object.entries(buckets)) {
        const pool = merged.filter(t => t.focusAreas.some(f => tags.includes(f)) || t.keywords.some(k => tags.includes(k)) || t.title.toLowerCase().includes(bucket.replace(/-/g,' ')));
        let taken = 0; let pIndex = 0;
        while (taken < perBucket && pIndex < pool.length) {
          const cand = pool[pIndex++];
          if (!selected.some(x => x.id === cand.id)) { selected.push(cand); taken++; }
        }
      }
      // If still fewer than target, top up with remaining merged items
      let fillIdx = 0;
      while (selected.length < target && fillIdx < merged.length) {
        const c = merged[fillIdx++];
        if (!selected.some(x => x.id === c.id)) selected.push(c);
      }

      const topics = selected.slice(0, target);
      console.log(`✅ Generated ${topics.length} content topics`);

      // Validate data quality
      const validationResult = this.validateDataQuality(comprehensiveData);
      if (!validationResult.isValid) {
        throw new Error(`Data validation failed: ${validationResult.errors.join(', ')}`);
      }

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          topics,
          comprehensiveData
        },
        metadata: {
          processingTime,
          source: 'comprehensive-data'
        }
      };

    } catch (error) {
      console.error('❌ Researcher Agent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          processingTime: Date.now() - startTime,
          source: 'comprehensive-data'
        }
      };
    }
  }

  private validateDataQuality(data: ComprehensiveData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const useNumeric = CONFIG.CONTENT.USE_NUMERIC_METRICS !== false;

    // Check if essential on-chain data is present
    if (!data.onChain.bitcoinPrice || data.onChain.bitcoinPrice <= 0) {
      errors.push('Invalid Bitcoin price data');
    }

    if (!data.onChain.difficulty || data.onChain.difficulty <= 0) {
      errors.push('Invalid difficulty data');
    }

    if (data.onChain.hashrate === undefined || data.onChain.hashrate < 0) {
      errors.push('Invalid hashrate data');
    }

    // Check sustainability data
    {
      const v = data.sustainability.carbonFootprint.renewableEnergyPercentage as unknown;
      const num = typeof v === 'number' ? v : Number(v);
      const valid = Number.isFinite(num) && num >= 0 && num <= 100;
      if (!valid) {
        errors.push('Invalid renewable energy percentage');
      }
    }

    if (useNumeric) {
      if (!data.sustainability.dataCenterMetrics.pue || data.sustainability.dataCenterMetrics.pue < 1) {
        errors.push('Invalid PUE data');
      }
    }

    // Check trend data
    if (useNumeric) {
      if (!data.trends.socialMediaTrends.twitter.hashtags || 
          data.trends.socialMediaTrends.twitter.hashtags.length === 0) {
        errors.push('Missing social media trend data');
      }
    }

    if (useNumeric) {
      if (!data.trends.searchTrends.google.keywords || 
          data.trends.searchTrends.google.keywords.length === 0) {
        errors.push('Missing search trend data');
      }
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
    if (data.onChain.bitcoinPrice < 1000 || data.onChain.bitcoinPrice > 200000) {
      errors.push('Bitcoin price outside reasonable range');
    }

    if (data.onChain.difficulty < 1e12 || data.onChain.difficulty > 1e16) {
      errors.push('Difficulty outside reasonable range');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async getTopicSuggestions(comprehensiveData: ComprehensiveData): Promise<ContentTopic[]> {
    const suggestions: ContentTopic[] = [];

    // Analyze data patterns to suggest topics
    const priceChange = this.calculatePriceChange(comprehensiveData);
    // optional analytics (currently unused for topic gating)
    // const difficultyChange = this.calculateDifficultyChange(comprehensiveData);
    // const hashrateChange = this.calculateHashrateChange(comprehensiveData);
    const sustainabilityTrend = this.calculateSustainabilityTrend(comprehensiveData);
    const trendSentiment = this.calculateTrendSentiment(comprehensiveData);

    // Price-based topics
    if (Math.abs(priceChange) > 5) {
      suggestions.push({
        id: `price-analysis-${Date.now()}`,
        title: `Bitcoin Price ${priceChange > 0 ? 'Surge' : 'Drop'} Impact on Mining Profitability`,
        description: `Bitcoin price ${priceChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(priceChange).toFixed(1)}%`,
        comprehensiveData,
        keywords: ['price', 'mining', 'profitability', 'volatility', 'treasury asset'],
        difficulty: 'beginner',
        category: 'economic',
        focusAreas: ['mining-economics', 'price-analysis', 'treasury-asset']
      });
    }

    // Sustainability-focused topics
    if (sustainabilityTrend > 0.1) {
      suggestions.push({
        id: `sustainability-trend-${Date.now()}`,
        title: 'Sustainable Mining Practices: Environmental and Economic Benefits',
        description: `Renewable energy usage: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage}%`,
        comprehensiveData,
        keywords: ['sustainable mining', 'renewable energy', 'environmental benefits', 'clean energy'],
        difficulty: 'intermediate',
        category: 'sustainability',
        focusAreas: ['sustainable-mining', 'clean-energy', 'environmental-benefits']
      });
    }

    // Data center efficiency topics
    if (comprehensiveData.sustainability.dataCenterMetrics.pue < 1.3) {
      suggestions.push({
        id: `datacenter-efficiency-${Date.now()}`,
        title: 'Data Center Efficiency: Optimizing PUE for Sustainable Mining',
        description: `Current PUE: ${comprehensiveData.sustainability.dataCenterMetrics.pue}`,
        comprehensiveData,
        keywords: ['data center efficiency', 'PUE', 'energy optimization', 'sustainable infrastructure'],
        difficulty: 'advanced',
        category: 'technical',
        focusAreas: ['data-centers', 'energy-efficiency', 'sustainable-infrastructure']
      });
    }

    // Trend sentiment topics
    if (trendSentiment > 0.7) {
      suggestions.push({
        id: `positive-trends-${Date.now()}`,
        title: 'Positive Market Trends: Institutional Adoption and Sentiment Analysis',
        description: `Corporate treasury holdings: ${comprehensiveData.trends.institutionalAdoption.corporateTreasury} companies`,
        comprehensiveData,
        keywords: ['market trends', 'institutional adoption', 'sentiment analysis', 'corporate treasury'],
        difficulty: 'beginner',
        category: 'trends',
        focusAreas: ['market-trends', 'institutional-adoption', 'sentiment-analysis']
      });
    }

    // Cost optimization topics
    const costSavings = comprehensiveData.sustainability.miningEconomics.electricityCosts.traditionalEnergyCost - 
                       comprehensiveData.sustainability.miningEconomics.electricityCosts.renewableEnergyCost;
    if (costSavings > 0.02) {
      suggestions.push({
        id: `cost-optimization-${Date.now()}`,
        title: 'Cost Optimization: Renewable Energy vs Traditional Energy Costs',
        description: `Cost savings: $${costSavings.toFixed(3)}/kWh with renewable energy`,
        comprehensiveData,
        keywords: ['cost optimization', 'renewable energy', 'electricity costs', 'operational efficiency'],
        difficulty: 'intermediate',
        category: 'economic',
        focusAreas: ['cost-optimization', 'renewable-energy', 'operational-efficiency']
      });
    }

    return suggestions.slice(0, CONFIG.CONTENT.MAX_TOPICS_PER_RUN);
  }

  private calculatePriceChange(data: ComprehensiveData): number {
    // Touch input to satisfy linter and allow future use
    void data.timestamp;
    // This would typically compare with historical data
    // For now, return a mock calculation
    return Math.random() * 20 - 10; // -10% to +10%
  }

  private calculateDifficultyChange(data: ComprehensiveData): number {
    void data.timestamp;
    // This would typically compare with previous difficulty
    // For now, return a mock calculation
    return Math.random() * 30 - 15; // -15% to +15%
  }

  private calculateHashrateChange(data: ComprehensiveData): number {
    void data.timestamp;
    // This would typically compare with previous hashrate
    // For now, return a mock calculation
    return Math.random() * 40 - 20; // -20% to +20%
  }

  private calculateSustainabilityTrend(data: ComprehensiveData): number {
    // Calculate sustainability trend based on renewable energy percentage
    return data.sustainability.carbonFootprint.renewableEnergyPercentage / 100;
  }

  private calculateTrendSentiment(data: ComprehensiveData): number {
    // Calculate overall trend sentiment based on social media and news
    const socialSentiment = data.trends.socialMediaTrends.twitter.sentiment === 'positive' ? 1 : 
                          data.trends.socialMediaTrends.twitter.sentiment === 'negative' ? 0 : 0.5;
    const newsSentiment = data.trends.newsSentiment.sentiment === 'positive' ? 1 : 
                         data.trends.newsSentiment.sentiment === 'negative' ? 0 : 0.5;
    
    return (socialSentiment + newsSentiment) / 2;
  }
}
