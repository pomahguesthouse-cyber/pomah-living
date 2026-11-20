begin;

alter table public.profiles
  add column if not exists has_property_experience boolean;

commit;
