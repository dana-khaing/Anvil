-- Day 30: multi-device sync needs deletes to propagate as a row change
-- (a tombstone), not just vanish locally. Scoped to the two tables that
-- actually have a delete path in the app today -- routine_days and
-- routine_exercises. See app/src/db/schema.ts for the matching local column.

alter table public.routine_days add column deleted_at timestamptz;
alter table public.routine_exercises add column deleted_at timestamptz;
