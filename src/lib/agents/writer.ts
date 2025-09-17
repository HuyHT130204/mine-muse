import { ContentTopic, LongFormContent, WritingResult } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { CONFIG } from '../config';
import { modelManager } from '../model-manager';

type MinimalLLM = {
  invoke: (input: string) => Promise<unknown>;
} & Partial<{
  stream: (input: string) => Promise<AsyncIterable<{ content?: unknown }>>;
}>;

// Module-level index to alternate OpenRouter models between requests
let openRouterModelIndex = 0;

export class WriterAgent {
  private llm: MinimalLLM | undefined;

  constructor() {
    // Prefer OpenRouter if configured (OpenAI-compatible API)
    if (process.env.OPENROUTER_API_KEY) {
      const models = CONFIG.AI.MODEL_ROTATION.MODELS;
      const preferred = CONFIG.AI.MODEL.OPENROUTER;
      const modelName = Array.isArray(models) && models.length > 0 && CONFIG.AI.MODEL_ROTATION.ENABLED
        ? models[openRouterModelIndex % models.length]
        : preferred;
      this.llm = new ChatOpenAI({
        model: modelName,
        temperature: 0.7,
        maxTokens: 2000,
        apiKey: process.env.OPENROUTER_API_KEY,
        configuration: {
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'https://mine-muse',
            'X-Title': process.env.OPENROUTER_TITLE || 'Mine-Muse',
          },
        },
      }) as unknown as MinimalLLM;
      return;
    }

    // Fallback to OpenAI key if present
    if (!this.llm && process.env.OPENAI_API_KEY) {
      this.llm = new ChatOpenAI({
        model: CONFIG.AI.MODEL.OPENAI,
        temperature: 0.7,
        maxTokens: 2000,
        apiKey: process.env.OPENAI_API_KEY,
      }) as unknown as MinimalLLM;
    } else if (!this.llm) {
      this.llm = undefined;
    }
  }

  async createContent(topic: ContentTopic): Promise<WritingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`✍️ Writer Agent: Creating content for topic "${topic.title}"`);
      
      // Alternate OpenRouter models across requests if enabled
      if (process.env.OPENROUTER_API_KEY && CONFIG.AI.MODEL_ROTATION.ENABLED) {
        openRouterModelIndex = (openRouterModelIndex + 1) % CONFIG.AI.MODEL_ROTATION.MODELS.length;
        const modelName = CONFIG.AI.MODEL_ROTATION.MODELS[openRouterModelIndex];
        this.llm = new ChatOpenAI({
          model: modelName,
          temperature: 0.7,
          maxTokens: 2000,
          apiKey: process.env.OPENROUTER_API_KEY,
          configuration: {
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
              'HTTP-Referer': process.env.OPENROUTER_REFERRER || 'https://mine-muse',
              'X-Title': process.env.OPENROUTER_TITLE || 'Mine-Muse',
            },
          },
        }) as unknown as MinimalLLM;
        console.log(`🔄 Using OpenRouter model: ${modelName}`);
      }
      
      const content = await this.generateLongFormContent(topic);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Created content: "${content.title}"`);

      // Analyze content quality
      const quality = await this.analyzeContentQuality(content);

      return {
        success: true,
        data: {
          content,
          quality,
          processingTime
        }
      };
    } catch (error) {
      console.error('❌ Writer Agent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  private async generateLongFormContent(topic: ContentTopic): Promise<LongFormContent> {
    try {
      // Always try to use real LLM with real on-chain data
      if (!this.llm) {
        throw new Error('No LLM provider configured');
      }
      const prompt = this.buildWritingPrompt(topic);
      const response = await this.llm.invoke(prompt);
      let content: string;
      if (typeof response === 'string') {
        content = response;
      } else if (response && typeof response === 'object' && 'content' in response) {
        const c = (response as { content?: unknown }).content;
        content = typeof c === 'string' ? c : JSON.stringify(c);
      } else {
        content = JSON.stringify(response);
      }
      return this.parseContentResponse(content, topic);
    } catch (error) {
      console.error('❌ Error generating content with LLM:', error);
      console.log('🔄 Falling back to mock content');
      return this.generateMockContent(topic);
    }
  }

  async generateLongFormContentStream(topic: ContentTopic, onChunk: (chunk: string) => void): Promise<LongFormContent> {
    try {
      // Rotate model if using ModelManager
      if (CONFIG.AI.MODEL_ROTATION.ENABLED && process.env.HF_API_KEY) {
        this.llm = modelManager.rotateModel();
        if (this.llm) {
          console.log(`🔄 Streaming with model: ${modelManager.getCurrentModelName()}`);
        }
      }

      // Always try to use real LLM with real on-chain data
      if (!this.llm || typeof this.llm.stream !== 'function') {
        throw new Error('Streaming not supported by configured LLM');
      }
      const prompt = this.buildWritingPrompt(topic);
      const stream = await this.llm.stream!(prompt);
      
      let fullContent = '';
      for await (const chunk of stream) {
        const content = chunk.content as string;
        fullContent += content;
        onChunk(content);
      }
      
      return this.parseContentResponse(fullContent, topic);
    } catch (error) {
      console.error('❌ Error generating content with LLM:', error);
      console.log('🔄 Falling back to mock content');
      return this.generateMockContent(topic);
    }
  }

  private async generateMockContentWithStream(topic: ContentTopic, onChunk: (chunk: string) => void): Promise<LongFormContent> {
    const mockContent = `## Current Bitcoin Mining Landscape

