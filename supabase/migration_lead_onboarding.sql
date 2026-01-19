-- Lead Onboarding System Migration
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- Creates tables for onboarding card answers and progress tracking

-- Create lead_onboarding_answers table
CREATE TABLE IF NOT EXISTS lead_onboarding_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL,
  answers JSONB NOT NULL,
  CONSTRAINT unique_lead_card UNIQUE (lead_id, card_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_onboarding_answers_lead_id 
  ON lead_onboarding_answers(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_onboarding_answers_card_id 
  ON lead_onboarding_answers(card_id);

-- Create lead_onboarding_state table
CREATE TABLE IF NOT EXISTS lead_onboarding_state (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  completed_card_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for progress queries
CREATE INDEX IF NOT EXISTS idx_lead_onboarding_state_progress 
  ON lead_onboarding_state(progress_percent);

-- Enable RLS
ALTER TABLE lead_onboarding_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_onboarding_state ENABLE ROW LEVEL SECURITY;

-- Note: These tables are managed by backend API endpoints (service role)
-- Frontend never directly accesses these tables

