-- Simplify subscription system to be user-based only
-- This removes the complexity of company_id and experience_id for subscription status

-- First, let's see the current structure
SELECT * FROM user_subscriptions LIMIT 5;

-- Create a new simplified user_subscriptions table
CREATE TABLE IF NOT EXISTS user_subscriptions_simple (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE, -- Only user_id, no company/experience dependency
  subscription_status text DEFAULT 'free'::text CHECK (subscription_status = ANY (ARRAY['free'::text, 'pro'::text, 'cancelled'::text])),
  plan_id text,
  access_pass_id text,
  subscription_started_at timestamp with time zone,
  subscription_ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_subscriptions_simple_pkey PRIMARY KEY (id)
);

-- Migrate existing data (keep only the latest subscription per user)
INSERT INTO user_subscriptions_simple (user_id, subscription_status, plan_id, access_pass_id, subscription_started_at, subscription_ends_at, created_at, updated_at)
SELECT DISTINCT ON (user_id)
  user_id,
  subscription_status,
  plan_id,
  access_pass_id,
  subscription_started_at,
  subscription_ends_at,
  created_at,
  updated_at
FROM user_subscriptions
ORDER BY user_id, updated_at DESC
ON CONFLICT (user_id) DO NOTHING;

-- Update the user_poll_usage table to also be user-based only
-- (This makes sense since poll limits should be per user, not per company/experience)
CREATE TABLE IF NOT EXISTS user_poll_usage_simple (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE, -- Only user_id
  total_polls_created integer DEFAULT 0 CHECK (total_polls_created >= 0),
  active_polls_count integer DEFAULT 0 CHECK (active_polls_count >= 0),
  last_poll_created_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_poll_usage_simple_pkey PRIMARY KEY (id)
);

-- Migrate existing usage data (sum up all polls per user across all companies/experiences)
INSERT INTO user_poll_usage_simple (user_id, total_polls_created, active_polls_count, last_poll_created_at, created_at, updated_at)
SELECT 
  user_id,
  SUM(total_polls_created) as total_polls_created,
  SUM(active_polls_count) as active_polls_count,
  MAX(last_poll_created_at) as last_poll_created_at,
  MIN(created_at) as created_at,
  MAX(updated_at) as updated_at
FROM user_poll_usage
GROUP BY user_id
ON CONFLICT (user_id) DO NOTHING;

-- Show the simplified data
SELECT 'user_subscriptions_simple' as table_name, COUNT(*) as count FROM user_subscriptions_simple
UNION ALL
SELECT 'user_poll_usage_simple' as table_name, COUNT(*) as count FROM user_poll_usage_simple;
