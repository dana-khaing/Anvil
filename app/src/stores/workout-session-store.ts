import { and, desc, eq, gt, sql } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import { type Equipment } from '@/db/seed-data/exercises';
import { setLogs, workoutSessions } from '@/db/schema';
import { useNotificationsStore } from '@/stores/notifications-store';
import { toCalendarDate, useProgressStore } from '@/stores/progress-store';
import { type DayWithExercises, type Exercise, parseMuscleGroups } from '@/stores/routines-store';

export type WorkoutSession = typeof workoutSessions.$inferSelect;

/**
 * Picks the day to train next: the day after whichever one the most
 * recently completed session covered, wrapping back to the start. With no
 * completed sessions yet, starts at the first day.
 */
export function resolveNextDay(
  days: DayWithExercises[],
  lastCompletedDayId: number | null
): DayWithExercises | undefined {
  if (days.length === 0) return undefined;

  const lastIndex = lastCompletedDayId === null
    ? -1
    : days.findIndex((day) => day.id === lastCompletedDayId);
  const nextIndex = lastIndex === -1 ? 0 : (lastIndex + 1) % days.length;
  return days[nextIndex];
}

export const REST_WINDOW_HOURS = 48;

export type RestConflict = { sharedMuscleGroups: string[]; hoursRemaining: number };

/**
 * Whether `targetDay` shares a muscle-group tag with a day completed within
 * `restWindowHours` of `now`. An untagged day (no muscleGroups chosen at
 * creation) never conflicts -- there's nothing to compare. When multiple
 * recent completions conflict, returns whichever has the most hours
 * remaining (the most restrictive one).
 */
export function findRestConflict(
  targetDay: DayWithExercises,
  recentCompletions: { routineDayId: number; muscleGroups: string[]; finishedAt: string }[],
  restWindowHours: number,
  now: Date
): RestConflict | null {
  const targetGroups = new Set(parseMuscleGroups(targetDay.muscleGroups));
  if (targetGroups.size === 0) return null;

  let closest: RestConflict | null = null;
  for (const completion of recentCompletions) {
    const shared = completion.muscleGroups.filter((group) => targetGroups.has(group));
    if (shared.length === 0) continue;

    const hoursSince = (now.getTime() - new Date(completion.finishedAt).getTime()) / 3_600_000;
    const hoursRemaining = restWindowHours - hoursSince;
    if (hoursRemaining <= 0) continue;

    if (!closest || hoursRemaining > closest.hoursRemaining) {
      closest = { sharedMuscleGroups: shared, hoursRemaining };
    }
  }
  return closest;
}

export type MuscleGroupCompletion = { routineDayId: number; muscleGroups: string[]; finishedAt: string };

/** Completed sessions within the rest window, each paired with its day's muscle-group tags -- feeds findRestConflict. */
export async function recentMuscleGroupCompletions(
  days: DayWithExercises[],
  restWindowHours: number,
  now: Date
): Promise<MuscleGroupCompletion[]> {
  const cutoff = new Date(now.getTime() - restWindowHours * 3_600_000).toISOString();
  const rows = await db
    .select({ routineDayId: workoutSessions.routineDayId, finishedAt: workoutSessions.finishedAt })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.status, 'completed'), gt(workoutSessions.finishedAt, cutoff)));

  return rows
    .filter((row): row is { routineDayId: number; finishedAt: string } => row.finishedAt !== null)
    .map((row) => ({
      routineDayId: row.routineDayId,
      finishedAt: row.finishedAt,
      muscleGroups: parseMuscleGroups(days.find((day) => day.id === row.routineDayId)?.muscleGroups ?? '[]'),
    }));
}

export type SubstitutionTargets = {
  targetWeightKg: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSets: number;
};

