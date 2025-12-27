-- Profiles Backfill + Role Assignment
-- Run this in Supabase SQL Editor to fix role issues
-- This ensures all auth users have profiles entries with correct roles

-- ============================================
-- 1. Create missing profiles entries
-- ============================================
-- Add profiles for any auth.users that don't have a profile yet
INSERT INTO public.profiles (id, role, created_at)
SELECT u.id, 'patient', now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ============================================
-- 2. Set roles based on email
-- ============================================
-- Update existing profiles with correct roles based on email
UPDATE public.profiles p
SET role = CASE
  WHEN u.email IN ('admin@smiledesignturkey.com', 'admin2@smiledesignturkey.com') THEN 'admin'
  WHEN u.email IN ('doctor@smiledesignturkey.com') THEN 'doctor'
  WHEN u.email IN ('employee1@smiledesignturkey.com', 'employee2@smiledesignturkey.com') THEN 'employee'
  WHEN u.email IN ('patient@smiledesignturkey.com') THEN 'patient'
  ELSE COALESCE(p.role, 'patient') -- Default to 'patient' if no match
END
FROM auth.users u
WHERE u.id = p.id;

-- ============================================
-- 3. Verification Query
-- ============================================
-- Run this to verify all users have profiles and correct roles:
-- SELECT u.email, p.role, p.created_at
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- ORDER BY u.email;

