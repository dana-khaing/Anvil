/**
 * Pure decision logic for the last-write-wins sync engine (Day 30). Kept
 * separate from sync.ts's Supabase/Drizzle orchestration so it's testable
 * without mocking the db layer -- same split as notification-scheduling.ts
 * vs notifications-background-task.ts.
 */

/** A local row is worth pushing if it's never been synced, or has changed since the last sync. */
export function isDirty(row: { remoteId: string | null; updatedAt: string }, since: string | null): boolean {
  if (!row.remoteId) return true;
  if (!since) return true;
  return row.updatedAt > since;
}

/**
 * Row-level last-write-wins: the remote copy is only applied over the local
 * one if it's strictly newer. Ties (e.g. a row pulled back immediately
 * after this device pushed it) keep the local copy rather than re-applying
 * an identical write.
 */
export function shouldApplyRemote(localUpdatedAt: string, remoteUpdatedAt: string): boolean {
  return remoteUpdatedAt > localUpdatedAt;
}

/** A remote row changed since the last sync -- same shape of check as isDirty, mirrored for the pull direction. */
export function isPullCandidate(remoteUpdatedAt: string, since: string | null): boolean {
  if (!since) return true;
  return remoteUpdatedAt > since;
}
