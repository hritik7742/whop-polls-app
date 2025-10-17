-- Migration Script: Update existing schema to improved version
-- Run this script to update your existing database with the improvements

-- Step 1: Add missing unique constraints
-- Add unique constraint to user_poll_usage
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_poll_usage_unique'
    ) THEN
        ALTER TABLE public.user_poll_usage 
        ADD CONSTRAINT user_poll_usage_unique UNIQUE (user_id, company_id, experience_id);
    END IF;
END $$;

-- Add unique constraint to user_subscriptions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_subscriptions_unique'
    ) THEN
        ALTER TABLE public.user_subscriptions 
        ADD CONSTRAINT user_subscriptions_unique UNIQUE (user_id, company_id, experience_id);
    END IF;
END $$;

-- Add unique constraint to poll_votes (one vote per user per poll)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'poll_votes_user_poll_unique'
    ) THEN
        ALTER TABLE public.poll_votes 
        ADD CONSTRAINT poll_votes_user_poll_unique UNIQUE (poll_id, user_id);
    END IF;
END $$;

-- Step 2: Add missing check constraints
-- Add check constraints to polls table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'polls_expires_at_check'
    ) THEN
        ALTER TABLE public.polls 
        ADD CONSTRAINT polls_expires_at_check CHECK (expires_at > created_at);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'polls_scheduled_at_check'
    ) THEN
        ALTER TABLE public.polls 
        ADD CONSTRAINT polls_scheduled_at_check CHECK (scheduled_at IS NULL OR scheduled_at > created_at);
    END IF;
END $$;

-- Add check constraints to poll_options
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'poll_options_vote_count_check'
    ) THEN
        ALTER TABLE public.poll_options 
        ADD CONSTRAINT poll_options_vote_count_check CHECK (vote_count >= 0);
    END IF;
END $$;

-- Add check constraints to user_poll_usage
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_poll_usage_total_polls_check'
    ) THEN
        ALTER TABLE public.user_poll_usage 
        ADD CONSTRAINT user_poll_usage_total_polls_check CHECK (total_polls_created >= 0);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_poll_usage_active_polls_check'
    ) THEN
        ALTER TABLE public.user_poll_usage 
        ADD CONSTRAINT user_poll_usage_active_polls_check CHECK (active_polls_count >= 0);
    END IF;
END $$;

-- Add check constraints to user_subscriptions
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_subscriptions_dates_check'
    ) THEN
        ALTER TABLE public.user_subscriptions 
        ADD CONSTRAINT user_subscriptions_dates_check CHECK (
            subscription_started_at IS NULL OR 
            subscription_ends_at IS NULL OR 
            subscription_ends_at > subscription_started_at
        );
    END IF;
END $$;

-- Step 3: Update foreign key constraints to use CASCADE
-- Update poll_options foreign key
ALTER TABLE public.poll_options 
DROP CONSTRAINT IF EXISTS poll_options_poll_id_fkey;

ALTER TABLE public.poll_options 
ADD CONSTRAINT poll_options_poll_id_fkey 
FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;

-- Update poll_votes foreign keys
ALTER TABLE public.poll_votes 
DROP CONSTRAINT IF EXISTS poll_votes_poll_id_fkey;

ALTER TABLE public.poll_votes 
ADD CONSTRAINT poll_votes_poll_id_fkey 
FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;

ALTER TABLE public.poll_votes 
DROP CONSTRAINT IF EXISTS poll_votes_option_id_fkey;

ALTER TABLE public.poll_votes 
ADD CONSTRAINT poll_votes_option_id_fkey 
FOREIGN KEY (option_id) REFERENCES public.poll_options(id) ON DELETE CASCADE;

-- Update poll_notifications_sent foreign key
ALTER TABLE public.poll_notifications_sent 
DROP CONSTRAINT IF EXISTS poll_notifications_sent_poll_id_fkey;

ALTER TABLE public.poll_notifications_sent 
ADD CONSTRAINT poll_notifications_sent_poll_id_fkey 
FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE;

-- Step 4: Create performance indexes
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

-- Step 5: Create or update database functions
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

-- Step 6: Enable Row Level Security (optional - only if you want to use RLS)
-- Uncomment the following lines if you want to enable RLS

/*
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_poll_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_notifications_sent ENABLE ROW LEVEL SECURITY;
*/

-- Step 7: Add comments for documentation
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

-- Migration completed successfully
SELECT 'Migration completed successfully! Your database schema has been improved.' as status;
