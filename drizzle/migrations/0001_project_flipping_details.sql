CREATE TABLE public.pomah_project_details (
 project_id uuid PRIMARY KEY REFERENCES public.pomah_projects(id) ON DELETE CASCADE,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object' AND octet_length(payload::text) <= 250000),
 revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.pomah_project_details TO authenticated;
GRANT ALL ON public.pomah_project_details TO service_role;
ALTER TABLE public.pomah_project_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner reads flipping details" ON public.pomah_project_details FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.pomah_projects p WHERE p.id = project_id AND p.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owner creates flipping details" ON public.pomah_project_details FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.pomah_projects p WHERE p.id = project_id AND p.owner_id = (SELECT auth.uid())));
CREATE POLICY "Owner updates flipping details" ON public.pomah_project_details FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.pomah_projects p WHERE p.id = project_id AND p.owner_id = (SELECT auth.uid()))) WITH CHECK (EXISTS (SELECT 1 FROM public.pomah_projects p WHERE p.id = project_id AND p.owner_id = (SELECT auth.uid())));