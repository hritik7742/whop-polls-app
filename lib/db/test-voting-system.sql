-- Test script to verify voting system is working correctly
-- Run this after applying the voting-system-fix.sql

-- 1. Check if all necessary functions exist
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN (
  'increment_vote_count',
  'decrement_vote_count', 
  'get_poll_stats',
  'user_voted_on_poll',
  'update_poll_status',
  'activate_scheduled_polls',
  'recalculate_vote_counts',
  'fix_vote_count_inconsistencies'
)
ORDER BY routine_name;

-- 2. Check if unique constraint exists on poll_votes
SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'poll_votes' 
AND constraint_type = 'UNIQUE';

-- 3. Check if real-time is enabled for all tables
SELECT 
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
AND tablename IN ('polls', 'poll_options', 'poll_votes')
ORDER BY tablename;

-- 4. Check for any vote count inconsistencies
SELECT * FROM fix_vote_count_inconsistencies();

-- 5. Test the voting functions with sample data (if any polls exist)
DO $$
DECLARE
  test_poll_id UUID;
  test_option_id UUID;
  test_user_id TEXT := 'test-user-123';
BEGIN
  -- Find a poll to test with
  SELECT id INTO test_poll_id FROM polls LIMIT 1;
  
  IF test_poll_id IS NOT NULL THEN
    -- Find an option to test with
    SELECT id INTO test_option_id FROM poll_options WHERE poll_id = test_poll_id LIMIT 1;
    
    IF test_option_id IS NOT NULL THEN
      -- Test increment function
      PERFORM increment_vote_count(test_option_id);
      RAISE NOTICE 'Increment test passed for option %', test_option_id;
      
      -- Test decrement function
      PERFORM decrement_vote_count(test_option_id);
      RAISE NOTICE 'Decrement test passed for option %', test_option_id;
      
      -- Test get_poll_stats function
      PERFORM get_poll_stats(test_poll_id);
      RAISE NOTICE 'get_poll_stats test passed for poll %', test_poll_id;
      
      -- Test user_voted_on_poll function
      PERFORM user_voted_on_poll(test_poll_id, test_user_id);
      RAISE NOTICE 'user_voted_on_poll test passed for poll % and user %', test_poll_id, test_user_id;
    ELSE
      RAISE NOTICE 'No poll options found to test with';
    END IF;
  ELSE
    RAISE NOTICE 'No polls found to test with';
  END IF;
END $$;

-- 6. Show current vote counts for all polls (if any exist)
SELECT 
  p.id as poll_id,
  p.question,
  po.id as option_id,
  po.option_text,
  po.vote_count,
  COUNT(pv.id) as actual_votes
FROM polls p
LEFT JOIN poll_options po ON p.id = po.poll_id
LEFT JOIN poll_votes pv ON po.id = pv.option_id
GROUP BY p.id, p.question, po.id, po.option_text, po.vote_count
ORDER BY p.created_at DESC, po.created_at;

-- Success message
SELECT 'Voting system test completed!' as message;
