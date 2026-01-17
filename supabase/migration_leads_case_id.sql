-- Add case_id and coordinator_email to leads table
-- case_id: Short human-readable identifier (e.g., "GH-2024-1234")
-- coordinator_email: Optional email of assigned coordinator

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS case_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS coordinator_email TEXT;

-- Create index on case_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_leads_case_id ON leads(case_id) WHERE case_id IS NOT NULL;

-- Create index on coordinator_email
CREATE INDEX IF NOT EXISTS idx_leads_coordinator_email ON leads(coordinator_email) WHERE coordinator_email IS NOT NULL;

-- Generate case_id for existing leads (optional backfill)
-- Format: GH-YYYY-XXXX (where XXXX is last 4 digits of timestamp + random)
-- Only for leads that don't have case_id yet
UPDATE leads
SET case_id = 'GH-' || TO_CHAR(created_at, 'YYYY') || '-' || LPAD((EXTRACT(EPOCH FROM created_at)::BIGINT % 10000)::TEXT, 4, '0') || '-' || SUBSTRING(id, -4)
WHERE case_id IS NULL;

