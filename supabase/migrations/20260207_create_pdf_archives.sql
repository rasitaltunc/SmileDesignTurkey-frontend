-- =================================================================
-- Migration: Create pdf_archives table and storage bucket
-- Part of: Model B++ - Smile Design Ultimate Ecosystem
-- Purpose: Track PDF archives for patient history and HIPAA compliance
-- Author: Gravity Claude
-- Date: 2026-02-07
-- =================================================================

-- Create pdf_archives table for tracking stored PDFs
CREATE TABLE IF NOT EXISTS public.pdf_archives (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  patient_id UUID NOT NULL,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID, -- Nullable for multi-tenant
  
  -- File Info
  file_name VARCHAR(512) NOT NULL,
  file_path VARCHAR(1024) NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  
  -- PDF Type
  pdf_type VARCHAR(50) NOT NULL DEFAULT 'other',
  -- 'patient_proforma', 'doctor_note', 'treatment_plan', 'consent_form', 'other'
  
  -- Context
  case_code VARCHAR(100),
  treatment_type VARCHAR(255),
  
  -- Status
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_pdf_type CHECK (pdf_type IN ('patient_proforma', 'doctor_note', 'treatment_plan', 'consent_form', 'other'))
);

-- Indexes for performance
CREATE INDEX idx_pdf_archives_patient_id ON public.pdf_archives(patient_id);
CREATE INDEX idx_pdf_archives_doctor_id ON public.pdf_archives(doctor_id);
CREATE INDEX idx_pdf_archives_clinic_id ON public.pdf_archives(clinic_id);
CREATE INDEX idx_pdf_archives_case_code ON public.pdf_archives(case_code);
CREATE INDEX idx_pdf_archives_created_at ON public.pdf_archives(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.pdf_archives ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Doctors can view PDFs they created
CREATE POLICY "Doctors can view own PDFs"
  ON public.pdf_archives
  FOR SELECT
  USING (auth.uid() = doctor_id);

-- RLS Policy: Doctors can insert PDFs
CREATE POLICY "Doctors can insert PDFs"
  ON public.pdf_archives
  FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

-- RLS Policy: Doctors can update their PDFs
CREATE POLICY "Doctors can update own PDFs"
  ON public.pdf_archives
  FOR UPDATE
  USING (auth.uid() = doctor_id);

-- Trigger to update updated_at
CREATE TRIGGER handle_pdf_archives_updated_at
  BEFORE UPDATE ON public.pdf_archives
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime (updated_at);

-- =================================================================
-- Storage Bucket Setup (run via Supabase dashboard or API)
-- =================================================================

-- Note: Storage buckets are typically created via the Supabase dashboard
-- or using the Supabase Management API, not SQL.
-- 
-- Bucket configuration:
-- - Name: 'pdfs'
-- - Public: false (use signed URLs for access)
-- - File size limit: 10MB
-- - Allowed MIME types: ['application/pdf']
--
-- RLS Storage policies to add via dashboard:
-- 
-- 1. "Authenticated users can upload PDFs"
--    Operation: INSERT
--    Policy: (auth.role() = 'authenticated')
--    
-- 2. "Users can read their own PDFs"
--    Operation: SELECT
--    Policy: (auth.uid()::text = (storage.foldername(name))[2])
--    
-- 3. "Users can delete their own PDFs"
--    Operation: DELETE
--    Policy: (auth.uid()::text = (storage.foldername(name))[2])

-- =================================================================
-- Utility Functions
-- =================================================================

-- Function to get PDF count by patient
CREATE OR REPLACE FUNCTION get_patient_pdf_count(p_patient_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER FROM public.pdf_archives WHERE patient_id = p_patient_id;
$$ LANGUAGE SQL STABLE;

-- Function to get latest PDF for a patient by type
CREATE OR REPLACE FUNCTION get_latest_patient_pdf(p_patient_id UUID, p_pdf_type VARCHAR)
RETURNS public.pdf_archives AS $$
  SELECT * FROM public.pdf_archives 
  WHERE patient_id = p_patient_id AND pdf_type = p_pdf_type
  ORDER BY created_at DESC
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- =================================================================
-- Comments for documentation
-- =================================================================
COMMENT ON TABLE public.pdf_archives IS 'Archive of generated PDFs linked to patients for history and compliance';
COMMENT ON COLUMN public.pdf_archives.file_path IS 'Storage path in format: {clinic_id}/{patient_id}/{timestamp}_{type}.pdf';
COMMENT ON COLUMN public.pdf_archives.is_archived IS 'Soft delete flag for compliance - PDFs are never hard deleted';
