-- Migration: Create lead_timeline_events table
-- B6.1: Lead Timeline Events for tracking lead journey stages
--
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.lead_timeline_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'consultant',
  note TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_timeline_events_lead_id_created_at 
  ON public.lead_timeline_events(lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_timeline_events_stage 
  ON public.lead_timeline_events(stage);

-- Enable Row Level Security
ALTER TABLE public.lead_timeline_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Allow authenticated select" ON public.lead_timeline_events;
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.lead_timeline_events;
DROP POLICY IF EXISTS "Allow authenticated update" ON public.lead_timeline_events;

-- Policy: Allow SELECT for authenticated users
CREATE POLICY "Allow authenticated select" ON public.lead_timeline_events
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow INSERT for authenticated users
CREATE POLICY "Allow authenticated insert" ON public.lead_timeline_events
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow UPDATE for authenticated users
CREATE POLICY "Allow authenticated update" ON public.lead_timeline_events
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.lead_timeline_events IS 'Tracks lead journey stages and events with actor roles and optional notes';

