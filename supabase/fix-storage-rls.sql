-- ============================================
-- Fix Storage RLS - allow all uploads
-- Run di Supabase SQL Editor
-- ============================================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
DROP POLICY IF EXISTS "Public attachment read" ON storage.objects;
DROP POLICY IF EXISTS "Attachment upload" ON storage.objects;
DROP POLICY IF EXISTS "Attachment update" ON storage.objects;
DROP POLICY IF EXISTS "Attachment delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow all" ON storage.objects;
DROP POLICY IF EXISTS "allow_all" ON storage.objects;

-- Create permissive policies for both buckets
CREATE POLICY "Allow all operations on storage" ON storage.objects
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Verify
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'storage';

DO $$
BEGIN
  RAISE NOTICE '✅ Storage RLS policies set to allow all';
  RAISE NOTICE 'Avatar + attachment uploads should work now';
END $$;