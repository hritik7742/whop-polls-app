# Push Notifications Setup Guide for Whop Polls App

## Overview

Your Whop Polls app now includes push notification functionality that sends notifications to community members when polls become active. This feature works for both immediate polls and scheduled polls.

## How It Works

### Notification Triggers

Push notifications are sent when:

1. **Immediate Poll Creation**: When a user creates a poll and launches it immediately (status: 'active')
2. **Scheduled Poll Activation**: When a scheduled poll becomes active at its scheduled time

### Notification Conditions

Notifications are only sent if:
- The poll creator enabled notifications (checked the "Mention users" checkbox)
- The poll status is 'active'
- There are community members with access to the experience

### Notification Content

Each notification includes:
- **Title**: "New Poll Available!"
- **Subtitle**: Company name
- **Content**: Poll question (truncated to 100 characters if longer)
- **Action**: Taps open the experience view where users can vote

## Implementation Details

### Files Created/Modified

1. **`lib/notifications/poll-notifications.ts`** - Main notification service
2. **`app/api/polls/route.ts`** - Updated to send notifications for immediate polls
3. **`app/api/polls/activate-scheduled/route.ts`** - Updated to send notifications for scheduled polls
4. **`app/api/cron/activate-polls/route.ts`** - Updated to send notifications in cron jobs

### Notification Service Functions

#### `sendPollActiveNotification(poll, company)`
- Sends notification for a single poll
- Gets community members from Whop SDK
- Sends push notification via Whop SDK

#### `sendBatchPollNotifications(polls, company)`
- Sends notifications for multiple polls efficiently
- Groups polls by company
- Adds delays between notifications to avoid rate limiting

#### `getCommunityMembers(companyId, experienceId)`
- Gets all users with access to the experience
- Uses Whop SDK access API
- Returns array of user IDs

## Database Schema

The existing `polls` table already includes the `send_notification` field:

```sql
CREATE TABLE public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL CHECK (length(question) <= 500),
  company_id text NOT NULL,
  experience_id text NOT NULL,
  creator_user_id text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  is_anonymous boolean DEFAULT false,
  send_notification boolean DEFAULT true,  -- This field controls notifications
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'scheduled'::text])),
  scheduled_at timestamp with time zone,
  CONSTRAINT polls_pkey PRIMARY KEY (id)
);
```

## API Integration

### Poll Creation API (`POST /api/polls`)

When a poll is created:
1. Poll is saved to database
2. If poll status is 'active' and `send_notification` is true:
   - Gets company information
   - Sends push notification to community members

### Scheduled Poll Activation (`POST /api/polls/activate-scheduled`)

When scheduled polls are activated:
1. Polls are updated to 'active' status
2. For each activated poll with notifications enabled:
   - Groups polls by company
   - Sends batch notifications efficiently

### Cron Job (`GET /api/cron/activate-polls`)

The cron job also sends notifications when it activates scheduled polls.

## Testing

### Manual Testing

1. **Test Immediate Poll Notifications**:
   ```bash
   # Start your development server
   npm run dev
   
   # Create a poll with notifications enabled
   # Check if push notifications are sent
   ```

2. **Test Scheduled Poll Notifications**:
   ```bash
   # Create a poll scheduled for 1 minute from now
   # Wait for it to activate
   # Check if notifications are sent
   ```

3. **Test Notification Disabled**:
   ```bash
   # Create a poll with notifications disabled
   # Verify no notifications are sent
   ```

### Automated Testing

Run the test script:
```bash
node scripts/test-notifications.js
```

This script will:
- Create test polls with and without notifications
- Create scheduled polls
- Test the notification API endpoints
- Clean up test data

## Configuration

### Environment Variables

Make sure these are set in your `.env.local`:

```env
# Whop Configuration
NEXT_PUBLIC_WHOP_APP_ID=your_whop_app_id
WHOP_API_KEY=your_whop_api_key
NEXT_PUBLIC_WHOP_AGENT_USER_ID=your_agent_user_id
NEXT_PUBLIC_WHOP_COMPANY_ID=your_company_id

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Whop SDK Setup

The notification service uses the Whop SDK to:
- Get community members via `whopSdk.access.getExperienceAccess()`
- Send push notifications via `whopSdk.notifications.sendPushNotification()`

## User Experience

### For Poll Creators

1. **Create Poll Dialog**: 
   - Checkbox "Mention users (send push notification)" is available
   - Default is enabled (checked)
   - Users can uncheck to disable notifications

2. **Immediate Polls**:
   - Notifications sent immediately when poll is created
   - All community members receive the notification

3. **Scheduled Polls**:
   - Notifications sent when poll becomes active
   - No notifications sent when poll is scheduled

### For Community Members

1. **Receive Notifications**:
   - Push notification appears on their device
   - Title: "New Poll Available!"
   - Shows company name and poll question

2. **Tap to Vote**:
   - Tapping notification opens the experience view
   - Users can immediately vote on the poll

## Error Handling

### Graceful Degradation

- If notification sending fails, poll creation still succeeds
- Errors are logged but don't affect the main functionality
- Batch notifications continue even if individual notifications fail

### Rate Limiting

- Small delays between batch notifications (100ms)
- Prevents overwhelming the Whop API
- Handles large communities efficiently

## Monitoring

### Logs

The system logs:
- Successful notification sends
- Notification failures
- Community member counts
- Poll activation events

### Debug Information

Check browser console and server logs for:
- Notification sending attempts
- Community member retrieval
- Poll activation events

## Troubleshooting

### Common Issues

1. **No Notifications Sent**:
   - Check if `send_notification` is true
   - Verify community members exist
   - Check Whop SDK configuration

2. **Notifications Not Received**:
   - Verify user has access to the experience
   - Check device notification settings
   - Verify Whop app permissions

3. **Scheduled Poll Notifications**:
   - Ensure scheduled polls are being activated
   - Check cron job is running
   - Verify scheduled time has passed

### Debug Steps

1. Check server logs for notification attempts
2. Verify poll data in database
3. Test with immediate polls first
4. Check Whop SDK API responses

## Production Considerations

### Performance

- Batch notifications for multiple polls
- Efficient community member retrieval
- Graceful error handling

### Scalability

- Handles large communities
- Rate limiting prevents API overload
- Background processing for scheduled polls

### Reliability

- Notifications don't block poll creation
- Retry logic for failed notifications
- Comprehensive error logging

The push notification system is now fully integrated and ready for production use!
