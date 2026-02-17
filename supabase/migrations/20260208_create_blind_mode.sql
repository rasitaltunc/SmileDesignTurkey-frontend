-- =================================================================
-- Migration: Create Doctor Blind Mode views and security
-- Part of: Model B++ - Smile Design Ultimate Ecosystem
-- Purpose: Prevent doctors from seeing patient contact information
-- Phase: 2 - Communication Lock (Security Critical)
-- Author: Gravity Claude
-- Date: 2026-02-07
-- 
-- SECURITY CRITICAL: This is the MOAT of Model B++
-- If doctor sees contact info → they call directly → platform dies
-- =================================================================

-- =================================================================
-- Doctor Access Audit Log Table
-- Tracks every doctor access for security monitoring
-- =================================================================

CREATE TABLE IF NOT EXISTS public.doctor_access_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who accessed
  doctor_id UUID NOT NULL,
  
  -- What was accessed
  action VARCHAR(50) NOT NULL, -- 'view_inbox', 'view_conversation', 'read_message', 'send_reply', 'attempt_export'
  conversation_id UUID,
  message_id UUID,
  
  -- Access details
  ip_address VARCHAR(50),
  user_agent TEXT,
  
  -- Security flags
  suspicious BOOLEAN DEFAULT false,
  suspicious_reason VARCHAR(255),
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit log
CREATE INDEX idx_doctor_access_logs_doctor_id ON public.doctor_access_logs(doctor_id);
CREATE INDEX idx_doctor_access_logs_created_at ON public.doctor_access_logs(created_at DESC);
CREATE INDEX idx_doctor_access_logs_suspicious ON public.doctor_access_logs(suspicious) WHERE suspicious = true;
CREATE INDEX idx_doctor_access_logs_action ON public.doctor_access_logs(action);

-- RLS for audit logs (only accessible by service role and admins)
ALTER TABLE public.doctor_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage audit logs"
  ON public.doctor_access_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('service_role', 'admin'));

-- =================================================================
-- Doctor Conversation View (BLIND MODE)
-- Strips sensitive patient information
-- =================================================================

CREATE OR REPLACE VIEW public.doctor_conversation_views AS
SELECT
  c.id as conversation_id,
  c.patient_id,
  c.assigned_doctor_id as doctor_id,
  c.clinic_id,
  
  -- VISIBLE: Safe patient info (first name only)
  COALESCE(
    SPLIT_PART(l.name, ' ', 1),
    'Patient'
  ) as patient_first_name,
  
  -- VISIBLE: Case context
  c.case_code,
  c.treatment_type,
  c.stage,
  c.priority,
  c.priority_reason,
  c.tags,
  
  -- VISIBLE: AI analysis (helpful for doctor)
  c.ai_summary,
  c.ai_next_action,
  c.ai_sentiment_trend,
  c.ai_booking_probability,
  
  -- VISIBLE: Metrics
  c.message_count,
  c.unread_count,
  c.avg_response_time_seconds,
  
  -- VISIBLE: Timestamps
  c.last_message_at,
  c.last_patient_message_at,
  c.first_message_at,
  c.created_at,
  
  -- VISIBLE: Status
  c.status,
  c.service_window_active,
  
  -- HIDDEN (NOT INCLUDED):
  -- ❌ l.phone
  -- ❌ l.email
  -- ❌ l.name (full)
  -- ❌ c.patient_phone
  -- ❌ c.wa_conversation_id
  -- ❌ Any address/location fields
  
  -- Flag for UI
  'blind_mode' as access_mode

FROM public.conversations c
LEFT JOIN public.leads l ON c.patient_id = l.id
WHERE c.assigned_doctor_id IS NOT NULL
  AND c.is_deleted = false;

-- =================================================================
-- Doctor Message View (BLIND MODE)
-- Messages without sender contact info
-- =================================================================

