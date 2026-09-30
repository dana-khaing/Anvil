import { useEffect, useState } from 'react';

import { db } from '@/db/client';
import { seedExerciseLibrary } from '@/db/seed';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationsStore } from '@/stores/notifications-store';
import { useProfileStore } from '@/stores/profile-store';

/** Runs post-migration startup work and exposes the existing splash-screen gate. */
export function useAppBootstrap(databaseReady: boolean) {
  const [seeded, setSeeded] = useState(false);
  const profileChecked = useProfileStore((state) => state.checked);
  const loadProfile = useProfileStore((state) => state.load);
  const authChecked = useAuthStore((state) => state.checked);
  const initAuth = useAuthStore((state) => state.init);
  const loadNotifications = useNotificationsStore((state) => state.load);

  useEffect(() => {
    if (!databaseReady) return;

    void seedExerciseLibrary(db).then(() => {
      setSeeded(true);
      void loadProfile();
    });
    void initAuth();
    // Best-effort: native scheduling should not delay the splash gate.
    void loadNotifications();
  }, [databaseReady, loadProfile, initAuth, loadNotifications]);

  return databaseReady && seeded && profileChecked && authChecked;
}
