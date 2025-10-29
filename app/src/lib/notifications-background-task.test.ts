import * as BackgroundTask from 'expo-background-task';
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
  const call = (TaskManager.defineTask as jest.Mock).mock.calls.find(
    ([name]) => name === NOTIFICATION_REFRESH_TASK
  );
  if (!call) throw new Error('task was never defined');
  return call[1] as () => Promise<BackgroundTask.BackgroundTaskResult>;
}

beforeEach(() => {
  (getLocalProfile as jest.Mock).mockReset();
  (scheduleDailyReminders as jest.Mock).mockReset();
  (TaskManager.isTaskRegisteredAsync as jest.Mock).mockReset();
  (BackgroundTask.registerTaskAsync as jest.Mock).mockClear();
  (BackgroundTask.unregisterTaskAsync as jest.Mock).mockClear();
});

describe('defineTask registration', () => {
  it('defines the task once, at module load, under a stable identifier', () => {
    expect(TaskManager.defineTask).toHaveBeenCalledWith(NOTIFICATION_REFRESH_TASK, expect.any(Function));
  });
});

describe('the task handler', () => {
  it('tops up reminders and reports success when notifications are enabled', async () => {
    (getLocalProfile as jest.Mock).mockResolvedValue({ notificationsEnabled: true });

    const result = await getTaskHandler()();

    expect(scheduleDailyReminders).toHaveBeenCalled();
    expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
  });

  it('skips scheduling when notifications are disabled, but still reports success', async () => {
    (getLocalProfile as jest.Mock).mockResolvedValue({ notificationsEnabled: false });

    const result = await getTaskHandler()();

    expect(scheduleDailyReminders).not.toHaveBeenCalled();
    expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
  });

  it('skips scheduling when there is no local profile yet', async () => {
    (getLocalProfile as jest.Mock).mockResolvedValue(null);

    const result = await getTaskHandler()();

    expect(scheduleDailyReminders).not.toHaveBeenCalled();
    expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
  });

  it('reports failure, without throwing, if scheduling rejects', async () => {
    (getLocalProfile as jest.Mock).mockResolvedValue({ notificationsEnabled: true });
    (scheduleDailyReminders as jest.Mock).mockRejectedValueOnce(new Error('native failure'));

    await expect(getTaskHandler()()).resolves.toBe(BackgroundTask.BackgroundTaskResult.Failed);
  });
});

describe('registerNotificationRefreshTask', () => {
  it('registers with a daily-or-looser interval when not already registered', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);

    await registerNotificationRefreshTask();

    expect(BackgroundTask.registerTaskAsync).toHaveBeenCalledWith(
      NOTIFICATION_REFRESH_TASK,
      expect.objectContaining({ minimumInterval: expect.any(Number) })
    );
    const [, options] = (BackgroundTask.registerTaskAsync as jest.Mock).mock.calls[0];
    expect(options.minimumInterval).toBeGreaterThanOrEqual(15);
  });

  it('is a no-op when already registered', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

    await registerNotificationRefreshTask();

    expect(BackgroundTask.registerTaskAsync).not.toHaveBeenCalled();
  });
});

describe('unregisterNotificationRefreshTask', () => {
  it('unregisters when currently registered', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(true);

    await unregisterNotificationRefreshTask();

    expect(BackgroundTask.unregisterTaskAsync).toHaveBeenCalledWith(NOTIFICATION_REFRESH_TASK);
  });

  it('is a no-op when not registered', async () => {
    (TaskManager.isTaskRegisteredAsync as jest.Mock).mockResolvedValue(false);

    await unregisterNotificationRefreshTask();

    expect(BackgroundTask.unregisterTaskAsync).not.toHaveBeenCalled();
  });
});
