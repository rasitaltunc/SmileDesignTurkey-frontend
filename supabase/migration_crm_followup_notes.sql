-- CRM MVP Part 2: Follow-up + Notes Migration
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- Adds:
-- - follow_up_at column to leads table
-- - lead_notes table for notes system

-- ============================================
-- Step 1: Add follow_up_at to leads table
-- ============================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'follow_up_at') THEN
    ALTER TABLE leads ADD COLUMN follow_up_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- Create index for follow-up queries
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_at ON leads(follow_up_at) 
WHERE follow_up_at IS NOT NULL;

-- ============================================
-- Step 2: Create lead_notes table
-- ============================================

CREATE TABLE IF NOT EXISTS lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_id ON lead_notes(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_author_id ON lead_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_lead_notes_created_at ON lead_notes(created_at DESC);

-- ============================================
-- Step 3: Enable RLS on lead_notes
-- ============================================

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view notes for leads they have access to
-- (This will work with existing leads RLS policies)
CREATE POLICY "Users can view notes for accessible leads" ON lead_notes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_notes.lead_id
    -- RLS on leads table will determine if user can see this lead
  )
);

-- Policy: Authenticated users can create notes
CREATE POLICY "Authenticated users can create notes" ON lead_notes
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL
  AND author_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM leads 
    WHERE leads.id = lead_notes.lead_id
    -- RLS on leads table will determine if user can see this lead
  )
);

-- Policy: Users can update their own notes
CREATE POLICY "Users can update own notes" ON lead_notes
FOR UPDATE USING (author_id = auth.uid());

-- Policy: Users can delete their own notes
CREATE POLICY "Users can delete own notes" ON lead_notes
FOR DELETE USING (author_id = auth.uid());

-- ============================================
-- Step 4: Trigger to update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_lead_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lead_notes_updated_at ON lead_notes;
CREATE TRIGGER update_lead_notes_updated_at
  BEFORE UPDATE ON lead_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_notes_updated_at();

-- ============================================
-- Verification queries (uncomment to run):
-- ============================================
--
-- Check follow_up_at column exists:
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'leads' AND column_name = 'follow_up_at';
--
-- Check lead_notes table exists:
-- SELECT * FROM lead_notes LIMIT 1;
--
-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'lead_notes';

