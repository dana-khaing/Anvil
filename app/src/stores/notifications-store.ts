import { eq, sql } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';
import { create } from 'zustand';

import { db } from '@/db/client';
import { getLocalProfile } from '@/db/profile';
import { profiles, streaks } from '@/db/schema';
import { scheduleDailyReminders } from '@/lib/notification-scheduling';
import {
  registerNotificationRefreshTask,
  unregisterNotificationRefreshTask,
} from '@/lib/notifications-background-task';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export { DAILY_TIPS, buildDailyReminderPlan, tipForDate } from '@/lib/notification-scheduling';
export type { ReminderPlanEntry } from '@/lib/notification-scheduling';

/** When the "come back" nudge should fire: `inactivityDays` after the last workout, at `hour:00` local time. */
export function reengagementFireDate(lastWorkoutDate: string, inactivityDays: number, hour: number): Date {
  const [year, month, day] = lastWorkoutDate.split('-').map(Number);
  return new Date(year, month - 1, day + inactivityDays, hour, 0, 0, 0);
}

const REENGAGEMENT_ID = 'reengagement';
const REENGAGEMENT_INACTIVITY_DAYS = 3;
const REENGAGEMENT_HOUR = 18;

type NotificationsState = {
  enabled: boolean;
  permissionStatus: Notifications.PermissionStatus | null;
  loaded: boolean;
  load: () => Promise<void>;
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  rescheduleReengagement: (lastWorkoutDate: string) => Promise<void>;
};

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  enabled: false,
  permissionStatus: null,
  loaded: false,

  load: async () => {
    const profile = await getLocalProfile();
    const { status } = await Notifications.getPermissionsAsync();
    const enabled = (profile?.notificationsEnabled ?? false) && status === 'granted';

    // Cold-launch top-up, kept alongside the background task registered
    // below rather than replaced by it: the background task's actual
    // schedule is OS-controlled (and unavailable at all on iOS simulators),
    // so this is still what guarantees the queue is fresh the moment
    // someone opens the app, regardless of whether the OS ever ran the task.
    if (enabled) {
      await scheduleDailyReminders().catch(() => {});
      // Re-registers if missing (fresh install, task registration failed
      // previously, etc.) -- registerNotificationRefreshTask() is already a
      // no-op when it's registered, so this is safe to call every load().
      await registerNotificationRefreshTask().catch(() => {});
    }

    set({ enabled, permissionStatus: status, loaded: true });
  },

  enable: async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      set({ permissionStatus: status });
      return false;
    }

    const profile = await getLocalProfile();
    if (profile) {
      await db
        .update(profiles)
        .set({ notificationsEnabled: true, updatedAt: sql`(current_timestamp)` })
        .where(eq(profiles.id, profile.id));
    }
    await scheduleDailyReminders();
    // Best-effort: registration can fail (e.g. unavailable on iOS
    // simulators) without notifications themselves being broken -- the
    // queue still works via cold-launch top-up in `load()`, just without
    // the background top-up while the app stays closed.
    await registerNotificationRefreshTask().catch(() => {});
    set({ enabled: true, permissionStatus: status });

    // Opting in while already mid-inactivity is exactly when a re-engagement
    // nudge is most useful -- without this, it wouldn't get scheduled until
    // the *next* workout completion, which defeats the point for someone
    // who's already gone quiet.
    const [streakRow] = await db.select().from(streaks).limit(1);
    if (streakRow?.lastWorkoutDate) {
      await get().rescheduleReengagement(streakRow.lastWorkoutDate);
    }

    return true;
  },

  disable: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await unregisterNotificationRefreshTask().catch(() => {});
    const profile = await getLocalProfile();
    if (profile) {
      await db
        .update(profiles)
        .set({ notificationsEnabled: false, updatedAt: sql`(current_timestamp)` })
        .where(eq(profiles.id, profile.id));
    }
    set({ enabled: false });
  },

  rescheduleReengagement: async (lastWorkoutDate) => {
    if (!get().enabled) return;

    // Best-effort: this runs right after a workout is already recorded as
    // completed (see workout-session-store's finishExercise), so a native
    // scheduling hiccup here must never surface as a rejected promise on
    // top of an already-successful completion.
    await Notifications.cancelScheduledNotificationAsync(REENGAGEMENT_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: REENGAGEMENT_ID,
      content: {
        title: 'Still there?',
        body: "You've got a streak worth protecting — jump back in today.",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reengagementFireDate(lastWorkoutDate, REENGAGEMENT_INACTIVITY_DAYS, REENGAGEMENT_HOUR),
      },
    }).catch(() => {});
  },
}));
