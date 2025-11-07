import { create } from 'zustand';

import { syncWithSupabase } from '@/db/sync';

type SyncStatus = 'idle' | 'syncing' | 'error';

type SyncState = {
  status: SyncStatus;
  lastSyncedAt: string | null;
  error: string | null;
  sync: (userId: string) => Promise<void>;
};

export const useSyncStore = create<SyncState>((set, get) => ({
  status: 'idle',
  lastSyncedAt: null,
  error: null,

  sync: async (userId) => {
    // Re-entrancy guard, same pattern as chat-store's `sending` flag: without
    // it, Supabase's onAuthStateChange firing multiple session updates in
    // quick succession (INITIAL_SESSION -> SIGNED_IN -> TOKEN_REFRESHED) can
    // each re-trigger profile.tsx's effect and run two syncWithSupabase()
    // calls concurrently against the same local SQLite tables.
    if (get().status === 'syncing') return;
    set({ status: 'syncing', error: null });
    try {
      await syncWithSupabase(userId);
      set({ status: 'idle', lastSyncedAt: new Date().toISOString() });
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : 'Sync failed' });
    }
  },
}));
