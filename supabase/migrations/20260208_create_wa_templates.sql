-- =================================================================
-- Migration: Create wa_templates table for WhatsApp message templates
-- Part of: Model B++ - Smile Design Ultimate Ecosystem
-- Purpose: Manage WhatsApp Business API approved templates
-- Phase: 2 - Communication Lock
-- Author: Gravity Claude
-- Date: 2026-02-07
-- =================================================================

-- =================================================================
-- WhatsApp Templates Table
-- =================================================================

CREATE TABLE IF NOT EXISTS public.wa_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Template Identification
  name VARCHAR(255) NOT NULL, -- Template name (lowercase, underscores only)
  display_name VARCHAR(255) NOT NULL, -- Human-readable name
  description TEXT, -- Purpose of this template
  
  -- Category (affects pricing)
  category VARCHAR(20) NOT NULL, -- 'marketing' | 'utility' | 'authentication'
  
  -- Language
  language VARCHAR(10) NOT NULL DEFAULT 'en', -- ISO language code
  
  -- Template Structure
  header_type VARCHAR(20), -- 'none' | 'text' | 'image' | 'document' | 'video'
  header_content TEXT, -- Header text or media URL
  header_example TEXT, -- Example for approval
  
  body_text TEXT NOT NULL, -- Message body with {{1}}, {{2}} placeholders
  body_example TEXT, -- Example with filled placeholders
  
  footer_text VARCHAR(60), -- Optional footer (max 60 chars)
  
  -- Interactive Elements
  buttons JSONB DEFAULT '[]'::JSONB, -- [{type: 'quick_reply', text: 'Yes'}, {type: 'url', text: 'View', url: 'https://...'}]
  
  -- Variables Definition
  variables JSONB DEFAULT '[]'::JSONB, -- [{index: 1, name: 'patient_name', type: 'text', example: 'John'}]
  
  -- Meta/360Dialog Status
  wa_template_id VARCHAR(255), -- WhatsApp template ID after approval
  wa_namespace VARCHAR(255), -- WhatsApp Business Account namespace
  submission_status VARCHAR(20) DEFAULT 'draft', -- 'draft' | 'submitted' | 'pending' | 'approved' | 'rejected'
  wa_quality_score VARCHAR(20), -- 'green' | 'yellow' | 'red' (from WhatsApp)
  rejection_reason TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Usage Tracking
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Cost Tracking (per message)
  estimated_cost_usd DECIMAL(6,4), -- Based on category and country
  
  -- Ownership
  created_by UUID REFERENCES auth.users(id),
  clinic_id UUID, -- Optional: clinic-specific template
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false, -- Default template for category
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_category CHECK (category IN ('marketing', 'utility', 'authentication')),
  CONSTRAINT valid_header_type CHECK (header_type IS NULL OR header_type IN ('none', 'text', 'image', 'document', 'video')),
  CONSTRAINT valid_submission_status CHECK (submission_status IN ('draft', 'submitted', 'pending', 'approved', 'rejected')),
  CONSTRAINT unique_template_name UNIQUE (name, language)
);

-- =================================================================
-- Indexes
-- =================================================================

CREATE INDEX idx_wa_templates_category ON public.wa_templates(category);
CREATE INDEX idx_wa_templates_status ON public.wa_templates(submission_status);
CREATE INDEX idx_wa_templates_language ON public.wa_templates(language);
CREATE INDEX idx_wa_templates_active ON public.wa_templates(is_active) WHERE is_active = true;
CREATE INDEX idx_wa_templates_approved ON public.wa_templates(wa_template_id) WHERE submission_status = 'approved';

-- =================================================================
-- Row Level Security (RLS)
-- =================================================================

ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view approved templates
CREATE POLICY "Users can view approved templates"
  ON public.wa_templates
  FOR SELECT
  USING (auth.role() = 'authenticated' AND (submission_status = 'approved' OR created_by = auth.uid()));

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
  ON public.wa_templates
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('admin', 'service_role'));

-- =================================================================
-- Seed Data: Core 10 Templates
-- =================================================================

INSERT INTO public.wa_templates (name, display_name, description, category, language, body_text, variables, submission_status) VALUES

-- 1. Welcome Patient
('welcome_patient', 'Welcome Patient', 'First message to new patient inquiry', 'utility', 'en',
'Hello {{1}}! 👋

Thank you for contacting SmileDesign Turkey. We received your inquiry about {{2}}.

A specialist will review your case and respond within 2 hours.

In the meantime, feel free to share any photos or questions!',
'[{"index": 1, "name": "patient_name", "type": "text"}, {"index": 2, "name": "treatment_type", "type": "text"}]',
'draft'),

-- 2. Treatment Plan Ready
('treatment_plan_ready', 'Treatment Plan Ready', 'Notify patient their treatment plan is ready', 'utility', 'en',
'Great news, {{1}}! 🎉

Your personalized treatment plan is ready!

📋 Treatment: {{2}}
💰 Total: {{3}}
🗓️ Estimated Duration: {{4}}

Click below to view your full plan and book your consultation:',
'[{"index": 1, "name": "patient_name", "type": "text"}, {"index": 2, "name": "treatment_name", "type": "text"}, {"index": 3, "name": "price", "type": "text"}, {"index": 4, "name": "duration", "type": "text"}]',
'draft'),

-- 3. Doctor Response
('doctor_response', 'Doctor Response', 'When doctor sends clinical response', 'utility', 'en',
'Hi {{1}},

Your doctor, {{2}}, has reviewed your case:

"{{3}}"

Would you like to proceed with booking a consultation?',
'[{"index": 1, "name": "patient_name", "type": "text"}, {"index": 2, "name": "doctor_name", "type": "text"}, {"index": 3, "name": "response_summary", "type": "text"}]',
'draft'),

