# Debug Multi-User Voting Issue

## Problem
Only your votes are being saved to the database, not other users' votes.

## Debug Steps

### 1. Check SDK Configuration
Visit: `https://your-app.com/api/debug/sdk-config`

This will show:
- Environment variables status
- Whether SDK is using mock or real implementation
- Available SDK methods

**Expected**: Should show `sdkType: 'REAL'` and all environment variables should be `SET`

### 2. Test Authentication
Visit: `https://your-app.com/api/debug/auth`

This will show:
- All headers received
- User authentication result
- User details
- Any authentication errors

**Expected**: Should show different `userId` values for different users

### 3. Check Database State
Visit: `https://your-app.com/api/debug/database`

This will show:
- All votes in the database
- Unique users who have voted
- Vote counts per user
- Poll and option data

**Expected**: Should show multiple users in the `users` array

### 4. Test Voting with Different Users

1. **Open the app in an incognito window**
2. **Login with a different user account**
3. **Vote on a poll**
4. **Check the logs** in your application console
5. **Check the database** using the debug endpoint

### 5. Check Application Logs

Look for these log messages when users vote:

```
🔐 User authenticated successfully: [user-id]
🗳️ About to save vote: { pollId: '...', option_id: '...', userId: '...' }
✅ Vote saved successfully for user: [user-id]
```

**Expected**: Should see different `userId` values for different users

## Common Issues and Solutions

### Issue 1: SDK Using Mock Implementation
**Symptoms**: All users get the same mock user ID
**Solution**: Check environment variables are set correctly

### Issue 2: Authentication Headers Not Passed
**Symptoms**: Authentication fails for all users
**Solution**: Check if headers are being passed from frontend to backend

### Issue 3: Whop SDK Configuration
**Symptoms**: All requests use the same user context
**Solution**: Ensure SDK is not using fixed `onBehalfOfUserId`

### Issue 4: Database Constraints
**Symptoms**: Votes are not being inserted
**Solution**: Check for unique constraint violations

## Quick Fixes to Try

### 1. Restart the Application
Sometimes the SDK configuration gets cached. Restart your application.

### 2. Check Environment Variables
Ensure these are set correctly:
- `NEXT_PUBLIC_WHOP_APP_ID`
- `WHOP_API_KEY`
- `NEXT_PUBLIC_WHOP_AGENT_USER_ID` (optional)
- `NEXT_PUBLIC_WHOP_COMPANY_ID` (optional)

### 3. Clear Browser Cache
Users might be using cached authentication tokens.

### 4. Test in Different Browsers
Test with different browsers and incognito windows.

## Debugging Commands

### Check Current Database State
```sql
-- Run this in your Supabase SQL editor
SELECT 
  user_id,
  COUNT(*) as vote_count,
  MIN(voted_at) as first_vote,
  MAX(voted_at) as last_vote
FROM poll_votes
GROUP BY user_id
ORDER BY vote_count DESC;
```

### Check Recent Votes
```sql
-- Run this in your Supabase SQL editor
SELECT 
  pv.user_id,
  p.question,
  po.option_text,
  pv.voted_at
FROM poll_votes pv
JOIN polls p ON pv.poll_id = p.id
JOIN poll_options po ON pv.option_id = po.id
WHERE pv.voted_at >= NOW() - INTERVAL '1 hour'
ORDER BY pv.voted_at DESC;
```

## Expected Results After Fix

1. **Different users should get different user IDs** when authenticating
2. **Each user's vote should be saved** with their unique user ID
3. **Database should show multiple users** in the poll_votes table
4. **Vote counts should be accurate** for all users

## Next Steps

1. Run the debug endpoints
2. Check the results
3. Share the results if the issue persists
4. We can then identify the specific problem and fix it

## Contact

If you're still having issues after following these steps, please share:
1. Results from the debug endpoints
2. Application logs
3. Database query results
4. Any error messages
