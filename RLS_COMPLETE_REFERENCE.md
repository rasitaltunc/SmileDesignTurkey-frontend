# 🔒 Supabase RLS (Row Level Security) - Tam Referans Dokümantasyonu

Bu dosya, Supabase RLS kurulumu için tüm gerekli bilgileri içerir. Başka bir yapay zekaya veya geliştiriciye paylaşmak için hazırlanmıştır.

---

## 📋 İçindekiler

1. [Proje Özeti](#proje-özeti)
2. [JWT Role Kontrolü](#jwt-role-kontrolü)
3. [RLS Politikaları - Senaryo A: JWT'de Role Var](#senaryo-a-jwtde-role-var)
4. [RLS Politikaları - Senaryo B: Profiles Tablosu Yaklaşımı](#senaryo-b-profiles-tablosu-yaklaşımı)
5. [RLS Politikaları - Senaryo C: User Metadata Yaklaşımı](#senaryo-c-user-metadata-yaklaşımı)
6. [Frontend Implementation (AdminLeads.tsx)](#frontend-implementation)
7. [Test ve Doğrulama](#test-ve-doğrulama)

---

## 🎯 Proje Özeti

**Amaç:** Leads (müşteri adayları) tablosu için Row Level Security (RLS) politikaları kurmak.

**Gereksinimler:**
- Admin kullanıcıları: Tüm lead'leri görebilir ve yönetebilir
- Employee kullanıcıları: Sadece kendilerine atanan lead'leri görebilir ve yönetebilir
- Public (anon): Sadece yeni lead ekleyebilir (contact formları için)

**Teknoloji Stack:**
- Supabase (PostgreSQL + Auth)
- React + TypeScript
- Zustand (State Management)

---

## 🔍 JWT Role Kontrolü

### Kontrol Sorgusu

```sql
-- 🔍 ADIM 1: JWT Role Claim Kontrolü
-- 
-- Bu sorguyu Supabase SQL Editor'de çalıştırın
-- Çıktıya göre hangi yaklaşımı kullanacağımızı belirleyeceğiz

SELECT 
  auth.jwt() ->> 'role' as jwt_role,
  auth.jwt() ->> 'email' as jwt_email,
  auth.uid() as user_id,
  auth.jwt() as full_jwt_json;

-- Çıktı yorumları:
-- 
-- ✅ jwt_role = 'admin' veya 'employee' ise:
--    → JWT'de role var, Senaryo A'yı kullanın
--
-- ❌ jwt_role = NULL veya boş ise:
--    → JWT'de role yok, Senaryo B veya C'yi kullanın
```

---

## 📝 Senaryo A: JWT'de Role Var

**Kullanım:** JWT'de zaten `role` claim'i varsa bu yaklaşımı kullanın.

### SQL Kodu

```sql
-- Row Level Security (RLS) Policies for Leads Table
-- 
-- Instructions:
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Paste this entire file and run it
-- 3. This migration is idempotent (safe to run multiple times)

-- 1. Enable RLS (if not already enabled)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Admins can see all leads" ON leads;
DROP POLICY IF EXISTS "Employees see only assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can insert assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can update assigned leads" ON leads;
DROP POLICY IF EXISTS "Only admin can delete leads" ON leads;
DROP POLICY IF EXISTS "Allow public insert" ON leads;

-- 3. Policy 1: Admins can see all leads
CREATE POLICY "Admins can see all leads" ON leads
FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'admin'
);

-- 4. Policy 2: Employees can only see their assigned leads
CREATE POLICY "Employees see only assigned leads" ON leads
FOR SELECT USING (
  (auth.jwt() ->> 'role') = 'employee' 
  AND assigned_to = auth.uid()
);

-- 5. Policy 3: Public can insert leads (for contact forms and onboarding)
CREATE POLICY "Allow public insert" ON leads
FOR INSERT 
TO anon
WITH CHECK (true);

-- 6. Policy 4: Employees can insert leads assigned to them
CREATE POLICY "Employees can insert assigned leads" ON leads
FOR INSERT WITH CHECK (
  (auth.jwt() ->> 'role') = 'admin'
  OR 
  (assigned_to = auth.uid())
);

-- 7. Policy 5: Employees can update only their assigned leads
CREATE POLICY "Employees can update assigned leads" ON leads
FOR UPDATE USING (
  (auth.jwt() ->> 'role') = 'admin'
  OR 
  (assigned_to = auth.uid())
);

-- 8. Policy 6: Only admins can delete leads
CREATE POLICY "Only admin can delete leads" ON leads
FOR DELETE USING (
  (auth.jwt() ->> 'role') = 'admin'
);

-- 9. Create index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
```

---

## 📝 Senaryo B: Profiles Tablosu Yaklaşımı

**Kullanım:** JWT'de role yoksa ve profiles tablosu kullanmak istiyorsanız.

### SQL Kodu

```sql
-- Row Level Security (RLS) Policies for Leads Table
-- PROFILES TABLOSU YAKLAŞIMI

-- ============================================
-- ADIM 1: Profiles Tablosu Oluşturma (Eğer Yoksa)
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- ADIM 2: Helper Function - Kullanıcının Rolünü Döndürür
-- ============================================

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

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can see all leads" ON leads;
DROP POLICY IF EXISTS "Employees see only assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can insert assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can update assigned leads" ON leads;
DROP POLICY IF EXISTS "Only admin can delete leads" ON leads;
DROP POLICY IF EXISTS "Allow public insert" ON leads;

CREATE POLICY "Admins can see all leads" ON leads
FOR SELECT USING (
  get_user_role() = 'admin'
);

CREATE POLICY "Employees see only assigned leads" ON leads
FOR SELECT USING (
  get_user_role() = 'employee' 
  AND assigned_to = auth.uid()::TEXT
);

CREATE POLICY "Allow public insert" ON leads
FOR INSERT 
TO anon
WITH CHECK (true);

CREATE POLICY "Employees can insert assigned leads" ON leads
FOR INSERT WITH CHECK (
  get_user_role() = 'admin'
  OR 
  (get_user_role() = 'employee' AND assigned_to = auth.uid()::TEXT)
);

CREATE POLICY "Employees can update assigned leads" ON leads
FOR UPDATE USING (
  get_user_role() = 'admin'
  OR 
  (get_user_role() = 'employee' AND assigned_to = auth.uid()::TEXT)
);

CREATE POLICY "Only admin can delete leads" ON leads
FOR DELETE USING (
  get_user_role() = 'admin'
);

-- ============================================
-- ADIM 4: Index ve Performans
-- ============================================

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role) WHERE role IS NOT NULL;

-- ============================================
-- ADIM 5: Trigger - Yeni Kullanıcı Oluşturulduğunda Profile Oluştur
-- ============================================

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### Kullanıcı Rollerini Ayarlama

```sql
-- Admin yapmak için
UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- Employee yapmak için
UPDATE profiles SET role = 'employee' WHERE email = 'employee@example.com';
```

---

## 📝 Senaryo C: User Metadata Yaklaşımı

**Kullanım:** JWT'de role yoksa ve user_metadata kullanmak istiyorsanız.

### SQL Kodu

```sql
-- Row Level Security (RLS) Policies for Leads Table
-- JWT ROLE CLAIM YAKLAŞIMI

-- ============================================
-- ADIM 1: JWT'ye Role Claim Eklemek için Function
-- ============================================

CREATE OR REPLACE FUNCTION get_user_role_from_metadata()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT raw_user_meta_data->>'role' FROM auth.users WHERE id = auth.uid()),
    'employee'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ADIM 2: Leads Tablosu için RLS Politikaları
-- ============================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can see all leads" ON leads;
DROP POLICY IF EXISTS "Employees see only assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can insert assigned leads" ON leads;
DROP POLICY IF EXISTS "Employees can update assigned leads" ON leads;
DROP POLICY IF EXISTS "Only admin can delete leads" ON leads;
DROP POLICY IF EXISTS "Allow public insert" ON leads;

CREATE POLICY "Admins can see all leads" ON leads
FOR SELECT USING (
  COALESCE(
    auth.jwt() ->> 'role',
    get_user_role_from_metadata()
  ) = 'admin'
);

CREATE POLICY "Employees see only assigned leads" ON leads
FOR SELECT USING (
  COALESCE(
    auth.jwt() ->> 'role',
    get_user_role_from_metadata()
  ) = 'employee' 
  AND assigned_to = auth.uid()::TEXT
);

CREATE POLICY "Allow public insert" ON leads
FOR INSERT 
TO anon
WITH CHECK (true);

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

CREATE POLICY "Only admin can delete leads" ON leads
FOR DELETE USING (
  COALESCE(
    auth.jwt() ->> 'role',
    get_user_role_from_metadata()
  ) = 'admin'
);

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
```

### Kullanıcı Rollerini Ayarlama

**Yöntem 1: Supabase Dashboard**
1. Authentication > Users > Kullanıcıyı seç
2. User Metadata bölümüne git
3. JSON'a şunu ekle: `{ "role": "admin" }` veya `{ "role": "employee" }`

**Yöntem 2: SQL ile**
```sql
-- Admin yapmak için
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'admin@example.com';

-- Employee yapmak için
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"role": "employee"}'::jsonb
WHERE email = 'employee@example.com';
```

---

## 💻 Frontend Implementation

### AdminLeads.tsx - Önemli Kısımlar

```typescript
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { useAuthStore } from '@/store/authStore';

export default function AdminLeads() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const isAdmin = user?.user_metadata?.role === 'admin';
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterAssignedTo, setFilterAssignedTo] = useState<string>('');

  // Load leads from Supabase
  const loadLeads = async () => {
    if (!isAuthenticated || !user) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not configured.');
    }

    // Build query
    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    // Apply filters
    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    if (filterAssignedTo) {
      query = query.eq('assigned_to', filterAssignedTo);
    }

    // CRITICAL FOR SECURITY: If user is an employee (not admin), 
    // automatically filter to show only their assigned leads
    if (!isAdmin && user.id) {
      query = query.eq('assigned_to', user.id);
    }

    const { data, error } = await query;
    
    if (error) {
      throw new Error(error.message || 'Failed to load leads');
    }

    setLeads(data || []);
  };

  // Update lead
  const updateLead = async (leadId: string, updates: { status?: string; notes?: string; assigned_to?: string }) => {
    if (!isAuthenticated || !user) return;

    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase client not configured.');
    }

    const { error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', leadId);

    if (error) {
      throw new Error(error.message || 'Failed to update lead');
    }

    await loadLeads();
  };

  // Auto-load when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      loadLeads();
    }
  }, [isAuthenticated, filterStatus, filterAssignedTo]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      window.history.pushState({}, '', '/login');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  // ... UI rendering code ...
}
```

### Önemli Noktalar

1. **Auth Store Kullanımı:**
   - `useAuthStore()` ile `user`, `isAuthenticated`, `logout` alınır
   - `isAdmin = user?.user_metadata?.role === 'admin'` ile admin kontrolü

2. **Güvenlik:**
   - Frontend'de employee için otomatik filtreleme: `if (!isAdmin && user.id) { query = query.eq('assigned_to', user.id); }`
   - Asıl güvenlik RLS politikalarında (database seviyesinde)

3. **Supabase Client:**
   - `getSupabaseClient()` ile client alınır
   - `.from('leads').select('*')` ile sorgu yapılır
   - `.eq()` ile filtreleme yapılır

---

## 🧪 Test ve Doğrulama

### 1. JWT Role Kontrolü

```sql
SELECT 
  auth.jwt() ->> 'role' as jwt_role,
  auth.jwt() ->> 'email' as jwt_email,
  auth.uid() as user_id;
