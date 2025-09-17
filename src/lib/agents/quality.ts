// Quality Agent - Validates content uniqueness and quality

import { QualityResult, LongFormContent } from '../types';
import { CONFIG } from '../config';

export class QualityAgent {
  private contentDatabase: Map<string, LongFormContent> = new Map();

  async validateContent(content: LongFormContent): Promise<QualityResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔍 Quality Agent: Validating content "${content.title}"`);
      
      // Check uniqueness against existing content
      const uniquenessCheck = await this.checkUniqueness(content);
      
      // Validate content quality metrics
      const qualityCheck = this.validateQualityMetrics(content);
      
      // Generate suggestions for improvement
      const suggestions = this.generateSuggestions(content, qualityCheck);
      
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        data: {
          isUnique: uniquenessCheck.isUnique,
          similarityScore: uniquenessCheck.similarityScore,
          qualityScore: qualityCheck.overallScore,
          suggestions
        },
        metadata: {
          processingTime,
          source: 'quality-agent'
        }
      };

    } catch (error) {
      console.error('❌ Quality Agent error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        metadata: {
          processingTime: Date.now() - startTime,
          source: 'quality-agent'
        }
      };
    }
  }

  private async checkUniqueness(content: LongFormContent): Promise<{
    isUnique: boolean;
    similarityScore: number;
  }> {
    // In a real implementation, this would use vector embeddings
    // to compare with existing content in the database
    
    const existingContent = Array.from(this.contentDatabase.values());
    let maxSimilarity = 0;
    
    for (const existing of existingContent) {
      const similarity = this.calculateSimilarity(content, existing);
      maxSimilarity = Math.max(maxSimilarity, similarity);
    }
    
    const isUnique = maxSimilarity < CONFIG.QUALITY.MAX_SIMILARITY;
    
    return {
      isUnique,
      similarityScore: maxSimilarity
    };
  }

  private calculateSimilarity(content1: LongFormContent, content2: LongFormContent): number {
    // Simplified similarity calculation using Jaccard similarity
    const text1 = (content1.title + ' ' + content1.body).toLowerCase();
    const text2 = (content2.title + ' ' + content2.body).toLowerCase();
    
    const words1 = new Set(text1.split(/\s+/));
    const words2 = new Set(text2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  private validateQualityMetrics(content: LongFormContent): {
    overallScore: number;
    readabilityScore: number;
    technicalAccuracyScore: number;
    uniquenessScore: number;
    structureScore: number;
  } {
    const readabilityScore = this.validateReadability(content);
    const technicalAccuracyScore = this.validateTechnicalAccuracy(content);
    const uniquenessScore = this.validateUniqueness(content);
    const structureScore = this.validateStructure(content);
    
    const overallScore = (
      readabilityScore * 0.25 +
      technicalAccuracyScore * 0.25 +
      uniquenessScore * 0.25 +
      structureScore * 0.25
    );
    
    return {
      overallScore,
      readabilityScore,
      technicalAccuracyScore,
      uniquenessScore,
      structureScore
    };
  }

  private validateReadability(content: LongFormContent): number {
    const readabilityScore = content.metadata.difficulty;
    const targetReadability = CONFIG.CONTENT.MAX_READABILITY_GRADE / 12; // Normalize to 0-1
    
    if (readabilityScore <= targetReadability) {
      return 1.0; // Perfect score
    } else {
      return Math.max(0, 1 - (readabilityScore - targetReadability) * 2);
    }
  }

  private validateTechnicalAccuracy(content: LongFormContent): number {
    const technicalTerms = CONFIG.GLOSSARY.TECHNICAL;
    const economicTerms = CONFIG.GLOSSARY.ECONOMIC;
    const marketTerms = CONFIG.GLOSSARY.MARKET;
    const forbiddenTerms = CONFIG.GLOSSARY.AVOID;
    
    const allTerms = [...technicalTerms, ...economicTerms, ...marketTerms];
    const text = (content.title + ' ' + content.body).toLowerCase();
    
    let score = 0;
    let totalChecks = 0;
    
    // Check for proper terminology usage
    for (const term of allTerms) {
      if (text.includes(term.toLowerCase())) {
        score += 1;
      }
      totalChecks += 1;
    }
    
    // Heavy penalty for forbidden terms
    for (const term of forbiddenTerms) {
      if (text.includes(term.toLowerCase())) {
        score -= 5; // Heavy penalty
      }
    }
    
    return Math.max(0, Math.min(1, score / totalChecks));
  }

  private validateUniqueness(content: LongFormContent): number {
    // This would typically use vector embeddings
    // For now, return a mock score based on content length and complexity
    const wordCount = content.metadata.wordCount;
    const keywordCount = content.metadata.keywords?.length || 0;
    
    // Higher uniqueness for longer, more detailed content
    const lengthScore = Math.min(1, wordCount / 1000);
    const keywordScore = Math.min(1, keywordCount / 10);
    
    return (lengthScore + keywordScore) / 2;
  }

  private validateStructure(content: LongFormContent): number {
    let score = 0;
    
    // Check for required sections
    if (content.title && content.title.length > 0) score += 0.2;
    if (content.body && content.body.length > 0) score += 0.2;
    if (content.takeaways && content.takeaways.length > 0) score += 0.2;
    if (content.keyInsights && content.keyInsights.length > 0) score += 0.2;
    
    // Check title length (≤12 words)
    const titleWords = content.title.split(' ').length;
    if (titleWords <= 12) score += 0.1;
    
    // Check for H2/H3 headings in body
    const hasHeadings = /^#{2,3}\s+/m.test(content.body);
    if (hasHeadings) score += 0.1;
    
    return Math.min(1, score);
  }

  private generateSuggestions(content: LongFormContent, qualityCheck: {
    readabilityScore: number;
    technicalAccuracyScore: number;
    structureScore: number;
  }): string[] {
    const suggestions: string[] = [];
    
    if (qualityCheck.readabilityScore < 0.7) {
      suggestions.push('Improve readability by using shorter sentences and simpler words');
    }
    
    if (qualityCheck.technicalAccuracyScore < 0.8) {
      suggestions.push('Use more Bitcoin mining terminology and avoid forbidden terms');
    }
    
    if (qualityCheck.structureScore < 0.8) {
      suggestions.push('Improve content structure with proper headings and sections');
    }
    
    if (content.metadata.passiveVoice > CONFIG.CONTENT.MAX_PASSIVE_VOICE) {
      suggestions.push('Reduce passive voice usage (currently ' + 
        (content.metadata.passiveVoice * 100).toFixed(1) + '%)');
    }
    
    if (content.metadata.wordCount < 800) {
      suggestions.push('Expand content to provide more detailed analysis');
    }
    
    if (content.metadata.wordCount > 1200) {
      suggestions.push('Consider condensing content for better readability');
    }
    
    return suggestions;
  }

  async storeContent(content: LongFormContent): Promise<void> {
    // Store content in the database for future uniqueness checks
    this.contentDatabase.set(content.title, content);
    
    // In a real implementation, this would store in a vector database
    // like Weaviate or Pinecone for efficient similarity search
  }

  async searchSimilarContent(content: LongFormContent, threshold: number = 0.3): Promise<LongFormContent[]> {
    const similar: LongFormContent[] = [];
    const existingContent = Array.from(this.contentDatabase.values());
    
    for (const existing of existingContent) {
      const similarity = this.calculateSimilarity(content, existing);
      if (similarity >= threshold) {
        similar.push(existing);
      }
    }
    
    return similar.sort((a, b) => 
      this.calculateSimilarity(content, b) - this.calculateSimilarity(content, a)
    );
  }
}
