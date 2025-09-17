// Test API endpoint for model rotation

import { NextRequest, NextResponse } from 'next/server';
import { modelManager } from '@/lib/model-manager';
import { ContentPipeline } from '@/lib/pipeline';

export async function GET(): Promise<NextResponse> {
  try {
    console.log('🧪 Testing model rotation...');
    
    // Get model statistics
    const stats = modelManager.getStats();
    console.log('📊 Model stats:', stats);
    
    if (stats.totalModels === 0) {
      return NextResponse.json({
        success: false,
        error: 'No models available. Please check HF_API_KEY configuration.',
        stats
      }, { status: 500 });
    }

    // Test model rotation
    const rotationTests = [];
    for (let i = 0; i < 4; i++) {
      const model = modelManager.rotateModel();
      const modelName = modelManager.getCurrentModelName();
      rotationTests.push({
        iteration: i + 1,
        modelName,
        hasModel: !!model
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Model rotation test completed',
      stats,
      rotationTests,
      availableModels: stats.availableModels
    });

  } catch (error) {
    console.error('❌ Model test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🧪 Testing content generation with model rotation...');
    
    const { testContentGeneration = false } = await request.json();
    
    if (!testContentGeneration) {
      return NextResponse.json({
        success: true,
        message: 'Use testContentGeneration: true to test content generation'
      });
    }

    // Test content generation with model rotation
    const pipeline = new ContentPipeline();
    const result = await pipeline.generateContent();
    
    return NextResponse.json({
      success: result.success,
      message: 'Content generation test completed',
      metadata: result.metadata,
      contentPackages: result.contentPackages?.length || 0,
      errors: result.errors
    });

  } catch (error) {
    console.error('❌ Content generation test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
