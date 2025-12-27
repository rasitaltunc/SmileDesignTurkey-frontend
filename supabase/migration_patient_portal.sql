-- Migration: Patient Portal v1
-- Creates patient_portal_links table, storage bucket, and RLS policies

-- ============================================
-- 1. Create patient_portal_links table
-- ============================================
CREATE TABLE IF NOT EXISTS patient_portal_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Links patient auth user to their lead
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id TEXT NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  
  -- Unique constraint: one link per patient
  UNIQUE(patient_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_patient_portal_links_patient_id ON patient_portal_links(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_portal_links_lead_id ON patient_portal_links(lead_id);

-- ============================================
-- 2. Enable RLS
-- ============================================
ALTER TABLE patient_portal_links ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS Policies for patient_portal_links
-- ============================================

-- Policy: Patient can SELECT only their own link
CREATE POLICY "Patients can view their own portal link"
  ON patient_portal_links
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

-- Policy: Admin/Employee can SELECT all (for management)
CREATE POLICY "Admin and employee can view all portal links"
  ON patient_portal_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- Policy: Only admin can INSERT/UPDATE/DELETE (for linking)
CREATE POLICY "Only admin can modify portal links"
  ON patient_portal_links
  FOR ALL
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

-- ============================================
-- 4. Create Storage Bucket: patient_uploads
-- ============================================
-- Note: Bucket must be created via Supabase Dashboard or API
-- This SQL will attempt to create it, but you may need to run it manually
-- If bucket already exists, this will error (safe to ignore)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'patient_uploads',
  'patient_uploads',
  false, -- Private bucket
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 5. Storage Policies for patient_uploads
-- ============================================

-- Policy: Patient can INSERT (upload) files only under their own path
-- Path format: patient/<patient_id>/<filename>
CREATE POLICY "Patients can upload files to their own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'patient_uploads'
    AND (string_to_array(name, '/'))[1] = 'patient'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- Policy: Patient can SELECT (download/view) files only from their own folder
CREATE POLICY "Patients can view their own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient_uploads'
    AND (string_to_array(name, '/'))[1] = 'patient'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- Policy: Patient can UPDATE (metadata) files only in their own folder
CREATE POLICY "Patients can update their own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'patient_uploads'
    AND (string_to_array(name, '/'))[1] = 'patient'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'patient_uploads'
    AND (string_to_array(name, '/'))[1] = 'patient'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- Policy: Patient can DELETE files only from their own folder
CREATE POLICY "Patients can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'patient_uploads'
    AND (string_to_array(name, '/'))[1] = 'patient'
    AND (string_to_array(name, '/'))[2] = auth.uid()::text
  );

-- Policy: Admin/Employee can SELECT all files (for management)
CREATE POLICY "Admin and employee can view all patient files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'patient_uploads'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- ============================================
-- 6. Comments for documentation
-- ============================================
COMMENT ON TABLE patient_portal_links IS 'Links patient auth users to their leads. One patient = one lead link.';
COMMENT ON COLUMN patient_portal_links.patient_id IS 'Auth user ID (references auth.users)';
COMMENT ON COLUMN patient_portal_links.lead_id IS 'Lead ID (references public.leads)';

-- ============================================
-- 7. Helper View (Optional): Patient Portal Data
-- ============================================
-- This view joins patient_portal_links with leads for easy querying
CREATE OR REPLACE VIEW patient_portal_data AS
SELECT 
  ppl.id AS link_id,
  ppl.patient_id,
  ppl.created_at AS linked_at,
  l.id AS lead_id,
  l.name,
  l.email,
  l.phone,
  l.treatment AS treatment_type,
  l.created_at AS lead_created_at,
  l.status AS lead_status,
  l.source AS lead_source
FROM patient_portal_links ppl
JOIN public.leads l ON l.id = ppl.lead_id;

-- Grant SELECT on view to authenticated users (RLS on underlying tables will filter)
GRANT SELECT ON patient_portal_data TO authenticated;

-- RLS on view (same as table - patient can only see their own)
CREATE POLICY "Patients can view their own portal data"
  ON patient_portal_data
  FOR SELECT
  TO authenticated
  USING (patient_id = auth.uid());

