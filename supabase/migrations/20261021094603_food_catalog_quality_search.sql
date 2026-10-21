-- Reject impossible per-100 g/ml values at the database boundary and rank
-- proper product-name matches ahead of weaker brand-only matches.

alter table public.food_catalog_products
  add constraint food_catalog_products_calories_range
    check (calories is null or calories between 0 and 900),
  add constraint food_catalog_products_protein_range
    check (protein is null or protein between 0 and 100),
  add constraint food_catalog_products_carbs_range
    check (carbs is null or carbs between 0 and 100),
  add constraint food_catalog_products_fat_range
    check (fat is null or fat between 0 and 100),
  add constraint food_catalog_products_fiber_range
    check (fiber is null or fiber between 0 and 100),
  add constraint food_catalog_products_sugar_range
    check (sugar is null or sugar between 0 and 100),
  add constraint food_catalog_products_sodium_range
    check (sodium is null or sodium between 0 and 50000);

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
  order by
    (c.barcode = regexp_replace(q, '[^0-9]', '', 'g')) desc,
    (lower(c.name) = lower(q)) desc,
    (lower(c.name) like lower(q) || '%') desc,
    (position(lower(q) in lower(c.name)) > 0) desc,
    (c.calories is not null and c.protein is not null
      and c.carbs is not null and c.fat is not null) desc,
    c.rank desc,
    c.name
  limit greatest(1, least(coalesce(max_results, 20), 50));
$$;

revoke all on function public.search_food_catalog(text, text, integer)
  from public, anon;
grant execute on function public.search_food_catalog(text, text, integer)
  to authenticated, service_role;
