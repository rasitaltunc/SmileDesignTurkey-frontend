-- =================================================================
-- Migration: Create messages table for Communication Lock
-- Part of: Model B++ - Smile Design Ultimate Ecosystem
-- Purpose: Store all patient-platform communication with AI processing
-- Phase: 2 - Communication Lock
-- Author: Gravity Claude
-- Date: 2026-02-07
-- =================================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================
-- Messages Table - Core communication storage
-- =================================================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Participants
  patient_id UUID NOT NULL,
  doctor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  clinic_id UUID,
  consultant_id UUID,
  
  -- Conversation Reference
  conversation_id UUID, -- Links to conversations table
  
  -- Message Content
  direction VARCHAR(10) NOT NULL, -- 'inbound' | 'outbound'
  channel VARCHAR(20) NOT NULL DEFAULT 'whatsapp', -- 'whatsapp' | 'email' | 'sms' | 'portal'
  message_type VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text' | 'image' | 'document' | 'audio' | 'template' | 'interactive'
  content TEXT,
  media_url VARCHAR(1024),
  media_mime_type VARCHAR(100),
  
  -- WhatsApp Specific Fields
  wa_message_id VARCHAR(255), -- 360Dialog message ID
  wa_conversation_id VARCHAR(255), -- WhatsApp conversation ID
  wa_template_name VARCHAR(255), -- Template name if template message
  wa_template_language VARCHAR(10), -- Template language code
  wa_status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  wa_error_code VARCHAR(50),
  wa_error_message TEXT,
  
  -- AI Processing Fields
  ai_processed BOOLEAN DEFAULT false,
  ai_intent VARCHAR(100), -- 'booking_inquiry' | 'pricing_question' | 'complaint' | 'follow_up' | 'general' | etc.
  ai_sentiment VARCHAR(20), -- 'positive' | 'neutral' | 'negative'
  ai_confidence DECIMAL(3,2), -- 0.00 to 1.00
  ai_suggested_response TEXT,
  ai_entities JSONB, -- Extracted entities: {treatment: 'dental implant', budget: '5000', date: '2026-03'}
  ai_processing_time_ms INTEGER,
  
  -- Routing & Assignment
  routed_to VARCHAR(20), -- 'ai' | 'consultant' | 'doctor' | 'admin'
  assigned_to UUID, -- Who is handling this message
  escalated BOOLEAN DEFAULT false,
  escalation_reason VARCHAR(255),
  escalated_at TIMESTAMP WITH TIME ZONE,
  
  -- Response Tracking
  response_message_id UUID, -- Reference to the response message
  response_time_seconds INTEGER, -- Time to first response
  
  -- Timestamps
  wa_timestamp TIMESTAMP WITH TIME ZONE, -- Original WhatsApp timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  read_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  
  -- Status & Lifecycle
  is_archived BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound')),
  CONSTRAINT valid_channel CHECK (channel IN ('whatsapp', 'email', 'sms', 'portal')),
  CONSTRAINT valid_message_type CHECK (message_type IN ('text', 'image', 'document', 'audio', 'video', 'template', 'interactive', 'location', 'contacts')),
  CONSTRAINT valid_wa_status CHECK (wa_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
  CONSTRAINT valid_routed_to CHECK (routed_to IS NULL OR routed_to IN ('ai', 'consultant', 'doctor', 'admin'))
);

-- =================================================================
-- Indexes for Performance
-- =================================================================

-- Primary lookup patterns
CREATE INDEX idx_messages_patient_id ON public.messages(patient_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_doctor_id ON public.messages(doctor_id);
CREATE INDEX idx_messages_consultant_id ON public.messages(consultant_id);

-- Time-based queries
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_messages_wa_timestamp ON public.messages(wa_timestamp DESC);

-- Status & filtering
CREATE INDEX idx_messages_channel ON public.messages(channel);
CREATE INDEX idx_messages_direction ON public.messages(direction);
CREATE INDEX idx_messages_wa_status ON public.messages(wa_status);
CREATE INDEX idx_messages_escalated ON public.messages(escalated) WHERE escalated = true;

-- AI & routing
CREATE INDEX idx_messages_ai_intent ON public.messages(ai_intent);
CREATE INDEX idx_messages_routed_to ON public.messages(routed_to);

-- WhatsApp specific
CREATE UNIQUE INDEX idx_messages_wa_message_id ON public.messages(wa_message_id) WHERE wa_message_id IS NOT NULL;

-- =================================================================
-- Row Level Security (RLS)
-- =================================================================

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Doctors can view messages in their conversations
CREATE POLICY "Doctors can view assigned messages"
  ON public.messages
  FOR SELECT
  USING (
    doctor_id = auth.uid() 
    OR consultant_id = auth.uid()
    OR assigned_to = auth.uid()
  );

-- Doctors can insert outbound messages
CREATE POLICY "Doctors can send messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    direction = 'outbound' AND (
      doctor_id = auth.uid() OR consultant_id = auth.uid()
    )
  );

-- Service role can do everything (for webhook processing)
CREATE POLICY "Service role full access"
  ON public.messages
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- =================================================================
-- Trigger: Update conversation on new message
-- =================================================================

CREATE OR REPLACE FUNCTION update_conversation_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update conversation stats
  IF NEW.conversation_id IS NOT NULL THEN
    UPDATE public.conversations SET
      message_count = message_count + 1,
      last_message_at = NEW.created_at,
      unread_count = CASE 
        WHEN NEW.direction = 'inbound' THEN unread_count + 1 
        ELSE unread_count 
      END,
      last_patient_message_at = CASE 
        WHEN NEW.direction = 'inbound' THEN NEW.created_at 
        ELSE last_patient_message_at 
      END,
      -- Update 24h service window
      service_window_expires_at = CASE 
        WHEN NEW.direction = 'inbound' THEN NEW.created_at + INTERVAL '24 hours'
        ELSE service_window_expires_at 
      END,
      updated_at = NOW()
    WHERE id = NEW.conversation_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_on_message();

-- =================================================================
-- Comments for Documentation
-- =================================================================

COMMENT ON TABLE public.messages IS 'All patient-platform communication. Part of Communication Lock system.';
COMMENT ON COLUMN public.messages.wa_message_id IS 'Unique 360Dialog/WhatsApp message ID for deduplication';
COMMENT ON COLUMN public.messages.ai_intent IS 'AI-classified intent for routing (booking_inquiry, pricing_question, etc.)';
COMMENT ON COLUMN public.messages.service_window_expires_at IS 'WhatsApp 24h free service window expiry';
COMMENT ON COLUMN public.messages.routed_to IS 'Where this message was routed: ai (auto-reply), consultant, doctor, admin';
