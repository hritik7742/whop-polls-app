import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { userId, companyId, experienceId, planId, accessPassId } = await request.json();

    if (!userId || !companyId) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, companyId' },
        { status: 400 }
      );
    }

    console.log('Processing payment upgrade:', { userId, companyId, experienceId, planId, accessPassId });

    const supabase = createServerClient();

    // Update user subscription to pro
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('user_subscriptions')
      .upsert({
        user_id: userId,
        company_id: companyId,
        experience_id: experienceId || companyId,
        subscription_status: 'pro',
        plan_id: planId || 'pro_plan',
        access_pass_id: accessPassId,
        subscription_started_at: new Date().toISOString(),
        subscription_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,company_id,experience_id'
      })
      .select()
      .single();

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError);
      return NextResponse.json(
        { error: 'Failed to update subscription' },
        { status: 500 }
      );
    }

    console.log('✅ Subscription upgraded to pro:', subscriptionData);

    return NextResponse.json({
      success: true,
      message: 'Successfully upgraded to Pro!',
      subscription: subscriptionData
    });

  } catch (error) {
    console.error('Error processing payment upgrade:', error);
    return NextResponse.json(
      { error: 'Failed to process payment upgrade' },
      { status: 500 }
    );
  }
}
