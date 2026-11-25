DROP POLICY IF EXISTS "Settings public read" ON public.app_settings;
CREATE POLICY "Public reads site settings, admin reads all" ON public.app_settings
  FOR SELECT TO anon, authenticated
  USING (key IN ('land_split', 'analysis_defaults') OR (SELECT public.is_pomah_admin()));