import { eq, isNull } from 'drizzle-orm';

import { db } from './client';
import { getLocalProfile } from './profile';
import { profiles, routineDays, routineExercises, routines, setLogs, workoutSessions } from './schema';
import { supabase } from './supabase-client';

/**
 * Local-first sync, scoped honestly for a single day's feature: pushes
 * local rows that don't have a remoteId yet (new on this device), then, if
 * this device has no local routine data at all (fresh install signing into
 * an existing account), pulls everything down from the account's most
 * recent data. This is a "back up and restore" sync, not full
 * multi-device continuous merge — see DIARY.md for why that's the honest
 * scope for this feature.
 */
export async function syncWithSupabase(userId: string): Promise<void> {
  await pushLocalChanges(userId);
  await pullIfLocalIsEmpty(userId);
}

async function pushLocalChanges(userId: string): Promise<void> {
  // Profile: one row per user, upserted by user_id.
  const profile = await getLocalProfile();
  if (profile) {
    const { data } = await supabase
      .from('profiles')
      .upsert(
        {
          id: profile.remoteId ?? undefined,
          user_id: userId,
          height_cm: profile.heightCm,
          weight_kg: profile.weightKg,
          goal: profile.goal,
          notifications_enabled: profile.notificationsEnabled,
          last_active_at: profile.lastActiveAt,
          updated_at: profile.updatedAt,
        },
        { onConflict: profile.remoteId ? 'id' : 'user_id' }
      )
      .select('id')
      .single();

    if (data && !profile.remoteId) {
      await db.update(profiles).set({ remoteId: data.id }).where(eq(profiles.id, profile.id));
    }
  }

  const localRoutines = await db.select().from(routines).where(isNull(routines.remoteId));
  for (const routine of localRoutines) {
    const { data } = await supabase
      .from('routines')
      .insert({
        user_id: userId,
        name: routine.name,
        split_type: routine.splitType,
        is_active: routine.isActive,
        updated_at: routine.updatedAt,
      })
      .select('id')
      .single();
    if (!data) continue;
    await db.update(routines).set({ remoteId: data.id }).where(eq(routines.id, routine.id));

    const days = await db.select().from(routineDays).where(eq(routineDays.routineId, routine.id));
    for (const day of days) {
      const { data: dayData } = await supabase
        .from('routine_days')
        .insert({
          user_id: userId,
          routine_id: data.id,
          label: day.label,
          day_order: day.dayOrder,
          updated_at: day.updatedAt,
        })
        .select('id')
        .single();
      if (!dayData) continue;
      await db.update(routineDays).set({ remoteId: dayData.id }).where(eq(routineDays.id, day.id));

      const exercises = await db
        .select()
        .from(routineExercises)
        .where(eq(routineExercises.routineDayId, day.id));
      for (const exercise of exercises) {
        const { data: exerciseData } = await supabase
          .from('routine_exercises')
          .insert({
            user_id: userId,
            routine_day_id: dayData.id,
            exercise_id: exercise.exerciseId,
            order_index: exercise.orderIndex,
            target_weight_kg: exercise.targetWeightKg,
            target_reps_min: exercise.targetRepsMin,
            target_reps_max: exercise.targetRepsMax,
            target_sets: exercise.targetSets,
            video_url: exercise.videoUrl,
            notes: exercise.notes,
            updated_at: exercise.updatedAt,
          })
          .select('id')
          .single();
        if (!exerciseData) continue;
        await db
          .update(routineExercises)
          .set({ remoteId: exerciseData.id })
          .where(eq(routineExercises.id, exercise.id));
      }

      const sessions = await db
        .select()
        .from(workoutSessions)
        .where(eq(workoutSessions.routineDayId, day.id));
      for (const session of sessions) {
        const { data: sessionData } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: userId,
            routine_day_id: dayData.id,
            status: session.status,
            started_at: session.startedAt,
            finished_at: session.finishedAt,
            updated_at: session.updatedAt,
          })
          .select('id')
          .single();
        if (!sessionData) continue;
        await db
          .update(workoutSessions)
          .set({ remoteId: sessionData.id })
          .where(eq(workoutSessions.id, session.id));

        const logs = await db.select().from(setLogs).where(eq(setLogs.sessionId, session.id));
        for (const log of logs) {
          const routineExerciseRow = exercises.find((item) => item.id === log.routineExerciseId);
          if (!routineExerciseRow?.remoteId) continue;

          const { data: logData } = await supabase
            .from('set_logs')
            .insert({
              user_id: userId,
              session_id: sessionData.id,
              routine_exercise_id: routineExerciseRow.remoteId,
              substituted_exercise_id: log.substitutedExerciseId,
              set_number: log.setNumber,
              weight_kg: log.weightKg,
              reps: log.reps,
              completed_at: log.completedAt,
            })
            .select('id')
            .single();
          if (logData) {
            await db.update(setLogs).set({ remoteId: logData.id }).where(eq(setLogs.id, log.id));
          }
        }
      }
    }
  }
}

async function pullIfLocalIsEmpty(userId: string): Promise<void> {
  const [existingRoutine] = await db.select().from(routines).limit(1);
  if (existingRoutine) return; // this device already has data — don't overwrite it.

  const { data: remoteRoutines } = await supabase
    .from('routines')
    .select('*, routine_days(*, routine_exercises(*))')
    .eq('user_id', userId);

  if (!remoteRoutines) return;

  for (const routine of remoteRoutines) {
    const [localRoutine] = await db
      .insert(routines)
      .values({
        remoteId: routine.id,
        name: routine.name,
        splitType: routine.split_type,
        isActive: routine.is_active,
        createdAt: routine.created_at,
        updatedAt: routine.updated_at,
      })
      .returning();

    for (const day of routine.routine_days ?? []) {
      const [localDay] = await db
        .insert(routineDays)
        .values({
          remoteId: day.id,
          routineId: localRoutine.id,
          label: day.label,
          dayOrder: day.day_order,
          updatedAt: day.updated_at,
        })
        .returning();

      for (const exercise of day.routine_exercises ?? []) {
        await db.insert(routineExercises).values({
          remoteId: exercise.id,
          routineDayId: localDay.id,
          exerciseId: exercise.exercise_id,
          orderIndex: exercise.order_index,
          targetWeightKg: exercise.target_weight_kg,
          targetRepsMin: exercise.target_reps_min,
          targetRepsMax: exercise.target_reps_max,
          targetSets: exercise.target_sets,
          videoUrl: exercise.video_url,
          notes: exercise.notes,
          updatedAt: exercise.updated_at,
        });
      }
    }
  }
}
