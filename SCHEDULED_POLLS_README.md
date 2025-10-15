# Scheduled Polls Feature

This document explains how the scheduled polls feature works in the application.

## Overview

The scheduled polls feature allows users to create polls that will be automatically activated at a specified future date and time. Once activated, these polls become visible in the experience view and can be voted on by users.

## How It Works

### 1. Creating Scheduled Polls

- Users can schedule polls when creating them through the "Create Poll" dialog
- Options include:
  - **Launch Now**: Poll becomes active immediately
  - **Predefined times**: 1 hour, 6 hours, 12 hours, 1 day from now
  - **Custom Date & Time**: User selects a specific future date and time

### 2. Database Schema

The `polls` table includes:
- `scheduled_at`: Timestamp when the poll should be activated (NULL for immediate polls)
- `status`: Poll status ('active', 'expired', 'scheduled')

### 3. Automatic Activation

Scheduled polls are automatically activated through multiple mechanisms:

#### A. Real-time Activation
- Both dashboard and experience views automatically check for and activate scheduled polls when fetching data
- This ensures polls are activated as soon as users visit the application

#### B. Manual Activation
- **Dashboard Button**: "Activate Scheduled" button in the dashboard header for manual testing
- **API Endpoint**: `/api/polls/activate-scheduled` for programmatic activation

#### C. Cron Job (Optional)
- **API Endpoint**: `/api/cron/activate-polls` for external cron services
- **Script**: `scripts/activate-scheduled-polls.js` for manual testing

### 4. Real-time Updates

- **Dashboard View**: Shows all polls (active, expired, scheduled) with filtering tabs
- **Experience View**: Only shows active polls that users can vote on
- **Real-time Sync**: Status changes are reflected instantly across all views

## API Endpoints

### POST /api/polls/activate-scheduled
Manually activates scheduled polls that are due.

**Response:**
```json
{
  "success": true,
  "message": "Scheduled polls activation completed",
  "activatedCount": 2
}
```

### GET/POST /api/cron/activate-polls
Cron job endpoint for external scheduling services.

**Headers:**
```
Authorization: Bearer your-secret-key
```

**Response:**
```json
{
  "success": true,
  "message": "Scheduled polls activation completed",
  "activatedCount": 2,
  "activatedPolls": [
    {
      "id": "poll-id",
      "question": "Poll question"
    }
  ]
}
```

## Database Functions

### activate_scheduled_polls()
PostgreSQL function that updates scheduled polls to active status when their scheduled time has passed.

```sql
CREATE OR REPLACE FUNCTION activate_scheduled_polls()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'active' 
  WHERE status = 'scheduled' 
    AND scheduled_at IS NOT NULL 
    AND scheduled_at <= NOW();
END;
$$ LANGUAGE plpgsql;
```

## Setup Instructions

### 1. Database Setup
Run the SQL script to add scheduled polls support:
```sql
-- Run lib/db/scheduled-polls-update.sql in your Supabase SQL editor
```

### 2. Environment Variables
Add to your `.env.local`:
```
CRON_SECRET=your-secret-key-here
```

### 3. External Cron Job (Optional)
Set up a cron job to call the activation endpoint every 5 minutes:
```bash
# Example cron job
*/5 * * * * curl -X GET "https://your-app.com/api/cron/activate-polls" \
  -H "Authorization: Bearer your-secret-key"
```

## Testing

### Manual Testing
1. Create a scheduled poll for 1 minute in the future
2. Wait for the scheduled time
3. Click "Activate Scheduled" button in dashboard
4. Verify the poll appears in the experience view
5. Verify the poll moves from "Scheduled" to "Active" tab in dashboard

### Script Testing
```bash
# Run the activation script
node scripts/activate-scheduled-polls.js
```

## User Experience

### Dashboard View
- **All Polls Tab**: Shows all polls regardless of status
- **Active Tab**: Shows only active polls
- **Expired Tab**: Shows only expired polls  
- **Scheduled Tab**: Shows only scheduled polls
- **Manual Activation Button**: For testing and manual activation

### Experience View
- Only shows active polls that users can vote on
- Scheduled polls are hidden until they become active
- Real-time updates when polls are activated

## Troubleshooting

### Polls Not Activating
1. Check if the database function `activate_scheduled_polls()` exists
2. Verify the `scheduled_at` column exists in the polls table
3. Check the status constraint includes 'scheduled'
4. Use the manual activation button to test

### Real-time Updates Not Working
1. Verify Supabase real-time is enabled
2. Check browser console for subscription errors
3. Ensure the hooks are properly configured

### Cron Job Issues
1. Verify the `CRON_SECRET` environment variable is set
2. Check the authorization header in cron requests
3. Monitor the API endpoint logs for errors
