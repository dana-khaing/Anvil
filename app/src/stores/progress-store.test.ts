import { computeBadges, currentMonthRange, toCalendarDate, updateStreakForCompletion } from './progress-store';

jest.mock('@/db/client', () => ({ db: {} }));

describe('toCalendarDate', () => {
  it('formats an ISO datetime as a local YYYY-MM-DD date', () => {
    expect(toCalendarDate('2025-09-22T09:12:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('updateStreakForCompletion', () => {
  const empty = { currentStreak: 0, longestStreak: 0, lastWorkoutDate: null };

  it('starts a streak at 1 on the first-ever workout', () => {
    expect(updateStreakForCompletion(empty, '2025-09-01')).toEqual({
      currentStreak: 1,
      longestStreak: 1,
      lastWorkoutDate: '2025-09-01',
    });
  });

  it('is a no-op for a second workout on the same day', () => {
    const streak = { currentStreak: 3, longestStreak: 5, lastWorkoutDate: '2025-09-01' };
    expect(updateStreakForCompletion(streak, '2025-09-01')).toBe(streak);
  });

  it('increments on the very next calendar day', () => {
    const streak = { currentStreak: 3, longestStreak: 5, lastWorkoutDate: '2025-09-01' };
    expect(updateStreakForCompletion(streak, '2025-09-02')).toEqual({
      currentStreak: 4,
      longestStreak: 5,
      lastWorkoutDate: '2025-09-02',
    });
  });

  it('raises longestStreak once currentStreak passes it', () => {
    const streak = { currentStreak: 5, longestStreak: 5, lastWorkoutDate: '2025-09-01' };
    expect(updateStreakForCompletion(streak, '2025-09-02')).toEqual({
      currentStreak: 6,
      longestStreak: 6,
      lastWorkoutDate: '2025-09-02',
    });
  });

  it('resets currentStreak to 1 after a gap, but keeps the record longestStreak', () => {
    const streak = { currentStreak: 5, longestStreak: 5, lastWorkoutDate: '2025-09-01' };
    expect(updateStreakForCompletion(streak, '2025-09-04')).toEqual({
      currentStreak: 1,
      longestStreak: 5,
      lastWorkoutDate: '2025-09-04',
    });
  });

  it('resets across a month boundary exactly like any other 1-day gap', () => {
    const streak = { currentStreak: 2, longestStreak: 2, lastWorkoutDate: '2025-08-31' };
    expect(updateStreakForCompletion(streak, '2025-09-01')).toEqual({
      currentStreak: 3,
      longestStreak: 3,
      lastWorkoutDate: '2025-09-01',
    });
  });
});

describe('currentMonthRange', () => {
  it('returns the first and last day of the given month', () => {
    expect(currentMonthRange(new Date(2025, 8, 15))).toEqual({
      startDate: '2025-09-01',
      endDate: '2025-09-30',
    });
  });

  it('handles February in a leap year', () => {
    expect(currentMonthRange(new Date(2024, 1, 10))).toEqual({
      startDate: '2024-02-01',
      endDate: '2024-02-29',
    });
  });

  it('handles February in a non-leap year', () => {
    expect(currentMonthRange(new Date(2025, 1, 10))).toEqual({
      startDate: '2025-02-01',
      endDate: '2025-02-28',
    });
  });
});

describe('computeBadges', () => {
  it('earns nothing with no workouts and no streak', () => {
    const badges = computeBadges({ totalWorkouts: 0, longestStreak: 0 });
    expect(badges.every((badge) => !badge.earned)).toBe(true);
  });

  it('earns only first-workout at exactly 1 workout', () => {
    const badges = computeBadges({ totalWorkouts: 1, longestStreak: 1 });
    const earned = badges.filter((badge) => badge.earned).map((badge) => badge.id);
    expect(earned).toEqual(['first-workout']);
  });

  it('earns streak badges independently of workout count', () => {
    const badges = computeBadges({ totalWorkouts: 0, longestStreak: 7 });
    const earned = badges.filter((badge) => badge.earned).map((badge) => badge.id);
    expect(earned).toEqual(['streak-3', 'streak-7']);
  });

  it('earns everything once every threshold is cleared', () => {
    const badges = computeBadges({ totalWorkouts: 50, longestStreak: 30 });
    expect(badges.every((badge) => badge.earned)).toBe(true);
  });
});
