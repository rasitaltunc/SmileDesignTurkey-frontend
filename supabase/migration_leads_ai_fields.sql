-- Migration: Add AI analysis fields to leads table
-- Purpose: Store AI-generated risk scores and summaries
-- Run in Supabase Dashboard > SQL Editor

-- Add AI analysis fields (if they don't exist)
DO $$ 
BEGIN
  -- Add ai_risk_score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'ai_risk_score'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN ai_risk_score INTEGER CHECK (ai_risk_score >= 0 AND ai_risk_score <= 100);
  END IF;

  -- Add ai_summary column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'ai_summary'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN ai_summary TEXT;
  END IF;

  -- Add ai_last_analyzed_at column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leads' AND column_name = 'ai_last_analyzed_at'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN ai_last_analyzed_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for AI analysis queries
CREATE INDEX IF NOT EXISTS idx_leads_ai_risk_score 
  ON public.leads(ai_risk_score) 
  WHERE ai_risk_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_ai_last_analyzed_at 
  ON public.leads(ai_last_analyzed_at DESC) 
  WHERE ai_last_analyzed_at IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN public.leads.ai_risk_score IS 'AI-generated risk score (0-100) based on booking behavior';
COMMENT ON COLUMN public.leads.ai_summary IS 'AI-generated call briefing with what happened and what to say';
COMMENT ON COLUMN public.leads.ai_last_analyzed_at IS 'Timestamp of last AI analysis';

