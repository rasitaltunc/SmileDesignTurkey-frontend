-- Add device column to leads table if it doesn't exist
-- Run this in Supabase Dashboard > SQL Editor

ALTER TABLE leads ADD COLUMN IF NOT EXISTS device TEXT;

-- Verify the column was added
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'leads' AND column_name = 'device';

