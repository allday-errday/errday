-- Exact, read-only API mirror of the native SQLite food catalog.
--
-- This intentionally lives beside the legacy products/product_nutrition tables.
-- The legacy schema requires a barcode and is still used by the web barcode
-- fallback, while this catalog also contains unbarcoded Swiss reference foods.

create extension if not exists pg_trgm;

create table if not exists public.food_catalog_sources (
  id text primary key,
  title text not null,
  license_name text not null,
  license_url text not null,
  attribution text not null
);

create table if not exists public.food_catalog_products (
  id text primary key,
  barcode text,
  name text not null,
  brand text not null default '',
  category text,
  unit text not null check (unit in ('g', 'ml')),
  calories double precision,
  protein double precision,
  carbs double precision,
  fat double precision,
  fiber double precision,
  sugar double precision,
  sodium double precision,
  source_id text not null references public.food_catalog_sources(id),
  source_record_id text not null,
  source_url text not null,
  source_updated_at timestamptz,
  fetched_at timestamptz not null,
  confidence text not null check (
    confidence in ('official', 'community', 'verified_label', 'provisional')
  ),
  is_generic boolean not null,
  constraint food_catalog_products_barcode_format check (
    barcode is null or barcode ~ '^[0-9]+$'
  ),
  constraint food_catalog_products_source_record_unique unique (source_id, source_record_id)
);

create unique index if not exists food_catalog_products_barcode_idx
  on public.food_catalog_products (barcode)
  where barcode is not null;
create index if not exists food_catalog_products_name_trgm_idx
  on public.food_catalog_products using gin (name gin_trgm_ops);
create index if not exists food_catalog_products_brand_trgm_idx
  on public.food_catalog_products using gin (brand gin_trgm_ops);
create table if not exists public.food_catalog_names (
  product_id text not null references public.food_catalog_products(id) on delete cascade,
  language text not null,
  kind text not null,
  name text not null,
  primary key (product_id, language, kind, name)
);

create index if not exists food_catalog_names_name_trgm_idx
  on public.food_catalog_names using gin (name gin_trgm_ops);

create table if not exists public.food_catalog_retailers (
  product_id text not null references public.food_catalog_products(id) on delete cascade,
  retailer text not null,
  evidence text not null check (
    evidence in ('store', 'brand', 'licensed_feed', 'user_report')
  ),
  primary key (product_id, retailer)
);

create index if not exists food_catalog_retailers_retailer_idx
  on public.food_catalog_retailers (retailer, product_id);

create table if not exists public.food_catalog_import_runs (
  generated_at timestamptz primary key,
  database_sha256 text not null check (database_sha256 ~ '^[0-9a-f]{64}$'),
  product_count integer not null check (product_count >= 0),
  report jsonb not null,
  uploaded_at timestamptz not null default now()
);

alter table public.food_catalog_sources enable row level security;
alter table public.food_catalog_products enable row level security;
alter table public.food_catalog_names enable row level security;
alter table public.food_catalog_retailers enable row level security;
alter table public.food_catalog_import_runs enable row level security;

drop policy if exists "Authenticated users can read food catalog sources"
  on public.food_catalog_sources;
create policy "Authenticated users can read food catalog sources"
  on public.food_catalog_sources for select to authenticated using (true);

drop policy if exists "Authenticated users can read food catalog products"
  on public.food_catalog_products;
create policy "Authenticated users can read food catalog products"
  on public.food_catalog_products for select to authenticated using (true);

drop policy if exists "Authenticated users can read food catalog names"
  on public.food_catalog_names;
create policy "Authenticated users can read food catalog names"
  on public.food_catalog_names for select to authenticated using (true);

drop policy if exists "Authenticated users can read food catalog retailers"
  on public.food_catalog_retailers;
create policy "Authenticated users can read food catalog retailers"
  on public.food_catalog_retailers for select to authenticated using (true);

drop policy if exists "Authenticated users can read food catalog import runs"
  on public.food_catalog_import_runs;
create policy "Authenticated users can read food catalog import runs"
  on public.food_catalog_import_runs for select to authenticated using (true);

revoke all on table public.food_catalog_sources from public, anon, authenticated;
revoke all on table public.food_catalog_products from public, anon, authenticated;
revoke all on table public.food_catalog_names from public, anon, authenticated;
revoke all on table public.food_catalog_retailers from public, anon, authenticated;
revoke all on table public.food_catalog_import_runs from public, anon, authenticated;

grant select on table public.food_catalog_sources to authenticated;
grant select on table public.food_catalog_products to authenticated;
grant select on table public.food_catalog_names to authenticated;
grant select on table public.food_catalog_retailers to authenticated;
grant select on table public.food_catalog_import_runs to authenticated;

grant all on table public.food_catalog_sources to service_role;
grant all on table public.food_catalog_products to service_role;
grant all on table public.food_catalog_names to service_role;
grant all on table public.food_catalog_retailers to service_role;
grant all on table public.food_catalog_import_runs to service_role;

create or replace function public.search_food_catalog(
  q text,
  retailer_filter text default null,
  max_results integer default 20
)
returns table (
  id text,
  barcode text,
  name text,
  brand text,
  category text,
  unit text,
  calories double precision,
  protein double precision,
  carbs double precision,
  fat double precision,
  fiber double precision,
  sugar double precision,
  sodium double precision,
  confidence text,
  is_generic boolean,
  source_id text
)
language sql
stable
security invoker
set search_path = public, pg_catalog
as $$
  with candidates as (
    select p.*,
      greatest(
        similarity(p.name, q),
        similarity(p.brand, q),
        coalesce(max(similarity(n.name, q)), 0)
      ) as rank
    from public.food_catalog_products p
    left join public.food_catalog_names n on n.product_id = p.id
    where nullif(trim(q), '') is not null
      and (
        p.barcode = regexp_replace(q, '[^0-9]', '', 'g')
        or p.name ilike '%' || q || '%'
        or p.name % q
        or p.brand ilike '%' || q || '%'
        or p.brand % q
        or n.name ilike '%' || q || '%'
        or n.name % q
      )
      and (
        retailer_filter is null
        or exists (
          select 1
          from public.food_catalog_retailers r
          where r.product_id = p.id and r.retailer = retailer_filter
        )
      )
    group by p.id
  )
  select c.id, c.barcode, c.name, c.brand, c.category, c.unit,
    c.calories, c.protein, c.carbs, c.fat, c.fiber, c.sugar, c.sodium,
    c.confidence, c.is_generic, c.source_id
  from candidates c
  order by (c.barcode = regexp_replace(q, '[^0-9]', '', 'g')) desc,
    c.rank desc, c.name
  limit greatest(1, least(coalesce(max_results, 20), 50));
$$;

revoke all on function public.search_food_catalog(text, text, integer)
  from public, anon;
grant execute on function public.search_food_catalog(text, text, integer)
  to authenticated, service_role;
