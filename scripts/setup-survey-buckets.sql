-- Run this in the Supabase SQL Editor to create the required storage buckets for Site Surveys

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('survey-photos', 'survey-photos', true, 10485760, '{image/jpeg,image/png,image/webp,image/heic}'),
  ('survey-documents', 'survey-documents', true, 20971520, '{application/pdf,image/jpeg,image/png,image/webp}'),
  ('survey-bills', 'survey-bills', true, 20971520, '{application/pdf,image/jpeg,image/png,image/webp}')
ON CONFLICT (id) DO UPDATE SET 
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Set up RLS policies (optional, adjust based on your security requirements)
-- Allow public read access
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('survey-photos', 'survey-documents', 'survey-bills'));

-- Allow authenticated uploads
CREATE POLICY "Authenticated Uploads" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id IN ('survey-photos', 'survey-documents', 'survey-bills'));
