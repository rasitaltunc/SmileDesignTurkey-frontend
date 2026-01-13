-- Migration: Doctor Signatures Table
-- Creates doctor_signatures table for storing signature metadata
-- Run in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS doctor_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  signature_storage_path TEXT NOT NULL,
  display_name TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(doctor_id)
);

CREATE INDEX IF NOT EXISTS idx_doctor_signatures_doctor_id ON doctor_signatures(doctor_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_doctor_signatures_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_doctor_signatures_updated_at ON doctor_signatures;
CREATE TRIGGER trigger_update_doctor_signatures_updated_at
  BEFORE UPDATE ON doctor_signatures
  FOR EACH ROW
  EXECUTE FUNCTION update_doctor_signatures_updated_at();

-- Enable RLS
ALTER TABLE doctor_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Doctors can view own signature"
  ON doctor_signatures FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can insert own signature"
  ON doctor_signatures FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update own signature"
  ON doctor_signatures FOR UPDATE
  USING (auth.uid() = doctor_id);

