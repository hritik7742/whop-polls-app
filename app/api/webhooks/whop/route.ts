import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { updateUserSubscription } from '@/lib/db/user-subscription-functions';

export async function POST(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('whop-signature');
    
    console.log('\n' + '='.repeat(80));
    console.log(`🔔 WHOP WEBHOOK RECEIVED - ${timestamp}`);
    console.log('='.repeat(80));
    console.log('📋 Headers:', Object.fromEntries(headersList.entries()));
    console.log('🌐 URL:', request.url);
    console.log('⏰ Timestamp:', timestamp);
    
    // Verify webhook signature
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('❌ WHOP_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    if (!signature) {
      console.error('❌ No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    // Verify the signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    if (expectedSignature !== providedSignature) {
      console.error('❌ Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const event = JSON.parse(body);
    
    console.log('\n✅ WHOP WEBHOOK VALIDATED SUCCESSFULLY');
    console.log('🎯 Event Type:', event.type);
    console.log('📊 Event Data:', JSON.stringify(event.data, null, 2));
    console.log('='.repeat(80));
    
    // Handle different webhook events
    switch (event.type) {
      case 'payment.completed':
        await handlePaymentCompleted(event.data);
        break;
      case 'payment.failed':
        await handlePaymentFailed(event.data);
        break;
      case 'subscription.created':
        await handleSubscriptionCreated(event.data);
        break;
      case 'subscription.updated':
        await handleSubscriptionUpdated(event.data);
        break;
      case 'subscription.cancelled':
        await handleSubscriptionCancelled(event.data);
        break;
      case 'subscription.expired':
        await handleSubscriptionExpired(event.data);
        break;
      default:
        console.log('Unhandled webhook event type:', event.type);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handlePaymentCompleted(data: any) {
  try {
    console.log('\n💰 PAYMENT COMPLETED EVENT');
    console.log('='.repeat(50));
    console.log('📊 Full Payment Data:', JSON.stringify(data, null, 2));
    
    const { user_id, company_id, experience_id, plan_id, access_pass_id, subscription_ends_at } = data;
    
    console.log('\n📋 Payment Summary:');
    console.log(`   👤 User ID: ${user_id}`);
    console.log(`   🏢 Company ID: ${company_id}`);
    console.log(`   🎯 Experience ID: ${experience_id}`);
    console.log(`   📦 Plan ID: ${plan_id}`);
    console.log(`   🎫 Access Pass ID: ${access_pass_id}`);
    
    // Update user's subscription status to Pro
    if (user_id && company_id && experience_id) {
      console.log('\n🔄 Updating user subscription to Pro...');
      
      await updateUserSubscription(
        user_id,
        company_id,
        experience_id,
        {
          subscription_status: 'pro',
          plan_id: plan_id,
          access_pass_id: access_pass_id,
          subscription_started_at: new Date().toISOString(),
          subscription_ends_at: subscription_ends_at
        }
      );
      
      console.log('✅ User subscription updated to Pro successfully');
    } else {
      console.log('⚠️ Missing required data for subscription update');
    }
    
    console.log('✅ Payment completed handling finished');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ ERROR HANDLING PAYMENT COMPLETED:');
    console.error('='.repeat(50));
    console.error('Error:', error);
    console.error('Data:', data);
    console.error('='.repeat(50));
  }
}

async function handlePaymentFailed(data: any) {
  try {
    console.log('\n💸 PAYMENT FAILED EVENT');
    console.log('='.repeat(50));
    console.log('📊 Full Payment Failure Data:', JSON.stringify(data, null, 2));
    
    const { user_id, error_message, payment_id, amount, currency } = data;
    
    console.log('\n📋 Payment Failure Summary:');
    console.log(`   👤 User ID: ${user_id}`);
    console.log(`   💳 Payment ID: ${payment_id}`);
    console.log(`   💰 Amount: ${amount} ${currency}`);
    console.log(`   ❌ Error Message: ${error_message}`);
    
    console.log('✅ Payment failure handling completed');
    console.log('='.repeat(50));
    
  } catch (error) {
    console.error('\n❌ ERROR HANDLING PAYMENT FAILED:');
    console.error('='.repeat(50));
    console.error('Error:', error);
    console.error('Data:', data);
    console.error('='.repeat(50));
  }
}

async function handleSubscriptionCreated(data: any) {
  console.log('Subscription created:', data);
  // Activate Pro features for the user
  if (data.user_id && data.company_id && data.experience_id) {
    await updateUserSubscription(
      data.user_id,
      data.company_id,
      data.experience_id,
      {
        subscription_status: 'pro',
        plan_id: data.plan_id,
        access_pass_id: data.access_pass_id,
        subscription_started_at: new Date().toISOString(),
        subscription_ends_at: data.subscription_ends_at
      }
    );
  }
}

async function handleSubscriptionUpdated(data: any) {
  console.log('Subscription updated:', data);
  // Handle subscription changes
  // Update user's access level
}

async function handleSubscriptionCancelled(data: any) {
  console.log('Subscription cancelled:', data);
  // Revoke Pro access
  if (data.user_id && data.company_id && data.experience_id) {
    await updateUserSubscription(
      data.user_id,
      data.company_id,
      data.experience_id,
      {
        subscription_status: 'free'
      }
    );
  }
}

async function handleSubscriptionExpired(data: any) {
  console.log('Subscription expired:', data);
  // Revoke Pro access
  if (data.user_id && data.company_id && data.experience_id) {
    await updateUserSubscription(
      data.user_id,
      data.company_id,
      data.experience_id,
      {
        subscription_status: 'free'
      }
    );
  }
}

export async function GET() {
  const timestamp = new Date().toISOString();
  
  console.log('\n' + '='.repeat(80));
  console.log(`🧪 WHOP WEBHOOK GET REQUEST - ${timestamp}`);
  console.log('='.repeat(80));
  console.log('✅ Whop webhook endpoint is working!');
  console.log('='.repeat(80));
  
  return NextResponse.json({ 
    success: true, 
    message: 'Whop webhook endpoint is working',
    timestamp,
    endpoint: '/api/webhooks/whop'
  });
}
