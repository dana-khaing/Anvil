import * as Crypto from 'expo-crypto';

import type {
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

export const BACKUP_FORMAT_VERSION = 1 as const;

type WithoutRemoteId<T> = Omit<T, 'remoteId'>;

export type BackupDataV1 = {
  profiles: WithoutRemoteId<typeof profiles.$inferSelect>[];
  routines: WithoutRemoteId<typeof routines.$inferSelect>[];
  routineDays: WithoutRemoteId<typeof routineDays.$inferSelect>[];
  routineExercises: WithoutRemoteId<typeof routineExercises.$inferSelect>[];
  workoutSessions: WithoutRemoteId<typeof workoutSessions.$inferSelect>[];
  setLogs: WithoutRemoteId<typeof setLogs.$inferSelect>[];
  streaks: (typeof streaks.$inferSelect)[];
  goals: (typeof goals.$inferSelect)[];
  chatMessages: (typeof chatMessages.$inferSelect)[];
};

export type BackupSnapshotV1 = {
  formatVersion: typeof BACKUP_FORMAT_VERSION;
  createdAt: string;
  data: BackupDataV1;
  checksum: string;
};

export class InvalidBackupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidBackupError';
  }
}

type Validator = (value: unknown) => boolean;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString: Validator = (value) => typeof value === 'string';
const isNonEmptyString: Validator = (value) => typeof value === 'string' && value.length > 0;
const isNullableString: Validator = (value) => value === null || isString(value);
const isBoolean: Validator = (value) => typeof value === 'boolean';
const isFiniteNumber: Validator = (value) => typeof value === 'number' && Number.isFinite(value);
const isNullableFiniteNumber: Validator = (value) => value === null || isFiniteNumber(value);
const isPositiveInteger: Validator = (value) => Number.isInteger(value) && Number(value) > 0;
const isNonNegativeInteger: Validator = (value) => Number.isInteger(value) && Number(value) >= 0;
const isNullablePositiveInteger: Validator = (value) => value === null || isPositiveInteger(value);
const isDateString: Validator = (value) =>
  typeof value === 'string' && value.length > 0 && !Number.isNaN(Date.parse(value));
const isNullableDateString: Validator = (value) => value === null || isDateString(value);
const oneOf = (...values: readonly unknown[]): Validator => (value) => values.includes(value);
const nullable = (validator: Validator): Validator => (value) => value === null || validator(value);

function exactRow(value: unknown, fields: Record<string, Validator>): value is Record<string, unknown> {
  if (!isRecord(value)) return false;
  const expectedKeys = Object.keys(fields).sort();
  const actualKeys = Object.keys(value).sort();
  return (
    expectedKeys.length === actualKeys.length &&
    expectedKeys.every((key, index) => key === actualKeys[index] && fields[key](value[key]))
  );
}

const profileFields: Record<string, Validator> = {
  id: isPositiveInteger,
  heightCm: isNullableFiniteNumber,
  weightKg: isNullableFiniteNumber,
  goal: nullable(oneOf('build_muscle', 'lose_fat', 'maintain', 'strength')),
  notificationsEnabled: isBoolean,
  lastActiveAt: isNullableDateString,
  createdAt: isDateString,
  updatedAt: isDateString,
};

const routineFields: Record<string, Validator> = {
  id: isPositiveInteger,
  name: isNonEmptyString,
  splitType: oneOf('push_pull_legs', 'upper_lower', 'bro_split', 'custom'),
  isActive: isBoolean,
  createdAt: isDateString,
  updatedAt: isDateString,
};

const routineDayFields: Record<string, Validator> = {
  id: isPositiveInteger,
  routineId: isPositiveInteger,
  label: isNonEmptyString,
  dayOrder: isNonNegativeInteger,
  muscleGroups: isString,
  updatedAt: isDateString,
};

const routineExerciseFields: Record<string, Validator> = {
  id: isPositiveInteger,
  routineDayId: isPositiveInteger,
  exerciseId: isNonEmptyString,
  orderIndex: isNonNegativeInteger,
  targetWeightKg: isNullableFiniteNumber,
  targetRepsMin: isNullablePositiveInteger,
  targetRepsMax: isNullablePositiveInteger,
  targetSets: isPositiveInteger,
  videoUrl: isNullableString,
  notes: isNullableString,
  updatedAt: isDateString,
};

const workoutSessionFields: Record<string, Validator> = {
  id: isPositiveInteger,
  routineDayId: isPositiveInteger,
  status: oneOf('in_progress', 'completed', 'abandoned'),
  startedAt: isDateString,
  finishedAt: isNullableDateString,
  countsTowardStreak: isBoolean,
  updatedAt: isDateString,
};

const setLogFields: Record<string, Validator> = {
  id: isPositiveInteger,
  sessionId: isPositiveInteger,
  routineExerciseId: isPositiveInteger,
  substitutedExerciseId: isNullableString,
  setNumber: isPositiveInteger,
  weightKg: isNullableFiniteNumber,
  reps: isNullablePositiveInteger,
  completedAt: isNullableDateString,
};

