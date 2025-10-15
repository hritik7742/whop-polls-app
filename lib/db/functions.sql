-- Database functions for real-time poll functionality

-- Function to automatically update poll status based on expiry
CREATE OR REPLACE FUNCTION update_poll_status()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'active';
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

-- Function to atomically increment vote count
CREATE OR REPLACE FUNCTION increment_vote_count(option_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE poll_options 
  SET vote_count = vote_count + 1 
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql;

-- Enable real-time for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE polls;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
