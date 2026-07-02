-- Tombstone migration.
--
-- The full baseline schema is maintained in 0008_consolidated_schema.sql.
-- Earlier databases had this schema applied manually outside Supabase's
-- migration history, so this file must be safe to run against an existing DB.
select 1;
