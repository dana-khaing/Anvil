import { create } from 'zustand';

import { syncWithSupabase } from '@/db/sync';

type SyncStatus = 'idle' | 'syncing' | 'error';

type SyncState = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  sync: (userId: string) => Promise<void>;
};

export const useSyncStore = create<SyncState>((set) => ({
  status: 'idle',
  lastSyncedAt: null,
  error: null,

  sync: async (userId) => {
    set({ status: 'syncing', error: null });
    try {
      await syncWithSupabase(userId);
      set({ status: 'idle', lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Sync failed' });
    }
  },
}));
