-- Create doctor_settings table
CREATE TABLE IF NOT EXISTS public.doctor_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Profile
  bio TEXT,
  specialization VARCHAR(255),
  license_number VARCHAR(100),
  
  -- Signature & Stamp
  signature_url VARCHAR(2048),
  stamp_url VARCHAR(2048),
  auto_apply_signature BOOLEAN DEFAULT true,
  
  -- Templates & Defaults
  default_template_id UUID,
  custom_templates JSONB DEFAULT '[]'::JSONB, -- [{id, name, content}, ...]
  
  -- Preferences
  default_tone VARCHAR(50) DEFAULT 'detailed', -- 'detailed', 'brief', 'patient'
  default_language VARCHAR(10) DEFAULT 'tr', -- 'tr', 'en'
  favorite_material VARCHAR(255),
  default_pricing_tier VARCHAR(50) DEFAULT 'standard',
  show_price_breakdown BOOLEAN DEFAULT true,
  quick_add_items JSONB DEFAULT '[]'::JSONB, -- Array of item IDs
  
  -- Integrations
  whatsapp_connected BOOLEAN DEFAULT false,
  whatsapp_phone VARCHAR(20),
  google_calendar_connected BOOLEAN DEFAULT false,
  
  -- Notifications
  push_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one settings record per doctor
  CONSTRAINT unique_doctor_settings UNIQUE (doctor_id)
);

-- RLS Policies
ALTER TABLE public.doctor_settings ENABLE ROW LEVEL SECURITY;

-- Allow doctors to view their own settings
CREATE POLICY "Doctors can view own settings"
  ON public.doctor_settings
  FOR SELECT
  USING (auth.uid() = doctor_id);

-- Allow doctors to insert their own settings
CREATE POLICY "Doctors can insert own settings"
  ON public.doctor_settings
  FOR INSERT
  WITH CHECK (auth.uid() = doctor_id);

-- Allow doctors to update their own settings
CREATE POLICY "Doctors can update own settings"
  ON public.doctor_settings
  FOR UPDATE
  USING (auth.uid() = doctor_id);

-- Trigger to update updated_at
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.doctor_settings
  FOR EACH ROW
  EXECUTE FUNCTION moddatetime (updated_at);
