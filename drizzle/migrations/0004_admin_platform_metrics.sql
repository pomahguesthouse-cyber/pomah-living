-- Apply manually before deploying the dashboard.
-- Aggregate metrics server-side so RLS-protected user projects remain private.
CREATE OR REPLACE FUNCTION public.pomah_admin_metrics()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_pomah_admin() THEN
    RAISE EXCEPTION 'Akses administrator diperlukan.' USING ERRCODE = '42501';
  END IF;
  SELECT jsonb_build_object(
    'users', (SELECT count(*) FROM auth.users),
    'projects', (SELECT count(*) FROM public.pomah_projects),
    'sold', (SELECT count(*) FROM public.pomah_projects WHERE status = 'sold'),
    'pending', (SELECT count(*) FROM public.partner_approvals WHERE status = 'pending'),
    'published', (SELECT count(*) FROM public.hero_slides WHERE published),
    'assets', NULL
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.pomah_admin_metrics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pomah_admin_metrics() TO authenticated;
