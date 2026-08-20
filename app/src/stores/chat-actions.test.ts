import { describeAction, executeAction, resolveExerciseName, type AiAction, type RoutinesActions } from './chat-actions';
import { type Exercise } from './routines-store';

const benchPress: Exercise = {
  id: 'barbell-bench-press',
  name: 'Barbell Bench Press',
  equipment: 'barbell',
  muscleGroup: 'chest',
  defaultVideoUrl: null,
  alternativeIds: '[]',
};

const dumbbellBenchPress: Exercise = {
  id: 'dumbbell-bench-press',
  name: 'Dumbbell Bench Press',
  equipment: 'dumbbell',
  muscleGroup: 'chest',
  defaultVideoUrl: null,
  alternativeIds: '[]',
};

const squat: Exercise = {
  id: 'barbell-back-squat',
  name: 'Barbell Back Squat',
  equipment: 'barbell',
  muscleGroup: 'quads',
  defaultVideoUrl: null,
  alternativeIds: '[]',
};

const catalog: Exercise[] = [benchPress, dumbbellBenchPress, squat];

describe('resolveExerciseName', () => {
  it('matches an exact name, case-insensitively', () => {
    expect(resolveExerciseName(catalog, 'barbell bench press')).toEqual({ ok: true, exerciseId: 'barbell-bench-press' });
  });

  it('matches a single unambiguous substring', () => {
    expect(resolveExerciseName(catalog, 'squat')).toEqual({ ok: true, exerciseId: 'barbell-back-squat' });
  });

  it('fails with candidate names when the substring is ambiguous', () => {
    const result = resolveExerciseName(catalog, 'bench press');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain('Barbell Bench Press');
      expect(result.reason).toContain('Dumbbell Bench Press');
    }
  });

  it('fails with no candidates when nothing matches', () => {
    const result = resolveExerciseName(catalog, 'leg press');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('No exercise found matching "leg press"');
  });
});

describe('describeAction', () => {
  it('describes create_day', () => {
    const action: AiAction = {
      kind: 'create_day',
      label: 'Push Day',
      muscleGroups: ['chest', 'triceps'],
      exercises: [{ exerciseName: 'Barbell Bench Press', targetWeightKg: 60, targetRepsMin: 8, targetRepsMax: 10, targetSets: 3 }],
    };
    expect(describeAction(action)).toContain('Create "Push Day"');
    expect(describeAction(action)).toContain('1 exercise');
    expect(describeAction(action)).toContain('Barbell Bench Press');
  });

  it('describes add_exercises', () => {
    const action: AiAction = {
      kind: 'add_exercises',
      dayId: 1,
      exercises: [
        { exerciseName: 'Barbell Bench Press', targetWeightKg: 60, targetRepsMin: 8, targetRepsMax: 10, targetSets: 3 },
        { exerciseName: 'Barbell Back Squat', targetWeightKg: 80, targetRepsMin: 5, targetRepsMax: 5, targetSets: 5 },
      ],
    };
    expect(describeAction(action)).toContain('Add 2 exercises');
  });

  it('describes update_exercise with only the fields that change', () => {
    expect(describeAction({ kind: 'update_exercise', routineExerciseId: 1, targetSets: 4 })).toBe(
      'Update this exercise: sets to 4.'
    );
    expect(describeAction({ kind: 'update_exercise', routineExerciseId: 1, targetWeightKg: null })).toBe(
      'Update this exercise: weight to bodyweight.'
    );
  });

  it('describes delete_exercise and delete_day', () => {
    expect(describeAction({ kind: 'delete_exercise', routineExerciseId: 1 })).toContain('Remove this exercise');
    expect(describeAction({ kind: 'delete_day', dayId: 1 })).toContain('Delete this training day');
  });
});

function makeRoutinesMock(): RoutinesActions {
  return {
    addDayWithExercises: jest.fn().mockResolvedValue(undefined),
    addExercise: jest.fn().mockResolvedValue(undefined),
    updateExercise: jest.fn().mockResolvedValue(undefined),
    deleteExercise: jest.fn().mockResolvedValue(undefined),
    deleteDay: jest.fn().mockResolvedValue(undefined),
  };
}

describe('executeAction', () => {
  it('resolves exercise names and calls addDayWithExercises for create_day', async () => {
    const routines = makeRoutinesMock();
    const action: AiAction = {
      kind: 'create_day',
      label: 'Push Day',
      muscleGroups: ['chest'],
      exercises: [{ exerciseName: 'Barbell Bench Press', targetWeightKg: 60, targetRepsMin: 8, targetRepsMax: 10, targetSets: 3 }],
    };

    await executeAction(action, routines, catalog);

    expect(routines.addDayWithExercises).toHaveBeenCalledWith('Push Day', ['chest'], [
      { exerciseId: 'barbell-bench-press', targetWeightKg: 60, targetRepsMin: 8, targetRepsMax: 10, targetSets: 3, videoUrl: null },
    ]);
  });

  it('fails atomically with no store call when a create_day exercise name does not resolve', async () => {
    const routines = makeRoutinesMock();
    const action: AiAction = {
      kind: 'create_day',
      label: 'Push Day',
      muscleGroups: [],
      exercises: [
        { exerciseName: 'Barbell Bench Press', targetWeightKg: 60, targetRepsMin: 8, targetRepsMax: 10, targetSets: 3 },
        { exerciseName: 'Nonexistent Exercise', targetWeightKg: null, targetRepsMin: null, targetRepsMax: null, targetSets: 3 },
      ],
    };

    await expect(executeAction(action, routines, catalog)).rejects.toThrow('No exercise found matching "Nonexistent Exercise"');
    expect(routines.addDayWithExercises).not.toHaveBeenCalled();
  });

  it('loops addExercise for add_exercises', async () => {
    const routines = makeRoutinesMock();
    const action: AiAction = {
      kind: 'add_exercises',
      dayId: 7,
      exercises: [
        { exerciseName: 'Barbell Bench Press', targetWeightKg: 60, targetRepsMin: 8, targetRepsMax: 10, targetSets: 3 },
        { exerciseName: 'Squat', targetWeightKg: 80, targetRepsMin: 5, targetRepsMax: 5, targetSets: 5 },
      ],
    };

    await executeAction(action, routines, catalog);

    expect(routines.addExercise).toHaveBeenCalledTimes(2);
    expect(routines.addExercise).toHaveBeenNthCalledWith(1, 7, expect.objectContaining({ exerciseId: 'barbell-bench-press' }));
    expect(routines.addExercise).toHaveBeenNthCalledWith(2, 7, expect.objectContaining({ exerciseId: 'barbell-back-squat' }));
  });

  it('calls updateExercise/deleteExercise/deleteDay for the remaining kinds', async () => {
    const routines = makeRoutinesMock();

    await executeAction({ kind: 'update_exercise', routineExerciseId: 3, targetSets: 4 }, routines, catalog);
    expect(routines.updateExercise).toHaveBeenCalledWith(3, { targetSets: 4 });

    await executeAction({ kind: 'delete_exercise', routineExerciseId: 3 }, routines, catalog);
    expect(routines.deleteExercise).toHaveBeenCalledWith(3);

    await executeAction({ kind: 'delete_day', dayId: 2 }, routines, catalog);
    expect(routines.deleteDay).toHaveBeenCalledWith(2);
  });
});
