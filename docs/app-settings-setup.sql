-- Jalankan sekali di SQL editor Supabase/Lovable untuk Admin → Pengaturan (standar pecah kavling).
-- Lihat docs/spec-pengaturan-tanah.md.

create table if not exists public.app_settings (
  key text primary key check (key ~ '^[a-z0-9_]+$'),
  -- Kolom id dipakai trigger audit (audit_pomah_admin_change mencari kolom id).
  id text generated always as (key) stored,
  value jsonb not null check (jsonb_typeof(value) = 'object'),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);

grant select on public.app_settings to anon;
grant select, insert, update on public.app_settings to authenticated;
grant all on public.app_settings to service_role;
alter table public.app_settings enable row level security;

drop policy if exists "Settings public read" on public.app_settings;
create policy "Settings public read" on public.app_settings
  for select to public using (true);

drop policy if exists "Admin insert settings" on public.app_settings;
create policy "Admin insert settings" on public.app_settings
  for insert to authenticated with check ((select public.is_pomah_admin()));

drop policy if exists "Admin update settings" on public.app_settings;
create policy "Admin update settings" on public.app_settings
  for update to authenticated
  using ((select public.is_pomah_admin())) with check ((select public.is_pomah_admin()));
-- Tidak ada policy delete: pengaturan tidak bisa dihapus dari aplikasi.

create or replace function public.touch_app_settings()
returns trigger language plpgsql set search_path to '' as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists app_settings_touch on public.app_settings;
create trigger app_settings_touch before update on public.app_settings
  for each row execute function public.touch_app_settings();

-- Isi awal. Dijalankan sebelum trigger audit dipasang, karena di SQL editor tidak ada
-- pengguna yang login dan trigger audit menolak perubahan tanpa pelaku.
insert into public.app_settings (key, value)
values (
  'land_split',
  '{"minLotArea":60,"minFrontage":6,"kdbPercent":60,"maxFloors":2,"buildCostPerM2":4000000}'
)
on conflict (key) do nothing;

drop trigger if exists audit_app_settings on public.app_settings;
create trigger audit_app_settings after insert or update or delete on public.app_settings
  for each row execute function public.audit_pomah_admin_change();

-- Cek hasil:
select key, value, updated_at from public.app_settings;
