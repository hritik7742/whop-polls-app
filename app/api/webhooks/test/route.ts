import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('🧪 Test webhook received:', {
      headers: Object.fromEntries(request.headers.entries()),
      body: body
    });

    // Simulate different webhook events for testing
    const { eventType, userId, companyId } = body;

    switch (eventType) {
      case 'membership.went_valid':
        console.log('✅ Simulating membership.went_valid event');
        break;
      case 'membership.went_invalid':
        console.log('❌ Simulating membership.went_invalid event');
        break;
      case 'payment.succeeded':
        console.log('💰 Simulating payment.succeeded event');
        break;
      case 'payment.failed':
        console.log('💸 Simulating payment.failed event');
        break;
      case 'membership.cancel_at_period_end_changed':
        console.log('⏰ Simulating membership.cancel_at_period_end_changed event');
        break;
      default:
        console.log('⚠️ Unknown event type:', eventType);
    }

    return NextResponse.json({
      success: true,
      message: `Test webhook processed: ${eventType}`,
      receivedData: body
    });

  } catch (error) {
    console.error('❌ Test webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process test webhook' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Webhook test endpoint',
    usage: 'POST with { eventType, userId, companyId } to test webhook events',
    examples: {
      membership_went_valid: {
        eventType: 'membership_went_valid',
        userId: 'user_123',
        companyId: 'biz_456'
      },
      payment_succeeded: {
        eventType: 'payment_succeeded',
        userId: 'user_123',
        companyId: 'biz_456'
      }
    }
  });
}
