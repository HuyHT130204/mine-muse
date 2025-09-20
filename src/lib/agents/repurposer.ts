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

  // CEO perspective format
  private async createCEOContent(content: LongFormContent): Promise<PlatformContent> {
    try {
      if (this.llm) {
        const prompt = this.buildCEOPrompt(content);
        const response = await this.llm.invoke(prompt);
        const ceoContent = typeof response === 'string' ? response : (response && typeof response === 'object' && 'content' in response ? String((response as { content?: unknown }).content ?? '') : String(response ?? ''));
        return {
          platform: 'ceo',
          content: ceoContent.trim(),
          characterCount: ceoContent.length,
          metadata: {
            hook: this.extractHook(ceoContent),
            cta: ''
          }
        };
      }
      // Fallback mock
      const fallback = `ASIC efficiency gains are plateauing, forcing us to shift value creation toward waste heat utilization, data center optimization, and flexible energy contracts. This isn't marketing speak—it's P&L and operations. Teams that bridge energy engineering and digital infrastructure will have the advantage next cycle.`;
      return { platform: 'ceo', content: fallback, characterCount: fallback.length, metadata: { hook: fallback.split('.')[0] + '.', cta: '' } };
    } catch {
      const fallback = `ASIC efficiency gains are plateauing, forcing us to shift value creation toward waste heat utilization, data center optimization, and flexible energy contracts.`;
      return { platform: 'ceo', content: fallback, characterCount: fallback.length, metadata: { hook: fallback.split('.')[0] + '.', cta: '' } };
    }
  }

  async repurposeContent(content: LongFormContent): Promise<RepurposeResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Repurposer Agent: Converting content for 4 formats (twitter, linkedin, social, ceo)');
      
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
        this.createSocialContent(content),
        this.createCEOContent(content)
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
      twitterContent = `Waste heat monetization is reshaping Bitcoin mining. Converting thermal energy into useful applications creates competitive advantages while reducing environmental impact. The future of mining increasingly involves heat recovery. #BitcoinMining #HeatRecovery`;
    } else if (focusAreas.includes('renewable') || focusAreas.includes('sustainability')) {
      twitterContent = `Bitcoin mining's renewable energy transition continues as operators align with grid realities and stranded energy opportunities. #SustainableMining #RenewableEnergy`;
    } else if (focusAreas.includes('data') || focusAreas.includes('costs')) {
      twitterContent = `Data center optimization is emerging as the new frontier in mining efficiency. Infrastructure intelligence now matters as much as raw compute. #DataCenterOptimization #MiningEfficiency`;
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
      linkedinContent = `With ASIC efficiency gains plateauing, miners are discovering that profitability increasingly depends on better heat utilization. Heat recycling and integration with nearby district heating can create new revenue streams while improving environmental performance.`;
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

  // Merged Instagram/Facebook -> Social
  private async createSocialContent(content: LongFormContent): Promise<PlatformContent> {
    try {
      // Try to use real LLM first
      if (this.llm) {
        const prompt = this.buildSocialPrompt(content);
        const response = await this.llm.invoke(prompt);
        const socialContent = typeof response === 'string' ? response : (response && typeof response === 'object' && 'content' in response ? String((response as { content?: unknown }).content ?? '') : String(response ?? ''));
        
        return {
          platform: 'social',
          content: socialContent.trim(),
          hashtags: this.extractHashtags(socialContent),
          characterCount: socialContent.length,
          metadata: {
            hook: this.extractHook(socialContent),
            cta: this.extractCTA(socialContent)
          }
        };
      } else {
        // Fallback to mock content
        console.log('⚠️ No LLM provider configured, using mock Social content');
        return this.createMockSocialContent(content);
      }
    } catch (error) {
      console.error('❌ Error generating Social content with LLM:', error);
      console.log('🔄 Falling back to mock Social content');
      return this.createMockSocialContent(content);
    }
  }

  private createMockSocialContent(content: LongFormContent): PlatformContent {
    const focusAreas = content.metadata.focusAreas.join(', ');
    
    let socialContent = '';
    
    if (focusAreas.includes('heat') || focusAreas.includes('recycling')) {
      socialContent = `Bitcoin mining's evolution from simple hash generation to integrated energy systems represents a fundamental shift in how we think about digital infrastructure. The industry's transition toward waste heat utilization isn't merely environmental posturing—it's becoming a core competitive advantage that separates profitable operations from marginal ones.

The technical mechanics of heat recovery in mining operations reveal sophisticated engineering challenges. Converting ASIC-generated thermal energy into useful applications requires precise temperature management, efficient heat exchangers, and strategic partnerships with local energy consumers. This isn't simple waste disposal; it's creating new revenue streams while improving overall system efficiency.

From an operational standpoint, successful heat recovery programs demonstrate how mining facilities can evolve into community energy assets. District heating systems, greenhouse operations, and industrial processes benefit from consistent, reliable thermal energy that would otherwise be wasted. The economic implications extend beyond direct revenue—these programs often improve community relations and regulatory standing.

The strategic implications for mining operators are profound. As ASIC efficiency gains plateau, competitive advantages increasingly come from operational intelligence rather than raw computing power. Operators who master energy integration, waste utilization, and community engagement will have sustainable advantages in an increasingly sophisticated market.

Looking forward, the convergence of mining operations with broader energy infrastructure suggests a new paradigm for digital asset production. The most successful operations will likely be those that function as integrated energy systems rather than isolated computing facilities, creating value through multiple revenue streams while maintaining their core Bitcoin production function.`;
    } else if (focusAreas.includes('renewable') || focusAreas.includes('sustainability')) {
      socialContent = `The renewable energy transition in Bitcoin mining represents more than environmental responsibility—it's becoming a fundamental competitive advantage that's reshaping the entire industry landscape. This shift isn't driven solely by regulatory pressure or public relations concerns; it's emerging from pure economic logic and operational necessity.

The technical integration of renewable energy sources with mining operations reveals complex engineering and economic challenges. Solar and wind installations require sophisticated energy storage systems, grid integration protocols, and flexible load management strategies. The most successful renewable mining operations aren't simply buying green energy credits—they're building integrated energy systems that optimize both Bitcoin production and grid stability.

From a strategic perspective, renewable energy adoption in mining creates multiple competitive moats. Operators with renewable assets gain predictable energy costs, improved regulatory standing, and enhanced community relations. These advantages compound over time, creating sustainable competitive positions that are difficult for traditional operators to replicate.

The economic implications extend far beyond direct energy cost savings. Renewable mining operations often qualify for government incentives, carbon credit programs, and preferential grid access. These additional revenue streams can significantly improve overall profitability while reducing regulatory risk exposure.

The future of Bitcoin mining will likely be dominated by operators who understand that energy infrastructure is as important as computing infrastructure. The most successful operations will be those that function as integrated energy systems, creating value through multiple revenue streams while maintaining their core Bitcoin production function.`;
    } else if (focusAreas.includes('data') || focusAreas.includes('costs')) {
      socialContent = `Data center optimization is emerging as the new frontier in Bitcoin mining efficiency, representing a fundamental shift from pure computing power to holistic operational intelligence. While ASIC performance improvements have plateaued at single-digit annual gains, infrastructure optimization continues to deliver significant competitive advantages.

The technical aspects of data center optimization in mining operations encompass everything from cooling system efficiency to power distribution management. Advanced monitoring systems, predictive maintenance protocols, and intelligent load balancing create operational advantages that compound over time. This isn't just about reducing costs—it's about creating more reliable, efficient, and profitable operations.

From an economic standpoint, data center optimization creates multiple value streams beyond simple cost reduction. Improved efficiency reduces energy consumption, extends equipment lifespan, and enables more flexible operational strategies. These advantages become particularly important during market volatility when operational flexibility can mean the difference between profitability and losses.

The strategic implications for mining operators are significant. As the industry matures, competitive advantages increasingly come from operational excellence rather than access to cheap hardware. Operators who master data center optimization, energy management, and infrastructure intelligence will have sustainable advantages in an increasingly sophisticated market.

Looking forward, the convergence of data center technology with Bitcoin mining suggests a new paradigm for digital infrastructure. The most successful operations will likely be those that function as integrated computing and energy systems, creating value through multiple revenue streams while maintaining their core Bitcoin production function.`;
    } else {
      socialContent = `Bitcoin mining is evolving beyond simple hash generation into a sophisticated industry that integrates computing, energy, and community infrastructure. This transformation represents more than technological advancement—it's a fundamental reimagining of how digital assets are produced and how value is created in the digital economy.

The technical evolution of mining operations reveals increasingly complex systems that require expertise across multiple disciplines. From ASIC optimization to energy management, from data center design to community engagement, successful mining operations now demand integrated approaches that go far beyond basic computing power.

From an operational perspective, modern mining facilities function as integrated energy systems that serve multiple purposes. They provide computing power for Bitcoin production, energy services for local communities, and grid stability services for regional power systems. This multi-purpose approach creates value through multiple revenue streams while improving overall system efficiency.

The strategic implications for the industry are profound. As Bitcoin mining matures, competitive advantages increasingly come from operational intelligence, energy integration, and community engagement rather than simple access to cheap electricity or hardware. The most successful operators will be those who understand that mining is fundamentally about energy transformation and value creation.

The future of Bitcoin mining will likely be dominated by operators who recognize that their facilities are not just computing centers, but integrated energy and community infrastructure. The most successful operations will be those that create value through multiple revenue streams while maintaining their core Bitcoin production function, representing a new paradigm for digital asset production.`;
    }

    return {
      platform: 'social',
      content: socialContent.trim(),
      hashtags: this.extractHashtags(socialContent),
      characterCount: socialContent.length,
      metadata: {
        hook: socialContent.split('.')[0] + '.',
        cta: ''
      }
    };
  }

  private buildTwitterPrompt(content: LongFormContent): string {
    const { comprehensiveData } = content;
    
    return `Create a professional Twitter post (max 280 characters) for Bitcoin mining industry professionals.

STRICT FACTUALITY:
- Do not invent company names, projects, programs, or datasets.
- If mentioning organizations, use only those present in the provided sources or content body.
- No emojis, no questions, no direct CTAs.

HUMAN STYLE (avoid robotic tone):
- Use natural cadence: mix short punchy sentences with longer lines.
- Prefer concrete verbs and nouns over buzzwords; avoid boilerplate phrases.
- No template openings like "In conclusion", "Overall", "As we know".
- Keep it crisp and narrative-first; one core idea, one strong line.

ORIGINAL CONTENT:
Title: ${content.title}
Focus Areas: ${content.metadata.focusAreas.join(', ')}

FILTERED DATA CONTEXT (use only if present and non-zero):
${Number.isFinite(comprehensiveData.onChain.bitcoinPrice) && comprehensiveData.onChain.bitcoinPrice > 0 ? `- Bitcoin Price: $${comprehensiveData.onChain.bitcoinPrice.toLocaleString()}` : ''}
${Number.isFinite(comprehensiveData.onChain.hashrate) && comprehensiveData.onChain.hashrate > 0 ? `- Hash Rate: ${ (comprehensiveData.onChain.hashrate / 1e18).toFixed(2)} EH/s` : ''}
${Number.isFinite(comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage) && comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage > 0 ? `- Renewable Energy: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage}%` : ''}
${Number.isFinite(comprehensiveData.sustainability.dataCenterMetrics.pue) && comprehensiveData.sustainability.dataCenterMetrics.pue > 0 ? `- PUE: ${comprehensiveData.sustainability.dataCenterMetrics.pue}` : ''}
${Number.isFinite(comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice) && comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice > 0 ? `- Break-even: $${comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice.toLocaleString()}` : ''}

STYLE REQUIREMENTS:
- Write like a senior industry analyst, not a marketing bot
- Use numbers sparingly and only when clearly supported by source context
- Professional, data-driven, engaging tone
- Include relevant hashtags (2-3 maximum)
- NO QUESTIONS OR CALL-TO-ACTION
- NO EMOJIS OR ICONS
- Focus on the main theme from focusAreas
- Tell a STORY, not just list numbers
- Be conversational and natural

EXAMPLE STYLE: "Waste heat monetization is reshaping Bitcoin mining, selling 3.5MW from heat recycling is enough energy to heat 5,000 homes! By 2027, capturing just 30% of waste heat could create a 2¢/kWh advantage, a significant figure for BTC miners."

IMPORTANT: Focus on the specific focus area (${content.metadata.focusAreas.join(', ')}) rather than generic Bitcoin metrics. Use cautious phrasing if data is not explicitly sourced in the long-form body.

TWITTER POST (max 280 chars):`;
  }

  private buildLinkedInPrompt(content: LongFormContent): string {
    const { comprehensiveData } = content;
    
    return `Create a professional LinkedIn post (2-3 paragraphs) for Bitcoin mining industry professionals.

ORIGINAL CONTENT:
Title: ${content.title}
Focus Areas: ${content.metadata.focusAreas.join(', ')}

FILTERED DATA CONTEXT (use only if present and non-zero):
${Number.isFinite(comprehensiveData.onChain.bitcoinPrice) && comprehensiveData.onChain.bitcoinPrice > 0 ? `- Bitcoin Price: $${comprehensiveData.onChain.bitcoinPrice.toLocaleString()}` : ''}
${Number.isFinite(comprehensiveData.onChain.hashrate) && comprehensiveData.onChain.hashrate > 0 ? `- Hash Rate: ${ (comprehensiveData.onChain.hashrate / 1e18).toFixed(2)} EH/s` : ''}
${Number.isFinite(comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage) && comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage > 0 ? `- Renewable Energy: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage}%` : ''}
${Number.isFinite(comprehensiveData.sustainability.dataCenterMetrics.pue) && comprehensiveData.sustainability.dataCenterMetrics.pue > 0 ? `- PUE: ${comprehensiveData.sustainability.dataCenterMetrics.pue}` : ''}
${Number.isFinite(comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice) && comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice > 0 ? `- Break-even: $${comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice.toLocaleString()}` : ''}

HUMAN STYLE (avoid robotic tone):
- Natural cadence; vary sentence length and rhythm.
- Lead with a concrete observation; avoid generic setup sentences.
- Use specific, experiential language; avoid buzzwords and cliches.
- Prefer paragraphs to long bullet lists (max one short list if needed).

STYLE REQUIREMENTS:
- Write like a senior industry analyst, not a marketing bot
- Professional, analytical tone with specific data points
- Use industry terminology naturally
- Avoid naming specific companies unless present in the long-form body or validated sources
- Focus on business implications and strategic insights
- NO QUESTIONS OR CALL-TO-ACTION
- NO EMOJIS OR ICONS
- Tell a STORY, not just list numbers
- Be conversational and natural

EXAMPLE STYLE: "With ASIC efficiency gains plateauing, Bitcoin miners are discovering that profitability lies in better heat utilization. At Bitzero, we've positioned ourselves at the forefront of this transformation with our heat recycling program and are also committed to environmental sustainability practices in every aspect of our operation."

STRICT FACTUALITY:
- Do not invent company names, programs, or metrics.
- If a claim requires attribution, phrase cautiously ("operators report", "industry data indicates") unless a specific source from the long-form body is clearly provided.

LINKEDIN POST:`;
  }

  private buildSocialPrompt(content: LongFormContent): string {
    const { comprehensiveData } = content;
    
    return `Create a comprehensive Instagram/Facebook post (single text works on both). Professional, analytical, and thorough. No emojis. No questions. No CTAs.

ORIGINAL CONTENT:
Title: ${content.title}
Focus Areas: ${content.metadata.focusAreas.join(', ')}

FILTERED DATA CONTEXT (use only if present and non-zero):
${Number.isFinite(comprehensiveData.onChain.bitcoinPrice) && comprehensiveData.onChain.bitcoinPrice > 0 ? `- Bitcoin Price: $${comprehensiveData.onChain.bitcoinPrice.toLocaleString()}` : ''}
${Number.isFinite(comprehensiveData.onChain.hashrate) && comprehensiveData.onChain.hashrate > 0 ? `- Hash Rate: ${ (comprehensiveData.onChain.hashrate / 1e18).toFixed(2)} EH/s` : ''}
${Number.isFinite(comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage) && comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage > 0 ? `- Renewable Energy: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage}%` : ''}
${Number.isFinite(comprehensiveData.sustainability.dataCenterMetrics.pue) && comprehensiveData.sustainability.dataCenterMetrics.pue > 0 ? `- PUE: ${comprehensiveData.sustainability.dataCenterMetrics.pue}` : ''}
${Number.isFinite(comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice) && comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice > 0 ? `- Break-even: $${comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice.toLocaleString()}` : ''}

WRITING REQUIREMENTS:
- Write like a senior industry analyst, not a marketing bot
- Professional, analytical tone with comprehensive analysis
- Use industry terminology naturally and precisely
- Avoid naming specific companies unless present in the long-form body or validated sources
- Focus on practical applications, real-world impact, and strategic implications
- NO QUESTIONS OR CALL-TO-ACTION
- NO EMOJIS OR ICONS
- Tell a compelling STORY with logical progression
- Be conversational yet authoritative

CONTENT STRUCTURE (4-6 paragraphs):
1. **Opening Hook**: Start with a compelling observation or trend
2. **Context & Analysis**: Provide detailed background and current state
3. **Technical Deep Dive**: Explain the mechanics, processes, or systems involved
4. **Strategic Implications**: Discuss what this means for the industry
5. **Future Outlook**: Project forward-looking insights and trends
6. **Conclusion**: Synthesize key points with actionable insights

HUMAN STYLE (avoid robotic tone):
- Use natural, flowing cadence with varied sentence lengths
- Prefer concrete examples and operational details over abstract concepts
- Build logical arguments with clear cause-and-effect relationships
- Avoid marketing cliches and generic transitions
- Use specific, experiential language that demonstrates expertise
- Create narrative flow that guides readers through complex concepts

EXAMPLE STYLE: "Bitcoin mining's evolution from simple hash generation to integrated energy systems represents a fundamental shift in how we think about digital infrastructure. The industry's transition toward waste heat utilization isn't merely environmental posturing—it's becoming a core competitive advantage that separates profitable operations from marginal ones.

The technical mechanics of heat recovery in mining operations reveal sophisticated engineering challenges. Converting ASIC-generated thermal energy into useful applications requires precise temperature management, efficient heat exchangers, and strategic partnerships with local energy consumers. This isn't simple waste disposal; it's creating new revenue streams while improving overall system efficiency.

From an operational standpoint, successful heat recovery programs demonstrate how mining facilities can evolve into community energy assets. District heating systems, greenhouse operations, and industrial processes benefit from consistent, reliable thermal energy that would otherwise be wasted. The economic implications extend beyond direct revenue—these programs often improve community relations and regulatory standing.

The strategic implications for mining operators are profound. As ASIC efficiency gains plateau, competitive advantages increasingly come from operational intelligence rather than raw computing power. Operators who master energy integration, waste utilization, and community engagement will have sustainable advantages in an increasingly sophisticated market.

Looking forward, the convergence of mining operations with broader energy infrastructure suggests a new paradigm for digital asset production. The most successful operations will likely be those that function as integrated energy systems rather than isolated computing facilities, creating value through multiple revenue streams while maintaining their core Bitcoin production function."

STRICT FACTUALITY:
- Do not invent company names or specific metrics
- Use cautious language where precision is uncertain
- Ground all claims in the provided context or general industry knowledge
- If referencing specific data, ensure it's clearly sourced

SOCIAL POST:`;
  }

  private buildCEOPrompt(content: LongFormContent): string {
    const { comprehensiveData } = content;
    return `Write a first-person CEO perspective post. Speaker is a data center company CEO. Professional, reflective, operationally grounded. No emojis, no questions, no CTAs.
    
STRICT FACTUALITY:
- Do not invent company names or proprietary programs.
- Do not claim specific locations or assets unless present in the original body.
- Use "we" only to refer to general operator practices, not a specific company unless provided.

ORIGINAL CONTENT SUMMARY:
Title: ${content.title}
Key Focus: ${content.metadata.focusAreas.join(', ')}

DATA CONTEXT (optional to reference cautiously):
- Hashrate: ${Number.isFinite(comprehensiveData.onChain.hashrate) && comprehensiveData.onChain.hashrate > 0 ? `${(comprehensiveData.onChain.hashrate / 1e18).toFixed(0)} EH/s` : 'N/A'}
- Renewable share: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage || 'N/A'}%
- PUE context: ${comprehensiveData.sustainability.dataCenterMetrics.pue || 'N/A'}

STYLE REQUIREMENTS:
- AVOID generic openings like "As a CEO", "In my experience", "Having worked in this industry"
- Start with a specific observation, trend, or operational insight
- Use natural, conversational tone - like talking to a peer
- Share concrete operational details and strategic thinking
- Vary sentence structure and length
- Be direct and authentic, not corporate-speak
- Focus on what's actually changing in operations and why it matters

EXAMPLE GOOD OPENINGS:
- "The numbers don't lie: ASIC efficiency gains are plateauing at single-digit percentages annually."
- "Heat recovery isn't just environmental PR anymore—it's becoming a core revenue stream."
- "We're seeing a fundamental shift in how miners think about infrastructure ROI."

EXAMPLE BAD OPENINGS (AVOID):
- "As a CEO with years of experience in the industry..."
- "In my professional opinion as a data center executive..."
- "Having worked in this field for many years..."

Write naturally, as if you're sharing insights with a colleague over coffee.
`;
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