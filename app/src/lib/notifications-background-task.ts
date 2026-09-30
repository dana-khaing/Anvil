import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { getLocalProfile } from '@/db/profile';
import { scheduleDailyReminders } from '@/lib/notification-scheduling';

export const NOTIFICATION_REFRESH_TASK = 'anvil-notification-refresh';

// The OS starts a headless JS runtime for this task, so Expo requires its
// definition at module scope rather than inside a component or hook.
TaskManager.defineTask(NOTIFICATION_REFRESH_TASK, async () => {
  try {
    const [profile, permissions] = await Promise.all([getLocalProfile(), Notifications.getPermissionsAsync()]);
    if (profile?.notificationsEnabled && permissions.status === 'granted') {
      await scheduleDailyReminders();
    }
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

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
