# Whop Payment Integration Setup Guide

## Step 1: Create Access Pass in Whop Dashboard

1. **Go to Whop Dashboard** → **Products** → **Create Product**
2. **Create Access Pass:**
   - **Name:** "Pro Subscription"
   - **Description:** "Unlimited polls, advanced analytics, team collaboration, priority support, custom branding"
   - **Price:** $7/month
   - **Billing:** Monthly recurring
   - **Access Level:** Set appropriate permissions for Pro features

3. **Get the IDs:**
   - **Access Pass ID:** Copy from product page (starts with `acc_`)
   - **Plan ID:** Copy the specific plan ID for $7/month option (starts with `plan_`)

## Step 2: Environment Variables

Add these to your `.env.local` file:

```env
# Whop Payment Configuration (Public - accessible in browser)
NEXT_PUBLIC_WHOP_ACCESS_PASS_ID=acc_your_access_pass_id_here
NEXT_PUBLIC_WHOP_PLAN_ID=plan_your_plan_id_here

# Whop Webhook Secret (Private - server only)
WHOP_WEBHOOK_SECRET=your_webhook_secret_here
```

**Important:** 
- `NEXT_PUBLIC_` variables are accessible in the browser
- `WHOP_WEBHOOK_SECRET` is server-only and should never be exposed to the client

## Step 3: Webhook Configuration

### Required Webhook Permissions:
Enable these permissions in your Whop webhook settings:

1. **`payment.completed`** - When payment is successful
2. **`payment.failed`** - When payment fails
3. **`subscription.created`** - When subscription is created
4. **`subscription.updated`** - When subscription is updated
5. **`subscription.cancelled`** - When subscription is cancelled
6. **`subscription.expired`** - When subscription expires

### Webhook URL:
Set your webhook URL to: `https://yourdomain.com/api/webhooks/whop`

### How to Set Up Webhooks:
1. **Go to Whop Dashboard** → **Settings** → **Webhooks**
2. **Click "Create Webhook"**
3. **Set the URL:** `https://yourdomain.com/api/webhooks/whop`
4. **Select Events:** Enable all the permissions listed above
5. **Generate Secret:** Copy the webhook secret and add it to your environment variables
6. **Test:** Use Whop's webhook testing tool to verify it's working

## Step 4: Implementation

The upgrade modal will now redirect users to Whop's checkout page when they click "Upgrade to Pro".

## Step 5: Testing

1. Use Whop's test mode for development
2. Test with test payment methods
3. Verify webhook events are received correctly
