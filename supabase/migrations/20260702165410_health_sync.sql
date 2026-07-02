-- Tombstone migration.
--
-- Supabase has this timestamped version recorded in remote migration history.
-- The canonical Apple Health schema now lives in 0011_health_sync.sql, which is
-- idempotent so it can safely reconcile databases that already ran this version.
select 1;
