import { makeWebhookValidator } from "@whop/api";
import { after } from "next/server";
import { createServerClient } from "@/lib/supabase";
import type { NextRequest } from "next/server";

const validateWebhook = makeWebhookValidator({
	webhookSecret: process.env.WHOP_WEBHOOK_SECRET!,
});

export async function POST(request: NextRequest): Promise<Response> {
	const timestamp = new Date().toISOString();
	
	try {
		console.log('\n' + '='.repeat(80));
		console.log(`🔔 WEBHOOK RECEIVED - ${timestamp}`);
		console.log('='.repeat(80));
		console.log('📋 Headers:', Object.fromEntries(request.headers.entries()));
		console.log('🌐 URL:', request.url);
		console.log('⏰ Timestamp:', timestamp);

		// Validate the webhook to ensure it's from Whop
		const webhook = await validateWebhook(request);
		
		console.log('\n✅ WEBHOOK VALIDATED SUCCESSFULLY');
		console.log('🎯 Action:', webhook.action);
		console.log('📊 Data:', JSON.stringify(webhook.data, null, 2));
		console.log('='.repeat(80));

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
			case "payment.pending":
				after(handlePaymentPending(webhook.data));
				break;
			case "refund.created":
				after(handleRefundCreated(webhook.data));
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
		console.log('\n🎉 MEMBERSHIP BECAME VALID EVENT');
		console.log('='.repeat(50));
		console.log('📊 Full Membership Data:', JSON.stringify(data, null, 2));
		
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

		console.log('✅ Membership valid handling completed');
		console.log('='.repeat(50));

	} catch (error) {
		console.error('\n❌ ERROR HANDLING MEMBERSHIP VALID:');
		console.error('='.repeat(50));
		console.error('Error:', error);
		console.error('Data:', data);
		console.error('='.repeat(50));
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
		console.log('\n💰 PAYMENT SUCCEEDED EVENT');
		console.log('='.repeat(50));
		console.log('📊 Full Payment Data:', JSON.stringify(data, null, 2));
		
		const { id, user_id, final_amount, currency, amount_after_fees, metadata } = data;
		
		console.log('\n📋 Payment Summary:');
		console.log(`   💳 Payment ID: ${id}`);
		console.log(`   👤 User ID: ${user_id}`);
		console.log(`   💰 Final Amount: ${final_amount} ${currency}`);
		console.log(`   💸 Amount After Fees: ${amount_after_fees} ${currency}`);
		console.log(`   📝 Metadata:`, metadata);
		
		// You can add additional payment processing logic here
		// For example, sending confirmation emails, updating payment records, etc.
		
		console.log('✅ Payment processing completed successfully');
		console.log('='.repeat(50));
		
	} catch (error) {
		console.error('\n❌ ERROR HANDLING PAYMENT SUCCEEDED:');
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
		
		// Handle failed payment (notify user, retry, etc.)
		console.log(`\n🚨 Payment failed for user ${user_id}: ${error_message}`);
		
		// You can add logic here to:
		// - Send notification to user
		// - Retry payment
		// - Update subscription status
		// - Send to support team
		
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

async function handlePaymentPending(data: any) {
	try {
		console.log('\n⏳ PAYMENT PENDING EVENT');
		console.log('='.repeat(50));
		console.log('📊 Full Payment Pending Data:', JSON.stringify(data, null, 2));
		
		const { id, user_id, final_amount, currency, status } = data;
		
		console.log('\n📋 Payment Pending Summary:');
		console.log(`   💳 Payment ID: ${id}`);
		console.log(`   👤 User ID: ${user_id}`);
		console.log(`   💰 Amount: ${final_amount} ${currency}`);
		console.log(`   📊 Status: ${status}`);
		
		console.log('✅ Payment pending handling completed');
		console.log('='.repeat(50));
		
	} catch (error) {
		console.error('\n❌ ERROR HANDLING PAYMENT PENDING:');
		console.error('='.repeat(50));
		console.error('Error:', error);
		console.error('Data:', data);
		console.error('='.repeat(50));
	}
}

async function handleRefundCreated(data: any) {
	try {
		console.log('\n💸 REFUND CREATED EVENT');
		console.log('='.repeat(50));
		console.log('📊 Full Refund Data:', JSON.stringify(data, null, 2));
		
		const { id, amount, currency, status, payment } = data;
		
		console.log('\n📋 Refund Summary:');
		console.log(`   💳 Refund ID: ${id}`);
		console.log(`   👤 User ID: ${payment?.user_id}`);
		console.log(`   💰 Refund Amount: ${amount} ${currency}`);
		console.log(`   📊 Status: ${status}`);
		console.log(`   🔗 Original Payment ID: ${payment?.id}`);
		
		// You can add logic here to:
		// - Update subscription status
		// - Notify user about refund
		// - Update payment records
		// - Send to accounting system
		
		console.log('✅ Refund handling completed');
		console.log('='.repeat(50));
		
	} catch (error) {
		console.error('\n❌ ERROR HANDLING REFUND CREATED:');
		console.error('='.repeat(50));
		console.error('Error:', error);
		console.error('Data:', data);
		console.error('='.repeat(50));
	}
}
