-- Tombstone migration.
--
-- Supabase has this timestamped version recorded in remote migration history.
-- The current product catalog migration already defines public.off_num(text)
-- with `set search_path = pg_catalog`, so this file exists to keep local
-- migration history aligned with the remote database.
select 1;
