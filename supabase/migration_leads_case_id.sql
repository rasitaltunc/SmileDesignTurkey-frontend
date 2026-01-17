-- Add case_id, portal_token, email_verified_at, coordinator_email, portal_status to leads table
-- case_id: Short human-readable identifier (e.g., "GH-2024-1234")
-- portal_token: High-entropy secure token for portal access (192-bit hex)
-- email_verified_at: Timestamp when email was verified via magic link
-- coordinator_email: Optional email of assigned coordinator
-- portal_status: Status for portal UI (pending_review, verified, etc.)

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS case_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS portal_token TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS coordinator_email TEXT,
ADD COLUMN IF NOT EXISTS portal_status TEXT DEFAULT 'pending_review';

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_leads_case_id ON leads(case_id) WHERE case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_portal_token ON leads(portal_token) WHERE portal_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_coordinator_email ON leads(coordinator_email) WHERE coordinator_email IS NOT NULL;

-- Generate case_id for existing leads (optional backfill)
-- Format: GH-YYYY-XXXX (where XXXX is last 4 digits of timestamp + random)
-- Only for leads that don't have case_id yet
UPDATE leads
SET case_id = 'GH-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD((EXTRACT(EPOCH FROM created_at)::BIGINT % 10000)::TEXT, 4, '0') || '-' || SUBSTRING(id, -4)
WHERE case_id IS NULL;

