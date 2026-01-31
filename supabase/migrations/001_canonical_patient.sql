-- Canonical Patient System Migration
-- Phase 1.1: Foundation tables for unified patient view

CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  canonical_lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  merge_status VARCHAR DEFAULT 'unmerged',
  merged_from_leads UUID[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_email ON patients(email);
CREATE INDEX IF NOT EXISTS idx_patients_created_at ON patients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_patients_canonical_lead_id ON patients(canonical_lead_id);

ALTER TABLE leads ADD COLUMN IF NOT EXISTS patient_id UUID REFERENCES patients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_leads_patient_id ON leads(patient_id);

CREATE TABLE IF NOT EXISTS doctor_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  brief JSONB NOT NULL DEFAULT '{}',
  delta JSONB DEFAULT '{}',
  confidence_score FLOAT DEFAULT 0.8,
  version INT DEFAULT 1,
  generated_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP DEFAULT now() + INTERVAL '1 hour',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctor_briefs_lead_id ON doctor_briefs(lead_id);
CREATE INDEX IF NOT EXISTS idx_doctor_briefs_expires_at ON doctor_briefs(expires_at);

CREATE TABLE IF NOT EXISTS ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role VARCHAR NOT NULL,
  template TEXT NOT NULL,
  version INT DEFAULT 1,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  score INT DEFAULT 0,
  score_reasons VARCHAR[] DEFAULT '{}',
  calculated_at TIMESTAMP DEFAULT now(),
  expires_at TIMESTAMP DEFAULT now() + INTERVAL '1 day',
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_score ON lead_scores(score DESC);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "admin_all_access_patients"
  ON patients FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY IF NOT EXISTS "patients_read_own"
  ON patients FOR SELECT
  USING (email = auth.jwt() ->> 'email');

CREATE POLICY IF NOT EXISTS "doctor_read_own_briefs"
  ON doctor_briefs FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE assigned_to = auth.jwt() ->> 'user_id'
    )
  );
