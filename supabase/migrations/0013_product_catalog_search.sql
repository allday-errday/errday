-- Fast fuzzy search on the own product catalog + a DB-side importer that
-- pulls popular Swiss products from Open Food Facts via the http extension.
-- (Applied via Supabase MCP; kept here for repo parity.)

create extension if not exists pg_trgm;
create extension if not exists http with schema extensions;

create index if not exists products_name_trgm_idx
  on public.products using gin (name gin_trgm_ops);
create index if not exists products_brand_trgm_idx
  on public.products using gin (brand gin_trgm_ops);

-- Local catalog search, ranked by name similarity.
create or replace function public.search_products_local(
  q text,
  max_results int default 20
)
returns table (
  barcode text,
  name text,
  brand text,
  category text,
  image_url text,
  kcal_100g numeric,
  protein_100g numeric,
  carbs_100g numeric,
  fat_100g numeric,
  serving_size_g numeric,
  confidence_score numeric
)
language sql
stable
set search_path = public
as $$
  select p.barcode, p.name, p.brand, p.category, p.image_url,
         n.kcal_100g, n.protein_100g, n.carbs_100g, n.fat_100g,
         n.serving_size_g, n.confidence_score
  from public.products p
  join public.product_nutrition n on n.product_id = p.id
  where n.kcal_100g is not null
    and (p.name ilike '%' || q || '%' or p.name % q)
  order by similarity(p.name, q) desc, p.name
  limit greatest(1, least(max_results, 40));
$$;

grant execute on function public.search_products_local(text, int) to authenticated;

-- Guarded numeric cast: returns null instead of raising on bad input.
create or replace function public.off_num(t text)
returns numeric
language sql
immutable
set search_path = pg_catalog
as $$
  select case when t ~ '^-?[0-9]+(\.[0-9]+)?$' then t::numeric else null end;
$$;

-- One-time / refreshable importer for popular Swiss OFF products. Locked to
-- the service role (revoked from every app-facing role); invoked via MCP.
create or replace function public.import_off_swiss(
  start_page int,
  page_count int,
  page_size int default 100
)
returns table (inserted int, more boolean)
language plpgsql
security definer
set search_path = public, extensions
set statement_timeout = '220s'
as $$
declare
  pg int;
  last_page int;
  resp text;
  body jsonb;
  hit jsonb;
  bc text; nm text; br text; cat text; img text;
  kcal numeric; prot numeric; carb numeric; fat numeric;
  sug numeric; sat numeric; fib numeric; salt numeric; sod numeric; serv numeric;
  pid uuid;
  ins_count int := 0;
  hits_this_page int;
begin
  last_page := start_page + page_count - 1;

  for pg in start_page..last_page loop
    exit when pg * page_size > 10000;

    begin
      select content into resp
      from http_get(
        'https://search.openfoodfacts.org/search?q=countries_tags%3A%22en%3Aswitzerland%22'
        || '&sort_by=-unique_scans_n&page=' || pg || '&page_size=' || page_size
        || '&fields=code,product_name,brands,categories,image_front_small_url,serving_quantity,nutriments'
      );
      body := resp::jsonb;
    exception when others then
      continue;
    end;

    hits_this_page := 0;

    for hit in
      select value from jsonb_array_elements(coalesce(body->'hits', '[]'::jsonb)) as value
    loop
      hits_this_page := hits_this_page + 1;

      bc := hit->>'code';
      nm := nullif(trim(hit->>'product_name'), '');
      if bc is null or bc !~ '^[0-9]{8,14}$' or nm is null then
        continue;
      end if;

      kcal := off_num(hit->'nutriments'->>'energy-kcal_100g');
      if kcal is null or kcal < 0 or kcal > 900 then
        continue;
      end if;

      if jsonb_typeof(hit->'brands') = 'array' then
        br := nullif(trim(hit->'brands'->>0), '');
      else
        br := nullif(split_part(coalesce(hit->>'brands', ''), ',', 1), '');
      end if;
      cat := nullif(trim(split_part(coalesce(hit->>'categories', ''), ',', 1)), '');
      img := nullif(hit->>'image_front_small_url', '');

      prot := off_num(hit->'nutriments'->>'proteins_100g');
      carb := off_num(hit->'nutriments'->>'carbohydrates_100g');
      fat  := off_num(hit->'nutriments'->>'fat_100g');
      sug  := off_num(hit->'nutriments'->>'sugars_100g');
      sat  := off_num(hit->'nutriments'->>'saturated-fat_100g');
      fib  := off_num(hit->'nutriments'->>'fiber_100g');
      salt := off_num(hit->'nutriments'->>'salt_100g');
      sod  := off_num(hit->'nutriments'->>'sodium_100g');
      serv := off_num(hit->>'serving_quantity');

      insert into products (barcode, name, brand, category, image_url, country, status, primary_source)
      values (bc, left(nm, 300), left(br, 200), left(cat, 200), img, 'CH', 'unverified', 'open_food_facts')
      on conflict (barcode) do nothing
      returning id into pid;

      if pid is null then
        select id into pid from products where barcode = bc;
      end if;

      insert into product_nutrition (
        product_id, kcal_100g, protein_100g, carbs_100g, fat_100g,
        saturated_fat_100g, sugar_100g, fiber_100g, salt_100g, sodium_100g,
        serving_size_g, confidence_score
      )
      values (
        pid,
        least(greatest(kcal, 0), 900),
        least(greatest(prot, 0), 100), least(greatest(carb, 0), 100), least(greatest(fat, 0), 100),
        least(greatest(sat, 0), 100), least(greatest(sug, 0), 100), least(greatest(fib, 0), 100),
        least(greatest(salt, 0), 100), least(greatest(sod, 0), 40),
        case when serv > 0 and serv <= 2000 then serv else null end,
        0.5
      )
      on conflict (product_id) do nothing;

      insert into product_sources (product_id, source, external_id, raw_payload, license)
      values (pid, 'open_food_facts', bc, hit, 'ODbL')
      on conflict do nothing;

      ins_count := ins_count + 1;
    end loop;

    exit when hits_this_page = 0;
  end loop;

  return query select ins_count, (last_page * page_size < 10000);
end;
$$;

revoke all on function public.import_off_swiss(int, int, int) from public, anon, authenticated;