CREATE OR REPLACE VIEW public.doctor_message_views AS
SELECT
  m.id as message_id,
  m.conversation_id,
  
  -- VISIBLE: Message content
  m.direction,
  m.message_type,
  -- Content with phone/email masked (handled by application layer for performance)
  m.content as raw_content,
  m.media_url,
  
  -- VISIBLE: AI analysis
  m.ai_intent,
  m.ai_sentiment,
  m.ai_suggested_response,
  
  -- VISIBLE: Status
  m.wa_status,
  m.read_at,
  m.responded_at,
  
  -- VISIBLE: Timestamps
  m.created_at,
  m.wa_timestamp,
  
  -- VISIBLE: Routing info
  m.routed_to,
  m.escalated,
  m.escalation_reason,
  
  -- HIDDEN (NOT INCLUDED):
  -- ❌ m.patient_id (use conversation reference instead)
  -- ❌ m.wa_message_id
  -- ❌ m.wa_conversation_id
  -- ❌ Any reference to phone/email
  
  -- Flag for UI
  'blind_mode' as access_mode

FROM public.messages m
JOIN public.conversations c ON m.conversation_id = c.id
WHERE c.assigned_doctor_id IS NOT NULL
  AND m.is_deleted = false;

-- =================================================================
-- Security Functions
-- =================================================================

