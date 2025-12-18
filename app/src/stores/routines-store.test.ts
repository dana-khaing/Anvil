import {
  addExerciseToDay,
  createDefaultRoutine,
  createRoutineDay,
  type NewExerciseInput,
} from '@/db/routines';

import { type DayWithExercises, type Routine, useRoutinesStore } from './routines-store';

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('@/db/routines', () => ({
  addExercisesToDay: jest.fn(),
  addExerciseToDay: jest.fn(),
  createDayWithExercises: jest.fn(),
  createDefaultRoutine: jest.fn(),
  createRoutineDay: jest.fn(),
  deleteRoutineDay: jest.fn(),
  deleteRoutineExercise: jest.fn(),
  updateRoutineExercise: jest.fn(),
}));

const mockAddExerciseToDay = addExerciseToDay as jest.MockedFunction<typeof addExerciseToDay>;
const mockCreateDefaultRoutine = createDefaultRoutine as jest.MockedFunction<typeof createDefaultRoutine>;
const mockCreateRoutineDay = createRoutineDay as jest.MockedFunction<typeof createRoutineDay>;

const routine: Routine = {
  id: 3,
  remoteId: null,
  name: 'My Routine',
  splitType: 'custom',
  isActive: true,
  createdAt: '2025-12-18',
  updatedAt: '2025-12-18',
};

const exerciseInput: NewExerciseInput = {
  exerciseId: 'barbell-bench-press',
  targetWeightKg: 60,
  targetRepsMin: 8,
  targetRepsMax: 10,
  targetSets: 3,
  videoUrl: null,
};

describe('routine mutation orchestration', () => {
  const load = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    useRoutinesStore.setState({ activeRoutine: routine, days: [], loaded: true, load });
  });

  it('creates a default routine once when no active routine is loaded', async () => {
    useRoutinesStore.setState({ activeRoutine: null });
    mockCreateDefaultRoutine.mockResolvedValue(routine);

    const created = await useRoutinesStore.getState().ensureActiveRoutine();

    expect(created).toBe(routine);
    expect(mockCreateDefaultRoutine).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('passes the next day order to persistence and reloads afterward', async () => {
    useRoutinesStore.setState({ days: [{}, {}] as DayWithExercises[] });

    await useRoutinesStore.getState().addDay('Pull Day', ['back', 'biceps']);

    expect(mockCreateRoutineDay).toHaveBeenCalledWith(3, 'Pull Day', 2, ['back', 'biceps']);
    expect(load).toHaveBeenCalledTimes(1);
    expect(mockCreateRoutineDay.mock.invocationCallOrder[0]).toBeLessThan(load.mock.invocationCallOrder[0]);
  });

  it('passes the next exercise order to persistence and reloads afterward', async () => {
    useRoutinesStore.setState({
      days: [{ id: 7, exercises: [{}, {}] }] as DayWithExercises[],
    });

    await useRoutinesStore.getState().addExercise(7, exerciseInput);

    expect(mockAddExerciseToDay).toHaveBeenCalledWith(7, 2, exerciseInput);
    expect(load).toHaveBeenCalledTimes(1);
    expect(mockAddExerciseToDay.mock.invocationCallOrder[0]).toBeLessThan(load.mock.invocationCallOrder[0]);
  });
});