/**
 * Deterministic, offline rules for adjusting reps/sets/weight when a user
 * swaps to a different-equipment alternative mid-session — not an AI guess.
 *
 * - Same equipment family (any weighted <-> any weighted): reps/sets stay
 *   as prescribed, weight carries over as a starting estimate.
 * - Weighted -> bodyweight: no external load to compensate for, so reps
 *   bump ~50% (rounded up); weight is cleared (not applicable).
 * - Bodyweight -> weighted: reps revert to a standard moderate range
 *   (8-12), since the bumped bodyweight rep count wouldn't fit a loaded
 *   movement; weight is cleared for the user to set on their next visit.
 */
export function adjustForSubstitution(
  original: SubstitutionTargets,
  fromEquipment: Equipment,
  toEquipment: Equipment
): SubstitutionTargets {
  if (fromEquipment === toEquipment) return original;

  const wasBodyweight = fromEquipment === 'bodyweight';
  const isNowBodyweight = toEquipment === 'bodyweight';

  if (!wasBodyweight && isNowBodyweight) {
    return {
      targetWeightKg: null,
      targetRepsMin: original.targetRepsMin ? Math.ceil(original.targetRepsMin * 1.5) : original.targetRepsMin,
      targetRepsMax: original.targetRepsMax ? Math.ceil(original.targetRepsMax * 1.5) : original.targetRepsMax,
      targetSets: original.targetSets,
    };
  }

  if (wasBodyweight && !isNowBodyweight) {
    return {
      targetWeightKg: null,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetSets: original.targetSets,
    };
  }

  return { ...original };
}

export type ActiveSubstitution = {
  forRoutineExerciseId: number;
  exercise: Exercise;
  adjusted: SubstitutionTargets;
};

export type LogSetResult = { exerciseCompleted: boolean; sessionCompleted: boolean };

type WorkoutSessionState = {
  today: DayWithExercises | null;
  session: WorkoutSession | null;
  /** routineExercise ids whose target set count has been fully logged for the active session. */
  completedExerciseIds: Set<number>;
  /** Sets already logged for whichever exercise is current (not yet in completedExerciseIds). Reset to 0 on exercise advance. */
  setsLoggedForCurrent: number;
  substitution: ActiveSubstitution | null;
  loaded: boolean;
  load: (days: DayWithExercises[]) => Promise<void>;
  /** Defaults to the current `today` when `day` is omitted -- pass a day explicitly to start a manually-picked one instead of the auto-resolved rotation. */
  startSession: (day?: DayWithExercises, options?: { overrideRest?: boolean }) => Promise<void>;
  substitute: (routineExerciseId: number, alternative: Exercise) => void;
  clearSubstitution: () => void;
  logSet: (routineExerciseId: number) => Promise<LogSetResult>;
};

