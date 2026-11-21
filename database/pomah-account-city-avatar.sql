-- Apply before deploying the Edit Akun update.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS residence_regency text;
-- Public avatar bucket; object writes are restricted to the signed-in owner's folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars','avatars',true,5242880,ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public=true, file_size_limit=5242880, allowed_mime_types=ARRAY['image/jpeg','image/png','image/webp'];
DROP POLICY IF EXISTS "Account owners upload avatars" ON storage.objects;
CREATE POLICY "Account owners upload avatars" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id='avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);
DROP POLICY IF EXISTS "Account owners delete avatars" ON storage.objects;
CREATE POLICY "Account owners delete avatars" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id='avatars' AND (storage.foldername(name))[1] = (select auth.uid())::text);
