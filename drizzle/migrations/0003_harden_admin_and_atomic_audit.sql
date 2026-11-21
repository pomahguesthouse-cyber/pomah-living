GRANT ALL ON public.admin_roles, public.hero_slides, public.partner_approvals, public.admin_audit_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.admin_audit_log_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.is_pomah_admin() TO anon, service_role;
DROP POLICY "Admins insert their audit" ON public.admin_audit_log;
REVOKE INSERT, UPDATE, DELETE ON public.admin_audit_log FROM authenticated, anon;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS before_data jsonb;
ALTER TABLE public.admin_audit_log ADD COLUMN IF NOT EXISTS after_data jsonb;
CREATE OR REPLACE FUNCTION public.validate_pomah_admin_change() RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
 IF TG_TABLE_NAME = 'hero_slides' THEN
  IF NEW.image_url !~ '^https://([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(:443)?/[^[:space:]]*$' OR NEW.image_url ~* '^https://([^/]*\.)?(localhost|local|internal|test|invalid)(:443)?/' THEN RAISE EXCEPTION 'Gunakan URL gambar HTTPS publik tanpa kredensial.'; END IF;
  IF length(trim(NEW.title)) = 0 OR length(trim(NEW.image_alt)) = 0 OR length(NEW.image_alt)>180 OR length(NEW.description)>350 OR length(NEW.eyebrow)>100 OR length(NEW.button_label)>80 OR NEW.sort_order NOT BETWEEN 0 AND 999 THEN RAISE EXCEPTION 'Isi judul, deskripsi gambar, dan urutan 0–999 yang valid.'; END IF;
  NEW.updated_at := now();
 ELSIF TG_TABLE_NAME = 'partner_approvals' THEN
  IF length(NEW.note)>2000 THEN RAISE EXCEPTION 'Catatan maksimal 2000 karakter.'; END IF;
  IF TG_OP = 'UPDATE' THEN
   IF NEW.user_id <> OLD.user_id OR NEW.requested_role <> OLD.requested_role OR NEW.created_at <> OLD.created_at THEN RAISE EXCEPTION 'Identitas permohonan tidak dapat diubah.'; END IF;
   IF public.is_pomah_admin() THEN
    IF OLD.status <> 'pending' OR NEW.status NOT IN ('approved','rejected','revision') THEN RAISE EXCEPTION 'Permohonan sudah diproses; muat ulang daftar.'; END IF;
    NEW.reviewed_by := auth.uid(); NEW.reviewed_at := now();
   ELSE
    IF OLD.user_id <> auth.uid() OR OLD.status <> 'revision' OR NEW.status <> 'pending' THEN RAISE EXCEPTION 'Hanya permohonan revisi milik sendiri dapat dikirim ulang.'; END IF;
    NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
   END IF;
  ELSE
   NEW.reviewed_by := NULL; NEW.reviewed_at := NULL;
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_hero_slide BEFORE INSERT OR UPDATE ON public.hero_slides FOR EACH ROW EXECUTE FUNCTION public.validate_pomah_admin_change();
CREATE TRIGGER validate_partner_approval BEFORE INSERT OR UPDATE ON public.partner_approvals FOR EACH ROW EXECUTE FUNCTION public.validate_pomah_admin_change();
CREATE OR REPLACE FUNCTION public.audit_pomah_admin_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE previous jsonb; following jsonb; target_id text; actor uuid;
BEGIN
 IF TG_OP <> 'INSERT' THEN previous := to_jsonb(OLD); END IF;
 IF TG_OP <> 'DELETE' THEN following := to_jsonb(NEW); END IF;
 target_id := coalesce(following->>'id',previous->>'id',following->>'user_id',previous->>'user_id');
 actor := auth.uid();
 IF TG_TABLE_NAME = 'admin_roles' THEN actor := coalesce(actor,(coalesce(following,previous)->>'user_id')::uuid); END IF;
 IF actor IS NULL THEN RAISE EXCEPTION 'Identitas pelaku diperlukan untuk audit.'; END IF;
 INSERT INTO public.admin_audit_log(actor_id,action,target,before_data,after_data) VALUES(actor,TG_TABLE_NAME||'.'||lower(TG_OP),target_id,previous,following);
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION public.audit_pomah_admin_change() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER audit_hero_slides AFTER INSERT OR UPDATE OR DELETE ON public.hero_slides FOR EACH ROW EXECUTE FUNCTION public.audit_pomah_admin_change();
CREATE TRIGGER audit_partner_approvals AFTER INSERT OR UPDATE ON public.partner_approvals FOR EACH ROW EXECUTE FUNCTION public.audit_pomah_admin_change();
CREATE TRIGGER audit_admin_roles AFTER INSERT OR UPDATE ON public.admin_roles FOR EACH ROW EXECUTE FUNCTION public.audit_pomah_admin_change();
CREATE POLICY "Owners resubmit requested revisions" ON public.partner_approvals FOR UPDATE TO authenticated USING(user_id=(select auth.uid()) AND status='revision') WITH CHECK(user_id=(select auth.uid()) AND status='pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);
CREATE OR REPLACE FUNCTION public.pomah_admin_directory(search_text text DEFAULT '', status_filter text DEFAULT '', role_filter text DEFAULT '', page_number integer DEFAULT 0) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE result jsonb;
BEGIN
 IF NOT public.is_pomah_admin() THEN RAISE EXCEPTION 'Akses administrator diperlukan.' USING ERRCODE='42501'; END IF;
 IF page_number < 0 OR length(search_text)>100 THEN RAISE EXCEPTION 'Filter tidak valid.'; END IF;
 WITH directory AS (SELECT u.id,u.email,u.created_at,u.last_sign_in_at,coalesce(p.full_name,p.display_name,'Nama belum diisi') AS name,a.requested_role,coalesce(a.status,'regular') AS status,a.note,a.reviewed_at FROM auth.users u LEFT JOIN public.profiles p ON p.id=u.id LEFT JOIN public.partner_approvals a ON a.user_id=u.id), filtered AS (SELECT * FROM directory WHERE (search_text='' OR name ILIKE '%'||search_text||'%' OR email ILIKE '%'||search_text||'%') AND (status_filter='' OR status=status_filter) AND (role_filter='' OR requested_role=role_filter))
 SELECT jsonb_build_object('total',(SELECT count(*) FROM filtered),'rows',coalesce((SELECT jsonb_agg(t) FROM (SELECT * FROM filtered ORDER BY created_at DESC,id LIMIT 25 OFFSET least(page_number,100000)*25) t),'[]'::jsonb),'accounts',(SELECT count(*) FROM auth.users),'pending',(SELECT count(*) FROM public.partner_approvals WHERE status='pending'),'published',(SELECT count(*) FROM public.hero_slides WHERE published)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.pomah_admin_directory(text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.pomah_admin_directory(text,text,text,integer) TO authenticated;
COMMENT ON TABLE public.admin_roles IS 'Provision only through trusted owner-authorized database operations; no authenticated role writes.';