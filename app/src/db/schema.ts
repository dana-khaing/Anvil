import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const profiles = sqliteTable('profiles', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  /** Stable id shared with the Supabase row once synced (Day 10). Null until first sync. */
  remoteId: text('remote_id').unique(),
  heightCm: real('height_cm'),
  weightKg: real('weight_kg'),
  goal: text('goal', { enum: ['build_muscle', 'lose_fat', 'maintain', 'strength'] }),
  notificationsEnabled: integer('notifications_enabled', { mode: 'boolean' }).notNull().default(false),
  lastActiveAt: text('last_active_at'),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

/** Static exercise catalog, seeded at install time — not user-editable content. */
export const exercises = sqliteTable('exercises', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  equipment: text('equipment', {
    enum: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
  }).notNull(),
  muscleGroup: text('muscle_group').notNull(),
  defaultVideoUrl: text('default_video_url'),
  /** JSON-encoded string[] of exercise ids usable as substitutes. */
  alternativeIds: text('alternative_ids').notNull().default('[]'),
});

export const routines = sqliteTable('routines', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: text('remote_id').unique(),
  name: text('name').notNull(),
  splitType: text('split_type', {
    enum: ['push_pull_legs', 'upper_lower', 'bro_split', 'custom'],
  }).notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

/** A single training day within a routine, e.g. "D1 - Chest and Tricep". */
export const routineDays = sqliteTable('routine_days', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: text('remote_id').unique(),
  routineId: integer('routine_id')
    .notNull()
    .references(() => routines.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  dayOrder: integer('day_order').notNull(),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

/** An exercise placed on a routine day, with the user's target weight/reps/sets. */
export const routineExercises = sqliteTable('routine_exercises', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: text('remote_id').unique(),
  routineDayId: integer('routine_day_id')
    .notNull()
    .references(() => routineDays.id, { onDelete: 'cascade' }),
  exerciseId: text('exercise_id')
    .notNull()
    .references(() => exercises.id),
  orderIndex: integer('order_index').notNull(),
  targetWeightKg: real('target_weight_kg'),
  targetRepsMin: integer('target_reps_min'),
  targetRepsMax: integer('target_reps_max'),
  targetSets: integer('target_sets').notNull().default(3),
  /** Overrides the exercise's default video, e.g. a user-pasted YouTube link. */
  videoUrl: text('video_url'),
  notes: text('notes'),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const workoutSessions = sqliteTable('workout_sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: text('remote_id').unique(),
  routineDayId: integer('routine_day_id')
    .notNull()
    .references(() => routineDays.id),
  status: text('status', { enum: ['in_progress', 'completed', 'abandoned'] })
    .notNull()
    .default('in_progress'),
  startedAt: text('started_at').notNull().default(sql`(current_timestamp)`),
  finishedAt: text('finished_at'),
  updatedAt: text('updated_at').notNull().default(sql`(current_timestamp)`),
});

export const setLogs = sqliteTable('set_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  remoteId: text('remote_id').unique(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => workoutSessions.id, { onDelete: 'cascade' }),
  routineExerciseId: integer('routine_exercise_id')
    .notNull()
    .references(() => routineExercises.id),
  /** Set when the user swapped to an alternate exercise for this set (Day 8). */
  substitutedExerciseId: text('substituted_exercise_id').references(() => exercises.id),
  setNumber: integer('set_number').notNull(),
  weightKg: real('weight_kg'),
  reps: integer('reps'),
  completedAt: text('completed_at').default(sql`(current_timestamp)`),
});

export const streaks = sqliteTable('streaks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  currentStreak: integer('current_streak').notNull().default(0),
  longestStreak: integer('longest_streak').notNull().default(0),
  lastWorkoutDate: text('last_workout_date'),
});

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  period: text('period', { enum: ['daily', 'monthly'] }).notNull(),
  targetCount: integer('target_count').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
});

/** Local-only chat history with the AI coach — not part of cloud sync. */
export const chatMessages = sqliteTable('chat_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  createdAt: text('created_at').notNull().default(sql`(current_timestamp)`),
});
