import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { updateUserSubscription } from '@/lib/db/user-subscription-functions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const headersList = await headers();
    const signature = headersList.get('whop-signature');
    
    // Verify webhook signature
    const webhookSecret = process.env.WHOP_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('WHOP_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }
    
    if (!signature) {
      console.error('No signature provided');
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }
    
    // Verify the signature
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');
    
    const providedSignature = signature.replace('sha256=', '');
    
    if (expectedSignature !== providedSignature) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const event = JSON.parse(body);
    console.log('Received Whop webhook:', event.type, event.data);
    
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
  console.log('Payment completed:', data);
  // Update user's subscription status to Pro
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

async function handlePaymentFailed(data: any) {
  console.log('Payment failed:', data);
  // Handle failed payment
  // Maybe send notification to user
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
