import { syncWithSupabase } from '@/db/sync';

import { useSyncStore } from './sync-store';

jest.mock('@/db/sync', () => ({ syncWithSupabase: jest.fn() }));

const mockSyncWithSupabase = syncWithSupabase as jest.MockedFunction<typeof syncWithSupabase>;

describe('sync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useSyncStore.setState({ status: 'idle', lastSyncedAt: null, error: null });
  });

  it('ignores a second request while a sync is in progress', async () => {
    let finishSync: (() => void) | undefined;
    mockSyncWithSupabase.mockReturnValue(
      new Promise<void>((resolve) => {
        finishSync = resolve;
      }),
    );

    const firstSync = useSyncStore.getState().sync('user-1');
    const overlappingSync = useSyncStore.getState().sync('user-1');

    expect(useSyncStore.getState().status).toBe('syncing');
    expect(mockSyncWithSupabase).toHaveBeenCalledTimes(1);

    finishSync?.();
    await Promise.all([firstSync, overlappingSync]);

    expect(useSyncStore.getState()).toMatchObject({
      status: 'idle',
      error: null,
    });
    expect(useSyncStore.getState().lastSyncedAt).not.toBeNull();
  });
});
