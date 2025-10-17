-- Updated Database Schema with Improvements
-- This schema includes all necessary constraints, indexes, and optimizations

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS public.poll_votes CASCADE;
DROP TABLE IF EXISTS public.poll_options CASCADE;
DROP TABLE IF EXISTS public.poll_notifications_sent CASCADE;
DROP TABLE IF EXISTS public.polls CASCADE;
DROP TABLE IF EXISTS public.user_poll_usage CASCADE;
DROP TABLE IF EXISTS public.user_subscriptions CASCADE;

-- Create polls table with improved constraints
CREATE TABLE public.polls (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  question text NOT NULL CHECK (length(question) >= 1 AND length(question) <= 500),
  company_id text NOT NULL CHECK (length(company_id) >= 1),
  experience_id text NOT NULL CHECK (length(experience_id) >= 1),
  creator_user_id text NOT NULL CHECK (length(creator_user_id) >= 1),
  expires_at timestamp with time zone NOT NULL,
  is_anonymous boolean DEFAULT false,
  send_notification boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'scheduled'::text])),
  scheduled_at timestamp with time zone,
  CONSTRAINT polls_pkey PRIMARY KEY (id),
  CONSTRAINT polls_expires_at_check CHECK (expires_at > created_at),
  CONSTRAINT polls_scheduled_at_check CHECK (scheduled_at IS NULL OR scheduled_at > created_at)
);

-- Create poll_options table with improved constraints
CREATE TABLE public.poll_options (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  option_text text NOT NULL CHECK (length(option_text) >= 1 AND length(option_text) <= 100),
  vote_count integer DEFAULT 0 CHECK (vote_count >= 0),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT poll_options_pkey PRIMARY KEY (id),
  CONSTRAINT poll_options_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE
);

-- Create poll_votes table with improved constraints
CREATE TABLE public.poll_votes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  option_id uuid NOT NULL,
  user_id text NOT NULL CHECK (length(user_id) >= 1),
  voted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT poll_votes_pkey PRIMARY KEY (id),
  CONSTRAINT poll_votes_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
  CONSTRAINT poll_votes_option_id_fkey FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE,
  -- Ensure one vote per user per poll
  CONSTRAINT poll_votes_user_poll_unique UNIQUE (poll_id, user_id)
);

-- Create user_poll_usage table with improved constraints
CREATE TABLE public.user_poll_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL CHECK (length(user_id) >= 1),
  company_id text NOT NULL CHECK (length(company_id) >= 1),
  experience_id text NOT NULL CHECK (length(experience_id) >= 1),
  total_polls_created integer DEFAULT 0 CHECK (total_polls_created >= 0),
  active_polls_count integer DEFAULT 0 CHECK (active_polls_count >= 0),
  last_poll_created_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_poll_usage_pkey PRIMARY KEY (id),
  -- Ensure one usage record per user per company per experience
  CONSTRAINT user_poll_usage_unique UNIQUE (user_id, company_id, experience_id)
);

-- Create user_subscriptions table with improved constraints
CREATE TABLE public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL CHECK (length(user_id) >= 1),
  company_id text NOT NULL CHECK (length(company_id) >= 1),
  experience_id text NOT NULL CHECK (length(experience_id) >= 1),
  subscription_status text DEFAULT 'free'::text CHECK (subscription_status = ANY (ARRAY['free'::text, 'pro'::text, 'cancelled'::text])),
  plan_id text,
  access_pass_id text,
  subscription_started_at timestamp with time zone,
  subscription_ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  -- Ensure one subscription record per user per company per experience
  CONSTRAINT user_subscriptions_unique UNIQUE (user_id, company_id, experience_id),
  -- Validate subscription dates
  CONSTRAINT user_subscriptions_dates_check CHECK (
    subscription_started_at IS NULL OR 
    subscription_ends_at IS NULL OR 
    subscription_ends_at > subscription_started_at
  )
);

