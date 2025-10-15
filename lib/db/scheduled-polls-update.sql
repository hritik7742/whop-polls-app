-- Add scheduled polls support to existing database
-- This script adds the scheduled_at column and updates the status constraint

-- Add scheduled_at column to polls table
ALTER TABLE polls ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMP WITH TIME ZONE;

-- Update the status constraint to include 'scheduled'
ALTER TABLE polls DROP CONSTRAINT IF EXISTS polls_status_check;
ALTER TABLE polls ADD CONSTRAINT polls_status_check 
  CHECK (status IN ('active', 'expired', 'scheduled'));

-- Create index for scheduled polls queries
CREATE INDEX IF NOT EXISTS idx_polls_scheduled_at ON polls(scheduled_at) WHERE scheduled_at IS NOT NULL;

-- Create index for status queries
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);

-- Update existing polls to have proper status based on scheduled_at
UPDATE polls 
SET status = 'scheduled' 
WHERE scheduled_at IS NOT NULL 
  AND scheduled_at > NOW() 
  AND status = 'active';

-- Function to automatically activate scheduled polls
CREATE OR REPLACE FUNCTION activate_scheduled_polls()
RETURNS void AS $$
BEGIN
  UPDATE polls 
  SET status = 'active' 
  WHERE status = 'scheduled' 
    AND scheduled_at IS NOT NULL 
    AND scheduled_at <= NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically activate scheduled polls
-- This would typically be called by a cron job or scheduled task
-- For now, we'll create the function that can be called manually or via cron

-- Add comment to explain the scheduled polls feature
COMMENT ON COLUMN polls.scheduled_at IS 'When the poll should be activated. If NULL, poll is active immediately.';
COMMENT ON COLUMN polls.status IS 'Poll status: active (currently accepting votes), expired (no longer accepting votes), scheduled (waiting to be activated)';