const streakFields: Record<string, Validator> = {
  id: isPositiveInteger,
  currentStreak: isNonNegativeInteger,
  longestStreak: isNonNegativeInteger,
  lastWorkoutDate: isNullableDateString,
};

const goalFields: Record<string, Validator> = {
  id: isPositiveInteger,
  period: oneOf('daily', 'monthly'),
  targetCount: isPositiveInteger,
  startDate: isDateString,
  endDate: isNullableDateString,
};

const chatMessageFields: Record<string, Validator> = {
  id: isPositiveInteger,
  role: oneOf('user', 'assistant'),
  content: isNonEmptyString,
  actionPayload: isNullableString,
  actionStatus: nullable(oneOf('pending', 'confirmed', 'declined', 'failed')),
  createdAt: isDateString,
};

const dataValidators: Record<keyof BackupDataV1, Record<string, Validator>> = {
  profiles: profileFields,
  routines: routineFields,
  routineDays: routineDayFields,
  routineExercises: routineExerciseFields,
  workoutSessions: workoutSessionFields,
  setLogs: setLogFields,
  streaks: streakFields,
  goals: goalFields,
  chatMessages: chatMessageFields,
};

function idsFor(rows: unknown[]): Set<number> {
  return new Set(rows.map((row) => (row as { id: number }).id));
}

function assertUniqueIds(table: string, rows: unknown[]): void {
  if (idsFor(rows).size !== rows.length) throw new InvalidBackupError(`${table} contains duplicate ids`);
}

function assertReferences(
  table: string,
  rows: unknown[],
  foreignKey: string,
  parentTable: string,
  parentIds: Set<number>,
): void {
  for (const row of rows as Record<string, number>[]) {
    if (!parentIds.has(row[foreignKey])) {
      throw new InvalidBackupError(`${table}.${foreignKey} references a missing ${parentTable} row`);
    }
  }
}

export function validateBackupData(value: unknown): asserts value is BackupDataV1 {
  if (!isRecord(value)) throw new InvalidBackupError('Backup data must be an object');

  const expectedTables = Object.keys(dataValidators).sort();
  const actualTables = Object.keys(value).sort();
  if (
    expectedTables.length !== actualTables.length ||
    !expectedTables.every((table, index) => table === actualTables[index])
  ) {
    throw new InvalidBackupError('Backup data has an unexpected table set');
  }

  for (const [table, fields] of Object.entries(dataValidators)) {
    const rows = value[table];
    if (!Array.isArray(rows) || !rows.every((row) => exactRow(row, fields))) {
      throw new InvalidBackupError(`${table} contains an invalid row`);
    }
    assertUniqueIds(table, rows);
  }

  const data = value as BackupDataV1;
  if (data.profiles.length > 1) throw new InvalidBackupError('Backup contains more than one profile');

  const routineIds = idsFor(data.routines);
  const dayIds = idsFor(data.routineDays);
  const routineExerciseIds = idsFor(data.routineExercises);
  const sessionIds = idsFor(data.workoutSessions);

  assertReferences('routineDays', data.routineDays, 'routineId', 'routines', routineIds);
  assertReferences('routineExercises', data.routineExercises, 'routineDayId', 'routineDays', dayIds);
  assertReferences('workoutSessions', data.workoutSessions, 'routineDayId', 'routineDays', dayIds);
  assertReferences('setLogs', data.setLogs, 'sessionId', 'workoutSessions', sessionIds);
  assertReferences('setLogs', data.setLogs, 'routineExerciseId', 'routineExercises', routineExerciseIds);
}

function canonicalize(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

async function checksumFor(formatVersion: number, createdAt: string, data: BackupDataV1): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    canonicalize({ formatVersion, createdAt, data }),
  );
}

export async function createBackupSnapshot(data: BackupDataV1, createdAt = new Date().toISOString()): Promise<BackupSnapshotV1> {
  validateBackupData(data);
  if (!isDateString(createdAt)) throw new InvalidBackupError('Backup creation date is invalid');

  return {
    formatVersion: BACKUP_FORMAT_VERSION,
    createdAt,
    data,
    checksum: await checksumFor(BACKUP_FORMAT_VERSION, createdAt, data),
  };
}

export async function parseBackupSnapshot(value: unknown): Promise<BackupSnapshotV1> {
  if (!isRecord(value)) throw new InvalidBackupError('Backup must be an object');
  if (value.formatVersion !== BACKUP_FORMAT_VERSION) {
    throw new InvalidBackupError(`Unsupported backup format version: ${String(value.formatVersion)}`);
  }
  if (!isDateString(value.createdAt)) throw new InvalidBackupError('Backup creation date is invalid');
  if (typeof value.checksum !== 'string' || !/^[a-f\d]{64}$/i.test(value.checksum)) {
    throw new InvalidBackupError('Backup checksum is invalid');
  }
  validateBackupData(value.data);

  const checksum = await checksumFor(value.formatVersion, value.createdAt as string, value.data);
  if (checksum.toLowerCase() !== value.checksum.toLowerCase()) {
    throw new InvalidBackupError('Backup checksum does not match its contents');
  }

  return value as BackupSnapshotV1;
}
