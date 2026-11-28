-- Run in Supabase SQL editor before deployment. Private project photos.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('project-photos','project-photos',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Project photo read" on storage.objects;
create policy "Project photo read" on storage.objects for select to authenticated using (
 bucket_id='project-photos' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.pomah_projects p where p.id::text=(storage.foldername(name))[2] and p.owner_id=auth.uid()));
drop policy if exists "Project photo insert" on storage.objects;
create policy "Project photo insert" on storage.objects for insert to authenticated with check (
 bucket_id='project-photos' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.pomah_projects p where p.id::text=(storage.foldername(name))[2] and p.owner_id=auth.uid()));
drop policy if exists "Project photo delete" on storage.objects;
create policy "Project photo delete" on storage.objects for delete to authenticated using (
 bucket_id='project-photos' and (storage.foldername(name))[1]=auth.uid()::text
 and exists(select 1 from public.pomah_projects p where p.id::text=(storage.foldername(name))[2] and p.owner_id=auth.uid()));
create table if not exists public.pomah_project_photos (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references public.pomah_projects(id) on delete cascade,
 owner_id uuid not null default auth.uid(), object_path text not null unique, name text not null,
 stage text not null check(stage in ('before','progress','after')), area text not null default 'Fasad',
 notes text not null default '' check(char_length(notes)<=500), created_at timestamptz not null default now(),
 check(split_part(object_path,'/',1)=owner_id::text and split_part(object_path,'/',2)=project_id::text)
);
alter table public.pomah_project_photos enable row level security;
grant select,insert,delete on public.pomah_project_photos to authenticated;
grant update(area,notes) on public.pomah_project_photos to authenticated;
drop policy if exists "Own project photos" on public.pomah_project_photos;
create policy "Own project photos" on public.pomah_project_photos for all to authenticated
using (owner_id=auth.uid() and exists(select 1 from public.pomah_projects p where p.id=project_id and p.owner_id=auth.uid()))
with check (owner_id=auth.uid() and exists(select 1 from public.pomah_projects p where p.id=project_id and p.owner_id=auth.uid()));
