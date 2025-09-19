import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // For now, just return success
    // In a real implementation, this would stop the generation process
    return NextResponse.json({ 
      success: true, 
      message: 'Generation stopped' 
    });
  } catch (error) {
    console.error('Error stopping generation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to stop generation' },
      { status: 500 }
    );
  }
}