-- Lead Portal Auth Migration
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- Creates table for portal password authentication

-- Create lead_portal_auth table
CREATE TABLE IF NOT EXISTS lead_portal_auth (
  lead_id TEXT PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for email lookups (useful for login)
CREATE INDEX IF NOT EXISTS idx_lead_portal_auth_email 
  ON lead_portal_auth(email);

-- Enable RLS
ALTER TABLE lead_portal_auth ENABLE ROW LEVEL SECURITY;

-- Note: This table is managed by backend API endpoints (service role)
-- Frontend never directly accesses this table
-- Passwords are hashed using bcrypt (10 rounds)

