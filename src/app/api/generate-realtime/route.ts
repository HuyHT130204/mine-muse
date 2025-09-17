import { NextRequest, NextResponse } from 'next/server';
import { ContentPipeline } from '@/lib/pipeline';
import { WriterAgent } from '@/lib/agents/writer';
import { RepurposerAgent } from '@/lib/agents/repurposer';
import { ContentTopic } from '@/lib/types';

export const runtime = 'edge';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  console.log('🚀 API: Starting real-time content generation...');
  
  const pipeline = new ContentPipeline();
  const writer = new WriterAgent();
  const repurposer = new RepurposerAgent();
  
  try {
    // Get topics via pipeline's public method
    const topicRes = await pipeline.fetchTopics();
    if (!topicRes.success) {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to research topics' 
      });
    }

    const topics: ContentTopic[] = topicRes.topics;
    const onChainData = topicRes.onChainData!;

    // Create a TransformStream for real-time generation
    const { readable, writable } = new TransformStream();
    const writerStream = writable.getWriter();
    const encoder = new TextEncoder();

    // Start real-time generation
    (async () => {
      try {
        const contentPackages = [];
        
        for (let i = 0; i < topics.length; i++) {
          const topic = topics[i];
          
          // Send topic start
          const topicStart = {
            type: 'topic_start',
            data: {
              topicIndex: i,
              topicTitle: topic.title,
              topicId: topic.id
            }
          };
          await writerStream.write(encoder.encode(`data: ${JSON.stringify(topicStart)}\n\n`));

          // Generate long-form content with real-time streaming
          let fullContent = '';
          const longFormContent = await writer.generateLongFormContentStream(topic, (chunk: string) => {
            fullContent += chunk;
            
            // Send content chunk in real-time
            const contentChunk = {
              type: 'content_chunk',
              data: {
                topicIndex: i,
                topicId: topic.id,
                chunk: chunk,
                fullContent: fullContent
              }
            };
            writerStream.write(encoder.encode(`data: ${JSON.stringify(contentChunk)}\n\n`));
          });

          // Generate platform content
          const repurposeResult = await repurposer.repurposeContent(longFormContent);
          if (repurposeResult.success && repurposeResult.data) {
            const contentPackage = {
              id: `package-${topic.id}`,
              topic: topic,
              longFormContent: longFormContent,
              platforms: repurposeResult.data.platforms,
              createdAt: new Date().toISOString(),
              onChainData: onChainData
            };
            contentPackages.push(contentPackage);

            // Send topic complete
            const topicComplete = {
              type: 'topic_complete',
              data: {
                topicIndex: i,
                topicId: topic.id,
                contentPackage: contentPackage
              }
            };
            await writerStream.write(encoder.encode(`data: ${JSON.stringify(topicComplete)}\n\n`));
          }
        }

        // Send final completion
        const completion = {
          type: 'complete',
          data: {
            contentPackages: contentPackages,
            message: 'All content generated successfully'
          }
        };
        await writerStream.write(encoder.encode(`data: ${JSON.stringify(completion)}\n\n`));
        
        writerStream.close();
      } catch (error) {
        console.error('❌ Real-time generation error:', error);
        const errorData = {
          type: 'error',
          data: {
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        };
        await writerStream.write(encoder.encode(`data: ${JSON.stringify(errorData)}\n\n`));
        writerStream.close();
      }
    })();

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}


