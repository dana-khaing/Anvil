import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';

import { getLocalProfile } from '@/db/profile';
import { scheduleDailyReminders } from '@/lib/notification-scheduling';

export const NOTIFICATION_REFRESH_TASK = 'pulseforge-notification-refresh';

/**
 * Must be defined at module scope, unconditionally, so the OS can find it and
 * invoke it on a headless JS boot -- see DIARY.md Day 12/17: without this,
 * the 14-day reminder queue only ever got topped up by an ordinary app open,
 * so it silently ran dry for anyone who didn't open the app for two weeks.
 * This file is imported once, for its side effect, from the root layout.
 */
TaskManager.defineTask(NOTIFICATION_REFRESH_TASK, async () => {
  try {
    const profile = await getLocalProfile();
    if (!profile?.notificationsEnabled) {
      return BackgroundTask.BackgroundTaskResult.Success;
    }
    await scheduleDailyReminders();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

// Android's WorkManager enforces a 15-minute floor; a daily cadence is
// already more than enough to keep a 14-day-ahead queue from running dry,
// and the OS treats `minimumInterval` as a floor it can stretch anyway.
const MINIMUM_INTERVAL_MINUTES = 24 * 60;

export async function registerNotificationRefreshTask(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_REFRESH_TASK);
  if (registered) return;
  await BackgroundTask.registerTaskAsync(NOTIFICATION_REFRESH_TASK, {
    minimumInterval: MINIMUM_INTERVAL_MINUTES,
  });
}

export async function unregisterNotificationRefreshTask(): Promise<void> {
  const registered = await TaskManager.isTaskRegisteredAsync(NOTIFICATION_REFRESH_TASK);
  if (!registered) return;
  await BackgroundTask.unregisterTaskAsync(NOTIFICATION_REFRESH_TASK);
}