export const useWorkoutSessionStore = create<WorkoutSessionState>((set, get) => ({
  today: null,
  session: null,
  completedExerciseIds: new Set(),
  setsLoggedForCurrent: 0,
  substitution: null,
  loaded: false,

  load: async (days) => {
    if (days.length === 0) {
      set({ today: null, session: null, completedExerciseIds: new Set(), setsLoggedForCurrent: 0, loaded: true });
      return;
    }

    const [inProgress] = await db
      .select()
      .from(workoutSessions)
      .where(eq(workoutSessions.status, 'in_progress'))
      .orderBy(desc(workoutSessions.startedAt))
      .limit(1);

    let today: DayWithExercises | undefined;
    let session: WorkoutSession | null = null;

    if (inProgress) {
      today = days.find((day) => day.id === inProgress.routineDayId);
      session = inProgress;
    } else {
      const [lastCompleted] = await db
        .select({ dayId: workoutSessions.routineDayId })
        .from(workoutSessions)
        .where(eq(workoutSessions.status, 'completed'))
        .orderBy(desc(workoutSessions.startedAt))
        .limit(1);

      today = resolveNextDay(days, lastCompleted?.dayId ?? null);
    }

    let completedExerciseIds = new Set<number>();
    let setsLoggedForCurrent = 0;
    if (session && today) {
      const logs = await db
        .select({ routineExerciseId: setLogs.routineExerciseId })
        .from(setLogs)
        .where(eq(setLogs.sessionId, session.id));

      // Sets are now logged one at a time (see logSet), so resuming an
      // in-progress session needs to tell "fully logged" apart from
      // "partway through" per exercise, not just "has any log at all".
      const countsByExercise = new Map<number, number>();
      for (const log of logs) {
        countsByExercise.set(log.routineExerciseId, (countsByExercise.get(log.routineExerciseId) ?? 0) + 1);
      }
      for (const [routineExerciseId, count] of countsByExercise) {
        const targetSets = today.exercises.find((exercise) => exercise.id === routineExerciseId)?.targetSets ?? 1;
        if (count >= targetSets) {
          completedExerciseIds.add(routineExerciseId);
        } else {
          setsLoggedForCurrent = count;
        }
      }
    }

    set({ today: today ?? null, session, completedExerciseIds, setsLoggedForCurrent, substitution: null, loaded: true });
  },

  startSession: async (day, options) => {
    const targetDay = day ?? get().today;
    if (!targetDay) return;

    const [created] = await db
      .insert(workoutSessions)
      .values({
        routineDayId: targetDay.id,
        status: 'in_progress',
        countsTowardStreak: !options?.overrideRest,
      })
      .returning();

    set({
      today: targetDay,
      session: created,
      completedExerciseIds: new Set(),
      setsLoggedForCurrent: 0,
      substitution: null,
    });
  },

  substitute: (routineExerciseId, alternative) => {
    const { today } = get();
    const entry = today?.exercises.find((exercise) => exercise.id === routineExerciseId);
    if (!entry) return;

    const adjusted = adjustForSubstitution(entry, entry.exercise.equipment, alternative.equipment);
    set({ substitution: { forRoutineExerciseId: routineExerciseId, exercise: alternative, adjusted } });
  },

  clearSubstitution: () => set({ substitution: null }),

  logSet: async (routineExerciseId) => {
    const { session, today, substitution, setsLoggedForCurrent } = get();
    const notDone: LogSetResult = { exerciseCompleted: false, sessionCompleted: false };
    if (!session || !today) return notDone;

    const entry = today.exercises.find((exercise) => exercise.id === routineExerciseId);
    if (!entry) return notDone;

    const activeSubstitution =
      substitution?.forRoutineExerciseId === routineExerciseId ? substitution : null;
    const targets = activeSubstitution?.adjusted ?? entry;
    const substitutedExerciseId = activeSubstitution?.exercise.id ?? null;

    const setCount = targets.targetSets ?? 1;
    const setNumber = setsLoggedForCurrent + 1;

    await db.insert(setLogs).values({
      sessionId: session.id,
      routineExerciseId,
      substitutedExerciseId,
      setNumber,
      weightKg: targets.targetWeightKg,
      reps: targets.targetRepsMax ?? targets.targetRepsMin,
    });

    if (setNumber < setCount) {
      set({ setsLoggedForCurrent: setNumber });
      return notDone;
    }

    const nextCompleted = new Set(get().completedExerciseIds);
    nextCompleted.add(routineExerciseId);
    const sessionCompleted = nextCompleted.size >= today.exercises.length;
    set({ completedExerciseIds: nextCompleted, substitution: null, setsLoggedForCurrent: 0 });

    if (sessionCompleted) {
      const finishedAt = new Date().toISOString();
      await db
        .update(workoutSessions)
        .set({ status: 'completed', finishedAt, updatedAt: sql`(current_timestamp)` })
        .where(eq(workoutSessions.id, session.id));
      set({ session: { ...session, status: 'completed', finishedAt } });
      // Started as a rest-warning override: still a real, logged workout,
      // just not one that advances streak/badges -- see recordWorkoutCompletion's callers.
      if (session.countsTowardStreak) {
        await useProgressStore.getState().recordWorkoutCompletion(finishedAt);
      }
      await useNotificationsStore.getState().rescheduleReengagement(toCalendarDate(finishedAt));
    }

    return { exerciseCompleted: true, sessionCompleted };
  },
}));
