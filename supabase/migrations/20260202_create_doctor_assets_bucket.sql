-- Create storage bucket for doctor assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('doctor-assets', 'doctor-assets', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow doctors to upload to their own folder
CREATE POLICY "Doctors can upload own assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'doctor-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow doctors to update their own assets
CREATE POLICY "Doctors can update own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'doctor-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow doctors to delete their own assets
CREATE POLICY "Doctors can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'doctor-assets' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public access to view assets (or restrict to authenticated if preferred)
-- For signatures/stamps, we typically want them visible on generated PDFs which might be public or presigned.
-- Let's allow public read for now to simplify the PDF generation "auto-apply" requirement.
CREATE POLICY "Public can view doctor assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'doctor-assets');
