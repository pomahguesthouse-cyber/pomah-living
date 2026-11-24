CREATE TABLE public.pomah_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text NOT NULL,
  address text NOT NULL DEFAULT '',
  regency_code text NOT NULL CHECK (regency_code ~ '^[0-9]{4}$'),
  source text NOT NULL CHECK (source IN ('btn','djkn','pomah','lainnya')),
  source_url text,
  auction_limit bigint NOT NULL CHECK (auction_limit >= 0),
  auction_date date,
  land_area numeric CHECK (land_area >= 0),
  building_area numeric CHECK (building_area >= 0),
  bedrooms int CHECK (bedrooms >= 0),
  bathrooms int CHECK (bathrooms >= 0),
  legal text NOT NULL DEFAULT 'SHM',
  occupancy_verified boolean NOT NULL DEFAULT false,
  access_verified boolean NOT NULL DEFAULT false,
  documents_verified boolean NOT NULL DEFAULT false,
  cover_photo_path text,
  photo_paths text[] NOT NULL DEFAULT '{}' CHECK (coalesce(array_length(photo_paths,1),0) <= 24),
  est_sale_price bigint NOT NULL DEFAULT 0 CHECK (est_sale_price >= 0),
  est_winning_price bigint CHECK (est_winning_price >= 0),
  est_purchase_costs bigint NOT NULL DEFAULT 0 CHECK (est_purchase_costs >= 0),
  est_renovation bigint NOT NULL DEFAULT 0 CHECK (est_renovation >= 0),
  est_holding_sale bigint NOT NULL DEFAULT 0 CHECK (est_holding_sale >= 0),
  target_profit bigint NOT NULL DEFAULT 0 CHECK (target_profit >= 0),
  notes text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pomah_listings_status_sort_idx ON public.pomah_listings(status, sort_order);

GRANT SELECT ON public.pomah_listings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pomah_listings TO authenticated;
GRANT ALL ON public.pomah_listings TO service_role;
ALTER TABLE public.pomah_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published listings public, all listings admin" ON public.pomah_listings FOR SELECT TO public
  USING (status = 'published' OR (SELECT public.is_pomah_admin()));
CREATE POLICY "Admin insert listings" ON public.pomah_listings FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_pomah_admin()));
CREATE POLICY "Admin update listings" ON public.pomah_listings FOR UPDATE TO authenticated
  USING ((SELECT public.is_pomah_admin())) WITH CHECK ((SELECT public.is_pomah_admin()));
CREATE POLICY "Admin delete listings" ON public.pomah_listings FOR DELETE TO authenticated
  USING ((SELECT public.is_pomah_admin()));

-- Default harga menang = limit lelang bila kosong
CREATE OR REPLACE FUNCTION public.default_listing_winning_price()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $$
BEGIN
  IF NEW.est_winning_price IS NULL THEN NEW.est_winning_price := NEW.auction_limit; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER default_listing_winning_price BEFORE INSERT OR UPDATE ON public.pomah_listings
  FOR EACH ROW EXECUTE FUNCTION public.default_listing_winning_price();
CREATE TRIGGER pomah_listings_touch BEFORE UPDATE ON public.pomah_listings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER audit_pomah_listings AFTER INSERT OR UPDATE OR DELETE ON public.pomah_listings
  FOR EACH ROW EXECUTE FUNCTION public.audit_pomah_admin_change();

-- Storage: listing-photos
CREATE POLICY "Listing photos public read" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'listing-photos');
CREATE POLICY "Admin upload listing photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'listing-photos' AND (SELECT public.is_pomah_admin()));
CREATE POLICY "Admin update listing photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'listing-photos' AND (SELECT public.is_pomah_admin()))
  WITH CHECK (bucket_id = 'listing-photos' AND (SELECT public.is_pomah_admin()));
CREATE POLICY "Admin delete listing photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'listing-photos' AND (SELECT public.is_pomah_admin()));