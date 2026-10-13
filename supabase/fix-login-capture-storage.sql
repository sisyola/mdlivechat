-- Fix RLS for login-captures bucket
-- Allow public uploads to login-captures bucket

-- First, ensure RLS is enabled
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Delete any existing policies that might block uploads
DELETE FROM storage.policies WHERE bucket_id = 'login-captures';

-- Allow anyone to upload files (anonymous uploads for login captures)
CREATE POLICY "Allow public uploads to login-captures"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'login-captures'
);

-- Allow anyone to read files from login-captures
CREATE POLICY "Allow public reads from login-captures"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'login-captures'
);

-- Allow anyone to delete files from login-captures
CREATE POLICY "Allow public deletes from login-captures"
ON storage.objects
FOR DELETE
TO public
USING (
  bucket_id = 'login-captures'
);

-- Make the bucket public (allow listing)
UPDATE storage.buckets
SET public = true
WHERE id = 'login-captures';
