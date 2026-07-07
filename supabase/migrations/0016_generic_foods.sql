-- Generic foods from the USDA FoodData Central datasets (SR Legacy +
-- Foundation). Clean nutrition values per 100 g, no images, no barcodes.

create extension if not exists pg_trgm;

create table if not exists public.generic_foods (
  id uuid primary key default gen_random_uuid(),
  fdc_id bigint not null unique,
  name text not null,
  category text null,
  kcal_100g numeric not null check (kcal_100g >= 0 and kcal_100g <= 950),
  protein_100g numeric not null default 0 check (protein_100g >= 0 and protein_100g <= 100),
  carbs_100g numeric not null default 0 check (carbs_100g >= 0 and carbs_100g <= 100),
  fat_100g numeric not null default 0 check (fat_100g >= 0 and fat_100g <= 100),
  source text not null default 'usda_fdc',
  created_at timestamptz not null default now()
);

create index if not exists generic_foods_name_trgm_idx
  on public.generic_foods using gin (name gin_trgm_ops);

alter table public.generic_foods enable row level security;

drop policy if exists "generic_foods_read" on public.generic_foods;
create policy "generic_foods_read" on public.generic_foods
  for select to authenticated using (true);

grant select on public.generic_foods to authenticated;
grant select, insert, update, delete on public.generic_foods to service_role;
