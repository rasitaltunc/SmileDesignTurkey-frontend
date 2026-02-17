-- =================================================================
-- Migration: Create conversations table for Communication Lock
-- Part of: Model B++ - Smile Design Ultimate Ecosystem
-- Purpose: Track patient conversations with status, assignment, and AI analysis
-- Phase: 2 - Communication Lock
-- Author: Gravity Claude
-- Date: 2026-02-07
-- =================================================================

-- =================================================================
-- Conversations Table - Conversation threading & management
-- =================================================================

CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants
  patient_id UUID NOT NULL,
  patient_phone VARCHAR(20), -- Masked for doctor view
  patient_name VARCHAR(255), -- From patient profile
  
  -- Assignment
  assigned_doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_consultant_id UUID,
  clinic_id UUID,
  
  -- Status & Priority
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'pending' | 'waiting_response' | 'resolved' | 'archived'
  priority VARCHAR(10) DEFAULT 'normal', -- 'low' | 'normal' | 'high' | 'urgent'
  priority_reason VARCHAR(255), -- Why this priority was set
  
  -- Context & Classification
  case_code VARCHAR(100), -- Link to patient case
  treatment_type VARCHAR(255), -- Primary treatment interest
  stage VARCHAR(50) DEFAULT 'inquiry', -- 'inquiry' | 'consultation' | 'quote_sent' | 'booked' | 'travel' | 'treatment' | 'followup'
  tags JSONB DEFAULT '[]'::JSONB, -- ['vip', 'returning', 'referred', etc.]
  
  -- Channel Info
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp',
  wa_conversation_id VARCHAR(255), -- WhatsApp's conversation ID
  
  -- AI Analysis
  ai_summary TEXT, -- AI-generated conversation summary
  ai_next_action VARCHAR(255), -- Suggested next action
  ai_sentiment_trend VARCHAR(20), -- 'improving' | 'stable' | 'declining'
  ai_booking_probability DECIMAL(3,2), -- 0.00 to 1.00
  ai_last_analyzed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metrics
  message_count INTEGER DEFAULT 0,
  inbound_count INTEGER DEFAULT 0,
  outbound_count INTEGER DEFAULT 0,
  unread_count INTEGER DEFAULT 0,
  avg_response_time_seconds INTEGER,
  
  -- 24h Service Window (WhatsApp free messaging)
  service_window_expires_at TIMESTAMP WITH TIME ZONE,
  service_window_active BOOLEAN GENERATED ALWAYS AS (
    service_window_expires_at IS NOT NULL AND service_window_expires_at > NOW()
  ) STORED,
  
  -- First Response Time (SLA tracking)
  first_message_at TIMESTAMP WITH TIME ZONE,
  first_response_at TIMESTAMP WITH TIME ZONE,
  first_response_time_seconds INTEGER,
  
  -- Activity Timestamps
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_patient_message_at TIMESTAMP WITH TIME ZONE,
  last_response_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Lifecycle
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('active', 'pending', 'waiting_response', 'resolved', 'archived')),
  CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT valid_stage CHECK (stage IN ('inquiry', 'consultation', 'quote_sent', 'booked', 'travel', 'treatment', 'followup'))
);

-- =================================================================
-- Indexes for Performance
-- =================================================================

-- Primary lookups
CREATE INDEX idx_conversations_patient_id ON public.conversations(patient_id);
CREATE INDEX idx_conversations_assigned_doctor ON public.conversations(assigned_doctor_id);
CREATE INDEX idx_conversations_assigned_consultant ON public.conversations(assigned_consultant_id);
CREATE INDEX idx_conversations_clinic_id ON public.conversations(clinic_id);

-- Status & filtering
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_priority ON public.conversations(priority);
CREATE INDEX idx_conversations_stage ON public.conversations(stage);

-- Time-based
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);

-- Active conversations needing attention
CREATE INDEX idx_conversations_unread ON public.conversations(unread_count DESC) 
  WHERE status = 'active' AND unread_count > 0;

-- Service window expiring soon (need template messages)
CREATE INDEX idx_conversations_expiring_window ON public.conversations(service_window_expires_at) 
  WHERE service_window_expires_at IS NOT NULL 
  AND status = 'active';

-- WhatsApp lookup
CREATE UNIQUE INDEX idx_conversations_wa_id ON public.conversations(wa_conversation_id) 
  WHERE wa_conversation_id IS NOT NULL;

-- =================================================================
-- Row Level Security (RLS)
-- =================================================================

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Doctors can view their assigned conversations
CREATE POLICY "Doctors can view assigned conversations"
  ON public.conversations
  FOR SELECT
  USING (
    assigned_doctor_id = auth.uid() 
    OR assigned_consultant_id = auth.uid()
  );

-- Doctors can update their conversations
CREATE POLICY "Doctors can update assigned conversations"
  ON public.conversations
  FOR UPDATE
  USING (
    assigned_doctor_id = auth.uid() 
    OR assigned_consultant_id = auth.uid()
  );

-- Service role full access (for system operations)
CREATE POLICY "Service role full access"
  ON public.conversations
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =================================================================
-- Trigger: Auto-update timestamps
-- =================================================================

CREATE TRIGGER handle_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime(updated_at);

-- =================================================================
-- Helper Functions
-- =================================================================

-- Get or create conversation for a patient
CREATE OR REPLACE FUNCTION get_or_create_conversation(
  p_patient_id UUID,
  p_channel VARCHAR DEFAULT 'whatsapp',
  p_wa_conversation_id VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Try to find existing active conversation
  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE patient_id = p_patient_id
    AND channel = p_channel
    AND status IN ('active', 'pending', 'waiting_response')
  ORDER BY last_message_at DESC
  LIMIT 1;
  
  -- Create new if not found
  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (patient_id, channel, wa_conversation_id, first_message_at)
    VALUES (p_patient_id, p_channel, p_wa_conversation_id, NOW())
    RETURNING id INTO v_conversation_id;
  END IF;
  
  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql;

-- Mark conversation as read
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.conversations
  SET unread_count = 0, updated_at = NOW()
  WHERE id = p_conversation_id;
  
  UPDATE public.messages
  SET read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND direction = 'inbound'
    AND read_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- Comments for Documentation
-- =================================================================

COMMENT ON TABLE public.conversations IS 'Patient conversation threads. Central to Communication Lock.';
COMMENT ON COLUMN public.conversations.service_window_active IS 'Auto-computed: true if 24h WhatsApp free window is active';
COMMENT ON COLUMN public.conversations.stage IS 'Patient journey stage for context';
COMMENT ON COLUMN public.conversations.ai_booking_probability IS 'AI-predicted likelihood of conversion (0-1)';
