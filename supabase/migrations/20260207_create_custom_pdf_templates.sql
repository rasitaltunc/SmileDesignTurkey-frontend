-- =================================================================
-- Migration: Create custom_pdf_templates table
-- Part of: Model B++ - Smile Design Ultimate Ecosystem
-- Purpose: Store custom PDF templates with version history
-- Author: Gravity Claude
-- Date: 2026-02-07
-- =================================================================

-- Create custom_pdf_templates table for storing doctor-created templates
CREATE TABLE IF NOT EXISTS public.custom_pdf_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Ownership
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id UUID, -- Nullable for now, will be enforced in multi-tenant phase
  
  -- Template Metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Template Type
  layout VARCHAR(50) NOT NULL DEFAULT 'detailed', -- 'detailed', 'brief', 'patient'
  template_type VARCHAR(50) DEFAULT 'custom', -- 'builtin', 'custom', 'cloned'
  cloned_from VARCHAR(255), -- ID of source template if cloned
  
  -- Template Content
  sections JSONB NOT NULL DEFAULT '[]'::JSONB, -- Array of section IDs
  variables JSONB DEFAULT '{}'::JSONB, -- Custom variables for the template
  
  -- Version History (FIFO - max 3 previous versions)
  previous_versions JSONB DEFAULT '[]'::JSONB, -- [{version: 1, sections: [...], updated_at: ...}, ...]
  current_version INTEGER DEFAULT 1,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_layout CHECK (layout IN ('detailed', 'brief', 'patient')),
  CONSTRAINT valid_template_type CHECK (template_type IN ('builtin', 'custom', 'cloned'))
);

-- Create indexes for performance
CREATE INDEX idx_custom_pdf_templates_doctor_id ON public.custom_pdf_templates(doctor_id);
CREATE INDEX idx_custom_pdf_templates_clinic_id ON public.custom_pdf_templates(clinic_id);
CREATE INDEX idx_custom_pdf_templates_is_active ON public.custom_pdf_templates(is_active);

-- Enable Row Level Security
ALTER TABLE public.custom_pdf_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Doctors can view their own templates
CREATE POLICY "Doctors can view own templates"
  ON public.custom_pdf_templates
  FOR SELECT
  USING (auth.uid() = doctor_id);

-- RLS Policy: Doctors can insert their own templates
CREATE POLICY "Doctors can insert own templates"
  ON public.custom_pdf_templates
  FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

-- RLS Policy: Doctors can update their own templates
CREATE POLICY "Doctors can update own templates"
  ON public.custom_pdf_templates
  FOR UPDATE
  USING (auth.uid() = doctor_id);

-- RLS Policy: Doctors can delete their own templates
CREATE POLICY "Doctors can delete own templates"
  ON public.custom_pdf_templates
  FOR DELETE
  USING (auth.uid() = doctor_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER handle_custom_pdf_templates_updated_at
  BEFORE UPDATE ON public.custom_pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime (updated_at);

-- =================================================================
-- Function to save version history (max 3 previous versions)
-- =================================================================
CREATE OR REPLACE FUNCTION save_template_version()
RETURNS TRIGGER AS $$
DECLARE
  old_version JSONB;
  versions_array JSONB;
BEGIN
  -- Only save version if sections changed
  IF OLD.sections IS DISTINCT FROM NEW.sections THEN
    -- Create version record from old data
    old_version := jsonb_build_object(
      'version', OLD.current_version,
      'sections', OLD.sections,
      'variables', OLD.variables,
      'updated_at', OLD.updated_at
    );
    
    -- Get current versions or empty array
    versions_array := COALESCE(OLD.previous_versions, '[]'::JSONB);
    
    -- Add new version to beginning of array
    versions_array := old_version || versions_array;
    
    -- Keep only last 3 versions (FIFO)
    IF jsonb_array_length(versions_array) > 3 THEN
      versions_array := (
        SELECT jsonb_agg(elem)
        FROM (
          SELECT elem
          FROM jsonb_array_elements(versions_array) WITH ORDINALITY AS t(elem, ord)
          ORDER BY ord
          LIMIT 3
        ) sub
      );
    END IF;
    
    NEW.previous_versions := versions_array;
    NEW.current_version := OLD.current_version + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically save version history
CREATE TRIGGER save_template_version_trigger
  BEFORE UPDATE ON public.custom_pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION save_template_version();

-- =================================================================
-- Built-in template definitions (for cloning)
-- Stored in a separate lookup table
-- =================================================================
CREATE TABLE IF NOT EXISTS public.builtin_templates (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout VARCHAR(50) NOT NULL,
  sections JSONB NOT NULL,
  icon VARCHAR(10) DEFAULT '📄',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Insert built-in templates
INSERT INTO public.builtin_templates (id, name, description, layout, sections, icon, sort_order) VALUES
  (
    'detailed_clinical',
    'Detailed Clinical Report',
    'Comprehensive documentation with all clinical sections',
    'detailed',
    '["header", "chief_complaint", "clinical_notes", "treatment_plan", "materials", "recommendations", "follow_up", "signature", "stamp"]',
    '📋',
    1
  ),
  (
    'brief_summary',
    'Brief Summary',
    'Quick overview with essential information only',
    'brief',
    '["header", "chief_complaint", "treatment_plan", "signature"]',
    '📝',
    2
  ),
  (
    'patient_proforma',
    'Patient Proforma',
    'Simplified cost estimate for patients',
    'patient',
    '["header", "treatment_plan", "materials", "recommendations", "signature"]',
    '👤',
    3
  ),
  (
    'implant_report',
    'Implant Report',
    'Specialized template for implant procedures',
    'detailed',
    '["header", "chief_complaint", "clinical_notes", "treatment_plan", "materials", "follow_up", "signature"]',
    '🦷',
    4
  ),
  (
    'veneer_consultation',
    'Veneer Consultation',
    'Cosmetic veneer treatment documentation',
    'detailed',
    '["header", "clinical_notes", "treatment_plan", "materials", "recommendations", "signature"]',
    '✨',
    5
  )
ON CONFLICT (id) DO NOTHING;

-- =================================================================
-- Comments for documentation
-- =================================================================
COMMENT ON TABLE public.custom_pdf_templates IS 'Custom PDF templates created by doctors for generating patient documents';
COMMENT ON COLUMN public.custom_pdf_templates.previous_versions IS 'FIFO version history, stores last 3 versions';
COMMENT ON COLUMN public.custom_pdf_templates.clinic_id IS 'Nullable for now, will be enforced when multi-tenant phase activates';
