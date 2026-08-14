import { type DayWithExercises } from './routines-store';
import { resolveNextDay } from './workout-session-store';

jest.mock('@/db/client', () => ({ db: {} }));

function makeDay(id: number, label: string): DayWithExercises {
  return { id, label, routineId: 1, dayOrder: id, exercises: [] };
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
