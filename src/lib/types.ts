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

export interface ContentTopic {
  id: string;
  title: string;
  description: string;
  onChainData: OnChainData;
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'technical' | 'economic' | 'market' | 'strategy';
}

export interface LongFormContent {
  title: string;
  body: string;
  keyInsights?: string[];
  takeaways?: string[];
  onChainData: OnChainData;
  metadata: {
    keywords?: string[];
    wordCount: number;
    readingTime: number;
    difficulty: number;
    passiveVoice: number;
    industryTerms: number;
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
    onChainData: OnChainData;
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
