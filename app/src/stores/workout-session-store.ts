import { desc, eq } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import { setLogs, workoutSessions } from '@/db/schema';
import { type DayWithExercises } from '@/stores/routines-store';

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

type WorkoutSessionState = {
  today: DayWithExercises | null;
  session: WorkoutSession | null;
  /** routineExercise ids already logged for the active session. */
  completedExerciseIds: Set<number>;
  loaded: boolean;
  load: (days: DayWithExercises[]) => Promise<void>;
  startSession: () => Promise<void>;
  finishExercise: (routineExerciseId: number) => Promise<void>;
};

export const useWorkoutSessionStore = create<WorkoutSessionState>((set, get) => ({
  today: null,
  session: null,
  completedExerciseIds: new Set(),
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

    set({ today: today ?? null, session, completedExerciseIds, loaded: true });
  },

  startSession: async () => {
    const { today } = get();
    if (!today) return;

    const [created] = await db
      .insert(workoutSessions)
      .values({ routineDayId: today.id, status: 'in_progress' })
      .returning();

    set({ session: created, completedExerciseIds: new Set() });
  },

  finishExercise: async (routineExerciseId) => {
    const { session, today } = get();
    if (!session || !today) return;

    const entry = today.exercises.find((exercise) => exercise.id === routineExerciseId);
    if (!entry) return;

    const setCount = entry.targetSets ?? 1;
    for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
      await db.insert(setLogs).values({
        sessionId: session.id,
        routineExerciseId,
        setNumber,
        weightKg: entry.targetWeightKg,
        reps: entry.targetRepsMax ?? entry.targetRepsMin,
      });
    }

    const nextCompleted = new Set(get().completedExerciseIds);
    nextCompleted.add(routineExerciseId);
    set({ completedExerciseIds: nextCompleted });

    if (nextCompleted.size >= today.exercises.length) {
      await db
        .update(workoutSessions)
        .set({ status: 'completed', finishedAt: new Date().toISOString() })
        .where(eq(workoutSessions.id, session.id));
      set({ session: { ...session, status: 'completed', finishedAt: new Date().toISOString() } });
    }
  },
}));
