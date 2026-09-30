import * as Crypto from 'expo-crypto';

import { db } from './client';
import {
  chatMessages,
  goals,
  profiles,
  routineDays,
  routineExercises,
  routines,
  setLogs,
  streaks,
  workoutSessions,
} from './schema';
import { captureBackupSnapshot } from './backup-snapshot';

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: jest.fn().mockResolvedValue('c'.repeat(64)),
}));
jest.mock('./client', () => ({ db: { transaction: jest.fn() } }));

const tableRows = new Map<unknown, unknown[]>([
  [
    profiles,
    [
      {
        id: 1,
        remoteId: 'remote-profile',
        heightCm: null,
        weightKg: null,
        goal: null,
        notificationsEnabled: false,
        lastActiveAt: null,
        createdAt: '2025-12-01T08:00:00.000Z',
        updatedAt: '2025-12-20T08:00:00.000Z',
      },
    ],
  ],
  [
    routines,
    [
      {
        id: 4,
        remoteId: 'remote-routine',
        name: 'Backup test',
        splitType: 'custom',
        isActive: true,
        createdAt: '2025-12-01T08:00:00.000Z',
        updatedAt: '2025-12-20T08:00:00.000Z',
      },
    ],
  ],
  [routineDays, []],
  [routineExercises, []],
  [workoutSessions, []],
  [setLogs, []],
  [streaks, []],
  [goals, []],
  [chatMessages, []],
]);

beforeEach(() => {
  jest.clearAllMocks();
  (db.transaction as jest.Mock).mockImplementation((callback) =>
    callback({
      select: () => ({
        from: (table: unknown) => ({
          orderBy: () => ({ all: () => tableRows.get(table) ?? [] }),
        }),
      }),
    }),
  );
});

it('captures all user tables in one transaction and removes device-specific remote ids', async () => {
  const snapshot = await captureBackupSnapshot(new Date('2025-12-20T14:30:00.000Z'));

  expect(db.transaction).toHaveBeenCalledTimes(1);
  expect(snapshot).toMatchObject({
    formatVersion: 1,
    createdAt: '2025-12-20T14:30:00.000Z',
    checksum: 'c'.repeat(64),
    data: {
      profiles: [expect.not.objectContaining({ remoteId: expect.anything() })],
      routines: [expect.not.objectContaining({ remoteId: expect.anything() })],
      routineDays: [],
      routineExercises: [],
      workoutSessions: [],
      setLogs: [],
      streaks: [],
      goals: [],
      chatMessages: [],
    },
  });
  expect(Crypto.digestStringAsync).toHaveBeenCalledTimes(1);
});
