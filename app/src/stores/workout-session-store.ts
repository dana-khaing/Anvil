import { desc, eq } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import { type Equipment } from '@/db/seed-data/exercises';
import { setLogs, workoutSessions } from '@/db/schema';
import { type DayWithExercises, type Exercise } from '@/stores/routines-store';

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

type WorkoutSessionState = {
  today: DayWithExercises | null;
  session: WorkoutSession | null;
  /** routineExercise ids already logged for the active session. */
  completedExerciseIds: Set<number>;
  substitution: ActiveSubstitution | null;
  loaded: boolean;
  load: (days: DayWithExercises[]) => Promise<void>;
  startSession: () => Promise<void>;
  substitute: (routineExerciseId: number, alternative: Exercise) => void;
  clearSubstitution: () => void;
  finishExercise: (routineExerciseId: number) => Promise<void>;
};

export const useWorkoutSessionStore = create<WorkoutSessionState>((set, get) => ({
  today: null,
  session: null,
  completedExerciseIds: new Set(),
  substitution: null,
  loaded: false,

  load: async (days) => {
    if (days.length === 0) {
      set({ today: null, session: null, completedExerciseIds: new Set(), loaded: true });
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
    if (session) {
      const logs = await db
        .select({ routineExerciseId: setLogs.routineExerciseId })
        .from(setLogs)
        .where(eq(setLogs.sessionId, session.id));
      completedExerciseIds = new Set(logs.map((log) => log.routineExerciseId));
    }

    set({ today: today ?? null, session, completedExerciseIds, substitution: null, loaded: true });
  },

  startSession: async () => {
    const { today } = get();
    if (!today) return;

    const [created] = await db
      .insert(workoutSessions)
      .values({ routineDayId: today.id, status: 'in_progress' })
      .returning();

    set({ session: created, completedExerciseIds: new Set(), substitution: null });
  },

  substitute: (routineExerciseId, alternative) => {
    const { today } = get();
    const entry = today?.exercises.find((exercise) => exercise.id === routineExerciseId);
    if (!entry) return;

    const adjusted = adjustForSubstitution(entry, entry.exercise.equipment, alternative.equipment);
    set({ substitution: { forRoutineExerciseId: routineExerciseId, exercise: alternative, adjusted } });
  },

  clearSubstitution: () => set({ substitution: null }),

  finishExercise: async (routineExerciseId) => {
    const { session, today, substitution } = get();
    if (!session || !today) return;

    const entry = today.exercises.find((exercise) => exercise.id === routineExerciseId);
    if (!entry) return;

    const activeSubstitution =
      substitution?.forRoutineExerciseId === routineExerciseId ? substitution : null;
    const targets = activeSubstitution?.adjusted ?? entry;
    const substitutedExerciseId = activeSubstitution?.exercise.id ?? null;

    const setCount = targets.targetSets ?? 1;
    for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
      await db.insert(setLogs).values({
        sessionId: session.id,
        routineExerciseId,
        substitutedExerciseId,
        setNumber,
        weightKg: targets.targetWeightKg,
        reps: targets.targetRepsMax ?? targets.targetRepsMin,
      });
    }

    const nextCompleted = new Set(get().completedExerciseIds);
    nextCompleted.add(routineExerciseId);
    set({ completedExerciseIds: nextCompleted, substitution: null });

    if (nextCompleted.size >= today.exercises.length) {
      await db
        .update(workoutSessions)
        .set({ status: 'completed', finishedAt: new Date().toISOString() })
        .where(eq(workoutSessions.id, session.id));
      set({ session: { ...session, status: 'completed', finishedAt: new Date().toISOString() } });
    }
  },
}));
