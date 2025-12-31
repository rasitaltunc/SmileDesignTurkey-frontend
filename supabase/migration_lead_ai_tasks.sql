-- Lead AI Tasks Table Migration (Sprint B5)
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- Stores AI-generated and manual tasks for each lead

CREATE TABLE IF NOT EXISTS lead_ai_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('call', 'whatsapp', 'email', 'intake', 'doctor_review', 'follow_up', 'other')),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'warm' CHECK (priority IN ('hot', 'warm', 'cool')),
  due_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'done', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_lead_ai_tasks_lead_id ON lead_ai_tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_ai_tasks_status ON lead_ai_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_ai_tasks_priority ON lead_ai_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_lead_ai_tasks_due_at ON lead_ai_tasks(due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_lead_ai_tasks_lead_status ON lead_ai_tasks(lead_id, status);

-- Unique constraint: prevent duplicate AI tasks (same lead_id + title)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_ai_tasks_unique_ai 
  ON lead_ai_tasks(lead_id, title) 
  WHERE source = 'ai' AND status = 'open';

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_lead_ai_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  -- Auto-set completed_at when status changes to 'done'
  IF NEW.status = 'done' AND OLD.status != 'done' THEN
    NEW.completed_at = NOW();
  END IF;
  -- Clear completed_at when status changes from 'done'
  IF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lead_ai_tasks_updated_at_trigger ON lead_ai_tasks;
CREATE TRIGGER update_lead_ai_tasks_updated_at_trigger
  BEFORE UPDATE ON lead_ai_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_ai_tasks_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE lead_ai_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read/write (no public access)
-- This ensures AI tasks are only accessible via secure admin endpoints

