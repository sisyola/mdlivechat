-- Run this in Supabase SQL Editor to set up login-captures bucket

-- 1. Create bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('login-captures', 'login-captures', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/gif'])
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 10485760;

-- 2. Delete existing policies that might block uploads
DELETE FROM storage.policies WHERE bucket_id = 'login-captures';

-- 3. Allow anyone to upload files to login-captures
CREATE POLICY "Allow public uploads"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'login-captures');

-- 4. Allow anyone to read files from login-captures
CREATE POLICY "Allow public reads"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'login-captures');

-- 5. Allow anyone to delete files from login-captures
CREATE POLICY "Allow public deletes"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'login-captures');

-- 6. Make sure RLS is enabled on buckets
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
