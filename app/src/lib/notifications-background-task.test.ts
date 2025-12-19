import * as BackgroundTask from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { getLocalProfile } from '@/db/profile';
import { scheduleDailyReminders } from '@/lib/notification-scheduling';

import {
  NOTIFICATION_REFRESH_TASK,
  registerNotificationRefreshTask,
  unregisterNotificationRefreshTask,
} from './notifications-background-task';

jest.mock('@/db/profile', () => ({ getLocalProfile: jest.fn() }));
jest.mock('@/lib/notification-scheduling', () => ({ scheduleDailyReminders: jest.fn() }));
jest.mock('expo-notifications', () => ({ getPermissionsAsync: jest.fn() }));
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(),
}));
jest.mock('expo-background-task', () => ({
  registerTaskAsync: jest.fn(),
  unregisterTaskAsync: jest.fn(),
  BackgroundTaskResult: { Success: 1, Failed: 2 },
}));

function getTaskHandler() {
  const call = (TaskManager.defineTask as jest.Mock).mock.calls.find(([name]) => name === NOTIFICATION_REFRESH_TASK);
  if (!call) throw new Error('Notification refresh task was not defined');
  return call[1] as () => Promise<BackgroundTask.BackgroundTaskResult>;
}

beforeEach(() => {
  (getLocalProfile as jest.Mock).mockReset();
  (scheduleDailyReminders as jest.Mock).mockReset();
  (Notifications.getPermissionsAsync as jest.Mock).mockReset();
  (TaskManager.isTaskRegisteredAsync as jest.Mock).mockReset();
  (BackgroundTask.registerTaskAsync as jest.Mock).mockClear();
  (BackgroundTask.unregisterTaskAsync as jest.Mock).mockClear();
  (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
});

describe('notification refresh task', () => {
  it('is defined once at module load under a stable identifier', () => {
    expect(NOTIFICATION_REFRESH_TASK).toBe('anvil-notification-refresh');
    expect(TaskManager.defineTask).toHaveBeenCalledWith(NOTIFICATION_REFRESH_TASK, expect.any(Function));
  });

  it('tops up reminders when the local preference and OS permission are enabled', async () => {
    (getLocalProfile as jest.Mock).mockResolvedValue({ notificationsEnabled: true });

    await expect(getTaskHandler()()).resolves.toBe(BackgroundTask.BackgroundTaskResult.Success);

    expect(scheduleDailyReminders).toHaveBeenCalledTimes(1);
  });

  it.each([
    { profile: null, permission: 'granted' },
    { profile: { notificationsEnabled: false }, permission: 'granted' },
    { profile: { notificationsEnabled: true }, permission: 'denied' },
  ])('skips scheduling when notifications are unavailable (%#)', async ({ profile, permission }) => {
    (getLocalProfile as jest.Mock).mockResolvedValue(profile);
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: permission });

    await expect(getTaskHandler()()).resolves.toBe(BackgroundTask.BackgroundTaskResult.Success);

    expect(scheduleDailyReminders).not.toHaveBeenCalled();
  });

  it('reports failure without throwing when native scheduling fails', async () => {
    (getLocalProfile as jest.Mock).mockResolvedValue({ notificationsEnabled: true });
    (scheduleDailyReminders as jest.Mock).mockRejectedValue(new Error('native failure'));

    await expect(getTaskHandler()()).resolves.toBe(BackgroundTask.BackgroundTaskResult.Failed);
  });
});

describe('notification refresh registration', () => {
  it('registers a missing task with a daily minimum interval', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);

    await registerNotificationRefreshTask();

    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(NOTIFICATION_REFRESH_TASK, {
      minimumInterval: 24 * 60,
    });
  });

  it('does not register the task twice', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

    await registerNotificationRefreshTask();

    expect(BackgroundTask.registerTaskAsync).not.toHaveBeenCalled();
  });

  it('unregisters an existing task and ignores an absent one', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

    await unregisterNotificationRefreshTask();
    await unregisterNotificationRefreshTask();

    expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalledTimes(1);
    expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalledWith(NOTIFICATION_REFRESH_TASK);
  });
});
