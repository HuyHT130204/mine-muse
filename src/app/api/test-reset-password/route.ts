import { NextRequest, NextResponse } from 'next/server';
import { resetPassword } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('Testing reset password for:', email);
    
    const result = await resetPassword(email);
    
    console.log('Reset password result:', result);
    
    if (result.error) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error.message,
          details: result 
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Reset password email sent successfully',
      data: result.data
    });
    
  } catch (error) {
    console.error('Test reset password error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
