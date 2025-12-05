import { type Exercise, type NewExerciseInput } from '@/stores/routines-store';

/** A structured routine change proposed by the AI coach, pending user confirmation. */
export type AiAction =
  | {
      kind: 'create_day';
      label: string;
      muscleGroups: string[];
      exercises: ProposedExercise[];
    }
  | {
      kind: 'add_exercises';
      dayId: number;
      exercises: ProposedExercise[];
    }
  | {
      kind: 'update_exercise';
      routineExerciseId: number;
      targetWeightKg?: number | null;
      targetRepsMin?: number | null;
      targetRepsMax?: number | null;
      targetSets?: number;
    }
  | {
      kind: 'delete_exercise';
      routineExerciseId: number;
    }
  | {
      kind: 'delete_day';
      dayId: number;
    };

/** An exercise the AI referred to by name -- not yet resolved to a real catalog id. */
export type ProposedExercise = {
  exerciseName: string;
  targetWeightKg: number | null;
  targetRepsMin: number | null;
  targetRepsMax: number | null;
  targetSets: number;
};

/** The subset of routines-store actions executeAction needs, so it never imports the store directly. */
export type RoutinesActions = {
  addDayWithExercises: (label: string, muscleGroups: string[], exercises: NewExerciseInput[]) => Promise<void>;
  addExercise: (dayId: number, input: NewExerciseInput) => Promise<void>;
  updateExercise: (id: number, input: Partial<NewExerciseInput>) => Promise<void>;
  deleteExercise: (id: number) => Promise<void>;
  deleteDay: (dayId: number) => Promise<void>;
};

export type ExerciseResolution = { ok: true; exerciseId: string } | { ok: false; reason: string };

/**
 * Resolves an AI-supplied exercise name to a real catalog id. Case-insensitive
 * exact match first, then a substring match if exactly one candidate exists.
 * Never guesses: no match or more than one candidate both fail with a
 * specific, user-facing reason instead of picking one silently.
 */
export function resolveExerciseName(catalog: Exercise[], name: string): ExerciseResolution {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();

  const exact = catalog.find((exercise) => exercise.name.toLowerCase() === lower);
  if (exact) return { ok: true, exerciseId: exact.id };

  const candidates = catalog.filter((exercise) => exercise.name.toLowerCase().includes(lower));
  if (candidates.length === 1) return { ok: true, exerciseId: candidates[0].id };
  if (candidates.length > 1) {
    return {
      ok: false,
      reason: `"${trimmed}" is ambiguous -- matches ${candidates.map((exercise) => exercise.name).join(', ')}.`,
    };
  }
  return { ok: false, reason: `No exercise found matching "${trimmed}".` };
}

/** Human-readable summary of a proposed action, used for both the confirmation card and the post-confirm follow-up. */
export function describeAction(action: AiAction): string {
  switch (action.kind) {
    case 'create_day': {
      const count = action.exercises.length;
      const groups = action.muscleGroups.length ? ` (${action.muscleGroups.join(', ')})` : '';
      return `Create "${action.label}"${groups} with ${count} exercise${count === 1 ? '' : 's'}: ${action.exercises
        .map((exercise) => exercise.exerciseName)
        .join(', ')}.`;
    }
    case 'add_exercises': {
      const count = action.exercises.length;
      return `Add ${count} exercise${count === 1 ? '' : 's'} to this day: ${action.exercises
        .map((exercise) => exercise.exerciseName)
        .join(', ')}.`;
    }
    case 'update_exercise': {
      const parts: string[] = [];
      if (action.targetWeightKg !== undefined) {
        parts.push(`weight to ${action.targetWeightKg === null ? 'bodyweight' : `${action.targetWeightKg}kg`}`);
      }
      if (action.targetRepsMin !== undefined || action.targetRepsMax !== undefined) {
        parts.push(`reps to ${action.targetRepsMin ?? '?'}-${action.targetRepsMax ?? '?'}`);
      }
      if (action.targetSets !== undefined) parts.push(`sets to ${action.targetSets}`);
      return `Update this exercise: ${parts.length ? parts.join(', ') : 'no changes specified'}.`;
    }
    case 'delete_exercise':
      return 'Remove this exercise from the routine.';
    case 'delete_day':
      return 'Delete this training day, including all its exercises.';
  }
}

function resolveExerciseInputs(exercises: ProposedExercise[], catalog: Exercise[]): NewExerciseInput[] {
  return exercises.map((entry) => {
    const resolution = resolveExerciseName(catalog, entry.exerciseName);
    if (!resolution.ok) throw new Error(resolution.reason);
    return {
      exerciseId: resolution.exerciseId,
      targetWeightKg: entry.targetWeightKg,
      targetRepsMin: entry.targetRepsMin,
      targetRepsMax: entry.targetRepsMax,
      targetSets: entry.targetSets,
      videoUrl: null,
    };
  });
}

/**
 * Executes a confirmed AI action against the local routines store. All
 * exercise names are resolved up front, before any store call, so an action
 * with one bad name fails atomically with no partial write.
 */
export async function executeAction(
  action: AiAction,
  routines: RoutinesActions,
  catalog: Exercise[]
): Promise<{ summary: string }> {
  switch (action.kind) {
    case 'create_day': {
      const inputs = resolveExerciseInputs(action.exercises, catalog);
      await routines.addDayWithExercises(action.label, action.muscleGroups, inputs);
      return { summary: describeAction(action) };
    }
    case 'add_exercises': {
      const inputs = resolveExerciseInputs(action.exercises, catalog);
      for (const input of inputs) {
        await routines.addExercise(action.dayId, input);
      }
      return { summary: describeAction(action) };
    }
    case 'update_exercise': {
      await routines.updateExercise(action.routineExerciseId, {
        targetWeightKg: action.targetWeightKg,
        targetRepsMin: action.targetRepsMin,
        targetRepsMax: action.targetRepsMax,
        targetSets: action.targetSets,
      });
      return { summary: describeAction(action) };
    }
    case 'delete_exercise':
      await routines.deleteExercise(action.routineExerciseId);
      return { summary: describeAction(action) };
    case 'delete_day':
      await routines.deleteDay(action.dayId);
      return { summary: describeAction(action) };
  }
}
