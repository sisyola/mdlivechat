-- ============================================
-- Promote first user to master_admin
-- Run AFTER schema + policies + triggers + realtime
-- ============================================

-- Replace email with your admin email
UPDATE public.profiles
SET global_role = 'master_admin'
WHERE email = 'mediana@gmail.com';

-- Verify
SELECT email, full_name, global_role, created_at
FROM public.profiles
ORDER BY created_at DESC;

DO $$
BEGIN
  RAISE NOTICE '✅ Master admin promoted';
  RAISE NOTICE 'Login as mediana@gmail.com to access /master panel';
END $$;