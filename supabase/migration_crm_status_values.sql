-- CRM MVP - Part 1: Lead Pipeline Status Migration
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- Updates status values to: new, contacted, booked, paid, completed
-- Default status is 'new'

-- Step 1: Update existing status values to new format
UPDATE leads 
SET status = CASE 
  WHEN status = 'NEW' THEN 'new'
  WHEN status = 'CONTACTED' THEN 'contacted'
  WHEN status = 'QUALIFIED' THEN 'contacted'  -- Map QUALIFIED to contacted
  WHEN status = 'QUOTE_SENT' THEN 'booked'    -- Map QUOTE_SENT to booked
  WHEN status = 'CLOSED' THEN 'completed'     -- Map CLOSED to completed
  WHEN status = 'LOST' THEN 'contacted'       -- Map LOST to contacted (or you can delete these)
  ELSE 'new'                                   -- Default for any other values
END
WHERE status IS NOT NULL;

-- Step 2: Set default for NULL statuses
UPDATE leads SET status = 'new' WHERE status IS NULL;

-- Step 3: Update default value for the column
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new';

-- Step 4: Drop old constraint if exists
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;

-- Step 5: Add new constraint with new values
ALTER TABLE leads ADD CONSTRAINT leads_status_check 
  CHECK (status IN ('new', 'contacted', 'booked', 'paid', 'completed'));

-- Step 6: Verify the update
-- Run this query to check results:
-- SELECT status, COUNT(*) FROM leads GROUP BY status;

