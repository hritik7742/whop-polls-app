# Freemium Setup Guide for Whop Polls App

## Overview

Your Whop Polls app now has a complete freemium model implemented with the following features:

- **Free Plan**: Users can create up to 3 active polls
- **Pro Plan**: Users can create unlimited polls
- **Upgrade Flow**: Seamless upgrade to Pro via Whop checkout
- **Usage Tracking**: Real-time tracking of poll usage and subscription status

## Database Schema

The app uses the following tables for the freemium model:

### `user_subscriptions`
- Tracks user subscription status (`free`, `pro`, `cancelled`)
- Stores plan and access pass information
- Tracks subscription start/end dates

### `user_poll_usage`
- Tracks total polls created by user
- Tracks active polls count
- Automatically updated via database triggers

### `polls`
- Main polls table with status tracking
- Triggers automatically update usage counters

## Setup Instructions

### 1. Database Setup

Run the complete schema in your Supabase SQL editor:

```sql
-- Copy and paste the contents of lib/db/complete-schema.sql
-- This will create all tables, indexes, triggers, and functions
```

### 2. Environment Variables

Add these to your `.env.local` file:

```env
# Whop Payment Configuration
NEXT_PUBLIC_WHOP_ACCESS_PASS_ID=your_access_pass_id
NEXT_PUBLIC_WHOP_PLAN_ID=your_plan_id
WHOP_WEBHOOK_SECRET=your_webhook_secret

# Existing variables...
NEXT_PUBLIC_WHOP_APP_ID=your_whop_app_id
WHOP_API_KEY=your_whop_api_key
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your_agent_user_id
NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Whop Configuration

1. **Create Access Pass**: In your Whop dashboard, create an access pass for the Pro plan
2. **Set Pricing**: Configure your Pro plan pricing (e.g., $7/month)
3. **Get IDs**: Copy the Access Pass ID and Plan ID to your environment variables
4. **Webhook Setup**: Configure webhook endpoint: `https://yourdomain.com/api/webhooks/whop`

### 4. Webhook Events

The app handles these Whop webhook events:

- `payment.completed` - Activates Pro subscription
- `subscription.created` - Activates Pro subscription  
- `subscription.cancelled` - Downgrades to free
- `subscription.expired` - Downgrades to free

## How It Works

### Free User Flow

1. User installs the app → Gets free subscription automatically
2. User can create up to 3 active polls
3. When limit reached → Upgrade modal appears
4. User clicks "Upgrade to Pro" → Whop checkout opens
5. After payment → Webhook updates subscription to Pro

### Pro User Flow

1. User has Pro subscription → Can create unlimited polls
2. Dashboard shows "Pro Active" badge
3. No poll creation limits

### Poll Creation Logic

```typescript
// In app/api/polls/route.ts
const canCreate = await canUserCreatePoll(userId, company_id, experience_id);
if (!canCreate) {
  return NextResponse.json({ 
    error: 'Poll limit reached',
    message: 'You have reached the maximum number of polls for the free plan. Please upgrade to Pro to create unlimited polls.',
    requiresUpgrade: true
  }, { status: 403 });
}
```

### Frontend Integration

The dashboard automatically:
- Shows poll usage counter (e.g., "2/3 polls")
- Displays upgrade button for free users
- Shows "Pro Active" badge for pro users
- Opens upgrade modal when limit reached

## Testing

### Test Free User Limits

1. Create a new user account
2. Create 3 polls → Should work fine
3. Try to create 4th poll → Should show upgrade modal

### Test Pro Upgrade

1. Click "Upgrade to Pro" button
2. Complete Whop checkout
3. Verify webhook updates subscription
4. Try creating more polls → Should work unlimited

### Test Webhook

Use a tool like ngrok to test webhooks locally:

```bash
ngrok http 3000
# Use the ngrok URL for webhook endpoint
```

## Key Features

### Real-time Updates
- Poll usage updates in real-time
- Subscription status changes immediately
- No page refresh needed

### Automatic Tracking
- Database triggers automatically update usage counters
- No manual intervention required
- Accurate poll counting

### Seamless UX
- Upgrade modal appears when limit reached
- Clear messaging about limits
- Easy upgrade process via Whop

### Security
- Webhook signature verification
- User authentication required
- Access control for poll creation

## Troubleshooting

### Common Issues

1. **Webhook not working**: Check webhook secret and endpoint URL
2. **Usage not updating**: Verify database triggers are created
3. **Upgrade not working**: Check Whop configuration and environment variables

### Debug Logs

Check browser console and server logs for:
- Subscription status changes
- Poll creation attempts
- Webhook events received

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify all environment variables are set
3. Ensure database schema is properly applied
4. Test webhook endpoint manually

The freemium model is now fully implemented and ready for production use!
