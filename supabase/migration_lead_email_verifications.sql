-- Lead Email Verification System Migration
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- Creates custom verification table for lead email verification
-- (Alternative to Supabase Auth OTP for patient portal verification)

-- Create lead_email_verifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS lead_email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  verified_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT email_lowercase CHECK (email = LOWER(email))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_email_verifications_lead_id 
  ON lead_email_verifications(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_email_verifications_token_hash 
  ON lead_email_verifications(token_hash);
CREATE INDEX IF NOT EXISTS idx_lead_email_verifications_email 
  ON lead_email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_lead_email_verifications_expires_at 
  ON lead_email_verifications(expires_at);

-- Enable RLS
ALTER TABLE lead_email_verifications ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can read/write (no public access)
-- This ensures only backend API can access this table

-- Note: This table is managed entirely by backend API endpoints
-- Frontend never directly accesses this table

