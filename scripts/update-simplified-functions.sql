-- Update database functions to use simplified user-based subscription system

-- Create simplified update_user_poll_usage function
CREATE OR REPLACE FUNCTION update_user_poll_usage_simple()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle INSERT (new poll created)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO user_poll_usage_simple (user_id, total_polls_created, active_polls_count, last_poll_created_at)
    VALUES (NEW.creator_user_id, 1, 1, NEW.created_at)
    ON CONFLICT (user_id) DO UPDATE SET
      total_polls_created = user_poll_usage_simple.total_polls_created + 1,
      active_polls_count = user_poll_usage_simple.active_polls_count + 1,
      last_poll_created_at = NEW.created_at,
      updated_at = NOW();
    
    RETURN NEW;
  END IF;

  -- Handle UPDATE (poll status changed)
  IF TG_OP = 'UPDATE' THEN
    -- If status changed from active to expired/scheduled, or vice versa
    IF OLD.status != NEW.status THEN
      IF OLD.status = 'active' AND NEW.status IN ('expired', 'scheduled') THEN
        -- Poll became inactive
        UPDATE user_poll_usage_simple
        SET active_polls_count = GREATEST(0, active_polls_count - 1),
            updated_at = NOW()
        WHERE user_id = NEW.creator_user_id;
      ELSIF OLD.status IN ('expired', 'scheduled') AND NEW.status = 'active' THEN
        -- Poll became active
        UPDATE user_poll_usage_simple
        SET active_polls_count = active_polls_count + 1,
            updated_at = NOW()
        WHERE user_id = NEW.creator_user_id;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Handle DELETE (poll deleted)
  IF TG_OP = 'DELETE' THEN
    UPDATE user_poll_usage_simple
    SET total_polls_created = GREATEST(0, total_polls_created - 1),
        active_polls_count = GREATEST(0, active_polls_count - CASE WHEN OLD.status = 'active' THEN 1 ELSE 0 END),
        updated_at = NOW()
    WHERE user_id = OLD.creator_user_id;
    
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for the simplified function
DROP TRIGGER IF EXISTS update_user_poll_usage_on_insert_simple ON polls;
DROP TRIGGER IF EXISTS update_user_poll_usage_on_update_simple ON polls;
DROP TRIGGER IF EXISTS update_user_poll_usage_on_delete_simple ON polls;

CREATE TRIGGER update_user_poll_usage_on_insert_simple
  AFTER INSERT ON polls
  FOR EACH ROW
  EXECUTE FUNCTION update_user_poll_usage_simple();

CREATE TRIGGER update_user_poll_usage_on_update_simple
  AFTER UPDATE ON polls
  FOR EACH ROW
  EXECUTE FUNCTION update_user_poll_usage_simple();

CREATE TRIGGER update_user_poll_usage_on_delete_simple
  AFTER DELETE ON polls
  FOR EACH ROW
  EXECUTE FUNCTION update_user_poll_usage_simple();

-- Create a function to sync existing data to simplified tables
CREATE OR REPLACE FUNCTION sync_to_simplified_tables()
RETURNS void AS $$
BEGIN
  -- Sync user subscriptions
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

  -- Sync user poll usage
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

  RAISE NOTICE 'Successfully synced data to simplified tables';
END;
$$ LANGUAGE plpgsql;

-- Run the sync function
SELECT sync_to_simplified_tables();

-- Show the results
SELECT 'user_subscriptions_simple' as table_name, COUNT(*) as count FROM user_subscriptions_simple
UNION ALL
SELECT 'user_poll_usage_simple' as table_name, COUNT(*) as count FROM user_poll_usage_simple;
