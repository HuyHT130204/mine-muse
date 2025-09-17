import { LongFormContent, PlatformContent, RepurposeResult } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { CONFIG } from '../config';
// modelManager no longer used

type MinimalLLM = {
  invoke: (input: string) => Promise<unknown>;
};

// Module-level index to alternate OpenRouter models between requests
let orModelIndex = 0;
export class RepurposerAgent {
  private llm: MinimalLLM | undefined;

  constructor() {
    // Prefer OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
      const models = CONFIG.AI.MODEL_ROTATION.MODELS;
      const preferred = CONFIG.AI.MODEL.OPENROUTER;
      const modelName = Array.isArray(models) && models.length > 0 && CONFIG.AI.MODEL_ROTATION.ENABLED
        ? models[orModelIndex % models.length]
        : preferred;
      this.llm = new ChatOpenAI({
        model: modelName,
        temperature: 0.8,
        maxTokens: 500,
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

    // Fallback to OpenAI
    if (!this.llm && process.env.OPENAI_API_KEY) {
      this.llm = new ChatOpenAI({
        model: CONFIG.AI.MODEL.OPENAI,
        temperature: 0.8,
        maxTokens: 500,
        apiKey: process.env.OPENAI_API_KEY,
      }) as unknown as MinimalLLM;
    } else if (!this.llm) {
      this.llm = undefined;
    }
  }

  async repurposeContent(content: LongFormContent): Promise<RepurposeResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Repurposer Agent: Converting content for 4 platforms');
      
      // Alternate OpenRouter models across requests if enabled
      if (process.env.OPENROUTER_API_KEY && CONFIG.AI.MODEL_ROTATION.ENABLED) {
        orModelIndex = (orModelIndex + 1) % CONFIG.AI.MODEL_ROTATION.MODELS.length;
        const modelName = CONFIG.AI.MODEL_ROTATION.MODELS[orModelIndex];
        this.llm = new ChatOpenAI({
          model: modelName,
          temperature: 0.8,
          maxTokens: 500,
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
      
      const platforms: PlatformContent[] = await Promise.all([
        this.createTwitterContent(content),
        this.createLinkedInContent(content),
        this.createInstagramContent(content),
        this.createFacebookContent(content)
      ]);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          platforms,
          processingTime
        }
      };
    } catch (error) {
      console.error('❌ Repurposer Agent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: undefined
      };
    }
  }

  private async createTwitterContent(content: LongFormContent): Promise<PlatformContent> {
    try {
      // Try to use real LLM first
      if (this.llm) {
        const prompt = this.buildTwitterPrompt(content);
        const response = await this.llm.invoke(prompt);
        const twitterContent = typeof response === 'string' ? response : (response && typeof response === 'object' && 'content' in response ? String((response as { content?: unknown }).content ?? '') : String(response ?? ''));
        
        // Validate Twitter character limit
        const trimmedContent = twitterContent.trim();
        if (trimmedContent.length > 280) {
          console.warn(`⚠️ Twitter post too long: ${trimmedContent.length} characters. Truncating...`);
          // Truncate and add ellipsis
          const truncated = trimmedContent.substring(0, 277) + '...';
          return {
            platform: 'twitter',
            content: truncated,
            characterCount: truncated.length,
            hashtags: this.extractHashtags(truncated),
            metadata: {
              hook: this.extractHook(truncated),
              cta: this.extractCTA(truncated)
            }
          };
        }

        return {
          platform: 'twitter',
          content: trimmedContent,
          characterCount: trimmedContent.length,
          hashtags: this.extractHashtags(trimmedContent),
          metadata: {
            hook: this.extractHook(trimmedContent),
            cta: this.extractCTA(trimmedContent)
          }
        };
      } else {
        // Fallback to mock content
        console.log('⚠️ No LLM provider configured, using mock Twitter content');
        return this.createMockTwitterContent(content);
      }
    } catch (error) {
      console.error('❌ Error generating Twitter content with LLM:', error);
      console.log('🔄 Falling back to mock Twitter content');
      return this.createMockTwitterContent(content);
    }
  }

  private createMockTwitterContent(content: LongFormContent): PlatformContent {
    const twitterContent = `Bitcoin mining difficulty hits ${content.onChainData.difficulty?.toLocaleString() || 'new high'}! 

Current price: $${content.onChainData.bitcoinPrice?.toLocaleString() || 'N/A'}
Hashrate: ${Number.isFinite(content.onChainData.hashrate) && content.onChainData.hashrate > 0 ? `${(content.onChainData.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}

What's your take on the current mining landscape? #BitcoinMining #HashRate`;

    return {
      platform: 'twitter',
      content: twitterContent.trim(),
      hashtags: ['#BitcoinMining', '#HashRate'],
      characterCount: twitterContent.length,
      metadata: {
        hook: 'Bitcoin mining difficulty hits new high!',
        cta: "What's your take on the current mining landscape?"
      }
    };
  }

  private async createLinkedInContent(content: LongFormContent): Promise<PlatformContent> {
    try {
      // Try to use real LLM first
      if (this.llm) {
        const prompt = this.buildLinkedInPrompt(content);
        const response = await this.llm.invoke(prompt);
        const linkedinContent = typeof response === 'string' ? response : (response && typeof response === 'object' && 'content' in response ? String((response as { content?: unknown }).content ?? '') : String(response ?? ''));
        
        return {
          platform: 'linkedin',
          content: linkedinContent.trim(),
          characterCount: linkedinContent.length,
          metadata: {
            hook: this.extractHook(linkedinContent),
            cta: this.extractCTA(linkedinContent)
          }
        };
      } else {
        // Fallback to mock content
        console.log('⚠️ No LLM provider configured, using mock LinkedIn content');
        return this.createMockLinkedInContent(content);
      }
    } catch (error) {
      console.error('❌ Error generating LinkedIn content with LLM:', error);
      console.log('🔄 Falling back to mock LinkedIn content');
      return this.createMockLinkedInContent(content);
    }
  }

  private createMockLinkedInContent(content: LongFormContent): PlatformContent {
    const linkedinContent = `Bitcoin Mining Network Analysis: Current State and Trends

The Bitcoin mining ecosystem continues to evolve with significant network metrics indicating robust security and economic activity.

Key Findings:
• Network Difficulty: ${content.onChainData.difficulty?.toLocaleString() || 'N/A'}
• Hash Rate: ${Number.isFinite(content.onChainData.hashrate) && content.onChainData.hashrate > 0 ? `${(content.onChainData.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
• Current Price: $${content.onChainData.bitcoinPrice?.toLocaleString() || 'N/A'}
• Daily Mining Revenue: $${content.onChainData.minerRevenue?.daily?.toLocaleString() || 'N/A'}

The network's security remains strong with consistent block production and healthy economic incentives for miners.

What are your thoughts on the current Bitcoin mining landscape? Share your insights below!`;

    return {
      platform: 'linkedin',
      content: linkedinContent.trim(),
      characterCount: linkedinContent.length,
      metadata: {
        hook: 'Bitcoin Mining Network Analysis: Current State and Trends',
        cta: 'What are your thoughts on the current Bitcoin mining landscape?'
      }
    };
  }

  private async createInstagramContent(content: LongFormContent): Promise<PlatformContent> {
    try {
      // Try to use real LLM first
      if (this.llm) {
        const prompt = this.buildInstagramPrompt(content);
        const response = await this.llm.invoke(prompt);
        const instagramContent = typeof response === 'string' ? response : (response && typeof response === 'object' && 'content' in response ? String((response as { content?: unknown }).content ?? '') : String(response ?? ''));
        
        return {
          platform: 'instagram',
          content: instagramContent.trim(),
          hashtags: this.extractHashtags(instagramContent),
          characterCount: instagramContent.length,
          metadata: {
            hook: this.extractHook(instagramContent),
            cta: this.extractCTA(instagramContent)
          }
        };
      } else {
        // Fallback to mock content
        console.log('⚠️ No LLM provider configured, using mock Instagram content');
        return this.createMockInstagramContent(content);
      }
    } catch (error) {
      console.error('❌ Error generating Instagram content with LLM:', error);
      console.log('🔄 Falling back to mock Instagram content');
      return this.createMockInstagramContent(content);
    }
  }

  private createMockInstagramContent(content: LongFormContent): PlatformContent {
    const instagramContent = `SLIDE 1: Bitcoin Mining Network Update

SLIDE 2: Current Metrics:
• Difficulty: ${content.onChainData.difficulty?.toLocaleString() || 'N/A'}
• Hash Rate: ${Number.isFinite(content.onChainData.hashrate) && content.onChainData.hashrate > 0 ? `${(content.onChainData.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
• Price: $${content.onChainData.bitcoinPrice?.toLocaleString() || 'N/A'}

SLIDE 3: The network remains secure with strong mining activity and healthy economic incentives for miners.

#BitcoinMining #HashRate #Bitcoin #Mining #Crypto #Blockchain #Network #Security #MiningPool #ASIC #PoW #Difficulty #BlockReward #MiningFarm #BitcoinNetwork #CryptoMining #MiningRig #BitcoinPrice #MiningRevenue #NetworkHealth #MiningEconomics #BitcoinSecurity #MiningStats #CryptoNetwork #MiningData #BitcoinAnalysis #MiningTrends #NetworkMetrics #MiningInsights #BitcoinMining`;

    return {
      platform: 'instagram',
      content: instagramContent.trim(),
      hashtags: ['#BitcoinMining', '#HashRate', '#Bitcoin', '#Mining', '#Crypto', '#Blockchain', '#Network', '#Security', '#MiningPool', '#ASIC', '#PoW', '#Difficulty', '#BlockReward', '#MiningFarm', '#BitcoinNetwork', '#CryptoMining', '#MiningRig', '#BitcoinPrice', '#MiningRevenue', '#NetworkHealth', '#MiningEconomics', '#BitcoinSecurity', '#MiningStats', '#CryptoNetwork', '#MiningData', '#BitcoinAnalysis', '#MiningTrends', '#NetworkMetrics', '#MiningInsights', '#BitcoinMining'],
      characterCount: instagramContent.length,
      metadata: {
        hook: 'Bitcoin Mining Network Update',
        cta: 'The network remains secure with strong mining activity'
      }
    };
  }

  private async createFacebookContent(content: LongFormContent): Promise<PlatformContent> {
    try {
      // Try to use real LLM first
      if (this.llm) {
        const prompt = this.buildFacebookPrompt(content);
        const response = await this.llm.invoke(prompt);
        const facebookContent = typeof response === 'string' ? response : (response && typeof response === 'object' && 'content' in response ? String((response as { content?: unknown }).content ?? '') : String(response ?? ''));
        
        return {
          platform: 'facebook',
          content: facebookContent.trim(),
          characterCount: facebookContent.length,
          metadata: {
            hook: this.extractHook(facebookContent),
            cta: this.extractCTA(facebookContent),
            engagement: this.extractEngagementPrompt(facebookContent)
          }
        };
      } else {
        // Fallback to mock content
        console.log('⚠️ No LLM provider configured, using mock Facebook content');
        return this.createMockFacebookContent(content);
      }
    } catch (error) {
      console.error('❌ Error generating Facebook content with LLM:', error);
      console.log('🔄 Falling back to mock Facebook content');
      return this.createMockFacebookContent(content);
    }
  }

  private createMockFacebookContent(content: LongFormContent): PlatformContent {
    const facebookContent = `Hey Bitcoin mining community!

Just checked the latest network stats and wanted to share some interesting insights with you all:

Current Bitcoin Mining Metrics:
• Network Difficulty: ${content.onChainData.difficulty?.toLocaleString() || 'N/A'}
• Hash Rate: ${Number.isFinite(content.onChainData.hashrate) && content.onChainData.hashrate > 0 ? `${(content.onChainData.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
• Bitcoin Price: $${content.onChainData.bitcoinPrice?.toLocaleString() || 'N/A'}
• Daily Mining Revenue: $${content.onChainData.minerRevenue?.daily?.toLocaleString() || 'N/A'}

The network continues to show strong security with consistent mining activity. It's fascinating to see how the ecosystem adapts to different market conditions.

What's your experience with mining lately? Are you seeing any interesting trends in your operations? Let's discuss!`;

    return {
      platform: 'facebook',
      content: facebookContent.trim(),
      characterCount: facebookContent.length,
      metadata: {
        hook: 'Hey Bitcoin mining community!',
        cta: "What's your experience with mining lately?",
        engagement: "Let's discuss!"
      }
    };
  }

  private buildTwitterPrompt(content: LongFormContent): string {
    return `Create a Twitter post from this Bitcoin mining content. MAXIMUM 250 characters (including spaces, punctuation, hashtags).

ORIGINAL CONTENT:
Title: ${content.title}
Body: ${content.body}

STRICT RULES:
- MAX 250 characters total (count every space, punctuation, hashtag)
- Start with hook, include 1 metric, end with question
- Use only 2-3 hashtags maximum
- NO EMOJIS
- Professional tone
- Example format: "Hook + metric + question #hashtag1 #hashtag2"

TWITTER POST (max 250 chars):`;
  }

  private buildLinkedInPrompt(content: LongFormContent): string {
    return `Convert this Bitcoin mining content into a LinkedIn post (2-3 paragraphs):

ORIGINAL CONTENT:
Title: ${content.title}
Body: ${content.body}

REQUIREMENTS:
- Professional, expert tone
- 2-3 paragraphs
- Include key insights and data
- End with a question for engagement
- Use industry terminology
- Make it thought-provoking
- NO EMOJIS: Keep content professional

LINKEDIN POST:`;
  }

  private buildInstagramPrompt(content: LongFormContent): string {
    return `Convert this Bitcoin mining content into an Instagram carousel post:

ORIGINAL CONTENT:
Title: ${content.title}
Body: ${content.body}

REQUIREMENTS:
- Format as SLIDE 1, SLIDE 2, SLIDE 3
- Visual-first approach
- Include key metrics and charts
- Professional language (NO EMOJIS)
- End with takeaway and CTA
- Include relevant hashtags
- Clean, professional presentation

INSTAGRAM CAROUSEL:`;
  }

  private buildFacebookPrompt(content: LongFormContent): string {
    return `Convert this Bitcoin mining content into a Facebook post:

ORIGINAL CONTENT:
Title: ${content.title}
Body: ${content.body}

REQUIREMENTS:
- Friendly, conversational tone
- Start with community greeting
- Include interesting insights
- Ask open questions for discussion
- Professional language (NO EMOJIS)
- Encourage comments and sharing
- Clean, engaging presentation

FACEBOOK POST:`;
  }

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#\w+/g;
    return content.match(hashtagRegex) || [];
  }

  private extractHook(content: string): string {
    const lines = content.split('\n');
    return lines[0] || content.substring(0, 50) + '...';
  }

  private extractCTA(content: string): string {
    const lines = content.split('\n');
    const lastLine = lines[lines.length - 1];
    
    // Look for question marks or CTA patterns
    if (lastLine.includes('?') || lastLine.includes('!')) {
      return lastLine;
    }
    
    return 'What are your thoughts?';
  }

  private extractEngagementPrompt(content: string): string {
    const cta = this.extractCTA(content);
    if (cta.includes('discuss') || cta.includes('share')) {
      return cta;
    }
    return "Let's discuss!";
  }
}