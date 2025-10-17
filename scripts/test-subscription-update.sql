-- Test script to manually update subscription status (SIMPLIFIED - USER-BASED ONLY)
-- Replace the value below with your actual user ID

-- First, let's see what subscriptions exist
SELECT 
  user_id,
  subscription_status,
  plan_id,
  created_at,
  updated_at
FROM user_subscriptions_simple 
WHERE user_id = 'YOUR_USER_ID_HERE';  -- Replace with your actual user ID

-- Update subscription to 'pro' status (much simpler - just user_id)
UPDATE user_subscriptions_simple 
SET 
  subscription_status = 'pro',
  plan_id = 'test_pro_plan',
  access_pass_id = 'test_access_pass',
  subscription_started_at = NOW(),
  subscription_ends_at = NOW() + INTERVAL '1 year',
  updated_at = NOW()
WHERE user_id = 'YOUR_USER_ID_HERE';  -- Replace with your actual user ID

-- If no subscription exists, insert a new one (much simpler)
INSERT INTO user_subscriptions_simple (
  user_id,
  subscription_status,
  plan_id,
  access_pass_id,
  subscription_started_at,
  subscription_ends_at
) VALUES (
  'YOUR_USER_ID_HERE',  -- Replace with your actual user ID
  'pro',
  'test_pro_plan',
  'test_access_pass',
  NOW(),
  NOW() + INTERVAL '1 year'
) ON CONFLICT (user_id) 
DO UPDATE SET
  subscription_status = 'pro',
  plan_id = 'test_pro_plan',
  access_pass_id = 'test_access_pass',
  subscription_started_at = NOW(),
  subscription_ends_at = NOW() + INTERVAL '1 year',
  updated_at = NOW();

-- Check the updated subscription
SELECT 
  user_id,
  subscription_status,
  plan_id,
  created_at,
  updated_at
FROM user_subscriptions_simple 
WHERE user_id = 'YOUR_USER_ID_HERE';  -- Replace with your actual user ID

-- Also check polls count for this user (across all companies/experiences)
SELECT 
  COUNT(*) as total_polls,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_polls
FROM polls 
WHERE creator_user_id = 'YOUR_USER_ID_HERE';  -- Replace with your actual user ID
