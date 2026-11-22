-- Apply after the existing shared flipping demos schema.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flipping-demo-photos', 'flipping-demo-photos', false, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DROP POLICY IF EXISTS "Admins upload demo photos" ON storage.objects;
CREATE POLICY "Admins upload demo photos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'flipping-demo-photos'
  AND (select public.is_pomah_admin())
  AND name ~ '^(demo|cibinong|sawangan|jatiasih)/[a-f0-9-]{36}\.(jpg|png|webp)$'
);

DROP POLICY IF EXISTS "Read authorized demo photos" ON storage.objects;
CREATE POLICY "Read authorized demo photos" ON storage.objects FOR SELECT TO anon, authenticated
USING (
  bucket_id = 'flipping-demo-photos'
  AND (
    (select public.is_pomah_admin())
    OR EXISTS (
      SELECT 1
      FROM public.pomah_flipping_demos AS demo
      WHERE demo.published
        AND demo.id = split_part(storage.objects.name, '/', 1)
        AND demo.payload->'demoPhotos' @>
          jsonb_build_array(jsonb_build_object('path', storage.objects.name))
    )
  )
);

COMMIT;
