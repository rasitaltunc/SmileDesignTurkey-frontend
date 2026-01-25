-- Migration: Add portal_state to leads table for single source of truth
-- This eliminates confusion around email verification, password set, etc.

-- Add portal_state column (enum-like text with constraint)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS portal_state TEXT DEFAULT 'unverified' 
CHECK (portal_state IN ('unverified', 'verified', 'password_set', 'active'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_leads_portal_state ON leads(portal_state);

-- Backfill existing data (one-time migration)
-- If lead has portal_token and verified_at, mark as verified
UPDATE leads
SET portal_state = 'verified'
WHERE portal_token IS NOT NULL 
  AND verified_at IS NOT NULL
  AND portal_state = 'unverified';

-- If lead has password in lead_portal_auth, mark as password_set
UPDATE leads
SET portal_state = 'password_set'
WHERE id IN (
  SELECT lead_id FROM lead_portal_auth WHERE password_hash IS NOT NULL
)
AND portal_state IN ('unverified', 'verified');

-- Comment for documentation
COMMENT ON COLUMN leads.portal_state IS 
'Portal access state: unverified → verified (email) → password_set → active. Single source of truth for UI.';
