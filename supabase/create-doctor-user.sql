-- Create doctor user in Supabase (if missing)
-- Run this in Supabase SQL Editor

-- 1) Check if doctor exists
SELECT id, email, role, full_name FROM profiles WHERE role = 'doctor';

-- 2) If no rows returned, create a test doctor:

-- First, create auth user (if not exists)
-- Go to: Authentication → Users → Add User
-- Email: doctor@smiledesigntr.com
-- Password: [set a password]
-- Confirm: Yes

-- Then, get the user_id from auth.users and create profile:
INSERT INTO profiles (user_id, email, role, full_name, title)
SELECT 
  id,
  'doctor@smiledesigntr.com',
  'doctor',
  'Dr. Test Doctor',
  'DDS, PhD'
FROM auth.users
WHERE email = 'doctor@smiledesigntr.com'
ON CONFLICT (user_id) DO UPDATE SET
  role = 'doctor',
  full_name = 'Dr. Test Doctor';

-- 3) Verify doctor exists:
SELECT id, email, role, full_name FROM profiles WHERE role = 'doctor';

-- Expected: 1 row with role='doctor'
