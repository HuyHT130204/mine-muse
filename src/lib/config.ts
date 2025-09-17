// Configuration for the Bitcoin mining content system

export const CONFIG = {
  // Content generation settings
  CONTENT: {
    MONTHLY_TARGET: 20,
    MAX_TOPICS_PER_RUN: 5,
    MIN_UNIQUENESS_SCORE: 0.85,
    MAX_READABILITY_GRADE: 12,
    MAX_PASSIVE_VOICE: 0.1,
  },

  // Platform character limits
  PLATFORMS: {
    TWITTER: {
      MAX_CHARS: 280,
      MIN_CHARS: 50,
    },
    LINKEDIN: {
      MAX_CHARS: 3000,
      MIN_CHARS: 200,
    },
    INSTAGRAM: {
      MAX_CHARS: 2200,
      MIN_CHARS: 100,
      MAX_HASHTAGS: 30,
    },
    FACEBOOK: {
      MAX_CHARS: 63206,
      MIN_CHARS: 100,
    },
  },

  // On-chain data sources
  DATA_SOURCES: {
    BITCOIN_RPC: {
      BASE_URL: 'https://blockstream.info/api',
      ENDPOINTS: {
        BLOCK_HEADER: '/block/{hash}',
        BLOCK_HEIGHT: '/block-height/{height}',
        MEMPOOL: '/mempool',
        FEE_ESTIMATES: '/fee-estimates',
      },
    },
    MEMPOOL_SPACE: {
      BASE_URL: 'https://mempool.space/api',
      ENDPOINTS: {
        BLOCKS: '/blocks',
        MEMPOOL: '/mempool',
        FEE_ESTIMATES: '/v1/fees/recommended',
        STATS: '/v1/mining/hashrate/1y',
      },
    },
    CHAINLINK: {
      BASE_URL: 'https://api.chain.link/v1',
      ENDPOINTS: {
        BTC_USD: '/feeds/1/0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      },
    },
    GLASSNODE: {
      BASE_URL: 'https://api.glassnode.com/v1',
      ENDPOINTS: {
        MINER_REVENUE: '/metrics/mining/revenue_sum',
        HASH_RATE: '/metrics/mining/hash_rate_mean',
        DIFFICULTY: '/metrics/mining/difficulty_latest',
      },
    },
  },

  // AI/LLM settings
  AI: {
    PROVIDER: process.env.LLM_PROVIDER || 'openrouter',
    MODEL: {
      // Removed HF usage; keeping keys for compatibility where referenced
      OPENROUTER: process.env.OPENROUTER_MODEL || 'openrouter/sonoma-dusk-alpha',
      OPENAI: 'gpt-4',
      CLAUDE: 'claude-3-sonnet-20240229',
    },
    EMBEDDINGS: {
      PROVIDER: process.env.EMBEDDINGS_PROVIDER || 'hf',
      MODEL: 'sentence-transformers/all-MiniLM-L6-v2',
    },
    // Model rotation settings
    MODEL_ROTATION: {
      ENABLED: process.env.MODEL_ROTATION_ENABLED === 'true' || true,
      MODELS: ['nvidia/nemotron-nano-9b-v2:free', 'openrouter/sonoma-dusk-alpha'],
      ROTATION_STRATEGY: (process.env.MODEL_ROTATION_STRATEGY as 'alternating' | 'random') || 'alternating',
    },
  },

  // Storage settings
  STORAGE: {
    VECTOR_DB: 'weaviate',
    CONTENT_DB: 'supabase',
    MEDIA: 'cloudinary',
  },

  // Quality thresholds
  QUALITY: {
    MIN_UNIQUENESS: 0.85,
    MIN_READABILITY: 0.7,
    MAX_SIMILARITY: 0.3,
    MIN_TECHNICAL_ACCURACY: 0.8,
  },

  // Bitcoin mining glossary
  GLOSSARY: {
    TECHNICAL: [
      'ASIC', 'PoW', 'hashrate', 'difficulty', 'block reward', 'merkle root',
      'nonce', 'target', 'POW', 'mining pool', 'solo mining', 'PUE',
      'mining farm', 'hash function', 'SHA-256', 'block header', 'genesis block'
    ],
    ECONOMIC: [
      'mining revenue', 'operating costs', 'electricity costs', 'profitability',
      'break-even price', 'mining difficulty adjustment', 'halving',
      'mining rewards', 'transaction fees', 'mining economics'
    ],
    MARKET: [
      'Bitcoin price', 'market cap', 'trading volume', 'volatility',
      'market sentiment', 'institutional adoption', 'regulatory environment'
    ],
    AVOID: [
      'crypto', 'cryptocurrency', 'digital currency', 'virtual currency',
      'fake money', 'scam', 'ponzi', 'bubble'
    ],
  },

  // Content categories and topics
  TOPICS: {
    TECHNICAL: [
      'Mining Hardware Evolution',
      'Hash Rate Analysis',
      'Difficulty Adjustments',
      'Block Production',
      'Network Security',
      'Mining Pool Dynamics',
    ],
    ECONOMIC: [
      'Mining Profitability',
      'Cost Analysis',
      'Revenue Optimization',
      'Market Cycles',
      'Investment Strategies',
      'Risk Management',
    ],
    MARKET: [
      'Price Impact on Mining',
      'Market Sentiment',
      'Institutional Mining',
      'Regulatory Updates',
      'Global Mining Trends',
      'Energy Consumption',
    ],
  },
} as const;

export type PlatformType = keyof typeof CONFIG.PLATFORMS;
export type TopicCategory = keyof typeof CONFIG.TOPICS;
export type DataSource = keyof typeof CONFIG.DATA_SOURCES;

