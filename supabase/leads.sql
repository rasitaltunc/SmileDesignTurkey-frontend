-- Lead Engine v1 - Supabase Table Schema
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. The table will be created with proper indexes
--
-- Note: This table stores leads from both contact forms and onboarding flows.
-- PII (name, email, phone) is stored here for CRM purposes but is NOT sent to PostHog analytics.

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  source TEXT NOT NULL CHECK (source IN ('contact', 'onboarding')),
  name TEXT,
  email TEXT,
  phone TEXT,
  treatment TEXT,
  message TEXT,
  timeline TEXT,
  lang TEXT,
  page_url TEXT,
  utm_source TEXT,
  utm_campaign TEXT,
  utm_medium TEXT,
  referrer TEXT,
  device TEXT
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_utm_source ON leads(utm_source) WHERE utm_source IS NOT NULL;

-- Enable Row Level Security (RLS) for production safety
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow INSERT from anyone (anon key) - needed for lead capture
CREATE POLICY "Allow public insert" ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: DENY SELECT from anon/public - only service role can read
-- This ensures leads can only be read via secure admin endpoint
-- No SELECT policy for anon means public cannot read leads

-- Note: To read leads, use the Supabase Edge Function (supabase/functions/admin-leads)
-- which uses Service Role key server-side

