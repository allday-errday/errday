do $$
begin
  if to_regclass('public.food_items') is null then
    raise exception 'Missing public.food_items. Apply supabase/migrations/0004_food_workout_tracking.sql before 0006_openfoodfacts.sql.';
  end if;
end;
$$;

alter table public.food_items
add column if not exists barcode text null,
add column if not exists external_source text null,
add column if not exists external_id text null,
add column if not exists image_url text null,
add column if not exists serving_size text null;

create unique index if not exists food_items_user_external_source_id_key
on public.food_items (user_id, external_source, external_id)
where user_id is not null
  and external_source is not null
  and external_id is not null;
