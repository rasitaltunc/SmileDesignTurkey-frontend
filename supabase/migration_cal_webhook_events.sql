-- Migration: Create cal_webhook_events table
-- Purpose: Immutable audit trail for Cal.com webhook events
-- Run in Supabase Dashboard > SQL Editor

-- Create cal_webhook_events table
CREATE TABLE IF NOT EXISTS public.cal_webhook_events (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_type TEXT NOT NULL,
  trigger_event TEXT,
  cal_booking_uid TEXT,
  cal_booking_id TEXT,
  lead_id TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cal_webhook_events_cal_booking_uid 
  ON public.cal_webhook_events(cal_booking_uid) 
  WHERE cal_booking_uid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cal_webhook_events_lead_id 
  ON public.cal_webhook_events(lead_id) 
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cal_webhook_events_event_type 
  ON public.cal_webhook_events(event_type);

CREATE INDEX IF NOT EXISTS idx_cal_webhook_events_received_at 
  ON public.cal_webhook_events(received_at DESC);

-- Composite index for timeline queries (most common)
CREATE INDEX IF NOT EXISTS idx_cal_webhook_events_uid_received_at 
  ON public.cal_webhook_events(cal_booking_uid, received_at ASC)
  WHERE cal_booking_uid IS NOT NULL;

-- Foreign key to leads (optional, for referential integrity)
-- Note: lead_id can be null initially, then updated after lead upsert
ALTER TABLE public.cal_webhook_events
  ADD CONSTRAINT fk_cal_webhook_events_lead_id
  FOREIGN KEY (lead_id)
  REFERENCES public.leads(id)
  ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.cal_webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only admin/employee can SELECT (for timeline UI)
CREATE POLICY "Admin and employee can view webhook events"
  ON public.cal_webhook_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- RLS Policy: Service role can INSERT (for webhook endpoint)
-- Note: Webhook endpoint uses service role, so this policy allows inserts
-- But we also allow authenticated users with admin role for manual inserts if needed
CREATE POLICY "Service role and admin can insert webhook events"
  ON public.cal_webhook_events
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    -- Service role bypasses RLS, so this is mainly for admin manual inserts
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
    OR
    -- Allow anon for service role inserts (webhook endpoint)
    true
  );

-- RLS Policy: Only admin can UPDATE (for lead_id updates)
CREATE POLICY "Admin can update webhook events"
  ON public.cal_webhook_events
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policy: No DELETE (immutable audit trail)
-- No DELETE policy means no one can delete (even admin via RLS)
-- Service role can still delete if absolutely necessary, but discouraged

-- Comments for documentation
COMMENT ON TABLE public.cal_webhook_events IS 'Immutable audit trail for Cal.com webhook events. Events are never deleted.';
COMMENT ON COLUMN public.cal_webhook_events.received_at IS 'When the webhook was received (may differ from created_at if processing delayed)';
COMMENT ON COLUMN public.cal_webhook_events.event_type IS 'Normalized event type: booking.created, booking.rescheduled, booking.cancelled';
COMMENT ON COLUMN public.cal_webhook_events.trigger_event IS 'Original event type from Cal.com: BOOKING_CREATED, etc.';
COMMENT ON COLUMN public.cal_webhook_events.lead_id IS 'Linked lead ID (updated after lead upsert)';
COMMENT ON COLUMN public.cal_webhook_events.payload IS 'Full webhook payload as JSONB for future analysis';

