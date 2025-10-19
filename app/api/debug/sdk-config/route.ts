import { NextRequest, NextResponse } from 'next/server';
import { getWhopSdk } from '@/lib/whop-sdk';

export async function GET(request: NextRequest) {
  try {
    // Check environment variables
    const envVars = {
      NEXT_PUBLIC_WHOP_APP_ID: process.env.NEXT_PUBLIC_WHOP_APP_ID ? 'SET' : 'NOT SET',
      WHOP_API_KEY: process.env.WHOP_API_KEY ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_WHOP_AGENT_USER_ID: process.env.NEXT_PUBLIC_WHOP_AGENT_USER_ID ? 'SET' : 'NOT SET',
      NEXT_PUBLIC_WHOP_COMPANY_ID: process.env.NEXT_PUBLIC_WHOP_COMPANY_ID ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: process.env.VERCEL
    };
    
    console.log('🔍 DEBUG - Environment variables:', envVars);
    
    // Get the SDK instance
    const sdk = getWhopSdk();
    
    // Check if SDK is using mock or real implementation
    const isMock = sdk.verifyUserToken.toString().includes('build-time-mock');
    
    return NextResponse.json({
      success: true,
      environment: envVars,
      sdkType: isMock ? 'MOCK' : 'REAL',
      sdkMethods: Object.keys(sdk),
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ DEBUG - SDK config error:', error);
    return NextResponse.json({
      success: false,
      error: 'SDK config error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
