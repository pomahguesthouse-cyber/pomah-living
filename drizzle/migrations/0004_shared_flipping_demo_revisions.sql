CREATE TABLE public.pomah_flipping_demos (
 id text NOT NULL CHECK(id IN ('demo','cibinong','sawangan','jatiasih')),
 published boolean NOT NULL DEFAULT false,
 description text NOT NULL DEFAULT '' CHECK(length(description)<=2000),
 payload jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(id,published)
);
GRANT SELECT ON public.pomah_flipping_demos TO anon,authenticated;
GRANT INSERT,UPDATE ON public.pomah_flipping_demos TO authenticated;
GRANT ALL ON public.pomah_flipping_demos TO service_role;
ALTER TABLE public.pomah_flipping_demos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published fictional demos public" ON public.pomah_flipping_demos FOR SELECT TO anon,authenticated USING(published OR public.is_pomah_admin());
CREATE POLICY "Admin creates fictional demos" ON public.pomah_flipping_demos FOR INSERT TO authenticated WITH CHECK(public.is_pomah_admin());
CREATE POLICY "Admin updates fictional demos" ON public.pomah_flipping_demos FOR UPDATE TO authenticated USING(public.is_pomah_admin()) WITH CHECK(public.is_pomah_admin());
CREATE FUNCTION public.validate_flipping_demo() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
DECLARE field text; item jsonb; val numeric;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.published<>OLD.published) THEN RAISE EXCEPTION 'Demo identity cannot change'; END IF;
 IF octet_length(NEW.payload::text)>250000 OR NEW.payload->>'version'<>'1' OR jsonb_typeof(NEW.payload->'property') IS DISTINCT FROM 'object' OR length(trim(NEW.payload->'property'->>'name')) NOT BETWEEN 1 AND 500 OR jsonb_typeof(NEW.payload->'finance') IS DISTINCT FROM 'object' OR jsonb_typeof(NEW.payload->'rab') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid demo payload'; END IF;
 FOREACH field IN ARRAY ARRAY['purchase','auctionRate','bphtbBase','npoptkp','bphtbRate','notary','documentCheck','vacancy','utilities','loanPrincipal','interestRate','monthlyCarrying','months','marketing','reserve','sellerTaxRate','sellerFeeRate','sellerFixed','sale'] LOOP
  IF jsonb_typeof(NEW.payload->'finance'->field) IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'Missing finance value'; END IF;
  val:=(NEW.payload->'finance'->>field)::numeric;
  IF val<0 OR val>1000000000000 OR (field IN ('auctionRate','bphtbRate','interestRate','sellerTaxRate','sellerFeeRate') AND val>100) OR (field='months' AND val>120) THEN RAISE EXCEPTION 'Invalid finance value'; END IF;
 END LOOP;
 IF jsonb_array_length(NEW.payload->'rab')>200 THEN RAISE EXCEPTION 'Maximum 200 RAB items'; END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(NEW.payload->'rab') LOOP
  IF item->>'group' NOT IN ('Persiapan','Struktur','Arsitektur','MEP','Finishing','Contingency') OR jsonb_typeof(item->'volume') IS DISTINCT FROM 'number' OR jsonb_typeof(item->'price') IS DISTINCT FROM 'number' OR (item->>'volume')::numeric NOT BETWEEN 0 AND 1000000000000 OR (item->>'price')::numeric NOT BETWEEN 0 AND 1000000000000 THEN RAISE EXCEPTION 'Invalid RAB item'; END IF;
 END LOOP;
 NEW.revision:=CASE WHEN TG_OP='INSERT' THEN 1 ELSE OLD.revision+1 END;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
CREATE TRIGGER validate_flipping_demo BEFORE INSERT OR UPDATE ON public.pomah_flipping_demos FOR EACH ROW EXECUTE FUNCTION public.validate_flipping_demo();
CREATE TRIGGER audit_flipping_demo AFTER INSERT OR UPDATE ON public.pomah_flipping_demos FOR EACH ROW EXECUTE FUNCTION public.audit_pomah_admin_change();