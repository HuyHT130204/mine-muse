// API route for generating Bitcoin mining content

import { NextRequest, NextResponse } from 'next/server';
import { ContentPipeline } from '@/lib/pipeline';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    console.log('🚀 API: Starting content generation...');
    
    const pipeline = new ContentPipeline();
    const progress: string[] = [];
    const result = await pipeline.generateContentWithProgress((msg) => {
      progress.push(msg);
      console.log(msg);
    });
    
    if (result.success) {
      console.log(`✅ Generated ${result.contentPackages.length} content packages`);
      
      return NextResponse.json({
        success: true,
        message: 'Content generated successfully',
        data: {
          contentPackages: result.contentPackages,
          metadata: result.metadata,
          progress
        },
        errors: result.errors
      });
    } else {
      console.error('❌ Content generation failed');
      
      return NextResponse.json({
        success: false,
        message: 'Content generation failed',
        errors: result.errors,
        metadata: result.metadata
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  try {
    const pipeline = new ContentPipeline();
    const status = await pipeline.getPipelineStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ API Error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Failed to get pipeline status',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
