-- Lead AI Memory Table Migration (Sprint B4)
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- Stores AI-generated snapshot, call brief, risk, and memory vault for each lead

CREATE TABLE IF NOT EXISTS lead_ai_memory (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  snapshot_json JSONB,
  call_brief_json JSONB,
  risk_json JSONB,
  memory_json JSONB,
  normalized_at TIMESTAMPTZ DEFAULT NOW(),
  model TEXT,
  request_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lead_ai_memory_normalized_at ON lead_ai_memory(normalized_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_ai_memory_updated_at ON lead_ai_memory(updated_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_ai_memory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lead_ai_memory_updated_at_trigger ON lead_ai_memory;
CREATE TRIGGER update_lead_ai_memory_updated_at_trigger
  BEFORE UPDATE ON lead_ai_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_ai_memory_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE lead_ai_memory ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read/write (no public access)
-- This ensures AI memory is only accessible via secure admin endpoints