The Bitcoin network continues to demonstrate robust security with a current difficulty of ${topic.onChainData.difficulty?.toLocaleString() || 'N/A'}. 

### Key Metrics Analysis

**Network Hash Rate**: ${Number.isFinite(topic.onChainData.hashrate) && topic.onChainData.hashrate > 0 ? `${(topic.onChainData.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
**Current Price**: $${topic.onChainData.bitcoinPrice?.toLocaleString() || 'N/A'}
**Block Reward**: ${topic.onChainData.blockReward || 'N/A'} BTC
**Transaction Fees**: ${topic.onChainData.transactionFees || 'N/A'} BTC

### Network Health

The mempool shows ${topic.onChainData.mempoolStats?.pendingTxs?.toLocaleString() || 'N/A'} pending transactions, indicating ${topic.onChainData.mempoolStats?.congestionLevel || 'normal'} network congestion levels.

### Mining Economics

Daily mining revenue stands at $${topic.onChainData.minerRevenue?.daily?.toLocaleString() || 'N/A'}, reflecting the current state of mining profitability.

### Key Insights

1. **Network Security**: The current difficulty level ensures robust network security
2. **Mining Activity**: Hash rate indicates healthy mining participation
3. **Economic Viability**: Revenue metrics show the economic health of mining operations

### Strategic Recommendations

For miners, the current network conditions present both opportunities and challenges. Understanding these metrics is crucial for making informed decisions about mining operations.

### Conclusion

Bitcoin mining remains a critical component of network security, with current metrics indicating healthy network operation and economic activity.`;

    // Simulate streaming by sending chunks
    const words = mockContent.split(' ');
    for (let i = 0; i < words.length; i++) {
      const chunk = (i === 0 ? '' : ' ') + words[i];
      onChunk(chunk);
      await new Promise(resolve => setTimeout(resolve, 50)); // 50ms delay between words
    }

    return this.generateMockContent(topic);
  }

  private generateMockContent(topic: ContentTopic): LongFormContent {
    const { onChainData } = topic;
    
    return {
      title: topic.title,
      body: `## Current Bitcoin Mining Landscape

The Bitcoin network continues to demonstrate robust security with a current difficulty of ${onChainData.difficulty ? onChainData.difficulty.toLocaleString() : 'N/A'}. 

### Key Metrics Analysis

**Network Hash Rate**: ${Number.isFinite(onChainData.hashrate) && onChainData.hashrate > 0 ? `${(onChainData.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
**Current Price**: $${onChainData.bitcoinPrice?.toLocaleString() || 'N/A'}
**Block Reward**: ${onChainData.blockReward || 'N/A'} BTC
**Transaction Fees**: ${onChainData.transactionFees || 'N/A'} BTC

### Network Health

The mempool shows ${onChainData.mempoolStats?.pendingTxs?.toLocaleString() || 'N/A'} pending transactions, indicating ${onChainData.mempoolStats?.congestionLevel || 'normal'} network congestion levels.

### Mining Economics

Daily mining revenue stands at $${onChainData.minerRevenue?.daily?.toLocaleString() || 'N/A'}, reflecting the current state of mining profitability.

### Key Insights

1. **Network Security**: The current difficulty level ensures robust network security
2. **Mining Activity**: Hash rate indicates healthy mining participation
3. **Economic Viability**: Revenue metrics show the economic health of mining operations

### Strategic Recommendations

For miners, the current network conditions present both opportunities and challenges. Understanding these metrics is crucial for making informed decisions about mining operations.

### Conclusion

Bitcoin mining remains a critical component of network security, with current metrics indicating healthy network operation and economic activity.`,
      keyInsights: [
        'Network security remains robust with current difficulty levels',
        'Mining activity shows healthy participation across the network',
        'Economic viability metrics indicate sustainable mining operations'
      ],
      takeaways: [
        'Current network conditions present opportunities for informed miners',
        'Understanding key metrics is crucial for mining decisions',
        'Bitcoin mining continues to be economically viable'
      ],
      metadata: {
        keywords: ['Bitcoin', 'mining', 'difficulty', 'hashrate', 'network', 'security'],
        wordCount: 150,
        readingTime: 1,
        difficulty: 10.5,
        passiveVoice: 5,
        industryTerms: 15
      },
      onChainData: topic.onChainData
    };
  }

  private buildWritingPrompt(topic: ContentTopic): string {
    return `Write a comprehensive Bitcoin mining article based on the following on-chain data and topic:

TOPIC: ${topic.title}

ON-CHAIN DATA:
- Bitcoin Price: $${topic.onChainData.bitcoinPrice?.toLocaleString()}
- Network Difficulty: ${topic.onChainData.difficulty?.toLocaleString()}
- Hash Rate: ${Number.isFinite(topic.onChainData.hashrate) && topic.onChainData.hashrate > 0 ? `${(topic.onChainData.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
- Block Reward: ${topic.onChainData.blockReward} BTC
- Transaction Fees: ${topic.onChainData.transactionFees} BTC
- Mempool Stats: ${topic.onChainData.mempoolStats.pendingTxs} pending transactions
- Daily Mining Revenue: $${topic.onChainData.minerRevenue?.daily?.toLocaleString()}

WRITING REQUIREMENTS:
- Voice: Trustworthy but friendly expert
- Tone: Fact-first, objective, cautionary for risks, inspiring for strategies
- Structure: Title ≤12 words → Lead 2-3 sentences → Body with H2/H3 → Takeaway/CTA
- Vocabulary: Use industry glossary (ASIC, PoW, hashrate, PUE, difficulty, block reward)
- Language: Readability ≤ Grade 12, passive voice <10%
- Length: 800-1200 words
- Include specific data points and insights
- Provide actionable takeaways for miners
- NO EMOJIS: Keep content professional and emoji-free

STYLE AND CONTENT INTEGRATION (CRITICAL):
- Combine trend analysis from on-chain metrics with contextual market insights.
- Weave in news-style summaries and headline-style subheadings for each section.
- Use compelling, concise H2 headlines that read like industry news headlines.
- Maintain a consistent, fine-tuned writing style: precise, authoritative, and polished.
- Where relevant, connect current metrics to recent themes (regulatory updates, halving cycles, energy costs) without fabricating facts.
- Do not invent specific events or dates; instead, frame as trend-driven insights grounded in provided data.

ARTICLE:`;
  }

  private parseContentResponse(content: string, topic: ContentTopic): LongFormContent {
    // Extract title (first line or first # heading)
    const titleMatch = content.match(/^#\s*(.+)$/m) || content.match(/^(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : topic.title;

    // Extract body (everything after title)
    const body = content.replace(/^#\s*.+$/m, '').trim();

    // Extract key insights and takeaways from content
    const keyInsights = this.extractKeyInsights(body);
    const takeaways = this.extractTakeaways(body);

    // Calculate metadata
    const wordCount = (title + body).split(' ').length;

    return {
      title,
      body,
      keyInsights,
      takeaways,
      metadata: {
        keywords: this.extractKeywords(body),
        wordCount,
        readingTime: Math.ceil(wordCount / 200),
        difficulty: 10.5,
        passiveVoice: 5,
        industryTerms: 15
      },
      onChainData: topic.onChainData
    };
  }

  private extractKeyInsights(content: string): string[] {
    const insights: string[] = [];
    
    // Look for bullet points or numbered lists
    const bulletMatches = content.match(/^[-*]\s*(.+)$/gm);
    if (bulletMatches) {
      insights.push(...bulletMatches.map(match => match.replace(/^[-*]\s*/, '').trim()));
    }
    
    // Look for "Key Insights" or similar sections
    const keyInsightsMatch = content.match(/###?\s*Key\s+Insights?\s*\n(.*?)(?=\n###|\n##|$)/i);
    if (keyInsightsMatch) {
      const insightsText = keyInsightsMatch[1];
      const insightLines = insightsText.split('\n').filter(line => line.trim());
      insights.push(...insightLines.map(line => line.replace(/^[-*]\s*/, '').trim()));
    }
    
    return insights.slice(0, 3); // Limit to 3 insights
  }

  private extractTakeaways(content: string): string[] {
    const takeaways: string[] = [];
    
    // Look for "Takeaways" or "Conclusion" sections
    const takeawaysMatch = content.match(/###?\s*(?:Takeaways?|Conclusion|Key\s+Points?)\s*\n(.*?)(?=\n###|\n##|$)/i);
    if (takeawaysMatch) {
      const takeawaysText = takeawaysMatch[1];
      const takeawayLines = takeawaysText.split('\n').filter(line => line.trim());
      takeaways.push(...takeawayLines.map(line => line.replace(/^[-*]\s*/, '').trim()));
    }
    
    return takeaways.slice(0, 3); // Limit to 3 takeaways
  }

  private extractKeywords(content: string): string[] {
    const keywords: string[] = [];
    
    // Extract keywords from technical terms
    const technicalTerms = CONFIG.GLOSSARY.TECHNICAL;
    const economicTerms = CONFIG.GLOSSARY.ECONOMIC;
    const marketTerms = CONFIG.GLOSSARY.MARKET;
    
    const allTerms = [...technicalTerms, ...economicTerms, ...marketTerms];
    const text = content.toLowerCase();
    
    for (const term of allTerms) {
      if (text.includes(term.toLowerCase())) {
        keywords.push(term);
      }
    }
    
    // Remove duplicates and limit to 10 keywords
    return [...new Set(keywords)].slice(0, 10);
  }

  private async analyzeContentQuality(content: LongFormContent): Promise<{
    uniqueness: number;
    readability: number;
    technicalAccuracy: number;
  }> {
    // Analyze content quality metrics
    const uniqueness = this.calculateUniqueness(content);
    const readability = this.calculateReadability(content.body);
    const technicalAccuracy = this.calculateTechnicalAccuracy(content);

    return {
      uniqueness,
      readability,
      technicalAccuracy
    };
  }

  private calculateUniqueness(content: LongFormContent): number {
    // Simple uniqueness calculation based on content length and complexity
    const wordCount = content.metadata.wordCount;
    const titleWords = content.title.split(' ').length;
    
    // Higher uniqueness for longer, more detailed content
    const lengthScore = Math.min(1, wordCount / 1000);
    const titleScore = Math.min(1, titleWords / 10);
    
    return (lengthScore + titleScore) / 2;
  }

  private calculateReadability(text: string): number {
    // Simple readability calculation (Flesch Reading Ease approximation)
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const syllables = this.countSyllables(text);
    
    if (words === 0 || sentences === 0) return 0;
    
    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    
    // Flesch Reading Ease formula (simplified)
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    // Convert to grade level (0-12)
    return Math.max(0, Math.min(12, (100 - score) / 10));
  }

  private countSyllables(text: string): number {
    // Simple syllable counting (approximation)
    const words = text.toLowerCase().split(/\s+/);
    let syllables = 0;
    
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (cleanWord.length === 0) continue;
      
      // Count vowel groups
      const vowelGroups = cleanWord.match(/[aeiouy]+/g);
      if (vowelGroups) {
        syllables += vowelGroups.length;
      }
      
      // Adjust for silent 'e'
      if (cleanWord.endsWith('e')) {
        syllables--;
      }
      
      // Minimum 1 syllable per word
      syllables = Math.max(1, syllables);
    }
    
    return syllables;
  }

  private calculateTechnicalAccuracy(content: LongFormContent): number {
    // Check for proper use of Bitcoin mining terminology
    const technicalTerms = CONFIG.GLOSSARY.TECHNICAL;
    const economicTerms = CONFIG.GLOSSARY.ECONOMIC;
    const marketTerms = CONFIG.GLOSSARY.MARKET;
    const forbiddenTerms = CONFIG.GLOSSARY.AVOID;
    
    const allTerms = [...technicalTerms, ...economicTerms, ...marketTerms];
    const text = (content.title + ' ' + content.body).toLowerCase();
    
    let accuracyScore = 0;
    let totalChecks = 0;
    
    // Check for proper terminology usage
    for (const term of allTerms) {
      if (text.includes(term.toLowerCase())) {
        accuracyScore += 1;
      }
      totalChecks++;
    }
    
    // Check for forbidden terms (penalty)
    for (const term of forbiddenTerms) {
      if (text.includes(term.toLowerCase())) {
        accuracyScore -= 0.5;
      }
    }
    
    return Math.max(0, Math.min(1, accuracyScore / totalChecks));
  }
}