import { db } from './client';
import { routineDays, routineExercises, routines } from './schema';
import { SPLIT_TEMPLATES, type SplitType } from './seed-data/templates';

/** Mirrors routines-store.ts's NewExerciseInput -- kept local to avoid db/*.ts importing from stores/*.ts. */
type NewExerciseInput = {
  exerciseId: string;
  targetWeightKg: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSets: number;
  videoUrl: string | null;
};

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

/** Creates a day plus its exercises in one shot -- same FK-safe insert order as createRoutineFromTemplate. */
export async function createDayWithExercises(
  existingRoutineId: number | null,
  label: string,
  dayOrder: number,
  muscleGroups: string[],
  exercises: NewExerciseInput[]
) {
  return db.transaction((tx) => {
    const routineId =
      existingRoutineId ??
      tx
        .insert(routines)
        .values({ name: 'My Routine', splitType: 'custom', isActive: true })
        .returning({ id: routines.id })
        .get().id;
    const day = tx
      .insert(routineDays)
      .values({ routineId, label, dayOrder, muscleGroups: JSON.stringify(muscleGroups) })
      .returning()
      .get();

    if (exercises.length > 0) {
      tx.insert(routineExercises)
        .values(
          exercises.map((exercise, orderIndex) => ({
            routineDayId: day.id,
            exerciseId: exercise.exerciseId,
            orderIndex,
            targetWeightKg: exercise.targetWeightKg,
            targetRepsMin: exercise.targetRepsMin,
            targetRepsMax: exercise.targetRepsMax,
            targetSets: exercise.targetSets,
            videoUrl: exercise.videoUrl,
          }))
        )
        .run();
    }

    return day;
  });
}

/** Appends a group of exercises as one write transaction. */
export async function addExercisesToDay(dayId: number, startOrder: number, exercises: NewExerciseInput[]) {
  db.transaction((tx) => {
    tx.insert(routineExercises)
      .values(
        exercises.map((exercise, index) => ({
          routineDayId: dayId,
          exerciseId: exercise.exerciseId,
          orderIndex: startOrder + index,
          targetWeightKg: exercise.targetWeightKg,
          targetRepsMin: exercise.targetRepsMin,
          targetRepsMax: exercise.targetRepsMax,
          targetSets: exercise.targetSets,
          videoUrl: exercise.videoUrl,
        }))
      )
      .run();
  });
}
