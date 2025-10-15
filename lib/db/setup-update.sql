-- Updated database setup that handles existing policies gracefully
-- Run this script in your Supabase SQL editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables with proper constraints (these will be skipped if they exist)
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL CHECK (length(question) <= 500),
  company_id TEXT NOT NULL,
  experience_id TEXT NOT NULL,
  creator_user_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  send_notification BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired'))
);

CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL CHECK (length(option_text) <= 100),
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- Ensure one vote per user per poll
);

-- Create indexes for better performance (these will be skipped if they exist)
CREATE INDEX IF NOT EXISTS idx_polls_company_id ON polls(company_id);
CREATE INDEX IF NOT EXISTS idx_polls_experience_id ON polls(experience_id);
CREATE INDEX IF NOT EXISTS idx_polls_creator_user_id ON polls(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON polls(expires_at);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON poll_votes(option_id);

-- Enable Row Level Security (these will be skipped if already enabled)
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first, then recreate them
DROP POLICY IF EXISTS "Users can view polls in their experiences" ON polls;
DROP POLICY IF EXISTS "Creators can manage their polls" ON polls;
DROP POLICY IF EXISTS "Anyone can view poll options" ON poll_options;
DROP POLICY IF EXISTS "System can manage poll options" ON poll_options;
DROP POLICY IF EXISTS "Users can vote on polls" ON poll_votes;
DROP POLICY IF EXISTS "Users can view their own votes" ON poll_votes;

-- Recreate Row Level Security Policies
CREATE POLICY "Users can view polls in their experiences" ON polls
  FOR SELECT USING (true); -- This will be filtered by experience access in the app

CREATE POLICY "Creators can manage their polls" ON polls
  FOR ALL USING (creator_user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Anyone can view poll options" ON poll_options
  FOR SELECT USING (true);

CREATE POLICY "System can manage poll options" ON poll_options
  FOR ALL USING (false); -- Only server-side operations

CREATE POLICY "Users can vote on polls" ON poll_votes
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view their own votes" ON poll_votes
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

-- Database functions for real-time functionality
CREATE OR REPLACE FUNCTION update_poll_status()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION increment_vote_count(option_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE poll_options 
  SET vote_count = vote_count + 1 
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_vote_count(option_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE poll_options 
  SET vote_count = GREATEST(vote_count - 1, 0) 
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql;

-- Enable real-time for all tables (these will be skipped if already enabled)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE polls;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE poll_options;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
  
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE poll_votes;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON polls TO anon, authenticated;
GRANT ALL ON poll_options TO anon, authenticated;
GRANT ALL ON poll_votes TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_poll_status() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_poll_stats(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION user_voted_on_poll(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_vote_count(UUID) TO anon, authenticated;
