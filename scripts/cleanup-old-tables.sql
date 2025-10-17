-- Cleanup script to remove old complex subscription tables
-- Run this AFTER you've confirmed the new simplified system is working

-- ⚠️ WARNING: This will permanently delete data from the old tables
-- Make sure you've run the sync script first to migrate data to the new tables

-- 1. Drop the old user_subscriptions table (complex with company_id, experience_id)
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;

-- 2. Drop the old user_poll_usage table (complex with company_id, experience_id)  
DROP TABLE IF EXISTS public.user_poll_usage CASCADE;

-- 3. Drop any old functions that reference the deleted tables
DROP FUNCTION IF EXISTS update_user_poll_usage() CASCADE;
DROP FUNCTION IF EXISTS get_user_poll_usage(text, text, text) CASCADE;

-- 4. Drop any old triggers that used the deleted functions
-- (These should be automatically dropped with the functions, but just in case)
DROP TRIGGER IF EXISTS update_user_poll_usage_on_insert ON polls;
DROP TRIGGER IF EXISTS update_user_poll_usage_on_update ON polls;
DROP TRIGGER IF EXISTS update_user_poll_usage_on_delete ON polls;

-- 5. Show what tables remain (should only show the simplified ones)
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename LIKE '%subscription%' 
   OR tablename LIKE '%usage%'
ORDER BY tablename;

-- 6. Show the simplified tables that should remain
SELECT 'Tables that should remain:' as info;
SELECT 'user_subscriptions_simple' as table_name, 'User-based subscription status' as description
UNION ALL
SELECT 'user_poll_usage_simple' as table_name, 'User-based poll usage tracking' as description;
