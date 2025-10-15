import { buildStreakCalendar, mostLoggedExerciseId, summarizeWeightTrend, weightProgressionByDate } from './stats-store';

jest.mock('@/db/client', () => ({ db: {} }));

describe('buildStreakCalendar', () => {
  it('returns `days` consecutive dates ending at endDate, oldest first', () => {
    const calendar = buildStreakCalendar([], 5, new Date(2025, 8, 22));
    expect(calendar.map((day) => day.date)).toEqual([
      '2025-09-18',
      '2025-09-19',
      '2025-09-20',
      '2025-09-21',
      '2025-09-22',
    ]);
  });

  it('marks completed only for dates present in the completion list', () => {
    const calendar = buildStreakCalendar(['2025-09-20'], 3, new Date(2025, 8, 21));
    expect(calendar).toEqual([
      { date: '2025-09-19', completed: false },
      { date: '2025-09-20', completed: true },
      { date: '2025-09-21', completed: false },
    ]);
  });

  it('rolls a month boundary correctly', () => {
    const calendar = buildStreakCalendar([], 3, new Date(2025, 9, 1));
    expect(calendar.map((day) => day.date)).toEqual(['2025-09-29', '2025-09-30', '2025-10-01']);
  });
});

describe('mostLoggedExerciseId', () => {
  it('returns null for no logs', () => {
    expect(mostLoggedExerciseId([])).toBeNull();
  });

  it('returns the exercise with the most logged sets', () => {
    const rows = [
      { exerciseId: 'bench' },
      { exerciseId: 'squat' },
      { exerciseId: 'bench' },
      { exerciseId: 'bench' },
      { exerciseId: 'squat' },
    ];
    expect(mostLoggedExerciseId(rows)).toBe('bench');
  });

  it('breaks ties by whichever appears first', () => {
    const rows = [{ exerciseId: 'squat' }, { exerciseId: 'bench' }];
    expect(mostLoggedExerciseId(rows)).toBe('squat');
  });
});

describe('weightProgressionByDate', () => {
  const rows = [
    { exerciseId: 'bench', weightKg: 60, completedAt: '2025-09-01T10:00:00.000Z' },
    { exerciseId: 'bench', weightKg: 65, completedAt: '2025-09-01T10:05:00.000Z' },
    { exerciseId: 'squat', weightKg: 100, completedAt: '2025-09-01T10:10:00.000Z' },
    { exerciseId: 'bench', weightKg: 62.5, completedAt: '2025-08-28T09:00:00.000Z' },
    { exerciseId: 'bench', weightKg: null, completedAt: '2025-09-05T09:00:00.000Z' },
  ];

  it('filters to the requested exercise', () => {
    const points = weightProgressionByDate(rows, 'squat');
    expect(points).toHaveLength(1);
    expect(points[0].weightKg).toBe(100);
  });

  it('takes the heaviest set per calendar date, sorted oldest first', () => {
    const points = weightProgressionByDate(rows, 'bench');
    expect(points.map((point) => point.weightKg)).toEqual([62.5, 65]);
    expect(points[0].date < points[1].date).toBe(true);
  });

  it('excludes sets with no weight (bodyweight exercises)', () => {
    const points = weightProgressionByDate(
      [{ exerciseId: 'pushup', weightKg: null, completedAt: '2025-09-01T00:00:00.000Z' }],
      'pushup'
    );
    expect(points).toEqual([]);
  });
});

describe('summarizeWeightTrend', () => {
  it('describes an empty series', () => {
    expect(summarizeWeightTrend('Bench Press', [])).toBe('Bench Press: no sessions logged yet.');
  });

  it('describes a single point without a trend direction', () => {
    expect(summarizeWeightTrend('Bench Press', [{ date: '2025-09-01', weightKg: 60 }])).toBe(
      'Bench Press: 60kg logged so far.'
    );
  });

  it('describes an upward trend', () => {
    const points = [
      { date: '2025-09-01', weightKg: 57.5 },
      { date: '2025-09-08', weightKg: 62.5 },
    ];
    expect(summarizeWeightTrend('Bench Press', points)).toBe(
      'Bench Press: up from 57.5kg to 62.5kg over 2 sessions.'
    );
  });

  it('describes a downward trend', () => {
    const points = [
      { date: '2025-09-01', weightKg: 62.5 },
      { date: '2025-09-08', weightKg: 57.5 },
    ];
    expect(summarizeWeightTrend('Bench Press', points)).toBe(
      'Bench Press: down from 62.5kg to 57.5kg over 2 sessions.'
    );
  });

  it('describes a flat trend', () => {
    const points = [
      { date: '2025-09-01', weightKg: 60 },
      { date: '2025-09-08', weightKg: 60 },
    ];
    expect(summarizeWeightTrend('Bench Press', points)).toBe(
      'Bench Press: flat from 60kg to 60kg over 2 sessions.'
    );
  });
});
