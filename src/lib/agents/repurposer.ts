import { LongFormContent, PlatformContent, RepurposeResult } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { ClaudeClient } from '../llm/claude';
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
    // Prefer Claude if provided
    if (process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY) {
      const claudeKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
      const client = new ClaudeClient({ apiKey: claudeKey || undefined, model: CONFIG.AI.MODEL.CLAUDE });
      this.llm = { invoke: async (input: string) => client.generate(input, { maxTokens: 600, temperature: 0.7 }) };
      return;
    }

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
    const focusAreas = content.metadata.focusAreas.join(', ');
    
    // Create different content based on focus areas - NO HARDCODED NUMBERS
    let twitterContent = '';
    
    if (focusAreas.includes('heat') || focusAreas.includes('recycling')) {
      twitterContent = `Waste heat monetization is reshaping Bitcoin mining! Converting thermal energy into community heating solutions creates competitive advantages while reducing environmental impact. The future of mining lies in heat recovery. #BitcoinMining #HeatRecovery`;
    } else if (focusAreas.includes('renewable') || focusAreas.includes('sustainability')) {
      twitterContent = `Bitcoin mining's renewable energy transition accelerates as operators discover stranded energy opportunities. From hydroelectric dams to solar farms, miners are transforming energy infrastructure. #SustainableMining #RenewableEnergy`;
    } else if (focusAreas.includes('data') || focusAreas.includes('costs')) {
      twitterContent = `Data center optimization emerges as the new frontier in Bitcoin mining efficiency. Smart operators are discovering that infrastructure intelligence trumps raw computing power. #DataCenterOptimization #MiningEfficiency`;
    } else {
      twitterContent = `Bitcoin mining evolves beyond simple hash generation. Today's operators are building integrated energy systems that serve communities while securing the network. #BitcoinMining #Innovation`;
    }

    return {
      platform: 'twitter',
      content: twitterContent.trim(),
      hashtags: this.extractHashtags(twitterContent),
      characterCount: twitterContent.length,
      metadata: {
        hook: twitterContent.split('!')[0] + '!',
        cta: ''
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
    const focusAreas = content.metadata.focusAreas.join(', ');
    
    let linkedinContent = '';
    
    if (focusAreas.includes('heat') || focusAreas.includes('recycling')) {
      linkedinContent = `With ASIC efficiency gains plateauing, Bitcoin miners are discovering that profitability lies in better heat utilization. At Bitzero, we've positioned ourselves at the forefront of this transformation with our heat recycling program and are also committed to environmental sustainability practices in every aspect of our operation.

Our green data centers across Norway, Finland, and North Dakota are designed not just for sustainable mining but as contributors to other applications that benefit local communities. Operations that embrace thermal recovery today will have the competitive edge needed when the next market cycle tests the industry.

Explore our sustainable mining approach.`;
    } else if (focusAreas.includes('renewable') || focusAreas.includes('sustainability')) {
      linkedinContent = `Bitcoin mining's renewable energy transition represents more than environmental responsibility—it's becoming a competitive advantage. Leading operators are discovering that stranded energy assets offer unique opportunities for both profitability and community impact.

The integration of renewable energy sources with mining operations creates symbiotic relationships with local communities. From hydroelectric partnerships to solar farm collaborations, miners are transforming energy infrastructure while securing the Bitcoin network.

The future belongs to operators who understand that sustainable mining isn't just about reducing carbon footprints—it's about building resilient, community-integrated energy systems.`;
    } else if (focusAreas.includes('data') || focusAreas.includes('costs')) {
      linkedinContent = `Data center optimization emerges as the new frontier in Bitcoin mining efficiency. While ASIC performance improvements have plateaued, smart operators are discovering that infrastructure intelligence can deliver significant competitive advantages.

The shift from pure computing power to holistic efficiency represents a fundamental change in mining strategy. Operators with strong data center expertise are outperforming traditional players by optimizing everything from cooling systems to power distribution.

This evolution requires a new breed of mining professionals who understand both blockchain technology and data center operations. The winners will be those who can seamlessly integrate these disciplines.`;
    } else {
      linkedinContent = `Bitcoin mining evolves beyond simple hash generation. Today's operators are building integrated energy systems that serve communities while securing the network. This transformation requires a new approach to infrastructure, sustainability, and community engagement.

The future of Bitcoin mining lies in creating value beyond block rewards. From heat recovery programs to renewable energy partnerships, miners are discovering that their operations can benefit local communities while maintaining profitability.

Operations that embrace this integrated approach will have the competitive edge needed for long-term success in an increasingly sophisticated industry.`;
    }

    return {
      platform: 'linkedin',
      content: linkedinContent.trim(),
      characterCount: linkedinContent.length,
      metadata: {
        hook: linkedinContent.split('.')[0] + '.',
        cta: ''
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
    const focusAreas = content.metadata.focusAreas.join(', ');
    
    let instagramContent = '';
    
    if (focusAreas.includes('heat') || focusAreas.includes('recycling')) {
      instagramContent = `Bitcoin mining already transforms stranded energy into value; now, heat recovery takes it a step further. At Bitzero, our operational heat recycling program converts thermal energy into community heating solutions, monetizing what was once considered waste into applications like district heating for greenhouses, pools, food drying, and industrial processes.

A competitive advantage for miners, plus a positive environmental impact!`;
    } else if (focusAreas.includes('renewable') || focusAreas.includes('sustainability')) {
      instagramContent = `Bitcoin mining's renewable energy transition represents more than environmental responsibility—it's becoming a competitive advantage. Leading operators are discovering that stranded energy assets offer unique opportunities for both profitability and community impact.

The integration of renewable energy sources with mining operations creates symbiotic relationships with local communities. From hydroelectric partnerships to solar farm collaborations, miners are transforming energy infrastructure while securing the Bitcoin network.`;
    } else if (focusAreas.includes('data') || focusAreas.includes('costs')) {
      instagramContent = `Data center optimization emerges as the new frontier in Bitcoin mining efficiency. While ASIC performance improvements have plateaued, smart operators are discovering that infrastructure intelligence can deliver significant competitive advantages.

The shift from pure computing power to holistic efficiency represents a fundamental change in mining strategy. Operators with strong data center expertise are outperforming traditional players by optimizing everything from cooling systems to power distribution.`;
    } else {
      instagramContent = `Bitcoin mining evolves beyond simple hash generation. Today's operators are building integrated energy systems that serve communities while securing the network. This transformation requires a new approach to infrastructure, sustainability, and community engagement.

The future of Bitcoin mining lies in creating value beyond block rewards. From heat recovery programs to renewable energy partnerships, miners are discovering that their operations can benefit local communities while maintaining profitability.`;
    }

    return {
      platform: 'instagram',
      content: instagramContent.trim(),
      hashtags: this.extractHashtags(instagramContent),
      characterCount: instagramContent.length,
      metadata: {
        hook: instagramContent.split('.')[0] + '.',
        cta: ''
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
    const focusAreas = content.metadata.focusAreas.join(', ');
    
    let facebookContent = '';
    
    if (focusAreas.includes('heat') || focusAreas.includes('recycling')) {
      facebookContent = `Bitcoin mining already transforms stranded energy into value; now, heat recovery takes it a step further. At Bitzero, our operational heat recycling program converts thermal energy into community heating solutions, monetizing what was once considered waste into applications like district heating for greenhouses, pools, food drying, and industrial processes.

A competitive advantage for miners, plus a positive environmental impact!`;
    } else if (focusAreas.includes('renewable') || focusAreas.includes('sustainability')) {
      facebookContent = `Bitcoin mining's renewable energy transition represents more than environmental responsibility—it's becoming a competitive advantage. Leading operators are discovering that stranded energy assets offer unique opportunities for both profitability and community impact.

The integration of renewable energy sources with mining operations creates symbiotic relationships with local communities. From hydroelectric partnerships to solar farm collaborations, miners are transforming energy infrastructure while securing the Bitcoin network.`;
    } else if (focusAreas.includes('data') || focusAreas.includes('costs')) {
      facebookContent = `Data center optimization emerges as the new frontier in Bitcoin mining efficiency. While ASIC performance improvements have plateaued, smart operators are discovering that infrastructure intelligence can deliver significant competitive advantages.

The shift from pure computing power to holistic efficiency represents a fundamental change in mining strategy. Operators with strong data center expertise are outperforming traditional players by optimizing everything from cooling systems to power distribution.`;
    } else {
      facebookContent = `Bitcoin mining evolves beyond simple hash generation. Today's operators are building integrated energy systems that serve communities while securing the network. This transformation requires a new approach to infrastructure, sustainability, and community engagement.

The future of Bitcoin mining lies in creating value beyond block rewards. From heat recovery programs to renewable energy partnerships, miners are discovering that their operations can benefit local communities while maintaining profitability.`;
    }

    return {
      platform: 'facebook',
      content: facebookContent.trim(),
      hashtags: this.extractHashtags(facebookContent),
      characterCount: facebookContent.length,
      metadata: {
        hook: facebookContent.split('.')[0] + '.',
        cta: ''
      }
    };
  }

  private buildTwitterPrompt(content: LongFormContent): string {
    const { comprehensiveData } = content;
    
    return `Create a professional Twitter post (max 280 characters) for Bitcoin mining industry professionals.

ORIGINAL CONTENT:
Title: ${content.title}
Focus Areas: ${content.metadata.focusAreas.join(', ')}

COMPREHENSIVE DATA CONTEXT:
- Bitcoin Price: $${comprehensiveData.onChain.bitcoinPrice?.toLocaleString()}
- Hash Rate: ${Number.isFinite(comprehensiveData.onChain.hashrate) && comprehensiveData.onChain.hashrate > 0 ? `${(comprehensiveData.onChain.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
- Renewable Energy: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage}%
- PUE: ${comprehensiveData.sustainability.dataCenterMetrics.pue}
- Break-even: $${comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice.toLocaleString()}

STYLE REQUIREMENTS:
- Write like a senior industry analyst, not a marketing bot
- Use specific numbers and industry terminology naturally
- Professional, data-driven, engaging tone
- Include relevant hashtags (2-3 maximum)
- NO QUESTIONS OR CALL-TO-ACTION
- NO EMOJIS OR ICONS
- Focus on the main theme from focusAreas
- Tell a STORY, not just list numbers
- Be conversational and natural

EXAMPLE STYLE: "Waste heat monetization is reshaping Bitcoin mining, selling 3.5MW from heat recycling is enough energy to heat 5,000 homes! By 2027, capturing just 30% of waste heat could create a 2¢/kWh advantage, a significant figure for BTC miners."

IMPORTANT: Focus on the specific focus area (${content.metadata.focusAreas.join(', ')}) rather than generic Bitcoin metrics. Tell a compelling story about that specific aspect. Use numbers only when they support the narrative.

TWITTER POST (max 280 chars):`;
  }

  private buildLinkedInPrompt(content: LongFormContent): string {
    const { comprehensiveData } = content;
    
    return `Create a professional LinkedIn post (2-3 paragraphs) for Bitcoin mining industry professionals.

ORIGINAL CONTENT:
Title: ${content.title}
Focus Areas: ${content.metadata.focusAreas.join(', ')}

COMPREHENSIVE DATA CONTEXT:
- Bitcoin Price: $${comprehensiveData.onChain.bitcoinPrice?.toLocaleString()}
- Hash Rate: ${Number.isFinite(comprehensiveData.onChain.hashrate) && comprehensiveData.onChain.hashrate > 0 ? `${(comprehensiveData.onChain.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
- Renewable Energy: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage}%
- PUE: ${comprehensiveData.sustainability.dataCenterMetrics.pue}
- Break-even: $${comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice.toLocaleString()}

STYLE REQUIREMENTS:
- Write like a senior industry analyst, not a marketing bot
- Professional, analytical tone with specific data points
- Use industry terminology naturally
- Include specific company examples and case studies where relevant
- Focus on business implications and strategic insights
- NO QUESTIONS OR CALL-TO-ACTION
- NO EMOJIS OR ICONS
- Tell a STORY, not just list numbers
- Be conversational and natural

EXAMPLE STYLE: "With ASIC efficiency gains plateauing, Bitcoin miners are discovering that profitability lies in better heat utilization. At Bitzero, we've positioned ourselves at the forefront of this transformation with our heat recycling program and are also committed to environmental sustainability practices in every aspect of our operation."

IMPORTANT: Focus on the specific focus area (${content.metadata.focusAreas.join(', ')}) rather than generic Bitcoin metrics. Tell a compelling story about that specific aspect. Use numbers only when they support the narrative.

LINKEDIN POST:`;
  }

  private buildInstagramPrompt(content: LongFormContent): string {
    const { comprehensiveData } = content;
    
    return `Create a professional Instagram/Facebook post (2-3 paragraphs) for Bitcoin mining industry professionals.

ORIGINAL CONTENT:
Title: ${content.title}
Focus Areas: ${content.metadata.focusAreas.join(', ')}

COMPREHENSIVE DATA CONTEXT:
- Bitcoin Price: $${comprehensiveData.onChain.bitcoinPrice?.toLocaleString()}
- Hash Rate: ${Number.isFinite(comprehensiveData.onChain.hashrate) && comprehensiveData.onChain.hashrate > 0 ? `${(comprehensiveData.onChain.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
- Renewable Energy: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage}%
- PUE: ${comprehensiveData.sustainability.dataCenterMetrics.pue}
- Break-even: $${comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice.toLocaleString()}

STYLE REQUIREMENTS:
- Write like a senior industry analyst, not a marketing bot
- Professional, engaging tone with specific data points
- Use industry terminology naturally
- Include specific company examples and case studies where relevant
- Focus on practical applications and real-world impact
- NO QUESTIONS OR CALL-TO-ACTION
- NO EMOJIS OR ICONS
- Tell a STORY, not just list numbers
- Be conversational and natural

EXAMPLE STYLE: "Bitcoin mining already transforms stranded energy into value; now, heat recovery takes it a step further. At Bitzero, our operational heat recycling program converts thermal energy into community heating solutions, monetizing what was once considered waste into applications like district heating for greenhouses, pools, food drying, and industrial processes."

IMPORTANT: Focus on the specific focus area (${content.metadata.focusAreas.join(', ')}) rather than generic Bitcoin metrics. Tell a compelling story about that specific aspect. Use numbers only when they support the narrative.

INSTAGRAM/FACEBOOK POST:`;
  }

  private buildFacebookPrompt(content: LongFormContent): string {
    const { comprehensiveData } = content;
    
    return `Create a professional Facebook post (2-3 paragraphs) for Bitcoin mining industry professionals.

ORIGINAL CONTENT:
Title: ${content.title}
Focus Areas: ${content.metadata.focusAreas.join(', ')}

COMPREHENSIVE DATA CONTEXT:
- Bitcoin Price: $${comprehensiveData.onChain.bitcoinPrice?.toLocaleString()}
- Hash Rate: ${Number.isFinite(comprehensiveData.onChain.hashrate) && comprehensiveData.onChain.hashrate > 0 ? `${(comprehensiveData.onChain.hashrate / 1e18).toFixed(2)} EH/s` : 'N/A'}
- Renewable Energy: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage}%
- PUE: ${comprehensiveData.sustainability.dataCenterMetrics.pue}
- Break-even: $${comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice.toLocaleString()}

STYLE REQUIREMENTS:
- Write like a senior industry analyst, not a marketing bot
- Professional, engaging tone with specific data points
- Use industry terminology naturally
- Include specific company examples and case studies where relevant
- Focus on practical applications and real-world impact
- NO QUESTIONS OR CALL-TO-ACTION
- NO EMOJIS OR ICONS
- Tell a STORY, not just list numbers
- Be conversational and natural

EXAMPLE STYLE: "Bitcoin mining already transforms stranded energy into value; now, heat recovery takes it a step further. At Bitzero, our operational heat recycling program converts thermal energy into community heating solutions, monetizing what was once considered waste into applications like district heating for greenhouses, pools, food drying, and industrial processes."

IMPORTANT: Focus on the specific focus area (${content.metadata.focusAreas.join(', ')}) rather than generic Bitcoin metrics. Tell a compelling story about that specific aspect. Use numbers only when they support the narrative.

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