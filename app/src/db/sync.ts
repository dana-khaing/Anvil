import { eq } from 'drizzle-orm';

import { db } from './client';
import { getLocalProfile } from './profile';
import {
  profiles,
  routineDays,
  routineExercises,
  routines,
  setLogs,
  syncState,
  workoutSessions,
} from './schema';
import { isDirty, isPullCandidate, shouldApplyRemote } from './sync-logic';
import { supabase } from './supabase-client';

/**
 * Continuous, last-write-wins sync (Day 30, replacing the Day 10 "backup and
 * restore" one-shot): pushes every local row changed since the last sync
 * (new or updated), pulls every remote row changed since the last sync, and
 * reconciles same-row conflicts by `updated_at` -- whichever side changed
 * more recently wins (see sync-logic.ts). Deletes propagate via the
 * `deletedAt`/`deleted_at` tombstone columns on `routine_days` and
 * `routine_exercises`, the only two tables with a delete path in the app.
 *
 * Deliberate, documented scope limits (the honest-scope pattern DIARY.md
 * Day 10 set for this feature):
 *  - Row-level LWW, not field-level or CRDT merge: a newer edit on one
 *    device fully overwrites an older edit on another, even if the two
 *    edits touched different fields.
 *  - No semantic dedup: if two devices each independently create routine
 *    data before ever syncing, both survive as separate rows rather than
 *    being merged into one -- resolving *that* is a product decision
 *    (which one is "right"?), not something a sync protocol can decide.
 *  - The sync watermark is this device's clock, not the server's, so
 *    meaningful clock skew across devices can shift a row in or out of a
 *    sync window by a few seconds at the edges. Every write here is an
 *    idempotent upsert keyed by remoteId, so re-running sync is always
 *    safe and self-corrects on the next pass.
 *  - set_logs are treated as append-only (there's no edit/delete path for
 *    a logged set in the app), so they're pushed/pulled by existence only,
 *    not by LWW.
 */
export async function syncWithSupabase(userId: string): Promise<void> {
  const [state] = await db.select().from(syncState).limit(1);
  const since = state?.lastSyncedAt ?? null;
  const syncStartedAt = new Date().toISOString();

  await pushProfile(userId, since);
  await pushRoutineTree(userId, since);
  await pullRoutineTree(userId, since);

  if (state) {
    await db.update(syncState).set({ lastSyncedAt: syncStartedAt }).where(eq(syncState.id, state.id));
  } else {
    await db.insert(syncState).values({ lastSyncedAt: syncStartedAt });
  }
}

/** Insert (no remoteId yet) or update (remoteId set) a single remote row; returns its remote id, or null on failure. */
async function upsertRemote(
  table: string,
  payload: Record<string, unknown>,
  remoteId: string | null
): Promise<string | null> {
  if (remoteId) {
    const { error } = await supabase.from(table).update(payload).eq('id', remoteId);
    return error ? null : remoteId;
  }
  const { data, error } = await supabase.from(table).insert(payload).select('id').single();
  return error || !data ? null : (data.id as string);
}

