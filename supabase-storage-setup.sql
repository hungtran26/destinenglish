-- Kangaroo CBT — Supabase Storage Setup for Test Images
--
-- Run this in the Supabase SQL editor AFTER running supabase-schema.sql.
-- Creates a public storage bucket for test images.

-- ─────────────────────────────────────────
-- STORAGE BUCKET: test-images
-- ─────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'test-images',
  'test-images',
  true,
  10485760,  -- 10MB per file
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- ─────────────────────────────────────────
-- STORAGE POLICIES
-- ─────────────────────────────────────────

-- Anyone can read images (students need to view them)
CREATE POLICY "Public read access for test images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'test-images');

-- Authenticated users can upload images (admins)
CREATE POLICY "Authenticated users can upload test images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'test-images');

-- Authenticated users can update their uploads
CREATE POLICY "Authenticated users can update test images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'test-images');

-- Authenticated users can delete images
CREATE POLICY "Authenticated users can delete test images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'test-images');
