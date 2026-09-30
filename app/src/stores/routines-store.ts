import { eq } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import {
  addExercisesToDay,
  addExerciseToDay,
  createDayWithExercises,
  createDefaultRoutine,
  createRoutineDay,
  deleteRoutineDay,
  deleteRoutineExercise,
  type NewExerciseInput,
  updateRoutineExercise,
} from '@/db/routines';
import { exercises, routineDays, routineExercises, routines } from '@/db/schema';

export type { NewExerciseInput } from '@/db/routines';

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

type RoutinesState = {
  activeRoutine: Routine | null;
  days: DayWithExercises[];
  loaded: boolean;
  load: () => Promise<void>;
  ensureActiveRoutine: () => Promise<Routine>;
  addDay: (label: string, muscleGroups: string[]) => Promise<void>;
  addDayWithExercises: (label: string, muscleGroups: string[], exercises: NewExerciseInput[]) => Promise<void>;
  deleteDay: (dayId: number) => Promise<void>;
  addExercise: (dayId: number, input: NewExerciseInput) => Promise<void>;
  addExercises: (dayId: number, inputs: NewExerciseInput[]) => Promise<void>;
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

    const created = await createDefaultRoutine();

    await get().load();
    return created;
  },

  addDay: async (label, muscleGroups) => {
    const routine = await get().ensureActiveRoutine();
    const nextOrder = get().days.length;
    await createRoutineDay(routine.id, label, nextOrder, muscleGroups);
    await get().load();
  },

  addDayWithExercises: async (label, muscleGroups, exercises) => {
    const nextOrder = get().days.length;
    await createDayWithExercises(get().activeRoutine?.id ?? null, label, nextOrder, muscleGroups, exercises);
    await get().load();
  },

  deleteDay: async (dayId) => {
    await deleteRoutineDay(dayId);
    await get().load();
  },

  addExercise: async (dayId, input) => {
    const nextOrder = get().days.find((day) => day.id === dayId)?.exercises.length ?? 0;
    await addExerciseToDay(dayId, nextOrder, input);
    await get().load();
  },

  addExercises: async (dayId, inputs) => {
    const nextOrder = get().days.find((day) => day.id === dayId)?.exercises.length ?? 0;
    await addExercisesToDay(dayId, nextOrder, inputs);
    await get().load();
  },

  updateExercise: async (id, input) => {
    await updateRoutineExercise(id, input);
    await get().load();
  },

  deleteExercise: async (id) => {
    await deleteRoutineExercise(id);
    await get().load();
  },
}));
