begin;

alter table public.profiles
  add column if not exists occupation text check (char_length(occupation) <= 120);

commit;
