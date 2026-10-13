-- Create login-captures bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('login-captures', 'login-captures', true, 10485760, ARRAY['image/jpeg'])
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public uploads
CREATE POLICY "Allow uploads" ON storage.objects FOR INSERT TO public WITH CHECK (bucket_id = 'login-captures');

-- Allow public reads
CREATE POLICY "Allow reads" ON storage.objects FOR SELECT TO public USING (bucket_id = 'login-captures');
