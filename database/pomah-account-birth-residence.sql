begin;

alter table public.profiles
  add column if not exists birth_date date check (birth_date <= current_date),
  add column if not exists residence_province text
    check (residence_province ~ '^[0-9]{2}$');

commit;
