# Webhook Setup Guide

This guide will help you set up and test webhooks for your Whop app.

## 🔧 Environment Variables

Add these to your `.env.local` file:

```bash
# Webhook Secret (get this from Whop Dashboard → Webhooks)
WHOP_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Optional: Custom webhook URLs for testing
WEBHOOK_URL=https://your-domain.com/api/webhooks
TEST_WEBHOOK_URL=https://your-domain.com/api/webhooks/test
```

## 🎯 Webhook Events Handled

Our webhook handles these events:

1. **`membership_went_valid`** - User gains access to paid features
2. **`membership_went_invalid`** - User loses access to paid features  
3. **`membership_cancel_at_period_end_changed`** - User cancels subscription (ends at period end)
4. **`payment_succeeded`** - Payment completed successfully
5. **`payment_failed`** - Payment failed

## 🚀 Setting Up Webhooks in Whop Dashboard

1. Go to your Whop Dashboard
2. Navigate to **Webhooks** section
3. Click **Create Webhook**
4. Set the webhook URL to: `https://your-domain.com/api/webhooks`
5. Select these events:
   - ✅ `membership_went_valid`
   - ✅ `membership_went_invalid`
   - ✅ `membership_cancel_at_period_end_changed`
   - ✅ `payment_succeeded`
   - ✅ `payment_failed`
6. Copy the webhook secret to your environment variables
7. Save the webhook

## 🧪 Testing Webhooks

### Method 1: Using the Test Script

```bash
# Test all webhook events
node scripts/test-webhook.js all

# Test specific event
node scripts/test-webhook.js test membership_went_valid

# Test with test endpoint (no signature validation)
node scripts/test-webhook.js test-test payment_succeeded
```

### Method 2: Using the Test API Endpoint

```bash
# Test membership valid event
curl -X POST http://localhost:3000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "membership_went_valid",
    "userId": "user_123",
    "companyId": "biz_456"
  }'

# Test payment succeeded event
curl -X POST http://localhost:3000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "payment_succeeded",
    "userId": "user_123",
    "companyId": "biz_456"
  }'
```

### Method 3: Using Whop Dashboard

1. Go to your webhook in Whop Dashboard
2. Click **Test Webhook**
3. Select an event type
4. Click **Send Test**

## 🔍 Debugging Webhook Issues

### Common Issues and Solutions

#### 1. "No signature" Error
```
{ "body": "{\"error\":\"No signature\"}", "status": 400, "success": false }
```

**Solution:**
- Make sure `WHOP_WEBHOOK_SECRET` is set in your environment variables
- Verify the webhook secret matches the one in Whop Dashboard
- Check that the webhook URL is correct

#### 2. Signature Validation Failed
```
❌ Webhook validation failed: Invalid signature
```

**Solution:**
- Double-check the webhook secret
- Ensure the webhook URL is accessible from the internet
- Make sure you're using HTTPS for production webhooks

#### 3. Webhook Not Receiving Events
**Solution:**
- Check webhook URL is accessible: `curl https://your-domain.com/api/webhooks`
- Verify webhook is enabled in Whop Dashboard
- Check server logs for incoming requests

### Debug Logs

The webhook includes comprehensive logging:

```javascript
// Webhook received
🔔 Webhook received: { headers: {...}, url: "..." }

// Webhook validated
✅ Webhook validated successfully: { action: "membership_went_valid", data: {...} }

// Event processed
🎉 Membership became valid: { user_id: "user_123", ... }
✅ Subscription updated to pro: { ... }
```

## 📊 Webhook Event Data Structure

### membership_went_valid
```json
{
  "action": "membership_went_valid",
  "data": {
    "user_id": "user_123",
    "access_pass_id": "access_pass_456",
    "company_id": "biz_789",
    "membership_id": "membership_123"
  }
}
```

### payment_succeeded
```json
{
  "action": "payment_succeeded",
  "data": {
    "id": "payment_123",
    "user_id": "user_123",
    "final_amount": 700,
    "currency": "usd",
    "amount_after_fees": 650,
    "metadata": {
      "plan_id": "pro_plan"
    }
  }
}
```

### membership_cancel_at_period_end_changed
```json
{
  "action": "membership_cancel_at_period_end_changed",
  "data": {
    "user_id": "user_123",
    "company_id": "biz_789",
    "cancel_at_period_end": true,
    "membership_id": "membership_123"
  }
}
```

## 🔄 Real-Time Updates

When webhooks are processed, they automatically update the database and trigger real-time updates:

1. **Database Update** - User subscription status is updated
2. **Real-Time Sync** - All connected clients receive updates instantly
3. **UI Update** - Users see changes without page reload

## 🚨 Error Handling

The webhook includes comprehensive error handling:

- **Signature Validation** - Returns 400 for invalid signatures
- **Database Errors** - Logs errors but doesn't fail the webhook
- **Missing Data** - Validates required fields before processing
- **Retry Logic** - Whop will retry failed webhooks automatically

## 📝 Monitoring

Monitor your webhooks:

1. **Server Logs** - Check your application logs for webhook events
2. **Whop Dashboard** - View webhook delivery status and retry attempts
3. **Database** - Verify subscription status updates in your database

## 🎉 Success Indicators

Your webhooks are working correctly when you see:

- ✅ Webhook validation successful
- ✅ Database updates completed
- ✅ Real-time UI updates
- ✅ No error logs
- ✅ Users can upgrade/downgrade seamlessly
