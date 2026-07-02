-- Tombstone migration.
--
-- This version was applied to remote Supabase databases before the
-- OpenFoodFacts feature was removed. Supabase Preview still expects every
-- applied remote migration version to exist locally, so keep this file as a
-- no-op instead of deleting or renumbering migration history.
select 1;
