-- CRM Lead Status Normalization Migration (3C: Deposit + Appointment separate)
-- 
-- This migration normalizes ALL status values to lowercase canonical format
-- Handles: NEW, New, new, CONTACTED, Contacted, contacted, etc.
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- Canonical status values: new, contacted, deposit_paid, appointment_set, arrived, completed, lost

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
  -- Map old uppercase values to new pipeline
  WHEN LOWER(status) = 'new' THEN 'new'
  WHEN LOWER(status) = 'contacted' THEN 'contacted'
  WHEN LOWER(status) = 'qualified' THEN 'contacted'      -- Map QUALIFIED to contacted
  WHEN LOWER(status) = 'quote_sent' THEN 'appointment_set' -- Map QUOTE_SENT to appointment_set
  WHEN LOWER(status) = 'booked' THEN 'appointment_set'    -- Map BOOKED to appointment_set
  WHEN LOWER(status) = 'paid' THEN 'deposit_paid'         -- Map PAID to deposit_paid
  WHEN LOWER(status) = 'closed' THEN 'completed'          -- Map CLOSED to completed
  WHEN LOWER(status) = 'lost' THEN 'lost'                 -- Keep LOST as lost
  -- Map new canonical values (keep as is)
  WHEN LOWER(status) = 'deposit_paid' THEN 'deposit_paid'
  WHEN LOWER(status) = 'appointment_set' THEN 'appointment_set'
  WHEN LOWER(status) = 'arrived' THEN 'arrived'
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
  CHECK (status IN ('new', 'contacted', 'deposit_paid', 'appointment_set', 'arrived', 'completed', 'lost'));

-- Step 8: Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status) WHERE status IS NOT NULL;

-- Step 9: Create or replace function to normalize status on insert/update
CREATE OR REPLACE FUNCTION normalize_lead_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize status to lowercase
  IF NEW.status IS NOT NULL THEN
    NEW.status = LOWER(TRIM(NEW.status));
    
    -- Validate status is in allowed list
    IF NEW.status NOT IN ('new', 'contacted', 'deposit_paid', 'appointment_set', 'arrived', 'completed', 'lost') THEN
      -- If invalid, set to 'new' as fallback
      NEW.status = 'new';
    END IF;
  ELSE
    -- If NULL, set default
    NEW.status = 'new';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 10: Drop trigger if exists, then create
DROP TRIGGER IF EXISTS normalize_lead_status_trigger ON leads;
CREATE TRIGGER normalize_lead_status_trigger
  BEFORE INSERT OR UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION normalize_lead_status();

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
-- WHERE status NOT IN ('new', 'contacted', 'deposit_paid', 'appointment_set', 'arrived', 'completed', 'lost');
--
-- Check default value:
-- SELECT column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'leads' AND column_name = 'status';
-- Should return: 'new'::text
