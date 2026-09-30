import { asc } from 'drizzle-orm';

import { createBackupSnapshot, type BackupDataV1, type BackupSnapshotV1 } from './backup-snapshot-format';
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

function withoutRemoteId<T extends { remoteId: string | null }>(row: T): Omit<T, 'remoteId'> {
  return Object.fromEntries(Object.entries(row).filter(([key]) => key !== 'remoteId')) as Omit<T, 'remoteId'>;
}

/** Reads all user-owned tables from one SQLite transaction for a coherent point-in-time snapshot. */
export async function captureBackupSnapshot(now = new Date()): Promise<BackupSnapshotV1> {
  const data = db.transaction((tx): BackupDataV1 => ({
    profiles: tx.select().from(profiles).orderBy(asc(profiles.id)).all().map(withoutRemoteId),
    routines: tx.select().from(routines).orderBy(asc(routines.id)).all().map(withoutRemoteId),
    routineDays: tx.select().from(routineDays).orderBy(asc(routineDays.id)).all().map(withoutRemoteId),
    routineExercises: tx
      .select()
      .from(routineExercises)
      .orderBy(asc(routineExercises.id))
      .all()
      .map(withoutRemoteId),
    workoutSessions: tx
      .select()
      .from(workoutSessions)
      .orderBy(asc(workoutSessions.id))
      .all()
      .map(withoutRemoteId),
    setLogs: tx.select().from(setLogs).orderBy(asc(setLogs.id)).all().map(withoutRemoteId),
    streaks: tx.select().from(streaks).orderBy(asc(streaks.id)).all(),
    goals: tx.select().from(goals).orderBy(asc(goals.id)).all(),
    chatMessages: tx.select().from(chatMessages).orderBy(asc(chatMessages.id)).all(),
  }));

  return createBackupSnapshot(data, now.toISOString());
}
