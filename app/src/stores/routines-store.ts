import { and, eq, isNull, sql } from 'drizzle-orm';
import { create } from 'zustand';

import { db } from '@/db/client';
import { exercises, routineDays, routineExercises, routines } from '@/db/schema';

export type Routine = typeof routines.$inferSelect;
export type RoutineDay = typeof routineDays.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type RoutineExercise = typeof routineExercises.$inferSelect;

export type DayExercise = RoutineExercise & { exercise: Exercise };
export type DayWithExercises = RoutineDay & { exercises: DayExercise[] };

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
  addDay: (label: string) => Promise<void>;
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
      .where(and(eq(routineDays.routineId, activeRoutine.id), isNull(routineDays.deletedAt)))
      .orderBy(routineDays.dayOrder);

    const days: DayWithExercises[] = [];
    for (const day of dayRows) {
      const exerciseRows = await db
        .select({ routineExercise: routineExercises, exercise: exercises })
        .from(routineExercises)
        .innerJoin(exercises, eq(routineExercises.exerciseId, exercises.id))
        .where(and(eq(routineExercises.routineDayId, day.id), isNull(routineExercises.deletedAt)))
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

  addDay: async (label) => {
    const routine = await get().ensureActiveRoutine();
    const nextOrder = get().days.length;
    await db.insert(routineDays).values({ routineId: routine.id, label, dayOrder: nextOrder });
    await get().load();
  },

  deleteDay: async (dayId) => {
    // Soft delete (Day 30): the local FK cascade still exists at the DB
    // level for a hard delete, but a tombstone UPDATE doesn't trigger it,
    // so child exercises are tombstoned explicitly here to keep them from
    // sync-pulling back down on another device after their parent day is
    // gone on this one.
    const deletedAt = sql`(current_timestamp)`;
    await db.update(routineExercises).set({ deletedAt, updatedAt: deletedAt }).where(eq(routineExercises.routineDayId, dayId));
    await db.update(routineDays).set({ deletedAt, updatedAt: deletedAt }).where(eq(routineDays.id, dayId));
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
    const deletedAt = sql`(current_timestamp)`;
    await db.update(routineExercises).set({ deletedAt, updatedAt: deletedAt }).where(eq(routineExercises.id, id));
    await get().load();
  },
}));
