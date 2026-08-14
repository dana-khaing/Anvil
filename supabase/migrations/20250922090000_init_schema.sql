-- PulseForge cloud schema. Mirrors the local SQLite schema (app/src/db/schema.ts)
-- for the tables that sync: profiles, routines, routine_days, routine_exercises,
-- workout_sessions, set_logs. The exercise catalog is static and ships in the app
-- itself, so it isn't represented here.

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  height_cm numeric,
  weight_kg numeric,
  goal text check (goal in ('build_muscle', 'lose_fat', 'maintain', 'strength')),
  notifications_enabled boolean not null default false,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  split_type text not null check (split_type in ('push_pull_legs', 'upper_lower', 'bro_split', 'custom')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.routine_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_id uuid not null references public.routines (id) on delete cascade,
  label text not null,
  day_order integer not null,
  updated_at timestamptz not null default now()
);

create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_day_id uuid not null references public.routine_days (id) on delete cascade,
  -- References the static exercise catalog shipped in the app (id slugs like
  -- 'barbell-bench-press'), not a server-side table.
  exercise_id text not null,
  order_index integer not null,
  target_weight_kg numeric,
  target_reps_min integer,
  target_reps_max integer,
  target_sets integer not null default 3,
  video_url text,
  notes text,
  updated_at timestamptz not null default now()
);

create table public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  routine_day_id uuid not null references public.routine_days (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  routine_exercise_id uuid not null references public.routine_exercises (id) on delete cascade,
  substituted_exercise_id text,
  set_number integer not null,
  weight_kg numeric,
  reps integer,
  completed_at timestamptz default now()
);

-- Row Level Security: every table is scoped to its owning user only.
alter table public.profiles enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sessions enable row level security;
alter table public.set_logs enable row level security;

create policy "Users manage their own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own routines" on public.routines
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own routine days" on public.routine_days
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own routine exercises" on public.routine_exercises
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own workout sessions" on public.workout_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Users manage their own set logs" on public.set_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
