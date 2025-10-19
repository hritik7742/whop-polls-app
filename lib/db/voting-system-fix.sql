-- Voting System Fix - Comprehensive Database Update
-- This script fixes all issues with the voting system

-- 1. Ensure poll_votes table has proper constraints
-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'poll_votes_user_poll_unique' 
        AND table_name = 'poll_votes'
    ) THEN
        ALTER TABLE poll_votes 
        ADD CONSTRAINT poll_votes_user_poll_unique UNIQUE (poll_id, user_id);
    END IF;
END $$;

-- 2. Ensure all necessary functions exist and are up to date

-- Function to atomically increment vote count
CREATE OR REPLACE FUNCTION increment_vote_count(option_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE poll_options 
  SET vote_count = vote_count + 1 
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically decrement vote count
CREATE OR REPLACE FUNCTION decrement_vote_count(option_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE poll_options 
  SET vote_count = GREATEST(vote_count - 1, 0) 
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get poll statistics (for real-time updates)
CREATE OR REPLACE FUNCTION get_poll_stats(poll_uuid UUID)
RETURNS TABLE(
  poll_id UUID,
  total_votes BIGINT,
  option_stats JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as poll_id,
    COALESCE(SUM(po.vote_count), 0) as total_votes,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'option_id', po.id,
          'option_text', po.option_text,
          'vote_count', po.vote_count,
          'percentage', CASE 
            WHEN SUM(po.vote_count) OVER() > 0 
            THEN ROUND((po.vote_count::DECIMAL / SUM(po.vote_count) OVER()) * 100)
            ELSE 0 
          END
        )
      ) FILTER (WHERE po.id IS NOT NULL),
      '[]'::jsonb
    ) as option_stats
  FROM polls p
  LEFT JOIN poll_options po ON p.id = po.poll_id
  WHERE p.id = poll_uuid
  GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has voted on a poll
CREATE OR REPLACE FUNCTION user_voted_on_poll(poll_uuid UUID, user_id TEXT)
RETURNS TABLE(
  has_voted BOOLEAN,
  voted_option_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN pv.id IS NOT NULL THEN true ELSE false END as has_voted,
    pv.option_id as voted_option_id
  FROM polls p
  LEFT JOIN poll_votes pv ON p.id = pv.poll_id AND pv.user_id = user_voted_on_poll.user_id
  WHERE p.id = poll_uuid
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically update poll status based on expiry
CREATE OR REPLACE FUNCTION update_poll_status()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Function to activate scheduled polls
CREATE OR REPLACE FUNCTION activate_scheduled_polls()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'active' 
  WHERE status = 'scheduled' AND scheduled_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- 3. Create a function to recalculate vote counts (in case of data inconsistency)
CREATE OR REPLACE FUNCTION recalculate_vote_counts()
RETURNS void AS $$
BEGIN
  -- Update vote counts based on actual votes in poll_votes table
  UPDATE poll_options 
  SET vote_count = (
    SELECT COUNT(*) 
    FROM poll_votes 
    WHERE poll_votes.option_id = poll_options.id
  );
END;
$$ LANGUAGE plpgsql;

-- 4. Create a function to fix any vote count inconsistencies
CREATE OR REPLACE FUNCTION fix_vote_count_inconsistencies()
RETURNS TABLE(
  poll_id UUID,
  option_id UUID,
  stored_count INTEGER,
  actual_count BIGINT,
  fixed BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH vote_counts AS (
    SELECT 
      po.poll_id,
      po.id as option_id,
      po.vote_count as stored_count,
      COUNT(pv.id) as actual_count
    FROM poll_options po
    LEFT JOIN poll_votes pv ON po.id = pv.option_id
    GROUP BY po.poll_id, po.id, po.vote_count
  )
  SELECT 
    vc.poll_id,
    vc.option_id,
    vc.stored_count,
    vc.actual_count,
    (vc.stored_count != vc.actual_count) as fixed
  FROM vote_counts vc
  WHERE vc.stored_count != vc.actual_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Grant necessary permissions
GRANT EXECUTE ON FUNCTION increment_vote_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION decrement_vote_count(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_poll_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION user_voted_on_poll(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_poll_status() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION activate_scheduled_polls() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION recalculate_vote_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION fix_vote_count_inconsistencies() TO anon, authenticated;

-- 6. Enable real-time for all tables (if not already enabled)
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE polls;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Table already in publication, ignore
            NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE poll_options;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Table already in publication, ignore
            NULL;
    END;
    
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
    EXCEPTION
        WHEN duplicate_object THEN
            -- Table already in publication, ignore
            NULL;
    END;
END $$;

-- 7. Create indexes for better performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_polls_company_id ON polls(company_id);
CREATE INDEX IF NOT EXISTS idx_polls_experience_id ON polls(experience_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON polls(expires_at);

-- 8. Run vote count recalculation to fix any existing inconsistencies
SELECT recalculate_vote_counts();

-- 9. Show any inconsistencies that were found and fixed
SELECT * FROM fix_vote_count_inconsistencies();

-- Success message
SELECT 'Voting system fix completed successfully!' as message;
