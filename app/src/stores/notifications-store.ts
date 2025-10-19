import { eq, sql } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';
import { create } from 'zustand';

import { db } from '@/db/client';
import { getLocalProfile } from '@/db/profile';
import { profiles, streaks } from '@/db/schema';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const DAILY_TIPS = [
  'Progressive overload beats a perfect program — add a little weight or a rep when a set feels easy.',
  'A missed set matters less than a missed habit. Show up, even for a short session.',
  'Warm up the specific movement, not just your heart rate — a few light reps of the first lift goes a long way.',
  'Sleep is a training variable. An extra hour does more for tomorrow\'s session than an extra set today.',
  'Track the number, not the feeling — "felt hard" doesn\'t tell future-you what to beat next time.',
  'Form breakdown is the deload signal. If your last rep looks different from your first, that\'s the set.',
  'Protein timing matters far less than protein total. Hit the day\'s number however it fits.',
  'Rest between hard sets is for your nervous system, not just your lungs — don\'t rush the big lifts.',
  'A short workout you finish beats a long one you skip. Scale it down, don\'t skip it.',
  'Substituting an exercise isn\'t giving up on the plan — it\'s how you stick to it when equipment is busy.',
];

/** Deterministic, offline day-index into the tips list — no two calls for the same date disagree. */
export function tipForDate(date: Date, tips: string[] = DAILY_TIPS): string {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000);
  return tips[((dayNumber % tips.length) + tips.length) % tips.length];
}

export type ReminderPlanEntry = { identifier: string; date: Date; body: string };

/** The next `days` daily-reminder notifications to schedule, one per calendar day at `hour:00` local time. */
export function buildDailyReminderPlan(
  startDate: Date,
  days: number,
  hour: number,
  tips: string[] = DAILY_TIPS
): ReminderPlanEntry[] {
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + offset, hour, 0, 0, 0);
    const identifier = `daily-reminder-${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return { identifier, date, body: tipForDate(date, tips) };
  });
}

/** When the "come back" nudge should fire: `inactivityDays` after the last workout, at `hour:00` local time. */
export function reengagementFireDate(lastWorkoutDate: string, inactivityDays: number, hour: number): Date {
  const [year, month, day] = lastWorkoutDate.split('-').map(Number);
  return new Date(year, month - 1, day + inactivityDays, hour, 0, 0, 0);
}

const REENGAGEMENT_ID = 'reengagement';
const REMINDER_PREFIX = 'daily-reminder-';
const REMINDER_DAYS_AHEAD = 14;
const REMINDER_HOUR = 8;
const REENGAGEMENT_INACTIVITY_DAYS = 3;
const REENGAGEMENT_HOUR = 18;

async function scheduleDailyReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((notification) => notification.identifier.startsWith(REMINDER_PREFIX))
      .map((notification) => Notifications.cancelScheduledNotificationAsync(notification.identifier))
  );

  const plan = buildDailyReminderPlan(new Date(), REMINDER_DAYS_AHEAD, REMINDER_HOUR);
  await Promise.all(
    plan.map((entry) =>
      Notifications.scheduleNotificationAsync({
        identifier: entry.identifier,
        content: { title: 'Time to train', body: entry.body },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: entry.date },
      })
    )
  );
}

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

    // There's no background job re-topping the 14-day reminder queue while
    // the app is closed (see Day 12's diary), so an ordinary app open is
    // the actual mechanism that's supposed to keep it from running dry --
    // it was only ever wired to the explicit enable() toggle, so the queue
    // silently emptied after 14 days no matter how often the app was used.
    if (enabled) {
      await scheduleDailyReminders().catch(() => {});
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
