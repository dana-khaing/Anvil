import { eq, sql } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import { exercises, routineDays, routineExercises, routines } from '@/db/schema';

export type Routine = typeof routines.$inferSelect;
export type RoutineDay = typeof routineDays.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type RoutineExercise = typeof routineExercises.$inferSelect;

export type DayExercise = RoutineExercise & { exercise: Exercise };
export type DayWithExercises = RoutineDay & { exercises: DayExercise[] };

/** Safely reads a day's muscleGroups JSON, tolerating malformed data -- same pattern as parseAlternativeIds. */
export function parseMuscleGroups(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((group) => typeof group === 'string') : [];
  } catch {
    return [];
  }
}

export type NewExerciseInput = {
  exerciseId: string;
  targetWeightKg: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSets: number;
  videoUrl: string | null;
};

type RoutinesState = {
  activeRoutine: Routine | null;
  days: DayWithExercises[];
  loaded: boolean;
  load: () => Promise<void>;
  ensureActiveRoutine: () => Promise<Routine>;
  addDay: (label: string, muscleGroups: string[]) => Promise<void>;
  deleteDay: (dayId: number) => Promise<void>;
  addExercise: (dayId: number, input: NewExerciseInput) => Promise<void>;
  updateExercise: (id: number, input: Partial<NewExerciseInput>) => Promise<void>;
  deleteExercise: (id: number) => Promise<void>;
};

export const useRoutinesStore = create<RoutinesState>((set, get) => ({
  activeRoutine: null,
  days: [],
  loaded: false,

  load: async () => {
    const [activeRoutine] = await db.select().from(routines).where(eq(routines.isActive, true)).limit(1);

    if (!activeRoutine) {
      set({ activeRoutine: null, days: [], loaded: true });
      return;
    }

    const dayRows = await db
      .select()
      .from(routineDays)
      .where(eq(routineDays.routineId, activeRoutine.id))
      .orderBy(routineDays.dayOrder);

    const days: DayWithExercises[] = [];
    for (const day of dayRows) {
      const exerciseRows = await db
        .select({ routineExercise: routineExercises, exercise: exercises })
        .from(routineExercises)
        .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
        .where(eq(routineExercises.routineDayId, day.id))
        .orderBy(routineExercises.orderIndex);

      days.push({
        ...day,
        exercises: exerciseRows.map((row) => ({ ...row.routineExercise, exercise: row.exercise })),
      });
    }

    set({ activeRoutine, days, loaded: true });
  },

  ensureActiveRoutine: async () => {
    const existing = get().activeRoutine;
    if (existing) return existing;

    const [created] = await db
      .insert(routines)
      .values({ name: 'My Routine', splitType: 'custom', isActive: true })
      .returning();

    await get().load();
    return created;
  },

  addDay: async (label, muscleGroups) => {
    const routine = await get().ensureActiveRoutine();
    const nextOrder = get().days.length;
    await db.insert(routineDays).values({
      routineId: routine.id,
      label,
      dayOrder: nextOrder,
      muscleGroups: JSON.stringify(muscleGroups),
    });
    await get().load();
  },

  deleteDay: async (dayId) => {
    await db.delete(routineDays).where(eq(routineDays.id, dayId));
    await get().load();
  },

  addExercise: async (dayId, input) => {
    await db.insert(routineExercises).values({
      routineDayId: dayId,
      exerciseId: input.exerciseId,
      orderIndex: get().days.find((day) => day.id === dayId)?.exercises.length ?? 0,
      targetWeightKg: input.targetWeightKg,
      targetRepsMin: input.targetRepsMin,
      targetRepsMax: input.targetRepsMax,
      targetSets: input.targetSets,
      videoUrl: input.videoUrl,
    });
    await get().load();
  },

  updateExercise: async (id, input) => {
    await db
      .update(routineExercises)
      .set({ ...input, updatedAt: sql`(current_timestamp)` })
      .where(eq(routineExercises.id, id));
    await get().load();
  },

  deleteExercise: async (id) => {
    await db.delete(routineExercises).where(eq(routineExercises.id, id));
    await get().load();
  },
}));
