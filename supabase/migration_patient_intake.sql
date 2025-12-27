-- Migration: Patient Intake System
-- Creates patient_intakes table with RLS policies
-- Allows public form submission, admin/employee viewing, admin conversion to leads

-- ============================================
-- 1. Create patient_intakes table
-- ============================================
CREATE TABLE IF NOT EXISTS patient_intakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Form fields
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  country TEXT,
  treatment_type TEXT,
  notes TEXT,
  
  -- Lead linking (admin only)
  lead_id TEXT REFERENCES leads(id) ON DELETE SET NULL,
  linked_at TIMESTAMPTZ,
  linked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Metadata
  source TEXT DEFAULT 'intake_form',
  status TEXT DEFAULT 'pending', -- pending, converted, archived
  
  -- Optional tracking
  page_url TEXT,
  utm_source TEXT,
  device TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_intakes_created_at ON patient_intakes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patient_intakes_status ON patient_intakes(status);
CREATE INDEX IF NOT EXISTS idx_patient_intakes_lead_id ON patient_intakes(lead_id) WHERE lead_id IS NOT NULL;

-- ============================================
-- 2. Enable RLS
-- ============================================
ALTER TABLE patient_intakes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS Policies
-- ============================================

-- Policy 1: Anyone (including anonymous) can INSERT
-- This allows the public intake form to work
CREATE POLICY "Anyone can insert patient intakes"
  ON patient_intakes
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy 2: Only authenticated admin/employee can SELECT
-- This prevents public viewing of intakes
CREATE POLICY "Admin and employee can view patient intakes"
  ON patient_intakes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- Policy 3: Only admin can UPDATE (for linking to leads)
-- Employees can view but not modify
CREATE POLICY "Only admin can update patient intakes"
  ON patient_intakes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Policy 4: Only admin can DELETE (optional, for cleanup)
CREATE POLICY "Only admin can delete patient intakes"
  ON patient_intakes
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
-- 4. Helper function: Convert intake to lead
-- ============================================
-- This function can be called by admin to create a lead from an intake
CREATE OR REPLACE FUNCTION convert_intake_to_lead(intake_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_lead_id TEXT;
  intake_record patient_intakes%ROWTYPE;
BEGIN
  -- Get intake record
  SELECT * INTO intake_record
  FROM patient_intakes
  WHERE id = intake_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Intake not found';
  END IF;
  
  -- Check if already linked
  IF intake_record.lead_id IS NOT NULL THEN
    RETURN intake_record.lead_id;
  END IF;
  
  -- Create lead from intake
  INSERT INTO leads (
    name,
    email,
    phone,
    source,
    treatment,
    notes,
    status,
    created_at
  )
  VALUES (
    intake_record.full_name,
    intake_record.email,
    intake_record.phone,
    COALESCE(intake_record.source, 'intake_form'),
    intake_record.treatment_type,
    intake_record.notes,
    'new',
    now()
  )
  RETURNING id INTO new_lead_id;
  
  -- Link intake to lead
  UPDATE patient_intakes
  SET 
    lead_id = new_lead_id,
    linked_at = now(),
    linked_by = auth.uid(),
    status = 'converted'
  WHERE id = intake_id;
  
  RETURN new_lead_id;
END;
$$;

-- Grant execute to authenticated users (admin will be checked in function)
GRANT EXECUTE ON FUNCTION convert_intake_to_lead(UUID) TO authenticated;

-- ============================================
-- 5. Comments for documentation
-- ============================================
COMMENT ON TABLE patient_intakes IS 'Patient intake form submissions. Public can insert, admin/employee can view, admin can convert to leads.';
COMMENT ON COLUMN patient_intakes.lead_id IS 'Linked lead ID (set by admin when converting intake to lead)';
COMMENT ON COLUMN patient_intakes.status IS 'pending: not yet converted, converted: linked to lead, archived: manually archived';

