// Main pipeline orchestrator for Bitcoin mining content generation

import { ResearcherAgent } from './agents/researcher';
import { WriterAgent } from './agents/writer';
import { QualityAgent } from './agents/quality';
import { RepurposerAgent } from './agents/repurposer';
import { PublisherAgent } from './agents/publisher';
import { ContentPackage, WritingResult, QualityResult, RepurposeResult } from './types';

export class ContentPipeline {
  private researcher: ResearcherAgent;
  private writer: WriterAgent;
  private quality: QualityAgent;
  private repurposer: RepurposerAgent;
  private publisher: PublisherAgent;

  constructor() {
    this.researcher = new ResearcherAgent();
    this.writer = new WriterAgent();
    this.quality = new QualityAgent();
    this.repurposer = new RepurposerAgent();
    this.publisher = new PublisherAgent();
  }

  async generateContent(): Promise<{
    success: boolean;
    contentPackages: ContentPackage[];
    errors: string[];
    metadata: {
      totalProcessingTime: number;
      topicsGenerated: number;
      contentCreated: number;
      platformsGenerated: number;
    };
  }> {
    const startTime = Date.now();
    const contentPackages: ContentPackage[] = [];
    const errors: string[] = [];

    try {
      console.log('🚀 Starting Bitcoin mining content generation pipeline...');

      // Step 1: Research on-chain data and generate topics
      console.log('📊 Step 1: Researching on-chain data...');
      const researchResult = await this.researcher.research();
      
      if (!researchResult.success) {
        throw new Error(`Research failed: ${researchResult.error}`);
      }

      const { topics } = researchResult.data!;
      console.log(`✅ Generated ${topics.length} topics from on-chain data`);

      // Step 2: Generate long-form content for each topic
      console.log('✍️ Step 2: Generating long-form content...');
      const writingResults: WritingResult[] = [];

      for (const topic of topics) {
        try {
          const writingResult = await this.writer.createContent(topic);
          if (writingResult.success) {
            writingResults.push(writingResult);
            console.log(`✅ Created content: "${writingResult.data!.content.title}"`);
          } else {
            errors.push(`Writing failed for topic "${topic.title}": ${writingResult.error}`);
          }
        } catch (error) {
          errors.push(`Writing error for topic "${topic.title}": ${error}`);
        }
      }

      // Step 3: Quality validation
      console.log('🔍 Step 3: Validating content quality...');
      const qualityResults: QualityResult[] = [];

      for (const writingResult of writingResults) {
        try {
          const qualityResult = await this.quality.validateContent(writingResult.data!.content);
          if (qualityResult.success) {
            qualityResults.push(qualityResult);
            console.log(`✅ Quality validated: "${writingResult.data!.content.title}"`);
          } else {
            errors.push(`Quality validation failed: ${qualityResult.error}`);
          }
        } catch (error) {
          errors.push(`Quality validation error: ${error}`);
        }
      }

      // Step 4: Repurpose content for platforms
      console.log('🔄 Step 4: Repurposing content for platforms...');
      const repurposeResults: RepurposeResult[] = [];

      for (const writingResult of writingResults) {
        try {
          const repurposeResult = await this.repurposer.repurposeContent(writingResult.data!.content);
          if (repurposeResult.success) {
            repurposeResults.push(repurposeResult);
            console.log(`✅ Repurposed content: "${writingResult.data!.content.title}"`);
          } else {
            errors.push(`Repurposing failed: ${repurposeResult.error}`);
          }
        } catch (error) {
          errors.push(`Repurposing error: ${error}`);
        }
      }

      // Step 5: Create content packages
      console.log('📦 Step 5: Creating content packages...');
      for (let i = 0; i < writingResults.length; i++) {
        const writingResult = writingResults[i];
        const repurposeResult = repurposeResults[i];

        if (writingResult.success && repurposeResult.success) {
          const contentPackage: ContentPackage = {
            id: `package_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            longForm: writingResult.data!.content,
            platforms: repurposeResult.data!.platforms,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };

          contentPackages.push(contentPackage);
          console.log(`✅ Created package: ${contentPackage.id}`);
        }
      }

      // Step 6: Skip publishing (content creation only)
      console.log('📝 Step 6: Content creation completed (publishing skipped)');
      console.log(`✅ Created ${contentPackages.length} content packages ready for review`);

      const totalProcessingTime = Date.now() - startTime;
      const topicsGenerated = topics.length;
      const contentCreated = writingResults.filter(r => r.success).length;
      const platformsGenerated = repurposeResults.reduce((sum, r) => 
        sum + (r.success ? r.data!.platforms.length : 0), 0
      );

      console.log('🎉 Pipeline completed successfully!');
      console.log(`📊 Generated ${topicsGenerated} topics`);
      console.log(`✍️ Created ${contentCreated} long-form articles`);
      console.log(`🔄 Generated ${platformsGenerated} platform-specific posts`);
      console.log(`⏱️ Total processing time: ${totalProcessingTime}ms`);

      return {
        success: true,
        contentPackages,
        errors,
        metadata: {
          totalProcessingTime,
          topicsGenerated,
          contentCreated,
          platformsGenerated
        }
      };

    } catch (error) {
      console.error('❌ Pipeline failed:', error);
      return {
        success: false,
        contentPackages,
        errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
        metadata: {
          totalProcessingTime: Date.now() - startTime,
          topicsGenerated: 0,
          contentCreated: 0,
          platformsGenerated: 0
        }
      };
    }
  }

  async generateSingleContent(topicId: string): Promise<ContentPackage | null> {
    try {
      console.log(`🎯 Generating single content for topic: ${topicId}`);

      // Research specific topic
      const researchResult = await this.researcher.research();
      if (!researchResult.success) {
        throw new Error(`Research failed: ${researchResult.error}`);
      }

      const topic = researchResult.data!.topics.find(t => t.id === topicId);
      if (!topic) {
        throw new Error(`Topic not found: ${topicId}`);
      }

      // Generate content
      const writingResult = await this.writer.createContent(topic);
      if (!writingResult.success) {
        throw new Error(`Writing failed: ${writingResult.error}`);
      }

      // Validate quality
      const qualityResult = await this.quality.validateContent(writingResult.data!.content);
      if (!qualityResult.success) {
        throw new Error(`Quality validation failed: ${qualityResult.error}`);
      }

      // Repurpose for platforms
      const repurposeResult = await this.repurposer.repurposeContent(writingResult.data!.content);
      if (!repurposeResult.success) {
        throw new Error(`Repurposing failed: ${repurposeResult.error}`);
      }

      // Create content package
      const contentPackage: ContentPackage = {
        id: `package_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        longForm: writingResult.data!.content,
        platforms: repurposeResult.data!.platforms,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      return contentPackage;

    } catch (error) {
      console.error('❌ Single content generation failed:', error);
      return null;
    }
  }

  async generateContentWithProgress(
    onProgress?: (message: string) => void
  ): Promise<{
    success: boolean;
    contentPackages: ContentPackage[];
    errors: string[];
    metadata: {
      totalProcessingTime: number;
      topicsGenerated: number;
      contentCreated: number;
      platformsGenerated: number;
    };
  }> {
    const startTime = Date.now();
    const contentPackages: ContentPackage[] = [];
    const errors: string[] = [];

    const report = (msg: string) => {
      if (onProgress) onProgress(msg);
    };

    try {
      report('Starting pipeline');
      report('Step 1: Researching on-chain data');
      const researchResult = await this.researcher.research();
      if (!researchResult.success) {
        throw new Error(`Research failed: ${researchResult.error}`);
      }
      const { topics } = researchResult.data!;
      report(`Generated ${topics.length} topics`);

      report('Step 2: Generating long-form content');
      const writingResults: WritingResult[] = [];
      for (const topic of topics) {
        const writingResult = await this.writer.createContent(topic);
        if (writingResult.success) {
          writingResults.push(writingResult);
          report(`Created article: ${writingResult.data!.content.title}`);
        } else {
          errors.push(`Writing failed for topic "${topic.title}": ${writingResult.error}`);
        }
      }

      report('Step 3: Validating content quality');
      const qualityResults: QualityResult[] = [];
      for (const writingResult of writingResults) {
        const qualityResult = await this.quality.validateContent(writingResult.data!.content);
        if (qualityResult.success) {
          qualityResults.push(qualityResult);
          report(`Quality OK: ${writingResult.data!.content.title}`);
        } else {
          errors.push(`Quality validation failed: ${qualityResult.error}`);
        }
      }

      report('Step 4: Repurposing for platforms');
      const repurposeResults: RepurposeResult[] = [];
      for (const writingResult of writingResults) {
        const repurposeResult = await this.repurposer.repurposeContent(writingResult.data!.content);
        if (repurposeResult.success) {
          repurposeResults.push(repurposeResult);
          report(`Repurposed: ${writingResult.data!.content.title}`);
        } else {
          errors.push(`Repurposing failed: ${repurposeResult.error}`);
        }
      }

      report('Step 5: Creating content packages');
      for (let i = 0; i < writingResults.length; i++) {
        const writingResult = writingResults[i];
        const repurposeResult = repurposeResults[i];
        if (writingResult.success && repurposeResult.success) {
          const contentPackage: ContentPackage = {
            id: `package_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            longForm: writingResult.data!.content,
            platforms: repurposeResult.data!.platforms,
            status: 'draft',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          contentPackages.push(contentPackage);
        }
      }

      const totalProcessingTime = Date.now() - startTime;
      const topicsGenerated = topics.length;
      const contentCreated = writingResults.filter(r => r.success).length;
      const platformsGenerated = repurposeResults.reduce((sum, r) =>
        sum + (r.success ? r.data!.platforms.length : 0), 0);

      report('Completed');

      return {
        success: true,
        contentPackages,
        errors,
        metadata: {
          totalProcessingTime,
          topicsGenerated,
          contentCreated,
          platformsGenerated
        }
      };
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        contentPackages,
        errors,
        metadata: {
          totalProcessingTime: Date.now() - startTime,
          topicsGenerated: 0,
          contentCreated: 0,
          platformsGenerated: 0
        }
      };
    }
  }

  async getPipelineStatus(): Promise<{
    isRunning: boolean;
    lastRun: string | null;
    totalPackages: number;
    successRate: number;
  }> {
    // In a real implementation, this would check the actual pipeline status
    // For now, return mock data
    return {
      isRunning: false,
      lastRun: new Date().toISOString(),
      totalPackages: 0,
      successRate: 1.0
    };
  }
}
