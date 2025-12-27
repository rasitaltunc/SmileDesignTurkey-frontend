-- Migration: Create lead_contact_events table
-- Purpose: Track all contact attempts (Call/WhatsApp/Email) with audit trail
-- Run in Supabase Dashboard > SQL Editor

-- Create lead_contact_events table
CREATE TABLE IF NOT EXISTS public.lead_contact_events (
  id BIGSERIAL PRIMARY KEY,
  lead_id TEXT NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('phone', 'whatsapp', 'email', 'sms', 'other')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Foreign key to leads
ALTER TABLE public.lead_contact_events
  ADD CONSTRAINT fk_lead_contact_events_lead_id
  FOREIGN KEY (lead_id)
  REFERENCES public.leads(id)
  ON DELETE CASCADE;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lead_contact_events_lead_id 
  ON public.lead_contact_events(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_contact_events_created_at 
  ON public.lead_contact_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_contact_events_created_by 
  ON public.lead_contact_events(created_by) 
  WHERE created_by IS NOT NULL;

-- Composite index for "recent contacts for a lead" queries
CREATE INDEX IF NOT EXISTS idx_lead_contact_events_lead_created 
  ON public.lead_contact_events(lead_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.lead_contact_events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin and employee can SELECT
CREATE POLICY "Admin and employee can view contact events"
  ON public.lead_contact_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- RLS Policy: Service role can INSERT (for API endpoints)
-- Note: Service role bypasses RLS, but we define this for clarity
-- Regular authenticated users cannot insert directly (must use API)

-- Comments for documentation
COMMENT ON TABLE public.lead_contact_events IS 'Audit trail of all contact attempts (Call/WhatsApp/Email) for leads';
COMMENT ON COLUMN public.lead_contact_events.channel IS 'Contact channel: phone, whatsapp, email, sms, other';
COMMENT ON COLUMN public.lead_contact_events.note IS 'Optional note about the contact attempt';
COMMENT ON COLUMN public.lead_contact_events.created_by IS 'User ID who made the contact (from auth.users)';

