-- ============================================
-- Setup Supabase Storage buckets
-- Run di Supabase SQL Editor
-- ============================================

-- Bucket untuk profile photos (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,  -- public read
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket untuk message attachments (public read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments',
  true,  -- public read
  10485760,  -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Storage policies
-- ============================================

-- Drop existing policies (just in case)
DROP POLICY IF EXISTS "Public avatar read" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;
DROP POLICY IF EXISTS "Public attachment read" ON storage.objects;
DROP POLICY IF EXISTS "Attachment upload" ON storage.objects;
DROP POLICY IF EXISTS "Attachment delete" ON storage.objects;

-- AVATARS: anyone can read, authenticated can upload to own folder
CREATE POLICY "Public avatar read" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar upload" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Avatar update" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Avatar delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'avatars');

-- ATTACHMENTS: anyone can read, anyone can upload (for widget)
CREATE POLICY "Public attachment read" ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "Attachment upload" ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Attachment delete" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'attachments');

-- Verify
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id IN ('avatars', 'attachments');

DO $$
BEGIN
  RAISE NOTICE '✅ Storage buckets + policies created';
  RAISE NOTICE 'avatars: 5MB max, public read';
  RAISE NOTICE 'attachments: 10MB max, public read';
END $$;