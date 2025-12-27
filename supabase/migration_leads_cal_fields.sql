-- Migration: Add Cal.com fields to leads table
-- Purpose: Store Cal.com booking information in leads
-- Run in Supabase Dashboard > SQL Editor

-- Add Cal.com booking fields (if they don't exist)
DO $$ 
BEGIN
  -- Add cal_booking_uid column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'cal_booking_uid'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN cal_booking_uid TEXT;
  END IF;

  -- Add cal_booking_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'cal_booking_id'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN cal_booking_id TEXT;
  END IF;

  -- Add meeting_start column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'meeting_start'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN meeting_start TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Add meeting_end column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'meeting_end'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN meeting_end TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Update source CHECK constraint to include 'cal.com'
-- Note: This may fail if constraint doesn't exist, that's okay
DO $$
BEGIN
  ALTER TABLE public.leads 
    DROP CONSTRAINT IF EXISTS leads_source_check;
  
  ALTER TABLE public.leads 
    ADD CONSTRAINT leads_source_check 
    CHECK (source IN ('contact', 'onboarding', 'cal.com'));
EXCEPTION
  WHEN others THEN
    -- Constraint might not exist or might be named differently
    NULL;
END $$;

-- Create unique index on cal_booking_uid (idempotent upsert)
-- This ensures one lead per booking UID
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_cal_booking_uid_unique 
  ON public.leads(cal_booking_uid) 
  WHERE cal_booking_uid IS NOT NULL;

-- Create index for timeline queries
CREATE INDEX IF NOT EXISTS idx_leads_cal_booking_uid 
  ON public.leads(cal_booking_uid) 
  WHERE cal_booking_uid IS NOT NULL;

-- Create index for meeting time queries
CREATE INDEX IF NOT EXISTS idx_leads_meeting_start 
  ON public.leads(meeting_start) 
  WHERE meeting_start IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.leads.cal_booking_uid IS 'Cal.com booking UID (unique identifier from Cal.com)';
COMMENT ON COLUMN public.leads.cal_booking_id IS 'Cal.com booking ID (may differ from UID)';
COMMENT ON COLUMN public.leads.meeting_start IS 'Scheduled meeting start time (from Cal.com)';
COMMENT ON COLUMN public.leads.meeting_end IS 'Scheduled meeting end time (from Cal.com)';

