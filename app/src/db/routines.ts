import { db } from './client';
import { routineDays, routineExercises, routines } from './schema';
import { SPLIT_TEMPLATES, type SplitType } from './seed-data/templates';

/** Creates a routine + its days + its exercises from one of the built-in split templates. */
export async function createRoutineFromTemplate(splitType: SplitType) {
  const template = SPLIT_TEMPLATES.find((item) => item.splitType === splitType);
  if (!template) throw new Error(`Unknown split template: ${splitType}`);

  const [routine] = await db
    .insert(routines)
    .values({ name: template.name, splitType, isActive: true })
    .returning();

  for (const [dayOrder, day] of template.days.entries()) {
    const [routineDay] = await db
      .insert(routineDays)
      .values({ routineId: routine.id, label: day.label, dayOrder })
      .returning();

    for (const [orderIndex, exercise] of day.exercises.entries()) {
      await db.insert(routineExercises).values({
        routineDayId: routineDay.id,
        exerciseId: exercise.exerciseId,
        orderIndex,
        targetRepsMin: exercise.repsMin,
        targetRepsMax: exercise.repsMax,
        targetSets: exercise.sets,
      });
    }
  }

  return routine;
}