```

### 2. Admin Kullanıcısıyla Test

```sql
-- Admin olarak giriş yapın, sonra:
SELECT COUNT(*) FROM leads; 
-- Sonuç: Tüm lead'leri görmeli
```

### 3. Employee Kullanıcısıyla Test

```sql
-- Employee olarak giriş yapın, sonra:
SELECT COUNT(*) FROM leads; 
-- Sonuç: Sadece assigned lead'leri görmeli
```

### 4. Policies Kontrolü

```sql
SELECT * FROM pg_policies WHERE tablename = 'leads';
-- Sonuç: 6 policy görmeli (SELECT, INSERT, UPDATE, DELETE için)
```

### 5. Profiles Tablosu Kontrolü (Eğer Senaryo B kullanıyorsanız)

```sql
SELECT * FROM profiles;
-- Sonuç: Tüm kullanıcıların profillerini görmeli
```

---

## 📊 Politikalar Özeti

| İşlem | Admin | Employee | Public (Anon) |
|-------|-------|----------|---------------|
| **SELECT** | Tüm lead'ler | Sadece assigned lead'ler | ❌ Yok |
| **INSERT** | Herhangi bir lead | Sadece kendine assigned | ✅ Tüm lead'ler |
| **UPDATE** | Tüm lead'ler | Sadece assigned lead'ler | ❌ Yok |
| **DELETE** | Tüm lead'ler | ❌ Yok | ❌ Yok |

---

## 🔧 Sorun Giderme

### Problem: "Policy does not exist" hatası

**Çözüm:**
```sql
DROP POLICY IF EXISTS "Admins can see all leads" ON leads;
-- ... diğer politikaları da silin
-- Sonra ilgili SQL dosyasını tekrar çalıştırın
```

### Problem: Employee tüm lead'leri görüyor

**Çözüm:**
1. Kullanıcının rolünü kontrol edin (profiles tablosu veya user_metadata)
2. `assigned_to` değerinin `auth.uid()` ile eşleştiğinden emin olun
3. RLS politikalarının doğru çalıştığından emin olun

### Problem: JWT'de role görünmüyor

**Çözüm:**
- Senaryo B (Profiles tablosu) veya Senaryo C (User metadata) yaklaşımını kullanın
- JWT'ye role claim eklemek için Supabase Dashboard'dan user_metadata'yı güncelleyin

---

## 📝 Notlar

- Tüm SQL dosyaları **idempotent**'tir (güvenle birden fazla kez çalıştırılabilir)
- RLS politikaları **database seviyesinde** güvenlik sağlar
- Frontend'de de filtreleme yapıyoruz (AdminLeads.tsx), ama asıl güvenlik RLS'de
- Public (anon) kullanıcılar sadece INSERT yapabilir (contact formları için)
- `assigned_to` değeri `auth.uid()::TEXT` formatında olmalı (UUID string'e çevrilmiş)

---

## 🆘 Yardım

Sorun yaşıyorsanız:
1. `check_jwt_role.sql` sorgusunu tekrar çalıştırın
2. Çıktıyı kontrol edin
3. Hangi senaryoda olduğunuzu belirleyin
4. İlgili SQL dosyasını çalıştırın

---

**Son Güncelleme:** 2024
**Versiyon:** 1.0
**Hazırlayan:** AI Assistant (Cursor)