-- Create poll_notifications_sent table with improved constraints
CREATE TABLE public.poll_notifications_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  experience_id text NOT NULL CHECK (length(experience_id) >= 1),
  creator_user_id text NOT NULL CHECK (length(creator_user_id) >= 1),
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT poll_notifications_sent_pkey PRIMARY KEY (id),
  CONSTRAINT poll_notifications_sent_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
  -- Ensure one notification record per poll
  CONSTRAINT poll_notifications_sent_poll_unique UNIQUE (poll_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_company_id ON public.polls(company_id);
CREATE INDEX IF NOT EXISTS idx_polls_experience_id ON public.polls(experience_id);
CREATE INDEX IF NOT EXISTS idx_polls_creator_user_id ON public.polls(creator_user_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON public.polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_created_at ON public.polls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_polls_expires_at ON public.polls(expires_at);
CREATE INDEX IF NOT EXISTS idx_polls_scheduled_at ON public.polls(scheduled_at) WHERE scheduled_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_options_created_at ON public.poll_options(created_at);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON public.poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON public.poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_option_id ON public.poll_votes(option_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_voted_at ON public.poll_votes(voted_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_poll_usage_user_id ON public.user_poll_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_poll_usage_company_id ON public.user_poll_usage(company_id);
CREATE INDEX IF NOT EXISTS idx_user_poll_usage_experience_id ON public.user_poll_usage(experience_id);
CREATE INDEX IF NOT EXISTS idx_user_poll_usage_updated_at ON public.user_poll_usage(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_company_id ON public.user_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_experience_id ON public.user_subscriptions(experience_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON public.user_subscriptions(subscription_status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_updated_at ON public.user_subscriptions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_poll_notifications_sent_poll_id ON public.poll_notifications_sent(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_notifications_sent_experience_id ON public.poll_notifications_sent(experience_id);
CREATE INDEX IF NOT EXISTS idx_poll_notifications_sent_sent_at ON public.poll_notifications_sent(sent_at DESC);

-- Enable Row Level Security
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_poll_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_notifications_sent ENABLE ROW LEVEL SECURITY;

-- Row Level Security Policies
-- Note: These policies assume you're using Whop's authentication system

-- Polls: Users can read polls they have access to, creators can manage their polls
CREATE POLICY "Users can view polls in their experiences" ON public.polls
  FOR SELECT USING (true); -- This will be filtered by experience access in the app

CREATE POLICY "Creators can manage their polls" ON public.polls
  FOR ALL USING (creator_user_id = auth.jwt() ->> 'sub');

-- Poll options: Anyone can read, only system can modify
CREATE POLICY "Anyone can view poll options" ON public.poll_options
  FOR SELECT USING (true);

CREATE POLICY "System can manage poll options" ON public.poll_options
  FOR ALL USING (false); -- Only server-side operations

-- Poll votes: Users can vote once, can view their own votes
CREATE POLICY "Users can vote on polls" ON public.poll_votes
  FOR INSERT WITH CHECK (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "Users can view their own votes" ON public.poll_votes
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

-- User poll usage: Users can view and update their own usage
CREATE POLICY "Users can view their own usage" ON public.user_poll_usage
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "System can manage user usage" ON public.user_poll_usage
  FOR ALL USING (false); -- Only server-side operations

-- User subscriptions: Users can view their own subscriptions
CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
  FOR SELECT USING (user_id = auth.jwt() ->> 'sub');

CREATE POLICY "System can manage user subscriptions" ON public.user_subscriptions
  FOR ALL USING (false); -- Only server-side operations

-- Poll notifications: System can manage notifications
CREATE POLICY "System can manage notifications" ON public.poll_notifications_sent
  FOR ALL USING (false); -- Only server-side operations

-- Database functions for real-time functionality
CREATE OR REPLACE FUNCTION public.update_poll_status()
RETURNS void AS $$
BEGIN
  UPDATE public.polls 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.activate_scheduled_polls()
RETURNS void AS $$
BEGIN
  UPDATE public.polls 
  SET status = 'active' 
  WHERE status = 'scheduled' 
    AND scheduled_at IS NOT NULL 
    AND scheduled_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to atomically increment vote count
CREATE OR REPLACE FUNCTION public.increment_vote_count(option_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.poll_options 
  SET vote_count = vote_count + 1 
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql;

-- Function to atomically decrement vote count
CREATE OR REPLACE FUNCTION public.decrement_vote_count(option_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.poll_options 
  SET vote_count = GREATEST(vote_count - 1, 0)
  WHERE id = option_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get poll statistics (for real-time updates)
CREATE OR REPLACE FUNCTION public.get_poll_stats(poll_uuid uuid)
RETURNS TABLE(
  poll_id uuid,
  total_votes bigint,
  option_stats jsonb
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
  FROM public.polls p
  LEFT JOIN public.poll_options po ON p.id = po.poll_id
  WHERE p.id = poll_uuid
  GROUP BY p.id;
END;
$$ LANGUAGE plpgsql;

-- Function to check if user has voted on a poll
CREATE OR REPLACE FUNCTION public.user_voted_on_poll(poll_uuid uuid, user_id text)
RETURNS TABLE(
  has_voted boolean,
  voted_option_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE WHEN pv.id IS NOT NULL THEN true ELSE false END as has_voted,
    pv.option_id as voted_option_id
  FROM public.polls p
  LEFT JOIN public.poll_votes pv ON p.id = pv.poll_id AND pv.user_id = user_voted_on_poll.user_id
  WHERE p.id = poll_uuid
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE public.polls IS 'Stores poll information including questions, metadata, and status';
COMMENT ON TABLE public.poll_options IS 'Stores poll options with vote counts';
COMMENT ON TABLE public.poll_votes IS 'Stores individual votes with user tracking';
COMMENT ON TABLE public.user_poll_usage IS 'Tracks user poll creation usage and limits';
COMMENT ON TABLE public.user_subscriptions IS 'Manages user subscription status and pro features';
COMMENT ON TABLE public.poll_notifications_sent IS 'Tracks which polls have sent notifications to prevent duplicates';

COMMENT ON COLUMN public.polls.status IS 'Poll status: active (currently accepting votes), expired (no longer accepting votes), scheduled (waiting to be activated)';
COMMENT ON COLUMN public.polls.scheduled_at IS 'When the poll should be activated. If NULL, poll is active immediately.';
COMMENT ON COLUMN public.polls.send_notification IS 'Whether to send push notifications when poll becomes active';
COMMENT ON COLUMN public.polls.is_anonymous IS 'Whether votes are anonymous (user_id not tracked)';

COMMENT ON COLUMN public.user_subscriptions.subscription_status IS 'User subscription level: free, pro, or cancelled';
COMMENT ON COLUMN public.user_poll_usage.total_polls_created IS 'Total number of polls created by user (for free tier limits)';
COMMENT ON COLUMN public.user_poll_usage.active_polls_count IS 'Number of currently active polls created by user';
