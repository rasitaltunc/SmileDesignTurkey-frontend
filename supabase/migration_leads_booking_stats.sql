-- Migration: Add booking statistics columns to leads table
-- Purpose: Fast filtering and dashboard queries
-- Run in Supabase Dashboard > SQL Editor

-- Add booking statistics columns (if they don't exist)
DO $$ 
BEGIN
  -- Add booking_count column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'booking_count'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN booking_count INTEGER DEFAULT 0 NOT NULL;
  END IF;

  -- Add has_rescheduled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'has_rescheduled'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN has_rescheduled BOOLEAN DEFAULT false NOT NULL;
  END IF;

  -- Add has_cancelled column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'has_cancelled'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN has_cancelled BOOLEAN DEFAULT false NOT NULL;
  END IF;
END $$;

-- Create indexes for fast dashboard filtering
CREATE INDEX IF NOT EXISTS leads_has_rescheduled_idx 
  ON public.leads(has_rescheduled) 
  WHERE has_rescheduled = true;

CREATE INDEX IF NOT EXISTS leads_has_cancelled_idx 
  ON public.leads(has_cancelled) 
  WHERE has_cancelled = true;

CREATE INDEX IF NOT EXISTS leads_booking_count_idx 
  ON public.leads(booking_count DESC) 
  WHERE booking_count > 0;

-- Comments for documentation
COMMENT ON COLUMN public.leads.booking_count IS 'Number of booking.created events for this lead (computed from cal_webhook_events)';
COMMENT ON COLUMN public.leads.has_rescheduled IS 'True if lead has any booking.rescheduled events';
COMMENT ON COLUMN public.leads.has_cancelled IS 'True if lead has any booking.cancelled events';

-- Note: These columns should be maintained by:
-- 1. Running backfill_booking_stats.sql periodically
-- 2. (Future) Trigger on cal_webhook_events to auto-update

