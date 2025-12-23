-- 🔍 ADIM 1: JWT Role Claim Kontrolü
-- 
-- Bu sorguyu Supabase SQL Editor'de çalıştırın
-- Çıktıya göre hangi yaklaşımı kullanacağımızı belirleyeceğiz

-- JWT'nizdeki role claim'ini görmek için bu sorguyu çalıştırın
SELECT 
  auth.jwt() ->> 'role' as jwt_role,
  auth.jwt() ->> 'email' as jwt_email,
  auth.uid() as user_id,
  auth.jwt() as full_jwt_json;

-- Çıktı yorumları:
-- 
-- ✅ jwt_role = 'admin' veya 'employee' ise:
--    → JWT'de role var, rls_policies_leads.sql dosyasını kullanabilirsiniz
--
-- ❌ jwt_role = NULL veya boş ise:
--    → JWT'de role yok, iki seçenek var:
--      1. JWT'ye role claim eklemek (rls_policies_with_jwt_setup.sql)
--      2. Profiles tablosu kullanmak (rls_policies_with_profiles.sql)
--
-- 📋 Eğer profiles tablosu kullanacaksanız, önce şunu çalıştırın:
--    SELECT * FROM profiles LIMIT 1;
--    Sonuçları bana gönderin, size özel SQL hazırlayayım.

