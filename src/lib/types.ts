// Core types for the Bitcoin mining content system

export interface OnChainData {
  bitcoinPrice: number;
  difficulty: number;
  hashrate: number;
  blockReward: number;
  transactionFees: number;
  mempoolStats: {
    pendingTxs: number;
    avgFeeRate: number;
    congestionLevel: string;
  };
  minerRevenue: {
    daily: number;
    monthly: number;
    yearly: number;
  };
  blockStats: {
    avgBlockTime: number;
    avgBlockSize: number;
    totalBlocks: number;
  };
  timestamp: string;
  source: string;
}

export interface SustainabilityData {
  carbonFootprint: {
    bitcoinNetwork: number; // CO2 emissions in tons
    renewableEnergyPercentage: number;
    cleanEnergyMining: number; // percentage
  };
  energyConsumption: {
    totalNetworkConsumption: number; // TWh
    renewableEnergyUsage: number; // TWh
    gridStabilization: {
      frequencyRegulation: number;
      demandResponse: number;
    };
  };
  dataCenterMetrics: {
    pue: number; // Power Usage Effectiveness
    carbonIntensity: number; // kg CO2 per kWh
    renewableEnergyRatio: number;
  };
  miningEconomics: {
    electricityCosts: {
      globalAverage: number; // $/kWh
      renewableEnergyCost: number; // $/kWh
      traditionalEnergyCost: number; // $/kWh
    };
    profitabilityMetrics: {
      breakEvenPrice: number;
      profitMargin: number;
      roi: number;
    };
  };
  timestamp: string;
  source: string;
}

export interface EvidenceSource {
  title: string;
  url: string;
  site?: string;
  publishedDate?: string;
}

export interface SustainabilityProvenance {
  renewable?: EvidenceSource;
  pue?: EvidenceSource;
  carbon?: EvidenceSource;
  breakEven?: EvidenceSource;
  collectedAt?: string;
}

export interface TrendAnalysisData {
  socialMediaTrends: {
    twitter: {
      hashtags: string[];
      sentiment: 'positive' | 'negative' | 'neutral';
      engagement: number;
      reach: number;
    };
    reddit: {
      subreddits: string[];
      sentiment: 'positive' | 'negative' | 'neutral';
      upvotes: number;
    };
    linkedin: {
      posts: number;
      sentiment: 'positive' | 'negative' | 'neutral';
      engagement: number;
    };
    youtube: {
      videos: number;
      views: number;
      sentiment: 'positive' | 'negative' | 'neutral';
    };
  };
  searchTrends: {
    google: {
      keywords: string[];
      searchVolume: number[];
      relatedQueries: string[];
    };
    youtube: {
      trendingVideos: string[];
      viewCounts: number[];
    };
  };
  newsSentiment: {
    headlines: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    sources: string[];
  };
  institutionalAdoption: {
    corporateTreasury: number; // companies holding Bitcoin
    etfFlows: number; // ETF inflows/outflows
    regulatoryUpdates: string[];
  };
  timestamp: string;
  source: string;
}

export interface ComprehensiveData {
  onChain: OnChainData;
  sustainability: SustainabilityData;
  trends: TrendAnalysisData;
  timestamp: string;
  provenance?: {
    sustainability?: SustainabilityProvenance;
  };
}

export interface ContentTopic {
  id: string;
  title: string;
  description: string;
  comprehensiveData: ComprehensiveData;
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'technical' | 'economic' | 'market' | 'strategy' | 'sustainability' | 'trends';
  focusAreas: string[]; // e.g., ['sustainable-mining', 'data-centers', 'clean-energy']
}

export interface LongFormContent {
  title: string;
  body: string;
  keyInsights?: string[];
  takeaways?: string[];
  comprehensiveData: ComprehensiveData;
  metadata: {
    keywords?: string[];
    wordCount: number;
    readingTime: number;
    difficulty: number;
    passiveVoice: number;
    industryTerms: number;
    focusAreas: string[];
  };
}

export interface PlatformContent {
  platform: 'twitter' | 'linkedin' | 'instagram' | 'facebook';
  content: string;
  mediaUrls?: string[];
  hashtags?: string[];
  characterCount: number;
  metadata: {
    hook?: string;
    cta?: string;
    engagement?: string;
  };
}

export interface ContentPackage {
  id: string;
  longForm: LongFormContent;
  platforms: PlatformContent[];
  status: 'draft' | 'review' | 'approved' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface AgentResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    processingTime: number;
    tokensUsed?: number;
    source?: string;
  };
}

export interface ResearchResult extends AgentResult {
  data?: {
    topics: ContentTopic[];
    comprehensiveData: ComprehensiveData;
  };
}

export interface WritingResult extends AgentResult {
  data?: {
    content: LongFormContent;
    quality: {
      uniqueness: number;
      readability: number;
      technicalAccuracy: number;
    };
    processingTime?: number;
  };
}

export interface QualityResult extends AgentResult {
  data?: {
    isUnique: boolean;
    similarityScore: number;
    qualityScore: number;
    suggestions: string[];
  };
}

export interface RepurposeResult extends AgentResult {
  data?: {
    platforms: PlatformContent[];
    processingTime?: number;
  };
}

export interface PublishResult extends AgentResult {
  data?: {
    publishedUrls: string[];
    platformIds: string[];
  };
}
