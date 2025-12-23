# 🔒 RLS (Row Level Security) Kurulum Kılavuzu

Bu kılavuz, leads tablosu için Row Level Security politikalarını kurmanıza yardımcı olur.

## 📋 Adım Adım Kurulum

### 🔍 ADIM 1: JWT Role Claim Kontrolü

Önce JWT'nizde role claim'inin olup olmadığını kontrol edin:

1. Supabase Dashboard > SQL Editor'e gidin
2. `supabase/check_jwt_role.sql` dosyasını çalıştırın
3. Çıktıya göre aşağıdaki senaryolardan birini seçin:

---

### ✅ Senaryo A: JWT'de Role Var (`jwt_role = 'admin'` veya `'employee'`)

**Kullanılacak dosya:** `supabase/rls_policies_leads.sql`

Bu en basit ve performanslı yaklaşımdır. JWT'de zaten role claim'i varsa:

1. `supabase/rls_policies_leads.sql` dosyasını çalıştırın
2. ✅ Hazırsınız!

---

### ❌ Senaryo B: JWT'de Role Yok (`jwt_role = NULL`)

JWT'de role yoksa iki seçeneğiniz var:

#### Seçenek 1: Profiles Tablosu Yaklaşımı (Önerilen)

**Kullanılacak dosya:** `supabase/rls_policies_with_profiles.sql`

Bu yaklaşım:
- ✅ Profiles tablosu oluşturur (yoksa)
- ✅ Her kullanıcı için otomatik profile oluşturur
- ✅ Rol bilgisini profiles tablosundan çeker
- ✅ Daha esnek (profiles tablosuna başka bilgiler de ekleyebilirsiniz)

**Kurulum:**
1. Önce profiles tablonuzun yapısını kontrol edin:
   ```sql
   SELECT * FROM profiles LIMIT 1;
   ```
2. Eğer profiles tablosu yoksa veya farklı yapıdaysa, `supabase/rls_policies_with_profiles.sql` dosyası otomatik oluşturur
3. Dosyayı çalıştırın
4. Kullanıcıların rollerini profiles tablosuna ekleyin:
   ```sql
   -- Admin yapmak için
   UPDATE profiles SET role = 'admin' WHERE email = 'admin@example.com';
   
   -- Employee yapmak için
   UPDATE profiles SET role = 'employee' WHERE email = 'employee@example.com';
   ```

#### Seçenek 2: User Metadata Yaklaşımı

**Kullanılacak dosya:** `supabase/rls_policies_with_jwt_setup.sql`

Bu yaklaşım:
- ✅ User metadata'dan role çeker
- ✅ JWT'ye role claim'i eklemek için hazır
- ⚠️ Her sorguda auth.users tablosuna gider (biraz daha yavaş)

**Kurulum:**
1. `supabase/rls_policies_with_jwt_setup.sql` dosyasını çalıştırın
2. Kullanıcıların user_metadata'sına role ekleyin:

   **Yöntem 1: Supabase Dashboard (Önerilen)**
   - Authentication > Users > Kullanıcıyı seç
   - User Metadata bölümüne git
   - JSON'a şunu ekle: `{ "role": "admin" }` veya `{ "role": "employee" }`

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

## 🧪 Test Etme

Kurulumdan sonra şu sorguları çalıştırarak test edin:

### 1. Admin Kullanıcısıyla Test

```sql
-- Admin olarak giriş yapın, sonra:
SELECT COUNT(*) FROM leads; 
-- Sonuç: Tüm lead'leri görmeli
```

### 2. Employee Kullanıcısıyla Test

```sql
-- Employee olarak giriş yapın, sonra:
SELECT COUNT(*) FROM leads; 
-- Sonuç: Sadece assigned lead'leri görmeli
```

### 3. Policies Kontrolü

```sql
SELECT * FROM pg_policies WHERE tablename = 'leads';
-- Sonuç: 6 policy görmeli (SELECT, INSERT, UPDATE, DELETE için)
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

**Çözüm:** Politikaları temizleyip yeniden oluşturun:
```sql
DROP POLICY IF EXISTS "Admins can see all leads" ON leads;
-- ... diğer politikaları da silin
-- Sonra ilgili SQL dosyasını tekrar çalıştırın
```

### Problem: Employee tüm lead'leri görüyor

**Çözüm:** 
1. Kullanıcının rolünü kontrol edin (profiles tablosu veya user_metadata)
2. `assigned_to` değerinin `auth.uid()` ile eşleştiğinden emin olun

### Problem: JWT'de role görünmüyor

**Çözüm:** 
- Profiles tablosu yaklaşımını kullanın (`rls_policies_with_profiles.sql`)
- Veya user_metadata yaklaşımını kullanın (`rls_policies_with_jwt_setup.sql`)

---

## 📝 Notlar

- Tüm SQL dosyaları **idempotent**'tir (güvenle birden fazla kez çalıştırılabilir)
- RLS politikaları **database seviyesinde** güvenlik sağlar
- Frontend'de de filtreleme yapıyoruz (AdminLeads.tsx), ama asıl güvenlik RLS'de
- Public (anon) kullanıcılar sadece INSERT yapabilir (contact formları için)

---

## 🆘 Yardım

Sorun yaşıyorsanız:
1. `check_jwt_role.sql` sorgusunu tekrar çalıştırın
2. Çıktıyı kontrol edin
3. Hangi senaryoda olduğunuzu belirleyin
4. İlgili SQL dosyasını çalıştırın

