-- CRM Lead Status Normalization Migration
-- 
-- This migration normalizes ALL status values to lowercase canonical format
-- Handles: NEW, New, new, CONTACTED, Contacted, contacted, etc.
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- Canonical status values: new, contacted, booked, paid, completed

-- Step 1: Ensure status column exists with default
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'leads' AND column_name = 'status') THEN
    ALTER TABLE leads ADD COLUMN status TEXT DEFAULT 'new';
  END IF;
END $$;

-- Step 2: Normalize ALL existing status values to lowercase
-- This handles: NEW, New, new, CONTACTED, Contacted, contacted, etc.
UPDATE leads 
SET status = LOWER(TRIM(status))
WHERE status IS NOT NULL;

-- Step 3: Map old status values to new canonical values
UPDATE leads 
SET status = CASE 
  -- Map old uppercase values
  WHEN LOWER(status) = 'new' THEN 'new'
  WHEN LOWER(status) = 'contacted' THEN 'contacted'
  WHEN LOWER(status) = 'qualified' THEN 'contacted'      -- Map QUALIFIED to contacted
  WHEN LOWER(status) = 'quote_sent' THEN 'booked'        -- Map QUOTE_SENT to booked
  WHEN LOWER(status) = 'closed' THEN 'completed'         -- Map CLOSED to completed
  WHEN LOWER(status) = 'lost' THEN 'contacted'           -- Map LOST to contacted
  -- Map new canonical values
  WHEN LOWER(status) = 'booked' THEN 'booked'
  WHEN LOWER(status) = 'paid' THEN 'paid'
  WHEN LOWER(status) = 'completed' THEN 'completed'
  -- Default fallback
  ELSE 'new'
END
WHERE status IS NOT NULL;

-- Step 4: Set default for NULL statuses
UPDATE leads SET status = 'new' WHERE status IS NULL OR TRIM(status) = '';

-- Step 5: Update column default
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new';

-- Step 6: Drop old constraint if exists
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Step 7: Add new constraint with canonical lowercase values only
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'contacted', 'booked', 'paid', 'completed'));

-- Step 8: Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status) WHERE status IS NOT NULL;

-- Verification queries (uncomment to run):
-- 
-- Check status distribution:
-- SELECT status, COUNT(*) as count 
-- FROM leads 
-- GROUP BY status 
-- ORDER BY status;
--
-- Check for any invalid statuses (should return 0 rows):
-- SELECT id, status 
-- FROM leads 
-- WHERE status NOT IN ('new', 'contacted', 'booked', 'paid', 'completed');
--
-- Check default value:
-- SELECT column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'leads' AND column_name = 'status';
-- Should return: 'new'::text

