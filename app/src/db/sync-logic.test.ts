import { isDirty, isPullCandidate, shouldApplyRemote } from './sync-logic';

describe('isDirty', () => {
  it('is dirty when the row has never been synced', () => {
    expect(isDirty({ remoteId: null, updatedAt: '2025-10-01' }, '2025-10-15')).toBe(true);
  });

  it('is dirty on the very first sync, regardless of updatedAt', () => {
    expect(isDirty({ remoteId: 'r1', updatedAt: '2020-01-01' }, null)).toBe(true);
  });

  it('is dirty when updated after the last sync', () => {
    expect(isDirty({ remoteId: 'r1', updatedAt: '2025-10-16' }, '2025-10-15')).toBe(true);
  });

  it('is not dirty when unchanged since the last sync', () => {
    expect(isDirty({ remoteId: 'r1', updatedAt: '2025-10-10' }, '2025-10-15')).toBe(false);
  });

  it('is not dirty when updated exactly at the last sync watermark', () => {
    expect(isDirty({ remoteId: 'r1', updatedAt: '2025-10-15' }, '2025-10-15')).toBe(false);
  });
});

describe('shouldApplyRemote', () => {
  it('applies the remote row when it is strictly newer', () => {
    expect(shouldApplyRemote('2025-10-10', '2025-10-15')).toBe(true);
  });

  it('keeps the local row when it is newer', () => {
    expect(shouldApplyRemote('2025-10-15', '2025-10-10')).toBe(false);
  });

  it('keeps the local row on a tie, rather than re-applying an identical write', () => {
    expect(shouldApplyRemote('2025-10-15', '2025-10-15')).toBe(false);
  });
});

describe('isPullCandidate', () => {
  it('is a candidate on the very first sync', () => {
    expect(isPullCandidate('2020-01-01', null)).toBe(true);
  });

  it('is a candidate when changed after the last sync', () => {
    expect(isPullCandidate('2025-10-16', '2025-10-15')).toBe(true);
  });

  it('is not a candidate when unchanged since the last sync', () => {
    expect(isPullCandidate('2025-10-10', '2025-10-15')).toBe(false);
  });
});
