-- Fix RLS Policies: Single Source of Truth (profiles.role only)
-- This removes any JWT role checks and ensures all policies use profiles.role
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. Drop old JWT-based policies (if they exist)
-- ============================================
DROP POLICY IF EXISTS "Admins can see all leads" ON leads;
DROP POLICY IF EXISTS "Employees see only assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can insert assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can update assigned leads" ON leads;
DROP POLICY IF EXISTS "Only admin can delete leads" ON leads;

-- ============================================
-- 2. Create profiles.role-based policies for leads
-- ============================================

-- Policy: Admin can SELECT all leads
CREATE POLICY "Admins can see all leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy: Employee can SELECT only assigned leads
CREATE POLICY "Employees see only assigned leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'employee'
    )
    AND assigned_to = auth.uid()
  );

-- Policy: Public can INSERT (for lead capture forms)
CREATE POLICY "Allow public insert"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Employee can INSERT (for manual lead creation)
CREATE POLICY "Employees can insert assigned leads"
  ON leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- Policy: Employee can UPDATE assigned leads
CREATE POLICY "Employees can update assigned leads"
  ON leads
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
    AND (
      -- Admin can update any lead
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
      )
      OR
      -- Employee can only update assigned leads
      assigned_to = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- Policy: Only admin can DELETE
CREATE POLICY "Only admin can delete leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================
-- 3. Verification Query
-- ============================================
-- Run this to see all active policies for key tables:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('profiles', 'leads', 'lead_notes', 'patient_portal_links', 'patient_intakes')
ORDER BY tablename, policyname;

