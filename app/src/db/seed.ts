import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import { SEED_EXERCISES } from './seed-data/exercises';
import * as schema from './schema';

/** Inserts the static exercise catalog on first launch. Safe to call every launch. */
export async function seedExerciseLibrary(db: ExpoSQLiteDatabase<typeof schema>) {
  const existing = await db.select({ id: schema.exercises.id }).from(schema.exercises).limit(1);
  if (existing.length > 0) return;

  for (const exercise of SEED_EXERCISES) {
    await db.insert(schema.exercises).values({
      id: exercise.id,
      name: exercise.name,
      equipment: exercise.equipment,
      muscleGroup: exercise.muscleGroup,
      alternativeIds: JSON.stringify(exercise.alternativeIds),
    });
  }
}