async function pushProfile(userId: string, since: string | null): Promise<void> {
  const profile = await getLocalProfile();
  if (!profile || !isDirty(profile, since)) return;

  // Not routed through upsertRemote(): a first-ever push (no remoteId yet)
  // must upsert on `user_id`, not plain-insert -- otherwise a second device
  // signing into an account that already has a synced profile row hits the
  // remote `unique(user_id)` constraint and this push fails outright.
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

async function pushRoutineTree(userId: string, since: string | null): Promise<void> {
  const localRoutines = await db.select().from(routines);
  for (const routine of localRoutines) {
    let routineRemoteId = routine.remoteId;
    if (isDirty(routine, since)) {
      routineRemoteId = await upsertRemote(
        'routines',
        {
          user_id: userId,
          name: routine.name,
          split_type: routine.splitType,
          is_active: routine.isActive,
          updated_at: routine.updatedAt,
        },
        routine.remoteId
      );
      if (routineRemoteId && !routine.remoteId) {
        await db.update(routines).set({ remoteId: routineRemoteId }).where(eq(routines.id, routine.id));
      }
    }
    if (!routineRemoteId) continue; // push failed or is pending -- children wait for next sync.

    const days = await db.select().from(routineDays).where(eq(routineDays.routineId, routine.id));
    for (const day of days) {
      let dayRemoteId = day.remoteId;
      if (isDirty(day, since)) {
        if (day.deletedAt && day.remoteId) {
          await supabase.from('routine_days').update({ deleted_at: day.deletedAt, updated_at: day.updatedAt }).eq('id', day.remoteId);
        } else if (!day.deletedAt) {
          dayRemoteId = await upsertRemote(
            'routine_days',
            {
              user_id: userId,
              routine_id: routineRemoteId,
              label: day.label,
              day_order: day.dayOrder,
              updated_at: day.updatedAt,
            },
            day.remoteId
          );
          if (dayRemoteId && !day.remoteId) {
            await db.update(routineDays).set({ remoteId: dayRemoteId }).where(eq(routineDays.id, day.id));
          }
        }
      }
      if (!dayRemoteId || day.deletedAt) continue; // deleted, or push failed/pending.

      const dayExercises = await db.select().from(routineExercises).where(eq(routineExercises.routineDayId, day.id));
      for (const exercise of dayExercises) {
        if (!isDirty(exercise, since)) continue;
        if (exercise.deletedAt && exercise.remoteId) {
          await supabase
            .from('routine_exercises')
            .update({ deleted_at: exercise.deletedAt, updated_at: exercise.updatedAt })
            .eq('id', exercise.remoteId);
          continue;
        }
        if (exercise.deletedAt) continue; // deleted before ever syncing -- nothing remote to remove.

        const exerciseRemoteId = await upsertRemote(
          'routine_exercises',
          {
            user_id: userId,
            routine_day_id: dayRemoteId,
            exercise_id: exercise.exerciseId,
            order_index: exercise.orderIndex,
            target_weight_kg: exercise.targetWeightKg,
            target_reps_min: exercise.targetRepsMin,
            target_reps_max: exercise.targetRepsMax,
            target_sets: exercise.targetSets,
            video_url: exercise.videoUrl,
            notes: exercise.notes,
            updated_at: exercise.updatedAt,
          },
          exercise.remoteId
        );
        if (exerciseRemoteId && !exercise.remoteId) {
          await db.update(routineExercises).set({ remoteId: exerciseRemoteId }).where(eq(routineExercises.id, exercise.id));
        }
      }

      const sessions = await db.select().from(workoutSessions).where(eq(workoutSessions.routineDayId, day.id));
      for (const session of sessions) {
        let sessionRemoteId = session.remoteId;
        if (isDirty(session, since)) {
          sessionRemoteId = await upsertRemote(
            'workout_sessions',
            {
              user_id: userId,
              routine_day_id: dayRemoteId,
              status: session.status,
              started_at: session.startedAt,
              finished_at: session.finishedAt,
              updated_at: session.updatedAt,
            },
            session.remoteId
          );
          if (sessionRemoteId && !session.remoteId) {
            await db.update(workoutSessions).set({ remoteId: sessionRemoteId }).where(eq(workoutSessions.id, session.id));
          }
        }
        if (!sessionRemoteId) continue;

        // Append-only: pushed once, by existence, never updated or deleted.
        const logs = await db.select().from(setLogs).where(eq(setLogs.sessionId, session.id));
        for (const log of logs) {
          if (log.remoteId) continue;
          const exerciseRow = dayExercises.find((item) => item.id === log.routineExerciseId);
          if (!exerciseRow?.remoteId) continue;

          const logRemoteId = await upsertRemote(
            'set_logs',
            {
              user_id: userId,
              session_id: sessionRemoteId,
              routine_exercise_id: exerciseRow.remoteId,
              substituted_exercise_id: log.substitutedExerciseId,
              set_number: log.setNumber,
              weight_kg: log.weightKg,
              reps: log.reps,
              completed_at: log.completedAt,
            },
            null
          );
          if (logRemoteId) {
            await db.update(setLogs).set({ remoteId: logRemoteId }).where(eq(setLogs.id, log.id));
          }
        }
      }
    }
  }
}

async function pullRoutineTree(userId: string, since: string | null): Promise<void> {
  const localRoutines = await db.select().from(routines);
  const routineByRemoteId = new Map(localRoutines.filter((r) => r.remoteId).map((r) => [r.remoteId as string, r]));

  const { data: remoteRoutines } = await supabase.from('routines').select('*').eq('user_id', userId);
  for (const remote of remoteRoutines ?? []) {
    if (!isPullCandidate(remote.updated_at, since)) continue;
    const local = routineByRemoteId.get(remote.id);
    if (local) {
      if (shouldApplyRemote(local.updatedAt, remote.updated_at)) {
        await db
          .update(routines)
          .set({ name: remote.name, splitType: remote.split_type, isActive: remote.is_active, updatedAt: remote.updated_at })
          .where(eq(routines.id, local.id));
      }
    } else {
      const [inserted] = await db
        .insert(routines)
        .values({
          remoteId: remote.id,
          name: remote.name,
          splitType: remote.split_type,
          isActive: remote.is_active,
          createdAt: remote.created_at,
          updatedAt: remote.updated_at,
        })
        .returning();
      routineByRemoteId.set(remote.id, inserted);
    }
  }

  const localDays = await db.select().from(routineDays);
  const dayByRemoteId = new Map(localDays.filter((d) => d.remoteId).map((d) => [d.remoteId as string, d]));

  const { data: remoteDays } = await supabase.from('routine_days').select('*').eq('user_id', userId);
  for (const remote of remoteDays ?? []) {
    if (!isPullCandidate(remote.updated_at, since)) continue;
    const parent = routineByRemoteId.get(remote.routine_id);
    const local = dayByRemoteId.get(remote.id);
    if (local) {
      if (shouldApplyRemote(local.updatedAt, remote.updated_at)) {
        await db
          .update(routineDays)
          .set({ label: remote.label, dayOrder: remote.day_order, updatedAt: remote.updated_at, deletedAt: remote.deleted_at })
          .where(eq(routineDays.id, local.id));
      }
    } else if (parent && !remote.deleted_at) {
      const [inserted] = await db
        .insert(routineDays)
        .values({
          remoteId: remote.id,
          routineId: parent.id,
          label: remote.label,
          dayOrder: remote.day_order,
          updatedAt: remote.updated_at,
        })
        .returning();
      dayByRemoteId.set(remote.id, inserted);
    }
  }

  const localExercises = await db.select().from(routineExercises);
  const exerciseByRemoteId = new Map(localExercises.filter((e) => e.remoteId).map((e) => [e.remoteId as string, e]));

  const { data: remoteExercises } = await supabase.from('routine_exercises').select('*').eq('user_id', userId);
  for (const remote of remoteExercises ?? []) {
    if (!isPullCandidate(remote.updated_at, since)) continue;
    const parent = dayByRemoteId.get(remote.routine_day_id);
    const local = exerciseByRemoteId.get(remote.id);
    if (local) {
      if (shouldApplyRemote(local.updatedAt, remote.updated_at)) {
        await db
          .update(routineExercises)
          .set({
            orderIndex: remote.order_index,
            targetWeightKg: remote.target_weight_kg,
            targetRepsMin: remote.target_reps_min,
            targetRepsMax: remote.target_reps_max,
            targetSets: remote.target_sets,
            videoUrl: remote.video_url,
            notes: remote.notes,
            updatedAt: remote.updated_at,
            deletedAt: remote.deleted_at,
          })
          .where(eq(routineExercises.id, local.id));
      }
    } else if (parent && !remote.deleted_at) {
      await db.insert(routineExercises).values({
        remoteId: remote.id,
        routineDayId: parent.id,
        exerciseId: remote.exercise_id,
        orderIndex: remote.order_index,
        targetWeightKg: remote.target_weight_kg,
        targetRepsMin: remote.target_reps_min,
        targetRepsMax: remote.target_reps_max,
        targetSets: remote.target_sets,
        videoUrl: remote.video_url,
        notes: remote.notes,
        updatedAt: remote.updated_at,
      });
    }
  }

  const localSessions = await db.select().from(workoutSessions);
  const sessionByRemoteId = new Map(localSessions.filter((s) => s.remoteId).map((s) => [s.remoteId as string, s]));

  const { data: remoteSessions } = await supabase.from('workout_sessions').select('*').eq('user_id', userId);
  for (const remote of remoteSessions ?? []) {
    if (!isPullCandidate(remote.updated_at, since)) continue;
    const parent = dayByRemoteId.get(remote.routine_day_id);
    const local = sessionByRemoteId.get(remote.id);
    if (local) {
      if (shouldApplyRemote(local.updatedAt, remote.updated_at)) {
        await db
          .update(workoutSessions)
          .set({ status: remote.status, startedAt: remote.started_at, finishedAt: remote.finished_at, updatedAt: remote.updated_at })
          .where(eq(workoutSessions.id, local.id));
      }
    } else if (parent) {
      const [inserted] = await db
        .insert(workoutSessions)
        .values({
          remoteId: remote.id,
          routineDayId: parent.id,
          status: remote.status,
          startedAt: remote.started_at,
          finishedAt: remote.finished_at,
          updatedAt: remote.updated_at,
        })
        .returning();
      sessionByRemoteId.set(remote.id, inserted);
    }
  }

  const localLogs = await db.select().from(setLogs);
  const logRemoteIds = new Set(localLogs.filter((l) => l.remoteId).map((l) => l.remoteId as string));

  const { data: remoteLogs } = await supabase.from('set_logs').select('*').eq('user_id', userId);
  for (const remote of remoteLogs ?? []) {
    if (logRemoteIds.has(remote.id)) continue; // append-only -- existence check, no LWW.
    if (!isPullCandidate(remote.completed_at, since)) continue;
    const session = sessionByRemoteId.get(remote.session_id);
    const exercise = exerciseByRemoteId.get(remote.routine_exercise_id);
    if (!session || !exercise) continue;

    await db.insert(setLogs).values({
      remoteId: remote.id,
      sessionId: session.id,
      routineExerciseId: exercise.id,
      substitutedExerciseId: remote.substituted_exercise_id,
      setNumber: remote.set_number,
      weightKg: remote.weight_kg,
      reps: remote.reps,
      completedAt: remote.completed_at,
    });
  }
}
