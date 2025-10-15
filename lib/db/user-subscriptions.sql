-- User subscription tracking table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  company_id text NOT NULL,
  experience_id text NOT NULL,
  subscription_status text DEFAULT 'free' CHECK (subscription_status IN ('free', 'pro', 'cancelled')),
  plan_id text,
  access_pass_id text,
  subscription_started_at timestamp with time zone,
  subscription_ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_user_company_unique UNIQUE (user_id, company_id, experience_id)
);

-- User poll usage tracking table
CREATE TABLE IF NOT EXISTS public.user_poll_usage (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  company_id text NOT NULL,
  experience_id text NOT NULL,
  total_polls_created integer DEFAULT 0,
  active_polls_count integer DEFAULT 0,
  last_poll_created_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_poll_usage_pkey PRIMARY KEY (id),
  CONSTRAINT user_poll_usage_user_company_unique UNIQUE (user_id, company_id, experience_id)
);

-- Function to update user poll usage
CREATE OR REPLACE FUNCTION update_user_poll_usage()
RETURNS TRIGGER AS $$
BEGIN
  -- Update poll count when a poll is created
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_poll_usage (user_id, company_id, experience_id, total_polls_created, active_polls_count, last_poll_created_at)
    VALUES (NEW.creator_user_id, NEW.company_id, NEW.experience_id, 1, 1, NEW.created_at)
    ON CONFLICT (user_id, company_id, experience_id)
    DO UPDATE SET
      total_polls_created = user_poll_usage.total_polls_created + 1,
      active_polls_count = user_poll_usage.active_polls_count + 1,
      last_poll_created_at = NEW.created_at,
      updated_at = now();
  END IF;

  -- Update poll count when a poll is deleted
  IF TG_OP = 'DELETE' THEN
    UPDATE user_poll_usage
    SET active_polls_count = GREATEST(active_polls_count - 1, 0),
        updated_at = now()
    WHERE user_id = OLD.creator_user_id 
      AND company_id = OLD.company_id 
      AND experience_id = OLD.experience_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for poll usage tracking
DROP TRIGGER IF EXISTS poll_usage_insert_trigger ON polls;
CREATE TRIGGER poll_usage_insert_trigger
  AFTER INSERT ON polls
  FOR EACH ROW
  EXECUTE FUNCTION update_user_poll_usage();

DROP TRIGGER IF EXISTS poll_usage_delete_trigger ON polls;
CREATE TRIGGER poll_usage_delete_trigger
  AFTER DELETE ON polls
  FOR EACH ROW
  EXECUTE FUNCTION update_user_poll_usage();

-- Function to check if user can create more polls
CREATE OR REPLACE FUNCTION can_user_create_poll(
  p_user_id text,
  p_company_id text,
  p_experience_id text
)
RETURNS boolean AS $$
DECLARE
  user_subscription text;
  current_poll_count integer;
  max_free_polls integer := 3;
BEGIN
  -- Get user subscription status
  SELECT subscription_status INTO user_subscription
  FROM user_subscriptions
  WHERE user_id = p_user_id 
    AND company_id = p_company_id 
    AND experience_id = p_experience_id;

  -- If user has pro subscription, they can create unlimited polls
  IF user_subscription = 'pro' THEN
    RETURN true;
  END IF;

  -- For free users, check poll count
  SELECT COALESCE(active_polls_count, 0) INTO current_poll_count
  FROM user_poll_usage
  WHERE user_id = p_user_id 
    AND company_id = p_company_id 
    AND experience_id = p_experience_id;

  -- Allow if under the limit
  RETURN current_poll_count < max_free_polls;
END;
$$ LANGUAGE plpgsql;

-- Function to get user poll usage info
CREATE OR REPLACE FUNCTION get_user_poll_usage(
  p_user_id text,
  p_company_id text,
  p_experience_id text
)
RETURNS TABLE(
  subscription_status text,
  total_polls_created integer,
  active_polls_count integer,
  can_create_more boolean,
  max_free_polls integer
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(us.subscription_status, 'free') as subscription_status,
    COALESCE(upu.total_polls_created, 0) as total_polls_created,
    COALESCE(upu.active_polls_count, 0) as active_polls_count,
    can_user_create_poll(p_user_id, p_company_id, p_experience_id) as can_create_more,
    3 as max_free_polls
  FROM user_subscriptions us
  FULL OUTER JOIN user_poll_usage upu ON (
    us.user_id = upu.user_id 
    AND us.company_id = upu.company_id 
    AND us.experience_id = upu.experience_id
  )
  WHERE (us.user_id = p_user_id AND us.company_id = p_company_id AND us.experience_id = p_experience_id)
     OR (upu.user_id = p_user_id AND upu.company_id = p_company_id AND upu.experience_id = p_experience_id)
     OR (us.user_id IS NULL AND upu.user_id IS NULL);
END;
$$ LANGUAGE plpgsql;
