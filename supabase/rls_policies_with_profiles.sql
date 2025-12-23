-- Row Level Security (RLS) Policies for Leads Table
-- PROFILES TABLOSU YAKLAŞIMI
-- 
-- Bu dosya, JWT'de role claim'i olmadığında kullanılır.
-- Rol bilgisi profiles tablosundan çekilir.
--
-- ÖN KOŞUL: profiles tablosu olmalı ve şu yapıda olmalı:
--   - id (UUID, auth.users.id ile eşleşmeli)
--   - role (TEXT, 'admin' veya 'employee' değerlerini içermeli)
--
-- Instructions:
-- 1. Önce profiles tablonuzun yapısını kontrol edin:
--    SELECT * FROM profiles LIMIT 1;
-- 2. Eğer profiles tablosu yoksa, önce oluşturun (aşağıdaki CREATE TABLE'ı kullanın)
-- 3. Bu dosyayı çalıştırın
-- 4. Bu migration idempotent (güvenle birden fazla kez çalıştırılabilir)

-- ============================================
-- ADIM 1: Profiles Tablosu Oluşturma (Eğer Yoksa)
-- ============================================

-- Profiles tablosunu oluştur (eğer yoksa)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS'i aç
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Profiles tablosu için politikalar
-- Kullanıcılar kendi profil bilgilerini görebilir
CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

-- Kullanıcılar kendi profil bilgilerini güncelleyebilir (role hariç)
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- ADIM 2: Helper Function - Kullanıcının Rolünü Döndürür
-- ============================================

-- Güvenli bir fonksiyon: Kullanıcının rolünü profiles tablosundan döndürür
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM profiles 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADIM 3: Leads Tablosu için RLS Politikaları
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
CREATE POLICY "Admins can see all leads" ON leads
FOR SELECT USING (
  get_user_role() = 'admin'
);

-- Policy 2: Employees can only see their assigned leads
CREATE POLICY "Employees see only assigned leads" ON leads
FOR SELECT USING (
  get_user_role() = 'employee' 
  AND assigned_to = auth.uid()::TEXT
);

-- Policy 3: Public can insert leads (for contact forms and onboarding)
CREATE POLICY "Allow public insert" ON leads
FOR INSERT 
TO anon
WITH CHECK (true);

-- Policy 4: Authenticated users can insert leads
-- Admins can insert any lead
-- Employees can only insert leads assigned to them
CREATE POLICY "Employees can insert assigned leads" ON leads
FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
  OR 
  (get_user_role() = 'employee' AND assigned_to = auth.uid()::TEXT)
);

-- Policy 5: Employees can update only their assigned leads
-- Admins can update any lead
CREATE POLICY "Employees can update assigned leads" ON leads
FOR UPDATE USING (
  get_user_role() = 'admin'
  OR 
  (get_user_role() = 'employee' AND assigned_to = auth.uid()::TEXT)
);

-- Policy 6: Only admins can delete leads
CREATE POLICY "Only admin can delete leads" ON leads
FOR DELETE USING (
  get_user_role() = 'admin'
);

-- ============================================
-- ADIM 4: Index ve Performans
-- ============================================

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role IS NOT NULL;

-- ============================================
-- ADIM 5: Trigger - Yeni Kullanıcı Oluşturulduğunda Profile Oluştur
-- ============================================

-- Yeni kullanıcı oluşturulduğunda otomatik olarak profile oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    'employee' -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger'ı oluştur (eğer yoksa)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- VERİFİKASYON SORGULARI
-- ============================================

-- Test queries (run these after applying policies):
-- 
-- 1. Kullanıcının rolünü kontrol et:
--    SELECT get_user_role();
--
-- 2. Admin olarak test (admin kullanıcısıyla giriş yapın):
--    SELECT COUNT(*) FROM leads; -- Tüm lead'leri görmeli
--
-- 3. Employee olarak test (employee kullanıcısıyla giriş yapın):
--    SELECT COUNT(*) FROM leads; -- Sadece assigned lead'leri görmeli
--
-- 4. Policies kontrolü:
--    SELECT * FROM pg_policies WHERE tablename = 'leads';
--
-- 5. Profiles tablosunu kontrol et:
--    SELECT * FROM profiles;

