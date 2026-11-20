begin;

-- Keep these fields under the same owner-only RLS as existing profiles.
alter table public.profiles enable row level security;

alter table public.profiles
  add column full_name text check (char_length(full_name) between 1 and 120),
  add column age smallint check (age between 0 and 130),
  add column address text check (char_length(address) <= 500),
  add column contact_phone text check (char_length(contact_phone) <= 32),
  add column preferred_regions text[] not null default '{}' check (
    cardinality(preferred_regions) <= 10
    and coalesce(array_to_string(preferred_regions, ',', '-'), '') ~ '^([0-9]{2}([0-9]{2})?(,[0-9]{2}([0-9]{2})?)*)?$'
  );

commit;
