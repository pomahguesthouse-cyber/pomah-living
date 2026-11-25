-- Run once in Supabase SQL editor before deploying the checklist.
create table if not exists public.pomah_prepurchase_master (
  id integer primary key check (id = 1),
  criteria jsonb not null check (jsonb_typeof(criteria) = 'array')
);
alter table public.pomah_prepurchase_master enable row level security;
grant select on public.pomah_prepurchase_master to anon, authenticated;
grant insert, update on public.pomah_prepurchase_master to authenticated;
create or replace function public.can_manage_prepurchase()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.admin_roles where user_id = auth.uid() and role::text = 'super_admin') $$;
revoke all on function public.can_manage_prepurchase() from public;
grant execute on function public.can_manage_prepurchase() to authenticated;
drop policy if exists "Read checklist" on public.pomah_prepurchase_master;
create policy "Read checklist" on public.pomah_prepurchase_master for select to anon, authenticated using (true);
drop policy if exists "Super admin insert checklist" on public.pomah_prepurchase_master;
create policy "Super admin insert checklist" on public.pomah_prepurchase_master for insert to authenticated with check (public.can_manage_prepurchase());
drop policy if exists "Super admin update checklist" on public.pomah_prepurchase_master;
create policy "Super admin update checklist" on public.pomah_prepurchase_master for update to authenticated using (public.can_manage_prepurchase()) with check (public.can_manage_prepurchase());
