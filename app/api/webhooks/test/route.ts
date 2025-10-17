import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString();
    
    console.log('\n' + '='.repeat(80));
    console.log(`🧪 TEST WEBHOOK RECEIVED - ${timestamp}`);
    console.log('='.repeat(80));
    
    const body = await request.json();
    console.log('📊 Test Data:', JSON.stringify(body, null, 2));
    console.log('📋 Headers:', Object.fromEntries(request.headers.entries()));
    console.log('='.repeat(80));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Test webhook received successfully',
      timestamp,
      receivedData: body
    });
    
  } catch (error) {
    console.error('\n❌ TEST WEBHOOK ERROR:');
    console.error('='.repeat(50));
    console.error('Error:', error);
    console.error('='.repeat(50));
    
    return NextResponse.json({ 
      success: false, 
      error: 'Test webhook failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();
  
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 TEST WEBHOOK GET REQUEST - ${timestamp}`);
  console.log('='.repeat(80));
  console.log('✅ Webhook endpoint is working!');
  console.log('='.repeat(80));
  
  return NextResponse.json({ 
    success: true, 
    message: 'Webhook endpoint is working',
    timestamp,
    endpoints: {
      test: '/api/webhooks/test',
      main: '/api/webhooks'
    }
  });
}