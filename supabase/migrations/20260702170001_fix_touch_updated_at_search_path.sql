-- Tombstone migration.
--
-- Supabase has this timestamped version recorded in remote migration history.
-- The search_path fix is already present in 0010_product_database.sql:
-- public.touch_updated_at() is created with `set search_path = public`.
select 1;
