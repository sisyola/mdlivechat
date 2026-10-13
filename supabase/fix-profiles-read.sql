-- ============================================
-- Ensure profiles can be read by anon for widget
-- ============================================

-- Make profiles public-readable (kalo belum)
DROP POLICY IF EXISTS "Public profiles read" ON public.profiles;
CREATE POLICY "Public profiles read" ON public.profiles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Verify
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

DO $$
BEGIN
  RAISE NOTICE '✅ Profiles table is now readable by anon + authenticated';
END $$;