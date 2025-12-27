-- Verification: Check if all required indexes exist
-- Run in Supabase SQL Editor to verify deployment

-- Check last_contacted_at index
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'leads'
  AND indexname = 'idx_leads_last_contacted_at';

-- If missing, create it:
CREATE INDEX IF NOT EXISTS idx_leads_last_contacted_at 
  ON public.leads(last_contacted_at DESC) 
  WHERE last_contacted_at IS NOT NULL;

-- Verify all booking stats indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'leads'
  AND indexname IN (
    'leads_has_rescheduled_idx',
    'leads_has_cancelled_idx',
    'leads_booking_count_idx',
    'idx_leads_last_contacted_at'
  )
ORDER BY indexname;

-- Expected: 4 rows returned

