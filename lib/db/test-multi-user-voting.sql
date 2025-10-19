-- Test script to verify multi-user voting system is working correctly
-- This script helps identify if the voting system properly handles multiple users

-- 1. Check current vote data in the database
SELECT 
  'Current Vote Data' as test_name,
  COUNT(*) as total_votes,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT poll_id) as unique_polls
FROM poll_votes;

-- 2. Show all votes with user details
SELECT 
  'All Votes by User' as test_name,
  pv.user_id,
  pv.poll_id,
  p.question as poll_question,
  po.option_text,
  pv.voted_at
FROM poll_votes pv
JOIN polls p ON pv.poll_id = p.id
JOIN poll_options po ON pv.option_id = po.id
ORDER BY pv.voted_at DESC;

-- 3. Check vote counts per poll option
SELECT 
  'Vote Counts per Option' as test_name,
  p.id as poll_id,
  p.question as poll_question,
  po.id as option_id,
  po.option_text,
  po.vote_count as stored_count,
  COUNT(pv.id) as actual_votes,
  CASE 
    WHEN po.vote_count = COUNT(pv.id) THEN '✅ Consistent'
    ELSE '❌ Inconsistent'
  END as status
FROM polls p
JOIN poll_options po ON p.id = po.poll_id
LEFT JOIN poll_votes pv ON po.id = pv.option_id
GROUP BY p.id, p.question, po.id, po.option_text, po.vote_count
ORDER BY p.created_at DESC, po.created_at;

-- 4. Check for duplicate votes (should be 0 due to unique constraint)
SELECT 
  'Duplicate Vote Check' as test_name,
  poll_id,
  user_id,
  COUNT(*) as vote_count
FROM poll_votes
GROUP BY poll_id, user_id
HAVING COUNT(*) > 1;

-- 5. Show user voting patterns
SELECT 
  'User Voting Patterns' as test_name,
  user_id,
  COUNT(*) as total_votes,
  COUNT(DISTINCT poll_id) as polls_voted_on,
  MIN(voted_at) as first_vote,
  MAX(voted_at) as last_vote
FROM poll_votes
GROUP BY user_id
ORDER BY total_votes DESC;

-- 6. Check if vote counts match actual votes
SELECT 
  'Vote Count Consistency Check' as test_name,
  COUNT(*) as total_inconsistencies
FROM (
  SELECT 
    po.id as option_id,
    po.vote_count as stored_count,
    COUNT(pv.id) as actual_count
  FROM poll_options po
  LEFT JOIN poll_votes pv ON po.id = pv.option_id
  GROUP BY po.id, po.vote_count
  HAVING po.vote_count != COUNT(pv.id)
) inconsistencies;

-- 7. Show recent voting activity
SELECT 
  'Recent Voting Activity' as test_name,
  pv.user_id,
  p.question as poll_question,
  po.option_text as voted_option,
  pv.voted_at
FROM poll_votes pv
JOIN polls p ON pv.poll_id = p.id
JOIN poll_options po ON pv.option_id = po.id
WHERE pv.voted_at >= NOW() - INTERVAL '1 hour'
ORDER BY pv.voted_at DESC;

-- 8. Test the voting functions
DO $$
DECLARE
  test_poll_id UUID;
  test_option_id UUID;
  test_user_id TEXT := 'test-user-' || EXTRACT(EPOCH FROM NOW())::TEXT;
BEGIN
  -- Find a poll to test with
  SELECT id INTO test_poll_id FROM polls WHERE status = 'active' LIMIT 1;
  
  IF test_poll_id IS NOT NULL THEN
    -- Find an option to test with
    SELECT id INTO test_option_id FROM poll_options WHERE poll_id = test_poll_id LIMIT 1;
    
    IF test_option_id IS NOT NULL THEN
      -- Test inserting a vote
      INSERT INTO poll_votes (poll_id, option_id, user_id) 
      VALUES (test_poll_id, test_option_id, test_user_id);
      
      -- Test increment function
      PERFORM increment_vote_count(test_option_id);
      
      RAISE NOTICE '✅ Test vote inserted for user % on option %', test_user_id, test_option_id;
      
      -- Clean up test vote
      DELETE FROM poll_votes WHERE user_id = test_user_id;
      PERFORM decrement_vote_count(test_option_id);
      
      RAISE NOTICE '✅ Test vote cleaned up';
    ELSE
      RAISE NOTICE '⚠️ No poll options found to test with';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ No active polls found to test with';
  END IF;
END $$;

-- 9. Check database constraints
SELECT 
  'Database Constraints' as test_name,
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_name = 'poll_votes' 
AND constraint_type = 'UNIQUE';

-- 10. Final summary
SELECT 
  'Voting System Summary' as test_name,
  (SELECT COUNT(*) FROM polls) as total_polls,
  (SELECT COUNT(*) FROM poll_options) as total_options,
  (SELECT COUNT(*) FROM poll_votes) as total_votes,
  (SELECT COUNT(DISTINCT user_id) FROM poll_votes) as unique_voters,
  (SELECT COUNT(*) FROM poll_votes WHERE voted_at >= NOW() - INTERVAL '24 hours') as votes_last_24h;

-- Success message
SELECT 'Multi-user voting system test completed!' as message;
