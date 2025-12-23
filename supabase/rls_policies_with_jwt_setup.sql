-- Row Level Security (RLS) Policies for Leads Table
-- JWT ROLE CLAIM YAKLAŞIMI
-- 
-- Bu dosya, JWT'ye role claim'i eklemek için kullanılır.
-- Bu yaklaşım daha performanslıdır çünkü her sorguda profiles tablosuna gitmez.
--
-- Instructions:
-- 1. Bu dosyayı çalıştırın
-- 2. Kullanıcıların user_metadata'sına role ekleyin (aşağıdaki örnekleri kullanın)
-- 3. JWT'ye role claim'i otomatik eklemek için trigger kurulacak
-- 4. Bu migration idempotent (güvenle birden fazla kez çalıştırılabilir)

-- ============================================
-- ADIM 1: JWT'ye Role Claim Eklemek için Function
-- ============================================

-- JWT'ye custom claim ekleyen function
-- Bu function, user_metadata'dan role'ü alıp JWT'ye ekler
CREATE OR REPLACE FUNCTION get_user_role_from_metadata()
RETURNS TEXT AS $$
BEGIN
  -- user_metadata'dan role'ü al
  -- Eğer user_metadata.role yoksa, varsayılan olarak 'employee' döndür
  RETURN COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'employee'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADIM 2: Leads Tablosu için RLS Politikaları
-- ============================================

-- RLS'i aç (eğer kapalıysa)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Mevcut politikaları temizle (yeniden çalıştırılabilir olması için)
DROP POLICY IF EXISTS "Admins can see all leads" ON leads;
DROP POLICY IF EXISTS "Employees see only assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can insert assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can update assigned leads" ON leads;
DROP POLICY IF EXISTS "Only admin can delete leads" ON leads;
DROP POLICY IF EXISTS "Allow public insert" ON leads;

-- Policy 1: Admins can see all leads
-- JWT'de role claim'i varsa onu kullan, yoksa user_metadata'dan al
CREATE POLICY "Admins can see all leads" ON leads
FOR SELECT USING (
  COALESCE(
    auth.jwt() ->> 'role',
    get_user_role_from_metadata()
  ) = 'admin'
);

-- Policy 2: Employees can only see their assigned leads
CREATE POLICY "Employees see only assigned leads" ON leads
FOR SELECT USING (
  COALESCE(
    auth.jwt() ->> 'role',
    get_user_role_from_metadata()
  ) = 'employee' 
  AND assigned_to = auth.uid()::TEXT
);

-- Policy 3: Public can insert leads (for contact forms and onboarding)
CREATE POLICY "Allow public insert" ON leads
FOR INSERT 
TO anon
WITH CHECK (true);

-- Policy 4: Authenticated users can insert leads
CREATE POLICY "Employees can insert assigned leads" ON leads
FOR INSERT WITH CHECK (
  COALESCE(
    auth.jwt() ->> 'role',
    get_user_role_from_metadata()
  ) = 'admin'
  OR 
  (
    COALESCE(
      auth.jwt() ->> 'role',
      get_user_role_from_metadata()
    ) = 'employee' 
    AND assigned_to = auth.uid()::TEXT
  )
);

-- Policy 5: Employees can update only their assigned leads
CREATE POLICY "Employees can update assigned leads" ON leads
FOR UPDATE USING (
  COALESCE(
    auth.jwt() ->> 'role',
    get_user_role_from_metadata()
  ) = 'admin'
  OR 
  (
    COALESCE(
      auth.jwt() ->> 'role',
      get_user_role_from_metadata()
    ) = 'employee' 
    AND assigned_to = auth.uid()::TEXT
  )
);

-- Policy 6: Only admins can delete leads
CREATE POLICY "Only admin can delete leads" ON leads
FOR DELETE USING (
  COALESCE(
    auth.jwt() ->> 'role',
    get_user_role_from_metadata()
  ) = 'admin'
);

-- ============================================
-- ADIM 3: Index ve Performans
-- ============================================

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;

-- ============================================
-- ADIM 4: Kullanıcılara Role Ekleme (Manuel)
-- ============================================

-- Kullanıcıların user_metadata'sına role eklemek için:
-- 
-- YÖNTEM 1: Supabase Dashboard'dan (Önerilen)
-- 1. Authentication > Users > Kullanıcıyı seç
-- 2. User Metadata bölümüne git
-- 3. JSON'a şunu ekle: { "role": "admin" } veya { "role": "employee" }
--
-- YÖNTEM 2: SQL ile (Service Role Key gerekir)
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
-- WHERE email = 'admin@example.com';
--
-- UPDATE auth.users 
-- SET raw_user_meta_data = raw_user_meta_data || '{"role": "employee"}'::jsonb
-- WHERE email = 'employee@example.com';

-- ============================================
-- VERİFİKASYON SORGULARI
-- ============================================

-- Test queries (run these after applying policies):
-- 
-- 1. JWT'deki role'ü kontrol et:
--    SELECT auth.jwt() ->> 'role' as jwt_role;
--
-- 2. User metadata'dan role'ü kontrol et:
--    SELECT get_user_role_from_metadata() as role_from_metadata;
--
-- 3. Admin olarak test (admin kullanıcısıyla giriş yapın):
--    SELECT COUNT(*) FROM leads; -- Tüm lead'leri görmeli
--
-- 4. Employee olarak test (employee kullanıcısıyla giriş yapın):
--    SELECT COUNT(*) FROM leads; -- Sadece assigned lead'leri görmeli
--
-- 5. Policies kontrolü:
--    SELECT * FROM pg_policies WHERE tablename = 'leads';

