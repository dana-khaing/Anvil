import * as Crypto from 'expo-crypto';

import {
  createBackupSnapshot,
  InvalidBackupError,
  parseBackupSnapshot,
  type BackupDataV1,
} from './backup-snapshot-format';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn(),
}));

const digestStringAsync = Crypto.digestStringAsync as jest.MockedFunction<typeof Crypto.digestStringAsync>;

function validData(): BackupDataV1 {
  return {
    profiles: [
      {
        id: 1,
        heightCm: 170,
        weightKg: 70,
        goal: 'strength',
        notificationsEnabled: true,
        lastActiveAt: '2025-12-20T08:00:00.000Z',
        createdAt: '2025-12-01T08:00:00.000Z',
        updatedAt: '2025-12-20T08:00:00.000Z',
      },
    ],
    routines: [
      {
        id: 10,
        name: 'Strength',
        splitType: 'custom',
        isActive: true,
        createdAt: '2025-12-01T08:00:00.000Z',
        updatedAt: '2025-12-20T08:00:00.000Z',
      },
    ],
    routineDays: [
      {
        id: 20,
        routineId: 10,
        label: 'Full body',
        dayOrder: 0,
        muscleGroups: '["chest"]',
        updatedAt: '2025-12-20T08:00:00.000Z',
      },
    ],
    routineExercises: [
      {
        id: 30,
        routineDayId: 20,
        exerciseId: 'barbell-bench-press',
        orderIndex: 0,
        targetWeightKg: 60,
        targetRepsMin: 5,
        targetRepsMax: 5,
        targetSets: 3,
        videoUrl: null,
        notes: null,
        updatedAt: '2025-12-20T08:00:00.000Z',
      },
    ],
    workoutSessions: [
      {
        id: 40,
        routineDayId: 20,
        status: 'completed',
        startedAt: '2025-12-20T08:00:00.000Z',
        finishedAt: '2025-12-20T09:00:00.000Z',
        countsTowardStreak: true,
        updatedAt: '2025-12-20T09:00:00.000Z',
      },
    ],
    setLogs: [
      {
        id: 50,
        sessionId: 40,
        routineExerciseId: 30,
        substitutedExerciseId: null,
        setNumber: 1,
        weightKg: 60,
        reps: 5,
        completedAt: '2025-12-20T08:20:00.000Z',
      },
    ],
    streaks: [{ id: 60, currentStreak: 1, longestStreak: 3, lastWorkoutDate: '2025-12-20' }],
    goals: [{ id: 70, period: 'monthly', targetCount: 12, startDate: '2025-12-01', endDate: null }],
    chatMessages: [
      {
        id: 80,
        role: 'user',
        content: 'How was my session?',
        actionPayload: null,
        actionStatus: null,
        createdAt: '2025-12-20T09:05:00.000Z',
      },
    ],
  };
}

beforeEach(() => {
  digestStringAsync.mockReset();
  digestStringAsync.mockResolvedValue('a'.repeat(64));
});

it('creates and accepts a complete checksummed snapshot', async () => {
  const data = validData();
  const snapshot = await createBackupSnapshot(data, '2025-12-20T12:00:00.000Z');

  expect(snapshot).toMatchObject({ formatVersion: 1, createdAt: '2025-12-20T12:00:00.000Z', data });
  expect(await parseBackupSnapshot(snapshot)).toEqual(snapshot);
  expect(digestStringAsync).toHaveBeenCalledWith('SHA-256', expect.stringContaining('"routineExercises"'));
});

it('rejects an unsupported format version', async () => {
  const snapshot = await createBackupSnapshot(validData());
  await expect(parseBackupSnapshot({ ...snapshot, formatVersion: 2 })).rejects.toThrow(
    'Unsupported backup format version: 2',
  );
});

it('rejects unexpected envelope fields', async () => {
  const snapshot = await createBackupSnapshot(validData());
  await expect(parseBackupSnapshot({ ...snapshot, ignored: true })).rejects.toThrow('unexpected envelope shape');
});

it('rejects malformed rows and unexpected table sets', async () => {
  const data = validData();
  await expect(createBackupSnapshot({ ...data, profiles: [{ ...data.profiles[0], heightCm: Infinity }] })).rejects.toThrow(
    'profiles contains an invalid row',
  );

  const { goals: _goals, ...missingTable } = data;
  await expect(createBackupSnapshot(missingTable as BackupDataV1)).rejects.toThrow('unexpected table set');
});

it('rejects duplicate ids and dangling relationships', async () => {
  const data = validData();
  await expect(createBackupSnapshot({ ...data, routines: [...data.routines, data.routines[0]] })).rejects.toThrow(
    'routines contains duplicate ids',
  );

  await expect(
    createBackupSnapshot({
      ...data,
      setLogs: [{ ...data.setLogs[0], routineExerciseId: 999 }],
    }),
  ).rejects.toThrow('setLogs.routineExerciseId references a missing routineExercises row');
});

it('rejects a set log connected across two routine days', async () => {
  const data = validData();
  await expect(
    createBackupSnapshot({
      ...data,
      routineDays: [
        ...data.routineDays,
        { ...data.routineDays[0], id: 21, label: 'Other day', dayOrder: 1 },
      ],
      routineExercises: [{ ...data.routineExercises[0], routineDayId: 21 }],
    }),
  ).rejects.toThrow('setLogs links a session and exercise from different routine days');
});

it('rejects a snapshot whose contents no longer match its checksum', async () => {
  const snapshot = await createBackupSnapshot(validData());
  digestStringAsync.mockResolvedValueOnce('b'.repeat(64));

  await expect(parseBackupSnapshot(snapshot)).rejects.toEqual(
    new InvalidBackupError('Backup checksum does not match its contents'),
  );
});
