-- Day 33ish: muscle-group tagging on routine days and the streak-exclusion
-- flag for a workout session started as a 48h-rest-warning override.
-- Mirrors app/src/db/schema.ts's routineDays.muscleGroups / workoutSessions.countsTowardStreak.

alter table public.routine_days add column muscle_groups jsonb not null default '[]'::jsonb;
alter table public.workout_sessions add column counts_toward_streak boolean not null default true;
