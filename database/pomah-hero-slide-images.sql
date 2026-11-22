-- Apply after the existing hero slides schema.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hero-slide-images', 'hero-slide-images', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "Admins upload hero slide images" ON storage.objects;
CREATE POLICY "Admins upload hero slide images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hero-slide-images'
  AND (select public.is_pomah_admin())
  AND name ~ '^[a-f0-9-]{36}\.(jpg|png|webp)$'
);

DROP POLICY IF EXISTS "Read authorized hero slide images" ON storage.objects;
CREATE POLICY "Read authorized hero slide images" ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'hero-slide-images'
  AND (
    (select public.is_pomah_admin())
    OR EXISTS (
      SELECT 1 FROM public.hero_slides AS slide
      WHERE slide.published
        AND right(slide.image_url, length('/storage/v1/object/public/hero-slide-images/' || storage.objects.name))
          = '/storage/v1/object/public/hero-slide-images/' || storage.objects.name
    )
  )
);

COMMIT;
