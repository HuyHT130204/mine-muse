// Cron job API route for automated content generation

import { NextRequest, NextResponse } from 'next/server';
import { ContentPipeline } from '@/lib/pipeline';

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }
    
    console.log('⏰ CRON: Starting automated content generation...');
    
    const pipeline = new ContentPipeline();
    const result = await pipeline.generateContent();
    
    if (result.success) {
      console.log(`✅ CRON: Generated ${result.contentPackages.length} content packages`);
      
      return NextResponse.json({
        success: true,
        message: 'Automated content generation completed',
        data: {
          contentPackages: result.contentPackages,
          metadata: result.metadata
        },
        errors: result.errors
      });
    } else {
      console.error('❌ CRON: Content generation failed');
      
      return NextResponse.json({
        success: false,
        message: 'Automated content generation failed',
        errors: result.errors,
        metadata: result.metadata
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ CRON Error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Cron job failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Cron endpoint is active',
    timestamp: new Date().toISOString()
  });
}
