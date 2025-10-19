import { NextRequest, NextResponse } from 'next/server';
import { whopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    const headersList = request.headers;
    
    // Log all headers for debugging
    const allHeaders = Object.fromEntries(headersList.entries());
    console.log('🔍 DEBUG - All headers received:', allHeaders);
    
    // Try to verify user token
    let userId: string;
    let verificationResult: any;
    
    try {
      verificationResult = await whopSdk.verifyUserToken(headersList);
      userId = verificationResult.userId;
      console.log('✅ DEBUG - User authenticated successfully:', userId);
      console.log('✅ DEBUG - Full verification result:', verificationResult);
    } catch (tokenError) {
      console.error('❌ DEBUG - Token verification failed:', tokenError);
      return NextResponse.json({
        success: false,
        error: 'Token verification failed',
        tokenError: tokenError instanceof Error ? tokenError.message : String(tokenError),
        headers: allHeaders
      }, { status: 401 });
    }
    
    // Try to get user details
    let userDetails: any;
    try {
      userDetails = await whopSdk.users.getUser({ userId });
      console.log('✅ DEBUG - User details retrieved:', userDetails);
    } catch (userError) {
      console.error('❌ DEBUG - Failed to get user details:', userError);
      userDetails = { error: userError instanceof Error ? userError.message : String(userError) };
    }
    
    return NextResponse.json({
      success: true,
      userId,
      verificationResult,
      userDetails,
      headers: allHeaders,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ DEBUG - Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
