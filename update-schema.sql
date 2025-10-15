-- Remove the problematic trigger and function
DROP TRIGGER IF EXISTS poll_status_trigger ON polls;
DROP FUNCTION IF EXISTS trigger_update_poll_status();

-- Keep the update function but remove the trigger
-- Function to update poll status based on expiry (called from application)
CREATE OR REPLACE FUNCTION update_poll_status()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'expired' 
  WHERE expires_at < NOW() AND status = 'active';
END;
$$ LANGUAGE plpgsql;
