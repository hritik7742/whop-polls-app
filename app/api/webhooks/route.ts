import { makeWebhookValidator } from "@whop/api";
import { after } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { NextRequest } from "next/server";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET!,
});

export async function POST(request: NextRequest): Promise<Response> {
	try {
		console.log('🔔 Webhook received:', {
			headers: Object.fromEntries(request.headers.entries()),
			url: request.url
		});

		// Validate the webhook to ensure it's from Whop
		const webhook = await validateWebhook(request);
		
		console.log('✅ Webhook validated successfully:', {
			action: webhook.action,
			data: webhook.data
		});

		// Handle different subscription and payment events
		switch (webhook.action) {
			case "membership.went_valid":
				after(handleMembershipValid(webhook.data));
				break;
			case "membership.went_invalid":
				after(handleMembershipInvalid(webhook.data));
				break;
			case "membership.cancel_at_period_end_changed":
				after(handleCancelAtPeriodEnd(webhook.data));
				break;
			case "payment.succeeded":
				after(handlePaymentSucceeded(webhook.data));
				break;
			case "payment.failed":
				after(handlePaymentFailed(webhook.data));
				break;
			default:
				console.log('⚠️ Unhandled webhook action:', webhook.action);
		}

		// Make sure to return a 2xx status code quickly. Otherwise the webhook will be retried.
		return new Response("OK", { status: 200 });

	} catch (error) {
		console.error('❌ Webhook validation failed:', error);
		
		// Return 400 for signature validation errors
		if (error instanceof Error && error.message.includes('signature')) {
			return new Response(JSON.stringify({ error: "Invalid signature" }), { 
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}
		
		// Return 500 for other errors
		return new Response(JSON.stringify({ error: "Internal server error" }), { 
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}

async function handleMembershipValid(data: any) {
	try {
		console.log('🎉 Membership became valid:', data);
		
		const { user_id, access_pass_id, company_id } = data;
		
		if (!user_id) {
			console.error('❌ No user_id in membership_went_valid webhook');
			return;
		}

		const supabase = createServerClient();

		// Update user subscription to pro
		const { data: subscriptionData, error: subscriptionError } = await supabase
			.from('user_subscriptions')
			.upsert({
				user_id: user_id,
				company_id: company_id || 'default',
				experience_id: company_id || 'default',
				subscription_status: 'pro',
				plan_id: 'pro_plan',
				access_pass_id: access_pass_id,
				subscription_started_at: new Date().toISOString(),
				subscription_ends_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
				updated_at: new Date().toISOString()
			}, {
				onConflict: 'user_id,company_id,experience_id'
			})
			.select()
			.single();

		if (subscriptionError) {
			console.error('❌ Error updating subscription:', subscriptionError);
		} else {
			console.log('✅ Subscription updated to pro:', subscriptionData);
		}

	} catch (error) {
		console.error('❌ Error handling membership valid:', error);
	}
}

async function handleMembershipInvalid(data: any) {
	try {
		console.log('🚫 Membership became invalid:', data);
		
		const { user_id, company_id } = data;
		
		if (!user_id) {
			console.error('❌ No user_id in membership_went_invalid webhook');
			return;
		}

		const supabase = createServerClient();

		// Update user subscription to cancelled
		const { data: subscriptionData, error: subscriptionError } = await supabase
			.from('user_subscriptions')
			.upsert({
				user_id: user_id,
				company_id: company_id || 'default',
				experience_id: company_id || 'default',
				subscription_status: 'cancelled',
				subscription_ends_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}, {
				onConflict: 'user_id,company_id,experience_id'
			})
			.select()
			.single();

		if (subscriptionError) {
			console.error('❌ Error updating subscription to cancelled:', subscriptionError);
		} else {
			console.log('✅ Subscription updated to cancelled:', subscriptionData);
		}

	} catch (error) {
		console.error('❌ Error handling membership invalid:', error);
	}
}

async function handleCancelAtPeriodEnd(data: any) {
	try {
		console.log('⏰ Cancel at period end changed:', data);
		
		const { user_id, cancel_at_period_end, company_id } = data;
		
		if (!user_id) {
			console.error('❌ No user_id in membership_cancel_at_period_end_changed webhook');
			return;
		}

		const supabase = createServerClient();

		// Update subscription with cancel_at_period_end status
		const { data: subscriptionData, error: subscriptionError } = await supabase
			.from('user_subscriptions')
			.upsert({
				user_id: user_id,
				company_id: company_id || 'default',
				experience_id: company_id || 'default',
				subscription_status: cancel_at_period_end ? 'cancelled' : 'pro',
				updated_at: new Date().toISOString()
			}, {
				onConflict: 'user_id,company_id,experience_id'
			})
			.select()
			.single();

		if (subscriptionError) {
			console.error('❌ Error updating cancel at period end:', subscriptionError);
		} else {
			console.log('✅ Cancel at period end updated:', subscriptionData);
		}

	} catch (error) {
		console.error('❌ Error handling cancel at period end:', error);
	}
}

async function handlePaymentSucceeded(data: any) {
	try {
		console.log('💰 Payment succeeded:', data);
		
		const { id, user_id, final_amount, currency, amount_after_fees, metadata } = data;
		
		// Log successful payment
		console.log(`Payment ${id} succeeded for ${user_id} with amount ${final_amount} ${currency}`);
		
		// You can add additional payment processing logic here
		// For example, sending confirmation emails, updating payment records, etc.
		
	} catch (error) {
		console.error('❌ Error handling payment succeeded:', error);
	}
}

async function handlePaymentFailed(data: any) {
	try {
		console.log('💸 Payment failed:', data);
		
		const { user_id, error_message } = data;
		
		// Handle failed payment (notify user, retry, etc.)
		console.log(`Payment failed for user ${user_id}: ${error_message}`);
		
		// You can add logic here to:
		// - Send notification to user
		// - Retry payment
		// - Update subscription status
		// - Send to support team
		
	} catch (error) {
		console.error('❌ Error handling payment failed:', error);
	}
}
