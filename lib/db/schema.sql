-- Supabase Database Schema for Whop Polls App

-- Enable Row Level Security
ALTER TABLE IF EXISTS polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS poll_votes ENABLE ROW LEVEL SECURITY;

-- Create polls table
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

-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL CHECK (length(option_text) <= 100),
  vote_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(poll_id, user_id) -- Ensure one vote per user per poll
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_company_id ON polls(company_id);
CREATE INDEX IF NOT EXISTS idx_polls_experience_id ON polls(experience_id);
CREATE INDEX IF NOT EXISTS idx_polls_creator_user_id ON polls(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);

-- Row Level Security Policies

-- Polls: Users can read polls they have access to, creators can manage their polls
CREATE POLICY "Users can view polls in their experiences" ON polls
  FOR SELECT USING (true); -- This will be filtered by experience access in the app

CREATE POLICY "Creators can manage their polls" ON polls
  FOR ALL USING (creator_user_id = auth.jwt() ->> 'sub');

-- Poll options: Anyone can read, only system can modify
CREATE POLICY "Anyone can view poll options" ON poll_options
  FOR SELECT USING (true);

CREATE POLICY "System can manage poll options" ON poll_options
  FOR ALL USING (false); -- Only server-side operations

-- Poll votes: Users can vote once, can view their own votes
CREATE POLICY "Users can vote on polls" ON poll_votes
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view their own votes" ON poll_votes
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

-- Function to update poll status based on expiry (called from application)
CREATE OR REPLACE FUNCTION update_poll_status()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON polls TO anon, authenticated;
GRANT ALL ON poll_options TO anon, authenticated;
GRANT ALL ON poll_votes TO anon, authenticated;
