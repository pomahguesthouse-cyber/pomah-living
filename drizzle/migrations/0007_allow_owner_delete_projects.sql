GRANT DELETE ON public.pomah_projects TO authenticated;

CREATE POLICY "Pemilik menghapus proyek" ON public.pomah_projects FOR DELETE TO authenticated USING (owner_id = (SELECT auth.uid()));