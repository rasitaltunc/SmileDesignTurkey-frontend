-- Migration: Add engagement signals to leads table
-- Purpose: Strengthen AI analysis with additional behavioral data
-- Run in Supabase Dashboard > SQL Editor

-- Add last_contacted_at column (track when lead was last contacted)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'last_contacted_at'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN last_contacted_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for staleness queries
CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at 
  ON public.leads(last_contacted_at DESC) 
  WHERE last_contacted_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.leads.last_contacted_at IS 'Timestamp of last contact (manual or automated). Used for staleness detection in AI analysis.';

-- Note: This column should be updated when:
-- 1. Admin/employee adds a note
-- 2. Status changes
-- 3. Automated follow-up is sent
-- Implementation: Add trigger or update in application code

