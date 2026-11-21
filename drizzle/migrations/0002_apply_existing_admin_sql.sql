-- Admin Control Center: run in Supabase SQL editor before enabling /admin.
-- Bootstrap super admin explicitly from trusted SQL editor after reviewing the user's UUID:
-- insert into public.admin_roles (user_id, role) values ('USER_UUID_HERE','super_admin');
create table if not exists public.admin_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('super_admin','admin')),
  created_at timestamptz not null default now()
);
alter table public.admin_roles enable row level security;
revoke all on public.admin_roles from anon, authenticated;
grant select on public.admin_roles to authenticated;
create policy "Admins can view their own role" on public.admin_roles
for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.is_pomah_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.admin_roles where user_id = (select auth.uid())); $$;
revoke all on function public.is_pomah_admin() from public;
grant execute on function public.is_pomah_admin() to authenticated;

create table if not exists public.hero_slides (
  id uuid primary key default gen_random_uuid(),
  sort_order integer not null default 0,
  eyebrow text not null default '',
  title text not null check (char_length(title) <= 160),
  description text not null default '',
  image_url text not null default '',
  image_alt text not null default '',
  button_label text not null default 'Jelajahi aset',
  button_href text not null default '/pilih-aset' check (button_href in ('/pilih-aset','/proyek/demo')),
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.hero_slides enable row level security;
grant select on public.hero_slides to anon, authenticated;
grant insert,update,delete on public.hero_slides to authenticated;
create policy "Published slides public, all slides admin" on public.hero_slides
for select using (published or (select public.is_pomah_admin()));
create policy "Admin insert slides" on public.hero_slides for insert to authenticated
with check ((select public.is_pomah_admin()));
create policy "Admin update slides" on public.hero_slides for update to authenticated
using ((select public.is_pomah_admin())) with check ((select public.is_pomah_admin()));
create policy "Admin delete slides" on public.hero_slides for delete to authenticated
using ((select public.is_pomah_admin()));

create table if not exists public.partner_approvals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_role text not null check(requested_role in ('flipper','investor','kontraktor','mitra_aset')),
  status text not null default 'pending' check(status in ('pending','approved','rejected','revision')),
  note text not null default '',
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.partner_approvals enable row level security;
grant select,insert,update on public.partner_approvals to authenticated;
create policy "Own or admin read approval" on public.partner_approvals for select to authenticated
using (user_id=(select auth.uid()) or (select public.is_pomah_admin()));
create policy "Users apply for own role" on public.partner_approvals for insert to authenticated
with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null);
create policy "Only admin updates approvals" on public.partner_approvals for update to authenticated
using ((select public.is_pomah_admin())) with check ((select public.is_pomah_admin()));

-- Admins can review basic public profile data; original owner policy remains intact.
create policy "Admins read profiles for approvals" on public.profiles
for select to authenticated using ((select public.is_pomah_admin()));

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id),
  action text not null,
  target text not null,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_log enable row level security;
grant select,insert on public.admin_audit_log to authenticated;
create policy "Admins read audit" on public.admin_audit_log for select to authenticated
using ((select public.is_pomah_admin()));
create policy "Admins insert their audit" on public.admin_audit_log for insert to authenticated
with check ((select public.is_pomah_admin()) and actor_id=(select auth.uid()));