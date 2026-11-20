begin;

create table public.pomah_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  location text not null default '' check (char_length(location) <= 160),
  status text not null default 'analysis' check (status in ('analysis', 'renovation', 'for_sale', 'sold')),
  expected_sale bigint check (expected_sale between 0 and 1000000000000),
  expected_cost bigint check (expected_cost between 0 and 1000000000000),
  actual_sale bigint check (actual_sale between 0 and 1000000000000),
  actual_cost bigint check (actual_cost between 0 and 1000000000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'sold' or (actual_sale is not null and actual_cost is not null))
);

create index pomah_projects_owner_updated_idx on public.pomah_projects (owner_id, updated_at desc);
alter table public.pomah_projects enable row level security;

revoke all on public.pomah_projects from public, anon, authenticated;
grant select on public.pomah_projects to authenticated;
grant insert (name, location, status, expected_sale, expected_cost, actual_sale, actual_cost)
  on public.pomah_projects to authenticated;
grant update (name, location, status, expected_sale, expected_cost, actual_sale, actual_cost)
  on public.pomah_projects to authenticated;

create policy "Pemilik membaca proyek" on public.pomah_projects
  for select to authenticated using (owner_id = (select auth.uid()));
create policy "Pemilik membuat proyek" on public.pomah_projects
  for insert to authenticated with check (owner_id = (select auth.uid()));
create policy "Pemilik mengubah proyek" on public.pomah_projects
  for update to authenticated using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create function public.touch_pomah_project() returns trigger
  language plpgsql set search_path = ''
  as $$
  begin
    new.updated_at = clock_timestamp();
    return new;
  end;
  $$;

create trigger touch_pomah_project before update on public.pomah_projects
  for each row execute function public.touch_pomah_project();

commit;
