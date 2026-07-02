-- Scalable product database for food tracking (Swiss supermarket focus).
-- External data stays raw in product_sources; the app only ever reads the
-- cleaned canonical record in products + product_nutrition.

-- 1. products — exactly one canonical record per product
create table public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique check (barcode ~ '^[0-9]{8,14}$'),
  name text not null,
  brand text null,
  category text null,
  image_url text null,
  country text null default 'CH',
  status text not null default 'unverified'
    check (status in ('verified', 'unverified', 'pending')),
  primary_source text not null default 'open_food_facts'
    check (primary_source in ('own', 'open_food_facts', 'ocr', 'user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_barcode_idx on public.products (barcode);
create index products_status_idx on public.products (status);

-- 2. product_nutrition — the final values shown in the app
create table public.product_nutrition (
  product_id uuid primary key references public.products(id) on delete cascade,
  kcal_100g numeric null check (kcal_100g >= 0 and kcal_100g <= 900),
  protein_100g numeric null check (protein_100g >= 0 and protein_100g <= 100),
  carbs_100g numeric null check (carbs_100g >= 0 and carbs_100g <= 100),
  fat_100g numeric null check (fat_100g >= 0 and fat_100g <= 100),
  saturated_fat_100g numeric null check (saturated_fat_100g >= 0 and saturated_fat_100g <= 100),
  sugar_100g numeric null check (sugar_100g >= 0 and sugar_100g <= 100),
  fiber_100g numeric null check (fiber_100g >= 0 and fiber_100g <= 100),
  salt_100g numeric null check (salt_100g >= 0 and salt_100g <= 100),
  sodium_100g numeric null check (sodium_100g >= 0 and sodium_100g <= 40),
  serving_size_g numeric null check (serving_size_g > 0 and serving_size_g <= 2000),
  confidence_score numeric not null default 0
    check (confidence_score >= 0 and confidence_score <= 1),
  verified_by uuid null references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- 3. product_sources — every original data source, stored separately
create table public.product_sources (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  source text not null
    check (source in ('open_food_facts', 'ocr', 'user', 'admin')),
  external_id text null,
  raw_payload jsonb not null default '{}'::jsonb,
  fetched_at timestamptz not null default now(),
  version integer not null default 1,
  license text null
);

create index product_sources_product_idx on public.product_sources (product_id);
create index product_sources_source_idx on public.product_sources (source);

-- 4. product_images — multiple images per product
create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_type text not null default 'front'
    check (image_type in ('front', 'nutrition', 'ingredients', 'barcode')),
  url text not null,
  uploaded_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id);

-- 5. product_reports — users can flag broken products
create table public.product_reports (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  reported_by uuid null references auth.users(id) on delete set null,
  report_type text not null default 'wrong_data'
    check (report_type in ('wrong_data', 'wrong_image', 'duplicate', 'missing_data', 'other')),
  description text null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create index product_reports_product_idx on public.product_reports (product_id);

-- RLS: the catalog is shared and readable by every signed-in user.
-- Writes go through the app (barcode lookup pipeline) with the user's session.
alter table public.products enable row level security;
alter table public.product_nutrition enable row level security;
alter table public.product_sources enable row level security;
alter table public.product_images enable row level security;
alter table public.product_reports enable row level security;

create policy "Products are readable by authenticated users"
  on public.products for select to authenticated using (true);
create policy "Products are insertable by authenticated users"
  on public.products for insert to authenticated with check (true);
create policy "Products are updatable by authenticated users"
  on public.products for update to authenticated using (true) with check (true);

create policy "Product nutrition is readable by authenticated users"
  on public.product_nutrition for select to authenticated using (true);
create policy "Product nutrition is insertable by authenticated users"
  on public.product_nutrition for insert to authenticated with check (true);
create policy "Product nutrition is updatable by authenticated users"
  on public.product_nutrition for update to authenticated using (true) with check (true);

create policy "Product sources are readable by authenticated users"
  on public.product_sources for select to authenticated using (true);
create policy "Product sources are insertable by authenticated users"
  on public.product_sources for insert to authenticated with check (true);

create policy "Product images are readable by authenticated users"
  on public.product_images for select to authenticated using (true);
create policy "Product images are insertable by authenticated users"
  on public.product_images for insert to authenticated with check (uploaded_by = auth.uid());

create policy "Product reports are readable by reporter"
  on public.product_reports for select to authenticated using (reported_by = auth.uid());
create policy "Product reports are insertable by reporter"
  on public.product_reports for insert to authenticated with check (reported_by = auth.uid());

grant select, insert, update on public.products to authenticated;
grant select, insert, update on public.product_nutrition to authenticated;
grant select, insert on public.product_sources to authenticated;
grant select, insert on public.product_images to authenticated;
grant select, insert on public.product_reports to authenticated;

-- keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_touch_updated_at
  before update on public.products
  for each row execute function public.touch_updated_at();

create trigger product_nutrition_touch_updated_at
  before update on public.product_nutrition
  for each row execute function public.touch_updated_at();
