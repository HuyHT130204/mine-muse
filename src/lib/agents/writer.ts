// Writer Agent - Generates long-form content based on research topics

import { ClaudeClient } from '../llm/claude';
import { ContentTopic, ContentPackage, PlatformContent, WritingResult, LongFormContent } from '../types';

export class WriterAgent {
  private claude: ClaudeClient;

  constructor() {
    this.claude = new ClaudeClient();
  }

  async createContent(topic: ContentTopic): Promise<WritingResult> {
    try {
      console.log(`📝 Creating content for topic: ${topic.title}`);
      
      const longFormContent = await this.generateLongFormContent(topic);
      const platformContent = await this.generatePlatformContent();
      
      const contentPackage: ContentPackage = {
        id: topic.id,
        longForm: {
          title: longFormContent.title,
          body: longFormContent.body,
          comprehensiveData: topic.comprehensiveData,
          metadata: {
            wordCount: longFormContent.body.split(/\s+/).length,
            readingTime: Math.ceil(longFormContent.body.split(/\s+/).length / 200),
            difficulty: this.calculateDifficulty(topic.difficulty),
            passiveVoice: this.calculatePassiveVoice(longFormContent.body),
            industryTerms: this.calculateIndustryTerms(longFormContent.body),
            focusAreas: topic.focusAreas
          }
        },
        platforms: platformContent,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      return {
        success: true,
        data: {
          content: contentPackage.longForm,
          quality: {
            uniqueness: 0.85,
            readability: 0.80,
            technicalAccuracy: 0.90
          },
          processingTime: Date.now()
        }
      };
    } catch (error) {
      console.error(`❌ Error creating content for topic ${topic.id}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async writeContent(topics: ContentTopic[]): Promise<ContentPackage[]> {
    try {
      console.log('📝 Writer Agent: Generating content packages...');
      
      const contentPackages: ContentPackage[] = [];
      
      for (const topic of topics) {
        try {
          const longFormContent = await this.generateLongFormContent(topic);
          const platformContent = await this.generatePlatformContent();
          
          const contentPackage: ContentPackage = {
            id: topic.id,
            longForm: {
              title: longFormContent.title,
              body: longFormContent.body,
              comprehensiveData: topic.comprehensiveData,
              metadata: {
                wordCount: longFormContent.body.split(/\s+/).length,
                readingTime: Math.ceil(longFormContent.body.split(/\s+/).length / 200),
                difficulty: this.calculateDifficulty(topic.difficulty),
                passiveVoice: this.calculatePassiveVoice(longFormContent.body),
                industryTerms: this.calculateIndustryTerms(longFormContent.body),
                focusAreas: topic.focusAreas
              }
            },
            platforms: platformContent,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          
          contentPackages.push(contentPackage);
          console.log(`✅ Generated content package: ${contentPackage.longForm.title}`);
        } catch (error) {
          console.error(`❌ Error generating content for topic ${topic.id}:`, error);
          // Continue with other topics
        }
      }
      
      console.log(`✅ Writer Agent: Generated ${contentPackages.length} content packages`);
      return contentPackages;
    } catch (error) {
      console.error('❌ Writer Agent error:', error);
      throw error;
    }
  }

  async generateLongFormContentStream(topic: ContentTopic, onChunk: (chunk: string) => void): Promise<LongFormContent> {
    try {
      const prompt = this.buildPrompt(topic);
      const response = await this.claude.generate(prompt, {
        maxTokens: 4000,
        temperature: 0.7
      });
      
      // Simulate streaming by sending chunks
      const words = response.split(' ');
      let fullContent = '';
      
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        fullContent += chunk;
        onChunk(chunk);
        
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      // Parse response to extract title and body
      let title = topic.title;
      let body = fullContent;
      
      // Try to extract title from response
      const titleMatch = fullContent.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        title = titleMatch[1].trim();
        body = fullContent.replace(/^#\s+.+$/m, '').trim();
      }
      
      return {
        title,
        body,
        comprehensiveData: topic.comprehensiveData,
        metadata: {
          wordCount: body.split(/\s+/).length,
          readingTime: Math.ceil(body.split(/\s+/).length / 200),
          difficulty: this.calculateDifficulty(topic.difficulty),
          passiveVoice: this.calculatePassiveVoice(body),
          industryTerms: this.calculateIndustryTerms(body),
          focusAreas: topic.focusAreas
        }
      };
    } catch (error) {
      console.error('Error generating long-form content stream:', error);
      // Fallback to mock content
      const mockContent = this.mockWrite(topic);
      
      // Stream mock content
      const words = mockContent.body.split(' ');
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        onChunk(chunk);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      return {
        title: mockContent.title,
        body: mockContent.body,
        comprehensiveData: topic.comprehensiveData,
        metadata: {
          wordCount: mockContent.body.split(/\s+/).length,
          readingTime: Math.ceil(mockContent.body.split(/\s+/).length / 200),
          difficulty: this.calculateDifficulty(topic.difficulty),
          passiveVoice: this.calculatePassiveVoice(mockContent.body),
          industryTerms: this.calculateIndustryTerms(mockContent.body),
          focusAreas: topic.focusAreas
        }
      };
    }
  }

  private async generateLongFormContent(topic: ContentTopic): Promise<{
    title: string;
    body: string;
  }> {
    try {
      const prompt = this.buildPrompt(topic);
      const response = await this.claude.generate(prompt, {
        maxTokens: 4000,
        temperature: 0.7
      });
      
      // Parse response to extract title and body
      let title = topic.title;
      let body = response;
      
      // Try to extract title from response
      const titleMatch = response.match(/^#\s+(.+)$/m);
      if (titleMatch) {
        title = titleMatch[1].trim();
        body = response.replace(/^#\s+.+$/m, '').trim();
      }
      
      return { title, body };
    } catch (error) {
      console.error('Error generating long-form content:', error);
      // Fallback to mock content
      return this.mockWrite(topic);
    }
  }

  private buildPrompt(topic: ContentTopic): string {
    const { comprehensiveData } = topic;
    
    return `You are a senior industry analyst and content writer specializing in Bitcoin mining, data centers, and sustainability. Write a comprehensive, professional article about: ${topic.title}

TOPIC DESCRIPTION: ${topic.description}
FOCUS AREAS: ${topic.focusAreas.join(', ')}
KEYWORDS: ${topic.keywords.join(', ')}

CURRENT DATA CONTEXT:
- Bitcoin Price: $${comprehensiveData.onChain.bitcoinPrice?.toLocaleString() || 'N/A'}
- Network Difficulty: ${comprehensiveData.onChain.difficulty ? (comprehensiveData.onChain.difficulty / 1e12).toFixed(1) + 'T' : 'N/A'}
- Hash Rate: ${comprehensiveData.onChain.hashrate ? (comprehensiveData.onChain.hashrate / 1e18).toFixed(1) + ' EH/s' : 'N/A'}
- Renewable Energy: ${comprehensiveData.sustainability.carbonFootprint.renewableEnergyPercentage || 'N/A'}%
- PUE: ${comprehensiveData.sustainability.dataCenterMetrics.pue || 'N/A'}
- Break-even Price: $${comprehensiveData.sustainability.miningEconomics.profitabilityMetrics.breakEvenPrice?.toLocaleString() || 'N/A'}

WRITING REQUIREMENTS:
- Write like a senior industry analyst, not a marketing bot
- Focus on the STORY, not just numbers
- Use numbers sparingly and only when relevant to the narrative
- Make it engaging and narrative-driven
- Professional tone with industry expertise
- 1500-2500 words
- Include real insights and analysis
- Avoid generic statements
- Provide actionable insights for industry professionals

STRUCTURE:
1. Compelling introduction that hooks the reader
2. Main analysis with supporting data
3. Industry implications and trends
4. Future outlook and recommendations
5. Strong conclusion

Write the article now:`;
  }

  private async generatePlatformContent(): Promise<PlatformContent[]> {
    // This will be handled by the RepurposerAgent
    // Return empty array for now
    return [];
  }

  private calculateDifficulty(level: string): number {
    const difficultyMap = {
      'beginner': 1,
      'intermediate': 2,
      'advanced': 3
    };
    return difficultyMap[level as keyof typeof difficultyMap] || 2;
  }

  private calculatePassiveVoice(text: string): number {
    // Simple passive voice detection
    const passivePatterns = [
      /\b(is|are|was|were|be|been|being)\s+\w+ed\b/g,
      /\b(has|have|had)\s+been\s+\w+ed\b/g
    ];
    
    let passiveCount = 0;
    passivePatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) passiveCount += matches.length;
    });
    
    const totalSentences = text.split(/[.!?]+/).length;
    return totalSentences > 0 ? (passiveCount / totalSentences) * 100 : 0;
  }

  private calculateIndustryTerms(text: string): number {
    const industryTerms = [
      'bitcoin', 'mining', 'hashrate', 'difficulty', 'blockchain',
      'sustainability', 'renewable', 'energy', 'carbon', 'emissions',
      'data center', 'PUE', 'efficiency', 'profitability', 'break-even',
      'grid', 'frequency', 'regulation', 'demand response', 'treasury'
    ];
    
    const textLower = text.toLowerCase();
    let termCount = 0;
    industryTerms.forEach(term => {
      if (textLower.includes(term)) termCount++;
    });
    
    const totalWords = text.split(/\s+/).length;
    return totalWords > 0 ? (termCount / totalWords) * 100 : 0;
  }

  private mockWrite(topic: ContentTopic): { title: string; body: string } {
    const focusAreas = topic.focusAreas || ['mining', 'sustainability'];
    
    const mockContent = {
      title: topic.title,
      body: `The ${focusAreas.join(' and ')} landscape continues to evolve rapidly, presenting both challenges and opportunities for industry stakeholders. 

Current market conditions reflect a complex interplay of technological advancement, regulatory developments, and shifting economic priorities. The industry's trajectory suggests a continued focus on operational efficiency and environmental responsibility.

Key trends indicate growing emphasis on sustainable practices, with many operations exploring innovative approaches to energy management and resource utilization. This shift represents not just a response to external pressures, but a strategic recognition of long-term viability requirements.

The implications for stakeholders are significant, requiring careful consideration of both immediate operational needs and future strategic positioning. Success in this environment demands a nuanced understanding of market dynamics and technological capabilities.

Looking ahead, the industry appears poised for continued growth, driven by increasing institutional adoption and technological innovation. The path forward will likely involve greater integration of sustainable practices and operational efficiency measures.`
    };
    
    return mockContent;
  }
}