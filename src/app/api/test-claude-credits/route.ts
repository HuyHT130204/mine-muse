import { NextResponse } from 'next/server';
import { ClaudeClient } from '../../../lib/llm/claude';

export async function POST() {
  try {
    // Check if Claude API key is available
    const claudeApiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    
    if (!claudeApiKey) {
      return NextResponse.json({
        success: false,
        error: 'Claude API key not configured',
        hasCredits: false
      }, { status: 400 });
    }

    // Try to make a simple test call to Claude
    const client = new ClaudeClient({ 
      apiKey: claudeApiKey, 
      model: 'claude-3-haiku-20240307' // Use cheaper model for testing
    });

    const testResponse = await client.generate('Test message: respond with "OK"', {
      maxTokens: 10,
      temperature: 0
    });

    if (testResponse && testResponse.trim().toLowerCase().includes('ok')) {
      return NextResponse.json({
        success: true,
        hasCredits: true,
        message: 'Claude credits available'
      });
    } else {
      return NextResponse.json({
        success: false,
        hasCredits: false,
        error: 'Unexpected response from Claude'
      });
    }

  } catch (error) {
    console.error('Claude credit check error:', error);
    
    // Check if it's a credit/rate limit error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('insufficient') || 
        errorMessage.includes('credit') || 
        errorMessage.includes('quota') ||
        errorMessage.includes('limit') ||
        errorMessage.includes('billing')) {
      return NextResponse.json({
        success: false,
        hasCredits: false,
        error: 'Claude credits exhausted or billing issue',
        details: errorMessage
      });
    }

    return NextResponse.json({
      success: false,
      hasCredits: false,
      error: 'Failed to connect to Claude',
      details: errorMessage
    }, { status: 500 });
  }
}
