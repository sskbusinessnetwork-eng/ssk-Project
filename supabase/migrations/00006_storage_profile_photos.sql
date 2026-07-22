-- Create profile_photos bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile_photos', 'profile_photos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to profile_photos
CREATE POLICY "Public profile photos access" ON storage.objects
FOR SELECT USING (bucket_id = 'profile_photos');

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Users can upload their own profile photos" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile_photos' AND
  (storage.foldername(name))[1] = auth.uid()::text OR
  auth.role() = 'authenticated'
);

-- Allow authenticated users to update their own profile photos
CREATE POLICY "Users can update their own profile photos" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile_photos' AND
  (storage.foldername(name))[1] = auth.uid()::text OR
  auth.role() = 'authenticated'
);

-- Allow authenticated users to delete their own profile photos
CREATE POLICY "Users can delete their own profile photos" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'profile_photos' AND
  (storage.foldername(name))[1] = auth.uid()::text OR
  auth.role() = 'authenticated'
);

-- Update users table RLS to ensure they can update their own record
CREATE POLICY "Users can update their own record" ON public.users
FOR UPDATE TO authenticated
USING (auth.uid() = id);