-- Log doctor access
CREATE OR REPLACE FUNCTION log_doctor_access(
  p_doctor_id UUID,
  p_action VARCHAR,
  p_conversation_id UUID DEFAULT NULL,
  p_message_id UUID DEFAULT NULL,
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_suspicious BOOLEAN := false;
  v_suspicious_reason VARCHAR;
  v_recent_access_count INTEGER;
BEGIN
  -- Check for suspicious patterns
  
  -- Pattern 1: Rapid access (>50 in last 5 minutes)
  SELECT COUNT(*) INTO v_recent_access_count
  FROM public.doctor_access_logs
  WHERE doctor_id = p_doctor_id
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  IF v_recent_access_count > 50 THEN
    v_suspicious := true;
    v_suspicious_reason := 'Rapid access pattern: ' || v_recent_access_count || ' accesses in 5 min';
  END IF;
  
  -- Pattern 2: Export attempt
  IF p_action = 'attempt_export' THEN
    v_suspicious := true;
    v_suspicious_reason := 'Export attempt blocked';
  END IF;
  
  -- Pattern 3: Bulk message viewing (>100 unique conversations in 1 hour)
  IF p_action = 'view_conversation' THEN
    SELECT COUNT(DISTINCT conversation_id) INTO v_recent_access_count
    FROM public.doctor_access_logs
    WHERE doctor_id = p_doctor_id
      AND action = 'view_conversation'
      AND created_at > NOW() - INTERVAL '1 hour';
    
    IF v_recent_access_count > 100 THEN
      v_suspicious := true;
      v_suspicious_reason := 'Bulk access pattern: ' || v_recent_access_count || ' conversations in 1 hour';
    END IF;
  END IF;
  
  -- Insert log entry
  INSERT INTO public.doctor_access_logs (
    doctor_id,
    action,
    conversation_id,
    message_id,
    ip_address,
    user_agent,
    suspicious,
    suspicious_reason,
    metadata
  ) VALUES (
    p_doctor_id,
    p_action,
    p_conversation_id,
    p_message_id,
    p_ip_address,
    p_user_agent,
    v_suspicious,
    v_suspicious_reason,
    p_metadata
  ) RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if doctor has access to conversation
CREATE OR REPLACE FUNCTION doctor_can_access_conversation(
  p_doctor_id UUID,
  p_conversation_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_access BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.conversations
    WHERE id = p_conversation_id
      AND assigned_doctor_id = p_doctor_id
      AND is_deleted = false
  ) INTO v_has_access;
  
  RETURN v_has_access;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get doctor's blind inbox (messages)
CREATE OR REPLACE FUNCTION get_doctor_blind_inbox(p_doctor_id UUID)
RETURNS TABLE (
  conversation_id UUID,
  patient_first_name TEXT,
  treatment_type VARCHAR,
  stage VARCHAR,
  priority VARCHAR,
  ai_summary TEXT,
  message_count INTEGER,
  unread_count INTEGER,
  last_message_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR
) AS $$
BEGIN
  -- Log access
  PERFORM log_doctor_access(p_doctor_id, 'view_inbox');
  
  RETURN QUERY
  SELECT
    dcv.conversation_id,
    dcv.patient_first_name,
    dcv.treatment_type,
    dcv.stage,
    dcv.priority,
    dcv.ai_summary,
    dcv.message_count,
    dcv.unread_count,
    dcv.last_message_at,
    dcv.status
  FROM public.doctor_conversation_views dcv
  WHERE dcv.doctor_id = p_doctor_id
  ORDER BY dcv.unread_count DESC, dcv.last_message_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get blind messages for a conversation
CREATE OR REPLACE FUNCTION get_doctor_blind_messages(
  p_doctor_id UUID,
  p_conversation_id UUID
)
RETURNS TABLE (
  message_id UUID,
  direction VARCHAR,
  message_type VARCHAR,
  content TEXT,
  ai_intent VARCHAR,
  ai_sentiment VARCHAR, 
  created_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  -- Verify access
  IF NOT doctor_can_access_conversation(p_doctor_id, p_conversation_id) THEN
    RAISE EXCEPTION 'Access denied: Doctor not assigned to this conversation';
  END IF;
  
  -- Log access
  PERFORM log_doctor_access(p_doctor_id, 'view_conversation', p_conversation_id);
  
  RETURN QUERY
  SELECT
    dmv.message_id,
    dmv.direction,
    dmv.message_type,
    dmv.raw_content,
    dmv.ai_intent,
    dmv.ai_sentiment,
    dmv.created_at,
    dmv.read_at
  FROM public.doctor_message_views dmv
  WHERE dmv.conversation_id = p_conversation_id
  ORDER BY dmv.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Doctor sends reply (blind mode - doesn't know destination)
CREATE OR REPLACE FUNCTION doctor_send_blind_reply(
  p_doctor_id UUID,
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS UUID AS $$
DECLARE
  v_patient_id UUID;
  v_message_id UUID;
BEGIN
  -- Verify access
  IF NOT doctor_can_access_conversation(p_doctor_id, p_conversation_id) THEN
    RAISE EXCEPTION 'Access denied: Doctor not assigned to this conversation';
  END IF;
  
  -- Get patient ID (doctor doesn't see this)
  SELECT patient_id INTO v_patient_id
  FROM public.conversations
  WHERE id = p_conversation_id;
  
  -- Insert message
  INSERT INTO public.messages (
    patient_id,
    doctor_id,
    conversation_id,
    direction,
    channel,
    message_type,
    content,
    routed_to,
    wa_status
  ) VALUES (
    v_patient_id,
    p_doctor_id,
    p_conversation_id,
    'outbound',
    'whatsapp',
    'text',
    p_content,
    'doctor',
    'pending'
  ) RETURNING id INTO v_message_id;
  
  -- Log access
  PERFORM log_doctor_access(p_doctor_id, 'send_reply', p_conversation_id, v_message_id);
  
  -- Update conversation
  UPDATE public.conversations
  SET 
    last_response_at = NOW(),
    unread_count = 0,
    updated_at = NOW()
  WHERE id = p_conversation_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- RLS Policies for Views (Direct table access prevention)
-- =================================================================

-- Ensure doctors can't access raw tables directly
-- They must use the views/functions

-- Doctors cannot select from messages directly
CREATE POLICY "Doctors cannot access messages directly"
  ON public.messages
  FOR SELECT
  USING (
    -- Only service role, consultants, or admins can access directly
    auth.jwt() ->> 'role' IN ('service_role', 'admin', 'consultant')
    OR 
    -- Or if the doctor is accessing through the function (SECURITY DEFINER)
    current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- Doctors cannot select from conversations directly (must use view)
CREATE POLICY "Doctors use blind views for conversations"
  ON public.conversations
  FOR SELECT
  USING (
    auth.jwt() ->> 'role' IN ('service_role', 'admin', 'consultant')
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- =================================================================
-- Comments for Documentation
-- =================================================================

COMMENT ON TABLE public.doctor_access_logs IS 'Audit log for all doctor access to patient data. Flags suspicious patterns.';
COMMENT ON VIEW public.doctor_conversation_views IS 'BLIND MODE: Conversation list for doctors. No contact info visible.';
COMMENT ON VIEW public.doctor_message_views IS 'BLIND MODE: Messages for doctors. No sender contact info.';
COMMENT ON FUNCTION log_doctor_access IS 'Logs every doctor access with suspicious pattern detection.';
COMMENT ON FUNCTION get_doctor_blind_inbox IS 'Returns doctor inbox with patient data stripped.';
COMMENT ON FUNCTION get_doctor_blind_messages IS 'Returns conversation messages without contact info.';
COMMENT ON FUNCTION doctor_send_blind_reply IS 'Doctor sends reply without seeing patient contact.';
