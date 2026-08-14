import { create } from 'zustand';

import { db } from '@/db/client';
import { exercises } from '@/db/schema';

export type Exercise = typeof exercises.$inferSelect;

type ExerciseLibraryState = {
  exercises: Exercise[];
  loaded: boolean;
  load: () => Promise<void>;
  alternativesFor: (exerciseId: string) => Exercise[];
};

/**
 * expo-sqlite/Drizzle has no built-in reactive observables (unlike
 * WatermelonDB), so stores re-query explicitly after any mutation that
 * could affect them — call `load()` again rather than expecting it to
 * update itself.
 */
export const useExerciseLibraryStore = create<ExerciseLibraryState>((set, get) => ({
  exercises: [],
  loaded: false,
  load: async () => {
    const rows = await db.select().from(exercises);
    set({ exercises: rows, loaded: true });
  },
  alternativesFor: (exerciseId) => {
    const exercise = get().exercises.find((item) => item.id === exerciseId);
    if (!exercise) return [];
    const ids: string[] = JSON.parse(exercise.alternativeIds);
    return get().exercises.filter((item) => ids.includes(item.id));
  },
}));
