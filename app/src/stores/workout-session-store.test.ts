import { type DayWithExercises } from './routines-store';
import { adjustForSubstitution, resolveNextDay, type SubstitutionTargets } from './workout-session-store';

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

function makeDay(id: number, label: string): DayWithExercises {
  return {
    id,
    label,
    routineId: 1,
    dayOrder: id,
    exercises: [],
    remoteId: null,
    updatedAt: '2025-01-01T00:00:00.000Z',
    deletedAt: null,
  };
}

describe('resolveNextDay', () => {
  const days = [makeDay(10, 'D1'), makeDay(11, 'D2'), makeDay(12, 'D3')];

  it('starts at the first day when nothing has been completed yet', () => {
    expect(resolveNextDay(days, null)?.id).toBe(10);
  });

  it('advances to the next day after the last completed one', () => {
    expect(resolveNextDay(days, 10)?.id).toBe(11);
    expect(resolveNextDay(days, 11)?.id).toBe(12);
  });

  it('wraps back to the first day after the last one', () => {
    expect(resolveNextDay(days, 12)?.id).toBe(10);
  });

  it('falls back to the first day if the last completed day no longer exists', () => {
    expect(resolveNextDay(days, 999)?.id).toBe(10);
  });

  it('returns undefined when there are no days', () => {
    expect(resolveNextDay([], null)).toBeUndefined();
  });
});

describe('adjustForSubstitution', () => {
  const original: SubstitutionTargets = {
    targetWeightKg: 60,
    targetRepsMin: 8,
    targetRepsMax: 10,
    targetSets: 3,
  };

  it('leaves targets unchanged when the equipment does not actually change', () => {
    expect(adjustForSubstitution(original, 'barbell', 'barbell')).toEqual(original);
  });

  it('keeps reps/sets and carries weight over between two weighted equipment types', () => {
    expect(adjustForSubstitution(original, 'barbell', 'dumbbell')).toEqual(original);
    expect(adjustForSubstitution(original, 'machine', 'cable')).toEqual(original);
  });

  it('bumps reps ~50% and clears weight when swapping to bodyweight', () => {
    expect(adjustForSubstitution(original, 'barbell', 'bodyweight')).toEqual({
      targetWeightKg: null,
      targetRepsMin: 12, // ceil(8 * 1.5)
      targetRepsMax: 15, // ceil(10 * 1.5)
      targetSets: 3,
    });
  });

  it('reverts to a standard 8-12 rep range and clears weight when swapping off bodyweight', () => {
    const bodyweightOriginal: SubstitutionTargets = {
      targetWeightKg: null,
      targetRepsMin: 15,
      targetRepsMax: 20,
      targetSets: 3,
    };

    expect(adjustForSubstitution(bodyweightOriginal, 'bodyweight', 'dumbbell')).toEqual({
      targetWeightKg: null,
      targetRepsMin: 8,
      targetRepsMax: 12,
      targetSets: 3,
    });
  });

  it('handles a null rep target without crashing', () => {
    const noReps: SubstitutionTargets = {
      targetWeightKg: 20,
      targetRepsMin: null,
      targetRepsMax: null,
      targetSets: 3,
    };

    expect(adjustForSubstitution(noReps, 'dumbbell', 'bodyweight')).toEqual({
      targetWeightKg: null,
      targetRepsMin: null,
      targetRepsMax: null,
      targetSets: 3,
    });
  });
});
