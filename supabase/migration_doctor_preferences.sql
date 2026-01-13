-- Migration: Doctor Preferences Engine
-- Creates doctor_preferences, clinic_settings, and prompt_templates tables
-- Run in Supabase Dashboard > SQL Editor

-- ============================================================================
-- 1. doctor_preferences table
-- ============================================================================
CREATE TABLE IF NOT EXISTS doctor_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  locale TEXT NOT NULL DEFAULT 'en' CHECK (locale IN ('en', 'tr')),
  brief_style TEXT NOT NULL DEFAULT 'bullets' CHECK (brief_style IN ('bullets', 'detailed')),
  tone TEXT NOT NULL DEFAULT 'warm_expert' CHECK (tone IN ('warm_expert', 'formal_clinical')),
  risk_tolerance TEXT NOT NULL DEFAULT 'balanced' CHECK (risk_tolerance IN ('conservative', 'balanced', 'aggressive')),
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  preferred_materials JSONB DEFAULT '{}'::jsonb,
  clinic_protocol_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_preferences_doctor_id ON doctor_preferences(doctor_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_doctor_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_doctor_preferences_updated_at ON doctor_preferences;
CREATE TRIGGER trigger_update_doctor_preferences_updated_at
  BEFORE UPDATE ON doctor_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_preferences_updated_at();

-- ============================================================================
-- 2. clinic_settings table
-- ============================================================================
CREATE TABLE IF NOT EXISTS clinic_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  brand_voice TEXT,
  legal_disclaimer TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clinic_settings_key ON clinic_settings(key);

-- Insert default clinic settings if not exists
INSERT INTO clinic_settings (key, brand_voice, legal_disclaimer)
VALUES (
  'default',
  'Professional, warm, and patient-centered. We prioritize transparency, safety, and excellent outcomes.',
  'This is a preliminary assessment. Final treatment plan requires in-person consultation. Individual results may vary.'
)
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- 3. prompt_templates table
-- ============================================================================
CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  template TEXT NOT NULL,
  version TEXT DEFAULT 'v1',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_key ON prompt_templates(key);
CREATE INDEX IF NOT EXISTS idx_prompt_templates_active ON prompt_templates(is_active) WHERE is_active = true;

-- Insert default templates if not exist
INSERT INTO prompt_templates (key, template, version, is_active)
VALUES (
  'doctor_brief_v1',
  E'You are an AI assistant helping a dental clinic doctor review a patient case.\nYou MUST NOT output any emails, phone numbers, links, or addresses. If present in the input, ignore them completely.\n\nClinic Brand Voice:\n{{brand_voice}}\n\nLegal Disclaimer:\n{{legal_disclaimer}}\n\nDoctor Preferences:\n{{doctor_preferences}}\n\nCase Information:\n- Case Code: {{case_code}}\n- Treatment Interest: {{treatment}}\n- Timeline: {{timeline}}\n- Review Status: {{review_status}}\n{{documents_meta}}\n\nPatient Message (PII-redacted):\n{{lead_message}}\n\nEmployee/Admin Summary (PII-redacted):\n{{snapshot}}\n\nBased on the above sanitized information, generate a clinical review brief in markdown format. Output ONLY the following sections (no other text):\n\n## Case Summary\n[1-2 sentence summary of the case, no PII]\n\n## Clinical Hypotheses\n- [Hypothesis 1 - non-definitive, professional]\n- [Hypothesis 2 - non-definitive, professional]\n- [Hypothesis 3 - non-definitive, professional]\n\n## Missing Questions\n- [Question 1 that should be asked]\n- [Question 2 that should be asked]\n- [Question 3 that should be asked]\n\n## Suggested Evaluation Plan\n- [Evaluation step 1]\n- [Evaluation step 2]\n- [Evaluation step 3]\n\n## Risk Flags / Urgency\n[Brief assessment of urgency/risk level and why]\n\n## Draft Doctor Review Text\n[Short, professional review text suitable for doctor_review_notes field - 2-3 sentences max]',
  'v1',
  true
),
(
  'doctor_note_v1',
  E'You are an AI assistant helping a dental clinic doctor write a clinical note.\nYou MUST NOT output any emails, phone numbers, links, or addresses.\n\nClinic Brand Voice:\n{{brand_voice}}\n\nLegal Disclaimer:\n{{legal_disclaimer}}\n\nDoctor Preferences:\n{{doctor_preferences}}\n\nCase Information:\n- Case Code: {{case_code}}\n- Treatment: {{treatment}}\n\nPatient Context (PII-redacted):\n{{lead_context}}\n\nBased on the above, generate a professional clinical note in markdown format. Be concise and follow the doctor''s preferred tone and style.',
  'v1',
  true
)
ON CONFLICT (key) DO NOTHING;

-- Enable RLS for doctor_preferences (doctors can only see/edit their own)
ALTER TABLE doctor_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own preferences"
  ON doctor_preferences FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own preferences"
  ON doctor_preferences FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own preferences"
  ON doctor_preferences FOR UPDATE
  USING (auth.uid() = doctor_id);

-- clinic_settings and prompt_templates: service role only (no RLS, accessed via API with service key)

