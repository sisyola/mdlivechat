-- ============================================
-- Force sync profiles for existing auth.users
-- ============================================
-- Run di Supabase SQL Editor
-- ============================================

-- 1. Cek profiles vs auth.users
SELECT
  au.id,
  au.email,
  au.created_at as auth_created,
  p.id as profile_id,
  p.global_role
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
ORDER BY au.created_at DESC;

-- 2. Cek apakah trigger exist
SELECT trigger_name, event_manipulation, event_object_schema, event_object_table
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- 3. Cek function exist
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN ('handle_new_user', 'auto_approve_account', 'handle_new_account');

-- 4. Insert profile untuk users yang belum punya (langsung, tanpa trigger)
INSERT INTO public.profiles (id, email, full_name, global_role)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  'account_owner'
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- 5. Promote mediana to master_admin
UPDATE public.profiles
SET global_role = 'master_admin'
WHERE email = 'mediana@gmail.com';

-- 6. Verify
SELECT email, full_name, global_role
FROM public.profiles
ORDER BY created_at DESC;

DO $$
BEGIN
  RAISE NOTICE '✅ Profiles synced with auth.users';
  RAISE NOTICE 'Run login again to test';
END $$;