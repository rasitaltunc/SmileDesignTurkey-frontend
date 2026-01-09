-- Supabase SQL Editor'da çalıştırın:
-- Tablo kolon tiplerini kontrol etmek için

-- 1) lead_notes tablosunun lead_id kolonu
SELECT 
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lead_notes' 
  AND column_name = 'lead_id';

-- 2) lead_contact_events tablosunun lead_id kolonu
SELECT 
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lead_contact_events' 
  AND column_name = 'lead_id';

-- 3) lead_timeline_events tablosunun lead_id kolonu
SELECT 
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'lead_timeline_events' 
  AND column_name = 'lead_id';

-- 4) leads tablosunun id ve lead_uuid kolonları (referans)
SELECT 
  column_name, 
  data_type, 
  udt_name,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'leads' 
  AND column_name IN ('id', 'lead_uuid');

