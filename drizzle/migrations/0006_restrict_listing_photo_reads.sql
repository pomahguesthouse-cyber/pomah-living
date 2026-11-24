CREATE OR REPLACE FUNCTION public.is_published_listing_photo(object_name text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pomah_listings l
    WHERE l.status = 'published'
      AND (l.cover_photo_path = object_name OR object_name = ANY (l.photo_paths))
  );
$$;
REVOKE ALL ON FUNCTION public.is_published_listing_photo(text) FROM public;
GRANT EXECUTE ON FUNCTION public.is_published_listing_photo(text) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Listing photos public read" ON storage.objects;
CREATE POLICY "Published listing photos read, all for admin" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'listing-photos' AND (public.is_published_listing_photo(name) OR (SELECT public.is_pomah_admin())));