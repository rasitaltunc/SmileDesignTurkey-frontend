-- Row Level Security (RLS) Policies for Leads Table
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)
--
-- This sets up RLS policies to:
-- - Allow admins to see and manage all leads
-- - Allow employees to see and manage only their assigned leads
-- - Enforce security at the database level

-- 1. First, test if JWT has role claim (for debugging)
-- Uncomment and run this query first to verify JWT structure:
-- SELECT 
--   auth.jwt() ->> 'role' as jwt_role,
--   auth.uid() as user_id;

-- 2. Enable RLS (if not already enabled)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Admins can see all leads" ON leads;
DROP POLICY IF EXISTS "Employees see only assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can insert assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can update assigned leads" ON leads;
DROP POLICY IF EXISTS "Only admin can delete leads" ON leads;
DROP POLICY IF EXISTS "Allow public insert" ON leads;

-- 4. Policy 1: Admins can see all leads
CREATE POLICY "Admins can see all leads" ON leads
FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'admin'
);

-- 5. Policy 2: Employees can only see their assigned leads
CREATE POLICY "Employees see only assigned leads" ON leads
FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'employee' 
  AND assigned_to = auth.uid()
);

-- 6. Policy 3: Public can insert leads (for contact forms and onboarding)
-- This allows anonymous users to submit leads via the website
CREATE POLICY "Allow public insert" ON leads
FOR INSERT 
TO anon
WITH CHECK (true);

-- 7. Policy 4: Employees can insert leads assigned to them
-- (Admins can insert via Policy 1, but this allows employees too)
CREATE POLICY "Employees can insert assigned leads" ON leads
FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role') = 'admin'
  OR 
  (assigned_to = auth.uid())
);

-- 8. Policy 5: Employees can update only their assigned leads
-- Admins can update any lead
CREATE POLICY "Employees can update assigned leads" ON leads
FOR UPDATE USING (
  (auth.jwt() ->> 'role') = 'admin'
  OR 
  (assigned_to = auth.uid())
);

-- 9. Policy 6: Only admins can delete leads
CREATE POLICY "Only admin can delete leads" ON leads
FOR DELETE USING (
  (auth.jwt() ->> 'role') = 'admin'
);

-- 10. Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;

-- Verification queries (run these after applying policies):
-- 
-- Test as admin:
-- SELECT COUNT(*) FROM leads; -- Should see all leads
--
-- Test as employee:
-- SELECT COUNT(*) FROM leads; -- Should see only assigned leads
--
-- Check policies:
-- SELECT * FROM pg_policies WHERE tablename = 'leads';