-- 4. Appointment Reminder
('appointment_reminder', 'Appointment Reminder', '24h before appointment reminder', 'utility', 'en',
'Reminder: Your appointment is tomorrow! 📅

📍 Clinic: {{1}}
🕐 Time: {{2}}
👨‍⚕️ Doctor: {{3}}

Need to reschedule? Reply to this message.

See you soon! 🦷',
'[{"index": 1, "name": "clinic_name", "type": "text"}, {"index": 2, "name": "appointment_time", "type": "text"}, {"index": 3, "name": "doctor_name", "type": "text"}]',
'draft'),

-- 5. Document Request
('document_request', 'Document Request', 'Request photos or documents from patient', 'utility', 'en',
'Hi {{1}},

To provide you with an accurate treatment plan, we need:

{{2}}

📸 Please send clear photos in good lighting.

This helps our specialists give you the best recommendation!',
'[{"index": 1, "name": "patient_name", "type": "text"}, {"index": 2, "name": "documents_needed", "type": "text"}]',
'draft'),

-- 6. Insurance Update
('insurance_update', 'Insurance Update', 'Insurance approval status update', 'utility', 'en',
'Insurance Update for {{1}} 📋

Status: {{2}}
Coverage: {{3}}
Reference: {{4}}

{{5}}

Questions? Just reply to this message.',
'[{"index": 1, "name": "patient_name", "type": "text"}, {"index": 2, "name": "status", "type": "text"}, {"index": 3, "name": "coverage_amount", "type": "text"}, {"index": 4, "name": "reference_number", "type": "text"}, {"index": 5, "name": "next_steps", "type": "text"}]',
'draft'),

-- 7. Follow-up Check
('follow_up_check', 'Follow-up Check', 'Post-treatment follow-up', 'utility', 'en',
'Hi {{1}}! 👋

It''s been {{2}} since your {{3}} treatment.

How are you feeling? We''d love to hear about your recovery!

Rate your experience: ⭐⭐⭐⭐⭐',
'[{"index": 1, "name": "patient_name", "type": "text"}, {"index": 2, "name": "time_since", "type": "text"}, {"index": 3, "name": "treatment_name", "type": "text"}]',
'draft'),

-- 8. Payment Confirmation
('payment_confirmation', 'Payment Confirmation', 'Confirm payment received', 'utility', 'en',
'Payment Confirmed ✅

Thank you, {{1}}!

Amount: {{2}}
Reference: {{3}}
Date: {{4}}

Your booking is now confirmed. We look forward to seeing you!',
'[{"index": 1, "name": "patient_name", "type": "text"}, {"index": 2, "name": "amount", "type": "text"}, {"index": 3, "name": "reference", "type": "text"}, {"index": 4, "name": "date", "type": "text"}]',
'draft'),

-- 9. Referral Invite
('referral_invite', 'Referral Invite', 'Invite friend with referral code', 'marketing', 'en',
'🎁 Share the Smile, {{1}}!

You''ve earned a special referral code:
**{{2}}**

Share with friends and both of you get {{3}} off!

Forward this message to someone who deserves a perfect smile! 😊',
'[{"index": 1, "name": "patient_name", "type": "text"}, {"index": 2, "name": "referral_code", "type": "text"}, {"index": 3, "name": "discount", "type": "text"}]',
'draft'),

-- 10. Satisfaction Survey
('satisfaction_survey', 'Satisfaction Survey', 'Post-treatment satisfaction survey', 'marketing', 'en',
'Hi {{1}}! 

Your opinion matters to us! 

How was your experience at SmileDesign Turkey?

Please take 30 seconds to share your feedback:
{{2}}

Thank you for trusting us with your smile! 🦷✨',
'[{"index": 1, "name": "patient_name", "type": "text"}, {"index": 2, "name": "survey_link", "type": "text"}]',
'draft')

ON CONFLICT (name, language) DO NOTHING;

-- =================================================================
-- Helper Function: Render template with variables
-- =================================================================

CREATE OR REPLACE FUNCTION render_template(
  p_template_name VARCHAR,
  p_variables JSONB,
  p_language VARCHAR DEFAULT 'en'
)
RETURNS TEXT AS $$
DECLARE
  v_body TEXT;
  v_var RECORD;
BEGIN
  -- Get template body
  SELECT body_text INTO v_body
  FROM public.wa_templates
  WHERE name = p_template_name AND language = p_language AND submission_status = 'approved';
  
  IF v_body IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Replace variables
  FOR v_var IN SELECT * FROM jsonb_each_text(p_variables)
  LOOP
    v_body := REPLACE(v_body, '{{' || v_var.key || '}}', v_var.value);
  END LOOP;
  
  RETURN v_body;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- Trigger: Auto-update timestamps
-- =================================================================

CREATE TRIGGER handle_wa_templates_updated_at
  BEFORE UPDATE ON public.wa_templates
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- =================================================================
-- Comments
-- =================================================================

COMMENT ON TABLE public.wa_templates IS 'WhatsApp Business API message templates. Must be approved before use.';
COMMENT ON COLUMN public.wa_templates.category IS 'Affects pricing: marketing ($0.0109), utility ($0.0053), authentication ($0.0083) in Turkey';
COMMENT ON COLUMN public.wa_templates.variables IS 'Template variables: [{index, name, type, example}]';
