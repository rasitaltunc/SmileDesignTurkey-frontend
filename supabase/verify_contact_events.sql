-- Verification queries for lead_contact_events table
-- Run in Supabase SQL Editor to verify deployment

-- 1) Check table exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'lead_contact_events'
ORDER BY ordinal_position;

-- Expected columns:
-- id (bigint)
-- lead_id (text)
-- channel (text)
-- note (text, nullable)
-- created_at (timestamp with time zone)
-- created_by (text, nullable)

-- 2) Check indexes exist
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'lead_contact_events'
ORDER BY indexname;

-- Expected indexes:
-- lead_contact_events_pkey (primary key)
-- idx_lead_contact_events_lead_id
-- idx_lead_contact_events_created_at
-- idx_lead_contact_events_created_by
-- idx_lead_contact_events_lead_created

-- 3) Check RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'lead_contact_events';

-- Expected: rowsecurity = true

-- 4) Check RLS policies
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'lead_contact_events';

-- Expected: 1 policy for SELECT (admin/employee)

-- 5) Test query (should work for admin/employee)
-- Note: Run this as an authenticated admin/employee user
SELECT 
  id,
  lead_id,
  channel,
  note,
  created_at,
  created_by
FROM public.lead_contact_events
ORDER BY created_at DESC
LIMIT 5;

-- 6) Check foreign key constraint
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name = 'lead_contact_events';

-- Expected: fk_lead_contact_events_lead_id → leads(id)

