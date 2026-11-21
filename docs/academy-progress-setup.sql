-- Run manually in the project's Supabase SQL editor before deploying /academy.
create table if not exists public.academy_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level integer not null default 1 check (level between 1 and 4),
  mission_index integer not null default 0 check (mission_index between 0 and 3),
  xp integer not null default 0 check (xp between 0 and 100),
  completed boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.academy_progress enable row level security;
create policy "Academy progress select own" on public.academy_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Academy progress insert own" on public.academy_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "Academy progress update own" on public.academy_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
