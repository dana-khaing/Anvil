import * as Notifications from 'expo-notifications';

import { buildDailyReminderPlan, reengagementFireDate, tipForDate, useNotificationsStore } from './notifications-store';

jest.mock('@/db/client', () => ({ db: {} }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  cancelAllScheduledNotificationsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const TIPS = ['a', 'b', 'c'];

describe('tipForDate', () => {
  it('is deterministic for the same calendar date', () => {
    const date = new Date(2025, 8, 22, 14, 30);
    expect(tipForDate(date, TIPS)).toBe(tipForDate(new Date(2025, 8, 22, 9, 0), TIPS));
  });

  it('cycles through the tip list rather than repeating the same tip every day', () => {
    const day1 = tipForDate(new Date(2025, 8, 22), TIPS);
    const day2 = tipForDate(new Date(2025, 8, 23), TIPS);
    expect(day1).not.toBe(day2);
  });

  it('wraps back to the start after tips.length days', () => {
    const start = tipForDate(new Date(2025, 8, 22), TIPS);
    const wrapped = tipForDate(new Date(2025, 8, 22 + TIPS.length), TIPS);
    expect(wrapped).toBe(start);
  });
});

describe('buildDailyReminderPlan', () => {
  it('returns one entry per day, at the requested hour, with a unique identifier', () => {
    const plan = buildDailyReminderPlan(new Date(2025, 8, 22), 3, 8, TIPS);
    expect(plan).toHaveLength(3);
    expect(plan.map((entry) => entry.identifier)).toEqual([
      'daily-reminder-2025-09-22',
      'daily-reminder-2025-09-23',
      'daily-reminder-2025-09-24',
    ]);
    expect(plan.every((entry) => entry.date.getHours() === 8)).toBe(true);
  });

  it('rolls over a month boundary correctly', () => {
    const plan = buildDailyReminderPlan(new Date(2025, 8, 29), 3, 8, TIPS);
    expect(plan.map((entry) => entry.identifier)).toEqual([
      'daily-reminder-2025-09-29',
      'daily-reminder-2025-09-30',
      'daily-reminder-2025-10-01',
    ]);
  });
});

describe('reengagementFireDate', () => {
  it('fires N days after the last workout, at the given hour', () => {
    const fireDate = reengagementFireDate('2025-09-01', 3, 18);
    expect(fireDate.getFullYear()).toBe(2025);
    expect(fireDate.getMonth()).toBe(8);
    expect(fireDate.getDate()).toBe(4);
    expect(fireDate.getHours()).toBe(18);
  });

  it('rolls over a month boundary', () => {
    const fireDate = reengagementFireDate('2025-09-29', 3, 18);
    expect(fireDate.getMonth()).toBe(9);
    expect(fireDate.getDate()).toBe(2);
  });

  it('rolls over a leap-year February boundary', () => {
    const fireDate = reengagementFireDate('2024-02-27', 3, 18);
    expect(fireDate.getMonth()).toBe(2);
    expect(fireDate.getDate()).toBe(1);
  });
});

describe('rescheduleReengagement', () => {
  it('resolves even if the underlying native scheduling call rejects', async () => {
    useNotificationsStore.setState({ enabled: true });
    (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValueOnce(new Error('native failure'));

    await expect(useNotificationsStore.getState().rescheduleReengagement('2025-09-22')).resolves.toBeUndefined();
  });
});
