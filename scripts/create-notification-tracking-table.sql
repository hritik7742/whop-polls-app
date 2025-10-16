-- Create table to track which polls have sent notifications
-- This prevents duplicate notifications and tracks notification history

CREATE TABLE IF NOT EXISTS public.poll_notifications_sent (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL,
  experience_id text NOT NULL,
  creator_user_id text NOT NULL,
  sent_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT poll_notifications_sent_pkey PRIMARY KEY (id),
  CONSTRAINT poll_notifications_sent_poll_id_fkey FOREIGN KEY (poll_id) REFERENCES public.polls(id) ON DELETE CASCADE,
  CONSTRAINT poll_notifications_sent_unique UNIQUE (poll_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_poll_notifications_sent_poll_id ON public.poll_notifications_sent(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_notifications_sent_experience_id ON public.poll_notifications_sent(experience_id);
CREATE INDEX IF NOT EXISTS idx_poll_notifications_sent_sent_at ON public.poll_notifications_sent(sent_at);

-- Add comment
COMMENT ON TABLE public.poll_notifications_sent IS 'Tracks which polls have sent notifications to prevent duplicates';
COMMENT ON COLUMN public.poll_notifications_sent.poll_id IS 'Reference to the poll that sent notification';
COMMENT ON COLUMN public.poll_notifications_sent.experience_id IS 'Experience where notification was sent';
COMMENT ON COLUMN public.poll_notifications_sent.creator_user_id IS 'User who created the poll';
COMMENT ON COLUMN public.poll_notifications_sent.sent_at IS 'When the notification was sent';
